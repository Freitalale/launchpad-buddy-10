import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";

const typeIcons: Record<string, any> = {
  success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info,
};
const typeColors: Record<string, string> = {
  success: "text-neon-green", error: "text-neon-red", warning: "text-neon-amber", info: "text-primary",
};

const NotificationsDropdown = () => {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unread = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}
        className="w-8 h-8 text-muted-foreground hover:text-primary relative">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-red text-[9px] font-bold flex items-center justify-center"
            style={{ color: "white", boxShadow: "0 0 8px hsl(var(--neon-red) / 0.6)" }}>
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border/60 z-50"
              style={{ background: "hsl(var(--card))", boxShadow: "0 15px 40px hsl(0 0% 0% / 0.4)" }}
            >
              <div className="p-3 border-b border-border/50 flex items-center justify-between sticky top-0 z-10"
                style={{ background: "hsl(var(--card))" }}>
                <span className="text-sm font-bold text-foreground">Notificações</span>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()}
                    className="h-6 text-[10px] text-primary hover:text-primary gap-1">
                    <CheckCheck className="w-3 h-3" /> Marcar todas
                  </Button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Nenhuma notificação
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {notifications.slice(0, 20).map(n => {
                    const Icon = typeIcons[n.tipo] || Info;
                    const color = typeColors[n.tipo] || "text-primary";
                    return (
                      <div key={n.id}
                        onClick={() => !n.lida && markAsRead.mutate(n.id)}
                        className={`p-3 hover:bg-secondary/30 cursor-pointer transition-colors flex gap-3 ${!n.lida ? "bg-primary/5" : ""}`}>
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${!n.lida ? "text-foreground" : "text-muted-foreground"}`}>{n.titulo}</p>
                          {n.mensagem && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {n.plataforma_nome && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{n.plataforma_nome}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        {!n.lida && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;
