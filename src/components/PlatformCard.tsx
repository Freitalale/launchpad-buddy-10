import { motion } from "framer-motion";
import { MoreVertical, Settings, Wrench, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdatePlatform, type Plataforma } from "@/hooks/usePlatforms";
import { useCreateLog } from "@/hooks/useLogs";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { getCooperationInfo } from "@/hooks/useCooperation";
import CooperationBadge from "@/components/CooperationBadge";

const categoryLabels: Record<string, string> = {
  chinese: "Chinesa", brazilian: "Brasileira", esports: "E-Sports",
  casino: "Cassino", sports: "Esportiva", other: "Outro",
};

const statusClasses: Record<string, string> = {
  online: "bg-neon-green/10 text-neon-green border-neon-green/20",
  offline: "bg-muted text-muted-foreground border-border",
  error: "bg-neon-red/10 text-neon-red border-neon-red/20",
  warning: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
};

const statusLabel: Record<string, string> = {
  online: "Online", offline: "Offline", error: "Erro", warning: "Atenção",
};

interface PlatformCardProps {
  platform: Plataforma;
  index: number;
  onConfigure: (p: Plataforma) => void;
  onManage: (p: Plataforma) => void;
  onRemove: (p: Plataforma) => void;
  onEdit?: (p: Plataforma) => void;
}

const PlatformCard = ({ platform: p, index, onConfigure, onManage, onRemove, onEdit }: PlatformCardProps) => {
  const color = p.cor ?? "#00c4ff";
  const updatePlatform = useUpdatePlatform();
  const createLog = useCreateLog();
  const createNotification = useCreateNotification();
  const { toast } = useToast();
  const coopInfo = getCooperationInfo(p);

  const formatBalance = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
  const formatUsers = (v: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  const isOnline = p.status === "online";

  const handleToggle = async (checked: boolean) => {
    const newStatus = checked ? "online" : "offline";
    try {
      await updatePlatform.mutateAsync({ id: p.id, status: newStatus });
      await createLog.mutateAsync({
        acao: `Plataforma ${checked ? "Ativada" : "Desativada"}`,
        detalhes: `${p.nome} agora está ${newStatus}`,
        plataforma_id: p.id, plataforma_nome: p.nome,
        tipo: checked ? "success" : "warning",
      });
      toast({ title: `${p.nome} ${checked ? "ativada" : "desativada"}` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const isLogoUrl = p.logo && (p.logo.startsWith("http") || p.logo.startsWith("/"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border/70 p-5 flex flex-col gap-4 transition-all duration-300 group hover:border-opacity-100 relative overflow-hidden"
      style={{ background: "hsl(var(--card))", boxShadow: "0 4px 20px hsl(0 0% 0% / 0.15)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            {isLogoUrl ? (
              <img src={p.logo!} alt={p.nome} className="w-full h-full object-cover rounded-xl" />
            ) : (
              p.logo
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{p.nome}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                style={{ background: `${color}15`, color }}>
                {categoryLabels[p.categoria] ?? p.categoria}
              </span>
              <CooperationBadge info={coopInfo} compact />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={isOnline} onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-neon-green data-[state=unchecked]:bg-muted scale-75" />
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border ${statusClasses[p.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.status === "online" ? "status-online" : p.status === "error" ? "status-error" : p.status === "warning" ? "status-warning" : "status-offline"}`} />
            {statusLabel[p.status]}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={() => onConfigure(p)} className="text-sm gap-2 cursor-pointer">
                <Settings className="w-3.5 h-3.5" /> Configurar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManage(p)} className="text-sm gap-2 cursor-pointer">
                <Wrench className="w-3.5 h-3.5" /> Gerenciar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRemove(p)} className="text-sm gap-2 cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center px-2 py-2 rounded-lg bg-secondary/50">
          <p className="text-sm font-bold text-foreground">{formatUsers(p.total_usuarios ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Usuários</p>
        </div>
        <div className="text-center px-2 py-2 rounded-lg bg-secondary/50">
          <p className="text-sm font-bold text-foreground">{formatUsers(p.total_afiliados ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Afiliados</p>
        </div>
        <div className="text-center px-2 py-2 rounded-lg bg-secondary/50">
          <p className="text-sm font-bold text-foreground">{formatBalance(Number(p.saldo_total ?? 0))}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Saldo</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onConfigure(p)}
          className="flex-1 h-8 text-xs border-border hover:border-primary hover:text-primary gap-1.5 transition-all">
          <Settings className="w-3 h-3" /> Configurar
        </Button>
        <Button size="sm" onClick={() => onManage(p)}
          className="flex-1 h-8 text-xs gap-1.5"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          <Wrench className="w-3 h-3" /> Gerenciar
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/50 mono -mt-1">
        Sync: {new Date(p.ultimo_sync ?? p.created_at).toLocaleString("pt-BR")}
      </p>
    </motion.div>
  );
};

export default PlatformCard;
