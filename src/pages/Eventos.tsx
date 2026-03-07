import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Tag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DYNAMIC_KEYS = [
  { key: "{nome_usuario}", label: "Nome Usuário", desc: "Nome do usuário" },
  { key: "{valor}", label: "Valor", desc: "Valor monetário" },
  { key: "{nome_plataforma}", label: "Plataforma", desc: "Nome da plataforma" },
  { key: "{quantidade_usuarios}", label: "Qtd Usuários", desc: "Quantidade de usuários" },
  { key: "{nome_cooperacao}", label: "Cooperação", desc: "Nome da cooperação" },
  { key: "{dias}", label: "Dias", desc: "Dias restantes" },
  { key: "{pix}", label: "Pix", desc: "Chave Pix do usuário" },
  { key: "{quantidade_dias}", label: "Qtd Dias", desc: "Quantidade de dias atingida" },
];

const DEFAULT_EVENTS = [
  { nome: "novo_usuario", mensagem: "🆕 O usuário {nome_usuario} se cadastrou na plataforma {nome_plataforma}.", ativo: true },
  { nome: "deposito", mensagem: "💰 O usuário {nome_usuario} depositou {valor} na plataforma {nome_plataforma}.", ativo: true },
  { nome: "plataforma_offline", mensagem: "🔴 A plataforma {nome_plataforma} está offline / caiu.", ativo: true },
  { nome: "cooperacao", mensagem: "⏳ Cooperação atingiu {quantidade_dias}, ações aplicadas aos afiliados da plataforma {nome_plataforma}.", ativo: true },
  { nome: "saque", mensagem: "💸 Usuário {nome_usuario} solicitou saque de {valor} via Pix {pix} na plataforma {nome_plataforma}.", ativo: true },
];

interface EventConfig {
  id?: string;
  nome: string;
  mensagem: string;
  ativo: boolean;
}

