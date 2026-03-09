import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Search, RefreshCw, Filter, Trash2, Eye, CheckCircle, XCircle, Clock, Server, Zap, Database, Globe, Wifi, Bug, ChevronDown, ChevronRight, RotateCcw, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useLogs, useCreateLog } from "@/hooks/useLogs";
import { useCreateNotification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PlatformError {
  id: string;
  timestamp: string;
  platform_id: string;
  platform_name: string;
  type: ErrorType;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: "api" | "gateway" | "database" | "sync" | "webhook" | "interface" | "notification" | "deposit" | "withdraw";
  message: string;
  details: string;
  endpoint?: string;
  http_status?: number;
  resolved: boolean;
  resolved_at?: string;
  auto_fix_available: boolean;
  fix_suggestion: string;
}

type ErrorType = "API_OFFLINE" | "TIMEOUT" | "ENDPOINT_NOT_FOUND" | "INVALID_JSON" | "CORS_ERROR" | "DB_DISCONNECTED" | "AUTH_ERROR" | "GATEWAY_ERROR" | "SYNC_FAILURE" | "WEBHOOK_FAILURE" | "DUPLICATE" | "MISSING_CONFIG" | "STATUS_MISMATCH" | "BALANCE_ERROR" | "NETWORK_ERROR" | "PHP_ERROR" | "UNKNOWN";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "Crítico" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Alto" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Médio" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Baixo" },
  info: { color: "text-muted-foreground", bg: "bg-secondary", border: "border-border/50", label: "Info" },
};

const SOURCE_ICONS: Record<string, any> = {
  api: Globe, gateway: Zap, database: Database, sync: RefreshCw, webhook: Wifi, interface: Bug, notification: AlertTriangle, deposit: CheckCircle, withdraw: XCircle,
};

const ErrorPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: platforms = [] } = usePlatforms();
  const { data: logs = [] } = useLogs();
  const createLog = useCreateLog();
  const createNotification = useCreateNotification();

  const [errors, setErrors] = useState<PlatformError[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterResolved, setFilterResolved] = useState("unresolved");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const classifyLogError = useCallback((log: any): PlatformError | null => {
    if (log.tipo !== "error" && log.tipo !== "warning" && !log.acao?.toLowerCase().includes("erro")) return null;
    const msg = log.detalhes || log.acao || "";
    let type: ErrorType = "UNKNOWN";
    let severity: PlatformError["severity"] = "medium";
    let source: PlatformError["source"] = "sync";
    let fix = "Verifique os detalhes do erro.";

    if (msg.includes("404")) { type = "ENDPOINT_NOT_FOUND"; severity = "high"; source = "api"; fix = "Atualize o api.php para v7.0 na hospedagem."; }
    else if (msg.includes("CORS") || msg.includes("Failed to fetch")) { type = "CORS_ERROR"; severity = "high"; source = "api"; fix = "Adicione Access-Control-Allow-Origin: * no api.php."; }
    else if (msg.includes("timeout") || msg.includes("Timeout")) { type = "TIMEOUT"; severity = "medium"; source = "api"; fix = "Servidor lento. Verifique a hospedagem."; }
    else if (msg.includes("offline") || msg.includes("Offline")) { type = "API_OFFLINE"; severity = "critical"; source = "api"; fix = "O servidor está fora do ar."; }
    else if (msg.includes("gateway") || msg.includes("Gateway")) { type = "GATEWAY_ERROR"; severity = "high"; source = "gateway"; fix = "Verifique as credenciais do gateway."; }
    else if (msg.includes("JSON") || msg.includes("json")) { type = "INVALID_JSON"; severity = "medium"; source = "api"; fix = "api.php retorna erros PHP antes do JSON."; }
    else if (msg.includes("duplica")) { type = "DUPLICATE"; severity = "low"; source = "sync"; fix = "Deduplicação automática já trata."; }
    else if (msg.includes("saldo") || msg.includes("balance")) { type = "BALANCE_ERROR"; severity = "medium"; source = "database"; fix = "Verifique a coluna de saldo no mapeamento."; }
    else if (msg.includes("webhook")) { type = "WEBHOOK_FAILURE"; severity = "medium"; source = "webhook"; fix = "Verifique a URL e credenciais do webhook."; }
    else if (msg.includes("PHP") || msg.includes("Exception")) { type = "PHP_ERROR"; severity = "high"; source = "api"; fix = "Erro interno PHP. Verifique os logs do servidor."; }

    return {
      id: log.id, timestamp: log.created_at, platform_id: log.plataforma_id || "",
      platform_name: log.plataforma_nome || "Sistema", type, severity, source,
      message: log.acao || "Erro desconhecido", details: msg, resolved: false,
      auto_fix_available: type === "ENDPOINT_NOT_FOUND" || type === "CORS_ERROR",
      fix_suggestion: fix,
    };
  }, []);

  const fetchRemoteErrors = useCallback(async () => {
    setLoading(true);
    const remoteErrors: PlatformError[] = [];

    for (const p of platforms) {
      if (!p.url) continue;
      const baseUrl = p.url.replace(/\/$/, "");
      const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${apiUrl}?action=error_log`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.errors?.length) {
            json.errors.forEach((e: any, i: number) => {
              remoteErrors.push({
                id: `remote-${p.id}-${i}`, timestamp: e.time || new Date().toISOString(),
                platform_id: p.id, platform_name: p.nome, type: "PHP_ERROR" as ErrorType,
                severity: e.error?.includes("Fatal") ? "critical" : "high",
                source: "api", message: `PHP: ${e.error?.slice(0, 100)}`,
                details: `Arquivo: ${e.file || "?"}, Linha: ${e.line || "?"}\nAction: ${e.action || "?"}\n\n${e.error}`,
                endpoint: e.action, resolved: false, auto_fix_available: false,
                fix_suggestion: "Verifique o arquivo PHP no servidor.",
              });
            });
          }
        }
      } catch { /* skip unreachable platforms */ }
    }

    const logErrors = logs.filter(l => l.tipo === "error" || l.tipo === "warning").map(classifyLogError).filter(Boolean) as PlatformError[];
    setErrors([...remoteErrors, ...logErrors].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setLoading(false);
  }, [platforms, logs, classifyLogError]);

  useEffect(() => { fetchRemoteErrors(); }, [platforms.length, logs.length]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRemoteErrors, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRemoteErrors]);

  const resolveError = async (errorId: string) => {
    setErrors(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true, resolved_at: new Date().toISOString() } : e));
    toast({ title: "✅ Erro marcado como resolvido" });
  };

  const revalidateError = async (error: PlatformError) => {
    const platform = platforms.find(p => p.id === error.platform_id);
    if (!platform?.url) { toast({ title: "Plataforma sem URL configurada", variant: "destructive" }); return; }
    const baseUrl = platform.url.replace(/\/$/, "");
    const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
    try {
      const res = await fetch(`${apiUrl}?action=health`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          resolveError(error.id);
          toast({ title: "✅ Revalidado!", description: `${platform.nome} está online agora.` });
          return;
        }
      }
      toast({ title: "❌ Ainda com erro", description: "O problema persiste.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "❌ Revalidação falhou", description: e.message, variant: "destructive" });
    }
  };

  const filteredErrors = errors.filter(e => {
    if (filterPlatform !== "all" && e.platform_id !== filterPlatform) return false;
    if (filterSeverity !== "all" && e.severity !== filterSeverity) return false;
    if (filterSource !== "all" && e.source !== filterSource) return false;
    if (filterResolved === "unresolved" && e.resolved) return false;
    if (filterResolved === "resolved" && !e.resolved) return false;
    if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase()) && !e.details.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: errors.length,
    critical: errors.filter(e => e.severity === "critical" && !e.resolved).length,
    unresolved: errors.filter(e => !e.resolved).length,
    today: errors.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight gradient-text">🛡️ Painel de Erros</h1>
          <p className="text-sm text-muted-foreground">Monitoramento completo de erros do sistema, APIs, gateways e banco de dados</p>
        </div>
        <div className="flex gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button onClick={fetchRemoteErrors} disabled={loading} size="sm" className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total de Erros", value: stats.total, icon: Bug, color: "text-muted-foreground" },
          { label: "Críticos", value: stats.critical, icon: AlertTriangle, color: "text-red-400" },
          { label: "Não Resolvidos", value: stats.unresolved, icon: Clock, color: "text-orange-400" },
          { label: "Hoje", value: stats.today, icon: Calendar, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar erros..."
            className="pl-9 h-9 bg-secondary" />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[160px] h-9 bg-secondary"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[130px] h-9 bg-secondary"><SelectValue placeholder="Severidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[130px] h-9 bg-secondary"><SelectValue placeholder="Origem" /></SelectTrigger>
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
          <SelectTrigger className="w-[150px] h-9 bg-secondary"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unresolved">Não resolvidos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {filteredErrors.length === 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <CheckCircle className="w-12 h-12 text-neon-green mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground">Nenhum erro encontrado!</p>
            <p className="text-sm text-muted-foreground">Seu sistema está funcionando normalmente.</p>
          </div>
        )}

        {filteredErrors.map((error) => {
          const sev = SEVERITY_CONFIG[error.severity];
          const SourceIcon = SOURCE_ICONS[error.source] || Bug;
          const isExpanded = expandedError === error.id;

          return (
            <motion.div key={error.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`rounded-xl border ${sev.border} ${sev.bg} p-4 transition-all ${error.resolved ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <SourceIcon className={`w-4 h-4 ${sev.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={`text-[9px] ${sev.color} border-current`}>{sev.label}</Badge>
                    <Badge variant="outline" className="text-[9px]">{error.source.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-[9px]">{error.type}</Badge>
                    {error.platform_name && <Badge variant="secondary" className="text-[9px]">{error.platform_name}</Badge>}
                    {error.resolved && <Badge className="text-[9px] bg-neon-green/20 text-neon-green border-neon-green/30">Resolvido</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{error.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(error.timestamp).toLocaleString("pt-BR")}
                    {error.http_status && ` · HTTP ${error.http_status}`}
                    {error.endpoint && ` · ${error.endpoint}`}
                  </p>

                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      className="mt-3 space-y-3">
                      <div className="rounded-lg bg-background/50 border border-border/50 p-3">
                        <p className="text-[10px] font-bold text-foreground mb-1">📋 Detalhes</p>
                        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">{error.details}</pre>
                      </div>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-[10px] font-bold text-foreground mb-1">💡 Sugestão de Correção</p>
                        <p className="text-[10px] text-muted-foreground">{error.fix_suggestion}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedError(isExpanded ? null : error.id)}>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </Button>
                  {!error.resolved && (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={() => revalidateError(error)} title="Revalidar">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-neon-green" onClick={() => resolveError(error.id)} title="Resolver">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    navigator.clipboard.writeText(`${error.type}: ${error.message}\n${error.details}`);
                    toast({ title: "Copiado!" });
                  }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Missing import workaround
const Calendar = Clock;

export default ErrorPanel;
