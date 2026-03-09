import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play, CheckCircle, XCircle, Loader2, Server, Bell, Database,
  ArrowUpRight, DollarSign, Globe, Shield, RefreshCw, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatforms } from "@/hooks/usePlatforms";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TestStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  message: string;
  duration?: number;
  platformName?: string;
}

const TestSuite = () => {
  const { user } = useAuth();
  const { data: platforms = [] } = usePlatforms();
  const api = usePlatformApi();
  const { toast } = useToast();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateResult = (id: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
  };

  const runTest = async (id: string, name: string, category: string, fn: () => Promise<{ ok: boolean; msg: string }>, platformName?: string) => {
    const start = Date.now();
    setResults(prev => [...prev, { id, name, category, status: "running", message: "Executando...", platformName }]);
    try {
      const { ok, msg } = await fn();
      updateResult(id, { status: ok ? "pass" : "fail", message: msg, duration: Date.now() - start });
    } catch (e: any) {
      updateResult(id, { status: "fail", message: e.message || "Erro desconhecido", duration: Date.now() - start });
    }
  };

  const runAllTests = useCallback(async () => {
    if (!user) return;
    setResults([]);
    setRunning(true);
    setProgress(0);

    const totalTests = 6 + platforms.filter(p => p.url).length * 6;
    let completed = 0;
    const tick = () => { completed++; setProgress(Math.round((completed / totalTests) * 100)); };

    // === PAINEL TESTS ===
    await runTest("auth", "Autenticação", "Painel", async () => {
      const { data } = await supabase.auth.getSession();
      tick();
      return data.session ? { ok: true, msg: `Sessão ativa — ${data.session.user.email}` } : { ok: false, msg: "Sem sessão ativa" };
    });

    await runTest("db_plataformas", "Tabela Plataformas", "Banco de Dados", async () => {
      const { data, error } = await supabase.from("plataformas").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: `Acessível — ${platforms.length} plataformas` };
    });

    await runTest("db_logs", "Tabela Logs", "Banco de Dados", async () => {
      const { error } = await supabase.from("logs").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: "Acessível" };
    });

    await runTest("db_notificacoes", "Tabela Notificações", "Banco de Dados", async () => {
      const { error } = await supabase.from("notificacoes").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: "Acessível" };
    });

    await runTest("db_depositos", "Tabela Depósitos", "Banco de Dados", async () => {
      const { data, error } = await supabase.from("depositos").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: `Acessível — ${data?.length ?? 0} registros` };
    });

    await runTest("db_saques", "Tabela Saques", "Banco de Dados", async () => {
      const { data, error } = await supabase.from("saques").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: `Acessível — ${data?.length ?? 0} registros` };
    });

    // === TELEGRAM ===
    await runTest("telegram_config", "Config Telegram", "Notificações", async () => {
      const { data } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).maybeSingle();
      tick();
      if (!data) return { ok: false, msg: "Nenhuma configuração encontrada" };
      if (!data.ativo) return { ok: false, msg: "Telegram desativado" };
      if (!data.bot_token || !data.chat_id) return { ok: false, msg: "Bot token ou Chat ID vazio" };
      return { ok: true, msg: "Configurado e ativo" };
    });

    await runTest("telegram_send", "Envio Telegram Real", "Notificações", async () => {
      const { data: tg } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).eq("ativo", true).maybeSingle();
      tick();
      if (!tg?.bot_token || !tg?.chat_id) return { ok: false, msg: "Telegram não configurado" };
      const { data, error } = await supabase.functions.invoke("send-telegram", {
        body: { bot_token: tg.bot_token, chat_id: tg.chat_id, message: "🧪 Teste automático do Painel — Tudo funcionando!" },
      });
      if (error) return { ok: false, msg: error.message };
      return data?.ok ? { ok: true, msg: "Mensagem enviada com sucesso" } : { ok: false, msg: data?.description || "Falhou" };
    });

    // === PER-PLATFORM TESTS ===
    for (const p of platforms.filter(pl => pl.url)) {
      await runTest(`health_${p.id}`, "Health Check", "API Plataforma", async () => {
        const r = await api.testEndpoint(api.getApiUrl(p), "health");
        tick();
        return r.ok ? { ok: true, msg: `Online — ${r.latency_ms}ms` } : { ok: false, msg: r.error || "Offline" };
      }, p.nome);

      await runTest(`stats_${p.id}`, "Stats Endpoint", "API Plataforma", async () => {
        const r = await api.fetchStats(p);
        tick();
        return r.data ? { ok: true, msg: `${r.data.total_usuarios} users · R$ ${r.data.saldo_total}` } : { ok: false, msg: r.error?.message || "Sem dados" };
      }, p.nome);

      await runTest(`deps_${p.id}`, "Depósitos Endpoint", "API Plataforma", async () => {
        const r = await api.fetchDepositos(p);
        tick();
        return r.data.length > 0 ? { ok: true, msg: `${r.data.length} depósitos` } : r.error ? { ok: false, msg: r.error.message } : { ok: true, msg: "0 depósitos (vazio)" };
      }, p.nome);

      await runTest(`saqs_${p.id}`, "Saques Endpoint", "API Plataforma", async () => {
        const r = await api.fetchSaques(p);
        tick();
        return r.data.length > 0 ? { ok: true, msg: `${r.data.length} saques` } : r.error ? { ok: false, msg: r.error.message } : { ok: true, msg: "0 saques (vazio)" };
      }, p.nome);

      await runTest(`gateway_${p.id}`, "Gateway Pagamento", "Gateway", async () => {
        const extra = (p.mapeamento_extra as any) ?? {};
        const gw = extra.gateway;
        tick();
        if (!gw?.endpoint) return { ok: false, msg: "Nenhum gateway configurado" };
        return { ok: true, msg: `${gw.type || "api_rest"} → ${gw.endpoint}` };
      }, p.nome);

      await runTest(`mapping_${p.id}`, "Mapeamento Colunas", "Estrutura", async () => {
        tick();
        const missing: string[] = [];
        if (!p.tabela_usuarios) missing.push("tabela_usuarios");
        if (!p.coluna_id_usuario) missing.push("coluna_id_usuario");
        if (!p.tabela_depositos) missing.push("tabela_depositos");
        if (!p.tabela_saques) missing.push("tabela_saques");
        return missing.length > 0
          ? { ok: false, msg: `Faltam: ${missing.join(", ")}` }
          : { ok: true, msg: "Mapeamento completo" };
      }, p.nome);
    }

    // === NOTIFICATION LOG TABLE ===
    await runTest("notif_log_table", "Tabela Notificação Logs", "Banco de Dados", async () => {
      const { error } = await supabase.from("notificacao_logs").select("id").limit(1);
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: "Acessível" };
    });

    // === STORAGE ===
    await runTest("storage_logos", "Bucket Logos", "Storage", async () => {
      const { data, error } = await supabase.storage.from("logos").list("", { limit: 1 });
      tick();
      return error ? { ok: false, msg: error.message } : { ok: true, msg: "Bucket acessível" };
    });

    setRunning(false);
    setProgress(100);
    toast({ title: "Teste completo!" });
  }, [user, platforms, api]);

  const pass = results.filter(r => r.status === "pass").length;
  const fail = results.filter(r => r.status === "fail").length;
  const total = results.filter(r => r.status !== "idle" && r.status !== "running").length;

  const categories = Array.from(new Set(results.map(r => r.category)));

  const categoryIcons: Record<string, any> = {
    "Painel": Shield, "Banco de Dados": Database, "Notificações": Bell,
    "API Plataforma": Globe, "Gateway": Zap, "Estrutura": Server, "Storage": Database,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Teste <span className="gradient-text">Geral</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Validação completa de todas as funcionalidades do painel e plataformas</p>
        </div>
        <Button onClick={runAllTests} disabled={running} className="gap-2 h-9 text-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? `Testando... ${progress}%` : "Executar Testes"}
        </Button>
      </motion.div>

      {/* Progress */}
      {running && (
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "hsl(var(--primary))", width: `${progress}%` }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      )}

      {/* Summary */}
      {total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3">
          {[
            { label: "Passou", value: pass, color: "hsl(var(--neon-green))", icon: CheckCircle },
            { label: "Falhou", value: fail, color: "hsl(var(--neon-red))", icon: XCircle },
            { label: "Total", value: total, color: "hsl(var(--primary))", icon: RefreshCw },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))" }}>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{s.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Results by category */}
      {categories.map(cat => {
        const catResults = results.filter(r => r.category === cat);
        const CatIcon = categoryIcons[cat] || Server;
        return (
          <motion.div key={cat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-secondary/20">
              <CatIcon className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">{cat}</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">{catResults.filter(r => r.status === "pass").length}/{catResults.length} OK</span>
            </div>
            <div className="divide-y divide-border/20">
              {catResults.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  {r.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> :
                    r.status === "pass" ? <CheckCircle className="w-3.5 h-3.5 text-neon-green" /> :
                    r.status === "fail" ? <XCircle className="w-3.5 h-3.5 text-destructive" /> :
                    <div className="w-3.5 h-3.5 rounded-full bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{r.name}</span>
                      {r.platformName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{r.platformName}</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${r.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>
                      {r.message}
                    </p>
                  </div>
                  {r.duration !== undefined && (
                    <span className="text-[10px] font-mono text-muted-foreground">{r.duration}ms</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {results.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Clique em "Executar Testes" para iniciar</p>
          <p className="text-sm mt-1">Será testado: autenticação, banco, APIs, gateways, notificações e storage</p>
        </div>
      )}
    </div>
  );
};

export default TestSuite;