const Eventos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [testingIdx, setTestingIdx] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, "success" | "error">>({});
  const [telegramConfig, setTelegramConfig] = useState<{ bot_token: string; chat_id: string; ativo: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tg } = await supabase.from("telegram_config").select("bot_token, chat_id, ativo").eq("user_id", user.id).maybeSingle();
      if (tg) setTelegramConfig(tg);

      const { data: evts } = await supabase.from("telegram_eventos").select("*").eq("user_id", user.id).order("created_at");
      if (evts && evts.length > 0) {
        setEvents(evts.map((e: any) => ({ id: e.id, nome: e.nome, mensagem: e.mensagem, ativo: e.ativo ?? true })));
      } else {
        setEvents(DEFAULT_EVENTS);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const insertKey = (idx: number, key: string) => {
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, mensagem: e.mensagem + " " + key } : e));
  };

  const resolveMessage = (msg: string) => {
    return msg
      .replace(/\{nome_usuario\}/g, "João Silva")
      .replace(/\{valor\}/g, "R$ 500,00")
      .replace(/\{nome_plataforma\}/g, "BetExample")
      .replace(/\{quantidade_usuarios\}/g, "15")
      .replace(/\{nome_cooperacao\}/g, "Cooperação Alpha")
      .replace(/\{dias\}/g, "7")
      .replace(/\{pix\}/g, "joao@email.com")
      .replace(/\{quantidade_dias\}/g, "30");
  };

  const handleTest = async (idx: number) => {
    if (!telegramConfig?.bot_token || !telegramConfig?.chat_id) {
      toast({ title: "Configure o Telegram primeiro", description: "Vá em Integrações e configure o Bot Token e Chat ID", variant: "destructive" });
      return;
    }
    if (!telegramConfig.ativo) {
      toast({ title: "Telegram desativado", description: "Ative o Telegram em Integrações para testar", variant: "destructive" });
      return;
    }
    setTestingIdx(idx);
    try {
      const resolved = resolveMessage(events[idx].mensagem);
      const { data, error } = await supabase.functions.invoke("send-telegram", {
        body: { bot_token: telegramConfig.bot_token, chat_id: telegramConfig.chat_id, message: resolved },
      });
      if (error) throw error;
      if (data?.ok) {
        setTestResults(prev => ({ ...prev, [idx]: "success" }));
        toast({ title: "✅ Mensagem enviada com sucesso!" });
      } else {
        throw new Error(data?.description || "Erro ao enviar");
      }
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [idx]: "error" }));
      toast({ title: "Falha no teste", description: err.message, variant: "destructive" });
    }
    setTestingIdx(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("telegram_eventos").delete().eq("user_id", user.id);
      const rows = events.map(e => ({ user_id: user.id, nome: e.nome, mensagem: e.mensagem, ativo: e.ativo }));
      const { error } = await supabase.from("telegram_eventos").insert(rows);
      if (error) throw error;
      toast({ title: "Eventos salvos com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  const telegramOk = telegramConfig?.bot_token && telegramConfig?.chat_id && telegramConfig?.ativo;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">Eventos <span className="gradient-text">& Mensagens</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure mensagens automáticas com chaves dinâmicas para envio via Telegram</p>
      </motion.div>

      {/* Telegram Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
        className={`rounded-xl border p-3 flex items-center gap-3 ${telegramOk ? "border-neon-green/30 bg-neon-green/5" : "border-neon-red/30 bg-neon-red/5"}`}>
        <Send className={`w-4 h-4 ${telegramOk ? "text-neon-green" : "text-neon-red"}`} />
        <p className={`text-xs font-medium ${telegramOk ? "text-neon-green" : "text-neon-red"}`}>
          {telegramOk ? "Telegram configurado e ativo — pronto para enviar mensagens" : "Telegram não configurado — vá em Integrações para configurar Bot Token e Chat ID"}
        </p>
      </motion.div>

      {/* Dynamic Keys */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10"><Tag className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Chaves Dinâmicas Disponíveis</h3>
            <p className="text-xs text-muted-foreground">Clique nos botões abaixo de cada evento para inserir</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DYNAMIC_KEYS.map(k => (
            <button key={k.key} onClick={() => navigator.clipboard.writeText(k.key).then(() => toast({ title: `${k.key} copiada!` }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
              <code className="text-[11px] font-mono text-primary font-semibold">{k.key}</code>
              <span className="text-[10px] text-muted-foreground">— {k.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Events */}
      <div className="space-y-4">
        {events.map((evt, idx) => (
          <motion.div key={evt.nome} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.05 }}
            className={`rounded-xl border p-5 space-y-3 ${evt.ativo ? "border-border/60" : "border-border/30 opacity-60"}`} style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${evt.ativo ? "bg-primary/10" : "bg-muted"}`}>
                  <Zap className={`w-4 h-4 ${evt.ativo ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground capitalize">{evt.nome.replace(/_/g, " ")}</h3>
                  <code className="text-[10px] font-mono text-muted-foreground">{evt.nome}</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold ${evt.ativo ? "text-neon-green" : "text-muted-foreground"}`}>
                  {evt.ativo ? "Ativo" : "Inativo"}
                </span>
                <Switch checked={evt.ativo} onCheckedChange={v => setEvents(prev => prev.map((e, i) => i === idx ? { ...e, ativo: v } : e))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem do Evento</Label>
              <Textarea value={evt.mensagem}
                onChange={e => setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, mensagem: e.target.value } : ev))}
                className="bg-secondary border-border text-sm font-mono min-h-[70px]" />
              <div className="flex flex-wrap gap-1">
                {DYNAMIC_KEYS.map(k => (
                  <button key={k.key} onClick={() => insertKey(idx, k.key)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                    + {k.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Preview da mensagem:</p>
              <p className="text-xs text-foreground">{resolveMessage(evt.mensagem)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTest(idx)} disabled={testingIdx === idx || !evt.ativo || !telegramOk}
                className={`gap-2 h-7 text-xs ${
                  testResults[idx] === "success" ? "border-neon-green/60 text-neon-green bg-neon-green/10"
                  : testResults[idx] === "error" ? "border-neon-red/60 text-neon-red bg-neon-red/10"
                  : "border-primary/40 text-primary hover:bg-primary/10"
                }`}>
                {testingIdx === idx ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                  testResults[idx] === "success" ? <CheckCircle className="w-3 h-3" /> :
                  testResults[idx] === "error" ? <AlertCircle className="w-3 h-3" /> :
                  <TestTube className="w-3 h-3" />}
                {testingIdx === idx ? "Enviando..." : testResults[idx] === "success" ? "Enviado!" : testResults[idx] === "error" ? "Falhou" : "Testar via Telegram"}
              </Button>
              {!evt.ativo && <span className="text-[10px] text-muted-foreground">Desativado — ative para testar</span>}
              {evt.ativo && !telegramOk && <span className="text-[10px] text-neon-red">Configure o Telegram em Integrações</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-9 text-sm gap-2"
          style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
          <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar Eventos"}
        </Button>
      </motion.div>
    </div>
  );
};

export default Eventos;
