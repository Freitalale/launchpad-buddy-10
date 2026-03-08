import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Plataforma, useUpdatePlatform } from "@/hooks/usePlatforms";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useToast } from "@/hooks/use-toast";

interface ConfigureModalProps {
  platform: Plataforma | null;
  onClose: () => void;
}

const ConfigureModal = ({ platform, onClose }: ConfigureModalProps) => {
  const { toast } = useToast();
  const updatePlatform = useUpdatePlatform();
  const api = usePlatformApi();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testDetails, setTestDetails] = useState<string[]>([]);

  const [form, setForm] = useState({
    url: "", db_host: "", db_port: 3306, db_user: "", db_pass: "", db_name: "",
    tabela_usuarios: "users", tabela_afiliados: "affiliates", tabela_saldo: "wallets", coluna_saldo: "balance",
    webhook_telegram: "", webhook_outro: "", gateway_chave: "",
    cooperacao_dias: 30,
  });

  useEffect(() => {
    if (platform) {
      setForm({
        url: platform.url ?? "",
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

  const handleTestApi = async () => {
    setTesting(true);
    setTestResult(null);
    setTestDetails([]);
    
    // Create a temporary platform object with the form URL
    const testPlatform = { ...platform, url: form.url };
    const result = await api.checkHealth(testPlatform);
    
    const details: string[] = [];
    if (result.endpoints.stats.ok) details.push("✅ stats — OK");
    else details.push(`❌ stats — ${result.endpoints.stats.error}`);
    if (result.endpoints.depositos.ok) details.push(`✅ depositos — ${result.endpoints.depositos.count} registros`);
    else details.push(`❌ depositos — ${result.endpoints.depositos.error}`);
    if (result.endpoints.saques.ok) details.push(`✅ saques — ${result.endpoints.saques.count} registros`);
    else details.push(`❌ saques — ${result.endpoints.saques.error}`);
    
    setTestDetails(details);
    
    if (result.status === "online") {
      setTestResult("success");
      toast({ title: "✅ API validada!", description: `Latência: ${result.latency_ms}ms — Todos endpoints OK` });
    } else {
      setTestResult("error");
      const firstError = result.errors[0]?.message ?? "Verifique os detalhes";
      toast({ title: "⚠️ Problemas encontrados", description: firstError, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    const testPlatform = { ...platform, url: form.url };
    await api.syncPlatformData(testPlatform);
    setSyncing(false);
  };

  const handleSave = async () => {
    try {
      const cooperacao_expira = form.cooperacao_dias
        ? new Date(Date.now() + form.cooperacao_dias * 86400000).toISOString().split("T")[0]
        : null;

      await updatePlatform.mutateAsync({
        id: platform.id,
        url: form.url || null,
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
              <p className="text-xs text-muted-foreground">API, banco de dados, webhooks e cooperação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="api" className="text-xs gap-1"><Globe className="w-3 h-3" /> API</TabsTrigger>
            <TabsTrigger value="database" className="text-xs gap-1"><Database className="w-3 h-3" /> Banco</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Wifi className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="cooperation" className="text-xs gap-1"><Server className="w-3 h-3" /> Cooperação</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-muted-foreground">URL da Plataforma (onde está o api.php)</Label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                className="bg-secondary h-9 text-sm font-mono" placeholder="https://gerenteriquinho.online" />
              <p className="text-[10px] text-muted-foreground mt-1">O painel acessará: {form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "—"}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTestApi} disabled={testing || !form.url}
                className={`gap-2 h-8 text-xs flex-1 ${testResult === "success" ? "border-neon-green/60 text-neon-green" : testResult === "error" ? "border-neon-red/60 text-neon-red" : ""}`}>
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : testResult === "success" ? <CheckCircle className="w-3 h-3" /> : testResult === "error" ? <AlertCircle className="w-3 h-3" /> : <TestTube className="w-3 h-3" />}
                {testing ? "Testando..." : testResult === "success" ? "API Validada!" : "Testar API"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !form.url}
                className="gap-2 h-8 text-xs">
                {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Sincronizar
              </Button>
            </div>

            {testDetails.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                <p className="text-[10px] font-bold text-foreground mb-1">Resultado do teste:</p>
                {testDetails.map((d, i) => (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground">{d}</p>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="rounded-lg bg-neon-amber/5 border border-neon-amber/20 p-2 mb-2">
              <p className="text-[10px] text-neon-amber font-semibold">ℹ️ O banco de dados é acessado diretamente pelo api.php na hospedagem. Configure aqui apenas para referência/backup.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Host</Label>
                <Input value={form.db_host} onChange={e => setForm(p => ({ ...p, db_host: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="localhost" /></div>
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
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Webhook Telegram (opcional)</Label>
              <Input value={form.webhook_telegram} onChange={e => setForm(p => ({ ...p, webhook_telegram: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Webhook Discord/Slack (opcional)</Label>
              <Input value={form.webhook_outro} onChange={e => setForm(p => ({ ...p, webhook_outro: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Gateway de Pagamento (opcional)</Label>
              <Input value={form.gateway_chave} onChange={e => setForm(p => ({ ...p, gateway_chave: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="pk_live_..." /></div>
          </TabsContent>

          <TabsContent value="cooperation" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Dias de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias} onChange={e => setForm(p => ({ ...p, cooperacao_dias: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Quando atingir esse limite, somente afiliados podem ser removidos.</p>
            </div>
            <div className="p-3 rounded-lg bg-neon-amber/5 border border-neon-amber/20">
              <p className="text-xs text-neon-amber font-semibold">⚠️ Cooperação configura exclusão de afiliados</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quando a cooperação expira, o sistema chama ?action=remover_afiliados na API. Nunca exclui usuários totais.</p>
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
