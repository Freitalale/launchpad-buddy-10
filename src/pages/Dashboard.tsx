import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Wifi, Server, Handshake, DollarSign, HeartCrack, Filter,
  ArrowUpRight, Headphones, Calendar, RefreshCw, AlertTriangle, Clock, Database, Zap,
  CheckCircle, XCircle, Ban, TrendingDown, CreditCard
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import ExportButtons from "@/components/ExportButtons";
import CooperationBadge from "@/components/CooperationBadge";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useDepositos } from "@/hooks/useDepositos";
import { useSaques } from "@/hooks/useSaques";
import { useSacs } from "@/hooks/useSacs";
import { useExpiringCooperations, getCooperationInfo } from "@/hooks/useCooperation";
import { useAutoSync } from "@/hooks/useAutoSync";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

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
  const { syncStates, lastGlobalSync, syncing, syncNow } = useAutoSync(platforms);
  const [filterDays, setFilterDays] = useState("30");
  const [filterPlat, setFilterPlat] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isCustom = filterDays === "custom";

  const getDateRange = () => {
    if (isCustom && customFrom && customTo) return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
    const days = filterDays === "0" ? 0 : filterDays === "1" ? 1 : Number(filterDays);
    if (filterDays === "0") return { from: startOfDay(new Date()), to: endOfDay(new Date()) };
    if (filterDays === "1") { const y = subDays(new Date(), 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    return { from: subDays(new Date(), days), to: new Date() };
  };

  const { from: dateFrom, to: dateTo } = getDateRange();
  const inRange = (dateStr: string) => { const d = new Date(dateStr); return isAfter(d, dateFrom) && isBefore(d, dateTo); };

  const filteredDepositos = depositos.filter(d => { if (!inRange(d.created_at)) return false; if (filterPlat !== "all" && d.plataforma_id !== filterPlat) return false; return true; });
  const filteredSaques = saques.filter(s => { if (!inRange(s.created_at)) return false; if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false; return true; });
  const filteredSacs = sacs.filter(s => { if (!inRange(s.created_at)) return false; if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false; return true; });

  const totalDepositos = filteredDepositos.reduce((s, d) => s + Number(d.valor), 0);
  const saquesAprovados = filteredSaques.filter(s => s.status === "aprovado");
  const saquesPendentes = filteredSaques.filter(s => s.status === "pendente");
  const saquesRejeitados = filteredSaques.filter(s => s.status === "rejeitado");
  const totalSaquesAprovados = saquesAprovados.reduce((s, d) => s + Number(d.valor), 0);
  const totalSaquesPendentes = saquesPendentes.reduce((s, d) => s + Number(d.valor), 0);
  const totalSaquesRejeitados = saquesRejeitados.reduce((s, d) => s + Number(d.valor), 0);
  const totalSaquesGeral = filteredSaques.reduce((s, d) => s + Number(d.valor), 0);
  const lucroLiquido = totalDepositos - totalSaquesAprovados;

  const onlinePlatforms = platforms.filter(p => p.status === "online").length;
  const offlinePlatforms = platforms.filter(p => p.status === "offline").length;
  const errorPlatforms = platforms.filter(p => p.status === "error" || p.status === "warning").length;
  const totalUsers = platforms.reduce((s, p) => s + (p.total_usuarios ?? 0), 0);
  const totalAffiliates = platforms.reduce((s, p) => s + (p.total_afiliados ?? 0), 0);
  const totalBalance = platforms.reduce((s, p) => s + Number(p.saldo_total ?? 0), 0);
  const activeCooperations = platforms.filter(p => p.cooperacao_dias !== null && !getCooperationInfo(p).expired).length;

  const pieData = Object.entries(
    platforms.reduce((acc, p) => { acc[p.categoria] = (acc[p.categoria] || 0) + (p.total_usuarios ?? 0); return acc; }, {} as Record<string, number>)
  ).map(([cat, users]) => ({ name: categoryLabels[cat] ?? cat, value: users, color: categoryColors[cat] ?? "#888" }));

  const rankingData = [...platforms].sort((a, b) => Number(b.saldo_total ?? 0) - Number(a.saldo_total ?? 0)).slice(0, 8)
    .map(p => ({ name: p.nome.length > 12 ? p.nome.slice(0, 12) + "…" : p.nome, saldo: Number(p.saldo_total ?? 0), fill: p.cor ?? "#00c4ff" }));

  const dailyMap: Record<string, { date: string; depositos: number; saques: number }> = {};
  filteredDepositos.forEach(d => { const day = format(new Date(d.created_at), "dd/MM"); if (!dailyMap[day]) dailyMap[day] = { date: day, depositos: 0, saques: 0 }; dailyMap[day].depositos += Number(d.valor); });
  filteredSaques.forEach(s => { const day = format(new Date(s.created_at), "dd/MM"); if (!dailyMap[day]) dailyMap[day] = { date: day, depositos: 0, saques: 0 }; dailyMap[day].saques += Number(s.valor); });
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Saques status pie
  const saquesPieData = [
    { name: "Aprovados", value: saquesAprovados.length, color: "hsl(142 76% 45%)" },
    { name: "Pendentes", value: saquesPendentes.length, color: "hsl(38 92% 55%)" },
    { name: "Rejeitados", value: saquesRejeitados.length, color: "hsl(0 84% 60%)" },
  ].filter(d => d.value > 0);

  const formatBalance = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
  const formatUsers = (v: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  const exportData = platforms.map(p => ({
    Nome: p.nome, Categoria: categoryLabels[p.categoria] ?? p.categoria,
    Status: p.status, Usuários: p.total_usuarios ?? 0, Afiliados: p.total_afiliados ?? 0,
    Saldo: Number(p.saldo_total ?? 0),
  }));

  const syncOnlineCount = Array.from(syncStates.values()).filter(s => s.status === "online").length;
  const syncOfflineCount = Array.from(syncStates.values()).filter(s => s.status === "offline").length;
  const hasCachedData = Array.from(syncStates.values()).some(s => s.fromCache);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Dashboard <span className="gradient-text">V7</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform Adapter Engine — {platforms.length} plataformas · Dados em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sync"}
          </Button>
          <ExportButtons data={exportData} filename="dashboard_v7" title="Master Painel V7 — Relatório" />
        </div>
      </motion.div>

      {/* Auto-Sync Status Bar */}
      {lastGlobalSync && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
            syncOfflineCount > 0 ? "border-destructive/30 bg-destructive/5" :
            hasCachedData ? "border-amber-400/30 bg-amber-400/5" :
            "border-accent/30 bg-accent/5"
          }`}>
          <div className={`w-2 h-2 rounded-full ${syncing ? "bg-primary animate-pulse" : syncOfflineCount > 0 ? "bg-destructive" : "bg-accent"}`} />
          <div className="flex-1 flex items-center gap-3 text-xs">
            <span className="font-semibold text-foreground">
              {syncing ? "⟳ Sincronizando..." : syncOfflineCount > 0 ? `⚠️ ${syncOfflineCount} offline` : hasCachedData ? "📦 Cache ativo" : "✅ APIs respondendo"}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(lastGlobalSync).toLocaleTimeString("pt-BR")}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Auto-Sync: 30s</span>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Hoje</SelectItem><SelectItem value="1">Ontem</SelectItem>
            <SelectItem value="7">7 dias</SelectItem><SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem><SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="365">1 ano</SelectItem><SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {isCustom && (
          <>
            <div><Label className="text-[10px] text-muted-foreground">De</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-secondary h-9 text-sm w-36" /></div>
            <div><Label className="text-[10px] text-muted-foreground">Até</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-secondary h-9 text-sm w-36" /></div>
          </>
        )}
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {expiringCoops.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/30 p-4 space-y-2" style={{ background: "hsl(var(--destructive) / 0.05)" }}>
          <p className="text-sm font-bold text-destructive flex items-center gap-2"><HeartCrack className="w-4 h-4" /> Cooperações Expirando</p>
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
        <StatsCard title="Plataformas" value={platforms.length} subtitle={`${onlinePlatforms} online · ${offlinePlatforms} offline`} icon={Server} color="blue" delay={0} />
        <StatsCard title="Usuários Totais" value={formatUsers(totalUsers)} subtitle={`${totalAffiliates} afiliados`} icon={Users} color="green" delay={0.05} />
        <StatsCard title="Saldo Consolidado" value={formatBalance(totalBalance)} subtitle="Valor direto da API" icon={DollarSign} color="amber" delay={0.1} />
        <StatsCard title="Cooperações Ativas" value={activeCooperations} subtitle="Em vigor" icon={Handshake} color="purple" delay={0.15} />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatsCard title="Depósitos" value={formatBalance(totalDepositos)} subtitle={`${filteredDepositos.length} no período`} icon={DollarSign} color="green" delay={0.2} />
        <StatsCard title="Saques Aprovados" value={formatBalance(totalSaquesAprovados)} subtitle={`${saquesAprovados.length} executados`} icon={CheckCircle} color="green" delay={0.25} />
        <StatsCard title="Saques Pendentes" value={formatBalance(totalSaquesPendentes)} subtitle={`${saquesPendentes.length} aguardando`} icon={Clock} color="amber" delay={0.3} />
        <StatsCard title="Saques Rejeitados" value={formatBalance(totalSaquesRejeitados)} subtitle={`${saquesRejeitados.length} rejeitados`} icon={Ban} color="red" delay={0.35} />
        <StatsCard title="Lucro Líquido" value={formatBalance(lucroLiquido)} subtitle="Depósitos − Saques Aprovados" icon={TrendingUp} color={lucroLiquido >= 0 ? "green" : "red"} delay={0.4} />
      </div>

      {/* Extra Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatsCard title="SACs Pendentes" value={filteredSacs.filter(s => s.status === "pendente").length} subtitle={`${filteredSacs.length} total`} icon={Headphones} color="purple" delay={0.45} />
        <StatsCard title="APIs Online" value={onlinePlatforms} subtitle={`${errorPlatforms} com erro`} icon={Wifi} color="blue" delay={0.5} />
        <StatsCard title="Total Saques" value={formatBalance(totalSaquesGeral)} subtitle={`${filteredSaques.length} no período`} icon={ArrowUpRight} color="amber" delay={0.55} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {dailyData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="lg:col-span-2 rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Depósitos vs Saques</h3>
            <p className="text-xs text-muted-foreground mb-4">Período selecionado</p>
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

        {saquesPieData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl border border-border/60 p-4 md:p-5" style={{ background: "hsl(var(--card))" }}>
            <h3 className="font-bold text-sm text-foreground mb-1">📊 Saques por Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={saquesPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {saquesPieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {saquesPieData.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-muted-foreground">{s.name}: {s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {rankingData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
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

      {/* Platform Status */}
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
            {platforms.map((p, i) => {
              const syncState = syncStates.get(p.id);
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: `${p.cor ?? "#00c4ff"}15` }}>
                    {p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/")) ? <img src={p.logo} className="w-full h-full object-cover" alt="" /> : <span className="text-sm">{p.logo}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{syncState?.fromCache ? "📦 Cache" : ""} {p.url ?? ""}</p>
                  </div>
                  {syncState && syncState.depositsSynced !== undefined && (
                    <span className="text-[9px] text-muted-foreground hidden md:block">
                      {syncState.depositsSynced}D · {syncState.saquesSynced ?? 0}S
                    </span>
                  )}
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                    p.status === "online" ? "bg-accent/10 text-accent border-accent/20" :
                    p.status === "error" ? "bg-destructive/10 text-destructive border-destructive/20" :
                    p.status === "warning" ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                    "bg-muted text-muted-foreground border-border"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === "online" ? "status-online" : p.status === "error" ? "status-error" : p.status === "warning" ? "status-warning" : "status-offline"}`} />
                    {p.status === "online" ? "Online" : p.status === "error" ? "Erro" : p.status === "warning" ? "Atenção" : "Offline"}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
