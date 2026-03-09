/**
 * Platform Adapter Engine v7.0
 * 
 * Camada de abstração universal entre o painel e cada plataforma.
 * Cada plataforma usa um adaptador isolado que traduz operações
 * padronizadas para a estrutura específica do banco/API da plataforma.
 */

import type { Plataforma } from "@/hooks/usePlatforms";

// ==================== Interfaces padronizadas ====================

export interface AdapterUser {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  balance?: number;
  created_at?: string;
}

export interface AdapterDeposit {
  id: string | number;
  user_name: string;
  amount: number;
  pix?: string;
  status: string;
  normalized_status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;
}

export interface AdapterWithdraw {
  id: string | number;
  user_name: string;
  amount: number;
  pix?: string;
  status: string;
  normalized_status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;
}

export interface AdapterStats {
  total_users: number;
  total_affiliates: number;
  total_balance: number;
}

export interface AdapterActionResult {
  success: boolean;
  affected_rows?: number;
  error?: string;
  raw_response?: any;
}

export interface AdapterHealthStatus {
  online: boolean;
  latency_ms: number;
  db_connected: boolean;
  api_responsive: boolean;
  gateway_active: boolean;
  last_check: string;
  errors: string[];
}

// ==================== Gateway Types ====================

export type GatewayType = "pix_api" | "api_rest" | "webhook" | "custom_script" | "sql_exec";

export interface GatewayConfig {
  type: GatewayType;
  endpoint?: string;
  api_key?: string;
  api_secret?: string;
  method?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  body_template?: string;
}

export interface GatewayExecutionResult {
  success: boolean;
  transaction_id?: string;
  error_code?: string;
  error_message?: string;
  raw_response?: any;
  latency_ms: number;
}

// ==================== Adapter Config ====================

export interface AdapterConfig {
  type: "api" | "hybrid" | "custom";
  api_url?: string;
  gateway?: GatewayConfig;
  status_map: {
    approve: string;
    reject: string;
    pending: string;
  };
  cache_ttl: {
    stats: number;
    deposits: number;
    withdraws: number;
  };
  sync_interval: number;
  retry_config: {
    max_retries: number;
    retry_delay: number;
    backoff_multiplier: number;
  };
}

// ==================== Status Normalizer ====================

const STATUS_MAP: Record<string, "pendente" | "aprovado" | "rejeitado" | "pago" | "cancelado" | "falha"> = {
  // English
  pending: "pendente",
  approved: "aprovado",
  rejected: "rejeitado",
  completed: "aprovado",
  declined: "rejeitado",
  canceled: "cancelado",
  cancelled: "cancelado",
  denied: "rejeitado",
  paid: "pago",
  processing: "pendente",
  failed: "falha",
  error: "falha",
  refunded: "cancelado",
  expired: "cancelado",
  waiting: "pendente",
  confirmed: "aprovado",
  success: "aprovado",
  // Portuguese
  pendente: "pendente",
  aprovado: "aprovado",
  rejeitado: "rejeitado",
  pago: "pago",
  cancelado: "cancelado",
  falha: "falha",
  concluido: "aprovado",
  finalizado: "aprovado",
  recusado: "rejeitado",
  negado: "rejeitado",
  expirado: "cancelado",
  aguardando: "pendente",
  processando: "pendente",
  // Numeric
  "0": "pendente",
  "1": "aprovado",
  "2": "rejeitado",
  "3": "cancelado",
  "4": "pago",
  "5": "falha",
};

export function normalizeStatus(status: string | number | null | undefined): "pendente" | "aprovado" | "rejeitado" {
  if (status === null || status === undefined) return "pendente";
  const s = String(status).toLowerCase().trim();
  return STATUS_MAP[s] ?? "pendente";
}

// ==================== Config Builder ====================

export function buildAdapterConfig(platform: Plataforma): AdapterConfig {
  const extra = (platform.mapeamento_extra as any) ?? {};
  const statusMaps = extra.status_maps ?? {};
  const saqueMap = statusMaps.saques ?? {};
  const gatewayConfig = extra.gateway ?? {};
  const syncConfig = extra.sync ?? {};

  return {
    type: platform.url ? "api" : "hybrid",
    api_url: getApiUrl(platform),
    gateway: gatewayConfig.type ? {
      type: gatewayConfig.type as GatewayType,
      endpoint: gatewayConfig.endpoint,
      api_key: gatewayConfig.api_key || platform.gateway_chave,
      api_secret: gatewayConfig.api_secret,
      method: gatewayConfig.method ?? "POST",
      headers: gatewayConfig.headers,
      body_template: gatewayConfig.body_template,
    } : undefined,
    status_map: {
      approve: saqueMap.approve ?? "approved",
      reject: saqueMap.reject ?? "rejected",
      pending: saqueMap.pending ?? "pending",
    },
    cache_ttl: {
      stats: syncConfig.cache_stats ?? 30_000,
      deposits: syncConfig.cache_deposits ?? 20_000,
      withdraws: syncConfig.cache_withdraws ?? 20_000,
    },
    sync_interval: syncConfig.interval ?? 30_000,
    retry_config: {
      max_retries: syncConfig.max_retries ?? 2,
      retry_delay: syncConfig.retry_delay ?? 2_000,
      backoff_multiplier: syncConfig.backoff_multiplier ?? 1.5,
    },
  };
}

function getApiUrl(platform: Plataforma): string | undefined {
  if (!platform.url) return undefined;
  let base = platform.url.replace(/\/$/, "");
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }
  if (base.endsWith("api.php")) return base;
  return `${base}/api.php`;
}

// ==================== Adapter Registry ====================

class PlatformAdapterRegistry {
  private configs = new Map<string, AdapterConfig>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private healthStatus = new Map<string, AdapterHealthStatus>();

