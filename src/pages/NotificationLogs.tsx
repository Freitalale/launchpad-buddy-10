import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle, XCircle, Filter, RefreshCw, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

interface NotifLog {
  id: string;
  user_id: string;
  canal: string;
  evento: string;
  mensagem: string;
  status: string;
  erro: string | null;
  plataforma_id: string | null;
  plataforma_nome: string | null;
  destinatario: string | null;
  created_at: string;
}

const canalLabel: Record<string, string> = { telegram: "Telegram", pushcut: "PushCut" };
const eventoLabel: Record<string, string> = {
  novo_usuario: "Novo Usuário", deposito: "Depósito", saque: "Saque",
  plataforma_offline: "Plataforma Offline", cooperacao: "Cooperação",
  erro: "Erro", teste: "Teste Manual",
};

const NotificationLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: platforms = [] } = usePlatforms();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [canalFilter, setCanalFilter] = useState<"all" | "telegram" | "pushcut">("all");
  const [platFilter, setPlatFilter] = useState("all");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["notificacao_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacao_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as NotifLog[];
    },
    enabled: !!user,
  });

  const clearLogs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notificacao_logs").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacao_logs"] });
      toast({ title: "Logs limpos" });
    },
  });

  const filtered = useMemo(() => logs.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (canalFilter !== "all" && l.canal !== canalFilter) return false;
    if (platFilter !== "all" && l.plataforma_id !== platFilter) return false;
    if (search && !l.mensagem.toLowerCase().includes(search.toLowerCase()) && !l.evento.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, statusFilter, canalFilter, platFilter, search]);

  const totalSuccess = logs.filter(l => l.status === "success").length;
  const totalError = logs.filter(l => l.status === "error").length;
  const totalAll = logs.length;

  // Chart: by event type
  const byEvent = useMemo(() => {
    const map: Record<string, { success: number; error: number }> = {};
    logs.forEach(l => {
      if (!map[l.evento]) map[l.evento] = { success: 0, error: 0 };
      map[l.evento][l.status === "success" ? "success" : "error"]++;
    });
    return Object.entries(map).map(([evento, v]) => ({
      evento: eventoLabel[evento] || evento,
      success: v.success,
      error: v.error,
    }));
  }, [logs]);

  // Pie chart data
  const pieData = [
    { name: "Sucesso", value: totalSuccess, fill: "hsl(var(--neon-green))" },
    { name: "Erro", value: totalError, fill: "hsl(var(--neon-red))" },
  ].filter(d => d.value > 0);

  // Recent errors
  const recentErrors = useMemo(() => logs.filter(l => l.status === "error").slice(0, 10), [logs]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Logs de <span className="gradient-text">Notificações</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Histórico completo de todas as notificações enviadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => clearLogs.mutate()} disabled={clearLogs.isPending || logs.length === 0}
            className="h-8 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10">
            <Trash2 className="w-3 h-3" /> Limpar
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Enviadas", value: totalAll, color: "hsl(var(--primary))", icon: Bell },
          { label: "Sucesso", value: totalSuccess, color: "hsl(var(--neon-green))", icon: CheckCircle },
          { label: "Erro", value: totalError, color: "hsl(var(--neon-red))", icon: XCircle },
          { label: "Taxa Sucesso", value: totalAll > 0 ? `${Math.round((totalSuccess / totalAll) * 100)}%` : "—", color: "hsl(var(--neon-blue))", icon: BarChart3 },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-border/60 p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))" }}>
            <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      {logs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bar chart by event */}
          <div className="md:col-span-2 rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">Notificações por Evento</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byEvent} barGap={2}>
                <XAxis dataKey="evento" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="success" name="Sucesso" fill="hsl(142 76% 46%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="error" name="Erro" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">Taxa de Sucesso</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                    style={{ fontSize: 10 }}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs">Sem dados</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Errors highlight */}
      {recentErrors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Últimos Erros ({recentErrors.length})
          </h3>
          {recentErrors.map(e => (
            <div key={e.id} className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold uppercase">
                    {canalLabel[e.canal] || e.canal}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {eventoLabel[e.evento] || e.evento}
                  </span>
                  {e.plataforma_nome && (
                    <span className="text-[10px] text-muted-foreground">· {e.plataforma_nome}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-1 truncate">{e.mensagem}</p>
                {e.erro && (
                  <p className="text-[11px] text-destructive font-mono mt-0.5 bg-destructive/5 px-2 py-1 rounded">
                    ❌ {e.erro}
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex gap-3 flex-wrap items-center">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar mensagem..." className="h-8 text-xs bg-secondary border-border max-w-[200px]" />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-border w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={canalFilter} onValueChange={v => setCanalFilter(v as any)}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-border w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Canais</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="pushcut">PushCut</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platFilter} onValueChange={setPlatFilter}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-border w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} registros</span>
      </motion.div>

      {/* Logs table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum log de notificação</p>
          <p className="text-sm mt-1">As notificações enviadas aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Canal</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Evento</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Plataforma</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Mensagem</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Erro</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2">
                      {l.status === "success" ? (
                        <span className="flex items-center gap-1 text-neon-green"><CheckCircle className="w-3 h-3" /> OK</span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> Erro</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[10px]">
                        {canalLabel[l.canal] || l.canal}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{eventoLabel[l.evento] || l.evento}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.plataforma_nome || "—"}</td>
                    <td className="px-3 py-2 max-w-[250px] truncate text-foreground">{l.mensagem}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-destructive font-mono">{l.erro || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NotificationLogs;
