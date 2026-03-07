import { useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Wifi, Server, Handshake, DollarSign, AlertCircle, Activity, HeartCrack, Filter, ArrowUpRight, Headphones } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatsCard from "@/components/StatsCard";
import ExportButtons from "@/components/ExportButtons";
import CooperationBadge from "@/components/CooperationBadge";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useDepositos } from "@/hooks/useDepositos";
import { useSaques } from "@/hooks/useSaques";
import { useSacs } from "@/hooks/useSacs";
import { useExpiringCooperations, getCooperationInfo } from "@/hooks/useCooperation";
import { format, subDays, isAfter } from "date-fns";

const categoryLabels: Record<string, string> = {
  chinese: "Chinesa", brazilian: "Brasileira", esports: "E-Sports",
  casino: "Cassino", sports: "Esportiva", other: "Outro",
};
const categoryColors: Record<string, string> = {
  chinese: "#00c4ff", brazilian: "#00d67c", esports: "#a855f7",
  casino: "#ffd700", sports: "#ff6b35", other: "#888888",
};

const Dashboard = () => {
  const { data: platforms = [], isLoading } = usePlatforms();
  const { data: depositos = [] } = useDepositos();
  const { data: saques = [] } = useSaques();
  const { data: sacs = [] } = useSacs();
  const expiringCoops = useExpiringCooperations(platforms);
  const [filterDays, setFilterDays] = useState("30");
  const [filterPlat, setFilterPlat] = useState("all");

  const cutoff = subDays(new Date(), Number(filterDays));

  const filteredDepositos = depositos.filter(d => {
    if (!isAfter(new Date(d.created_at), cutoff)) return false;
    if (filterPlat !== "all" && d.plataforma_id !== filterPlat) return false;
    return true;
  });
  const filteredSaques = saques.filter(s => {
    if (!isAfter(new Date(s.created_at), cutoff)) return false;
    if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false;
    return true;
  });
  const filteredSacs = sacs.filter(s => {
    if (!isAfter(new Date(s.created_at), cutoff)) return false;
    if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false;
    return true;
  });

  const totalDepositos = filteredDepositos.reduce((s, d) => s + Number(d.valor), 0);
  const totalSaques = filteredSaques.reduce((s, d) => s + Number(d.valor), 0);

  const stats = {
    totalPlatforms: platforms.length,
    onlinePlatforms: platforms.filter(p => p.status === "online").length,
    offlinePlatforms: platforms.filter(p => p.status === "offline").length,
    errorPlatforms: platforms.filter(p => p.status === "error" || p.status === "warning").length,
    totalUsers: platforms.reduce((s, p) => s + (p.total_usuarios ?? 0), 0),
    totalAffiliates: platforms.reduce((s, p) => s + (p.total_afiliados ?? 0), 0),
    totalBalance: platforms.reduce((s, p) => s + Number(p.saldo_total ?? 0), 0),
    activeCooperations: platforms.filter(p => p.cooperacao_dias !== null && !getCooperationInfo(p).expired).length,
  };

  const pieData = Object.entries(
    platforms.reduce((acc, p) => { acc[p.categoria] = (acc[p.categoria] || 0) + (p.total_usuarios ?? 0); return acc; }, {} as Record<string, number>)
  ).map(([cat, users]) => ({ name: categoryLabels[cat] ?? cat, value: users, color: categoryColors[cat] ?? "#888" }));

  const rankingData = [...platforms].sort((a, b) => Number(b.saldo_total ?? 0) - Number(a.saldo_total ?? 0)).slice(0, 8)
    .map(p => ({ name: p.nome.length > 12 ? p.nome.slice(0, 12) + "…" : p.nome, saldo: Number(p.saldo_total ?? 0), fill: p.cor ?? "#00c4ff" }));

  // Build daily chart data for deposits/saques
  const dailyMap: Record<string, { date: string; depositos: number; saques: number }> = {};
  filteredDepositos.forEach(d => {
    const day = format(new Date(d.created_at), "dd/MM");
    if (!dailyMap[day]) dailyMap[day] = { date: day, depositos: 0, saques: 0 };
    dailyMap[day].depositos += Number(d.valor);
  });
  filteredSaques.forEach(s => {
    const day = format(new Date(s.created_at), "dd/MM");
    if (!dailyMap[day]) dailyMap[day] = { date: day, depositos: 0, saques: 0 };
    dailyMap[day].saques += Number(s.valor);
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const formatBalance = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
  const formatUsers = (v: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  const exportData = platforms.map(p => ({
    Nome: p.nome, Categoria: categoryLabels[p.categoria] ?? p.categoria,
    Status: p.status, Usuários: p.total_usuarios ?? 0, Afiliados: p.total_afiliados ?? 0,
    Saldo: Number(p.saldo_total ?? 0),
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Dashboard <span className="gradient-text">Global</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão consolidada em tempo real · v3.0 Enterprise</p>
        </div>
        <ExportButtons data={exportData} filename="dashboard_plataformas" title="Master Painel Pro — Relatório" />
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {expiringCoops.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-neon-red/30 p-4 space-y-2" style={{ background: "hsl(var(--neon-red) / 0.05)" }}>
          <p className="text-sm font-bold text-neon-red flex items-center gap-2"><HeartCrack className="w-4 h-4" /> Cooperações Expirando / Expiradas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringCoops.map(({ platform: p, cooperation }) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
                <span className="text-lg">{p.logo && p.logo.startsWith("http") ? <img src={p.logo} className="w-6 h-6 rounded object-cover" alt="" /> : p.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                  <CooperationBadge info={cooperation} compact />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title="Total de Plataformas" value={stats.totalPlatforms} subtitle={`${stats.onlinePlatforms} online`} icon={Server} color="blue" delay={0} />
        <StatsCard title="Usuários Totais" value={formatUsers(stats.totalUsers)} subtitle="Todas plataformas" icon={Users} color="green" delay={0.05} />
        <StatsCard title="Saldo Consolidado" value={formatBalance(stats.totalBalance)} subtitle="Soma de todas" icon={DollarSign} color="amber" delay={0.1} />
        <StatsCard title="Cooperações Ativas" value={stats.activeCooperations} subtitle="Em vigor" icon={Handshake} color="purple" delay={0.15} />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title="Depósitos" value={formatBalance(totalDepositos)} subtitle={`${filteredDepositos.length} no período`} icon={DollarSign} color="green" delay={0.2} />
        <StatsCard title="Saques" value={formatBalance(totalSaques)} subtitle={`${filteredSaques.length} no período`} icon={ArrowUpRight} color="amber" delay={0.25} />
        <StatsCard title="SACs Pendentes" value={filteredSacs.filter(s => s.status === "pendente").length} subtitle={`${filteredSacs.length} total`} icon={Headphones} color="purple" delay={0.3} />
        <StatsCard title="Plataformas Online" value={stats.onlinePlatforms} subtitle={`${stats.errorPlatforms} com erro`} icon={Wifi} color="blue" delay={0.35} />
      </div>

      {/* Daily Deposits vs Saques Chart */}
      {dailyData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">📊 Depósitos vs Saques</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos {filterDays} dias</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatBalance(v)} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: number, name: string) => [formatBalance(v), name === "depositos" ? "Depósitos" : "Saques"]} />
              <Area type="monotone" dataKey="depositos" stroke="hsl(142 76% 45%)" fill="hsl(142 76% 45% / 0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="saques" stroke="hsl(38 92% 55%)" fill="hsl(38 92% 55% / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {rankingData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">🏆 Ranking por Saldo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rankingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatBalance(v)} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v: number) => [formatBalance(v), "Saldo"]} />
              <Bar dataKey="saldo" radius={[6, 6, 0, 0]}>
                {rankingData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">👥 Usuários por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Platform Status Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">📋 Status das Plataformas</h3>
          <span className="text-xs text-muted-foreground">{platforms.length} plataformas</span>
        </div>
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma plataforma cadastrada</div>
        ) : (
          <div className="divide-y divide-border/30">
            {platforms.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.03 }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: `${p.cor ?? "#00c4ff"}15` }}>
                  {p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/")) ? <img src={p.logo} className="w-full h-full object-cover" alt="" /> : <span className="text-sm">{p.logo}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{p.url ?? ""}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                  p.status === "online" ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                  p.status === "error" ? "bg-neon-red/10 text-neon-red border-neon-red/20" :
                  p.status === "warning" ? "bg-neon-amber/10 text-neon-amber border-neon-amber/20" :
                  "bg-muted text-muted-foreground border-border"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    p.status === "online" ? "status-online" : p.status === "error" ? "status-error" : p.status === "warning" ? "status-warning" : "status-offline"
                  }`} />
                  {p.status === "online" ? "Online" : p.status === "error" ? "Erro" : p.status === "warning" ? "Atenção" : "Offline"}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
