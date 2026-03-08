import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Upload, CheckCircle, XCircle, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePlatform } from "@/hooks/usePlatforms";
import { useCreateLog } from "@/hooks/useLogs";
import { useLogoUpload } from "@/hooks/useLogoUpload";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PlatformCategory = Database["public"]["Enums"]["platform_category"];

const categoryOptions: { value: PlatformCategory; label: string }[] = [
  { value: "chinese", label: "Chinesa" },
  { value: "brazilian", label: "Brasileira" },
  { value: "esports", label: "E-Sports" },
  { value: "casino", label: "Cassino" },
  { value: "sports", label: "Esportiva" },
  { value: "other", label: "Outro" },
];

const logoOptions = ["🎮", "🐉", "🐯", "🇧🇷", "👑", "🎰", "🔥", "🐼", "⚽", "🎲", "💎", "🏆"];

interface DiscoveryResult {
  health: boolean;
  stats: boolean;
  depositos: boolean;
  saques: boolean;
  latency: number;
  details: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const AddPlatformModal = ({ open, onClose }: Props) => {
  const { toast } = useToast();
  const createPlatform = useCreatePlatform();
  const createLog = useCreateLog();
  const { uploadLogo, uploading } = useLogoUpload();
  const api = usePlatformApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);

  const [form, setForm] = useState({
    nome: "", url: "", categoria: "other" as PlatformCategory, logo: "🎮", cor: "#00c4ff",
  });

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleAutoDiscovery = async () => {
    if (!form.url) return;
    setDiscovering(true);
    setDiscoveryResult(null);

    const baseUrl = form.url.replace(/\/$/, "");
    const apiUrl = baseUrl.endsWith("api.php") ? baseUrl : `${baseUrl}/api.php`;

    const details: string[] = [];

    const [health, stats, depositos, saques] = await Promise.all([
      api.testEndpoint(apiUrl, "health"),
      api.testEndpoint(apiUrl, "stats"),
      api.testEndpoint(apiUrl, "depositos"),
      api.testEndpoint(apiUrl, "saques"),
    ]);

    if (health.ok) details.push(`✅ health — ${health.latency_ms}ms`);
    else details.push(`❌ health — ${health.error}`);

    if (stats.ok) details.push(`✅ stats — ${stats.latency_ms}ms${stats.data ? ` · ${stats.data.total_usuarios} usuários` : ""}`);
    else details.push(`❌ stats — ${stats.error}`);

    if (depositos.ok) details.push(`✅ depositos — ${depositos.count ?? 0} registros`);
    else details.push(`❌ depositos — ${depositos.error}`);

    if (saques.ok) details.push(`✅ saques — ${saques.count ?? 0} registros`);
    else details.push(`❌ saques — ${saques.error}`);

    const maxLatency = Math.max(
      health.latency_ms ?? 0, stats.latency_ms ?? 0,
      depositos.latency_ms ?? 0, saques.latency_ms ?? 0
    );

    setDiscoveryResult({
      health: health.ok, stats: stats.ok,
      depositos: depositos.ok, saques: saques.ok,
      latency: maxLatency, details,
    });

    setDiscovering(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    try {
      const initialStatus = discoveryResult?.stats ? "online" : "offline";
      const result = await createPlatform.mutateAsync({ ...form, status: initialStatus as any });
      if (logoFile && result?.id) {
        const logoUrl = await uploadLogo(logoFile, result.id);
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("plataformas").update({ logo: logoUrl }).eq("id", result.id);
      }
      await createLog.mutateAsync({
        acao: "Plataforma Criada", detalhes: `${form.nome} adicionada — status: ${initialStatus}`,
        plataforma_nome: form.nome, tipo: "success",
      });
      toast({ title: "Plataforma criada!", description: `${form.nome} adicionada como ${initialStatus}.` });
      setLogoFile(null);
      setLogoPreview(null);
      setDiscoveryResult(null);
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (!open) return null;

  const allEndpointsOk = discoveryResult && discoveryResult.health && discoveryResult.stats && discoveryResult.depositos && discoveryResult.saques;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border glass"
          style={{ boxShadow: "0 25px 60px hsl(0 0% 0% / 0.5)" }}>
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div>
              <h2 className="font-bold text-lg text-foreground">Nova Plataforma</h2>
              <p className="text-xs text-muted-foreground">Adicione e teste automaticamente</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</Label>
                <Input value={form.nome} onChange={e => update("nome", e.target.value)} className="bg-secondary border-border h-9 text-sm" placeholder="Nome" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => update("categoria", v)}>
                  <SelectTrigger className="bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL + Auto Discovery */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL da API</Label>
              <div className="flex gap-2">
                <Input value={form.url} onChange={e => { update("url", e.target.value); setDiscoveryResult(null); }}
                  className="bg-secondary border-border h-9 text-sm font-mono flex-1" placeholder="https://dominio.com" />
                <Button type="button" variant="outline" size="sm" onClick={handleAutoDiscovery}
                  disabled={discovering || !form.url} className="h-9 text-xs gap-1.5 whitespace-nowrap">
                  {discovering ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                  {discovering ? "Testando..." : "Auto Detectar"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Endpoint: {form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "—"}</p>
            </div>

            {/* Discovery Results */}
            {discoveryResult && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border p-3 space-y-1.5 ${
                  allEndpointsOk ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[11px] font-bold ${allEndpointsOk ? "text-accent" : "text-destructive"}`}>
                    {allEndpointsOk ? "✅ API validada com sucesso!" : "⚠️ Problemas encontrados"}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">{discoveryResult.latency}ms</span>
                </div>
                {discoveryResult.details.map((d, i) => (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground">{d}</p>
                ))}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cor</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.cor} onChange={e => update("cor", e.target.value)}
                  className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent" />
                <Input value={form.cor} onChange={e => update("cor", e.target.value)} className="bg-secondary border-border h-9 text-sm mono flex-1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logo / Ícone</Label>
              <div className="flex gap-1 flex-wrap">
                {logoOptions.map(l => (
                  <button key={l} type="button" onClick={() => { update("logo", l); setLogoFile(null); setLogoPreview(null); }}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${!logoPreview && form.logo === l ? "bg-primary/20 ring-1 ring-primary" : "bg-secondary hover:bg-secondary/80"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
                <Upload className="w-3 h-3" /> Upload Logo
              </Button>
              {logoPreview && <img src={logoPreview} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-primary/30" />}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-border h-9 text-sm">Cancelar</Button>
              <Button type="submit" disabled={createPlatform.isPending || uploading} className="h-9 text-sm gap-2"
                style={{ background: "var(--gradient-primary)" }}>
                {(createPlatform.isPending || uploading) ? (
                  <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                ) : <Plus className="w-3.5 h-3.5" />}
                Criar Plataforma
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddPlatformModal;
