import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight, Search, Filter, CheckCircle, XCircle, TrendingDown, Clock, Ban,
  RotateCcw, Zap, Calendar, Users, BarChart3, PieChart as PieChartIcon, Trophy, ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExportButtons from "@/components/ExportButtons";
import { useSaques, useUpdateSaque } from "@/hooks/useSaques";
import { usePlatforms } from "@/hooks/usePlatforms";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useCreateLog } from "@/hooks/useLogs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { adapterRegistry, classifyWithdrawError, ERROR_LABELS } from "@/lib/platform-adapter";
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const statusColors: Record<string, string> = {
  pendente: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
  aprovado: "bg-neon-green/10 text-neon-green border-neon-green/20",
  rejeitado: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

const CHART_COLORS = ["hsl(142 76% 45%)", "hsl(38 92% 55%)", "hsl(0 84% 60%)", "hsl(262 83% 58%)", "hsl(199 89% 48%)", "hsl(25 95% 53%)"];

const Saques = () => {
  const { data: saques = [], isLoading } = useSaques();
  const { data: platforms = [] } = usePlatforms();
  const updateSaque = useUpdateSaque();
  const api = usePlatformApi();
  const createLog = useCreateLog();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDays, setFilterDays] = useState("30");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getDateRange = () => {
    if (filterDays === "0") return { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    if (filterDays === "1") { const y = subDays(new Date(), 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    return { from: subDays(new Date(), Number(filterDays)), to: new Date() };
  };
  const { from: dateFrom, to: dateTo } = getDateRange();
  const inRange = (d: string) => { const dt = new Date(d); return isAfter(dt, dateFrom) && isBefore(dt, dateTo); };

  const filtered = useMemo(() => saques.filter(s => {
    if (search && !s.nome_usuario.toLowerCase().includes(search.toLowerCase()) && !(s.pix ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (!inRange(s.created_at)) return false;
    return true;
  }), [saques, search, filterPlat, filterStatus, filterDays]);

  const handleAction = async (saque: typeof saques[0], status: string) => {
    setActionLoading(saque.id);
    try {
      if (saque.plataforma_id) {
        const platform = platforms.find(p => p.id === saque.plataforma_id);
        if (platform) {
          const remoteId = saque.original_id || saque.id;
          if (status === "aprovado") {
            const gwKey = platform.gateway_chave;
            if (!gwKey) {
              toast({ title: "⚠️ Gateway não configurado", description: `A plataforma "${platform.nome}" não possui chave de gateway. Configure em Plataformas → Configurar → Gateway para enviar PIX real.`, variant: "destructive" });
              await createLog.mutateAsync({ acao: "Saque sem Gateway", detalhes: `${platform.nome} — ${saque.nome_usuario} — R$ ${Number(saque.valor).toFixed(2)} — Gateway não configurado, PIX não enviado`, plataforma_nome: platform.nome, plataforma_id: platform.id, tipo: "warning", valor: Number(saque.valor), usuario: saque.nome_usuario });
              setActionLoading(null);
              return;
            }
            if (!saque.pix) {
              toast({ title: "⚠️ Chave PIX ausente", description: `O usuário "${saque.nome_usuario}" não possui chave PIX cadastrada. Impossível enviar pagamento.`, variant: "destructive" });
              setActionLoading(null);
              return;
            }
            // Try real PIX payout via edge function
            const { data: payoutResult, error: payoutError } = await supabase.functions.invoke("pix-payout", {
              body: {
                gateway_key: gwKey,
                amount: Number(saque.valor),
                pix_key: saque.pix,
                description: `Saque ${saque.nome_usuario} — ${platform.nome}`,
              },
            });
            if (payoutError || !payoutResult?.success) {
              const errMsg = payoutError?.message || payoutResult?.error || "Falha no pagamento PIX";
              toast({ title: "❌ Pagamento PIX falhou", description: errMsg, variant: "destructive" });
              await createLog.mutateAsync({ acao: "Erro PIX Payout", detalhes: `${platform.nome} — ${saque.nome_usuario} — R$ ${Number(saque.valor).toFixed(2)} — ${errMsg}`, plataforma_nome: platform.nome, plataforma_id: platform.id, tipo: "error", valor: Number(saque.valor), usuario: saque.nome_usuario });
              setActionLoading(null);
              return;
            }
            toast({ title: "✅ PIX enviado!", description: `Transação: ${payoutResult.transaction_id || "processando"}` });
          }
          const success = status === "aprovado" ? await api.aprovarSaque(platform, remoteId) : await api.rejeitarSaque(platform, remoteId);
          if (!success) {
            toast({ title: "❌ Falha no banco remoto", description: `Não foi possível ${status === "aprovado" ? "aprovar" : "rejeitar"} na plataforma ${platform.nome}.`, variant: "destructive" });
            setActionLoading(null);
            return;
          }
        }
      }
      await updateSaque.mutateAsync({ id: saque.id, status });
      await createLog.mutateAsync({ acao: status === "aprovado" ? "Saque Aprovado" : status === "rejeitado" ? "Saque Rejeitado" : "Saque Revalidado", detalhes: `${saque.nome_usuario} — R$ ${Number(saque.valor).toFixed(2)} — ${saque.plataforma_nome ?? ""}`, plataforma_nome: saque.plataforma_nome, plataforma_id: saque.plataforma_id, tipo: status === "aprovado" ? "success" : "warning", valor: Number(saque.valor), usuario: saque.nome_usuario });
      toast({ title: status === "aprovado" ? "✅ Saque aprovado e PIX enviado!" : status === "rejeitado" ? "❌ Saque rejeitado" : "🔄 Saque revalidado para pendente" });
    } catch (e: any) {
      console.error(`[Saque V7] ❌ Erro:`, e);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const formatCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);

  // === METRICS ===
  const totalValor = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const avgValor = filtered.length > 0 ? totalValor / filtered.length : 0;
  const maxSaque = filtered.length > 0 ? Math.max(...filtered.map(d => Number(d.valor))) : 0;
  const aprovados = filtered.filter(s => s.status === "aprovado");
  const pendentes = filtered.filter(s => s.status === "pendente");
  const rejeitados = filtered.filter(s => s.status === "rejeitado");
  const totalAprovados = aprovados.reduce((s, d) => s + Number(d.valor), 0);
  const totalPendentes = pendentes.reduce((s, d) => s + Number(d.valor), 0);
  const totalRejeitados = rejeitados.reduce((s, d) => s + Number(d.valor), 0);
  const uniqueUsers = useMemo(() => new Set(filtered.map(s => s.nome_usuario)).size, [filtered]);
  const approvalRate = filtered.length > 0 ? ((aprovados.length / filtered.length) * 100).toFixed(1) : "0";
  const rejectionRate = filtered.length > 0 ? ((rejeitados.length / filtered.length) * 100).toFixed(1) : "0";

  // Daily chart
  const dailyData = useMemo(() => {
    const m: Record<string, { date: string; total: number; approved: number; rejected: number; pending: number; count: number }> = {};
    filtered.forEach(s => {
      const day = format(new Date(s.created_at), "dd/MM");
      if (!m[day]) m[day] = { date: day, total: 0, approved: 0, rejected: 0, pending: 0, count: 0 };
      m[day].total += Number(s.valor);
      m[day].count++;
      if (s.status === "aprovado") m[day].approved += Number(s.valor);
      else if (s.status === "rejeitado") m[day].rejected += Number(s.valor);
      else m[day].pending += Number(s.valor);
    });
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // Status pie
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: status === "aprovado" ? "Aprovados" : status === "pendente" ? "Pendentes" : "Rejeitados",
      value: count,
      color: status === "aprovado" ? "hsl(142 76% 45%)" : status === "pendente" ? "hsl(38 92% 55%)" : "hsl(0 84% 60%)",
    }));
  }, [filtered]);

  // By platform ranking
  const byPlatform = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number; approved: number; rejected: number; pending: number; color: string; avgTime: number }> = {};
    filtered.forEach(s => {
      const pid = s.plataforma_id ?? "unknown";
      const p = platforms.find(pl => pl.id === pid);
      if (!m[pid]) m[pid] = { name: s.plataforma_nome ?? "Desconhecida", total: 0, count: 0, approved: 0, rejected: 0, pending: 0, color: p?.cor ?? "#888", avgTime: 0 };
      m[pid].total += Number(s.valor);
      m[pid].count++;
      if (s.status === "aprovado") m[pid].approved += Number(s.valor);
      else if (s.status === "rejeitado") m[pid].rejected += Number(s.valor);
      else m[pid].pending += Number(s.valor);
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [filtered, platforms]);

  // Top withdrawers
  const topWithdrawers = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number; approved: number; rejected: number }> = {};
    filtered.forEach(s => {
      if (!m[s.nome_usuario]) m[s.nome_usuario] = { name: s.nome_usuario, total: 0, count: 0, approved: 0, rejected: 0 };
      m[s.nome_usuario].total += Number(s.valor);
      m[s.nome_usuario].count++;
      if (s.status === "aprovado") m[s.nome_usuario].approved++;
      if (s.status === "rejeitado") m[s.nome_usuario].rejected++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtered]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, count: 0, total: 0 }));
    filtered.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hours[h].count++;
      hours[h].total += Number(s.valor);
    });
    return hours;
  }, [filtered]);

  // Platform with most withdrawals alert
  const heaviestPlatform = byPlatform.length > 0 ? byPlatform[0] : null;
  const platformWithMostPending = useMemo(() => {
    const m: Record<string, { name: string; count: number; total: number }> = {};
    filtered.filter(s => s.status === "pendente").forEach(s => {
      const pid = s.plataforma_id ?? "unknown";
      if (!m[pid]) m[pid] = { name: s.plataforma_nome ?? "Desconhecida", count: 0, total: 0 };
      m[pid].count++;
      m[pid].total += Number(s.valor);
    });
    return Object.values(m).sort((a, b) => b.total - a.total)[0] ?? null;
  }, [filtered]);

  const exportData = filtered.map(s => ({
    Usuário: s.nome_usuario, Valor: Number(s.valor), PIX: s.pix ?? "",
    Status: s.status, Plataforma: s.plataforma_nome ?? "",
    Data: format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
  }));

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Saques <span className="gradient-text">& Retiradas</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} saques · {uniqueUsers} usuários · {formatCurrency(totalValor)} total · Taxa aprovação: {approvalRate}%
          </p>
        </div>
        <ExportButtons data={exportData} filename="saques" title="Relatório de Saques" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Geral", value: formatCurrency(totalValor), sub: `${filtered.length} saques · Média: ${formatCurrency(avgValor)}`, icon: TrendingDown, color: "text-neon-amber", bg: "bg-neon-amber/10", border: "border-neon-amber/30" },
          { label: "Aprovados", value: formatCurrency(totalAprovados), sub: `${aprovados.length} executados · ${approvalRate}% taxa`, icon: CheckCircle, color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/30" },
          { label: "Pendentes", value: formatCurrency(totalPendentes), sub: `${pendentes.length} aguardando ação`, icon: Clock, color: "text-neon-amber", bg: "bg-neon-amber/10", border: "border-neon-amber/30" },
          { label: "Rejeitados", value: formatCurrency(totalRejeitados), sub: `${rejeitados.length} rejeitados · ${rejectionRate}% taxa`, icon: Ban, color: "text-neon-red", bg: "bg-neon-red/10", border: "border-neon-red/30" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-xl border ${s.border} p-4`} style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/60 p-3" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1"><Users className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] text-muted-foreground font-semibold">Usuários Únicos</span></div>
          <p className="text-xl font-black text-foreground">{uniqueUsers}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-border/60 p-3" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-3.5 h-3.5 text-accent" /><span className="text-[10px] text-muted-foreground font-semibold">Plataformas</span></div>
          <p className="text-xl font-black text-foreground">{byPlatform.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/60 p-3" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-3.5 h-3.5 text-neon-amber" /><span className="text-[10px] text-muted-foreground font-semibold">Maior Saque</span></div>
          <p className="text-xl font-black text-foreground">{formatCurrency(maxSaque)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-xl border border-border/60 p-3" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1"><ArrowDown className="w-3.5 h-3.5 text-accent" /><span className="text-[10px] text-muted-foreground font-semibold">Média por Saque</span></div>
          <p className="text-xl font-black text-foreground">{formatCurrency(avgValor)}</p>
        </motion.div>
      </div>

      {/* Alert: Platform with most pending */}
      {platformWithMostPending && platformWithMostPending.count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}
          className="rounded-xl border border-neon-amber/40 bg-neon-amber/5 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neon-amber" />
            <span className="text-xs font-bold text-foreground">⏳ Maior fila pendente:</span>
            <span className="text-xs font-semibold text-neon-amber">{platformWithMostPending.name}</span>
            <span className="text-[10px] text-muted-foreground">— {platformWithMostPending.count} saques pendentes · {formatCurrency(platformWithMostPending.total)}</span>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar usuário ou PIX..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary h-9 text-sm" />
        </div>
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><Calendar className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Hoje</SelectItem><SelectItem value="1">Ontem</SelectItem>
            <SelectItem value="7">7 dias</SelectItem><SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos Status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="rejeitado">Rejeitado</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {dailyData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="lg:col-span-2 rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Saques por Dia</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Aprovados vs Pendentes vs Rejeitados</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name === "approved" ? "Aprovados" : name === "rejected" ? "Rejeitados" : "Pendentes"]} />
                <Area type="monotone" dataKey="approved" stroke="hsl(142 76% 45%)" fill="hsl(142 76% 45% / 0.15)" strokeWidth={2} name="approved" />
                <Area type="monotone" dataKey="pending" stroke="hsl(38 92% 55%)" fill="hsl(38 92% 55% / 0.15)" strokeWidth={2} name="pending" />
                <Area type="monotone" dataKey="rejected" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60% / 0.1)" strokeWidth={2} name="rejected" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {statusPie.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Distribuição por Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusPie.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-muted-foreground">{s.name}: {s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Hourly Heatmap */}
      {hourlyData.some(h => h.count > 0) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">🕐 Distribuição por Hora</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Horários com mais solicitações de saque</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: number, name: string) => [name === "count" ? `${v} saques` : formatCurrency(v), name === "count" ? "Quantidade" : "Valor"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Platform Ranking + Top Withdrawers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {byPlatform.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">🏆 Ranking de Saques por Plataforma</h3>
            <div className="space-y-2">
              {byPlatform.slice(0, 6).map((p, i) => {
                const pct = totalValor > 0 ? (p.total / totalValor) * 100 : 0;
                const approveRate = p.count > 0 ? ((p.approved / p.total) * 100).toFixed(0) : "0";
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-5">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(p.total)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.count}x</span>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                      <span className="text-[9px] text-neon-green whitespace-nowrap">{formatCompact(p.approved)} aprov.</span>
                      <span className="text-[9px] text-neon-amber whitespace-nowrap">{formatCompact(p.pending)} pend.</span>
                      <span className="text-[9px] text-neon-red whitespace-nowrap">{formatCompact(p.rejected)} rej.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {topWithdrawers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">👤 Top Sacadores</h3>
            <div className="space-y-2">
              {topWithdrawers.map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-xs text-foreground font-medium flex-1 truncate">{u.name}</span>
                  <span className="text-[9px] text-neon-green">{u.approved} aprov.</span>
                  <span className="text-[9px] text-neon-red">{u.rejected} rej.</span>
                  <span className="text-xs font-bold text-neon-amber">{formatCurrency(u.total)}</span>
                  <span className="text-[10px] text-muted-foreground">{u.count}x</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* List */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-amber/10"><ArrowUpRight className="w-4 h-4 text-neon-amber" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Motor de Execução V7</h3>
              <p className="text-[10px] text-muted-foreground">Gateway → API Remota → Supabase → Log</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} registros</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum saque encontrado</div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto">
            {filtered.map((s, i) => {
              const plat = platforms.find(p => p.id === s.plataforma_id);
              const hasGateway = !!((plat?.mapeamento_extra as any)?.gateway?.type);
              return (
                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neon-amber/10 flex-shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-neon-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{s.nome_usuario}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.plataforma_nome ?? "—"} · PIX: {s.pix ?? "—"}
                      {hasGateway && <span className="ml-1 text-neon-green">⚡ Gateway</span>}
                    </p>
                    {s.detalhes && <p className="text-[9px] text-destructive mt-0.5">{s.detalhes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neon-amber">{formatCurrency(Number(s.valor))}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusColors[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                  {s.status === "pendente" && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon"
                        className="w-7 h-7 text-neon-green hover:bg-neon-green/10"
                        onClick={() => handleAction(s, "aprovado")}
                        disabled={actionLoading === s.id}
                        title="Aprovar & Executar via Gateway">
                        {actionLoading === s.id ? <Zap className="w-4 h-4 animate-pulse" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="w-7 h-7 text-neon-red hover:bg-neon-red/10"
                        onClick={() => handleAction(s, "rejeitado")}
                        disabled={actionLoading === s.id}
                        title="Rejeitar">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {s.status === "rejeitado" && (
                    <Button variant="ghost" size="icon"
                      className="w-7 h-7 text-primary hover:bg-primary/10"
                      onClick={() => handleAction(s, "pendente")}
                      disabled={actionLoading === s.id}
                      title="Revalidar — voltar para pendente">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Saques;
