import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Trash2, BarChart3, Users, UserX, Handshake, AlertTriangle, Heart, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdatePlatform, type Plataforma } from "@/hooks/usePlatforms";
import { useCreateLog } from "@/hooks/useLogs";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { getCooperationInfo } from "@/hooks/useCooperation";
import CooperationBadge from "@/components/CooperationBadge";

interface ManageModalProps {
  platform: Plataforma | null;
  onClose: () => void;
}

const ManageModal = ({ platform, onClose }: ManageModalProps) => {
  const { toast } = useToast();
  const updatePlatform = useUpdatePlatform();
  const createLog = useCreateLog();
  const createNotification = useCreateNotification();
  const [balanceAmount, setBalanceAmount] = useState("");
  const [cooperationDays, setCooperationDays] = useState("30");
  const [data, setData] = useState<Plataforma | null>(platform);

  if (!platform || !data) return null;

  const coopInfo = getCooperationInfo(data);
  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleBalance = async (positive: boolean) => {
    const amt = Number(balanceAmount);
    if (!amt) return;
    const diff = positive ? Math.abs(amt) : -Math.abs(amt);
    const newBalance = Math.max(0, Number(data.saldo_total ?? 0) + diff);
    try {
      await updatePlatform.mutateAsync({ id: data.id, saldo_total: newBalance });
      setData(prev => prev ? { ...prev, saldo_total: newBalance } : prev);
      toast({ title: `Saldo ${positive ? "adicionado" : "removido"}` });
      setBalanceAmount("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleCooperation = async () => {
    const days = Number(cooperationDays);
    if (!days || days <= 0) return;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    const expiryStr = expiry.toISOString().split("T")[0];
    try {
      await updatePlatform.mutateAsync({ id: data.id, cooperacao_dias: days, cooperacao_expira: expiryStr });
      setData(prev => prev ? { ...prev, cooperacao_dias: days, cooperacao_expira: expiryStr } : prev);
      toast({ title: "Cooperação ativada!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border glass p-6 space-y-5"
        style={{ boxShadow: "0 25px 60px hsl(0 0% 0% / 0.5)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">Gerenciar — {platform.nome}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {(coopInfo.active || coopInfo.expired) && <CooperationBadge info={coopInfo} />}

        <div className="rounded-xl border border-border/60 p-4 space-y-3" style={{ background: "hsl(var(--secondary))" }}>
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Gestão de Saldo — {formatBRL(Number(data.saldo_total ?? 0))}
          </p>
          <div className="flex gap-2">
            <Input value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)}
              className="bg-card border-border h-9 text-sm mono" placeholder="0.00" type="number" />
            <Button size="sm" onClick={() => handleBalance(true)}
              className="h-9 px-4 text-xs gap-1.5 bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
            <Button size="sm" onClick={() => handleBalance(false)}
              className="h-9 px-4 text-xs gap-1.5 bg-neon-red/20 text-neon-red border border-neon-red/30 hover:bg-neon-red/30">
              <Minus className="w-3.5 h-3.5" /> Rem
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-4 space-y-3" style={{ background: "hsl(var(--secondary))" }}>
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" /> Cooperação
          </p>
          <div className="flex gap-2">
            <Input value={cooperationDays} onChange={e => setCooperationDays(e.target.value)}
              className="bg-card border-border h-9 text-sm" placeholder="30" type="number" />
            <Button size="sm" onClick={handleCooperation}
              className="h-9 px-4 text-xs gap-1.5"
              style={{ background: "hsl(var(--neon-blue) / 0.2)", color: "hsl(var(--neon-blue))", border: "1px solid hsl(var(--neon-blue) / 0.3)" }}>
              <Heart className="w-3 h-3" /> Ativar
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="border-border h-9 text-sm">Fechar</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ManageModal;
