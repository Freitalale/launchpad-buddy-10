import { useEffect, useState } from "react";
import { useNavigate, Outlet, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Server, ScrollText, Settings, LogOut, Zap, ChevronRight, Globe,
  Menu, X, PanelLeftClose, PanelLeft, Bell, Activity, DollarSign, ArrowUpRight,
  Headphones, BookOpen, Users, ShieldAlert, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/platforms", label: "Plataformas", icon: Server },
  { to: "/users", label: "Usuários", icon: Users },
  { to: "/depositos", label: "Depósitos", icon: DollarSign },
  { to: "/saques", label: "Saques", icon: ArrowUpRight },
  { to: "/sacs", label: "SACs", icon: Headphones },
  { to: "/errors", label: "Erros", icon: ShieldAlert },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/notification-logs", label: "Logs Notificações", icon: MessageSquare },
  { to: "/integrations", label: "Notificações", icon: Bell },
  { to: "/test-suite", label: "Teste Geral", icon: Activity },
  { to: "/health", label: "Diagnóstico", icon: Activity },
  { to: "/settings", label: "Configurações", icon: Settings },
  { to: "/tutorial", label: "Tutorial", icon: BookOpen },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarContent = (
    <>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-blue)), transparent)" }} />

      <div className={`p-4 ${collapsed ? "px-2" : "p-6"} border-b border-border/30`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(var(--neon-green)))", boxShadow: "0 0 15px hsl(var(--neon-blue) / 0.4)" }}>
            <Zap className="w-4 h-4 text-background" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-black text-sm tracking-tight gradient-text">MASTER PAINEL</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">V7 Enterprise</p>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full status-online animate-pulse-slow" />
          <span className="text-xs text-muted-foreground">Sistema Online</span>
          <Globe className="w-3 h-3 text-muted-foreground ml-auto" />
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 mt-2">
        {!collapsed && <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-3 mb-3 font-medium">Menu Principal</p>}
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
          return (
            <NavLink key={to} to={to}>
              {() => (
                <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active ? "text-primary bg-primary/10 neon-border-blue" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                  title={collapsed ? label : undefined}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className={`flex-1 ${collapsed ? "hidden" : ""}`}>{label}</span>
                  <span className={collapsed || !active ? "hidden" : ""}><ChevronRight className="w-3 h-3 text-primary/60" /></span>
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/30 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/40">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(var(--neon-green)))" }}>
              {user?.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.email?.split("@")[0]}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}
          className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9`}
          title={collapsed ? "Sair" : undefined}>
          <LogOut className="w-3.5 h-3.5" /> <span>{!collapsed ? "Sair" : ""}</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex min-h-screen flex-col border-r border-border/50 relative overflow-hidden"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden flex flex-col border-r border-border/50 relative"
              style={{ background: "hsl(var(--sidebar-background))" }}
            >
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 text-muted-foreground z-10">
                <X className="w-4 h-4" />
              </Button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 md:px-6 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden w-8 h-8 text-muted-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex w-8 h-8 text-muted-foreground" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            <div className="text-sm text-muted-foreground">
              {navItems.find(n => location.pathname.startsWith(n.to))?.label ?? "Painel"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationsDropdown />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/50">
              <div className="w-2 h-2 rounded-full status-online" />
              <span className="text-xs text-muted-foreground mono">v7.0.0</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
