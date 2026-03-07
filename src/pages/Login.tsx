import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Zap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message === "Invalid login credentials" ? "Email ou senha inválidos." : error.message);
        setLoading(false);
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess("Conta criada! Verifique seu email para confirmar.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--neon-blue))" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.08] blur-3xl" style={{ background: "hsl(var(--neon-green))" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md px-4">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(var(--neon-green)))", boxShadow: "0 0 30px hsl(var(--neon-blue) / 0.5)" }}>
            <Zap className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="gradient-text">Master</span>
            <span className="text-foreground"> Painel</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerenciamento Ultra Profissional de Plataformas</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-8 neon-border-blue">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {mode === "login" ? "Acesso Seguro" : "Criar Conta"}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground font-medium text-sm">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="bg-secondary border-border text-foreground h-11 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="seu@email.com" required />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium text-sm">Senha</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground h-11 pr-10 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green text-sm">
                {success}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 font-semibold text-sm transition-all duration-300"
              style={{ background: "linear-gradient(135deg, hsl(var(--neon-blue)), hsl(220 100% 60%))", boxShadow: "0 0 20px hsl(var(--neon-blue) / 0.3)" }}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                  {mode === "login" ? "Autenticando..." : "Criando conta..."}
                </div>
              ) : mode === "login" ? (
                <><Shield className="w-4 h-4 mr-2" /> Entrar no Painel</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Criar Conta</>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/50">
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center">
              {mode === "login" ? "Não tem conta? Criar uma agora" : "Já tem conta? Fazer login"}
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6 opacity-50">
          Master Painel v2.0 — Acesso restrito e monitorado
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
