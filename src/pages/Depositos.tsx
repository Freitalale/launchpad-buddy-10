import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Search, Filter, TrendingUp, TrendingDown, Calendar, Users,
  ArrowUpRight, BarChart3, PieChart as PieChartIcon, Clock, CheckCircle, XCircle, AlertCircle,
  Trophy, Percent, ArrowDown, Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExportButtons from "@/components/ExportButtons";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { useDepositos } from "@/hooks/useDepositos";
import { usePlatforms } from "@/hooks/usePlatforms";
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from "date-fns";

const statusColors: Record<string, string> = {
  approved: "bg-accent/10 text-accent border-accent/20",
  pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  canceled: "bg-muted text-muted-foreground border-border",
  pendente: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  aprovado: "bg-accent/10 text-accent border-accent/20",
  rejeitado: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  approved: "Aprovado", pending: "Pendente", rejected: "Rejeitado", canceled: "Cancelado",
  pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado",
};

const Depositos = () => {
  const { data: depositos = [], isLoading } = useDepositos();
  const { data: platforms = [] } = usePlatforms();
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDays, setFilterDays] = useState("30");

  const getDateRange = () => {
    if (filterDays === "0") return { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    if (filterDays === "1") { const y = subDays(new Date(), 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    return { from: subDays(new Date(), Number(filterDays)), to: new Date() };
  };

  const { from: dateFrom, to: dateTo } = getDateRange();
  const inRange = (d: string) => { const dt = new Date(d); return isAfter(dt, dateFrom) && isBefore(dt, dateTo); };

  const filtered = useMemo(() => depositos.filter(d => {
    if (search && !d.nome_usuario.toLowerCase().includes(search.toLowerCase()) && !(d.pix ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && d.plataforma_id !== filterPlat) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (!inRange(d.created_at)) return false;
    return true;
  }), [depositos, search, filterPlat, filterStatus, filterDays]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const formatCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);

  // === METRICS ===
  const totalValor = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const avgValor = filtered.length > 0 ? totalValor / filtered.length : 0;
  const maxDeposit = filtered.length > 0 ? Math.max(...filtered.map(d => Number(d.valor))) : 0;
  const minDeposit = filtered.length > 0 ? Math.min(...filtered.map(d => Number(d.valor))) : 0;

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(d => { m[d.status] = (m[d.status] || 0) + 1; });
    return m;
  }, [filtered]);

  const approvedCount = (statusCounts["approved"] ?? 0) + (statusCounts["aprovado"] ?? 0);
  const pendingCount = (statusCounts["pending"] ?? 0) + (statusCounts["pendente"] ?? 0);
  const rejectedCount = (statusCounts["rejected"] ?? 0) + (statusCounts["rejeitado"] ?? 0);
  const approvedTotal = filtered.filter(d => d.status === "approved" || d.status === "aprovado").reduce((s, d) => s + Number(d.valor), 0);
  const pendingTotal = filtered.filter(d => d.status === "pending" || d.status === "pendente").reduce((s, d) => s + Number(d.valor), 0);
  const rejectedTotal = filtered.filter(d => d.status === "rejected" || d.status === "rejeitado").reduce((s, d) => s + Number(d.valor), 0);
  const conversionRate = filtered.length > 0 ? ((approvedCount / filtered.length) * 100).toFixed(1) : "0";
  const rejectionRate = filtered.length > 0 ? ((rejectedCount / filtered.length) * 100).toFixed(1) : "0";

  const uniqueUsers = useMemo(() => new Set(filtered.map(d => d.nome_usuario)).size, [filtered]);

  // Daily chart
  const dailyData = useMemo(() => {
    const m: Record<string, { date: string; total: number; count: number; approved: number; pending: number; rejected: number }> = {};
    filtered.forEach(d => {
      const day = format(new Date(d.created_at), "dd/MM");
      if (!m[day]) m[day] = { date: day, total: 0, count: 0, approved: 0, pending: 0, rejected: 0 };
      m[day].total += Number(d.valor);
      m[day].count++;
      if (d.status === "approved" || d.status === "aprovado") m[day].approved += Number(d.valor);
      else if (d.status === "rejected" || d.status === "rejeitado") m[day].rejected += Number(d.valor);
      else m[day].pending += Number(d.valor);
    });
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // By platform
  const byPlatform = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number; approved: number; rejected: number; pending: number; color: string; avgDeposit: number }> = {};
    filtered.forEach(d => {
      const pid = d.plataforma_id ?? "unknown";
      const p = platforms.find(pl => pl.id === pid);
      if (!m[pid]) m[pid] = { name: d.plataforma_nome ?? "Desconhecida", total: 0, count: 0, approved: 0, rejected: 0, pending: 0, color: p?.cor ?? "#888", avgDeposit: 0 };
      m[pid].total += Number(d.valor);
      m[pid].count++;
      if (d.status === "approved" || d.status === "aprovado") m[pid].approved += Number(d.valor);
      else if (d.status === "rejected" || d.status === "rejeitado") m[pid].rejected += Number(d.valor);
      else m[pid].pending += Number(d.valor);
    });
    Object.values(m).forEach(p => { p.avgDeposit = p.count > 0 ? p.total / p.count : 0; });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [filtered, platforms]);

  // Status pie
  const statusPie = useMemo(() => {
    return [
      { name: "Aprovados", value: approvedCount, color: "hsl(142 76% 45%)" },
      { name: "Pendentes", value: pendingCount, color: "hsl(38 92% 55%)" },
      { name: "Rejeitados", value: rejectedCount, color: "hsl(0 84% 60%)" },
    ].filter(s => s.value > 0);
  }, [approvedCount, pendingCount, rejectedCount]);

  // Top depositors
  const topDepositors = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number; approved: number; rejected: number }> = {};
    filtered.forEach(d => {
      if (!m[d.nome_usuario]) m[d.nome_usuario] = { name: d.nome_usuario, total: 0, count: 0, approved: 0, rejected: 0 };
      m[d.nome_usuario].total += Number(d.valor);
      m[d.nome_usuario].count++;
      if (d.status === "approved" || d.status === "aprovado") m[d.nome_usuario].approved++;
      if (d.status === "rejected" || d.status === "rejeitado") m[d.nome_usuario].rejected++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtered]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, count: 0, total: 0 }));
    filtered.forEach(d => {
      const h = new Date(d.created_at).getHours();
      hours[h].count++;
      hours[h].total += Number(d.valor);
    });
    return hours;
  }, [filtered]);

  // Stalled platforms (no deposits in last 24h but had deposits before)
  const stalledPlatforms = useMemo(() => {
    const now = new Date();
    const last24h = subDays(now, 1);
    return platforms.filter(p => {
      const platDeposits = depositos.filter(d => d.plataforma_id === p.id);
      if (platDeposits.length === 0) return false;
      return platDeposits.filter(d => new Date(d.created_at) > last24h).length === 0;
    }).map(p => {
      const lastDep = depositos.filter(d => d.plataforma_id === p.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const hoursAgo = lastDep ? Math.round((now.getTime() - new Date(lastDep.created_at).getTime()) / 3600000) : 0;
      return { ...p, hoursAgo };
    });
  }, [depositos, platforms]);

  // Platform with most rejections
  const mostRejected = useMemo(() => {
    const m: Record<string, { name: string; rejected: number; total: number }> = {};
    filtered.forEach(d => {
      if (d.status !== "rejected" && d.status !== "rejeitado") return;
      const pid = d.plataforma_id ?? "unknown";
      if (!m[pid]) m[pid] = { name: d.plataforma_nome ?? "Desconhecida", rejected: 0, total: 0 };
      m[pid].rejected++;
      m[pid].total += Number(d.valor);
    });
    return Object.values(m).sort((a, b) => b.rejected - a.rejected)[0] ?? null;
  }, [filtered]);

  const exportData = filtered.map(d => ({
    Usuário: d.nome_usuario, Valor: Number(d.valor), PIX: d.pix ?? "",
    Status: statusLabels[d.status] ?? d.status, Plataforma: d.plataforma_nome ?? "",
    Data: format(new Date(d.created_at), "dd/MM/yyyy HH:mm"),
  }));

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">
            Depósitos <span className="gradient-text">& Entradas</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} depósitos · {uniqueUsers} usuários · {formatCurrency(totalValor)} total · Conversão: {conversionRate}%
          </p>
        </div>
        <ExportButtons data={exportData} filename="depositos" title="Relatório de Depósitos" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Depositado", value: formatCurrency(totalValor), sub: `${filtered.length} depósitos · Média: ${formatCurrency(avgValor)}`, icon: DollarSign, color: "text-accent", bg: "bg-accent/10", border: "border-accent/30" },
          { label: "Aprovados", value: formatCurrency(approvedTotal), sub: `${approvedCount} depósitos · ${conversionRate}% conversão`, icon: CheckCircle, color: "text-accent", bg: "bg-accent/10", border: "border-accent/30" },
          { label: "Pendentes", value: formatCurrency(pendingTotal), sub: `${pendingCount} aguardando processamento`, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
          { label: "Rejeitados", value: formatCurrency(rejectedTotal), sub: `${rejectedCount} rejeitados · ${rejectionRate}% rejeição`, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
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
        {[
          { label: "Usuários Únicos", value: String(uniqueUsers), icon: Users, color: "text-primary" },
          { label: "Plataformas Ativas", value: String(byPlatform.length), icon: BarChart3, color: "text-accent" },
          { label: "Maior Depósito", value: formatCurrency(maxDeposit), icon: ArrowUpRight, color: "text-neon-amber" },
          { label: "Menor Depósito", value: formatCurrency(minDeposit), icon: ArrowDown, color: "text-muted-foreground" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
            className="rounded-xl border border-border/60 p-3" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-center gap-2 mb-1"><s.icon className={`w-3.5 h-3.5 ${s.color}`} /><span className="text-[10px] text-muted-foreground font-semibold">{s.label}</span></div>
            <p className="text-xl font-black text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {stalledPlatforms.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="rounded-xl border border-neon-amber/40 bg-neon-amber/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-neon-amber" />
            <h3 className="font-bold text-sm text-foreground">⚠️ Plataformas sem conversão (24h)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stalledPlatforms.map(p => (
              <div key={p.id} className="rounded-lg border border-neon-amber/30 bg-background/50 px-3 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-amber" />
                <span className="text-xs font-semibold text-foreground">{p.nome}</span>
                <span className="text-[10px] text-muted-foreground">Último depósito: {p.hoursAgo}h atrás</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {mostRejected && mostRejected.rejected > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-bold text-foreground">🚨 Alta taxa de rejeição:</span>
            <span className="text-xs font-semibold text-destructive">{mostRejected.name}</span>
            <span className="text-[10px] text-muted-foreground">— {mostRejected.rejected} rejeitados · {formatCurrency(mostRejected.total)} perdido</span>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
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
          <SelectTrigger className="w-40 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {dailyData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="lg:col-span-2 rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Depósitos por Dia</h3>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Por Status</h3>
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

      {/* Hourly Distribution */}
      {hourlyData.some(h => h.count > 0) && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
          className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">🕐 Distribuição por Hora</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Horários com mais depósitos — identifique picos de conversão</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v: number, name: string) => [name === "count" ? `${v} depósitos` : formatCurrency(v), name === "count" ? "Quantidade" : "Valor"]} />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Rankings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Platform — Ranking */}
        {byPlatform.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">🏆 Ranking por Plataforma</h3>
            <div className="space-y-2">
              {byPlatform.slice(0, 6).map((p, i) => {
                const pct = totalValor > 0 ? (p.total / totalValor) * 100 : 0;
                const platConvRate = p.count > 0 ? ((p.approved / p.total) * 100).toFixed(0) : "0";
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-5">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-xs text-foreground font-medium flex-1 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(p.total)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.count}x</span>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                      <span className="text-[9px] text-accent whitespace-nowrap">{formatCompact(p.approved)} aprov.</span>
                      <span className="text-[9px] text-neon-amber whitespace-nowrap">{formatCompact(p.pending)} pend.</span>
                      <span className="text-[9px] text-destructive whitespace-nowrap">{formatCompact(p.rejected)} rej.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Top Depositors */}
        {topDepositors.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-3">👤 Top Depositantes</h3>
            <div className="space-y-2">
              {topDepositors.map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-xs text-foreground font-medium flex-1 truncate">{u.name}</span>
                  <span className="text-[9px] text-accent">{u.approved} aprov.</span>
                  <span className="text-[9px] text-destructive">{u.rejected} rej.</span>
                  <span className="text-xs font-bold text-accent">{formatCurrency(u.total)}</span>
                  <span className="text-[10px] text-muted-foreground">{u.count}x</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Deposits List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
        className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><DollarSign className="w-4 h-4 text-accent" /></div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Lista Detalhada</h3>
              <p className="text-[10px] text-muted-foreground">{filtered.length} depósitos encontrados</p>
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum depósito encontrado para os filtros selecionados</div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
            {filtered.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.5) }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent/10 flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{d.nome_usuario}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.plataforma_nome ?? "—"} · PIX: <span className="font-mono">{d.pix ?? "—"}</span>
                  </p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${statusColors[d.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {statusLabels[d.status] ?? d.status}
                </span>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold text-accent">{formatCurrency(Number(d.valor))}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(d.created_at), "dd/MM HH:mm")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Depositos;
