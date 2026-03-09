import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Search, Filter, CheckCircle, XCircle, TrendingDown, Clock, Ban, AlertTriangle, Zap } from "lucide-react";
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
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  pendente: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
  aprovado: "bg-neon-green/10 text-neon-green border-neon-green/20",
  rejeitado: "bg-neon-red/10 text-neon-red border-neon-red/20",
};

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = saques.filter(s => {
    if (search && !s.nome_usuario.toLowerCase().includes(search.toLowerCase()) && !(s.pix ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlat !== "all" && s.plataforma_id !== filterPlat) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const handleAction = async (saque: typeof saques[0], status: string) => {
    setActionLoading(saque.id);
    try {
      if (saque.plataforma_id) {
        const platform = platforms.find(p => p.id === saque.plataforma_id);
        if (platform) {
          const remoteId = saque.original_id || saque.id;

          // Step 1: If approving, try gateway execution first
          if (status === "aprovado") {
            const gatewayResult = await adapterRegistry.executeGatewayPayment(platform, {
              id: remoteId,
              user_name: saque.nome_usuario,
              amount: Number(saque.valor),
              pix: saque.pix ?? undefined,
            });

            if (!gatewayResult.success && adapterRegistry.getConfig(platform).gateway) {
              const reason = classifyWithdrawError(gatewayResult.error_message ?? "");
              const errorLabel = ERROR_LABELS[reason];
              
              toast({
                title: `❌ ${errorLabel}`,
                description: `Plataforma: ${platform.nome} · Usuário: ${saque.nome_usuario} · Valor: R$ ${Number(saque.valor).toFixed(2)} · ${gatewayResult.error_message}`,
                variant: "destructive",
              });

              // Log the error
              await createLog.mutateAsync({
                acao: "Erro Gateway Saque",
                detalhes: `${errorLabel} — ${platform.nome} — ${saque.nome_usuario} — R$ ${Number(saque.valor).toFixed(2)} — ${gatewayResult.error_message}`,
                plataforma_nome: platform.nome,
                plataforma_id: platform.id,
                tipo: "error",
                valor: Number(saque.valor),
                usuario: saque.nome_usuario,
              });

              // Notification
              if (user) {
                await supabase.from("notificacoes").insert({
                  user_id: user.id,
                  titulo: `❌ Erro ao aprovar saque`,
                  mensagem: `${errorLabel}\nPlataforma: ${platform.nome}\nUsuário: ${saque.nome_usuario}\nValor: R$ ${Number(saque.valor).toFixed(2)}\nMotivo: ${gatewayResult.error_message}`,
                  tipo: "error",
                  plataforma_nome: platform.nome,
                  plataforma_id: platform.id,
                } as any);
              }

              setActionLoading(null);
              return; // DON'T change status if gateway fails
            }
          }

          // Step 2: Update remote platform DB via PHP API
          console.log(`[Saque V7] Enviando ${status} para plataforma ${platform.nome}, remoteId=${remoteId}`);
          const success = status === "aprovado"
            ? await api.aprovarSaque(platform, remoteId)
            : await api.rejeitarSaque(platform, remoteId);

          if (!success) {
            toast({
              title: "❌ Falha no banco remoto",
              description: `Não foi possível ${status === "aprovado" ? "aprovar" : "rejeitar"} na plataforma ${platform.nome}. Status local NÃO alterado.`,
              variant: "destructive",
            });
            setActionLoading(null);
            return;
          }
          console.log(`[Saque V7] ✅ Remoto atualizado: ${remoteId}`);
        }
      }

      // Step 3: Update local Supabase
      await updateSaque.mutateAsync({ id: saque.id, status });

      // Step 4: Log success
      await createLog.mutateAsync({
        acao: status === "aprovado" ? "Saque Aprovado" : "Saque Rejeitado",
        detalhes: `${saque.nome_usuario} — R$ ${Number(saque.valor).toFixed(2)} — ${saque.plataforma_nome ?? ""}`,
        plataforma_nome: saque.plataforma_nome,
        plataforma_id: saque.plataforma_id,
        tipo: status === "aprovado" ? "success" : "warning",
        valor: Number(saque.valor),
        usuario: saque.nome_usuario,
      });

      toast({ title: status === "aprovado" ? "✅ Saque aprovado e executado!" : "❌ Saque rejeitado" });
    } catch (e: any) {
      console.error(`[Saque V7] ❌ Erro:`, e);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const totalValor = filtered.reduce((s, d) => s + Number(d.valor), 0);
  const aprovados = filtered.filter(s => s.status === "aprovado");
  const pendentes = filtered.filter(s => s.status === "pendente");
  const rejeitados = filtered.filter(s => s.status === "rejeitado");
  const totalAprovados = aprovados.reduce((s, d) => s + Number(d.valor), 0);
  const totalPendentes = pendentes.reduce((s, d) => s + Number(d.valor), 0);
  const totalRejeitados = rejeitados.reduce((s, d) => s + Number(d.valor), 0);
  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const exportData = filtered.map(s => ({
    Usuário: s.nome_usuario, Valor: Number(s.valor), PIX: s.pix ?? "",
    Status: s.status, Plataforma: s.plataforma_nome ?? "",
    Data: format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
  }));

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground">Saques <span className="gradient-text">& Retiradas V7</span></h1>
          <p className="text-muted-foreground text-sm mt-0.5">Motor Universal de Execução — Gateway + API + Logs</p>
        </div>
        <ExportButtons data={exportData} filename="saques" title="Relatório de Saques" />
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/60 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-neon-amber" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Total Geral</span>
          </div>
          <p className="text-lg font-black text-neon-amber">{formatCurrency(totalValor)}</p>
          <p className="text-[10px] text-muted-foreground">{filtered.length} saques</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-neon-green/20 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-neon-green" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Aprovados</span>
          </div>
          <p className="text-lg font-black text-neon-green">{formatCurrency(totalAprovados)}</p>
          <p className="text-[10px] text-muted-foreground">{aprovados.length} executados</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-neon-amber/20 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-neon-amber" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Pendentes</span>
          </div>
          <p className="text-lg font-black text-neon-amber">{formatCurrency(totalPendentes)}</p>
          <p className="text-[10px] text-muted-foreground">{pendentes.length} aguardando</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-neon-red/20 p-4" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-2 mb-1">
            <Ban className="w-4 h-4 text-neon-red" />
            <span className="text-xs text-muted-foreground font-semibold uppercase">Rejeitados</span>
          </div>
          <p className="text-lg font-black text-neon-red">{formatCurrency(totalRejeitados)}</p>
          <p className="text-[10px] text-muted-foreground">{rejeitados.length} rejeitados</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário ou PIX..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary h-9 text-sm" />
        </div>
        <Select value={filterPlat} onValueChange={setFilterPlat}>
          <SelectTrigger className="w-44 bg-secondary h-9 text-sm"><Filter className="w-3 h-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Plataformas</SelectItem>{platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos Status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="rejeitado">Rejeitado</SelectItem></SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
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
            {filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neon-amber/10 flex-shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-neon-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{s.nome_usuario}</p>
                  <p className="text-[10px] text-muted-foreground">{s.plataforma_nome ?? "—"} · Pix: {s.pix ?? "—"}</p>
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
                      title="Aprovar & Executar">
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Saques;
