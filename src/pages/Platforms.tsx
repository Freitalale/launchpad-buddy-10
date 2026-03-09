import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExportButtons from "@/components/ExportButtons";
import PlatformCard from "@/components/PlatformCard";
import ConfigureModal from "@/components/ConfigureModal";
import ManageModal from "@/components/ManageModal";
import AddPlatformModal from "@/components/AddPlatformModal";
import EditPlatformModal from "@/components/EditPlatformModal";
import { usePlatforms, useDeletePlatform, type Plataforma } from "@/hooks/usePlatforms";
import { useCreateLog } from "@/hooks/useLogs";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PlatformCategory = Database["public"]["Enums"]["platform_category"];
type PlatformStatus = Database["public"]["Enums"]["platform_status"];

const categories: Array<{ value: "all" | PlatformCategory; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "chinese", label: "Chinesas" },
  { value: "brazilian", label: "Brasileiras" },
  { value: "esports", label: "E-Sports" },
  { value: "casino", label: "Cassino" },
  { value: "sports", label: "Esportivas" },
  { value: "other", label: "Outros" },
];

const categoryLabels: Record<string, string> = {
  chinese: "Chinesa", brazilian: "Brasileira", esports: "E-Sports",
  casino: "Cassino", sports: "Esportiva", other: "Outro",
};

const Platforms = () => {
  const { toast } = useToast();
  const { data: platforms = [], isLoading } = usePlatforms();
  const deletePlatform = useDeletePlatform();
  const createLog = useCreateLog();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | PlatformCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PlatformStatus>("all");
  const [configuring, setConfiguring] = useState<Plataforma | null>(null);
  const [managing, setManaging] = useState<Plataforma | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Plataforma | null>(null);

  const filtered = platforms.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || (p.url ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.categoria === category;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const exportData = filtered.map(p => ({
    Nome: p.nome, Categoria: categoryLabels[p.categoria] ?? p.categoria,
    Status: p.status, Usuários: p.total_usuarios ?? 0, Afiliados: p.total_afiliados ?? 0,
    Saldo: Number(p.saldo_total ?? 0), URL: p.url ?? "",
  }));

  const handleRemove = async (p: Plataforma) => {
    try {
      await deletePlatform.mutateAsync(p.id);
      await createLog.mutateAsync({
        acao: "Plataforma Removida", detalhes: `${p.nome} removida do painel`,
        plataforma_nome: p.nome, tipo: "warning",
      });
      toast({ title: "Plataforma removida", description: `${p.nome} foi removida.`, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Plataformas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{platforms.length} cadastradas · {filtered.length} exibidas</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons data={exportData} filename="plataformas" title="Master Painel Pro — Plataformas" />
          <Button onClick={() => setAddOpen(true)} className="gap-2 h-9 text-sm"
            style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))", boxShadow: "0 0 15px hsl(var(--neon-blue) / 0.3)" }}>
            <Plus className="w-4 h-4" /> Nova Plataforma
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary border-border text-sm" placeholder="Buscar plataforma..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "online", "error", "offline"] as const).map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className={`h-9 text-xs capitalize ${statusFilter === s ? "" : "border-border text-muted-foreground hover:text-foreground"}`}
                style={statusFilter === s ? { background: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.4)" } : {}}>
                {{ all: "Todos", online: "Online", error: "Erro/Atenção", offline: "Offline" }[s]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground self-center" />
          {categories.map(({ value, label }) => (
            <button key={value} onClick={() => setCategory(value)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                category === value
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-secondary text-muted-foreground border border-border/50 hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma plataforma encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Plataforma" para adicionar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <PlatformCard key={p.id} platform={p} index={i}
              onConfigure={setConfiguring} onManage={setManaging} onRemove={handleRemove} />
          ))}
        </div>
      )}

      {configuring && <ConfigureModal platform={configuring} onClose={() => setConfiguring(null)} />}
      {managing && <ManageModal platform={managing} onClose={() => setManaging(null)} />}
      <AddPlatformModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default Platforms;
