import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe, TableProperties, Columns3 } from "lucide-react";
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
  const [testingStructure, setTestingStructure] = useState(false);
  const [structureResult, setStructureResult] = useState<string[]>([]);

  const [form, setForm] = useState({
    url: "", db_host: "", db_port: 3306, db_user: "", db_pass: "", db_name: "",
    tabela_usuarios: "users", tabela_afiliados: "affiliates", tabela_saldo: "wallets", coluna_saldo: "balance",
    tabela_depositos: "deposits", tabela_saques: "withdrawals",
    coluna_id_usuario: "id", coluna_nome_usuario: "name",
    coluna_valor_deposito: "amount", coluna_valor_saque: "amount",
    coluna_pix: "pix", coluna_status: "status", coluna_created_at: "created_at", coluna_user_id_fk: "user_id",
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
        tabela_depositos: (platform as any).tabela_depositos ?? "deposits",
        tabela_saques: (platform as any).tabela_saques ?? "withdrawals",
        coluna_id_usuario: (platform as any).coluna_id_usuario ?? "id",
        coluna_nome_usuario: (platform as any).coluna_nome_usuario ?? "name",
        coluna_valor_deposito: (platform as any).coluna_valor_deposito ?? "amount",
        coluna_valor_saque: (platform as any).coluna_valor_saque ?? "amount",
        coluna_pix: (platform as any).coluna_pix ?? "pix",
        coluna_status: (platform as any).coluna_status ?? "status",
        coluna_created_at: (platform as any).coluna_created_at ?? "created_at",
        coluna_user_id_fk: (platform as any).coluna_user_id_fk ?? "user_id",
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

  const handleTestStructure = async () => {
    setTestingStructure(true);
    setStructureResult([]);
    const results: string[] = [];

    // Test via the API endpoint that uses the mapping
    const testPlatform = { ...platform, url: form.url };
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : null;

    if (!apiUrl) {
      results.push("❌ URL da API não configurada");
      setStructureResult(results);
      setTestingStructure(false);
      return;
    }

    // Test each mapped table via the corresponding endpoint
    const mappings = [
      { label: `Tabela Usuários (${form.tabela_usuarios})`, action: "stats" },
      { label: `Tabela Depósitos (${form.tabela_depositos})`, action: "depositos" },
      { label: `Tabela Saques (${form.tabela_saques})`, action: "saques" },
      { label: `Tabela Saldo (${form.tabela_saldo})`, action: "stats" },
      { label: `Tabela Afiliados (${form.tabela_afiliados})`, action: "stats" },
    ];

    for (const m of mappings) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${apiUrl}?action=${m.action}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const text = await res.text();
          try {
            JSON.parse(text);
            results.push(`✅ ${m.label} — OK`);
          } catch {
            results.push(`⚠️ ${m.label} — JSON inválido. Verifique se api.php usa os nomes corretos de tabela/coluna.`);
          }
        } else {
          results.push(`❌ ${m.label} — HTTP ${res.status}. Verifique o mapeamento no api.php.`);
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          results.push(`❌ ${m.label} — Timeout. Servidor não respondeu.`);
        } else {
          results.push(`❌ ${m.label} — ${e.message}`);
        }
      }
    }

    // Validate column mapping consistency
    const columnChecks = [
      { col: form.coluna_id_usuario, label: "ID Usuário" },
      { col: form.coluna_nome_usuario, label: "Nome Usuário" },
      { col: form.coluna_valor_deposito, label: "Valor Depósito" },
      { col: form.coluna_valor_saque, label: "Valor Saque" },
      { col: form.coluna_pix, label: "Chave PIX" },
      { col: form.coluna_status, label: "Status" },
      { col: form.coluna_created_at, label: "Data Criação" },
      { col: form.coluna_saldo, label: "Saldo" },
    ];

    results.push("", "📋 Colunas mapeadas:");
    for (const c of columnChecks) {
      if (c.col && c.col.trim()) {
        results.push(`  ✅ ${c.label} → ${c.col}`);
      } else {
        results.push(`  ⚠️ ${c.label} → não configurada`);
      }
    }

    setStructureResult(results);
    setTestingStructure(false);
    toast({ title: "Teste de estrutura concluído", description: "Verifique os resultados abaixo" });
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
        // New mapping fields
        tabela_depositos: form.tabela_depositos,
        tabela_saques: form.tabela_saques,
        coluna_id_usuario: form.coluna_id_usuario,
        coluna_nome_usuario: form.coluna_nome_usuario,
        coluna_valor_deposito: form.coluna_valor_deposito,
        coluna_valor_saque: form.coluna_valor_saque,
        coluna_pix: form.coluna_pix,
        coluna_status: form.coluna_status,
        coluna_created_at: form.coluna_created_at,
        coluna_user_id_fk: form.coluna_user_id_fk,
      } as any);
      toast({ title: "Configurações salvas!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const MappingField = ({ label, value, field, placeholder }: { label: string; value: string; field: string; placeholder: string }) => (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        className="bg-secondary h-8 text-xs font-mono" placeholder={placeholder} />
    </div>
  );

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
              <p className="text-xs text-muted-foreground">API, banco de dados, mapeamento, webhooks e cooperação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="api" className="text-xs gap-1"><Globe className="w-3 h-3" /> API</TabsTrigger>
            <TabsTrigger value="database" className="text-xs gap-1"><Database className="w-3 h-3" /> Banco</TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs gap-1"><TableProperties className="w-3 h-3" /> Mapeamento</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Wifi className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="cooperation" className="text-xs gap-1"><Server className="w-3 h-3" /> Cooperação</TabsTrigger>
          </TabsList>

          {/* API Tab */}
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
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !form.url} className="gap-2 h-8 text-xs">
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

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="rounded-lg bg-accent/30 border border-accent/50 p-2 mb-2">
              <p className="text-[10px] text-accent-foreground font-semibold">ℹ️ O banco de dados é acessado pelo api.php na hospedagem. Configure aqui para referência e para gerar o api.php automaticamente.</p>
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
          </TabsContent>

          {/* NEW: Mapping Tab */}
          <TabsContent value="mapping" className="space-y-4 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TableProperties className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Mapeamento Dinâmico de Tabelas e Colunas</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Configure os nomes reais das tabelas e colunas do banco desta plataforma. O api.php usará esses nomes para montar as queries SQL automaticamente.</p>
            </div>

            {/* Table Mapping */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Mapeamento de Tabelas</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MappingField label="Tabela de Usuários" value={form.tabela_usuarios} field="tabela_usuarios" placeholder="users" />
                <MappingField label="Tabela de Depósitos" value={form.tabela_depositos} field="tabela_depositos" placeholder="deposits" />
                <MappingField label="Tabela de Saques" value={form.tabela_saques} field="tabela_saques" placeholder="withdrawals" />
                <MappingField label="Tabela de Saldo / Carteira" value={form.tabela_saldo} field="tabela_saldo" placeholder="wallets" />
                <MappingField label="Tabela de Afiliados" value={form.tabela_afiliados} field="tabela_afiliados" placeholder="affiliates" />
              </div>
            </div>

            {/* Column Mapping */}
            <div className="border-t border-border/50 pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Columns3 className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Mapeamento de Colunas</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MappingField label="ID do Usuário" value={form.coluna_id_usuario} field="coluna_id_usuario" placeholder="id" />
                <MappingField label="Nome do Usuário" value={form.coluna_nome_usuario} field="coluna_nome_usuario" placeholder="name" />
                <MappingField label="FK User ID (depósitos/saques)" value={form.coluna_user_id_fk} field="coluna_user_id_fk" placeholder="user_id" />
                <MappingField label="Valor do Depósito" value={form.coluna_valor_deposito} field="coluna_valor_deposito" placeholder="amount" />
                <MappingField label="Valor do Saque" value={form.coluna_valor_saque} field="coluna_valor_saque" placeholder="amount" />
                <MappingField label="Chave PIX" value={form.coluna_pix} field="coluna_pix" placeholder="pix" />
                <MappingField label="Status da Transação" value={form.coluna_status} field="coluna_status" placeholder="status" />
                <MappingField label="Data de Criação" value={form.coluna_created_at} field="coluna_created_at" placeholder="created_at" />
                <MappingField label="Saldo da Carteira" value={form.coluna_saldo} field="coluna_saldo" placeholder="balance" />
              </div>
            </div>

            {/* Example */}
            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-2">
              <p className="text-[10px] font-bold text-foreground">💡 Exemplo de uso</p>
              <p className="text-[10px] text-muted-foreground">
                Se a plataforma usa <span className="font-mono text-primary">transactions</span> em vez de <span className="font-mono">deposits</span>,
                e <span className="font-mono text-primary">accounts</span> em vez de <span className="font-mono">users</span>,
                basta alterar os campos acima. O api.php gerado usará os nomes corretos automaticamente.
              </p>
              <p className="text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded">
                SELECT u.<span className="text-primary">{form.coluna_nome_usuario}</span> as nome_usuario, d.<span className="text-primary">{form.coluna_valor_deposito}</span> as valor
                <br />FROM <span className="text-primary">{form.tabela_depositos}</span> d
                <br />JOIN <span className="text-primary">{form.tabela_usuarios}</span> u ON d.<span className="text-primary">{form.coluna_user_id_fk}</span> = u.<span className="text-primary">{form.coluna_id_usuario}</span>
              </p>
            </div>

            {/* Test Structure Button */}
            <Button variant="outline" size="sm" onClick={handleTestStructure} disabled={testingStructure || !form.url}
              className="w-full gap-2 h-9 text-xs">
              {testingStructure ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
              {testingStructure ? "Testando Estrutura..." : "Testar Estrutura do Banco"}
            </Button>

            {structureResult.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                <p className="text-[10px] font-bold text-foreground mb-1">Resultado do teste de estrutura:</p>
                {structureResult.map((r, i) => (
                  <p key={i} className={`text-[10px] font-mono ${r.startsWith("✅") ? "text-neon-green" : r.startsWith("❌") ? "text-destructive" : r.startsWith("⚠️") ? "text-neon-amber" : "text-muted-foreground"}`}>{r}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Webhook Telegram (opcional)</Label>
              <Input value={form.webhook_telegram} onChange={e => setForm(p => ({ ...p, webhook_telegram: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Webhook Discord/Slack (opcional)</Label>
              <Input value={form.webhook_outro} onChange={e => setForm(p => ({ ...p, webhook_outro: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Gateway de Pagamento (opcional)</Label>
              <Input value={form.gateway_chave} onChange={e => setForm(p => ({ ...p, gateway_chave: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="pk_live_..." /></div>
          </TabsContent>

          {/* Cooperation Tab */}
          <TabsContent value="cooperation" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Dias de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias} onChange={e => setForm(p => ({ ...p, cooperacao_dias: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Quando atingir esse limite, somente afiliados podem ser removidos.</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-xs text-accent-foreground font-semibold">⚠️ Cooperação configura exclusão de afiliados</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quando a cooperação expira, o sistema chama ?action=remover_afiliados na API. Nunca exclui usuários totais.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="h-8 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-3 h-3" /> Salvar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfigureModal;
