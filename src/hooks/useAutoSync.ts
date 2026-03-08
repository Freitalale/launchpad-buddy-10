import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Plataforma } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiHealthResult } from "@/hooks/usePlatformApi";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_INTERVAL = 30_000; // 30 seconds
const ALERT_THRESHOLD = 60_000; // 60 seconds offline → alert

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

  const syncAll = useCallback(async () => {
    if (!user || platforms.length === 0) return;
    setSyncing(true);

    const results = await Promise.all(
      platforms.filter(p => p.url).map(async (p) => {
        const statsResult = await api.fetchStats(p);
        const state: PlatformSyncState = {
          platform_id: p.id,
          platform_name: p.nome,
          status: "offline",
          lastSync: null,
          lastLatency: 0,
          offlineSince: offlineTimersRef.current.get(p.id) ?? null,
          alertSent: false,
          fromCache: statsResult.fromCache,
          errorMessage: statsResult.error?.message,
        };

        if (statsResult.data) {
          state.status = statsResult.fromCache ? "unstable" : "online";
          state.lastSync = new Date().toISOString();
          offlineTimersRef.current.delete(p.id);

          // Update platform in DB silently
          await supabase.from("plataformas").update({
            total_usuarios: statsResult.data.total_usuarios,
            total_afiliados: statsResult.data.total_afiliados,
            saldo_total: statsResult.data.saldo_total,
            status: "online" as const,
            ultimo_sync: new Date().toISOString(),
          }).eq("id", p.id);
        } else {
          state.status = "offline";
          if (!offlineTimersRef.current.has(p.id)) {
            offlineTimersRef.current.set(p.id, Date.now());
          }
          state.offlineSince = offlineTimersRef.current.get(p.id) ?? Date.now();

          // Check if offline > threshold and alert not yet sent
          const offlineDuration = Date.now() - state.offlineSince;
          if (offlineDuration >= ALERT_THRESHOLD) {
            state.alertSent = true;
            // Create alert notification
            await supabase.from("notificacoes").insert({
              user_id: user.id,
              titulo: `🚨 ${p.nome} — API Offline`,
              mensagem: `A plataforma ${p.nome} está offline há ${Math.round(offlineDuration / 1000)}s. ${statsResult.error?.message ?? ""}`,
              tipo: "error",
              plataforma_nome: p.nome,
              plataforma_id: p.id,
            } as any);

            // Send Telegram alert
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

            // Update platform status to offline
            await supabase.from("plataformas").update({
              status: "offline" as const,
            }).eq("id", p.id);

            // Log the error
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
    qc.invalidateQueries({ queryKey: ["plataformas"] });
  }, [user, platforms, api, qc]);

  useEffect(() => {
    if (!enabled || !user || platforms.length === 0) return;

    // Initial sync
    syncAll();

    intervalRef.current = setInterval(syncAll, SYNC_INTERVAL);

    return () => {
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
