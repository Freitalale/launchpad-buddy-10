import { useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, Search, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2, CalendarX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExportButtons from "@/components/ExportButtons";
import { useLogs } from "@/hooks/useLogs";
import { useDeleteLogs } from "@/hooks/useDeleteLogs";
import { useToast } from "@/hooks/use-toast";

const typeConfig: Record<string, any> = {
  success: { icon: CheckCircle, color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/20" },
  error: { icon: AlertCircle, color: "text-neon-red", bg: "bg-neon-red/10", border: "border-neon-red/20" },
  warning: { icon: AlertTriangle, color: "text-neon-amber", bg: "bg-neon-amber/10", border: "border-neon-amber/20" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
};

const Logs = () => {
  const { data: logs = [], isLoading } = useLogs();
  const deleteLogs = useDeleteLogs();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "success" | "error" | "warning" | "info">("all");
  const [deleteDate, setDeleteDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = logs.filter(l => {
    const matchSearch = (l.plataforma_nome ?? "").toLowerCase().includes(search.toLowerCase())
      || l.acao.toLowerCase().includes(search.toLowerCase())
      || (l.detalhes ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || l.tipo === typeFilter;
    return matchSearch && matchType;
  });

  const exportData = filtered.map(l => ({
    Ação: l.acao, Tipo: l.tipo, Plataforma: l.plataforma_nome ?? "",
    Detalhes: l.detalhes ?? "", Usuário: l.usuario ?? "", Valor: l.valor ?? "",
    Data: new Date(l.created_at).toLocaleString("pt-BR"),
  }));

  const handleDelete = async (mode: "today" | "all" | "date") => {
    if (confirmDelete !== mode) { setConfirmDelete(mode); return; }
    setConfirmDelete(null);
    try {
      if (mode === "date" && deleteDate) {
        await deleteLogs.mutateAsync({ date: deleteDate });
      } else {
        await deleteLogs.mutateAsync(mode as "today" | "all");
      }
      toast({ title: "Logs apagados!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Logs & <span className="gradient-text">Atividade</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro completo de todas as ações e eventos</p>
        </div>
        <ExportButtons data={exportData} filename="logs_atividade" title="Master Painel Pro — Logs" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-secondary border-border text-sm" placeholder="Buscar logs..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "success", "error", "warning", "info"] as const).map(t => {
            const labels = { all: "Todos", success: "Sucesso", error: "Erro", warning: "Aviso", info: "Info" };
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                  typeFilter === t ? "border-primary/40 bg-primary/20 text-primary" : "border-border/50 bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                {labels[t]}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl border border-destructive/30 p-4 space-y-3" style={{ background: "hsl(var(--destructive) / 0.03)" }}>
        <p className="text-xs font-bold text-destructive flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" /> Gerenciar Logs
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <Button size="sm" variant="outline" onClick={() => handleDelete("today")}
            className={`h-8 text-xs gap-1.5 transition-all ${confirmDelete === "today" ? "border-destructive bg-destructive text-destructive-foreground" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
            <CalendarX className="w-3 h-3" />
            {confirmDelete === "today" ? "Confirmar?" : "Apagar Logs de Hoje"}
          </Button>
          <div className="flex gap-1.5 items-center">
            <Input type="date" value={deleteDate} onChange={e => setDeleteDate(e.target.value)}
              className="bg-secondary border-border h-8 text-xs w-36" />
            <Button size="sm" variant="outline" onClick={() => handleDelete("date")} disabled={!deleteDate}
              className={`h-8 text-xs gap-1.5 transition-all ${confirmDelete === "date" ? "border-destructive bg-destructive text-destructive-foreground" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
              {confirmDelete === "date" ? "Confirmar?" : "Apagar por Data"}
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleDelete("all")}
            className={`h-8 text-xs gap-1.5 transition-all ${confirmDelete === "all" ? "border-destructive bg-destructive text-destructive-foreground" : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}>
            <Trash2 className="w-3 h-3" />
            {confirmDelete === "all" ? "CONFIRMAR EXCLUSÃO TOTAL?" : "Apagar Todos os Logs"}
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">{filtered.length} eventos</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((log, i) => {
              const cfg = typeConfig[log.tipo] || typeConfig.info;
              const Icon = cfg.icon;
              return (
                <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 hover:bg-secondary/20 transition-colors">
                  <div className={`p-1.5 rounded-lg border mt-0.5 flex-shrink-0 ${cfg.bg} ${cfg.border}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{log.acao}</span>
                      {log.plataforma_nome && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50">
                          {log.plataforma_nome}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{log.detalhes}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground mono">
                      {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium text-sm">Nenhum log encontrado</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Logs;
