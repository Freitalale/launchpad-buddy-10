import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Search, Filter, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepositos } from "@/hooks/useDepositos";
import { usePlatforms } from "@/hooks/usePlatforms";
import { format } from "date-fns";

const Depositos = () => {
  const { data: depositos = [], isLoading } = useDepositos();
  const { data: platforms = [] } = usePlatforms();
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");

  const filtered = depositos.filter(d => {
    if (search && !d.nome_usuario.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && d.plataforma_id !== filterPlat) return false;
    return true;
  });

  const totalValor = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Depósitos <span className="gradient-text">& Entradas</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Dados reais de depósitos das plataformas conectadas</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-neon-green" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Total Depósitos</span>
          </div>
          <p className="text-lg font-black text-neon-green">{formatCurrency(totalValor)}</p>
          <p className="text-[10px] text-muted-foreground">{filtered.length} depósitos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Média por Depósito</span>
          </div>
          <p className="text-lg font-black text-primary">{filtered.length > 0 ? formatCurrency(totalValor / filtered.length) : "R$ 0"}</p>
          <p className="text-[10px] text-muted-foreground">Valor médio</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary h-9 text-sm" />
        </div>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-green/10"><DollarSign className="w-4 h-4 text-neon-green" /></div>
            <h3 className="font-bold text-sm text-foreground">Lista de Depósitos</h3>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} registros</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum depósito encontrado</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neon-green/10 flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-neon-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{d.nome_usuario}</p>
                  <p className="text-[10px] text-muted-foreground">{d.plataforma_nome ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon-green">{formatCurrency(Number(d.valor))}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Depositos;
