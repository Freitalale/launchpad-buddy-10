import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Server, Wifi, Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Zap, Globe, ChevronDown, ChevronUp, Wrench, Database, Shield, ArrowDownCircle,
  ArrowUpCircle, Wallet, Users, FileText, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatforms } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiHealthResult, type DiagnosticError } from "@/hooks/usePlatformApi";

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
}

interface DeepIssue {
  severity: "critical" | "warning" | "info";
  area: string;
  title: string;
  detail: string;
  fix: string;
}

const ErrorCard = ({ error }: { error: DiagnosticError }) => {
  const [expanded, setExpanded] = useState(false);
  const info = errorTypeLabels[error.type] ?? { label: error.type, icon: "❓" };
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{info.icon}</span>
            <div>
              <p className="text-xs font-bold text-destructive">{info.label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">?action={error.endpoint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error.httpStatus && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">HTTP {error.httpStatus}</span>
            )}
            {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>
      </button>
      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2 border-t border-destructive/10 pt-3">
          <div><p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">❌ Erro</p><p className="text-xs text-destructive font-mono">{error.message}</p></div>
          <div><p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">🔍 Causa Provável</p><p className="text-xs text-muted-foreground">{error.cause}</p></div>
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-2">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">💡 Como Resolver</p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{error.solution}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

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
    const issues: DeepIssue[] = [];
    let statsData: any = null;
    let depositCount = 0;
    let saqueCount = 0;
    let saldoTotal = 0;
    let apiVersion: string | null = null;
    let diagData: any = null;

    // 1. Fetch stats
    const statsResult = await api.fetchStats(platform);
    if (statsResult.data) {
      statsData = statsResult.data;
      saldoTotal = statsResult.data.saldo_total ?? 0;

      if (saldoTotal === 0) {
        issues.push({
          severity: "critical", area: "Saldo",
          title: "Saldo total está R$ 0,00",
          detail: `A API retornou saldo_total = 0. Possíveis causas:\n• A tabela de saldo configurada não existe no banco\n• O nome da coluna de saldo está errado no mapeamento\n• A tabela existe mas está vazia\n• O nome da tabela no banco é diferente do configurado (ex: "balances" vs "wallets")`,
          fix: "1) Vá em Configurar → Scanner → Escanear Banco\n2) Encontre a tabela que tem o saldo dos jogadores\n3) Clique 'Usar esta tabela' → Saldo\n4) Verifique o nome da coluna de saldo\n5) Gere o novo api.php v5.6 e suba na hospedagem",
        });
      }
      if ((statsResult.data.total_usuarios ?? 0) === 0) {
        issues.push({
          severity: "warning", area: "Usuários",
          title: "Nenhum usuário encontrado",
          detail: "A API retornou total_usuarios = 0. A tabela de usuários pode estar com nome errado.",
          fix: "Use o Scanner para descobrir o nome correto da tabela de usuários.",
        });
      }
    } else {
      issues.push({
        severity: "critical", area: "Stats",
        title: "Endpoint stats não respondeu",
        detail: statsResult.error?.message ?? "A API não retornou dados de estatísticas.",
        fix: statsResult.error?.solution ?? "Verifique se o api.php está instalado corretamente.",
      });
    }

    // 2. Fetch deposits
    const depsResult = await api.fetchDepositos(platform);
    depositCount = depsResult.data.length;
    if (depsResult.error) {
      issues.push({
        severity: depsResult.data.length === 0 ? "critical" : "warning", area: "Depósitos",
        title: `Erro ao buscar depósitos${depsResult.data.length > 0 ? " (usando cache)" : ""}`,
        detail: depsResult.error.message,
        fix: depsResult.error.solution ?? "Verifique o mapeamento da tabela de depósitos.",
      });
    } else if (depositCount === 0) {
      issues.push({
        severity: "warning", area: "Depósitos",
        title: "Nenhum depósito encontrado (0 registros)",
        detail: "A API retornou array vazio. A tabela de depósitos pode estar com nome errado ou vazia.",
        fix: "1) Escanear banco para verificar nome correto\n2) Verificar se a tabela tem registros\n3) Conferir colunas mapeadas",
      });
    }

    // 3. Fetch saques
    const saqResult = await api.fetchSaques(platform);
    saqueCount = saqResult.data.length;
    if (saqResult.error) {
      issues.push({
        severity: saqResult.data.length === 0 ? "critical" : "warning", area: "Saques",
        title: `Erro ao buscar saques${saqResult.data.length > 0 ? " (usando cache)" : ""}`,
        detail: saqResult.error.message,
        fix: saqResult.error.solution ?? "Verifique o mapeamento da tabela de saques.",
      });
    } else if (saqueCount === 0) {
      issues.push({
        severity: "warning", area: "Saques",
        title: "Nenhum saque encontrado (0 registros)",
        detail: "A API retornou array vazio. A tabela de saques pode estar com nome errado ou vazia.",
        fix: "1) Escanear banco para verificar nome correto\n2) Verificar se a tabela tem registros\n3) Conferir colunas mapeadas",
      });
    }

    // 4. Try diagnostico endpoint for version + table existence
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
            if (info && info.exists === false) {
              issues.push({
                severity: "critical", area: `Tabela ${key}`,
                title: `Tabela "${info.table}" NÃO EXISTE no banco`,
                detail: `A tabela mapeada como "${key}" (${info.table}) não foi encontrada no MySQL. A API não consegue ler dados dessa tabela.`,
                fix: `1) Vá em Configurar → Scanner → Escanear Banco\n2) Procure a tabela correta para "${key}"\n3) Clique "Usar esta tabela"\n4) Gere novo api.php v5.6\n5) Suba na hospedagem`,
              });
            } else if (info && info.exists === true && info.count === 0) {
              issues.push({
                severity: "info", area: `Tabela ${key}`,
                title: `Tabela "${info.table}" existe mas está vazia (0 registros)`,
                detail: `A tabela existe no banco mas não tem nenhum registro.`,
                fix: "Isso pode ser normal se a plataforma é nova. Os dados aparecerão quando houver registros.",
              });
            }
          }
        } catch {
          issues.push({
            severity: "warning", area: "Diagnóstico",
            title: "Endpoint diagnostico retornou JSON inválido",
            detail: "O api.php pode ter erros PHP. Resposta: " + text.slice(0, 200),
            fix: "Atualize o api.php para v5.6 e suba novamente na hospedagem.",
          });
        }
      }
    } catch {
      // diagnostico not available
    }

    // 5. Check version
    if (apiVersion && !apiVersion.startsWith("5.6")) {
      issues.push({
        severity: "warning", area: "Versão API",
        title: `API desatualizada (v${apiVersion})`,
        detail: `A versão atual é v5.6.0 com mapeamento direto. Versões antigas podem ter fallbacks que causam dados errados.`,
        fix: "Vá em Configurar → aba Gerar → copie o novo api.php v5.6 → suba na hospedagem.",
      });
    }

    // 6. Config checks
    if (!platform.url) {
      issues.push({ severity: "critical", area: "Configuração", title: "URL não configurada", detail: "A plataforma não tem URL definida.", fix: "Vá em Configurar → API → defina a URL da plataforma." });
    }
    if (!platform.db_host) {
      issues.push({ severity: "warning", area: "Configuração", title: "Credenciais do banco não configuradas", detail: "Host/User/Pass/DB não preenchidos. O Scanner e Gerar Arquivos não funcionarão corretamente.", fix: "Vá em Configurar → Banco → preencha as credenciais." });
    }
    if (platform.tabela_saldo === "wallets" && saldoTotal === 0) {
      issues.push({
        severity: "warning", area: "Mapeamento",
        title: "Tabela de saldo usando valor padrão 'wallets'",
        detail: "A tabela de saldo está configurada como 'wallets' (padrão). Se a tabela real tem outro nome, o saldo será sempre R$ 0,00.",
        fix: "Use o Scanner para encontrar o nome correto da tabela de saldo no seu banco.",
      });
    }
    if (platform.tabela_saques === "withdrawals" && saqueCount === 0) {
      issues.push({
        severity: "warning", area: "Mapeamento",
        title: "Tabela de saques usando valor padrão 'withdrawals'",
        detail: "A tabela de saques está configurada como 'withdrawals' (padrão). Se a tabela real tem outro nome, os saques não aparecerão.",
        fix: "Use o Scanner para encontrar o nome correto da tabela de saques.",
      });
    }

    // Add health-level errors
    for (const err of healthResult.errors) {
      // Don't duplicate issues
      if (!issues.some(i => i.title.includes(err.endpoint))) {
        issues.push({
          severity: "critical", area: `Endpoint ${err.endpoint}`,
          title: err.message,
          detail: err.cause,
          fix: err.solution,
        });
      }
    }

    return {
      platform_id: platform.id,
      healthResult,
      statsData,
      depositCount,
      saqueCount,
      saldoTotal,
      issues,
      apiVersion,
      diagData,
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
    // Auto-expand all
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

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">
            Diagnóstico <span className="gradient-text">Profundo v5.6</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Testa TODOS os endpoints, verifica dados reais, detecta problemas de mapeamento</p>
        </div>
        <Button onClick={handleCheckAll} disabled={checking || platforms.length === 0} className="gap-2 h-9 text-sm"
          style={{ background: "var(--gradient-primary)" }}>
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {checking ? "Analisando profundamente..." : "🔬 Diagnóstico Completo"}
        </Button>
      </motion.div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Online", value: online, color: "text-accent", border: "border-accent/30", icon: Wifi },
            { label: "Instável", value: unstable, color: "text-amber-400", border: "border-amber-400/30", icon: AlertTriangle },
            { label: "Offline", value: offline + errors, color: "text-destructive", border: "border-destructive/30", icon: Server },
            { label: "Problemas", value: totalIssues, color: totalIssues > 0 ? "text-destructive" : "text-accent", border: totalIssues > 0 ? "border-destructive/30" : "border-accent/30", icon: XCircle },
            { label: "Críticos", value: criticalIssues, color: criticalIssues > 0 ? "text-destructive" : "text-accent", border: criticalIssues > 0 ? "border-destructive/30" : "border-accent/30", icon: AlertTriangle },
            { label: "Latência", value: `${avgLatency}ms`, color: avgLatency > 5000 ? "text-destructive" : avgLatency > 2000 ? "text-amber-400" : "text-primary", border: "border-primary/30", icon: Clock },
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

      {/* Platform Deep Diagnostics */}
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
              <motion.div key={p.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.04 }}
                className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>

                {/* Header */}
                <div className="p-4 flex items-center gap-4 border-b border-border/30">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ background: `${p.cor ?? "#00c4ff"}15` }}>
                    {p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/"))
                      ? <img src={p.logo} className="w-full h-full object-cover" alt="" />
                      : <span className="text-lg">{p.logo}</span>}
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
                      <span className={`text-xs font-mono px-2 py-1 rounded-md border ${sc.bg} ${sc.color} ${sc.border}`}>
                        {result.latency_ms}ms
                      </span>
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

                {/* Deep Diagnostic Content */}
                {result && diag && (
                  <div className="p-4 space-y-4">
                    {/* Endpoint Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(["health", "stats", "depositos", "saques"] as const).map(ep => {
                        const d = result.endpoints[ep];
                        return (
                          <div key={ep} className={`flex items-center gap-2 p-2.5 rounded-lg border ${d.ok ? "bg-accent/5 border-accent/20" : "bg-destructive/5 border-destructive/20"}`}>
                            {d.ok ? <CheckCircle className="w-4 h-4 text-accent" /> : <XCircle className="w-4 h-4 text-destructive" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-foreground">?action={ep}</p>
                              {d.ok && d.latency_ms !== undefined && (
                                <p className="text-[9px] text-muted-foreground">{d.latency_ms}ms{d.count !== undefined ? ` · ${d.count} reg` : ""}</p>
                              )}
                              {!d.ok && <p className="text-[9px] text-destructive truncate">{d.error}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Real Data Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          <p className="text-[10px] font-bold text-foreground">Usuários</p>
                        </div>
                        <p className={`text-lg font-black ${diag.statsData?.total_usuarios > 0 ? "text-primary" : "text-destructive"}`}>
                          {diag.statsData?.total_usuarios ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Wallet className="w-3.5 h-3.5 text-chart-4" />
                          <p className="text-[10px] font-bold text-foreground">Saldo Total</p>
                        </div>
                        <p className={`text-lg font-black ${diag.saldoTotal > 0 ? "text-chart-4" : "text-destructive"}`}>
                          R$ {diag.saldoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        {diag.saldoTotal === 0 && <p className="text-[9px] text-destructive mt-0.5">⚠️ Provável erro de mapeamento</p>}
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowDownCircle className="w-3.5 h-3.5 text-accent" />
                          <p className="text-[10px] font-bold text-foreground">Depósitos</p>
                        </div>
                        <p className={`text-lg font-black ${diag.depositCount > 0 ? "text-accent" : "text-amber-400"}`}>
                          {diag.depositCount}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-[10px] font-bold text-foreground">Saques</p>
                        </div>
                        <p className={`text-lg font-black ${diag.saqueCount > 0 ? "text-amber-400" : "text-destructive"}`}>
                          {diag.saqueCount}
                        </p>
                        {diag.saqueCount === 0 && <p className="text-[9px] text-destructive mt-0.5">⚠️ Verifique mapeamento</p>}
                      </div>
                    </div>

                    {/* API Version & Config */}
                    <div className="flex flex-wrap gap-2">
                      {diag.apiVersion && (
                        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${
                          diag.apiVersion.startsWith("5.6") ? "border-accent/30 bg-accent/10 text-accent" : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                        }`}>
                          API v{diag.apiVersion}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-2 py-1 rounded border ${
                        p.db_host ? "border-accent/30 bg-accent/10 text-accent" : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}>
                        {p.db_host ? "✅ DB Config" : "❌ DB Config"}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-1 rounded border border-border/30 bg-secondary/50 text-muted-foreground">
                        Tabelas: {p.tabela_usuarios}/{p.tabela_depositos}/{p.tabela_saques}/{p.tabela_saldo}
                      </span>
                    </div>

                    {/* All OK */}
                    {diag.issues.length === 0 && (
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                        <p className="text-sm font-bold text-accent flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          ✅ Plataforma 100% funcional — todos os dados retornando corretamente
                        </p>
                      </div>
                    )}

                    {/* Issues List */}
                    {diag.issues.length > 0 && expanded && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <p className="text-xs font-bold text-foreground">
                            {diag.issues.length} {diag.issues.length === 1 ? "problema" : "problemas"} encontrado{diag.issues.length > 1 ? "s" : ""}
                            {" "}({diag.issues.filter(i => i.severity === "critical").length} críticos)
                          </p>
                        </div>
                        {diag.issues
                          .sort((a, b) => {
                            const order = { critical: 0, warning: 1, info: 2 };
                            return order[a.severity] - order[b.severity];
                          })
                          .map((issue, i) => (
                            <IssueCard key={i} issue={issue} />
                          ))}
                      </div>
                    )}

                    {diag.issues.length > 0 && !expanded && (
                      <button onClick={() => toggleExpand(p.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />
                        Ver {diag.issues.length} {diag.issues.length === 1 ? "problema" : "problemas"} ({diag.issues.filter(i => i.severity === "critical").length} críticos)
                      </button>
                    )}

                    <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Verificado em {new Date(result.checked_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                {!result && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Clique em "Testar" para diagnóstico profundo com dados reais</p>
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
