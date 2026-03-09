import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Search, RefreshCw, CheckCircle, XCircle, Clock, Server, Zap,
  Database, Globe, Wifi, Bug, ChevronDown, ChevronRight, RotateCcw, Copy,
  Terminal, Code, FileWarning, Shield, Filter, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useLogs } from "@/hooks/useLogs";
import { useAuth } from "@/contexts/AuthContext";

interface PlatformError {
  id: string;
  timestamp: string;
  platform_id: string;
  platform_name: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  message: string;
  details: string;
  stack_trace?: string;
  endpoint?: string;
  http_status?: number;
  resolved: boolean;
  error_code?: string;
  fix_steps: string[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  low: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  info: "text-muted-foreground border-border/50 bg-secondary",
};

const ERROR_CODES: Record<string, { label: string; fix: string[] }> = {
  ERR_API_OFFLINE: {
    label: "API Offline",
    fix: ["Verifique se o servidor está ligado", "Acesse o painel da hospedagem e reinicie", "Teste com: curl -I https://sua-url/api.php"],
  },
  ERR_TIMEOUT: {
    label: "Timeout",
    fix: ["Servidor muito lento ou sem resposta", "Aumente o timeout no php.ini: max_execution_time = 60", "Verifique a carga do servidor"],
  },
  ERR_404: {
    label: "Endpoint não encontrado",
    fix: ["O arquivo api.php não existe na URL", "Suba o api.php v7.0 via FTP", "Verifique o caminho: /public_html/api.php"],
  },
  ERR_CORS: {
    label: "Erro de CORS",
    fix: ["Adicione no topo do api.php:", "header('Access-Control-Allow-Origin: *');", "header('Access-Control-Allow-Methods: GET, POST, OPTIONS');"],
  },
  ERR_INVALID_JSON: {
    label: "JSON inválido",
    fix: ["O api.php está retornando HTML/texto antes do JSON", "Remova qualquer echo, print ou espaço antes do <?php", "Adicione header('Content-Type: application/json'); no início"],
  },
  ERR_DB_CONN: {
    label: "Erro de conexão ao banco",
    fix: ["Verifique host, user, pass e db_name nas configs", "Teste conexão: mysql -h HOST -u USER -p DB_NAME", "O servidor MySQL pode estar offline"],
  },
  ERR_AUTH: {
    label: "Erro de autenticação",
    fix: ["API key inválida ou ausente", "Regenere a API key na configuração", "Verifique se a chave no api.php bate com o painel"],
  },
  ERR_GATEWAY: {
    label: "Erro de Gateway",
    fix: ["Credenciais do gateway incorretas", "Verifique a URL do webhook do gateway", "Teste o endpoint de pagamento manualmente"],
  },
  ERR_WEBHOOK: {
    label: "Webhook falhou",
    fix: ["URL do webhook pode estar incorreta", "Verifique se o serviço de destino está online", "Teste com: curl -X POST URL -d '{}'"],
  },
  ERR_DUPLICATE: {
    label: "Duplicação detectada",
    fix: ["O sistema detectou dados duplicados", "Verifique unique constraints no banco", "A deduplicação automática deve tratar isso"],
  },
  ERR_PHP: {
    label: "Erro PHP interno",
    fix: ["Verifique o error_log do servidor", "Habilite display_errors no php.ini para debug", "Corrija o erro no código PHP indicado"],
  },
  ERR_BALANCE: {
    label: "Erro de saldo",
    fix: ["Verifique a coluna de saldo no mapeamento", "A tabela de wallets/saldo pode não existir", "Teste: SELECT balance FROM wallets LIMIT 1"],
  },
  ERR_UNKNOWN: {
    label: "Erro desconhecido",
    fix: ["Verifique os logs do servidor", "Revalide a plataforma manualmente", "Entre em contato com o suporte técnico"],
  },
};

const classifyError = (msg: string): { code: string; severity: PlatformError["severity"]; source: string } => {
  const m = msg.toLowerCase();
  if (m.includes("404") || m.includes("not found")) return { code: "ERR_404", severity: "high", source: "api" };
  if (m.includes("cors") || m.includes("failed to fetch") || m.includes("network")) return { code: "ERR_CORS", severity: "high", source: "api" };
  if (m.includes("timeout") || m.includes("aborted")) return { code: "ERR_TIMEOUT", severity: "medium", source: "api" };
  if (m.includes("offline")) return { code: "ERR_API_OFFLINE", severity: "critical", source: "api" };
  if (m.includes("gateway") || m.includes("pagamento")) return { code: "ERR_GATEWAY", severity: "high", source: "gateway" };
  if (m.includes("json") || m.includes("unexpected token")) return { code: "ERR_INVALID_JSON", severity: "medium", source: "api" };
  if (m.includes("duplica")) return { code: "ERR_DUPLICATE", severity: "low", source: "sync" };
  if (m.includes("saldo") || m.includes("balance")) return { code: "ERR_BALANCE", severity: "medium", source: "database" };
  if (m.includes("webhook")) return { code: "ERR_WEBHOOK", severity: "medium", source: "webhook" };
  if (m.includes("php") || m.includes("exception") || m.includes("fatal")) return { code: "ERR_PHP", severity: "high", source: "api" };
  if (m.includes("auth") || m.includes("unauthorized") || m.includes("401") || m.includes("403")) return { code: "ERR_AUTH", severity: "high", source: "api" };
  if (m.includes("mysql") || m.includes("connect") || m.includes("pdo")) return { code: "ERR_DB_CONN", severity: "critical", source: "database" };
  return { code: "ERR_UNKNOWN", severity: "medium", source: "sync" };
};

const SOURCE_ICONS: Record<string, any> = {
  api: Globe, gateway: Zap, database: Database, sync: RefreshCw, webhook: Wifi, interface: Bug,
};

const ErrorPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: platforms = [] } = usePlatforms();
  const { data: logs = [] } = useLogs();

  const [errors, setErrors] = useState<PlatformError[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterResolved, setFilterResolved] = useState("unresolved");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("errors");

  const fetchRemoteErrors = useCallback(async () => {
    setLoading(true);
    const all: PlatformError[] = [];

    // Remote errors from platforms
    for (const p of platforms) {
      if (!p.url) continue;
      const baseUrl = p.url.replace(/\/$/, "");
      const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${apiUrl}?action=error_log`, { signal: controller.signal });
        clearTimeout(t);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.errors?.length) {
            json.errors.forEach((e: any, i: number) => {
              const errMsg = e.error || e.message || "Unknown";
              const cls = classifyError(errMsg);
              all.push({
                id: `remote-${p.id}-${i}-${Date.now()}`,
                timestamp: e.time || new Date().toISOString(),
                platform_id: p.id,
                platform_name: p.nome,
                type: cls.code,
                severity: e.error?.includes("Fatal") ? "critical" : cls.severity,
                source: cls.source,
                message: errMsg.slice(0, 200),
                details: `Arquivo: ${e.file || "N/A"}\nLinha: ${e.line || "N/A"}\nAction: ${e.action || "N/A"}`,
                stack_trace: e.trace || e.error,
                endpoint: e.action,
                http_status: e.http_status,
                resolved: false,
                error_code: cls.code,
                fix_steps: ERROR_CODES[cls.code]?.fix || ERROR_CODES.ERR_UNKNOWN.fix,
              });
            });
          }
        } else {
          all.push({
            id: `http-${p.id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            platform_id: p.id,
            platform_name: p.nome,
            type: res.status === 404 ? "ERR_404" : "ERR_API_OFFLINE",
            severity: "high",
            source: "api",
            message: `HTTP ${res.status}: ${res.statusText}`,
            details: `URL: ${apiUrl}?action=error_log\nHTTP Status: ${res.status}`,
            http_status: res.status,
            resolved: false,
            error_code: res.status === 404 ? "ERR_404" : "ERR_API_OFFLINE",
            fix_steps: ERROR_CODES[res.status === 404 ? "ERR_404" : "ERR_API_OFFLINE"]?.fix || [],
          });
        }
      } catch (err: any) {
        const cls = classifyError(err.message || "network");
        all.push({
          id: `net-${p.id}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          platform_id: p.id,
          platform_name: p.nome,
          type: cls.code,
          severity: cls.severity,
          source: "api",
          message: `Conexão falhou: ${err.message || "Network error"}`,
          details: `URL: ${p.url}\nErro: ${err.message}`,
          resolved: false,
          error_code: cls.code,
          fix_steps: ERROR_CODES[cls.code]?.fix || ERROR_CODES.ERR_UNKNOWN.fix,
        });
      }
    }

    // Logs from database
    logs.filter(l => l.tipo === "error" || l.tipo === "warning").forEach(log => {
      const msg = log.detalhes || log.acao || "";
      const cls = classifyError(msg);
      all.push({
        id: log.id,
        timestamp: log.created_at,
        platform_id: log.plataforma_id || "",
        platform_name: log.plataforma_nome || "Sistema",
        type: cls.code,
        severity: cls.severity,
        source: cls.source,
        message: log.acao || "Erro",
        details: msg,
        resolved: false,
        error_code: cls.code,
        fix_steps: ERROR_CODES[cls.code]?.fix || ERROR_CODES.ERR_UNKNOWN.fix,
      });
    });

    setErrors(all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setLoading(false);
  }, [platforms, logs]);

  useEffect(() => { if (platforms.length > 0) fetchRemoteErrors(); }, [platforms.length, logs.length]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRemoteErrors, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRemoteErrors]);

  const resolveError = (id: string) => {
    setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
    toast({ title: "✅ Marcado como resolvido" });
  };

  const revalidateError = async (error: PlatformError) => {
    const p = platforms.find(pl => pl.id === error.platform_id);
    if (!p?.url) return;
    const baseUrl = p.url.replace(/\/$/, "");
    const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
    try {
      const res = await fetch(`${apiUrl}?action=health`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) { resolveError(error.id); toast({ title: "✅ Plataforma online!" }); return; }
      }
      toast({ title: "❌ Problema persiste", variant: "destructive" });
    } catch {
      toast({ title: "❌ Ainda offline", variant: "destructive" });
    }
  };

  const filteredErrors = errors.filter(e => {
    if (filterPlatform !== "all" && e.platform_id !== filterPlatform) return false;
    if (filterSeverity !== "all" && e.severity !== filterSeverity) return false;
    if (filterSource !== "all" && e.source !== filterSource) return false;
    if (filterResolved === "unresolved" && e.resolved) return false;
    if (filterResolved === "resolved" && !e.resolved) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.message.toLowerCase().includes(q) || e.details.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || (e.error_code?.toLowerCase().includes(q));
    }
    return true;
  });

  const stats = {
    total: errors.length,
    critical: errors.filter(e => e.severity === "critical" && !e.resolved).length,
    unresolved: errors.filter(e => !e.resolved).length,
    today: errors.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
  };

  const errorsByCode = errors.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight gradient-text">🛡️ Painel de Erros</h1>
          <p className="text-sm text-muted-foreground font-mono">Developer Console — Monitoramento em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto 60s" : "Manual"}
          </Button>
          <Button onClick={fetchRemoteErrors} disabled={loading} size="sm" className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Scan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Erros", value: stats.total, icon: Bug, color: "text-muted-foreground" },
          { label: "Críticos", value: stats.critical, icon: AlertTriangle, color: "text-destructive" },
          { label: "Não Resolvidos", value: stats.unresolved, icon: Clock, color: "text-chart-3" },
          { label: "Hoje", value: stats.today, icon: Terminal, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] text-muted-foreground font-mono">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="errors" className="gap-1.5 text-xs"><Terminal className="w-3.5 h-3.5" /> Erros</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><Code className="w-3.5 h-3.5" /> Logs</TabsTrigger>
          <TabsTrigger value="codes" className="gap-1.5 text-xs"><FileWarning className="w-3.5 h-3.5" /> Códigos</TabsTrigger>
        </TabsList>

        {/* === ERRORS TAB === */}
        <TabsContent value="errors" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar erro, código, mensagem..."
                className="pl-9 h-9 bg-secondary font-mono text-xs" />
            </div>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[150px] h-9 bg-secondary text-xs"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[120px] h-9 bg-secondary text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[120px] h-9 bg-secondary text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="gateway">Gateway</SelectItem>
                <SelectItem value="database">Banco</SelectItem>
                <SelectItem value="sync">Sync</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterResolved} onValueChange={setFilterResolved}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unresolved">Abertos</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error List */}
          <div className="space-y-2">
            {filteredErrors.length === 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
                <CheckCircle className="w-12 h-12 text-chart-2 mx-auto mb-3" />
                <p className="text-lg font-bold text-foreground font-mono">0 errors</p>
                <p className="text-sm text-muted-foreground">Sistema operando normalmente.</p>
              </div>
            )}

            {filteredErrors.map(error => {
              const sevClass = SEVERITY_COLORS[error.severity];
              const SourceIcon = SOURCE_ICONS[error.source] || Bug;
              const isExpanded = expandedError === error.id;
              const codeInfo = ERROR_CODES[error.type] || ERROR_CODES.ERR_UNKNOWN;

              return (
                <motion.div key={error.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`rounded-xl border ${sevClass} p-3 transition-all ${error.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <SourceIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[8px] font-mono">{error.type}</Badge>
                        <Badge variant="outline" className="text-[8px]">{error.source.toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-[8px]">{error.severity.toUpperCase()}</Badge>
                        {error.platform_name && <Badge variant="secondary" className="text-[8px]">{error.platform_name}</Badge>}
                        {error.http_status && <Badge variant="outline" className="text-[8px] font-mono">HTTP {error.http_status}</Badge>}
                      </div>
                      <p className="text-xs font-mono font-semibold text-foreground">{error.message}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {new Date(error.timestamp).toLocaleString("pt-BR")}
                        {error.endpoint && ` · ?action=${error.endpoint}`}
                      </p>

                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 space-y-3">
                          {/* Details */}
                          <div className="rounded-lg bg-background border border-border/50 p-3">
                            <p className="text-[10px] font-bold text-foreground font-mono mb-1">📋 DETALHES</p>
                            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">{error.details}</pre>
                          </div>

                          {/* Stack trace */}
                          {error.stack_trace && (
                            <div className="rounded-lg bg-background border border-border/50 p-3">
                              <p className="text-[10px] font-bold text-foreground font-mono mb-1">🔍 STACK TRACE</p>
                              <pre className="text-[10px] font-mono text-destructive/80 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{error.stack_trace}</pre>
                            </div>
                          )}

                          {/* Fix steps */}
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                            <p className="text-[10px] font-bold text-foreground font-mono mb-2">🔧 COMO RESOLVER — {codeInfo.label}</p>
                            <ol className="space-y-1">
                              {error.fix_steps.map((step, si) => (
                                <li key={si} className="text-[10px] font-mono text-muted-foreground flex gap-2">
                                  <span className="text-primary font-bold">{si + 1}.</span>
                                  <code className="bg-secondary px-1 rounded break-all">{step}</code>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedError(isExpanded ? null : error.id)}>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </Button>
                      {!error.resolved && (
                        <>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary" onClick={() => revalidateError(error)} title="Revalidar">
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-chart-2" onClick={() => resolveError(error.id)} title="Resolver">
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                        navigator.clipboard.writeText(`[${error.type}] ${error.message}\n${error.details}\n\nFix:\n${error.fix_steps.join("\n")}`);
                        toast({ title: "Copiado!" });
                      }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* === LOGS TAB === */}
        <TabsContent value="logs" className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-secondary/50 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono font-bold text-foreground">System Logs</p>
              <Badge variant="secondary" className="text-[9px] ml-auto">{logs.length} registros</Badge>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {logs.slice(0, 100).map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 border-b border-border/20 hover:bg-secondary/20 transition-colors font-mono">
                  <Badge variant={log.tipo === "error" ? "destructive" : log.tipo === "warning" ? "outline" : "secondary"} className="text-[8px] mt-0.5 flex-shrink-0">
                    {log.tipo?.toUpperCase() || "INFO"}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{log.acao}</p>
                    {log.detalhes && <p className="text-[10px] text-muted-foreground mt-0.5 break-all">{log.detalhes}</p>}
                    <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
                      <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                      {log.plataforma_nome && <span>📌 {log.plataforma_nome}</span>}
                      {log.usuario && <span>👤 {log.usuario}</span>}
                      {log.valor && <span>💰 R$ {Number(log.valor).toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground font-mono">Nenhum log registrado.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* === ERROR CODES TAB === */}
        <TabsContent value="codes" className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-sm font-bold font-mono text-foreground mb-4">📖 Referência de Códigos de Erro</p>
            <div className="space-y-3">
              {Object.entries(ERROR_CODES).map(([code, info]) => {
                const count = errorsByCode[code] || 0;
                return (
                  <div key={code} className="rounded-lg border border-border/30 bg-secondary/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{code}</code>
                        <p className="text-xs font-semibold text-foreground">{info.label}</p>
                      </div>
                      {count > 0 && <Badge variant="destructive" className="text-[9px]">{count} ocorrência{count > 1 ? "s" : ""}</Badge>}
                    </div>
                    <ol className="space-y-1">
                      {info.fix.map((step, si) => (
                        <li key={si} className="text-[10px] font-mono text-muted-foreground flex gap-2">
                          <span className="text-chart-2 font-bold">{si + 1}.</span>
                          <code className="bg-background px-1 rounded">{step}</code>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ErrorPanel;
