import { motion } from "framer-motion";
import { Activity, Server, Wifi, Database, Clock } from "lucide-react";
import { usePlatforms } from "@/hooks/usePlatforms";

const SystemHealth = () => {
  const { data: platforms = [], isLoading } = usePlatforms();

  const online = platforms.filter(p => p.status === "online").length;
  const offline = platforms.filter(p => p.status === "offline").length;
  const errors = platforms.filter(p => p.status === "error" || p.status === "warning").length;

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
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Saúde do <span className="gradient-text">Sistema</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Monitoramento em tempo real de todas as plataformas</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-neon-green/30 p-5" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-neon-green/10"><Wifi className="w-4 h-4 text-neon-green" /></div>
            <span className="text-sm font-bold text-foreground">Online</span>
          </div>
          <p className="text-3xl font-black text-neon-green">{online}</p>
          <p className="text-xs text-muted-foreground mt-1">Plataformas funcionando</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/60 p-5" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted"><Server className="w-4 h-4 text-muted-foreground" /></div>
            <span className="text-sm font-bold text-foreground">Offline</span>
          </div>
          <p className="text-3xl font-black text-muted-foreground">{offline}</p>
          <p className="text-xs text-muted-foreground mt-1">Plataformas inativas</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-neon-red/30 p-5" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-neon-red/10"><Activity className="w-4 h-4 text-neon-red" /></div>
            <span className="text-sm font-bold text-foreground">Erros / Atenção</span>
          </div>
          <p className="text-3xl font-black text-neon-red">{errors}</p>
          <p className="text-xs text-muted-foreground mt-1">Requerem atenção</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-xl border border-border/60 p-5" style={{ background: "hsl(var(--card))" }}>
        <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Status Detalhado
        </h3>
        {platforms.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma plataforma cadastrada</p>
        ) : (
          <div className="space-y-2">
            {platforms.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  p.status === "online" ? "status-online" : p.status === "error" ? "status-error" : p.status === "warning" ? "status-warning" : "status-offline"
                }`} />
                <span className="text-sm font-medium text-foreground flex-1">{p.nome}</span>
                <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                <span className="text-[10px] text-muted-foreground mono">
                  {p.ultimo_sync ? new Date(p.ultimo_sync).toLocaleString("pt-BR") : "Nunca sincronizado"}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SystemHealth;
