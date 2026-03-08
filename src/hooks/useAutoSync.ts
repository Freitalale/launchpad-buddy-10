import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Plataforma } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiDeposito, type ApiSaque } from "@/hooks/usePlatformApi";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_INTERVAL = 30_000;
const ALERT_THRESHOLD = 120_000;

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

/** Normalize English statuses to Portuguese */
function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "pendente";
  const s = status.toLowerCase().trim();
  const map: Record<string, string> = {
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
  };
  return map[s] ?? s;
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
    const batch = deposits.slice(0, 500).map(dep => ({
      user_id: userId,
      plataforma_id: platform.id,
      plataforma_nome: platform.nome,
      nome_usuario: dep.nome_usuario || "Desconhecido",
      valor: Number(dep.valor) || 0,
      pix: dep.pix || null,
      status: normalizeStatus(dep.status),
      created_at: dep.created_at || new Date().toISOString(),
    }));

    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      try {
        const { error } = await supabase.from("depositos").upsert(chunk, {
          onConflict: "user_id,plataforma_id,nome_usuario,valor,created_at",
          ignoreDuplicates: true,
        });
        if (error) {
          console.error(`[AutoSync] Erro depositos chunk ${i}:`, error.message);
        } else {
          synced += chunk.length;
        }
      } catch { /* skip */ }
    }
    return synced;
  };

  const syncSaquesToSupabase = async (platform: Plataforma, saques: ApiSaque[], userId: string) => {
    if (!saques.length) return 0;
    let synced = 0;
    const batch = saques.slice(0, 500).map(saq => ({
      user_id: userId,
      plataforma_id: platform.id,
      plataforma_nome: platform.nome,
      nome_usuario: saq.nome_usuario || "Desconhecido",
      valor: Number(saq.valor) || 0,
      pix: saq.pix || null,
      status: normalizeStatus(saq.status),
      created_at: saq.created_at || new Date().toISOString(),
    }));

    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      try {
        const { error } = await supabase.from("saques").upsert(chunk, {
          onConflict: "user_id,plataforma_id,nome_usuario,valor,created_at",
          ignoreDuplicates: true,
        });
        if (error) {
          console.error(`[AutoSync] Erro saques chunk ${i}:`, error.message);
        } else {
          synced += chunk.length;
        }
      } catch { /* skip */ }
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

        const [statsResult, depositsResult, saquesResult] = await Promise.all([
          api.fetchStats(p),
          api.fetchDepositos(p),
          api.fetchSaques(p),
        ]);

        // Log saques errors explicitly
        if (saquesResult.error) {
          console.error(`[AutoSync] ❌ Saques ERRO em ${p.nome}:`, saquesResult.error.message, saquesResult.error.cause);
        }
        if (depositsResult.error) {
          console.error(`[AutoSync] ❌ Depositos ERRO em ${p.nome}:`, depositsResult.error.message);
        }

        console.log(`[AutoSync] ${p.nome}: depositos=${depositsResult.data.length}, saques=${saquesResult.data.length}`);

        state.fromCache = statsResult.fromCache;
        state.errorMessage = statsResult.error?.message;

        // Sync deposits and saques even if stats fail (as long as we got data)
        const hasAnyData = statsResult.data || depositsResult.data.length > 0 || saquesResult.data.length > 0;

        if (hasAnyData) {
          state.status = statsResult.fromCache ? "unstable" : "online";
          state.lastSync = new Date().toISOString();
          offlineTimersRef.current.delete(p.id);

          if (statsResult.data) {
            const saldoValue = Number(statsResult.data.saldo_total) || 0;
            const updatePayload = {
              total_usuarios: statsResult.data.total_usuarios ?? 0,
              total_afiliados: statsResult.data.total_afiliados ?? 0,
              saldo_total: saldoValue,
              status: "online" as const,
              ultimo_sync: new Date().toISOString(),
            };
            const { error: updateError } = await supabase.from("plataformas").update(updatePayload).eq("id", p.id);
            if (updateError) {
              console.error(`[AutoSync] Erro atualizar plataforma ${p.nome}:`, updateError.message);
            } else {
              console.log(`[AutoSync] ${p.nome}: usuarios=${updatePayload.total_usuarios}, saldo=R$${saldoValue.toFixed(2)}`);
            }
          }

          if (depositsResult.data.length > 0) {
            state.depositsSynced = await syncDepositsToSupabase(p, depositsResult.data, user.id);
            console.log(`[AutoSync] ${p.nome}: ${state.depositsSynced} depositos sincronizados`);
          }
          if (saquesResult.data.length > 0) {
            state.saquesSynced = await syncSaquesToSupabase(p, saquesResult.data, user.id);
            console.log(`[AutoSync] ${p.nome}: ${state.saquesSynced} saques sincronizados`);
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
                  message: `🚨 <b>PLATAFORMA OFFLINE</b>\n\n📍 ${p.nome}\n⏱ Offline há: ${Math.round(offlineDuration / 1000)}s\n❌ ${statsResult.error?.message ?? "Sem resposta"}`,
                },
              });
            }

            await supabase.from("plataformas").update({ status: "offline" as const }).eq("id", p.id);
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
