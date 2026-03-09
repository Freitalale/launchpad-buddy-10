import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users as UsersIcon, Search, RefreshCw, UserPlus, Edit, Trash2, Shield, Star, Eye, ChevronDown, ChevronRight, Server, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useAuth } from "@/contexts/AuthContext";

interface RemoteUser {
  id: string | number;
  name: string;
  email?: string;
  phone?: string;
  balance?: number;
  platform_id: string;
  platform_name: string;
  is_affiliate?: boolean;
  created_at?: string;
}

const UsersPage = () => {
  const { toast } = useToast();
  const { data: platforms = [] } = usePlatforms();
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const allUsers: RemoteUser[] = [];

    const targetPlatforms = selectedPlatform === "all" ? platforms : platforms.filter(p => p.id === selectedPlatform);

    for (const p of targetPlatforms) {
      if (!p.url) continue;
      const baseUrl = p.url.replace(/\/$/, "");
      const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${apiUrl}?action=users`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json();
          const data = json.data ?? (Array.isArray(json) ? json : []);
          data.forEach((u: any) => {
            allUsers.push({
              id: u.id ?? u.ID ?? "?", name: u.name ?? u.nome ?? u.username ?? u.login ?? "Sem nome",
              email: u.email ?? u.mail ?? undefined, phone: u.phone ?? u.telefone ?? undefined,
              balance: u.balance !== undefined ? Number(u.balance) : undefined,
              platform_id: p.id, platform_name: p.nome,
              created_at: u.created_at ?? u.data ?? undefined,
            });
          });
        }
      } catch { /* skip */ }
    }

    setUsers(allUsers);
    setLoading(false);
    toast({ title: `${allUsers.length} usuários carregados`, description: `De ${targetPlatforms.filter(p => p.url).length} plataforma(s)` });
  }, [platforms, selectedPlatform, toast]);

  const filteredUsers = users.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q)) || (u.phone?.includes(q)) || String(u.id).includes(q);
    }
    return true;
  });

  const platformStats = platforms.map(p => ({
    id: p.id, name: p.nome, logo: p.logo,
    total: users.filter(u => u.platform_id === p.id).length,
    color: p.cor || "#00c4ff",
  })).sort((a, b) => b.total - a.total);

  const totalUniqueEmails = new Set(users.filter(u => u.email).map(u => u.email!.toLowerCase())).size;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight gradient-text">👥 Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de usuários de todas as plataformas conectadas</p>
        </div>
        <Button onClick={fetchUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Carregando..." : "Carregar Usuários"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Usuários", value: users.length, icon: UsersIcon, color: "text-primary" },
          { label: "Emails Únicos", value: totalUniqueEmails, icon: Star, color: "text-neon-green" },
          { label: "Plataformas", value: platforms.filter(p => p.url).length, icon: Server, color: "text-chart-4" },
          { label: "Com Saldo", value: users.filter(u => u.balance && u.balance > 0).length, icon: Crown, color: "text-neon-amber" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Platform Ranking */}
      {platformStats.length > 0 && users.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-sm font-bold text-foreground mb-3">🏆 Ranking de Plataformas por Usuários</p>
          <div className="space-y-2">
            {platformStats.map((ps, i) => (
              <div key={ps.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}º</span>
                <span className="text-lg">{ps.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground">{ps.name}</p>
                    <p className="text-xs font-bold" style={{ color: ps.color }}>{ps.total}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${platformStats[0].total > 0 ? (ps.total / platformStats[0].total * 100) : 0}%`,
                      background: ps.color,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nome, email, telefone ou ID..."
            className="pl-9 h-9 bg-secondary" />
        </div>
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-[180px] h-9 bg-secondary"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {platforms.filter(p => p.url).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-bold text-foreground">Nenhum usuário carregado</p>
          <p className="text-sm text-muted-foreground mb-4">Clique em "Carregar Usuários" para buscar os dados das plataformas conectadas.</p>
          <Button onClick={fetchUsers} disabled={loading} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Carregar Usuários
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/50">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">ID</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Nome</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Telefone</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Saldo</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Plataforma</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 200).map((user, i) => (
                  <tr key={`${user.platform_id}-${user.id}-${i}`} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-3 text-xs font-mono text-muted-foreground">{String(user.id).slice(0, 8)}</td>
                    <td className="p-3 text-xs font-semibold text-foreground">{user.name}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{user.email || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{user.phone || "—"}</td>
                    <td className="p-3 text-xs font-mono text-right hidden md:table-cell">
                      {user.balance !== undefined ? `R$ ${user.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="p-3"><Badge variant="secondary" className="text-[9px]">{user.platform_name}</Badge></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedUser(expandedUser === `${user.platform_id}-${user.id}` ? null : `${user.platform_id}-${user.id}`)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length > 200 && (
            <div className="p-3 text-center border-t border-border/50">
              <p className="text-xs text-muted-foreground">Exibindo 200 de {filteredUsers.length} usuários. Use os filtros para refinar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
