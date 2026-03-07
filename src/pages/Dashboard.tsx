import { motion } from "framer-motion";
import { Users, TrendingUp, Wifi, Server, Handshake, DollarSign, AlertCircle, Activity, HeartCrack } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import StatsCard from "@/components/StatsCard";
import ExportButtons from "@/components/ExportButtons";
import CooperationBadge from "@/components/CooperationBadge";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useExpiringCooperations, getCooperationInfo } from "@/hooks/useCooperation";

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
  const expiringCoops = useExpiringCooperations(platforms);

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">
            Dashboard <span className="gradient-text">Global</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão consolidada em tempo real · v3.0 Enterprise</p>
        </div>
        <ExportButtons data={exportData} filename="dashboard_plataformas" title="Master Painel Pro — Relatório" />
      </motion.div>

      {expiringCoops.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-neon-red/30 p-4 space-y-2" style={{ background: "hsl(var(--neon-red) / 0.05)" }}>
          <p className="text-sm font-bold text-neon-red flex items-center gap-2">
            <HeartCrack className="w-4 h-4" /> Cooperações Expirando / Expiradas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringCoops.map(({ platform: p, cooperation }) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
                <span className="text-lg">{p.logo && p.logo.startsWith("http") ?
                  <img src={p.logo} className="w-6 h-6 rounded object-cover" alt="" /> : p.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                  <CooperationBadge info={cooperation} compact />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title="Total de Plataformas" value={stats.totalPlatforms} subtitle={`${stats.onlinePlatforms} online`} icon={Server} color="blue" delay={0} />
        <StatsCard title="Usuários Totais" value={formatUsers(stats.totalUsers)} subtitle="Todas plataformas" icon={Users} color="green" delay={0.05} />
        <StatsCard title="Saldo Consolidado" value={formatBalance(stats.totalBalance)} subtitle="Soma de todas" icon={DollarSign} color="amber" delay={0.1} />
        <StatsCard title="Cooperações Ativas" value={stats.activeCooperations} subtitle="Em vigor" icon={Handshake} color="purple" delay={0.15} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title="Plataformas Online" value={stats.onlinePlatforms} icon={Wifi} color="green" delay={0.2} />
        <StatsCard title="Com Erros / Atenção" value={stats.errorPlatforms} icon={AlertCircle} color="red" delay={0.25} />
        <StatsCard title="Offline" value={stats.offlinePlatforms} icon={Activity} color="red" delay={0.3} />
        <StatsCard title="Total Afiliados" value={formatUsers(stats.totalAffiliates)} icon={TrendingUp} color="blue" delay={0.35} />
      </div>

      {rankingData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold text-sm text-foreground mb-1">🏆 Ranking por Saldo</h3>
          <p className="text-xs text-muted-foreground mb-4">Top plataformas por saldo total</p>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
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
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.03 }}
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
