import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users as UsersIcon, Search, RefreshCw, UserPlus, Edit, Trash2, Shield, Star, Eye,
  ChevronDown, ChevronRight, Server, Crown, DollarSign, Phone, Mail, Calendar,
  UserCheck, UserX, Settings, Save, X, Copy, Ban, CheckCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePlatforms } from "@/hooks/usePlatforms";
import { supabase } from "@/integrations/supabase/client";
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
  is_admin?: boolean;
  status?: string;
  created_at?: string;
  last_login?: string;
  total_deposits?: number;
  total_withdrawals?: number;
  pix?: string;
}

interface AffiliateConfig {
  auto_affiliate: boolean;
  affiliate_commission: number;
  affiliate_min_deposit: number;
  affiliate_levels: number;
}

const UsersPage = () => {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { data: platforms = [] } = usePlatforms();
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RemoteUser>>({});
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  const [demoCount, setDemoCount] = useState(10);
  const [creatingDemo, setCreatingDemo] = useState(false);

  const [affiliateConfig, setAffiliateConfig] = useState<Record<string, AffiliateConfig>>({});

  const getApiUrl = (url: string) => {
    const baseUrl = url.replace(/\/$/, "");
    return baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api.php`;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const allUsers: RemoteUser[] = [];
    const targetPlatforms = selectedPlatform === "all" ? platforms : platforms.filter(p => p.id === selectedPlatform);

    for (const p of targetPlatforms) {
      if (!p.url) continue;
      const apiUrl = getApiUrl(p.url);
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
              id: u.id ?? u.ID ?? "?",
              name: u.name ?? u.nome ?? u.username ?? u.login ?? "Sem nome",
              email: u.email ?? u.mail ?? undefined,
              phone: u.phone ?? u.telefone ?? undefined,
              balance: u.balance !== undefined ? Number(u.balance) : undefined,
              platform_id: p.id,
              platform_name: p.nome,
              is_affiliate: u.is_affiliate ?? u.affiliate ?? u.afiliado ?? false,
              is_admin: u.is_admin ?? u.admin ?? false,
              status: u.status ?? "active",
              created_at: u.created_at ?? u.data ?? undefined,
              last_login: u.last_login ?? u.ultimo_login ?? undefined,
              total_deposits: u.total_deposits ?? u.total_depositos ?? undefined,
              total_withdrawals: u.total_withdrawals ?? u.total_saques ?? undefined,
              pix: u.pix ?? u.chave_pix ?? undefined,
            });
          });
        }
      } catch { /* skip */ }
    }

    setUsers(allUsers);
    setLoading(false);
    toast({ title: `${allUsers.length} usuários carregados`, description: `De ${targetPlatforms.filter(p => p.url).length} plataforma(s)` });
  }, [platforms, selectedPlatform, toast]);

  const handleEditUser = (user: RemoteUser) => {
    const key = `${user.platform_id}-${user.id}`;
    setEditingUser(key);
    setEditForm({ ...user });
    setExpandedUser(key);
  };

  const handleSaveUser = async (user: RemoteUser) => {
    const platform = platforms.find(p => p.id === user.platform_id);
    if (!platform?.url) { toast({ title: "Sem URL da plataforma", variant: "destructive" }); return; }
    const apiUrl = getApiUrl(platform.url);
    try {
      const res = await fetch(`${apiUrl}?action=update_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          balance: editForm.balance,
          is_affiliate: editForm.is_affiliate,
          is_admin: editForm.is_admin,
          status: editForm.status,
          pix: editForm.pix,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setUsers(prev => prev.map(u =>
            u.platform_id === user.platform_id && u.id === user.id
              ? { ...u, ...editForm }
              : u
          ));
          toast({ title: "✅ Usuário atualizado!" });
        } else {
          toast({ title: "Erro da API", description: json.error || "Falha ao atualizar", variant: "destructive" });
        }
      } else {
        toast({ title: `Erro HTTP ${res.status}`, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro de conexão", description: e.message, variant: "destructive" });
    }
    setEditingUser(null);
  };

  const handleToggleAffiliate = async (user: RemoteUser) => {
    const platform = platforms.find(p => p.id === user.platform_id);
    if (!platform?.url) return;
    const apiUrl = getApiUrl(platform.url);
    const newVal = !user.is_affiliate;
    try {
      await fetch(`${apiUrl}?action=update_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, is_affiliate: newVal }),
      });
      setUsers(prev => prev.map(u =>
        u.platform_id === user.platform_id && u.id === user.id
          ? { ...u, is_affiliate: newVal }
          : u
      ));
      toast({ title: newVal ? "✅ Marcado como afiliado" : "❌ Removido de afiliado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleAdmin = async (user: RemoteUser) => {
    const platform = platforms.find(p => p.id === user.platform_id);
    if (!platform?.url) return;
    const apiUrl = getApiUrl(platform.url);
    const newVal = !user.is_admin;
    try {
      await fetch(`${apiUrl}?action=update_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, is_admin: newVal }),
      });
      setUsers(prev => prev.map(u =>
        u.platform_id === user.platform_id && u.id === user.id
          ? { ...u, is_admin: newVal }
          : u
      ));
      toast({ title: newVal ? "✅ Promovido a admin" : "❌ Removido de admin" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (user: RemoteUser) => {
    if (!confirm(`Excluir usuário "${user.name}" da plataforma ${user.platform_name}?`)) return;
    const platform = platforms.find(p => p.id === user.platform_id);
    if (!platform?.url) return;
    const apiUrl = getApiUrl(platform.url);
    try {
      const res = await fetch(`${apiUrl}?action=delete_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => !(u.platform_id === user.platform_id && u.id === user.id)));
        toast({ title: "✅ Usuário excluído" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateDemoUsers = async () => {
    setCreatingDemo(true);
    const targetPlatforms = selectedPlatform === "all"
      ? platforms.filter(p => p.url)
      : platforms.filter(p => p.id === selectedPlatform && p.url);

    for (const p of targetPlatforms) {
      const apiUrl = getApiUrl(p.url!);
      try {
        await fetch(`${apiUrl}?action=create_demo_users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: demoCount }),
        });
      } catch { /* skip */ }
    }
    toast({ title: `✅ ${demoCount} contas demo criadas`, description: `Em ${targetPlatforms.length} plataforma(s)` });
    setCreatingDemo(false);
    fetchUsers();
  };

  const handleSaveAffiliateConfig = async (platformId: string) => {
    const config = affiliateConfig[platformId];
    if (!config) return;
    const platform = platforms.find(p => p.id === platformId);
    if (!platform?.url) return;
    const apiUrl = getApiUrl(platform.url);
    try {
      await fetch(`${apiUrl}?action=set_affiliate_config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      toast({ title: "✅ Configuração de afiliados salva!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterType === "affiliates" && !u.is_affiliate) return false;
    if (filterType === "admins" && !u.is_admin) return false;
    if (filterType === "with_balance" && (!u.balance || u.balance <= 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || String(u.id).includes(q) || u.pix?.includes(q);
    }
    return true;
  });

  const stats = {
    total: users.length,
    affiliates: users.filter(u => u.is_affiliate).length,
    admins: users.filter(u => u.is_admin).length,
    withBalance: users.filter(u => u.balance && u.balance > 0).length,
    totalBalance: users.reduce((s, u) => s + (u.balance || 0), 0),
    uniqueEmails: new Set(users.filter(u => u.email).map(u => u.email!.toLowerCase())).size,
  };

  const platformStats = platforms.map(p => ({
    id: p.id, name: p.nome, logo: p.logo,
    total: users.filter(u => u.platform_id === p.id).length,
    affiliates: users.filter(u => u.platform_id === p.id && u.is_affiliate).length,
    balance: users.filter(u => u.platform_id === p.id).reduce((s, u) => s + (u.balance || 0), 0),
    color: p.cor || "hsl(var(--primary))",
  })).sort((a, b) => b.total - a.total);

  const userKey = (u: RemoteUser) => `${u.platform_id}-${u.id}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight gradient-text">👥 Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento completo de usuários, afiliados e contas demo</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} disabled={loading} size="sm" className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Carregando..." : "Carregar"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: UsersIcon, color: "text-primary" },
          { label: "Afiliados", value: stats.affiliates, icon: UserCheck, color: "text-chart-2" },
          { label: "Admins", value: stats.admins, icon: Shield, color: "text-chart-4" },
          { label: "Com Saldo", value: stats.withBalance, icon: Crown, color: "text-chart-3" },
          { label: "Emails Únicos", value: stats.uniqueEmails, icon: Mail, color: "text-chart-5" },
          { label: "Saldo Total", value: `R$ ${stats.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="users" className="gap-1.5 text-xs"><UsersIcon className="w-3.5 h-3.5" /> Usuários</TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-1.5 text-xs"><UserCheck className="w-3.5 h-3.5" /> Afiliados</TabsTrigger>
          <TabsTrigger value="demo" className="gap-1.5 text-xs"><UserPlus className="w-3.5 h-3.5" /> Contas Demo</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5 text-xs"><Star className="w-3.5 h-3.5" /> Ranking</TabsTrigger>
        </TabsList>

        {/* === USERS TAB === */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar nome, email, telefone, PIX, ID..."
                className="pl-9 h-9 bg-secondary" />
            </div>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[170px] h-9 bg-secondary"><SelectValue placeholder="Plataforma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {platforms.filter(p => p.url).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-9 bg-secondary"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="affiliates">Afiliados</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
                <SelectItem value="with_balance">Com Saldo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {users.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-bold text-foreground">Nenhum usuário carregado</p>
              <p className="text-sm text-muted-foreground mb-4">Clique em "Carregar" para buscar dados das plataformas.</p>
              <Button onClick={fetchUsers} disabled={loading} className="gap-2"><RefreshCw className="w-4 h-4" /> Carregar</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/50">
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground">ID</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground">Nome</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground hidden lg:table-cell">Telefone</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground hidden md:table-cell">Saldo</th>
                      <th className="text-center p-3 text-[10px] font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground">Plat.</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 200).map((u, i) => {
                      const key = userKey(u);
                      const isExpanded = expandedUser === key;
                      const isEditing = editingUser === key;

                      return (
                        <>
                          <tr key={key} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                            <td className="p-3 text-[10px] font-mono text-muted-foreground">{String(u.id).slice(0, 8)}</td>
                            <td className="p-3 text-xs font-semibold text-foreground">{u.name}</td>
                            <td className="p-3 text-[10px] text-muted-foreground hidden md:table-cell">{u.email || "—"}</td>
                            <td className="p-3 text-[10px] text-muted-foreground hidden lg:table-cell">{u.phone || "—"}</td>
                            <td className="p-3 text-[10px] font-mono text-right hidden md:table-cell">
                              {u.balance !== undefined ? `R$ ${u.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {u.is_affiliate && <Badge variant="outline" className="text-[8px] px-1 border-chart-2 text-chart-2">AF</Badge>}
                                {u.is_admin && <Badge variant="outline" className="text-[8px] px-1 border-chart-4 text-chart-4">AD</Badge>}
                                {!u.is_affiliate && !u.is_admin && <Badge variant="outline" className="text-[8px] px-1">USR</Badge>}
                              </div>
                            </td>
                            <td className="p-3"><Badge variant="secondary" className="text-[8px]">{u.platform_name}</Badge></td>
                            <td className="p-3 text-right">
                              <div className="flex gap-0.5 justify-end">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedUser(isExpanded ? null : key)} title="Detalhes">
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditUser(u)} title="Editar">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleToggleAffiliate(u)}
                                  title={u.is_affiliate ? "Remover afiliado" : "Tornar afiliado"}>
                                  {u.is_affiliate ? <UserX className="w-3 h-3 text-destructive" /> : <UserCheck className="w-3 h-3 text-chart-2" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDeleteUser(u)} title="Excluir">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row */}
                          {isExpanded && (
                            <tr key={`${key}-exp`}>
                              <td colSpan={8} className="p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                  className="bg-secondary/30 border-b border-border/30 p-4">
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <p className="text-xs font-bold text-foreground">✏️ Editando Usuário</p>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Nome</label>
                                          <Input className="h-8 text-xs" value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Email</label>
                                          <Input className="h-8 text-xs" value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Telefone</label>
                                          <Input className="h-8 text-xs" value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">PIX</label>
                                          <Input className="h-8 text-xs" value={editForm.pix || ""} onChange={e => setEditForm(f => ({ ...f, pix: e.target.value }))} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Saldo (R$)</label>
                                          <Input className="h-8 text-xs" type="number" step="0.01" value={editForm.balance ?? 0}
                                            onChange={e => setEditForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))} />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Status</label>
                                          <Select value={editForm.status || "active"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="active">Ativo</SelectItem>
                                              <SelectItem value="blocked">Bloqueado</SelectItem>
                                              <SelectItem value="suspended">Suspenso</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex items-end gap-4">
                                          <label className="flex items-center gap-2 text-[10px]">
                                            <Switch checked={editForm.is_affiliate || false} onCheckedChange={v => setEditForm(f => ({ ...f, is_affiliate: v }))} />
                                            Afiliado
                                          </label>
                                          <label className="flex items-center gap-2 text-[10px]">
                                            <Switch checked={editForm.is_admin || false} onCheckedChange={v => setEditForm(f => ({ ...f, is_admin: v }))} />
                                            Admin
                                          </label>
                                        </div>
                                        <div className="flex items-end gap-2">
                                          <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => handleSaveUser(u)}>
                                            <Save className="w-3 h-3" /> Salvar
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setEditingUser(null)}>
                                            <X className="w-3 h-3" /> Cancelar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">ID Completo</p>
                                        <p className="text-xs font-mono text-foreground flex items-center gap-1">
                                          {String(u.id)}
                                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { navigator.clipboard.writeText(String(u.id)); toast({ title: "ID copiado" }); }}>
                                            <Copy className="w-2.5 h-2.5" />
                                          </Button>
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Email</p>
                                        <p className="text-xs text-foreground">{u.email || "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Telefone</p>
                                        <p className="text-xs text-foreground">{u.phone || "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">PIX</p>
                                        <p className="text-xs font-mono text-foreground">{u.pix || "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Saldo</p>
                                        <p className="text-xs font-bold text-primary">
                                          {u.balance !== undefined ? `R$ ${u.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Cadastro</p>
                                        <p className="text-xs text-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Último Login</p>
                                        <p className="text-xs text-foreground">{u.last_login ? new Date(u.last_login).toLocaleDateString("pt-BR") : "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Status</p>
                                        <Badge variant={u.status === "active" ? "default" : "destructive"} className="text-[9px]">
                                          {u.status || "active"}
                                        </Badge>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Depósitos</p>
                                        <p className="text-xs text-foreground">{u.total_deposits !== undefined ? `R$ ${u.total_deposits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "N/A"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-muted-foreground">Saques</p>
                                        <p className="text-xs text-foreground">{u.total_withdrawals !== undefined ? `R$ ${u.total_withdrawals.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "N/A"}</p>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleEditUser(u)}>
                                          <Edit className="w-3 h-3" /> Editar
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleToggleAdmin(u)}>
                                          <Shield className="w-3 h-3" /> {u.is_admin ? "Remover Admin" : "Tornar Admin"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length > 200 && (
                <div className="p-3 text-center border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Exibindo 200 de {filteredUsers.length}. Use os filtros para refinar.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* === AFFILIATES TAB === */}
        <TabsContent value="affiliates" className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
            <p className="text-sm font-bold text-foreground">⚙️ Configurações de Afiliados por Plataforma</p>
            <p className="text-xs text-muted-foreground">Configure se novos usuários devem ser automaticamente marcados como afiliados, comissões e níveis.</p>

            {platforms.filter(p => p.url).map(p => {
              const config = affiliateConfig[p.id] || { auto_affiliate: false, affiliate_commission: 10, affiliate_min_deposit: 0, affiliate_levels: 1 };
              return (
                <div key={p.id} className="rounded-lg border border-border/50 bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.logo}</span>
                      <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                    </div>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSaveAffiliateConfig(p.id)}>
                      <Save className="w-3 h-3" /> Salvar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch checked={config.auto_affiliate}
                          onCheckedChange={v => setAffiliateConfig(prev => ({ ...prev, [p.id]: { ...config, auto_affiliate: v } }))} />
                        Auto-afiliado ao cadastrar
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-1">Novos usuários viram afiliados automaticamente</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Comissão (%)</label>
                      <Input className="h-8 text-xs" type="number" value={config.affiliate_commission}
                        onChange={e => setAffiliateConfig(prev => ({ ...prev, [p.id]: { ...config, affiliate_commission: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Depósito Mínimo (R$)</label>
                      <Input className="h-8 text-xs" type="number" value={config.affiliate_min_deposit}
                        onChange={e => setAffiliateConfig(prev => ({ ...prev, [p.id]: { ...config, affiliate_min_deposit: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Níveis de Afiliado</label>
                      <Input className="h-8 text-xs" type="number" min={1} max={5} value={config.affiliate_levels}
                        onChange={e => setAffiliateConfig(prev => ({ ...prev, [p.id]: { ...config, affiliate_levels: Number(e.target.value) } }))} />
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Afiliados: <strong className="text-foreground">{users.filter(u => u.platform_id === p.id && u.is_affiliate).length}</strong></span>
                    <span>Total usuários: <strong className="text-foreground">{users.filter(u => u.platform_id === p.id).length}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* === DEMO TAB === */}
        <TabsContent value="demo" className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div>
              <p className="text-sm font-bold text-foreground">🧪 Criar Contas Demo em Massa</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gera usuários de teste pré-configurados na(s) plataforma(s) selecionada(s). Os dados são criados via endpoint <code className="bg-secondary px-1 rounded">?action=create_demo_users</code>.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Quantidade</label>
                <Input className="h-8 text-xs" type="number" min={1} max={100} value={demoCount} onChange={e => setDemoCount(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Plataforma</label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {platforms.filter(p => p.url).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateDemoUsers} disabled={creatingDemo} className="h-8 gap-2 text-xs">
                  <UserPlus className="w-3.5 h-3.5" />
                  {creatingDemo ? "Criando..." : `Criar ${demoCount} Demo`}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] font-bold text-foreground mb-1">💡 Como funciona</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>O api.php deve ter a action <code className="bg-background px-1 rounded">create_demo_users</code> implementada</li>
                <li>Usuários demo são criados com nomes aleatórios e saldo zero</li>
                <li>Após criar, clique em "Carregar" para visualizar</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* === RANKING TAB === */}
        <TabsContent value="ranking" className="space-y-4">
          {platformStats.length > 0 && users.length > 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-sm font-bold text-foreground mb-4">🏆 Ranking de Plataformas</p>
              <div className="space-y-3">
                {platformStats.map((ps, i) => (
                  <div key={ps.id} className="rounded-lg border border-border/30 bg-secondary/20 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-muted-foreground w-8">{i + 1}º</span>
                      <span className="text-xl">{ps.logo}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-foreground">{ps.name}</p>
                          <p className="text-sm font-bold" style={{ color: ps.color }}>{ps.total} usuários</p>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${platformStats[0].total > 0 ? (ps.total / platformStats[0].total * 100) : 0}%`,
                            background: ps.color,
                          }} />
                        </div>
                        <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                          <span>Afiliados: <strong>{ps.affiliates}</strong></span>
                          <span>Saldo total: <strong>R$ {ps.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-bold text-foreground">Carregue os usuários primeiro</p>
              <p className="text-sm text-muted-foreground">O ranking será gerado automaticamente.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsersPage;
