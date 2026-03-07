import { Heart, HeartCrack, Clock } from "lucide-react";
import { type CooperationInfo } from "@/hooks/useCooperation";

interface Props {
  info: CooperationInfo;
  compact?: boolean;
}

const urgencyStyles = {
  normal: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    icon: Heart,
    glow: "",
  },
  warning: {
    bg: "bg-neon-amber/10",
    border: "border-neon-amber/30",
    text: "text-neon-amber",
    icon: Clock,
    glow: "shadow-[0_0_8px_hsl(var(--neon-amber)/0.3)]",
  },
  critical: {
    bg: "bg-neon-red/10",
    border: "border-neon-red/30",
    text: "text-neon-red",
    icon: HeartCrack,
    glow: "shadow-[0_0_12px_hsl(var(--neon-red)/0.4)]",
  },
  expired: {
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    text: "text-destructive",
    icon: HeartCrack,
    glow: "",
  },
};

const CooperationBadge = ({ info, compact }: Props) => {
  if (!info.active && !info.expired) return null;

  const s = urgencyStyles[info.urgency];
  const Icon = s.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${s.bg} ${s.border} ${s.text} ${s.glow}`}>
        <Icon className="w-3 h-3" />
        {info.expired ? "Expirada" : `${info.daysRemaining}d`}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${s.bg} ${s.border} ${s.glow}`}>
      <Icon className={`w-4 h-4 ${s.text} ${info.urgency === "critical" ? "animate-pulse" : ""}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-bold ${s.text}`}>
          {info.expired
            ? "Cooperação Expirada!"
            : `${info.daysRemaining} dia${info.daysRemaining !== 1 ? "s" : ""} restante${info.daysRemaining !== 1 ? "s" : ""}`}
        </span>
        {info.expiresAt && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {info.expired ? "Expirou" : "Expira"} em {info.expiresAt.toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );
};

export default CooperationBadge;
