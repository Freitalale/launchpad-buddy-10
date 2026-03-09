import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Server, Wifi, Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Zap, Globe, ChevronDown, ChevronUp, Database, Shield, ArrowDownCircle,
  ArrowUpCircle, Wallet, Users, ExternalLink, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatforms } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiHealthResult, type DiagnosticError } from "@/hooks/usePlatformApi";
import { adapterRegistry } from "@/lib/platform-adapter";

const errorTypeLabels: Record<string, { label: string; icon: string }> = {
  API_OFFLINE: { label: "API Offline", icon: "🔴" },
  TIMEOUT: { label: "Timeout", icon: "⏱️" },
  ENDPOINT_NOT_FOUND: { label: "Endpoint 404", icon: "🔍" },
  INVALID_JSON: { label: "JSON Inválido", icon: "📄" },
  CORS_ERROR: { label: "Erro CORS", icon: "🚫" },
  DB_DISCONNECTED: { label: "Banco Offline", icon: "🗄️" },
  AUTH_ERROR: { label: "Autenticação", icon: "🔒" },
  PERMISSION_ERROR: { label: "Permissão", icon: "🔐" },
  SERVER_ERROR: { label: "Erro Servidor", icon: "💥" },
  MISSING_FIELDS: { label: "Campos Ausentes", icon: "⚠️" },
  NETWORK_ERROR: { label: "Erro de Rede", icon: "📡" },
};

interface DeepDiagnostic {
  platform_id: string;
  healthResult: ApiHealthResult;
  statsData: any;
  depositCount: number;
  saqueCount: number;
  saldoTotal: number;
  issues: DeepIssue[];
  apiVersion: string | null;
  diagData: any;
  adapterType: string;
  gatewayConfigured: boolean;
}

interface DeepIssue {
  severity: "critical" | "warning" | "info";
  area: string;
  title: string;
  detail: string;
  fix: string;
}

