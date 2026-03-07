import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Server, Wifi, Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle, Zap, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatforms } from "@/hooks/usePlatforms";
import { usePlatformApi, type ApiHealthResult } from "@/hooks/usePlatformApi";

const SystemHealth = () => {
  const { data: platforms = [], isLoading } = usePlatforms();
  const api = usePlatformApi();
  const [results, setResults] = useState<ApiHealthResult[]>([]);
  const [checking, setChecking] = useState(false);

  const online = results.filter(r => r.status === "online").length;
  const errors = results.filter(r => r.status === "error").length;
  const offline = results.filter(r => r.status === "offline").length;

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

  const statusIcon = (ok: boolean) => ok
    ? <CheckCircle className="w-4 h-4 text-neon-green" />
    : <XCircle className="w-4 h-4 text-neon-red" />;

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
            Saúde do <span className="gradient-text">Sistema</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Diagnóstico real de cada API — erros detalhados e status de endpoints</p>
        </div>
        <Button onClick={handleCheckAll} disabled={checking || platforms.length === 0} className="gap-2 h-9 text-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {checking ? "Verificando..." : "Verificar Todas APIs"}
        </Button>
      </motion.div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-neon-green/30 p-5" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-neon-green/10"><Wifi className="w-4 h-4 text-neon-green" /></div>
              <span className="text-sm font-bold text-foreground">Online</span>
            </div>
            <p className="text-3xl font-black text-neon-green">{online}</p>
            <p className="text-xs text-muted-foreground mt-1">APIs respondendo 100%</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl border border-neon-amber/30 p-5" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-neon-amber/10"><AlertTriangle className="w-4 h-4 text-neon-amber" /></div>
              <span className="text-sm font-bold text-foreground">Com Erros</span>
            </div>
            <p className="text-3xl font-black text-neon-amber">{errors}</p>
            <p className="text-xs text-muted-foreground mt-1">Parcialmente funcionando</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl border border-neon-red/30 p-5" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-neon-red/10"><Server className="w-4 h-4 text-neon-red" /></div>
              <span className="text-sm font-bold text-foreground">Offline</span>
            </div>
            <p className="text-3xl font-black text-neon-red">{offline}</p>
            <p className="text-xs text-muted-foreground mt-1">APIs fora do ar</p>
          </motion.div>
        </div>
      )}

      {/* Platform List */}
      {platforms.length === 0 ? (
        <div className="rounded-xl border border-border/60 p-12 text-center" style={{ background: "hsl(var(--card))" }}>
          <p className="text-muted-foreground text-sm">Nenhuma plataforma cadastrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {platforms.map((p, idx) => {
            const result = results.find(r => r.platform_id === p.id);
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
                  {result && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono px-2 py-1 rounded-md border ${
                        result.status === "online" ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                        result.status === "error" ? "bg-neon-amber/10 text-neon-amber border-neon-amber/20" :
                        "bg-neon-red/10 text-neon-red border-neon-red/20"
                      }`}>
                        {result.latency_ms}ms
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        result.status === "online" ? "bg-neon-green animate-pulse" :
                        result.status === "error" ? "bg-neon-amber" :
                        "bg-neon-red"
                      }`} />
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleCheckOne(p.id)}>
                    <Activity className="w-3 h-3" /> Testar
                  </Button>
                </div>

                {/* Results */}
                {result && (
                  <div className="p-4 space-y-3">
                    {/* Endpoint Status */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/30">
                        {statusIcon(result.endpoints.stats.ok)}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-foreground">?action=stats</p>
                          {result.endpoints.stats.ok && result.endpoints.stats.data && (
                            <p className="text-[9px] text-muted-foreground">
                              {result.endpoints.stats.data.total_usuarios} users, {result.endpoints.stats.data.total_afiliados} aff
                            </p>
                          )}
                          {!result.endpoints.stats.ok && result.endpoints.stats.error && (
                            <p className="text-[9px] text-neon-red truncate">{result.endpoints.stats.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/30">
                        {statusIcon(result.endpoints.depositos.ok)}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-foreground">?action=depositos</p>
                          {result.endpoints.depositos.ok && (
                            <p className="text-[9px] text-muted-foreground">{result.endpoints.depositos.count} registros</p>
                          )}
                          {!result.endpoints.depositos.ok && result.endpoints.depositos.error && (
                            <p className="text-[9px] text-neon-red truncate">{result.endpoints.depositos.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/30">
                        {statusIcon(result.endpoints.saques.ok)}
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-foreground">?action=saques</p>
                          {result.endpoints.saques.ok && (
                            <p className="text-[9px] text-muted-foreground">{result.endpoints.saques.count} registros</p>
                          )}
                          {!result.endpoints.saques.ok && result.endpoints.saques.error && (
                            <p className="text-[9px] text-neon-red truncate">{result.endpoints.saques.error}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Errors Detail */}
                    {result.errors.length > 0 && (
                      <div className="rounded-lg border border-neon-red/20 bg-neon-red/5 p-3 space-y-1.5">
                        <p className="text-[11px] font-bold text-neon-red flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {result.errors.length} {result.errors.length === 1 ? "erro encontrado" : "erros encontrados"}
                        </p>
                        {result.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 text-neon-red mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-neon-red/80 font-mono leading-relaxed">{err}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All OK */}
                    {result.errors.length === 0 && result.status === "online" && (
                      <div className="rounded-lg border border-neon-green/20 bg-neon-green/5 p-3">
                        <p className="text-[11px] font-bold text-neon-green flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          API 100% funcional — todos os endpoints respondendo corretamente
                        </p>
                      </div>
                    )}

                    <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Verificado em {new Date(result.checked_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                {/* No results yet */}
                {!result && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Clique em "Testar" ou "Verificar Todas APIs" para diagnosticar</p>
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
