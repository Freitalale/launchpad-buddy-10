import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Plataforma, useUpdatePlatform } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConfigureModalProps {
  platform: Plataforma | null;
  onClose: () => void;
}

const ConfigureModal = ({ platform, onClose }: ConfigureModalProps) => {
  const { toast } = useToast();
  const updatePlatform = useUpdatePlatform();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const [form, setForm] = useState({
    db_host: "", db_port: 3306, db_user: "", db_pass: "", db_name: "",
    tabela_usuarios: "users", tabela_afiliados: "affiliates", tabela_saldo: "wallets", coluna_saldo: "balance",
    webhook_telegram: "", webhook_outro: "", gateway_chave: "",
    cooperacao_dias: 30,
  });

  useEffect(() => {
    if (platform) {
      setForm({
        db_host: platform.db_host ?? "",
        db_port: platform.db_port ?? 3306,
        db_user: platform.db_user ?? "",
        db_pass: platform.db_pass ?? "",
        db_name: platform.db_name ?? "",
        tabela_usuarios: platform.tabela_usuarios ?? "users",
        tabela_afiliados: platform.tabela_afiliados ?? "affiliates",
        tabela_saldo: platform.tabela_saldo ?? "wallets",
        coluna_saldo: platform.coluna_saldo ?? "balance",
        webhook_telegram: platform.webhook_telegram ?? "",
        webhook_outro: platform.webhook_outro ?? "",
        gateway_chave: platform.gateway_chave ?? "",
        cooperacao_dias: platform.cooperacao_dias ?? 30,
      });
    }
  }, [platform]);

  if (!platform) return null;

  const handleTestDb = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-platform-db", {
        body: {
          db_host: form.db_host, db_port: form.db_port, db_user: form.db_user,
          db_pass: form.db_pass, db_name: form.db_name,
          tabela_usuarios: form.tabela_usuarios, tabela_afiliados: form.tabela_afiliados,
          tabela_saldo: form.tabela_saldo, coluna_saldo: form.coluna_saldo,
        },
      });
      if (error) throw error;
      if (data?.ok) {
        setTestResult("success");
        toast({ title: "✅ Configuração válida!", description: "Endpoints da API prontos para uso" });
      } else {
        throw new Error(data?.error || "Erro");
      }
    } catch (err: any) {
      setTestResult("error");
      toast({ title: "Erro na verificação", description: err.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    try {
      const cooperacao_expira = form.cooperacao_dias
        ? new Date(Date.now() + form.cooperacao_dias * 86400000).toISOString().split("T")[0]
        : null;

      await updatePlatform.mutateAsync({
        id: platform.id,
        db_host: form.db_host || null,
        db_port: form.db_port || 3306,
        db_user: form.db_user || null,
        db_pass: form.db_pass || null,
        db_name: form.db_name || null,
        tabela_usuarios: form.tabela_usuarios,
        tabela_afiliados: form.tabela_afiliados,
        tabela_saldo: form.tabela_saldo,
        coluna_saldo: form.coluna_saldo,
        webhook_telegram: form.webhook_telegram || null,
        webhook_outro: form.webhook_outro || null,
        gateway_chave: form.gateway_chave || null,
        cooperacao_dias: form.cooperacao_dias || null,
        cooperacao_expira,
      });
      toast({ title: "Configurações salvas!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><SettingsIcon className="w-4 h-4 text-primary" /></div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Configurar — {platform.nome}</h2>
              <p className="text-xs text-muted-foreground">Banco de dados, webhooks e cooperação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <Tabs defaultValue="database" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="database" className="text-xs gap-1"><Database className="w-3 h-3" /> Banco de Dados</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Wifi className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="cooperation" className="text-xs gap-1"><Server className="w-3 h-3" /> Cooperação</TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Host</Label>
                <Input value={form.db_host} onChange={e => setForm(p => ({ ...p, db_host: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="192.168.1.100" /></div>
              <div><Label className="text-xs text-muted-foreground">Porta</Label>
                <Input type="number" value={form.db_port} onChange={e => setForm(p => ({ ...p, db_port: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Usuário</Label>
                <Input value={form.db_user} onChange={e => setForm(p => ({ ...p, db_user: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Senha</Label>
                <Input type="password" value={form.db_pass} onChange={e => setForm(p => ({ ...p, db_pass: e.target.value }))} className="bg-secondary h-9 text-sm" /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Nome do Banco</Label>
                <Input value={form.db_name} onChange={e => setForm(p => ({ ...p, db_name: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" /></div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <p className="text-xs font-semibold text-foreground mb-2">Mapeamento de Tabelas</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] text-muted-foreground">Tabela Usuários</Label>
                  <Input value={form.tabela_usuarios} onChange={e => setForm(p => ({ ...p, tabela_usuarios: e.target.value }))} className="bg-secondary h-8 text-xs font-mono" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Tabela Afiliados</Label>
                  <Input value={form.tabela_afiliados} onChange={e => setForm(p => ({ ...p, tabela_afiliados: e.target.value }))} className="bg-secondary h-8 text-xs font-mono" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Tabela Saldo</Label>
                  <Input value={form.tabela_saldo} onChange={e => setForm(p => ({ ...p, tabela_saldo: e.target.value }))} className="bg-secondary h-8 text-xs font-mono" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Coluna Saldo</Label>
                  <Input value={form.coluna_saldo} onChange={e => setForm(p => ({ ...p, coluna_saldo: e.target.value }))} className="bg-secondary h-8 text-xs font-mono" /></div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleTestDb} disabled={testing}
              className={`gap-2 h-8 text-xs ${testResult === "success" ? "border-neon-green/60 text-neon-green" : testResult === "error" ? "border-neon-red/60 text-neon-red" : ""}`}>
              {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : testResult === "success" ? <CheckCircle className="w-3 h-3" /> : testResult === "error" ? <AlertCircle className="w-3 h-3" /> : <TestTube className="w-3 h-3" />}
              {testing ? "Verificando..." : testResult === "success" ? "Validado!" : "Verificar Configuração"}
            </Button>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Webhook Telegram (opcional)</Label>
              <Input value={form.webhook_telegram} onChange={e => setForm(p => ({ ...p, webhook_telegram: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Webhook Discord/Slack (opcional)</Label>
              <Input value={form.webhook_outro} onChange={e => setForm(p => ({ ...p, webhook_outro: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Gateway de Pagamento (opcional)</Label>
              <Input value={form.gateway_chave} onChange={e => setForm(p => ({ ...p, gateway_chave: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="pk_live_..." /></div>
            <p className="text-[10px] text-muted-foreground">Webhooks e gateways são opcionais. Configure apenas se necessário.</p>
          </TabsContent>

          <TabsContent value="cooperation" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Dias de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias} onChange={e => setForm(p => ({ ...p, cooperacao_dias: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Quando atingir esse limite, somente afiliados podem ser removidos. Usuários totais nunca são excluídos.</p>
            </div>
            <div className="p-3 rounded-lg bg-neon-amber/5 border border-neon-amber/20">
              <p className="text-xs text-neon-amber font-semibold">⚠️ Cooperação configura exclusão de afiliados</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quando a cooperação expira, o sistema pode excluir somente afiliados ou enviar notificação via Telegram. Nunca exclui usuários totais.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="h-8 text-xs gap-1" style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
            <Save className="w-3 h-3" /> Salvar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfigureModal;
