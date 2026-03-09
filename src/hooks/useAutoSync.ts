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

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "pendente";
  const s = status.toLowerCase().trim();
  const map: Record<string, string> = {
    pending: "pendente", approved: "aprovado", rejected: "rejeitado",
    completed: "aprovado", declined: "rejeitado", canceled: "rejeitado",
    cancelled: "rejeitado", denied: "rejeitado", paid: "aprovado",
    processing: "pendente",
  };
  return map[s] ?? s;
}

// ==================== Notification Dispatcher ====================

async function dispatchNotification(
  userId: string,
  eventName: string,
  platformName: string,
  platformId: string,
  variables: Record<string, string>,
) {
  try {
    // Get telegram config
    const { data: tgConfig } = await supabase
      .from("telegram_config")
      .select("*")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();

    // Get event templates
    const { data: events } = await supabase
      .from("telegram_eventos")
      .select("*")
      .eq("user_id", userId)
      .eq("nome", eventName)
      .eq("ativo", true)
      .maybeSingle();

    if (!events) return;

    // Get per-platform toggles
    const { data: platData } = await supabase
      .from("plataformas")
      .select("mapeamento_extra")
      .eq("id", platformId)
      .single();

    const extra = (platData?.mapeamento_extra as any) ?? {};
    const toggles = extra.notif_event_toggles?.[eventName] ?? { tg: true, pc: true };

    // Resolve variables in message
    const resolve = (msg: string) => {
      let result = msg;
      for (const [key, val] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }
      return result;
    };

    // Send Telegram
    if (tgConfig?.bot_token && tgConfig?.chat_id && toggles.tg) {
      const tgMsg = resolve(events.mensagem);
      const notifFlag = `notif_${eventName === "novo_usuario" ? "novo_usuario" : 
        eventName === "deposito" ? "deposito" : 
        eventName === "saque" ? "saque" : 
        eventName === "plataforma_offline" ? "plataforma_offline" :
        eventName === "erro" ? "erro" : 
        eventName === "cooperacao" ? "cooperacao" : "deposito"}`;
      
      const shouldSend = (tgConfig as any)[notifFlag] !== false;
      if (shouldSend) {
        try {
          const { data: tgResult, error: tgError } = await supabase.functions.invoke("send-telegram", {
            body: { bot_token: tgConfig.bot_token, chat_id: tgConfig.chat_id, message: tgMsg },
          });
          const ok = !tgError && tgResult?.ok;
          await supabase.from("notificacao_logs").insert({
            user_id: userId, canal: "telegram", evento: eventName,
            mensagem: tgMsg, status: ok ? "success" : "error",
            erro: ok ? null : (tgError?.message || tgResult?.description || "Falha desconhecida"),
            plataforma_id: platformId, plataforma_nome: platformName,
            destinatario: tgConfig.chat_id,
          } as any);
          console.log(`[Notif] ${ok ? "✅" : "❌"} Telegram ${eventName} → ${platformName}`);
        } catch (e: any) {
          await supabase.from("notificacao_logs").insert({
            user_id: userId, canal: "telegram", evento: eventName,
            mensagem: resolve(events.mensagem), status: "error", erro: e.message,
            plataforma_id: platformId, plataforma_nome: platformName,
          } as any);
        }
      }
    }

    // Send PushCut
    if ((tgConfig as any)?.pushcut_url && (tgConfig as any)?.pushcut_ativo && toggles.pc) {
      const pcMsg = resolve(events.mensagem_pushcut || events.mensagem);
      try {
        const pcRes = await fetch((tgConfig as any).pushcut_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${eventName === "deposito" ? "💰" : eventName === "saque" ? "💸" : eventName === "novo_usuario" ? "🆕" : "📢"} ${platformName}`,
            text: pcMsg,
          }),
        });
        const ok = pcRes.ok;
        await supabase.from("notificacao_logs").insert({
          user_id: userId, canal: "pushcut", evento: eventName,
          mensagem: pcMsg, status: ok ? "success" : "error",
          erro: ok ? null : `HTTP ${pcRes.status}`,
          plataforma_id: platformId, plataforma_nome: platformName,
          destinatario: (tgConfig as any).pushcut_url,
        } as any);
        console.log(`[Notif] ${ok ? "✅" : "❌"} PushCut ${eventName} → ${platformName}`);
      } catch (e: any) {
        await supabase.from("notificacao_logs").insert({
          user_id: userId, canal: "pushcut", evento: eventName,
          mensagem: pcMsg, status: "error", erro: e.message,
          plataforma_id: platformId, plataforma_nome: platformName,
        } as any);
        console.warn(`[Notif] ⚠️ PushCut falhou:`, e);
      }
    }

    // Also check per-platform specific pushcut/telegram settings
    const platPcUrl = extra.notif_pushcut_url;
    const platPcAtivo = extra.notif_pushcut_ativo;
    if (platPcUrl && platPcAtivo && toggles.pc) {
      const pcMsg = resolve(events.mensagem_pushcut || events.mensagem);
      try {
        await fetch(platPcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${eventName === "deposito" ? "💰" : eventName === "saque" ? "💸" : "📢"} ${platformName}`,
            text: pcMsg,
          }),
        });
      } catch { /* skip */ }
    }

    const platTgToken = extra.notif_telegram_bot_token;
    const platTgChatId = extra.notif_telegram_chat_id;
    const platTgAtivo = extra.notif_telegram_ativo;
    if (platTgToken && platTgChatId && platTgAtivo && toggles.tg) {
      const tgMsg = resolve(events.mensagem);
      await supabase.functions.invoke("send-telegram", {
        body: { bot_token: platTgToken, chat_id: platTgChatId, message: tgMsg },
      });
    }
  } catch (e) {
    console.warn(`[Notif] ⚠️ dispatchNotification falhou para ${eventName}:`, e);
  }
}

