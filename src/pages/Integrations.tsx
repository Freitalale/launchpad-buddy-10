import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, Bell, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Smartphone, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms, useUpdatePlatform } from "@/hooks/usePlatforms";

const DYNAMIC_KEYS = [
  { key: "{nome_usuario}", desc: "Nome do usuário envolvido no evento" },
  { key: "{valor}", desc: "Valor monetário (depósito, saque, etc.)" },
  { key: "{nome_plataforma}", desc: "Nome da plataforma de origem" },
  { key: "{quantidade_usuarios}", desc: "Total de usuários na plataforma" },
  { key: "{nome_cooperacao}", desc: "Nome da cooperação ativa" },
  { key: "{dias}", desc: "Dias restantes da cooperação" },
  { key: "{pix}", desc: "Chave Pix do usuário" },
  { key: "{quantidade_dias}", desc: "Quantidade de dias atingida" },
];

const EVENT_DEFS = [
  { nome: "novo_usuario", label: "Novo Usuário", icon: "🆕", subtitle: "Dispara quando um novo usuário se cadastra em qualquer plataforma monitorada", defaultTg: "🆕 O usuário {nome_usuario} se cadastrou na plataforma {nome_plataforma}.", defaultPc: "Novo cadastro: {nome_usuario} em {nome_plataforma}" },
  { nome: "deposito", label: "Depósito Recebido", icon: "💰", subtitle: "Dispara quando um depósito é detectado — útil para acompanhar conversão em tempo real", defaultTg: "💰 O usuário {nome_usuario} depositou {valor} na plataforma {nome_plataforma}.", defaultPc: "Depósito: {valor} por {nome_usuario} em {nome_plataforma}" },
  { nome: "saque", label: "Solicitação de Saque", icon: "💸", subtitle: "Dispara quando um usuário solicita um saque — permite ação rápida de aprovação/rejeição", defaultTg: "💸 Usuário {nome_usuario} solicitou saque de {valor} via Pix {pix} na plataforma {nome_plataforma}.", defaultPc: "Saque: {valor} por {nome_usuario} — Pix: {pix} em {nome_plataforma}" },
  { nome: "plataforma_offline", label: "Plataforma Offline", icon: "🔴", subtitle: "Dispara quando a API de uma plataforma para de responder ou retorna erro HTTP", defaultTg: "🔴 A plataforma {nome_plataforma} está offline / caiu.", defaultPc: "ALERTA: {nome_plataforma} offline!" },
  { nome: "erro", label: "Erro / Falha", icon: "⚠️", subtitle: "Dispara em erros de gateway, falha de pagamento, erro de API ou falha de sincronização", defaultTg: "⚠️ Erro detectado na plataforma {nome_plataforma}: falha de integração.", defaultPc: "Erro em {nome_plataforma}: falha detectada" },
  { nome: "cooperacao", label: "Cooperação / Expiração", icon: "⏳", subtitle: "Dispara quando a contagem de cooperação atinge o limite — ações automáticas em afiliados", defaultTg: "⏳ Cooperação atingiu {quantidade_dias} dias, ações aplicadas aos afiliados da plataforma {nome_plataforma}.", defaultPc: "Cooperação: {quantidade_dias} dias em {nome_plataforma}" },
];

interface EventConfig {
  id?: string;
  nome: string;
  mensagem: string;
  mensagem_pushcut: string;
  ativo: boolean;
}

const resolveMessage = (msg: string) =>
  msg.replace(/\{nome_usuario\}/g, "João Silva").replace(/\{valor\}/g, "R$ 500,00").replace(/\{nome_plataforma\}/g, "BetExample")
    .replace(/\{quantidade_usuarios\}/g, "15").replace(/\{nome_cooperacao\}/g, "Cooperação Alpha").replace(/\{dias\}/g, "7")
    .replace(/\{pix\}/g, "joao@email.com").replace(/\{quantidade_dias\}/g, "30");

const Integrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: platforms = [] } = usePlatforms();
  const updatePlatform = useUpdatePlatform();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Telegram
  const [tgConfig, setTgConfig] = useState({ id: undefined as string | undefined, bot_token: "", chat_id: "", ativo: false });
  const [testingTg, setTestingTg] = useState(false);
  const [testResultTg, setTestResultTg] = useState<"success" | "error" | null>(null);

  // PushCut
  const [pcConfig, setPcConfig] = useState({ pushcut_url: "", pushcut_ativo: false });
  const [testingPc, setTestingPc] = useState(false);
  const [testResultPc, setTestResultPc] = useState<"success" | "error" | null>(null);

  // Events (global)
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [testingEvt, setTestingEvt] = useState<{ idx: number; type: "tg" | "pc" } | null>(null);
  const [evtResults, setEvtResults] = useState<Record<string, "success" | "error">>({});

  // Per-platform event toggles: { [platformId]: { [eventName]: { tg: bool, pc: bool } } }
  const [platEventToggles, setPlatEventToggles] = useState<Record<string, Record<string, { tg: boolean; pc: boolean }>>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tg } = await supabase.from("telegram_config").select("*").eq("user_id", user.id).maybeSingle();
      if (tg) {
        setTgConfig({ id: tg.id, bot_token: tg.bot_token ?? "", chat_id: tg.chat_id ?? "", ativo: tg.ativo });
        setPcConfig({ pushcut_url: (tg as any).pushcut_url ?? "", pushcut_ativo: (tg as any).pushcut_ativo ?? false });
      }

      const { data: evts } = await supabase.from("telegram_eventos").select("*").eq("user_id", user.id).order("created_at");
      if (evts && evts.length > 0) {
        setEvents(evts.map((e: any) => ({ id: e.id, nome: e.nome, mensagem: e.mensagem, mensagem_pushcut: e.mensagem_pushcut ?? "", ativo: e.ativo ?? true })));
      } else {
        setEvents(EVENT_DEFS.map(d => ({ nome: d.nome, mensagem: d.defaultTg, mensagem_pushcut: d.defaultPc, ativo: true })));
      }

      // Load per-platform toggles from mapeamento_extra
      const { data: plats } = await (supabase as any).from("plataformas").select("id, mapeamento_extra").eq("user_id", user.id);
      if (plats) {
        const toggles: Record<string, Record<string, { tg: boolean; pc: boolean }>> = {};
        plats.forEach((p: any) => {
          const extra = p.mapeamento_extra ?? {};
          const evtToggles = extra.notif_event_toggles ?? {};
          toggles[p.id] = {};
          EVENT_DEFS.forEach(d => {
            toggles[p.id][d.nome] = evtToggles[d.nome] ?? { tg: true, pc: true };
          });
        });
        setPlatEventToggles(toggles);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const handleTestTelegram = async () => {
    if (!tgConfig.bot_token || !tgConfig.chat_id) { toast({ title: "Preencha Bot Token e Chat ID", variant: "destructive" }); return; }
    setTestingTg(true); setTestResultTg(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgConfig.bot_token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgConfig.chat_id, text: "✅ Master Painel V7 — Telegram conectado!", parse_mode: "HTML" }),
      });
      const data = await res.json();
      if (data.ok) { setTestResultTg("success"); toast({ title: "✅ Telegram conectado!" }); }
      else throw new Error(data.description || "Erro");
    } catch (err: any) { setTestResultTg("error"); toast({ title: "Falha", description: err.message, variant: "destructive" }); }
    setTestingTg(false);
  };

  const handleTestPushcut = async () => {
    if (!pcConfig.pushcut_url) { toast({ title: "Preencha a Webhook URL do PushCut", variant: "destructive" }); return; }
    setTestingPc(true); setTestResultPc(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-pushcut", {
        body: {
          pushcut_url: pcConfig.pushcut_url,
          title: "✅ Master Painel V7",
          text: "PushCut conectado com sucesso!",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.ok) { setTestResultPc("success"); toast({ title: "✅ PushCut conectado!" }); }
      else throw new Error(data?.error || `HTTP ${data?.status}`);
    } catch (err: any) { setTestResultPc("error"); toast({ title: "Falha PushCut", description: err.message, variant: "destructive" }); }
    setTestingPc(false);
  };

  const handleTestEvent = async (idx: number, type: "tg" | "pc") => {
    const evt = events[idx];
    const key = `${idx}-${type}`;
    setTestingEvt({ idx, type });
    try {
      const msg = resolveMessage(type === "tg" ? evt.mensagem : evt.mensagem_pushcut);
      if (type === "tg") {
        if (!tgConfig.bot_token || !tgConfig.chat_id || !tgConfig.ativo) throw new Error("Telegram não configurado/ativo");
        const { data, error } = await supabase.functions.invoke("send-telegram", {
          body: { bot_token: tgConfig.bot_token, chat_id: tgConfig.chat_id, message: msg },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.description || "Erro");
      } else {
        if (!pcConfig.pushcut_url || !pcConfig.pushcut_ativo) throw new Error("PushCut não configurado/ativo");
        const res = await fetch(pcConfig.pushcut_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `${EVENT_DEFS.find(d => d.nome === evt.nome)?.icon ?? "📢"} ${EVENT_DEFS.find(d => d.nome === evt.nome)?.label ?? evt.nome}`, text: msg }),
        });
        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      }
      setEvtResults(prev => ({ ...prev, [key]: "success" }));
      toast({ title: `✅ Teste ${type === "tg" ? "Telegram" : "PushCut"} enviado!` });
    } catch (err: any) {
      setEvtResults(prev => ({ ...prev, [key]: "error" }));
      toast({ title: "Falha no teste", description: err.message, variant: "destructive" });
    }
    setTestingEvt(null);
  };

  const togglePlatEvent = (platformId: string, eventName: string, channel: "tg" | "pc") => {
    setPlatEventToggles(prev => {
      const p = { ...(prev[platformId] ?? {}) };
      const e = { ...(p[eventName] ?? { tg: true, pc: true }) };
      e[channel] = !e[channel];
      p[eventName] = e;
      return { ...prev, [platformId]: p };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save telegram + pushcut config
      const configPayload: any = {
        bot_token: tgConfig.bot_token, chat_id: tgConfig.chat_id, ativo: tgConfig.ativo,
        pushcut_url: pcConfig.pushcut_url, pushcut_ativo: pcConfig.pushcut_ativo,
        notif_novo_usuario: true, notif_deposito: true, notif_saque: true,
        notif_plataforma_offline: true, notif_erro: true, notif_cooperacao: true,
      };
      if (tgConfig.id) {
        await supabase.from("telegram_config").update(configPayload).eq("id", tgConfig.id);
      } else {
        const { data } = await (supabase as any).from("telegram_config").insert({ ...configPayload, user_id: user.id }).select().single();
        if (data) setTgConfig(prev => ({ ...prev, id: data.id }));
      }

      // Save events
      await supabase.from("telegram_eventos").delete().eq("user_id", user.id);
      const rows = events.map(e => ({
        user_id: user.id, nome: e.nome, mensagem: e.mensagem,
        mensagem_pushcut: e.mensagem_pushcut, ativo: e.ativo,
      }));
      const { error } = await supabase.from("telegram_eventos").insert(rows as any);
      if (error) throw error;

      // Save per-platform event toggles into mapeamento_extra
      for (const plat of platforms) {
        const toggles = platEventToggles[plat.id];
        if (!toggles) continue;
        const extra = ((plat as any).mapeamento_extra as any) ?? {};
        const newExtra = { ...extra, notif_event_toggles: toggles };
        await updatePlatform.mutateAsync({ id: plat.id, mapeamento_extra: newExtra });
      }

      toast({ title: "✅ Notificações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const insertKey = (idx: number, key: string, field: "mensagem" | "mensagem_pushcut") => {
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, [field]: e[field] + " " + key } : e));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  const tgOk = tgConfig.bot_token && tgConfig.chat_id && tgConfig.ativo;
  const pcOk = pcConfig.pushcut_url && pcConfig.pushcut_ativo;

  const TestBtn = ({ testing, result, onClick, label }: { testing: boolean; result: "success" | "error" | null; onClick: () => void; label: string }) => (
    <Button variant="outline" size="sm" onClick={onClick} disabled={testing}
      className={`gap-2 h-8 text-xs transition-all ${
        result === "success" ? "border-accent/60 text-accent bg-accent/10"
        : result === "error" ? "border-destructive/60 text-destructive bg-destructive/10"
        : "border-primary/40 text-primary hover:bg-primary/10"
      }`}>
      {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> :
        result === "success" ? <CheckCircle className="w-3 h-3" /> :
        result === "error" ? <AlertCircle className="w-3 h-3" /> :
        <TestTube className="w-3 h-3" />}
      {testing ? "Testando..." : result === "success" ? "Conectado!" : result === "error" ? "Falhou" : label}
    </Button>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">Notificações <span className="gradient-text">V7</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Telegram + PushCut — configure conexões, eventos e ative/desative por plataforma</p>
      </motion.div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${tgOk ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}>
          <Send className={`w-3.5 h-3.5 ${tgOk ? "text-accent" : "text-destructive"}`} />
          <span className={`text-xs font-medium ${tgOk ? "text-accent" : "text-destructive"}`}>{tgOk ? "Telegram Ativo" : "Telegram Inativo"}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${pcOk ? "border-accent/30 bg-accent/5" : "border-muted/30 bg-muted/5"}`}>
          <Smartphone className={`w-3.5 h-3.5 ${pcOk ? "text-accent" : "text-muted-foreground"}`} />
          <span className={`text-xs font-medium ${pcOk ? "text-accent" : "text-muted-foreground"}`}>{pcOk ? "PushCut Ativo" : "PushCut Inativo"}</span>
        </div>
      </div>

      {/* Connection cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Send className="w-4 h-4 text-primary" /></div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Telegram Bot</h3>
                <p className="text-[10px] text-muted-foreground">Crie um bot via @BotFather, copie o Token. Use /start e obtenha o Chat ID via @userinfobot</p>
              </div>
            </div>
            <Switch checked={tgConfig.ativo} onCheckedChange={v => setTgConfig(prev => ({ ...prev, ativo: v }))} />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bot Token</Label>
              <Input value={tgConfig.bot_token} onChange={e => setTgConfig(prev => ({ ...prev, bot_token: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm font-mono" placeholder="123456:ABC-DEF..." />
              <p className="text-[10px] text-muted-foreground">Obtido via @BotFather no Telegram → /newbot → copie o token gerado</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chat ID</Label>
              <Input value={tgConfig.chat_id} onChange={e => setTgConfig(prev => ({ ...prev, chat_id: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm font-mono" placeholder="-1001234567890" />
              <p className="text-[10px] text-muted-foreground">Envie /start ao bot, depois acesse @userinfobot para obter seu Chat ID</p>
            </div>
            <TestBtn testing={testingTg} result={testResultTg} onClick={handleTestTelegram} label="Testar Telegram" />
          </div>
        </motion.div>

        {/* PushCut */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neon-amber/10"><Smartphone className="w-4 h-4 text-neon-amber" /></div>
              <div>
                <h3 className="font-bold text-sm text-foreground">PushCut</h3>
                <p className="text-[10px] text-muted-foreground">Notificações ricas no iOS/Mac via Webhook — basta colar a URL</p>
              </div>
            </div>
            <Switch checked={pcConfig.pushcut_ativo} onCheckedChange={v => setPcConfig(prev => ({ ...prev, pushcut_ativo: v }))} />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Webhook URL</Label>
              <Input value={pcConfig.pushcut_url} onChange={e => setPcConfig(prev => ({ ...prev, pushcut_url: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm font-mono" placeholder="https://api.pushcut.io/..." />
              <p className="text-[10px] text-muted-foreground">App PushCut → Notifications → Criar Notificação → Webhook Trigger → Copiar URL</p>
            </div>
            <TestBtn testing={testingPc} result={testResultPc} onClick={handleTestPushcut} label="Testar PushCut" />
          </div>
        </motion.div>
      </div>

      {/* Dynamic Keys */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10"><Tag className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Chaves Dinâmicas Disponíveis</h3>
            <p className="text-[10px] text-muted-foreground">Use essas chaves nas mensagens — serão substituídas pelo valor real no momento do envio</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {DYNAMIC_KEYS.map(k => (
            <button key={k.key} onClick={() => navigator.clipboard.writeText(k.key).then(() => toast({ title: `${k.key} copiada!` }))}
              className="flex flex-col items-start p-2 rounded-lg bg-secondary/80 border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-left">
              <code className="text-[11px] font-mono text-primary font-semibold">{k.key}</code>
              <span className="text-[10px] text-muted-foreground mt-0.5">{k.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Events */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10"><Bell className="w-4 h-4 text-accent" /></div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Eventos de Notificação</h3>
            <p className="text-[10px] text-muted-foreground">Configure mensagens e ative/desative cada canal por plataforma</p>
          </div>
        </div>

        {events.map((evt, idx) => {
          const def = EVENT_DEFS.find(d => d.nome === evt.nome);
          return (
            <motion.div key={evt.nome} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + idx * 0.04 }}
              className={`rounded-xl border p-5 space-y-4 ${evt.ativo ? "border-border/60" : "border-border/30 opacity-60"}`} style={{ background: "hsl(var(--card))" }}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{def?.icon ?? "📢"}</span>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{def?.label ?? evt.nome}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{def?.subtitle ?? "Evento personalizado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold ${evt.ativo ? "text-accent" : "text-muted-foreground"}`}>
                    {evt.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <Switch checked={evt.ativo} onCheckedChange={v => setEvents(prev => prev.map((e, i) => i === idx ? { ...e, ativo: v } : e))} />
                </div>
              </div>

              {/* Per-platform toggles */}
              {platforms.length > 0 && evt.ativo && (
                <div className="rounded-lg border border-border/40 p-3 bg-secondary/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ativar por Plataforma</p>
                  <div className="space-y-1.5">
                    {platforms.map(plat => {
                      const toggles = platEventToggles[plat.id]?.[evt.nome] ?? { tg: true, pc: true };
                      return (
                        <div key={plat.id} className="flex items-center gap-3 py-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (plat as any).cor ?? "#888" }} />
                          <span className="text-xs font-medium text-foreground flex-1 truncate">{plat.nome}</span>
                          <div className="flex items-center gap-1.5">
                            <Send className="w-3 h-3 text-primary" />
                            <Switch
                              checked={toggles.tg}
                              onCheckedChange={() => togglePlatEvent(plat.id, evt.nome, "tg")}
                              className="scale-75"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3 h-3 text-neon-amber" />
                            <Switch
                              checked={toggles.pc}
                              onCheckedChange={() => togglePlatEvent(plat.id, evt.nome, "pc")}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Telegram + PushCut side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Telegram */}
                <div className="space-y-3 rounded-lg border border-primary/20 p-3 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Telegram</span>
                    {tgOk && <div className="w-1.5 h-1.5 rounded-full bg-accent ml-auto" />}
                  </div>
                  <div className="space-y-1.5">
                    <Textarea value={evt.mensagem}
                      onChange={e => setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, mensagem: e.target.value } : ev))}
                      className="bg-secondary border-border text-sm font-mono min-h-[60px]" />
                    <div className="flex flex-wrap gap-1">
                      {DYNAMIC_KEYS.map(k => (
                        <button key={k.key} onClick={() => insertKey(idx, k.key, "mensagem")}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                          + {k.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Preview:</p>
                    <p className="text-xs text-foreground">{resolveMessage(evt.mensagem)}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={!evt.ativo || !tgOk || (testingEvt?.idx === idx && testingEvt?.type === "tg")}
                    onClick={() => handleTestEvent(idx, "tg")}
                    className={`gap-2 h-7 text-xs ${evtResults[`${idx}-tg`] === "success" ? "border-accent/60 text-accent" : evtResults[`${idx}-tg`] === "error" ? "border-destructive/60 text-destructive" : "border-primary/40 text-primary"}`}>
                    {testingEvt?.idx === idx && testingEvt?.type === "tg" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                    {testingEvt?.idx === idx && testingEvt?.type === "tg" ? "Enviando..." : "Testar Telegram"}
                  </Button>
                </div>

                {/* PushCut */}
                <div className="space-y-3 rounded-lg border border-neon-amber/20 p-3 bg-neon-amber/5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-neon-amber" />
                    <span className="text-xs font-bold text-neon-amber uppercase tracking-wide">PushCut</span>
                    {pcOk && <div className="w-1.5 h-1.5 rounded-full bg-accent ml-auto" />}
                  </div>
                  <div className="space-y-1.5">
                    <Textarea value={evt.mensagem_pushcut}
                      onChange={e => setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, mensagem_pushcut: e.target.value } : ev))}
                      className="bg-secondary border-border text-sm font-mono min-h-[60px]" />
                    <div className="flex flex-wrap gap-1">
                      {DYNAMIC_KEYS.map(k => (
                        <button key={k.key} onClick={() => insertKey(idx, k.key, "mensagem_pushcut")}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-amber/10 text-neon-amber border border-neon-amber/20 hover:bg-neon-amber/20 transition-colors">
                          + {k.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Preview:</p>
                    <p className="text-xs text-foreground">{resolveMessage(evt.mensagem_pushcut)}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={!evt.ativo || !pcOk || (testingEvt?.idx === idx && testingEvt?.type === "pc")}
                    onClick={() => handleTestEvent(idx, "pc")}
                    className={`gap-2 h-7 text-xs ${evtResults[`${idx}-pc`] === "success" ? "border-accent/60 text-accent" : evtResults[`${idx}-pc`] === "error" ? "border-destructive/60 text-destructive" : "border-neon-amber/40 text-neon-amber"}`}>
                    {testingEvt?.idx === idx && testingEvt?.type === "pc" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                    {testingEvt?.idx === idx && testingEvt?.type === "pc" ? "Enviando..." : "Testar PushCut"}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Save */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-9 text-sm gap-2"
          style={{ background: "var(--gradient-primary)" }}>
          <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar Tudo"}
        </Button>
      </motion.div>
    </div>
  );
};

export default Integrations;
