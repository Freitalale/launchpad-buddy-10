import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, Server, Wifi, Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Zap, Globe, ArrowRight, ChevronDown, ChevronUp, Wrench, Database, Shield
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
          <div>
            <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">❌ Erro</p>
            <p className="text-xs text-destructive font-mono">{error.message}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">🔍 Causa Provável</p>
            <p className="text-xs text-muted-foreground">{error.cause}</p>
          </div>
          <div className="rounded-lg bg-accent/5 border border-accent/20 p-2">
            <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">💡 Como Resolver</p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{error.solution}</p>
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
  const [checking, setChecking] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());

  const online = results.filter(r => r.status === "online").length;
  const unstable = results.filter(r => r.status === "unstable").length;
  const errors = results.filter(r => r.status === "error").length;
  const offline = results.filter(r => r.status === "offline").length;
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const avgLatency = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / results.length) : 0;

  const handleCheckAll = async () => {
    setChecking(true);
    const all = await Promise.all(platforms.map(p => api.checkHealth(p)));
    setResults(all);
    setChecking(false);
  };

  const handleCheckOne = async (platformId: string) => {
    const p = platforms.find(pl => pl.id === platformId);
    if (!p) return;
    const result = await api.checkHealth(p);
    setResults(prev => {
      const filtered = prev.filter(r => r.platform_id !== platformId);
      return [...filtered, result];
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const statusIcon = (ok: boolean) => ok
    ? <CheckCircle className="w-4 h-4 text-accent" />
    : <XCircle className="w-4 h-4 text-destructive" />;

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
            Diagnóstico do <span className="gradient-text">Sistema</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monitoramento inteligente com diagnóstico automático de erros</p>
        </div>
        <Button onClick={handleCheckAll} disabled={checking || platforms.length === 0} className="gap-2 h-9 text-sm"
          style={{ background: "var(--gradient-primary)" }}>
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {checking ? "Diagnosticando..." : "🔬 Testar Sistema Completo"}
        </Button>
      </motion.div>

      {/* Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Online", value: online, color: "text-accent", border: "border-accent/30", icon: Wifi },
            { label: "Instável", value: unstable, color: "text-amber-400", border: "border-amber-400/30", icon: AlertTriangle },
            { label: "Offline", value: offline + errors, color: "text-destructive", border: "border-destructive/30", icon: Server },
            { label: "Erros", value: totalErrors, color: "text-destructive", border: "border-destructive/30", icon: XCircle },
            { label: "Latência Média", value: `${avgLatency}ms`, color: "text-primary", border: "border-primary/30", icon: Clock },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-xl border ${s.border} p-4`} style={{ background: "hsl(var(--card))" }}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs font-bold text-foreground">{s.label}</span>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Platform Diagnostics */}
      {platforms.length === 0 ? (
        <div className="rounded-xl border border-border/60 p-12 text-center" style={{ background: "hsl(var(--card))" }}>
          <p className="text-muted-foreground text-sm">Nenhuma plataforma cadastrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((p, idx) => {
            const result = results.find(r => r.platform_id === p.id);
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

                {/* Endpoint Overview */}
                {result && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(["health", "stats", "depositos", "saques"] as const).map(ep => {
                        const d = result.endpoints[ep];
                        return (
                          <div key={ep} className={`flex items-center gap-2 p-2.5 rounded-lg border ${d.ok ? "bg-accent/5 border-accent/20" : "bg-destructive/5 border-destructive/20"}`}>
                            {statusIcon(d.ok)}
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

                    {/* All OK */}
                    {result.errors.length === 0 && result.status === "online" && (
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                        <p className="text-[11px] font-bold text-accent flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          ✅ API 100% funcional — todos os endpoints respondendo corretamente
                        </p>
                      </div>
                    )}

                    {/* Error Details (expandable) */}
                    {result.errors.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <p className="text-xs font-bold text-destructive">
                            {result.errors.length} {result.errors.length === 1 ? "problema detectado" : "problemas detectados"}
                          </p>
                        </div>
                        {(expanded ? result.errors : result.errors.slice(0, 2)).map((err, i) => (
                          <ErrorCard key={i} error={err} />
                        ))}
                        {!expanded && result.errors.length > 2 && (
                          <button onClick={() => toggleExpand(p.id)} className="text-xs text-primary hover:underline">
                            Ver todos os {result.errors.length} erros →
                          </button>
                        )}
                      </>
                    )}

                    <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Verificado em {new Date(result.checked_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                {!result && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Clique em "Testar" ou "Testar Sistema Completo" para diagnosticar</p>
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
