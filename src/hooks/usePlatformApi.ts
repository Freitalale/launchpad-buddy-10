import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Plataforma } from "@/hooks/usePlatforms";

export interface ApiStats {
  total_usuarios: number;
  total_afiliados: number;
  saldo_total: number;
}

export interface ApiDeposito {
  nome_usuario: string;
  valor: number;
  pix: string;
  created_at: string;
  status: string;
}

export interface ApiSaque {
  id: number;
  nome_usuario: string;
  valor: number;
  pix: string;
  created_at: string;
  status: string;
}

export interface EndpointDiagnostic {
  ok: boolean;
  error?: string;
  httpStatus?: number;
  latency_ms?: number;
  data?: any;
  count?: number;
  cause?: string;
  solution?: string;
}

export interface ApiHealthResult {
  platform_id: string;
  platform_name: string;
  api_url: string;
  status: "online" | "offline" | "error" | "unstable";
  latency_ms: number;
  endpoints: {
    health: EndpointDiagnostic;
    stats: EndpointDiagnostic;
    depositos: EndpointDiagnostic;
    saques: EndpointDiagnostic;
  };
  errors: DiagnosticError[];
  checked_at: string;
}

export interface DiagnosticError {
  endpoint: string;
  type: ErrorType;
  message: string;
  cause: string;
  solution: string;
  httpStatus?: number;
}

export type ErrorType =
  | "API_OFFLINE"
  | "TIMEOUT"
  | "ENDPOINT_NOT_FOUND"
  | "INVALID_JSON"
  | "CORS_ERROR"
  | "DB_DISCONNECTED"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "SERVER_ERROR"
  | "MISSING_FIELDS"
  | "NETWORK_ERROR";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  platform_id: string;
}

const CACHE_TTL = {
  stats: 30_000,
  depositos: 20_000,
  saques: 20_000,
};

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 2_000;

function getApiUrl(platform: Plataforma): string | null {
  if (!platform.url) return null;
  let base = platform.url.replace(/\/$/, "");
  // Always ensure protocol
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }
  if (base.endsWith("api.php")) return base;
  return `${base}/api.php`;
}

function classifyError(e: any, endpoint: string): DiagnosticError {
  if (e.name === "AbortError" || e.name === "TimeoutError") {
    return {
      endpoint, type: "TIMEOUT",
      message: `Timeout após ${TIMEOUT_MS / 1000}s — servidor não respondeu`,
      cause: "Servidor da plataforma pode estar sobrecarregado, offline, ou a URL está incorreta.",
      solution: "1) Verifique se a URL da API está correta\n2) Acesse a URL diretamente no navegador\n3) Verifique se o servidor da hospedagem está online",
    };
  }
  if (e.name === "TypeError" && e.message?.includes("Failed to fetch")) {
    return {
      endpoint, type: "CORS_ERROR",
      message: "Erro de rede/CORS — requisição bloqueada",
      cause: "A API não possui o header Access-Control-Allow-Origin: * ou o servidor está offline.",
      solution: "1) Adicione header('Access-Control-Allow-Origin: *'); no início do api.php\n2) Verifique se a URL é HTTPS\n3) Confirme que o servidor está acessível",
    };
  }
  return {
    endpoint, type: "NETWORK_ERROR",
    message: e.message || "Erro desconhecido",
    cause: "Problema de conexão com a API.",
    solution: "Verifique a URL, certificado SSL e se o servidor está online.",
  };
}