const IssueCard = ({ issue }: { issue: DeepIssue }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    critical: { bg: "bg-destructive/5", border: "border-destructive/30", text: "text-destructive", icon: "🔴" },
    warning: { bg: "bg-amber-400/5", border: "border-amber-400/30", text: "text-amber-400", icon: "🟡" },
    info: { bg: "bg-primary/5", border: "border-primary/30", text: "text-primary", icon: "🔵" },
  };
  const c = colors[issue.severity];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{c.icon}</span>
            <div>
              <p className={`text-xs font-bold ${c.text}`}>{issue.title}</p>
              <p className="text-[10px] text-muted-foreground">{issue.area}</p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2 border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground">{issue.detail}</p>
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-2">
            <p className="text-[10px] font-bold text-accent mb-1">💡 Solução</p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{issue.fix}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const SystemHealth = () => {
  const { data: platforms = [], isLoading } = usePlatforms();
  const api = usePlatformApi();
  const [results, setResults] = useState<ApiHealthResult[]>([]);
  const [deepDiags, setDeepDiags] = useState<Map<string, DeepDiagnostic>>(new Map());
  const [checking, setChecking] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());

  const online = results.filter(r => r.status === "online").length;
  const unstable = results.filter(r => r.status === "unstable").length;
  const errors = results.filter(r => r.status === "error").length;
  const offline = results.filter(r => r.status === "offline").length;
  const totalIssues = Array.from(deepDiags.values()).reduce((s, d) => s + d.issues.length, 0);
  const criticalIssues = Array.from(deepDiags.values()).reduce((s, d) => s + d.issues.filter(i => i.severity === "critical").length, 0);
  const avgLatency = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / results.length) : 0;

  const runDeepDiagnostic = async (platform: any): Promise<DeepDiagnostic> => {
    const healthResult = await api.checkHealth(platform);
    const config = adapterRegistry.getConfig(platform);
    const issues: DeepIssue[] = [];
    let statsData: any = null;
    let depositCount = 0;
    let saqueCount = 0;
    let saldoTotal = 0;
    let apiVersion: string | null = null;
    let diagData: any = null;

    // 1. Stats
    const statsResult = await api.fetchStats(platform);
    if (statsResult.data) {
      statsData = statsResult.data;
      saldoTotal = statsResult.data.saldo_total ?? 0;
      if (saldoTotal === 0) {
        issues.push({ severity: "critical", area: "Saldo", title: "Saldo total R$ 0,00", detail: "A API retornou saldo_total = 0. Tabela de saldo pode estar com nome errado.", fix: "Use o Scanner para encontrar a tabela correta de saldo." });
      }
      if ((statsResult.data.total_usuarios ?? 0) === 0) {
        issues.push({ severity: "warning", area: "Usuários", title: "Nenhum usuário encontrado", detail: "total_usuarios = 0.", fix: "Verifique o mapeamento da tabela de usuários." });
      }
    } else {
      issues.push({ severity: "critical", area: "Stats", title: "Endpoint stats falhou", detail: statsResult.error?.message ?? "Sem resposta", fix: statsResult.error?.solution ?? "Verifique api.php" });
    }

    // 2. Deposits
    const depsResult = await api.fetchDepositos(platform);
    depositCount = depsResult.data.length;
    if (depsResult.error && depositCount === 0) {
      issues.push({ severity: "critical", area: "Depósitos", title: "Erro ao buscar depósitos", detail: depsResult.error.message, fix: depsResult.error.solution ?? "Verifique mapeamento." });
    }

    // 3. Saques
    const saqResult = await api.fetchSaques(platform);
    saqueCount = saqResult.data.length;
    if (saqResult.error && saqueCount === 0) {
      issues.push({ severity: "critical", area: "Saques", title: "Erro ao buscar saques", detail: saqResult.error.message, fix: saqResult.error.solution ?? "Verifique mapeamento." });
    }

    // 4. Duplication detection — deposits
    if (depsResult.data.length > 0) {
      const depKeys = new Set<string>();
      let depDuplicates = 0;
      for (const d of depsResult.data) {
        const key = `${d.nome_usuario}_${d.valor}_${d.created_at}`;
        if (depKeys.has(key)) depDuplicates++;
        else depKeys.add(key);
      }
      if (depDuplicates > 0) {
        issues.push({ severity: "warning", area: "Depósitos", title: `${depDuplicates} depósito(s) duplicado(s)`, detail: `Encontrados registros com mesmo usuário+valor+data. Pode inflar totais.`, fix: "Verifique no banco se há registros duplicados na tabela de depósitos." });
      }
    }

    // 5. Duplication detection — saques
    if (saqResult.data.length > 0) {
      const saqKeys = new Set<string>();
      let saqDuplicates = 0;
      for (const s of saqResult.data) {
        const key = `${s.nome_usuario}_${s.valor}_${s.created_at}`;
        if (saqKeys.has(key)) saqDuplicates++;
        else saqKeys.add(key);
      }
      if (saqDuplicates > 0) {
        issues.push({ severity: "warning", area: "Saques", title: `${saqDuplicates} saque(s) duplicado(s)`, detail: `Registros com mesmo usuário+valor+data.`, fix: "Verifique duplicações na tabela de saques do banco remoto." });
      }
    }

    // 6. Status inconsistency detection
    if (saqResult.data.length > 0) {
      const unknownStatuses = new Set<string>();
      const knownStatuses = ["pending", "approved", "rejected", "completed", "paid", "canceled", "cancelled", "denied", "processing", "pendente", "aprovado", "rejeitado", "pago", "cancelado", "falha", "0", "1", "2", "3"];
      for (const s of saqResult.data) {
        const st = String(s.status ?? "").toLowerCase().trim();
        if (st && !knownStatuses.includes(st)) unknownStatuses.add(st);
      }
      if (unknownStatuses.size > 0) {
        issues.push({ severity: "warning", area: "Status", title: `Status não reconhecido(s): ${[...unknownStatuses].join(", ")}`, detail: `O painel não sabe mapear esses valores de status. Eles serão tratados como "pendente".`, fix: `Configure o Mapeamento Universal de Status na aba Mapeamento → seção Status. Adicione esses valores ao mapeamento.` });
      }
    }

    // 7. Balance divergence check
    if (statsData && saldoTotal > 0) {
      const totalApprovedSaques = saqResult.data.filter(s => ["approved", "aprovado", "paid", "pago", "completed"].includes(String(s.status).toLowerCase())).reduce((sum, s) => sum + Number(s.valor), 0);
      const totalApprovedDeposits = depsResult.data.filter(d => ["approved", "aprovado", "paid", "pago", "completed"].includes(String(d.status).toLowerCase())).reduce((sum, d) => sum + Number(d.valor), 0);
      if (totalApprovedSaques > totalApprovedDeposits * 1.5 && totalApprovedDeposits > 0) {
        issues.push({ severity: "warning", area: "Financeiro", title: "Saques superam depósitos em 50%+", detail: `Depósitos aprovados: R$${totalApprovedDeposits.toFixed(2)} | Saques aprovados: R$${totalApprovedSaques.toFixed(2)}`, fix: "Verifique se há saques irregulares ou depósitos não sendo contabilizados corretamente." });
      }
    }

    // 8. Diagnostico endpoint
    try {
      const apiUrl = platform.url?.replace(/\/$/, "");
      if (apiUrl) {
        const fullUrl = apiUrl.startsWith("http") ? apiUrl : `https://${apiUrl}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${fullUrl}/api.php?action=diagnostico`, { signal: controller.signal });
        clearTimeout(timeout);
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          diagData = json;
          apiVersion = json.version ?? null;
          const diag = json.diag ?? json.diagnostico?.mapping ?? {};
          for (const [key, info] of Object.entries(diag) as any[]) {
            if (info?.exists === false) {
              issues.push({ severity: "critical", area: `Tabela ${key}`, title: `Tabela "${info.table}" NÃO EXISTE`, detail: `Mapeada como "${key}" mas não encontrada.`, fix: "Use o Scanner para encontrar o nome correto." });
            }
            // Check missing columns
            if (info?.missing_columns?.length > 0) {
              issues.push({ severity: "critical", area: `Colunas ${key}`, title: `${info.missing_columns.length} coluna(s) inexistente(s) em "${info.table}"`, detail: `Colunas: ${info.missing_columns.join(", ")}`, fix: "Corrija o mapeamento de colunas na aba Mapeamento ou verifique se os nomes estão corretos." });
            }
          }
        } catch { /* invalid json */ }
      }
    } catch { /* endpoint unavailable */ }

    // 9. Version check
    if (apiVersion && !apiVersion.startsWith("5.6") && !apiVersion.startsWith("6.") && !apiVersion.startsWith("7.")) {
      issues.push({ severity: "warning", area: "Versão", title: `API desatualizada (v${apiVersion})`, detail: "Recomendado v6.0+ ou v7.0", fix: "Gere novo api.php na aba Gerar." });
    }

    // 10. Config checks
    if (!platform.url) issues.push({ severity: "critical", area: "Config", title: "URL não configurada", detail: "Sem URL.", fix: "Configure a URL da API." });
    if (!platform.db_host) issues.push({ severity: "info", area: "Config", title: "Credenciais DB ausentes", detail: "Scanner não funcionará sem credenciais.", fix: "Preencha as credenciais do banco se precisar do Scanner." });

    // 11. Gateway check
    if (!config.gateway && !platform.gateway_chave) {
      issues.push({ severity: "info", area: "Gateway", title: "Sem gateway configurado", detail: "Aprovação de saque usa apenas API. Configure um gateway para pagamento automático.", fix: "Configure gateway na aba Gateway da plataforma." });
    }

    // Health errors
    for (const err of healthResult.errors) {
      if (!issues.some(i => i.title.includes(err.endpoint))) {
        issues.push({ severity: "critical", area: `Endpoint ${err.endpoint}`, title: err.message, detail: err.cause, fix: err.solution });
      }
    }

    return {
      platform_id: platform.id, healthResult, statsData, depositCount, saqueCount, saldoTotal, issues, apiVersion, diagData,
      adapterType: config.type, gatewayConfigured: !!config.gateway,
    };
  };

  const handleCheckAll = async () => {
    setChecking(true);
    const newResults: ApiHealthResult[] = [];
    const newDiags = new Map<string, DeepDiagnostic>();
    await Promise.all(platforms.map(async (p) => {
      const diag = await runDeepDiagnostic(p);
      newResults.push(diag.healthResult);
      newDiags.set(p.id, diag);
    }));
    setResults(newResults);
    setDeepDiags(newDiags);
    setChecking(false);
    setExpandedPlatforms(new Set(platforms.map(p => p.id)));
  };

  const handleCheckOne = async (platformId: string) => {
    const p = platforms.find(pl => pl.id === platformId);
    if (!p) return;
    const diag = await runDeepDiagnostic(p);
    setResults(prev => [...prev.filter(r => r.platform_id !== platformId), diag.healthResult]);
    setDeepDiags(prev => { const n = new Map(prev); n.set(platformId, diag); return n; });
    setExpandedPlatforms(prev => { const n = new Set(prev); n.add(platformId); return n; });
  };

  const toggleExpand = (id: string) => {
    setExpandedPlatforms(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const statusConfig = {
    online: { color: "text-accent", bg: "bg-accent/10", border: "border-accent/30", label: "Online", dot: "bg-accent" },
    unstable: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", label: "Instável", dot: "bg-amber-400" },
    error: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Com Erros", dot: "bg-destructive" },
    offline: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Offline", dot: "bg-destructive" },
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Diagnóstico <span className="gradient-text">Profundo V7</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform Adapter Engine — testa endpoints, gateway, mapeamento e dados reais</p>
        </div>
        <Button onClick={handleCheckAll} disabled={checking || platforms.length === 0} className="gap-2 h-9 text-sm" style={{ background: "var(--gradient-primary)" }}>
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {checking ? "Analisando..." : "🔬 Diagnóstico V7"}
        </Button>
      </motion.div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            { label: "Online", value: online, color: "text-accent", border: "border-accent/30", icon: Wifi },
            { label: "Instável", value: unstable, color: "text-amber-400", border: "border-amber-400/30", icon: AlertTriangle },
            { label: "Offline", value: offline + errors, color: "text-destructive", border: "border-destructive/30", icon: Server },
            { label: "Problemas", value: totalIssues, color: totalIssues > 0 ? "text-destructive" : "text-accent", border: totalIssues > 0 ? "border-destructive/30" : "border-accent/30", icon: XCircle },
            { label: "Críticos", value: criticalIssues, color: criticalIssues > 0 ? "text-destructive" : "text-accent", border: criticalIssues > 0 ? "border-destructive/30" : "border-accent/30", icon: AlertTriangle },
            { label: "Latência", value: `${avgLatency}ms`, color: avgLatency > 5000 ? "text-destructive" : avgLatency > 2000 ? "text-amber-400" : "text-primary", border: "border-primary/30", icon: Clock },
            { label: "Gateways", value: Array.from(deepDiags.values()).filter(d => d.gatewayConfigured).length, color: "text-neon-green", border: "border-neon-green/30", icon: CreditCard },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`rounded-xl border ${s.border} p-3`} style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[10px] font-bold text-foreground">{s.label}</span>
              </div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {platforms.length === 0 ? (
        <div className="rounded-xl border border-border/60 p-12 text-center" style={{ background: "hsl(var(--card))" }}>
          <p className="text-muted-foreground text-sm">Nenhuma plataforma cadastrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((p, idx) => {
            const result = results.find(r => r.platform_id === p.id);
            const diag = deepDiags.get(p.id);
            const expanded = expandedPlatforms.has(p.id);
            const sc = result ? statusConfig[result.status] : null;

            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + idx * 0.04 }}
                className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
                <div className="p-4 flex items-center gap-4 border-b border-border/30">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: `${p.cor ?? "#00c4ff"}15` }}>
                    {p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/")) ? <img src={p.logo} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">{p.logo}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{p.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{p.url ?? "URL não configurada"}</p>
                    </div>
                  </div>
                  {result && sc && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono px-2 py-1 rounded-md border ${sc.bg} ${sc.color} ${sc.border}`}>{result.latency_ms}ms</span>
                      <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border ${sc.bg} ${sc.color} ${sc.border}`}>
                        <span className={`w-2 h-2 rounded-full ${sc.dot} ${result.status === "online" ? "animate-pulse" : ""}`} />
                        {sc.label}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleCheckOne(p.id)}>
                      <Activity className="w-3 h-3" /> Testar
                    </Button>
                    {result && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleExpand(p.id)}>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {result && diag && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(["health", "stats", "depositos", "saques"] as const).map(ep => {
                        const d = result.endpoints[ep];
                        return (
                          <div key={ep} className={`flex items-center gap-2 p-2.5 rounded-lg border ${d.ok ? "bg-accent/5 border-accent/20" : "bg-destructive/5 border-destructive/20"}`}>
                            {d.ok ? <CheckCircle className="w-4 h-4 text-accent" /> : <XCircle className="w-4 h-4 text-destructive" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-foreground">?action={ep}</p>
                              {d.ok && d.latency_ms !== undefined && <p className="text-[9px] text-muted-foreground">{d.latency_ms}ms{d.count !== undefined ? ` · ${d.count} reg` : ""}</p>}
                              {!d.ok && <p className="text-[9px] text-destructive truncate">{d.error}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-primary" /><p className="text-[10px] font-bold text-foreground">Usuários</p></div>
                        <p className={`text-lg font-black ${diag.statsData?.total_usuarios > 0 ? "text-primary" : "text-destructive"}`}>{diag.statsData?.total_usuarios ?? "—"}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><Wallet className="w-3.5 h-3.5 text-neon-amber" /><p className="text-[10px] font-bold text-foreground">Saldo</p></div>
                        <p className={`text-lg font-black ${diag.saldoTotal > 0 ? "text-neon-amber" : "text-destructive"}`}>R$ {diag.saldoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><ArrowDownCircle className="w-3.5 h-3.5 text-accent" /><p className="text-[10px] font-bold text-foreground">Depósitos</p></div>
                        <p className={`text-lg font-black ${diag.depositCount > 0 ? "text-accent" : "text-amber-400"}`}>{diag.depositCount}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" /><p className="text-[10px] font-bold text-foreground">Saques</p></div>
                        <p className={`text-lg font-black ${diag.saqueCount > 0 ? "text-amber-400" : "text-destructive"}`}>{diag.saqueCount}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><CreditCard className="w-3.5 h-3.5 text-neon-green" /><p className="text-[10px] font-bold text-foreground">Gateway</p></div>
                        <p className={`text-lg font-black ${diag.gatewayConfigured ? "text-neon-green" : "text-muted-foreground"}`}>{diag.gatewayConfigured ? "✅" : "—"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {diag.apiVersion && (
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${diag.apiVersion.startsWith("5.6") || diag.apiVersion.startsWith("7.") ? "border-accent/30 bg-accent/10 text-accent" : "border-amber-400/30 bg-amber-400/10 text-amber-400"}`}>API v{diag.apiVersion}</span>
                      )}
                      <span className={`text-[10px] font-mono px-2 py-1 rounded border ${p.db_host ? "border-accent/30 bg-accent/10 text-accent" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{p.db_host ? "✅ DB" : "❌ DB"}</span>
                      <span className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary">Adapter: {diag.adapterType}</span>
                      <span className="text-[10px] font-mono px-2 py-1 rounded border border-border/30 bg-secondary/50 text-muted-foreground">{p.tabela_usuarios}/{p.tabela_depositos}/{p.tabela_saques}/{p.tabela_saldo}</span>
                    </div>

                    {diag.issues.length === 0 && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                        <p className="text-sm font-bold text-accent flex items-center gap-2"><CheckCircle className="w-5 h-5" /> ✅ Plataforma 100% funcional</p>
                      </div>
                    )}

                    {diag.issues.length > 0 && expanded && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <p className="text-xs font-bold text-foreground">{diag.issues.length} problema(s) ({diag.issues.filter(i => i.severity === "critical").length} críticos)</p>
                        </div>
                        {diag.issues.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity])).map((issue, i) => <IssueCard key={i} issue={issue} />)}
                      </div>
                    )}

                    {diag.issues.length > 0 && !expanded && (
                      <button onClick={() => toggleExpand(p.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" /> Ver {diag.issues.length} problema(s)
                      </button>
                    )}

                    <p className="text-[9px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(result.checked_at).toLocaleString("pt-BR")}</p>
                  </div>
                )}

                {!result && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Clique em "Testar" para diagnóstico profundo V7</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
