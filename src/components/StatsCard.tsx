import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "blue" | "green" | "amber" | "red" | "purple";
  delay?: number;
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  blue: {
    glow: "hsl(var(--neon-blue))",
    bg: "hsl(var(--neon-blue) / 0.1)",
    border: "hsl(var(--neon-blue) / 0.3)",
    text: "hsl(var(--neon-blue))",
    shadow: "0 0 20px hsl(var(--neon-blue) / 0.2)",
  },
  green: {
    glow: "hsl(var(--neon-green))",
    bg: "hsl(var(--neon-green) / 0.1)",
    border: "hsl(var(--neon-green) / 0.3)",
    text: "hsl(var(--neon-green))",
    shadow: "0 0 20px hsl(var(--neon-green) / 0.2)",
  },
  amber: {
    glow: "hsl(var(--neon-amber))",
    bg: "hsl(var(--neon-amber) / 0.1)",
    border: "hsl(var(--neon-amber) / 0.3)",
    text: "hsl(var(--neon-amber))",
    shadow: "0 0 20px hsl(var(--neon-amber) / 0.2)",
  },
  red: {
    glow: "hsl(var(--neon-red))",
    bg: "hsl(var(--neon-red) / 0.1)",
    border: "hsl(var(--neon-red) / 0.3)",
    text: "hsl(var(--neon-red))",
    shadow: "0 0 20px hsl(var(--neon-red) / 0.2)",
  },
  purple: {
    glow: "hsl(var(--neon-purple))",
    bg: "hsl(var(--neon-purple) / 0.1)",
    border: "hsl(var(--neon-purple) / 0.3)",
    text: "hsl(var(--neon-purple))",
    shadow: "0 0 20px hsl(var(--neon-purple) / 0.2)",
  },
};

const StatsCard = ({ title, value, subtitle, icon: Icon, color, delay = 0, trend }: StatsCardProps) => {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3, boxShadow: c.shadow }}
      className="rounded-xl p-5 border transition-all duration-300 relative overflow-hidden cursor-default"
      style={{ background: "hsl(var(--card))", borderColor: c.border, boxShadow: `0 4px 20px hsl(0 0% 0% / 0.2)` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: c.glow, transform: "translate(40%, -40%)" }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg" style={{ background: c.bg }}>
            <Icon className="w-4 h-4" style={{ color: c.text }} />
          </div>
          {trend && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend.positive ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"}`}>
              {trend.positive ? "+" : ""}{trend.value}
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-foreground mb-0.5" style={{ textShadow: `0 0 20px ${c.glow}33` }}>{value}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

export default StatsCard;
