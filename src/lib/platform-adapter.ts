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

export interface AdapterConfig {
  type: "api" | "hybrid" | "custom";
  api_url?: string;
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
}

// ==================== Status Normalizer ====================

const STATUS_MAP: Record<string, "pendente" | "aprovado" | "rejeitado"> = {
  pending: "pendente",
  approved: "aprovado",
  rejected: "rejeitado",
  completed: "aprovado",
  declined: "rejeitado",
  canceled: "rejeitado",
  cancelled: "rejeitado",
  denied: "rejeitado",
  paid: "aprovado",
  processing: "pendente",
  pendente: "pendente",
  aprovado: "aprovado",
  rejeitado: "rejeitado",
  "0": "pendente",
  "1": "aprovado",
  "2": "rejeitado",
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

  return {
    type: platform.url ? "api" : "hybrid",
    api_url: getApiUrl(platform),
    status_map: {
      approve: saqueMap.approve ?? "approved",
      reject: saqueMap.reject ?? "rejected",
      pending: saqueMap.pending ?? "pending",
    },
    cache_ttl: {
      stats: 30_000,
      deposits: 20_000,
      withdraws: 20_000,
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

/**
 * Registry de adaptadores por plataforma.
 * Cada plataforma tem seu adaptador isolado com cache independente.
 */
class PlatformAdapterRegistry {
  private configs = new Map<string, AdapterConfig>();
  private cache = new Map<string, { data: any; timestamp: number }>();

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

  /**
   * Retorna o saldo REAL da plataforma.
   * REGRA: saldo_atual = valor_exato_na_coluna. 
   * NUNCA usar soma incremental ou diferença acumulada.
   */
  parseBalance(rawValue: any): number {
    const num = Number(rawValue);
    return isNaN(num) ? 0 : num;
  }
}

export const adapterRegistry = new PlatformAdapterRegistry();

// ==================== Logging ====================

export function adapterLog(platform: string, action: string, details: string, level: "info" | "warn" | "error" = "info") {
  const prefix = `[Adapter:${platform}]`;
  switch (level) {
    case "error": console.error(`${prefix} ❌ ${action}:`, details); break;
    case "warn": console.warn(`${prefix} ⚠️ ${action}:`, details); break;
    default: console.log(`${prefix} ${action}:`, details);
  }
}
