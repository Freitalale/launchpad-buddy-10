import { useState } from "react";
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

export interface ApiHealthResult {
  platform_id: string;
  platform_name: string;
  api_url: string;
  status: "online" | "offline" | "error";
  latency_ms: number;
  endpoints: {
    stats: { ok: boolean; error?: string; data?: ApiStats };
    depositos: { ok: boolean; error?: string; count?: number };
    saques: { ok: boolean; error?: string; count?: number };
  };
  errors: string[];
  checked_at: string;
}

function getApiUrl(platform: Plataforma): string | null {
  if (!platform.url) return null;
  const base = platform.url.replace(/\/$/, "");
  // If URL already ends with api.php, use as-is
  if (base.endsWith("api.php")) return base;
  return `${base}/api.php`;
}

export const usePlatformApi = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const fetchStats = async (platform: Plataforma): Promise<ApiStats | null> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return null;
    try {
      const res = await fetch(`${apiUrl}?action=stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      console.error(`[API] Stats error for ${platform.nome}:`, e.message);
      return null;
    }
  };

  const fetchDepositos = async (platform: Plataforma): Promise<ApiDeposito[]> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return [];
    try {
      const res = await fetch(`${apiUrl}?action=depositos`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      console.error(`[API] Depositos error for ${platform.nome}:`, e.message);
      return [];
    }
  };

  const fetchSaques = async (platform: Plataforma): Promise<ApiSaque[]> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return [];
    try {
      const res = await fetch(`${apiUrl}?action=saques`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      console.error(`[API] Saques error for ${platform.nome}:`, e.message);
      return [];
    }
  };

  const aprovarSaque = async (platform: Plataforma, saqueId: number): Promise<boolean> => {
    const apiUrl = getApiUrl(platform);
    if (!apiUrl) return false;
    try {
      const formData = new FormData();
      formData.append("id", String(saqueId));
      const res = await fetch(`${apiUrl}?action=aprovar_saque`, { method: "POST", body: formData });
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
      const res = await fetch(`${apiUrl}?action=rejeitar_saque`, { method: "POST", body: formData });
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
      const res = await fetch(`${apiUrl}?action=remover_afiliados`, { method: "POST" });
      const data = await res.json();
      return !!data.ok;
    } catch (e: any) {
      toast({ title: "Erro ao remover afiliados", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const checkHealth = async (platform: Plataforma): Promise<ApiHealthResult> => {
    const apiUrl = getApiUrl(platform);
    const result: ApiHealthResult = {
      platform_id: platform.id,
      platform_name: platform.nome,
      api_url: apiUrl ?? "Não configurada",
      status: "offline",
      latency_ms: 0,
      endpoints: {
        stats: { ok: false },
        depositos: { ok: false },
        saques: { ok: false },
      },
      errors: [],
      checked_at: new Date().toISOString(),
    };

    if (!apiUrl) {
      result.errors.push("URL da plataforma não configurada");
      return result;
    }

    // Test stats endpoint
    const t0 = performance.now();
    try {
      const res = await fetch(`${apiUrl}?action=stats`, { signal: AbortSignal.timeout(10000) });
      result.latency_ms = Math.round(performance.now() - t0);
      if (!res.ok) {
        result.errors.push(`Endpoint stats retornou HTTP ${res.status}`);
        result.endpoints.stats = { ok: false, error: `HTTP ${res.status}` };
      } else {
        const data = await res.json();
        if (data.total_usuarios !== undefined) {
          result.endpoints.stats = { ok: true, data };
          result.status = "online";
        } else {
          result.endpoints.stats = { ok: false, error: "Resposta inválida — campos total_usuarios, total_afiliados, saldo_total ausentes" };
          result.errors.push("Endpoint stats retorna JSON incompleto. Verifique se o api.php retorna total_usuarios, total_afiliados e saldo_total.");
        }
      }
    } catch (e: any) {
      result.latency_ms = Math.round(performance.now() - t0);
      const msg = e.name === "TimeoutError" ? "Timeout (>10s) — servidor não respondeu" : 
                  e.name === "TypeError" ? "Erro de rede/CORS — verifique se a API tem header Access-Control-Allow-Origin: *" :
                  e.message;
      result.endpoints.stats = { ok: false, error: msg };
      result.errors.push(`stats: ${msg}`);
    }

    // Test depositos endpoint
    try {
      const res = await fetch(`${apiUrl}?action=depositos`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        result.endpoints.depositos = { ok: false, error: `HTTP ${res.status}` };
        result.errors.push(`Endpoint depositos retornou HTTP ${res.status}`);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          result.endpoints.depositos = { ok: true, count: data.length };
          if (data.length > 0 && !data[0].nome_usuario) {
            result.errors.push("Endpoint depositos: campo 'nome_usuario' ausente. Verifique o JOIN com a tabela users.");
          }
        } else {
          result.endpoints.depositos = { ok: false, error: "Resposta não é um array" };
          result.errors.push("Endpoint depositos deve retornar um array JSON.");
        }
      }
    } catch (e: any) {
      const msg = e.name === "TimeoutError" ? "Timeout" : e.name === "TypeError" ? "Erro de rede/CORS" : e.message;
      result.endpoints.depositos = { ok: false, error: msg };
      result.errors.push(`depositos: ${msg}`);
    }

    // Test saques endpoint
    try {
      const res = await fetch(`${apiUrl}?action=saques`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        result.endpoints.saques = { ok: false, error: `HTTP ${res.status}` };
        result.errors.push(`Endpoint saques retornou HTTP ${res.status}`);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          result.endpoints.saques = { ok: true, count: data.length };
          if (data.length > 0 && !data[0].nome_usuario) {
            result.errors.push("Endpoint saques: campo 'nome_usuario' ausente. Verifique o JOIN com a tabela users.");
          }
        } else {
          result.endpoints.saques = { ok: false, error: "Resposta não é um array" };
          result.errors.push("Endpoint saques deve retornar um array JSON.");
        }
      }
    } catch (e: any) {
      const msg = e.name === "TimeoutError" ? "Timeout" : e.name === "TypeError" ? "Erro de rede/CORS" : e.message;
      result.endpoints.saques = { ok: false, error: msg };
      result.errors.push(`saques: ${msg}`);
    }

    // Final status
    if (result.endpoints.stats.ok && result.endpoints.depositos.ok && result.endpoints.saques.ok) {
      result.status = "online";
    } else if (result.endpoints.stats.ok) {
      result.status = "error"; // partial
    } else {
      result.status = "offline";
    }

    return result;
  };

  const syncPlatformData = async (platform: Plataforma): Promise<boolean> => {
    setLoading(true);
    try {
      const stats = await fetchStats(platform);
      if (!stats) {
        toast({ title: "Falha ao sincronizar", description: `API de ${platform.nome} não respondeu`, variant: "destructive" });
        setLoading(false);
        return false;
      }

      // Update platform stats in Supabase
      await supabase.from("plataformas").update({
        total_usuarios: stats.total_usuarios,
        total_afiliados: stats.total_afiliados,
        saldo_total: stats.saldo_total,
        status: "online",
        ultimo_sync: new Date().toISOString(),
      }).eq("id", platform.id);

      toast({ title: `✅ ${platform.nome} sincronizada!`, description: `${stats.total_usuarios} usuários, ${stats.total_afiliados} afiliados` });
      setLoading(false);
      return true;
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" });
      setLoading(false);
      return false;
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
  };
};