function classifyHttpError(status: number, endpoint: string): DiagnosticError {
  if (status === 404) return {
    endpoint, type: "ENDPOINT_NOT_FOUND", httpStatus: status,
    message: `Endpoint não encontrado (HTTP 404)`,
    cause: `O arquivo api.php não possui a action correspondente ou a URL está incorreta.`,
    solution: `Verifique se api.php trata a action="${endpoint}" corretamente.`,
  };
  if (status === 401 || status === 403) return {
    endpoint, type: "AUTH_ERROR", httpStatus: status,
    message: `Erro de autenticação (HTTP ${status})`,
    cause: "A API requer autenticação ou as credenciais estão incorretas.",
    solution: "Verifique se a API requer api_key e se está configurada corretamente.",
  };
  if (status >= 500) return {
    endpoint, type: "SERVER_ERROR", httpStatus: status,
    message: `Erro interno do servidor (HTTP ${status})`,
    cause: "O api.php tem um erro PHP interno ou o banco de dados está inacessível.",
    solution: "1) Verifique os logs de erro do PHP na hospedagem\n2) Confirme que config.php tem as credenciais corretas do banco\n3) Verifique se o banco MySQL está online",
  };
  return {
    endpoint, type: "SERVER_ERROR", httpStatus: status,
    message: `HTTP ${status}`,
    cause: "Resposta inesperada da API.",
    solution: "Verifique o arquivo api.php.",
  };
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, RETRY_DELAY * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

export const usePlatformApi = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  const getCache = <T,>(key: string, platformId: string, ttl: number): { data: T; fromCache: true } | null => {
    const entry = cacheRef.current.get(`${platformId}:${key}`);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return { data: entry.data as T, fromCache: true };
    }
    return null;
  };

  const setCache = <T,>(key: string, platformId: string, data: T) => {
    cacheRef.current.set(`${platformId}:${key}`, { data, timestamp: Date.now(), platform_id: platformId });
  };

  const fetchStats = useCallback(async (platform: Plataforma): Promise<{ data: ApiStats | null; fromCache: boolean; error?: DiagnosticError }> => {
    const cached = getCache<ApiStats>("stats", platform.id, CACHE_TTL.stats);
    if (cached) return { data: cached.data, fromCache: true };

    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return { data: null, fromCache: false };
    try {
      const res = await fetchWithRetry(`${apiUrl}?action=stats`);
      if (!res.ok) {
        const err = classifyHttpError(res.status, "stats");
        return { data: null, fromCache: false, error: err };
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.total_usuarios === undefined) {
          return { data: null, fromCache: false, error: {
            endpoint: "stats", type: "MISSING_FIELDS",
            message: "Campos obrigatórios ausentes no JSON",
            cause: "O endpoint stats não retorna total_usuarios, total_afiliados, saldo_total.",
            solution: "Verifique o SELECT no api.php para o action=stats.",
          }};
        }
        setCache("stats", platform.id, data);
        return { data, fromCache: false };
      } catch {
        return { data: null, fromCache: false, error: {
          endpoint: "stats", type: "INVALID_JSON",
          message: "A API retornou resposta que não é JSON válido",
          cause: "O api.php pode ter erros PHP ou warnings antes do JSON.",
          solution: "1) Abra a URL no navegador e verifique se é JSON puro\n2) Desative display_errors no PHP\n3) Verifique se não há echo antes do json_encode",
        }};
      }
    } catch (e: any) {
      // Try to return cached data
      const stale = cacheRef.current.get(`${platform.id}:stats`);
      if (stale) {
        return { data: stale.data, fromCache: true, error: classifyError(e, "stats") };
      }
      return { data: null, fromCache: false, error: classifyError(e, "stats") };
    }
  }, []);

  const fetchDepositos = useCallback(async (platform: Plataforma): Promise<{ data: ApiDeposito[]; fromCache: boolean; error?: DiagnosticError }> => {
    const cached = getCache<ApiDeposito[]>("depositos", platform.id, CACHE_TTL.depositos);
    if (cached) return { data: cached.data, fromCache: true };

    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return { data: [], fromCache: false };
    try {
      const res = await fetchWithRetry(`${apiUrl}?action=depositos`);
      if (!res.ok) return { data: [], fromCache: false, error: classifyHttpError(res.status, "depositos") };
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          return { data: [], fromCache: false, error: {
            endpoint: "depositos", type: "INVALID_JSON",
            message: "Resposta não é um array JSON",
            cause: "O endpoint depositos deve retornar um array [].",
            solution: "Verifique se o api.php faz json_encode de um array de depósitos.",
          }};
        }
        setCache("depositos", platform.id, data);
        return { data, fromCache: false };
      } catch {
        return { data: [], fromCache: false, error: {
          endpoint: "depositos", type: "INVALID_JSON",
          message: "JSON inválido retornado pela API",
          cause: "O api.php pode ter erros PHP antes do JSON.",
          solution: "Abra a URL diretamente no navegador e verifique a saída.",
        }};
      }
    } catch (e: any) {
      const stale = cacheRef.current.get(`${platform.id}:depositos`);
      if (stale) return { data: stale.data, fromCache: true, error: classifyError(e, "depositos") };
      return { data: [], fromCache: false, error: classifyError(e, "depositos") };
    }
  }, []);

  const fetchSaques = useCallback(async (platform: Plataforma): Promise<{ data: ApiSaque[]; fromCache: boolean; error?: DiagnosticError }> => {
    const cached = getCache<ApiSaque[]>("saques", platform.id, CACHE_TTL.saques);
    if (cached) return { data: cached.data, fromCache: true };

    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return { data: [], fromCache: false };
    try {
      const res = await fetchWithRetry(`${apiUrl}?action=saques`);
      if (!res.ok) return { data: [], fromCache: false, error: classifyHttpError(res.status, "saques") };
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          return { data: [], fromCache: false, error: {
            endpoint: "saques", type: "INVALID_JSON",
            message: "Resposta não é um array JSON",
            cause: "O endpoint saques deve retornar um array [].",
            solution: "Verifique se o api.php faz json_encode de um array de saques.",
          }};
        }
        setCache("saques", platform.id, data);
        return { data, fromCache: false };
      } catch {
        return { data: [], fromCache: false, error: {
          endpoint: "saques", type: "INVALID_JSON",
          message: "JSON inválido",
          cause: "Erro PHP antes do json_encode.",
          solution: "Verifique o arquivo api.php.",
        }};
      }
    } catch (e: any) {
      const stale = cacheRef.current.get(`${platform.id}:saques`);
      if (stale) return { data: stale.data, fromCache: true, error: classifyError(e, "saques") };
      return { data: [], fromCache: false, error: classifyError(e, "saques") };
    }
  }, []);

  const aprovarSaque = async (platform: Plataforma, saqueId: number): Promise<boolean> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return false;
    try {
      const formData = new FormData();
      formData.append("id", String(saqueId));
      const res = await fetchWithRetry(`${apiUrl}?action=aprovar_saque`, { method: "POST", body: formData });
      const data = await res.json();
      return !!data.ok;
    } catch (e: any) {
      toast({ title: "Erro ao aprovar saque", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const rejeitarSaque = async (platform: Plataforma, saqueId: number): Promise<boolean> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return false;
    try {
      const formData = new FormData();
      formData.append("id", String(saqueId));
      const res = await fetchWithRetry(`${apiUrl}?action=rejeitar_saque`, { method: "POST", body: formData });
      const data = await res.json();
      return !!data.ok;
    } catch (e: any) {
      toast({ title: "Erro ao rejeitar saque", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const removerAfiliados = async (platform: Plataforma): Promise<boolean> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return false;
    try {
      const res = await fetchWithRetry(`${apiUrl}?action=remover_afiliados`, { method: "POST" });
      const data = await res.json();
      return !!data.ok;
    } catch (e: any) {
      toast({ title: "Erro ao remover afiliados", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const testEndpoint = async (apiUrl: string, action: string): Promise<EndpointDiagnostic> => {
    const t0 = performance.now();
    try {
      const res = await fetchWithRetry(`${apiUrl}?action=${action}`);
      const latency = Math.round(performance.now() - t0);
      if (!res.ok) {
        const err = classifyHttpError(res.status, action);
        return { ok: false, error: err.message, httpStatus: res.status, latency_ms: latency, cause: err.cause, solution: err.solution };
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (action === "stats") {
          if (data.total_usuarios === undefined) {
            return { ok: false, error: "Campos obrigatórios ausentes", latency_ms: latency, data,
              cause: "stats deve retornar total_usuarios, total_afiliados, saldo_total",
              solution: "Verifique o SELECT no action=stats do api.php" };
          }
          return { ok: true, latency_ms: latency, data };
        }
        if (action === "health") {
          return { ok: true, latency_ms: latency, data };
        }
        if (Array.isArray(data)) {
          return { ok: true, latency_ms: latency, count: data.length };
        }
        return { ok: false, error: "Resposta não é array", latency_ms: latency,
          cause: `${action} deve retornar um array JSON`,
          solution: "Verifique json_encode no api.php" };
      } catch {
        return { ok: false, error: "JSON inválido", latency_ms: latency,
          cause: "Resposta não é JSON válido — possível erro PHP",
          solution: "Abra a URL no navegador e verifique se há warnings PHP antes do JSON" };
      }
    } catch (e: any) {
      const latency = Math.round(performance.now() - t0);
      const err = classifyError(e, action);
      return { ok: false, error: err.message, latency_ms: latency, cause: err.cause, solution: err.solution };
    }
  };

  const checkHealth = useCallback(async (platform: Plataforma): Promise<ApiHealthResult> => {
    const apiUrl = getApiUrl(platform);
    const result: ApiHealthResult = {
      platform_id: platform.id,
      platform_name: platform.nome,
      api_url: apiUrl ?? "Não configurada",
      status: "offline",
      latency_ms: 0,
      endpoints: {
        health: { ok: false },
        stats: { ok: false },
        depositos: { ok: false },
        saques: { ok: false },
      },
      errors: [],
      checked_at: new Date().toISOString(),
    };

    if (!apiUrl) {
      result.errors.push({
        endpoint: "geral", type: "NETWORK_ERROR",
        message: "URL da plataforma não configurada",
        cause: "A plataforma não possui URL definida.",
        solution: "Vá em Configurar → aba API e defina a URL da plataforma.",
      });
      return result;
    }

    // Test all 4 endpoints in parallel
    const [health, stats, depositos, saques] = await Promise.all([
      testEndpoint(apiUrl, "health"),
      testEndpoint(apiUrl, "stats"),
      testEndpoint(apiUrl, "depositos"),
      testEndpoint(apiUrl, "saques"),
    ]);

    result.endpoints = { health, stats, depositos, saques };
    result.latency_ms = Math.max(health.latency_ms ?? 0, stats.latency_ms ?? 0, depositos.latency_ms ?? 0, saques.latency_ms ?? 0);

    // Collect errors with diagnostics
    for (const [name, ep] of Object.entries(result.endpoints)) {
      if (!ep.ok && ep.error) {
        result.errors.push({
          endpoint: name,
          type: ep.httpStatus === 404 ? "ENDPOINT_NOT_FOUND" :
                ep.error.includes("Timeout") ? "TIMEOUT" :
                ep.error.includes("CORS") ? "CORS_ERROR" :
                ep.httpStatus && ep.httpStatus >= 500 ? "SERVER_ERROR" : "NETWORK_ERROR",
          message: ep.error,
          cause: ep.cause ?? "Causa desconhecida",
          solution: ep.solution ?? "Verifique a configuração da API",
          httpStatus: ep.httpStatus,
        });
      }
    }

    // Determine overall status
    const okCount = [stats.ok, depositos.ok, saques.ok].filter(Boolean).length;
    if (okCount === 3) result.status = "online";
    else if (okCount >= 1) result.status = "unstable";
    else if (stats.ok) result.status = "error";
    else result.status = "offline";

    return result;
  }, []);

  const syncPlatformData = async (platform: Plataforma): Promise<{ success: boolean; fromCache: boolean; error?: DiagnosticError }> => {
    setLoading(true);
    const statsResult = await fetchStats(platform);

    if (!statsResult.data) {
      toast({
        title: "❌ Falha ao sincronizar",
        description: statsResult.error?.message ?? `API de ${platform.nome} não respondeu`,
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, fromCache: false, error: statsResult.error };
    }

    try {
      const saldoValue = Number(statsResult.data.saldo_total) || 0;
      const { error: updateError } = await supabase.from("plataformas").update({
        total_usuarios: statsResult.data.total_usuarios ?? 0,
        total_afiliados: statsResult.data.total_afiliados ?? 0,
        saldo_total: saldoValue,
        status: "online" as const,
        ultimo_sync: new Date().toISOString(),
      }).eq("id", platform.id);
      
      if (updateError) {
        console.error(`[SyncPlatform] Erro ao atualizar ${platform.nome}:`, updateError.message);
      }

      const cacheNote = statsResult.fromCache ? " (cache)" : "";
      toast({
        title: `✅ ${platform.nome} sincronizada!${cacheNote}`,
        description: `${statsResult.data.total_usuarios} usuários, ${statsResult.data.total_afiliados} afiliados`,
      });
      setLoading(false);
      return { success: true, fromCache: statsResult.fromCache };
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" });
      setLoading(false);
      return { success: false, fromCache: false };
    }
  };

  const clearCache = (platformId?: string) => {
    if (platformId) {
      for (const key of cacheRef.current.keys()) {
        if (key.startsWith(`${platformId}:`)) cacheRef.current.delete(key);
      }
    } else {
      cacheRef.current.clear();
    }
  };

  return {
    loading,
    fetchStats,
    fetchDepositos,
    fetchSaques,
    aprovarSaque,
    rejeitarSaque,
    removerAfiliados,
    checkHealth,
    syncPlatformData,
    clearCache,
    testEndpoint,
  };
};