// ==================== Auto Sync Hook ====================

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

  // Track previously seen data to detect NEW items
  const prevDepositCountRef = useRef<Map<string, number>>(new Map());
  const prevSaqueCountRef = useRef<Map<string, number>>(new Map());
  const prevUserCountRef = useRef<Map<string, number>>(new Map());
  const initialSyncDoneRef = useRef(false);

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
    const byOriginalId = new Map<string, typeof saques[0]>();
    for (const saq of saques) {
      const key = saq.id ? String(saq.id) : `${saq.nome_usuario}_${saq.valor}_${saq.created_at}`;
      const existing = byOriginalId.get(key);
      if (!existing || new Date(saq.created_at) > new Date(existing.created_at)) {
        byOriginalId.set(key, saq);
      }
    }
    const dedupedSaques = Array.from(byOriginalId.values());

    const batch = dedupedSaques.slice(0, 500).map(saq => ({
      user_id: userId,
      plataforma_id: platform.id,
      plataforma_nome: platform.nome,
      nome_usuario: saq.nome_usuario || "Desconhecido",
      valor: Number(saq.valor) || 0,
      pix: saq.pix || null,
      status: normalizeStatus(saq.status),
      created_at: saq.created_at || new Date().toISOString(),
      original_id: saq.id ? String(saq.id) : null,
    }));

    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      try {
        const { error } = await supabase.from("saques").upsert(chunk, {
          onConflict: "user_id,plataforma_id,nome_usuario,valor,created_at",
          ignoreDuplicates: false,
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
          platform_id: p.id, platform_name: p.nome, status: "offline",
          lastSync: null, lastLatency: 0,
          offlineSince: offlineTimersRef.current.get(p.id) ?? null,
          alertSent: false, fromCache: false,
        };

        const [statsResult, depositsResult, saquesResult] = await Promise.all([
          api.fetchStats(p), api.fetchDepositos(p), api.fetchSaques(p),
        ]);

        if (saquesResult.error) console.error(`[AutoSync] ❌ Saques ERRO em ${p.nome}:`, saquesResult.error.message);
        if (depositsResult.error) console.error(`[AutoSync] ❌ Depositos ERRO em ${p.nome}:`, depositsResult.error.message);

        state.fromCache = statsResult.fromCache;
        state.errorMessage = statsResult.error?.message;

        const hasAnyData = statsResult.data || depositsResult.data.length > 0 || saquesResult.data.length > 0;

        if (hasAnyData) {
          state.status = statsResult.fromCache ? "unstable" : "online";
          state.lastSync = new Date().toISOString();
          offlineTimersRef.current.delete(p.id);

          if (statsResult.data) {
            const saldoValue = Number(statsResult.data.saldo_total) || 0;
            const { error: updateError } = await supabase.from("plataformas").update({
              total_usuarios: statsResult.data.total_usuarios ?? 0,
              total_afiliados: statsResult.data.total_afiliados ?? 0,
              saldo_total: saldoValue,
              status: "online" as const,
              ultimo_sync: new Date().toISOString(),
            }).eq("id", p.id);
            if (updateError) console.error(`[AutoSync] Erro atualizar ${p.nome}:`, updateError.message);

            // === DETECT NEW USERS → NOTIFY ===
            if (initialSyncDoneRef.current) {
              const prevUsers = prevUserCountRef.current.get(p.id) ?? 0;
              const currentUsers = statsResult.data.total_usuarios ?? 0;
              if (currentUsers > prevUsers && prevUsers > 0) {
                const diff = currentUsers - prevUsers;
                console.log(`[AutoSync] 🆕 ${diff} novo(s) usuário(s) em ${p.nome}`);
                await dispatchNotification(user.id, "novo_usuario", p.nome, p.id, {
                  nome_usuario: `${diff} novo(s)`,
                  nome_plataforma: p.nome,
                  quantidade_usuarios: String(currentUsers),
                });
                await supabase.from("notificacoes").insert({
                  user_id: user.id,
                  titulo: `🆕 ${diff} novo(s) usuário(s) — ${p.nome}`,
                  mensagem: `${diff} novo(s) cadastro(s) detectado(s). Total: ${currentUsers}`,
                  tipo: "info",
                  plataforma_nome: p.nome,
                  plataforma_id: p.id,
                } as any);
              }
              prevUserCountRef.current.set(p.id, currentUsers);
            } else {
              prevUserCountRef.current.set(p.id, statsResult.data.total_usuarios ?? 0);
            }
          }

          // === DETECT NEW DEPOSITS → NOTIFY ===
          if (depositsResult.data.length > 0) {
            state.depositsSynced = await syncDepositsToSupabase(p, depositsResult.data, user.id);

            if (initialSyncDoneRef.current) {
              const prevCount = prevDepositCountRef.current.get(p.id) ?? 0;
              const currentCount = depositsResult.data.length;
              if (currentCount > prevCount && prevCount > 0) {
                const newDeps = depositsResult.data.slice(0, currentCount - prevCount);
                for (const dep of newDeps.slice(0, 5)) { // max 5 notifications per cycle
                  console.log(`[AutoSync] 💰 Novo depósito em ${p.nome}: ${dep.nome_usuario} R$${dep.valor}`);
                  await dispatchNotification(user.id, "deposito", p.nome, p.id, {
                    nome_usuario: dep.nome_usuario || "Usuário",
                    valor: `R$ ${Number(dep.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    nome_plataforma: p.nome,
                    pix: dep.pix || "N/A",
                  });
                  await supabase.from("notificacoes").insert({
                    user_id: user.id,
                    titulo: `💰 Depósito — ${p.nome}`,
                    mensagem: `${dep.nome_usuario} depositou R$ ${Number(dep.valor).toFixed(2)}`,
                    tipo: "info",
                    plataforma_nome: p.nome,
                    plataforma_id: p.id,
                  } as any);
                }
              }
              prevDepositCountRef.current.set(p.id, currentCount);
            } else {
              prevDepositCountRef.current.set(p.id, depositsResult.data.length);
            }
          }

          // === DETECT NEW SAQUES → NOTIFY ===
          if (saquesResult.data.length > 0) {
            state.saquesSynced = await syncSaquesToSupabase(p, saquesResult.data, user.id);

            if (initialSyncDoneRef.current) {
              const prevCount = prevSaqueCountRef.current.get(p.id) ?? 0;
              const currentCount = saquesResult.data.length;
              if (currentCount > prevCount && prevCount > 0) {
                const newSaques = saquesResult.data.slice(0, currentCount - prevCount);
                for (const saq of newSaques.slice(0, 5)) {
                  console.log(`[AutoSync] 💸 Novo saque em ${p.nome}: ${saq.nome_usuario} R$${saq.valor}`);
                  await dispatchNotification(user.id, "saque", p.nome, p.id, {
                    nome_usuario: saq.nome_usuario || "Usuário",
                    valor: `R$ ${Number(saq.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    nome_plataforma: p.nome,
                    pix: saq.pix || "N/A",
                  });
                  await supabase.from("notificacoes").insert({
                    user_id: user.id,
                    titulo: `💸 Saque — ${p.nome}`,
                    mensagem: `${saq.nome_usuario} solicitou saque de R$ ${Number(saq.valor).toFixed(2)}`,
                    tipo: "warning",
                    plataforma_nome: p.nome,
                    plataforma_id: p.id,
                  } as any);
                }
              }
              prevSaqueCountRef.current.set(p.id, currentCount);
            } else {
              prevSaqueCountRef.current.set(p.id, saquesResult.data.length);
            }
          }
        } else {
          // Platform offline
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

            await dispatchNotification(user.id, "plataforma_offline", p.nome, p.id, {
              nome_plataforma: p.nome,
            });

            await supabase.from("plataformas").update({ status: "offline" as const }).eq("id", p.id);
            await supabase.from("logs").insert({
              user_id: user.id, acao: "API Offline Detectada",
              detalhes: `${p.nome} offline há ${Math.round(offlineDuration / 1000)}s — ${statsResult.error?.message ?? ""}`,
              plataforma_nome: p.nome, plataforma_id: p.id, tipo: "error",
            });
          }
        }

        return state;
      })
    );

    // Mark initial sync as done so future cycles can detect NEW data
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      console.log("[AutoSync] 🏁 Sync inicial completo — próximos ciclos detectarão novos eventos");
    }

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

  return { syncStates, lastGlobalSync, syncing, syncNow: syncAll };
};
