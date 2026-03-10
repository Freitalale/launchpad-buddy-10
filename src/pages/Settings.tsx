import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Bell, Key, Globe, Save, Zap, Timer, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    webhook_telegram_global: "",
    webhook_outro_global: "",
    gateway_chave_global: "",
    cooperacao_dias_padrao: 30,
    exclusao_automatica_afiliados: false,
  });

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "" });

  // PushCut config from telegram_config table
  const [pushcutForm, setPushcutForm] = useState({ pushcut_url: "", pushcut_ativo: false });
  const [pushcutLoaded, setPushcutLoaded] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        webhook_telegram_global: settings.webhook_telegram_global ?? "",
        webhook_outro_global: settings.webhook_outro_global ?? "",
        gateway_chave_global: settings.gateway_chave_global ?? "",
        cooperacao_dias_padrao: settings.cooperacao_dias_padrao ?? 30,
        exclusao_automatica_afiliados: settings.exclusao_automatica_afiliados ?? false,
      });
    }
  }, [settings]);

  // Load pushcut config
  useEffect(() => {
    if (!user) return;
    const loadPushcut = async () => {
      const { data } = await supabase.from("telegram_config").select("pushcut_url, pushcut_ativo").eq("user_id", user.id).maybeSingle();
      if (data) {
        setPushcutForm({ pushcut_url: data.pushcut_url ?? "", pushcut_ativo: data.pushcut_ativo ?? false });
      }
      setPushcutLoaded(true);
    };
    loadPushcut();
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(form);

      // Save pushcut config to telegram_config
      if (user) {
        const { data: existing } = await supabase.from("telegram_config").select("id").eq("user_id", user.id).maybeSingle();
        if (existing) {
          await supabase.from("telegram_config").update({
            pushcut_url: pushcutForm.pushcut_url || null,
            pushcut_ativo: pushcutForm.pushcut_ativo,
          }).eq("user_id", user.id);
        } else {
          await supabase.from("telegram_config").insert({
            user_id: user.id,
            pushcut_url: pushcutForm.pushcut_url || null,
            pushcut_ativo: pushcutForm.pushcut_ativo,
          } as any);
        }
      }

      toast({ title: "✅ Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      toast({ title: "✅ Senha alterada com sucesso!" });
      setPasswordForm({ current: "", newPass: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">Configurações <span className="gradient-text">V7</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ajustes globais, segurança, gateway e sincronização</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Shield className="w-4 h-4 text-primary" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Segurança & Acesso</h3>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova Senha</Label>
              <Input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm(prev => ({ ...prev, newPass: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm" placeholder="••••••••" />
            </div>
            <Button size="sm" onClick={handleChangePassword} className="h-8 text-xs"
              style={{ background: "var(--gradient-primary)" }}>
              Salvar Senha
            </Button>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-amber/10"><Bell className="w-4 h-4 text-neon-amber" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Webhooks & PushCut</h3>
              <p className="text-xs text-muted-foreground">Notificações globais (Telegram, PushCut, Discord/Slack)</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook Telegram</Label>
              <Input value={form.webhook_telegram_global} onChange={e => setForm(prev => ({ ...prev, webhook_telegram_global: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm" placeholder="https://api.telegram.org/bot..." />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">URL do PushCut (Webhook)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Ativo</span>
                  <Switch checked={pushcutForm.pushcut_ativo}
                    onCheckedChange={v => setPushcutForm(prev => ({ ...prev, pushcut_ativo: v }))} />
                </div>
              </div>
              <Input value={pushcutForm.pushcut_url} onChange={e => setPushcutForm(prev => ({ ...prev, pushcut_url: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm" placeholder="https://api.pushcut.io/..." />
              <p className="text-[10px] text-muted-foreground">Cole aqui a URL de webhook do PushCut. Ative o toggle para receber notificações de depósitos, saques e alertas via PushCut (iOS/Mac).</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook Discord / Slack / Outro</Label>
              <Input value={form.webhook_outro_global} onChange={e => setForm(prev => ({ ...prev, webhook_outro_global: e.target.value }))}
                className="bg-secondary border-border h-9 text-sm" placeholder="https://..." />
            </div>
          </div>
        </motion.div>

        {/* Gateway */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-green/10"><Key className="w-4 h-4 text-neon-green" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Gateway de Pagamento Global</h3>
              <p className="text-xs text-muted-foreground">Chave padrão para plataformas sem gateway próprio</p>
            </div>
          </div>
          <Input value={form.gateway_chave_global} onChange={e => setForm(prev => ({ ...prev, gateway_chave_global: e.target.value }))}
            className="bg-secondary border-border h-9 text-sm font-mono" placeholder="pk_live_..." />
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-[10px] text-primary font-semibold">⚠️ Sem gateway configurado na plataforma, saques NÃO serão enviados via PIX. Configure a chave aqui (global) ou em cada plataforma individualmente.</p>
          </div>
        </motion.div>

        {/* Cooperation */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-border/60 p-5 space-y-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10"><Globe className="w-4 h-4 text-neon-purple" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Cooperação Padrão</h3>
              <p className="text-xs text-muted-foreground">Contagem regressiva e exclusão automática</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dias Padrão de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias_padrao} onChange={e => setForm(prev => ({ ...prev, cooperacao_dias_padrao: Number(e.target.value) }))}
                className="bg-secondary border-border h-9 text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Exclusão automática de afiliados</Label>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Remove afiliados quando cooperação expirar</p>
              </div>
              <Switch checked={form.exclusao_automatica_afiliados}
                onCheckedChange={v => setForm(prev => ({ ...prev, exclusao_automatica_afiliados: v }))} />
            </div>
          </div>
        </motion.div>

        {/* Save */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 flex justify-end">
          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="h-9 text-sm gap-2"
            style={{ background: "var(--gradient-primary)" }}>
            <Save className="w-3.5 h-3.5" /> Salvar Configurações Globais
          </Button>
        </motion.div>

        {/* Version info */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 rounded-xl border border-border/60 p-4 flex items-center justify-between"
          style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Master Painel V7 — Platform Adapter Engine</p>
              <p className="text-xs text-muted-foreground mono">v7.0.0 — Build 2026.03.09</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Cache Inteligente</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Auto-Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full status-online" />
              <span className="text-xs text-neon-green font-medium">Operacional</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
