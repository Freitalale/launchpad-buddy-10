import { useState } from "react";
import { motion } from "framer-motion";
import { Headphones, Search, Filter, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSacs, useUpdateSac } from "@/hooks/useSacs";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pendente: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
  aprovado: "bg-neon-green/10 text-neon-green border-neon-green/20",
  rejeitado: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

const Sacs = () => {
  const { data: sacs = [], isLoading } = useSacs();
  const { data: platforms = [] } = usePlatforms();
  const updateSac = useUpdateSac();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = sacs.filter(s => {
    if (search && !s.nome_usuario.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const handleAction = async (id: string, status: string) => {
    try {
      await updateSac.mutateAsync({ id, status });
      toast({ title: status === "aprovado" ? "✅ SAC aprovado!" : "❌ SAC rejeitado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">SACs <span className="gradient-text">& Atendimentos</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Aprove ou reprove solicitações — nome, plataforma, Pix e valor</p>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary h-9 text-sm" />
        </div>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="rejeitado">Rejeitado</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-purple/10"><Headphones className="w-4 h-4 text-neon-purple" /></div>
            <h3 className="font-bold text-sm text-foreground">Solicitações de SAC</h3>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} registros · {filtered.filter(s => s.status === "pendente").length} pendentes</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum SAC encontrado</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neon-purple/10 flex-shrink-0">
                  <Headphones className="w-4 h-4 text-neon-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{s.nome_usuario}</p>
                  <p className="text-[10px] text-muted-foreground">{s.plataforma_nome ?? "—"} · Pix: {s.pix ?? "—"}</p>
                  {s.motivo && <p className="text-[10px] text-muted-foreground mt-0.5">Motivo: {s.motivo}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon-purple">{s.valor ? formatCurrency(Number(s.valor)) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusColors[s.status] ?? ""}`}>
                  {s.status}
                </span>
                {s.status === "pendente" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-neon-green hover:bg-neon-green/10" onClick={() => handleAction(s.id, "aprovado")} title="Aprovar">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-neon-red hover:bg-neon-red/10" onClick={() => handleAction(s.id, "rejeitado")} title="Reprovar">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sacs;
