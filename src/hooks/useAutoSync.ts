import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Plataforma } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiDeposito, type ApiSaque } from "@/hooks/usePlatformApi";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_INTERVAL = 60_000; // 60 seconds (was 30s - reduced to avoid request flood)
const ALERT_THRESHOLD = 120_000; // 2 min offline → alert

interface PlatformSyncState {
  platform_id: string;
  platform_name: string;
  status: "online" | "offline" | "error" | "unstable" | "syncing";
  lastSync: string | null;
  lastLatency: number;
  offlineSince: number | null;
  alertSent: boolean;
  fromCache: boolean;
  errorMessage?: string;
  depositsSynced?: number;
  saquesSynced?: number;
}

export const useAutoSync = (platforms: Plataforma[], enabled = true) => {
  const { user } = useAuth();
  const api = usePlatformApi();
  const qc = useQueryClient();
  const [syncStates, setSyncStates] = useState<Map<string, PlatformSyncState>>(new Map());
  const [lastGlobalSync, setLastGlobalSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offlineTimersRef = useRef<Map<string, number>>(new Map());
  const syncingRef = useRef(false);

  const syncDepositsToSupabase = async (platform: Plataforma, deposits: ApiDeposito[], userId: string) => {
    if (!deposits.length) return 0;
    let synced = 0;
    for (const dep of deposits.slice(0, 200)) {
      try {
        // Upsert by matching platform + user name + date (avoid duplicates)
        const { error } = await supabase.from("depositos").upsert({
          user_id: userId,
          plataforma_id: platform.id,
          plataforma_nome: platform.nome,
          nome_usuario: dep.nome_usuario || "Desconhecido",
          valor: Number(dep.valor) || 0,
          pix: dep.pix || null,
          status: dep.status || "pendente",
          created_at: dep.created_at || new Date().toISOString(),
        }, {
          onConflict: "id", // Will insert new records
          ignoreDuplicates: true,
        });
        if (!error) synced++;
      } catch {
        // Skip individual errors
      }
    }
    return synced;
  };

  const syncSaquesToSupabase = async (platform: Plataforma, saques: ApiSaque[], userId: string) => {
    if (!saques.length) return 0;
    let synced = 0;
    for (const saq of saques.slice(0, 200)) {
      try {
        const { error } = await supabase.from("saques").upsert({
          user_id: userId,
          plataforma_id: platform.id,
          plataforma_nome: platform.nome,
          nome_usuario: saq.nome_usuario || "Desconhecido",
          valor: Number(saq.valor) || 0,
          pix: saq.pix || null,
          status: saq.status || "pendente",
          created_at: saq.created_at || new Date().toISOString(),
        }, {
          onConflict: "id",
          ignoreDuplicates: true,
        });
        if (!error) synced++;
      } catch {
        // Skip individual errors
      }
    }
    return synced;
  };

  const syncAll = useCallback(async () => {
    if (!user || platforms.length === 0 || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);

    const results = await Promise.all(
      platforms.filter(p => p.url).map(async (p) => {
        const state: PlatformSyncState = {
          platform_id: p.id,
          platform_name: p.nome,
          status: "offline",
          lastSync: null,
          lastLatency: 0,
          offlineSince: offlineTimersRef.current.get(p.id) ?? null,
          alertSent: false,
          fromCache: false,
        };

        // Fetch stats, deposits, and saques in parallel
        const [statsResult, depositsResult, saquesResult] = await Promise.all([
          api.fetchStats(p),
          api.fetchDepositos(p),
          api.fetchSaques(p),
        ]);

        state.fromCache = statsResult.fromCache;
        state.errorMessage = statsResult.error?.message;

        if (statsResult.data) {
          state.status = statsResult.fromCache ? "unstable" : "online";
          state.lastSync = new Date().toISOString();
          offlineTimersRef.current.delete(p.id);

          // Update platform stats in DB
          await supabase.from("plataformas").update({
            total_usuarios: statsResult.data.total_usuarios,
            total_afiliados: statsResult.data.total_afiliados,
            saldo_total: statsResult.data.saldo_total,
            status: "online" as const,
            ultimo_sync: new Date().toISOString(),
          }).eq("id", p.id);

          // Sync deposits and withdrawals to Supabase
          if (depositsResult.data.length > 0) {
            state.depositsSynced = await syncDepositsToSupabase(p, depositsResult.data, user.id);
          }
          if (saquesResult.data.length > 0) {
            state.saquesSynced = await syncSaquesToSupabase(p, saquesResult.data, user.id);
          }
        } else {
          state.status = "offline";
          if (!offlineTimersRef.current.has(p.id)) {
            offlineTimersRef.current.set(p.id, Date.now());
          }
          state.offlineSince = offlineTimersRef.current.get(p.id) ?? Date.now();

          const offlineDuration = Date.now() - state.offlineSince;
          if (offlineDuration >= ALERT_THRESHOLD) {
            state.alertSent = true;
            await supabase.from("notificacoes").insert({
              user_id: user.id,
              titulo: `🚨 ${p.nome} — API Offline`,
              mensagem: `A plataforma ${p.nome} está offline há ${Math.round(offlineDuration / 1000)}s. ${statsResult.error?.message ?? ""}`,
              tipo: "error",
              plataforma_nome: p.nome,
              plataforma_id: p.id,
            } as any);

            const { data: telegramConfig } = await supabase
              .from("telegram_config")
              .select("*")
              .eq("user_id", user.id)
              .eq("ativo", true)
              .maybeSingle();

            if (telegramConfig?.bot_token && telegramConfig?.chat_id && telegramConfig?.notif_plataforma_offline) {
              await supabase.functions.invoke("send-telegram", {
                body: {
                  bot_token: telegramConfig.bot_token,
                  chat_id: telegramConfig.chat_id,
                  message: `🚨 <b>PLATAFORMA OFFLINE</b>\n\n📍 Plataforma: ${p.nome}\n⏱ Offline há: ${Math.round(offlineDuration / 1000)}s\n❌ Erro: ${statsResult.error?.message ?? "Sem resposta"}\n\n💡 Verifique o servidor da hospedagem.`,
                },
              });
            }

            await supabase.from("plataformas").update({
              status: "offline" as const,
            }).eq("id", p.id);

            await supabase.from("logs").insert({
              user_id: user.id,
              acao: "API Offline Detectada",
              detalhes: `${p.nome} offline há ${Math.round(offlineDuration / 1000)}s — ${statsResult.error?.message ?? ""}`,
              plataforma_nome: p.nome,
              plataforma_id: p.id,
              tipo: "error",
            });
          }
        }

        return state;
      })
    );

    const newMap = new Map<string, PlatformSyncState>();
    results.forEach(s => newMap.set(s.platform_id, s));
    setSyncStates(newMap);
    setLastGlobalSync(new Date().toISOString());
    setSyncing(false);
    syncingRef.current = false;
    qc.invalidateQueries({ queryKey: ["plataformas"] });
    qc.invalidateQueries({ queryKey: ["depositos"] });
    qc.invalidateQueries({ queryKey: ["saques"] });
  }, [user, platforms, api, qc]);

  useEffect(() => {
    if (!enabled || !user || platforms.length === 0) return;

    // Initial sync after small delay
    const initialTimeout = setTimeout(syncAll, 2000);

    intervalRef.current = setInterval(syncAll, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, user, platforms.length, syncAll]);

  return {
    syncStates,
    lastGlobalSync,
    syncing,
    syncNow: syncAll,
  };
};
