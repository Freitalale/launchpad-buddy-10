import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDepositos, useCreateDeposito, type Deposito } from "@/hooks/useDepositos";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pendente: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
  aprovado: "bg-neon-green/10 text-neon-green border-neon-green/20",
  rejeitado: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

const Depositos = () => {
  const { data: depositos = [], isLoading } = useDepositos();
  const { data: platforms = [] } = usePlatforms();
  const createDeposito = useCreateDeposito();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome_usuario: "", valor: "", pix: "", plataforma_id: "", detalhes: "" });

  const filtered = depositos.filter(d => {
    if (search && !d.nome_usuario.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && d.plataforma_id !== filterPlat) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  const handleCreate = async () => {
    const plat = platforms.find(p => p.id === form.plataforma_id);
    try {
      await createDeposito.mutateAsync({
        nome_usuario: form.nome_usuario,
        valor: Number(form.valor) || 0,
        pix: form.pix || null,
        plataforma_id: form.plataforma_id || null,
        plataforma_nome: plat?.nome || null,
        status: "pendente",
        detalhes: form.detalhes || null,
      });
      toast({ title: "Depósito registrado!" });
      setOpen(false);
      setForm({ nome_usuario: "", valor: "", pix: "", plataforma_id: "", detalhes: "" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">
            Depósitos <span className="gradient-text">& Entradas</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie todos os depósitos das plataformas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-9 text-sm" style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))" }}>
              <Plus className="w-3.5 h-3.5" /> Novo Depósito
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Registrar Depósito</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Usuário</Label><Input value={form.nome_usuario} onChange={e => setForm(p => ({ ...p, nome_usuario: e.target.value }))} className="bg-secondary" /></div>
              <div><Label className="text-xs">Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} className="bg-secondary" /></div>
              <div><Label className="text-xs">Pix</Label><Input value={form.pix} onChange={e => setForm(p => ({ ...p, pix: e.target.value }))} className="bg-secondary" /></div>
              <div><Label className="text-xs">Plataforma</Label>
                <Select value={form.plataforma_id} onValueChange={v => setForm(p => ({ ...p, plataforma_id: v }))}>
                  <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Detalhes</Label><Input value={form.detalhes} onChange={e => setForm(p => ({ ...p, detalhes: e.target.value }))} className="bg-secondary" /></div>
              <Button onClick={handleCreate} disabled={!form.nome_usuario || !form.valor} className="w-full">Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary h-9 text-sm" />
        </div>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-40 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos Status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="rejeitado">Rejeitado</SelectItem></SelectContent>
        </Select>
      </div>

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
                  <p className="text-[10px] text-muted-foreground">{d.plataforma_nome ?? "—"} · {d.pix ?? "Sem Pix"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon-green">{formatCurrency(Number(d.valor))}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(d.created_at), "dd/MM/yy HH:mm")}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusColors[d.status] ?? ""}`}>
                  {d.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Depositos;