  getConfig(platform: Plataforma): AdapterConfig {
    let config = this.configs.get(platform.id);
    if (!config) {
      config = buildAdapterConfig(platform);
      this.configs.set(platform.id, config);
    }
    return config;
  }

  updateConfig(platformId: string, config: AdapterConfig) {
    this.configs.set(platformId, config);
    this.clearCache(platformId);
  }

  getCached<T>(platformId: string, key: string, ttl: number): T | null {
    const entry = this.cache.get(`${platformId}:${key}`);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data as T;
    }
    return null;
  }

  setCache<T>(platformId: string, key: string, data: T) {
    this.cache.set(`${platformId}:${key}`, { data, timestamp: Date.now() });
  }

  clearCache(platformId?: string) {
    if (platformId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${platformId}:`)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  setHealthStatus(platformId: string, status: AdapterHealthStatus) {
    this.healthStatus.set(platformId, status);
  }

  getHealthStatus(platformId: string): AdapterHealthStatus | undefined {
    return this.healthStatus.get(platformId);
  }

  /**
   * Retorna o saldo REAL da plataforma.
   * REGRA: saldo_atual = valor_exato_na_coluna. 
   * NUNCA usar soma incremental ou diferença acumulada.
   */
  parseBalance(rawValue: any): number {
    const num = Number(rawValue);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Execute gateway payment for withdrawal approval.
   * Returns result with success/failure and transaction details.
   */
  async executeGatewayPayment(
    platform: Plataforma,
    withdraw: { id: string | number; user_name: string; amount: number; pix?: string }
  ): Promise<GatewayExecutionResult> {
    const config = this.getConfig(platform);
    const t0 = performance.now();

    // If no gateway configured, fall back to API-based approval
    if (!config.gateway) {
      return {
        success: true,
        latency_ms: Math.round(performance.now() - t0),
        error_message: "No gateway configured — using API fallback",
      };
    }

    const gw = config.gateway;
    
    try {
      let url = gw.endpoint ?? "";
      let body: string | undefined;
      
      // Build request body from template or default
      if (gw.body_template) {
        body = gw.body_template
          .replace(/\{id\}/g, String(withdraw.id))
          .replace(/\{amount\}/g, String(withdraw.amount))
          .replace(/\{pix\}/g, withdraw.pix ?? "")
          .replace(/\{user_name\}/g, withdraw.user_name);
      } else {
        body = JSON.stringify({
          id: withdraw.id,
          amount: withdraw.amount,
          pix: withdraw.pix,
          user_name: withdraw.user_name,
        });
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(gw.headers ?? {}),
      };
      
      if (gw.api_key) {
        headers["Authorization"] = `Bearer ${gw.api_key}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      
      const res = await fetch(url, {
        method: gw.method ?? "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latency = Math.round(performance.now() - t0);
      const responseText = await res.text();
      
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

      if (!res.ok) {
        return {
          success: false,
          error_code: `HTTP_${res.status}`,
          error_message: typeof responseData === "object" 
            ? responseData.message ?? responseData.error ?? `HTTP ${res.status}` 
            : `HTTP ${res.status}: ${responseText.slice(0, 200)}`,
          raw_response: responseData,
          latency_ms: latency,
        };
      }

      return {
        success: true,
        transaction_id: responseData?.transaction_id ?? responseData?.id,
        raw_response: responseData,
        latency_ms: latency,
      };
    } catch (e: any) {
      const latency = Math.round(performance.now() - t0);
      
      if (e.name === "AbortError") {
        return {
          success: false,
          error_code: "TIMEOUT",
          error_message: "Gateway timeout — servidor não respondeu em 15s",
          latency_ms: latency,
        };
      }
      
      return {
        success: false,
        error_code: "NETWORK_ERROR",
        error_message: e.message ?? "Erro de rede ao conectar com gateway",
        latency_ms: latency,
      };
    }
  }
}

export const adapterRegistry = new PlatformAdapterRegistry();

// ==================== Error Classification ====================

export type WithdrawErrorReason = 
  | "saldo_insuficiente"
  | "gateway_offline"
  | "erro_api"
  | "chave_invalida"
  | "limite_excedido"
  | "timeout"
  | "desconhecido";

export function classifyWithdrawError(error: string): WithdrawErrorReason {
  const lower = error.toLowerCase();
  if (lower.includes("saldo") || lower.includes("balance") || lower.includes("insufficient")) return "saldo_insuficiente";
  if (lower.includes("offline") || lower.includes("unavailable")) return "gateway_offline";
  if (lower.includes("key") || lower.includes("auth") || lower.includes("token") || lower.includes("chave")) return "chave_invalida";
  if (lower.includes("limit") || lower.includes("exceeded") || lower.includes("limite")) return "limite_excedido";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("api") || lower.includes("server") || lower.includes("500")) return "erro_api";
  return "desconhecido";
}

export const ERROR_LABELS: Record<WithdrawErrorReason, string> = {
  saldo_insuficiente: "💰 Saldo Insuficiente",
  gateway_offline: "🔴 Gateway Offline",
  erro_api: "⚠️ Erro de API",
  chave_invalida: "🔑 Chave Inválida",
  limite_excedido: "📊 Limite Excedido",
  timeout: "⏱️ Timeout",
  desconhecido: "❓ Erro Desconhecido",
};

// ==================== Logging ====================

export function adapterLog(platform: string, action: string, details: string, level: "info" | "warn" | "error" = "info") {
  const prefix = `[Adapter:${platform}]`;
  switch (level) {
    case "error": console.error(`${prefix} ❌ ${action}:`, details); break;
    case "warn": console.warn(`${prefix} ⚠️ ${action}:`, details); break;
    default: console.log(`${prefix} ${action}:`, details);
  }
}
