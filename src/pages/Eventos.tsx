import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DYNAMIC_KEYS = [
  { key: "{nome_usuario}", label: "Nome Usuário", desc: "Nome do usuário que acionou o evento" },
  { key: "{valor}", label: "Valor", desc: "Valor monetário (depósito/saque)" },
  { key: "{nome_plataforma}", label: "Nome Plataforma", desc: "Nome da plataforma envolvida" },
  { key: "{quantidade_usuarios}", label: "Qtd Usuários", desc: "Quantidade de usuários afetados" },
  { key: "{nome_cooperacao}", label: "Nome Cooperação", desc: "Nome/ID da cooperação" },
  { key: "{dias}", label: "Dias", desc: "Quantidade de dias restantes" },
];

const DEFAULT_EVENTS = [
  { nome: "novo_usuario", mensagem: "🆕 O usuário {nome_usuario} se cadastrou na plataforma {nome_plataforma}.", ativo: true },
  { nome: "deposito", mensagem: "💰 O usuário {nome_usuario} fez um depósito de {valor} na plataforma {nome_plataforma}.", ativo: true },
  { nome: "plataforma_offline", mensagem: "🔴 A plataforma {nome_plataforma} está offline ou caiu.", ativo: true },
  { nome: "cooperacao", mensagem: "⏳ A cooperação {nome_cooperacao} expirou, removendo {quantidade_usuarios} usuários e afiliados.", ativo: true },
  { nome: "saque", mensagem: "💸 O usuário {nome_usuario} solicitou um saque de {valor} na plataforma {nome_plataforma}.", ativo: true },
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
  const [telegramConfig, setTelegramConfig] = useState<{ bot_token: string; chat_id: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load telegram config
      const { data: tg } = await (supabase as any).from("telegram_config").select("bot_token, chat_id").eq("user_id", user.id).maybeSingle();
      if (tg) setTelegramConfig(tg);

      // Load events
      const { data: evts } = await (supabase as any).from("telegram_eventos").select("*").eq("user_id", user.id).order("created_at");
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
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, mensagem: e.mensagem + key } : e));
  };

  const resolveMessage = (msg: string) => {
    return msg
      .replace("{nome_usuario}", "João Silva")
      .replace("{valor}", "R$ 500,00")
      .replace("{nome_plataforma}", "BetExample")
      .replace("{quantidade_usuarios}", "15")
      .replace("{nome_cooperacao}", "Cooperação Alpha")
      .replace("{dias}", "7");
  };

  const handleTest = async (idx: number) => {
    if (!telegramConfig?.bot_token || !telegramConfig?.chat_id) {
      toast({ title: "Configure o Telegram primeiro", description: "Vá em Integrações e configure o Bot Token e Chat ID", variant: "destructive" });
      return;
    }
    setTestingIdx(idx);
    try {
      const resolved = resolveMessage(events[idx].mensagem);
      const response = await fetch(`https://api.telegram.org/bot${telegramConfig.bot_token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramConfig.chat_id, text: resolved, parse_mode: "HTML" }),
      });
      const data = await response.json();
      if (data.ok) {
        setTestResults(prev => ({ ...prev, [idx]: "success" }));
        toast({ title: "Teste enviado com sucesso!" });
      } else throw new Error(data.description);
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
      // Delete existing and re-insert
      await (supabase as any).from("telegram_eventos").delete().eq("user_id", user.id);
      const rows = events.map(e => ({ user_id: user.id, nome: e.nome, mensagem: e.mensagem, ativo: e.ativo }));
      const { error } = await (supabase as any).from("telegram_eventos").insert(rows);
      if (error) throw error;
      toast({ title: "Eventos salvos com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">Eventos <span className="gradient-text">& Mensagens</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure mensagens automáticas com chaves dinâmicas</p>
      </motion.div>

      {/* Dynamic Keys Reference */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10"><Tag className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Chaves Dinâmicas Disponíveis</h3>
            <p className="text-xs text-muted-foreground">Clique para copiar · Use nas mensagens dos eventos</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DYNAMIC_KEYS.map(k => (
            <button key={k.key} onClick={() => navigator.clipboard.writeText(k.key).then(() => toast({ title: `${k.key} copiada!` }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer">
              <code className="text-[11px] mono text-primary font-semibold">{k.key}</code>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground">— {k.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Events */}
      <div className="space-y-4">
        {events.map((evt, idx) => (
          <motion.div key={evt.nome} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.05 }}
            className="rounded-xl border border-border/60 p-5 space-y-3" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Zap className="w-4 h-4 text-primary" /></div>
                <div>
                  <h3 className="font-bold text-sm text-foreground capitalize">{evt.nome.replace(/_/g, " ")}</h3>
                  <code className="text-[10px] mono text-muted-foreground">{evt.nome}</code>
                </div>
              </div>
              <Switch checked={evt.ativo} onCheckedChange={v => setEvents(prev => prev.map((e, i) => i === idx ? { ...e, ativo: v } : e))} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem do Evento</Label>
              <Textarea value={evt.mensagem}
                onChange={e => setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, mensagem: e.target.value } : ev))}
                className="bg-secondary border-border text-sm mono min-h-[60px]" />
              <div className="flex flex-wrap gap-1">
                {DYNAMIC_KEYS.map(k => (
                  <button key={k.key} onClick={() => insertKey(idx, k.key)}
                    className="text-[10px] mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                    + {k.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Preview:</p>
              <p className="text-xs text-foreground">{resolveMessage(evt.mensagem)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTest(idx)} disabled={testingIdx === idx || !evt.ativo}
                className={`gap-2 h-7 text-xs ${
                  testResults[idx] === "success" ? "border-neon-green/60 text-neon-green bg-neon-green/10"
                  : testResults[idx] === "error" ? "border-neon-red/60 text-neon-red bg-neon-red/10"
                  : "border-primary/40 text-primary hover:bg-primary/10"
                }`}>
                {testingIdx === idx ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                  testResults[idx] === "success" ? <CheckCircle className="w-3 h-3" /> :
                  testResults[idx] === "error" ? <AlertCircle className="w-3 h-3" /> :
                  <TestTube className="w-3 h-3" />}
                {testingIdx === idx ? "Testando..." : testResults[idx] === "success" ? "Enviado!" : testResults[idx] === "error" ? "Falhou" : "Testar"}
              </Button>
              {!evt.ativo && <span className="text-[10px] text-muted-foreground">Desativado — ative para testar</span>}
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
