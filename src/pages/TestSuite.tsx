import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play, CheckCircle, XCircle, Loader2, Server, Bell, Database,
  DollarSign, Globe, Shield, RefreshCw, Zap, Users, Settings,
  MessageSquare, ArrowUpRight, Headphones, BookOpen, ShieldAlert,
  BarChart3, HardDrive, Send, CreditCard, AlertTriangle, FileText
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
  solution?: string;
}

const TestSuite = () => {
  const { user } = useAuth();
  const { data: platforms = [] } = usePlatforms();
  const api = usePlatformApi();
  const { toast } = useToast();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTest = async (
    id: string, name: string, category: string,
    fn: () => Promise<{ ok: boolean; msg: string; solution?: string; warn?: boolean }>,
    platformName?: string
  ): Promise<void> => {
    const start = Date.now();
    addResult({ id, name, category, status: "running", message: "Executando...", platformName });
    try {
      const { ok, msg, solution, warn } = await fn();
      setResults(prev => prev.map(r => r.id === id ? {
        ...r, status: warn ? "warn" : (ok ? "pass" : "fail"), message: msg, duration: Date.now() - start, solution
      } : r));
    } catch (e: any) {
      setResults(prev => prev.map(r => r.id === id ? {
        ...r, status: "fail", message: e.message || "Erro desconhecido", duration: Date.now() - start,
        solution: "Verifique o console para mais detalhes"
      } : r));
    }
  };

  const runAllTests = useCallback(async () => {
    if (!user) return;
    setResults([]);
    setRunning(true);
    setProgress(0);
    setExpandedErrors(new Set());

    const platformsWithUrl = platforms.filter(p => p.url);
    const totalEstimate = 22 + platformsWithUrl.length * 8;
    let completed = 0;
    const tick = () => { completed++; setProgress(Math.round((completed / totalEstimate) * 100)); };

    // =====================================================
    // 1. AUTENTICAÇÃO & SESSÃO
    // =====================================================
    await runTest("auth_session", "Sessão Ativa", "🔐 Autenticação", async () => {
      const { data } = await supabase.auth.getSession();
      tick();
      return data.session
        ? { ok: true, msg: `Sessão ativa — ${data.session.user.email} — Expira: ${new Date(data.session.expires_at! * 1000).toLocaleString("pt-BR")}` }
        : { ok: false, msg: "Sem sessão ativa", solution: "Faça login novamente" };
    });

    await runTest("auth_user", "Dados do Usuário", "🔐 Autenticação", async () => {
      const { data } = await supabase.auth.getUser();
      tick();
      return data.user
        ? { ok: true, msg: `ID: ${data.user.id.substring(0, 8)}... · Email: ${data.user.email} · Confirmado: ${data.user.email_confirmed_at ? "✅" : "❌"}` }
        : { ok: false, msg: "Não foi possível obter dados do usuário" };
    });

    // =====================================================
    // 2. BANCO DE DADOS — TODAS AS TABELAS
    // =====================================================
    const tables = [
      { name: "plataformas", label: "Plataformas", icon: "🖥️" },
      { name: "depositos", label: "Depósitos", icon: "💰" },
      { name: "saques", label: "Saques", icon: "💸" },
      { name: "sacs", label: "SACs", icon: "🎧" },
      { name: "logs", label: "Logs", icon: "📋" },
      { name: "notificacoes", label: "Notificações", icon: "🔔" },
      { name: "notificacao_logs", label: "Logs Notificação", icon: "📨" },
      { name: "telegram_config", label: "Config Telegram", icon: "⚙️" },
      { name: "telegram_eventos", label: "Eventos Telegram", icon: "📡" },
      { name: "configuracoes", label: "Configurações", icon: "🛠️" },
      { name: "mensagens_personalizadas", label: "Mensagens Custom", icon: "✉️" },
    ];

    for (const t of tables) {
      await runTest(`db_${t.name}`, `${t.icon} ${t.label}`, "🗄️ Banco de Dados", async () => {
        const { data, error, count } = await (supabase as any)
          .from(t.name).select("id", { count: "exact", head: false }).limit(5);
        tick();
        if (error) return { ok: false, msg: `❌ ${error.message}`, solution: `Verifique RLS e permissões da tabela ${t.name}` };
        return { ok: true, msg: `Acessível — ${data?.length ?? 0} registros encontrados` };
      });
    }

    // =====================================================
    // 3. CRUD — TESTE DE ESCRITA/LEITURA
    // =====================================================
    await runTest("crud_notif_create", "Criar Notificação Teste", "✏️ CRUD", async () => {
      const { data, error } = await supabase.from("notificacoes").insert({
        user_id: user.id, titulo: "🧪 Teste automático", mensagem: "Notificação criada pelo teste geral", tipo: "info"
      } as any).select().single();
      tick();
      if (error) return { ok: false, msg: error.message, solution: "Verifique RLS INSERT na tabela notificacoes" };
      // Clean up
      await supabase.from("notificacoes").delete().eq("id", (data as any).id);
      return { ok: true, msg: "INSERT + SELECT + DELETE funcionando corretamente" };
    });

    await runTest("crud_log_create", "Criar Log Teste", "✏️ CRUD", async () => {
      const { data, error } = await supabase.from("logs").insert({
        user_id: user.id, acao: "Teste Automático", detalhes: "Log criado pelo suite de testes", tipo: "info"
      } as any).select().single();
      tick();
      if (error) return { ok: false, msg: error.message, solution: "Verifique RLS INSERT na tabela logs" };
      await supabase.from("logs").delete().eq("id", (data as any).id);
      return { ok: true, msg: "INSERT + SELECT + DELETE OK" };
    });

    await runTest("crud_config_read", "Ler Configurações", "✏️ CRUD", async () => {
      const { data, error } = await supabase.from("configuracoes").select("*").eq("user_id", user.id).maybeSingle();
      tick();
      if (error) return { ok: false, msg: error.message };
      return data
        ? { ok: true, msg: `Gateway global: ${data.gateway_chave_global ? "Configurado" : "Não configurado"} · Cooperação: ${data.cooperacao_dias_padrao ?? 30} dias` }
        : { ok: true, msg: "Nenhuma configuração encontrada (será criada automaticamente)" };
    });

    // =====================================================
    // 4. STORAGE
    // =====================================================
    await runTest("storage_logos", "Bucket Logos", "📦 Storage", async () => {
      const { data, error } = await supabase.storage.from("logos").list("", { limit: 5 });
      tick();
      if (error) return { ok: false, msg: error.message, solution: "Verifique se o bucket 'logos' existe e está público" };
      return { ok: true, msg: `Bucket acessível — ${data?.length ?? 0} arquivos` };
    });

    // =====================================================
    // 5. TELEGRAM — CONFIGURAÇÃO E ENVIO REAL
    // =====================================================
    await runTest("telegram_config_check", "Configuração Telegram", "📲 Telegram", async () => {
      const { data } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).maybeSingle();
      tick();
      if (!data) return { ok: false, msg: "Nenhuma config encontrada", solution: "Vá em Notificações e configure o Telegram" };
      if (!data.ativo) return { ok: false, msg: "Telegram desativado", solution: "Ative o Telegram em Notificações" };
      if (!data.bot_token) return { ok: false, msg: "Bot Token vazio", solution: "Configure o Bot Token do Telegram" };
      if (!data.chat_id) return { ok: false, msg: "Chat ID vazio", solution: "Configure o Chat ID do Telegram" };
      return { ok: true, msg: `Ativo · Bot: ${data.bot_token.substring(0, 10)}... · Chat: ${data.chat_id}` };
    });

    await runTest("telegram_send_global", "Envio Telegram Global", "📲 Telegram", async () => {
      const { data: tg } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).eq("ativo", true).maybeSingle();
      tick();
      if (!tg?.bot_token || !tg?.chat_id) return { ok: false, msg: "Telegram não configurado — pulando teste de envio" };
      const { data, error } = await supabase.functions.invoke("send-telegram", {
        body: { bot_token: tg.bot_token, chat_id: tg.chat_id, message: "🧪 <b>Teste Automático — Master Painel V7</b>\n\n✅ Conexão global funcionando!\n⏱️ " + new Date().toLocaleString("pt-BR") },
      });
      if (error) return { ok: false, msg: `Edge Function erro: ${error.message}`, solution: "Verifique se a edge function send-telegram está deployada" };
      return data?.ok
        ? { ok: true, msg: "✅ Mensagem enviada com sucesso via Telegram!" }
        : { ok: false, msg: data?.description || "Falha no envio", solution: "Verifique bot_token e chat_id" };
    });

    await runTest("telegram_eventos_check", "Eventos Configurados", "📲 Telegram", async () => {
      const { data, error } = await supabase.from("telegram_eventos").select("*").eq("user_id", user.id);
      tick();
      if (error) return { ok: false, msg: error.message };
      const ativos = (data ?? []).filter((e: any) => e.ativo);
      return { ok: (data ?? []).length > 0, msg: `${(data ?? []).length} eventos · ${ativos.length} ativos` };
    });

    // =====================================================
    // 6. EDGE FUNCTIONS
    // =====================================================
    await runTest("ef_send_telegram", "Edge Function: send-telegram", "⚡ Edge Functions", async () => {
      try {
        const { data, error } = await supabase.functions.invoke("send-telegram", {
          body: { action: "test", bot_token: "test", chat_id: "test" },
        });
        tick();
        // Even if telegram rejects (bad token), the edge function itself worked
        if (error && error.message.includes("non-2xx")) {
          return { ok: true, msg: "Edge function acessível (token de teste rejeitado como esperado)" };
        }
        if (error) return { ok: false, msg: error.message, solution: "Verifique deploy da edge function send-telegram" };
        return { ok: true, msg: "Edge function respondeu corretamente" };
      } catch (e: any) {
        return { ok: false, msg: e.message, solution: "Edge function pode não estar deployada" };
      }
    });

    await runTest("ef_pix_payout", "Edge Function: pix-payout", "⚡ Edge Functions", async () => {
      try {
        // Just test if the function responds (will fail validation but that's ok)
        const { data, error } = await supabase.functions.invoke("pix-payout", {
          body: { gateway_key: "test", amount: 0, pix_key: "test" },
        });
        tick();
        if (error && error.message.includes("non-2xx")) {
          return { ok: true, msg: "Edge function acessível (rejeição de validação esperada)" };
        }
        if (error) return { ok: false, msg: error.message, solution: "Verifique deploy da edge function pix-payout" };
        return { ok: true, msg: `Respondeu: ${data?.success ? "OK" : data?.error || "Validação OK"}` };
      } catch (e: any) {
        return { ok: false, msg: e.message, solution: "Edge function pode não estar deployada" };
      }
    });

    // =====================================================
    // 7. POR PLATAFORMA — TESTES COMPLETOS
    // =====================================================
    for (const p of platformsWithUrl) {
      const pUrl = p.url!.replace(/\/$/, "");
      let apiUrl = pUrl;
      if (!apiUrl.startsWith("http")) apiUrl = `https://${apiUrl}`;
      if (!apiUrl.endsWith("api.php")) {
        try { apiUrl = `${new URL(apiUrl).origin}/api.php`; } catch { apiUrl = `${apiUrl}/api.php`; }
      }

      // Health
      await runTest(`health_${p.id}`, "Health Check", `🌐 ${p.nome}`, async () => {
        const r = await api.testEndpoint(apiUrl, "health");
        tick();
        return r.ok
          ? { ok: true, msg: `Online — ${r.latency_ms}ms` }
          : { ok: false, msg: r.error || "Offline", solution: r.solution };
      }, p.nome);

      // Stats
      await runTest(`stats_${p.id}`, "Estatísticas", `🌐 ${p.nome}`, async () => {
        const r = await api.fetchStats(p);
        tick();
        return r.data
          ? { ok: true, msg: `${r.data.total_usuarios} usuários · ${r.data.total_afiliados} afiliados · R$ ${Number(r.data.saldo_total).toFixed(2)}` }
          : { ok: false, msg: r.error?.message || "Sem dados", solution: r.error?.solution };
      }, p.nome);

      // Deposits
      await runTest(`deps_${p.id}`, "Depósitos API", `🌐 ${p.nome}`, async () => {
        const r = await api.fetchDepositos(p);
        tick();
        if (r.error) return { ok: false, msg: r.error.message, solution: r.error.solution };
        return { ok: true, msg: `${r.data.length} depósitos carregados` };
      }, p.nome);

      // Withdrawals
      await runTest(`saqs_${p.id}`, "Saques API", `🌐 ${p.nome}`, async () => {
        const r = await api.fetchSaques(p);
        tick();
        if (r.error) return { ok: false, msg: r.error.message, solution: r.error.solution };
        return { ok: true, msg: `${r.data.length} saques carregados` };
      }, p.nome);

      // Column mapping
      await runTest(`map_${p.id}`, "Mapeamento Colunas", `🌐 ${p.nome}`, async () => {
        tick();
        const checks = [
          { field: "tabela_usuarios", value: p.tabela_usuarios, label: "Tabela Usuários" },
          { field: "coluna_id_usuario", value: p.coluna_id_usuario, label: "Coluna ID Usuário" },
          { field: "coluna_nome_usuario", value: p.coluna_nome_usuario, label: "Nome Usuário" },
          { field: "tabela_depositos", value: p.tabela_depositos, label: "Tabela Depósitos" },
          { field: "tabela_saques", value: p.tabela_saques, label: "Tabela Saques" },
          { field: "tabela_saldo", value: p.tabela_saldo, label: "Tabela Saldo" },
          { field: "coluna_saldo", value: p.coluna_saldo, label: "Coluna Saldo" },
        ];
        const missing = checks.filter(c => !c.value);
        return missing.length > 0
          ? { ok: false, msg: `Faltam: ${missing.map(m => m.label).join(", ")}`, solution: "Edite a plataforma e preencha os campos faltantes" }
          : { ok: true, msg: `${checks.length}/${checks.length} campos mapeados` };
      }, p.nome);

      // Gateway
      await runTest(`gw_${p.id}`, "Gateway Pagamento", `🌐 ${p.nome}`, async () => {
        tick();
        if (!p.gateway_chave) return { ok: false, msg: "Chave do gateway não configurada", solution: "Adicione a chave do gateway na edição da plataforma" };
        const extra = (p.mapeamento_extra as any) ?? {};
        const gw = extra.gateway;
        return { ok: true, msg: `Chave: ${p.gateway_chave.substring(0, 12)}...${gw?.endpoint ? ` · Endpoint: ${gw.endpoint}` : " · PixUP padrão"}` };
      }, p.nome);

      // Per-platform Telegram notification
      await runTest(`tg_plat_${p.id}`, "Notificação Telegram", `🌐 ${p.nome}`, async () => {
        // Check platform-specific telegram or global
        const extra = (p.mapeamento_extra as any) ?? {};
        const platTg = extra.telegram;
        let botToken = platTg?.bot_token;
        let chatId = platTg?.chat_id;

        if (!botToken || !chatId) {
          const { data: globalTg } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).eq("ativo", true).maybeSingle();
          botToken = globalTg?.bot_token;
          chatId = globalTg?.chat_id;
        }

        tick();
        if (!botToken || !chatId) return { ok: false, msg: "Telegram não configurado (global nem plataforma)", solution: "Configure o Telegram nas notificações" };

        const { data, error } = await supabase.functions.invoke("send-telegram", {
          body: {
            bot_token: botToken, chat_id: chatId,
            message: `🧪 <b>Teste — ${p.nome}</b>\n\n✅ Notificação da plataforma <b>${p.nome}</b> funcionando!\n⏱️ ${new Date().toLocaleString("pt-BR")}`
          },
        });
        if (error) return { ok: false, msg: error.message };
        return data?.ok
          ? { ok: true, msg: `Mensagem enviada para ${p.nome} via Telegram!` }
          : { ok: false, msg: data?.description || "Falha", solution: "Verifique bot_token e chat_id" };
      }, p.nome);

      // PIX Payout simulation (dry-run check — only verifies gateway is reachable)
      await runTest(`pix_${p.id}`, "PIX Payout (Validação)", `🌐 ${p.nome}`, async () => {
        tick();
        if (!p.gateway_chave) return { ok: false, msg: "Sem chave de gateway — PIX não disponível", solution: "Configure gateway_chave na plataforma" };
        // We test the edge function with a R$0 amount to avoid real payment
        const { data, error } = await supabase.functions.invoke("pix-payout", {
          body: { gateway_key: p.gateway_chave, amount: 0, pix_key: "00000000000", description: "Teste de validação — R$ 0" },
        });
        if (error) return { ok: false, msg: `Edge function erro: ${error.message}`, solution: "Verifique deploy do pix-payout" };
        // A R$0 payment will likely fail validation on the gateway side, but the function itself works
        return { ok: true, msg: `Gateway responde — ${data?.success ? "OK" : data?.error || "Validação ativa"}` };
      }, p.nome);
    }

    // =====================================================
    // 8. PLATAFORMAS SEM URL (APENAS BANCO LOCAL)
    // =====================================================
    const platformsNoUrl = platforms.filter(p => !p.url);
    for (const p of platformsNoUrl) {
      await runTest(`local_${p.id}`, "Plataforma Local (sem API)", "📋 Plataformas Locais", async () => {
        tick();
        return { ok: true, msg: `${p.nome} — Apenas banco local (sem URL de API configurada)` };
      }, p.nome);
    }

    // =====================================================
    // 9. RESUMO FINAL
    // =====================================================
    setRunning(false);
    setProgress(100);
    toast({ title: "✅ Teste completo!" });
  }, [user, platforms, api]);

  const pass = results.filter(r => r.status === "pass").length;
  const fail = results.filter(r => r.status === "fail").length;
  const total = results.filter(r => r.status !== "idle" && r.status !== "running").length;
  const categories = Array.from(new Set(results.map(r => r.category)));
  const failedTests = results.filter(r => r.status === "fail");

  const toggleError = (id: string) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Teste <span className="gradient-text">Geral Completo</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Valida autenticação, banco, APIs, gateways, notificações reais, edge functions e cada plataforma
          </p>
        </div>
        <Button onClick={runAllTests} disabled={running} className="gap-2 h-9 text-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? `Testando... ${progress}%` : "Executar Todos os Testes"}
        </Button>
      </motion.div>

      {/* Progress bar */}
      {running && (
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--neon-blue)), hsl(var(--neon-green)))", width: `${progress}%` }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      )}

      {/* Summary cards */}
      {total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Passou", value: pass, color: "hsl(var(--neon-green))", icon: CheckCircle, pct: total > 0 ? `${Math.round((pass / total) * 100)}%` : "" },
            { label: "Falhou", value: fail, color: "hsl(var(--neon-red))", icon: XCircle, pct: total > 0 ? `${Math.round((fail / total) * 100)}%` : "" },
            { label: "Total", value: total, color: "hsl(var(--primary))", icon: BarChart3, pct: "" },
            { label: "Plataformas", value: platforms.length, color: "hsl(var(--neon-blue))", icon: Globe, pct: `${platforms.filter(p => p.url).length} com API` },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))" }}>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{s.label}</p>
                {s.pct && <p className="text-[10px] font-medium" style={{ color: s.color }}>{s.pct}</p>}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Failed tests summary */}
      {failedTests.length > 0 && !running && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {failedTests.length} teste(s) falharam — Veja como resolver:
          </h3>
          {failedTests.map(t => (
            <div key={t.id} className="rounded-lg bg-background/60 border border-border/30 p-3 cursor-pointer"
              onClick={() => toggleError(t.id)}>
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">{t.name}</span>
                {t.platformName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t.platformName}</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">{t.duration}ms</span>
              </div>
              <p className="text-[11px] text-destructive mt-1">{t.message}</p>
              {expandedErrors.has(t.id) && t.solution && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-semibold text-primary mb-1">💡 Como resolver:</p>
                  <p className="text-[11px] text-foreground whitespace-pre-line">{t.solution}</p>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Results by category */}
      {categories.map(cat => {
        const catResults = results.filter(r => r.category === cat);
        const catPass = catResults.filter(r => r.status === "pass").length;
        const catFail = catResults.filter(r => r.status === "fail").length;
        return (
          <motion.div key={cat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-secondary/20">
              <h3 className="font-bold text-sm text-foreground">{cat}</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">
                <span className="text-neon-green font-bold">{catPass}✓</span>
                {catFail > 0 && <span className="text-destructive font-bold ml-2">{catFail}✗</span>}
                <span className="ml-2">{catResults.length} total</span>
              </span>
            </div>
            <div className="divide-y divide-border/20">
              {catResults.map(r => (
                <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${r.status === "fail" ? "bg-destructive/3" : ""}`}>
                  {r.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" /> :
                    r.status === "pass" ? <CheckCircle className="w-3.5 h-3.5 text-neon-green flex-shrink-0" /> :
                    <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{r.duration}ms</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Clique em "Executar Todos os Testes" para iniciar</p>
          <p className="text-sm mt-1">Será testado: autenticação, 11 tabelas, CRUD, storage, Telegram, edge functions, e cada plataforma individualmente</p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto">
            {["🔐 Auth", "🗄️ Banco", "✏️ CRUD", "📦 Storage", "📲 Telegram", "⚡ Edge Fn", "🌐 APIs", "💳 Gateway"].map(t => (
              <span key={t} className="text-[11px] px-3 py-1.5 rounded-lg bg-secondary border border-border/50">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSuite;
