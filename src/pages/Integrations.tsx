// Simplified Integrations page
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bell, Save, TestTube, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Integrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState({
    id: undefined as string | undefined,
    bot_token: "", chat_id: "", ativo: false,
    notif_novo_usuario: true, notif_deposito: true, notif_saque: true,
    notif_plataforma_offline: true, notif_erro: true, notif_cooperacao: true,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tg } = await (supabase as any).from("telegram_config").select("*").eq("user_id", user.id).maybeSingle();
      if (tg) {
        setConfig({
          id: tg.id, bot_token: tg.bot_token ?? "", chat_id: tg.chat_id ?? "", ativo: tg.ativo,
          notif_novo_usuario: tg.notif_novo_usuario, notif_deposito: tg.notif_deposito,
          notif_saque: tg.notif_saque, notif_plataforma_offline: tg.notif_plataforma_offline,
          notif_erro: tg.notif_erro, notif_cooperacao: tg.notif_cooperacao,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleTestTelegram = async () => {
    if (!config.bot_token || !config.chat_id) {
      toast({ title: "Preencha Bot Token e Chat ID", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: config.chat_id, text: "✅ Master Painel Pro v3.0 — Teste de conexão!", parse_mode: "HTML" }),
      });
      const data = await response.json();
      if (data.ok) {
        setTestResult("success");
        toast({ title: "Telegram conectado!" });
      } else throw new Error(data.description || "Erro");
    } catch (err: any) {
      setTestResult("error");
      toast({ title: "Falha na conexão", description: err.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (config.id) {
        await (supabase as any).from("telegram_config").update({
          bot_token: config.bot_token, chat_id: config.chat_id, ativo: config.ativo,
          notif_novo_usuario: config.notif_novo_usuario, notif_deposito: config.notif_deposito,
          notif_saque: config.notif_saque, notif_plataforma_offline: config.notif_plataforma_offline,
          notif_erro: config.notif_erro, notif_cooperacao: config.notif_cooperacao,
        }).eq("id", config.id);
      } else {
        const { data } = await (supabase as any).from("telegram_config").insert({
          user_id: user.id, bot_token: config.bot_token, chat_id: config.chat_id, ativo: config.ativo,
          notif_novo_usuario: config.notif_novo_usuario, notif_deposito: config.notif_deposito,
          notif_saque: config.notif_saque, notif_plataforma_offline: config.notif_plataforma_offline,
          notif_erro: config.notif_erro, notif_cooperacao: config.notif_cooperacao,
        }).select().single();
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
      }
      toast({ title: "Integrações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const notifToggles = [
    { key: "notif_novo_usuario" as const, label: "Novo Usuário", icon: "🆕" },
    { key: "notif_deposito" as const, label: "Depósito", icon: "💰" },
    { key: "notif_saque" as const, label: "Saque", icon: "💸" },
    { key: "notif_plataforma_offline" as const, label: "Plataforma Offline", icon: "🔴" },
    { key: "notif_erro" as const, label: "Erro", icon: "⚠️" },
    { key: "notif_cooperacao" as const, label: "Cooperação", icon: "⏳" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Integrações <span className="gradient-text">& Telegram</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure notificações automáticas</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Send className="w-4 h-4 text-primary" /></div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Telegram Bot</h3>
                <p className="text-xs text-muted-foreground">Receba alertas automáticos</p>
              </div>
            </div>
            <Switch checked={config.ativo} onCheckedChange={v => setConfig(prev => ({ ...prev, ativo: v }))} />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bot Token</Label>
              <Input value={config.bot_token} onChange={e => setConfig(prev => ({ ...prev, bot_token: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm mono" placeholder="123456:ABC-DEF..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chat ID</Label>
              <Input value={config.chat_id} onChange={e => setConfig(prev => ({ ...prev, chat_id: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm mono" placeholder="-1001234567890" />
            </div>
            <Button variant="outline" size="sm" onClick={handleTestTelegram} disabled={testing}
              className={`gap-2 h-8 text-xs transition-all ${
                testResult === "success" ? "border-neon-green/60 text-neon-green bg-neon-green/10"
                : testResult === "error" ? "border-neon-red/60 text-neon-red bg-neon-red/10"
                : "border-primary/40 text-primary hover:bg-primary/10"
              }`}>
              {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                testResult === "success" ? <CheckCircle className="w-3 h-3" /> :
                testResult === "error" ? <AlertCircle className="w-3 h-3" /> :
                <TestTube className="w-3 h-3" />}
              {testing ? "Testando..." : testResult === "success" ? "Conectado!" : testResult === "error" ? "Falhou" : "Testar Conexão"}
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-amber/10"><Bell className="w-4 h-4 text-neon-amber" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Eventos do Telegram</h3>
              <p className="text-xs text-muted-foreground">Ative/desative cada tipo</p>
            </div>
          </div>
          <div className="space-y-2">
            {notifToggles.map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 border border-border/30">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </div>
                <Switch checked={(config as any)[key]}
                  onCheckedChange={v => setConfig(prev => ({ ...prev, [key]: v }))} className="scale-75" />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-2 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="h-9 text-sm gap-2"
            style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
            <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar Integrações"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Integrations;
