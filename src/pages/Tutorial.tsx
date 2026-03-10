import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe, Copy, CheckCircle, RefreshCw, Search, Sparkles, Activity, CreditCard, Layers, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CodeBlock = ({ code, language = "php" }: { code: string; language?: string }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); toast({ title: "Código copiado!" }); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative rounded-lg border border-border/50 bg-secondary/50 overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={handleCopy}>
          {copied ? <CheckCircle className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}{copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
};

const sections = [
  {
    icon: Globe, color: "neon-blue", title: "1. Visão Geral — Master Painel V7",
    description: "Arquitetura Platform Adapter Engine com gateway universal",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Master Painel V7 usa o <strong className="text-foreground">Platform Adapter Engine</strong> — cada plataforma tem seu adaptador isolado com cache, gateway e mapeamento independentes.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-green">⚡ Fluxo V7:</p>
          {["1. Crie a plataforma e preencha nome + URL", "2. Configurar → Banco → credenciais MySQL", "3. Gerar → config.php + api.php → suba na hospedagem", "4. Scanner → Escanear Banco → veja TODAS as tabelas", "5. Clique 'Usar esta tabela' → mapeamento automático", "6. Mapeamento → revise e ajuste → Salvar", "7. Gere NOVO api.php → suba na hospedagem", "8. API → Testar → todos endpoints ✅", "9. Opcional: Configure gateway no mapeamento extra"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Layers, color: "neon-purple", title: "2. Platform Adapter Engine",
    description: "Camada de abstração universal entre o painel e cada plataforma",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Adapter Engine permite suportar <strong className="text-foreground">infinitas plataformas</strong> com bancos e APIs diferentes sem padronização.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔧 Funções padronizadas:</p>
          {["getUsers() — busca usuários via query ou API", "getBalance() — saldo direto da coluna mapeada (NUNCA incremental)", "getDeposits() — lista depósitos com status normalizado", "getWithdraws() — lista saques com status normalizado", "approveWithdraw() → Gateway → API → Supabase → Log", "rejectWithdraw() → API → Supabase → Log"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
          <p className="text-[10px] text-primary font-semibold">💡 Cada plataforma opera de forma ISOLADA. Erro em uma não afeta outras. Cache e retry são independentes por adaptador.</p>
        </div>
      </div>
    ),
  },
  {
    icon: CreditCard, color: "neon-green", title: "3. Gateway Universal de Pagamento",
    description: "Motor de execução real de saques com múltiplos tipos de gateway",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O V7 inclui um <strong className="text-foreground">Motor Universal de Execução</strong> que processa pagamentos reais ao aprovar saques.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔌 Tipos suportados:</p>
          {["PIX API — integração direta com API de pagamento PIX", "API REST — qualquer endpoint REST com autenticação", "Webhook — dispara webhook externo com dados do saque", "Script Custom — execução personalizada", "SQL Exec — execução de query direta no banco remoto"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
          <p className="text-[10px] font-bold text-destructive mb-1">⚠️ Fluxo de aprovação V7:</p>
          <p className="text-[10px] text-muted-foreground">1. Gateway executa pagamento → 2. Se sucesso, API atualiza banco remoto → 3. Supabase atualizado → 4. Log registrado. Se gateway falhar, status NÃO muda.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Search, color: "neon-purple", title: "4. Scanner de Banco de Dados",
    description: "Detecta tabelas, registros e colunas do MySQL remoto",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Scanner mostra <strong className="text-foreground">todas as tabelas reais</strong> com contagem de registros, tipos e chaves.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          {["Nome de TODAS as tabelas do banco MySQL", "Quantidade de registros em cada tabela", "Colunas com tipo (varchar, int, decimal)", "Chaves primárias (🔑) e estrangeiras (🔗)", "Detecção automática com % de confiança", "Botão 'Usar esta tabela' para mapear direto"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Database, color: "neon-cyan", title: "5. Mapeamento de Tabelas",
    description: "O que cada tabela e coluna faz — e como configurar",
    content: (
      <div className="space-y-3">
        {[
          { icon: "👥", name: "Usuários", cols: ["id, nome, email, telefone"] },
          { icon: "💰", name: "Depósitos", cols: ["id, user_id, valor, pix, status, created_at"] },
          { icon: "💸", name: "Saques", cols: ["id, user_id, valor, pix, status, created_at"] },
          { icon: "💳", name: "Saldo/Carteira", cols: ["user_id, saldo — valor EXATO da coluna"] },
          { icon: "🤝", name: "Afiliados", cols: ["id, nome, user_id, cooperation_expired"] },
        ].map((t, idx) => (
          <div key={idx} className="rounded-lg bg-secondary/30 p-3 border border-border/30">
            <p className="text-[11px] font-bold text-foreground">{t.icon} {t.name}</p>
            {t.cols.map((c, i) => <p key={i} className="text-[10px] text-muted-foreground mt-1">{c}</p>)}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Key, color: "neon-amber", title: "6. config.php",
    description: "Credenciais MySQL — sem tabelas",
    content: (
      <div className="space-y-2">
        <CodeBlock code={`<?php\n// config.php — V7\n$host = "localhost";\n$user = "seu_usuario";\n$pass = "sua_senha";\n$db   = "nome_banco";\n$port = 3306;\n?>`} language="php" />
      </div>
    ),
  },
  {
    icon: Code, color: "neon-green", title: "7. API Endpoints",
    description: "Todos os endpoints disponíveis",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-1">
          {["?action=health — Saúde + versão", "?action=stats — Usuários, afiliados, saldo, depósitos, saques", "?action=depositos — Lista com JOIN", "?action=saques — Lista para aprovação/rejeição", "?action=aprovar_saque — POST com id e status", "?action=rejeitar_saque — POST com id e status", "?action=remover_afiliados — Remoção de expirados", "?action=scan_db — Lista tabelas com colunas", "?action=diagnostico — Verifica existência de tabelas"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Send, color: "neon-cyan", title: "8. Telegram Bot",
    description: "Notificações automáticas via Telegram",
    content: (
      <div className="space-y-2">
        {["1. Telegram → @BotFather → /newbot → copie Bot Token", "2. Crie grupo → adicione bot como admin", "3. Envie mensagem → acesse getUpdates → copie Chat ID", "4. Painel → Integrações → cole Token e Chat ID → Ativar", "5. Eventos → personalize mensagens com variáveis dinâmicas"].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
      </div>
    ),
  },
  {
    icon: Smartphone, color: "neon-amber", title: "8.1 PushCut — Notificações iOS/Mac",
    description: "Tutorial completo passo a passo para configurar PushCut",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-neon-amber/5 border border-neon-amber/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-amber">📱 Passo 1 — Criar notificação no App PushCut</p>
          {[
            "1. Baixe o app PushCut na App Store (iOS/Mac)",
            "2. Abra o app → toque em 'Notifications' (aba inferior)",
            "3. Toque no '+' para criar uma nova notificação",
            "4. Preencha os campos:",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>

        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📝 Campos da Notificação no PushCut:</p>
          <div className="space-y-1.5">
            {[
              { campo: "Name (Nome)", valor: "Master Painel", desc: "Nome interno — pode ser qualquer coisa para identificar" },
              { campo: "Title (Título)", valor: "Deixe VAZIO", desc: "O título será enviado dinamicamente pelo painel (ex: 💰 Depósito Recebido)" },
              { campo: "Text (Texto)", valor: "Deixe VAZIO", desc: "O texto também é enviado dinamicamente com as variáveis preenchidas" },
              { campo: "Sound (Som)", valor: "Escolha um som", desc: "Recomendado: 'default' ou qualquer som que chame atenção" },
              { campo: "Image (Imagem)", valor: "Opcional", desc: "Pode adicionar um ícone/logo, mas não é obrigatório" },
              { campo: "Default Action (Ação)", valor: "Opcional", desc: "Pode configurar para abrir uma URL ao tocar na notificação" },
              { campo: "Tags", valor: "Opcional", desc: "Use para categorizar, ex: 'painel', 'financeiro' — não afeta funcionamento" },
            ].map((item, i) => (
              <div key={i} className="rounded-lg bg-secondary/50 p-2 border border-border/20">
                <div className="flex items-center gap-2">
                  <code className="text-[10px] font-mono text-neon-amber font-semibold whitespace-nowrap">{item.campo}</code>
                  <span className="text-[10px] text-primary font-medium">→ {item.valor}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-green">🔗 Passo 2 — Obter a Webhook URL</p>
          {[
            "1. Na notificação criada, toque em 'Webhook Trigger'",
            "2. Ative o toggle 'Webhook Trigger'",
            "3. Copie a URL gerada (formato: https://api.pushcut.io/SEU_ID/notifications/NOME)",
            "4. Essa é a URL que você vai colar no painel",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-primary">⚙️ Passo 3 — Configurar no Painel</p>
          {[
            "1. Vá em Notificações no menu lateral",
            "2. Na seção PushCut, cole a Webhook URL copiada",
            "3. Ative o toggle do PushCut",
            "4. Clique em 'Testar PushCut' → deve receber no celular",
            "5. Configure os eventos que deseja receber",
            "6. Clique em 'Salvar Tudo'",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>

        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2">
          <p className="text-[10px] font-bold text-destructive">⚠️ Importante: O PushCut requer iOS ou macOS. Não funciona em Android. Para Android, use o Telegram.</p>
        </div>
      </div>
    ),
  },
  {
    icon: RefreshCw, color: "neon-amber", title: "9. Sincronização V7",
    description: "Auto-sync inteligente com cache e retry",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          {["Auto-sync a cada 30s (configurável por plataforma)", "Cache inteligente: stats 30s, dados financeiros 20s", "Retry automático com backoff exponencial", "Fallback seguro: usa último cache disponível", "Fila de sincronização isolada por plataforma", "Alerta Telegram se offline por 2+ minutos", "Invalidação automática de cache ao mudar dados"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Activity, color: "neon-amber", title: "10. Diagnóstico Profundo V7",
    description: "Testa endpoints, gateway, mapeamento e dados reais",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          {["Testa 4 endpoints (health, stats, depositos, saques)", "Busca dados REAIS da API", "Verifica se tabelas mapeadas EXISTEM", "Detecta versão da API", "Verifica configuração de gateway", "Mostra tipo de adaptador (API, Hybrid, Custom)", "Lista problemas com severidade + solução"].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Shield, color: "neon-blue", title: "11. Checklist Final V7",
    description: "Verificação completa",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          {["config.php com credenciais na hospedagem", "api.php gerado com mapeamento correto", "Scanner: tabelas mapeadas corretamente", "Mapeamento revisado e salvo", "Testar API → todos endpoints ✅", "Diagnóstico V7 → 0 críticos", "Dashboard mostra saldo REAL da API", "Saques com Motor de Execução funcional", "Gateway configurado (se aplicável)", "Telegram configurado (opcional)"].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><CheckCircle className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
];

const Tutorial = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">Tutorial <span className="gradient-text">& Documentação V7</span></h1>
        <p className="text-muted-foreground text-sm mt-0.5">Platform Adapter Engine — Gateway Universal — Diagnóstico Profundo</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-primary/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <p className="text-xs font-bold text-foreground mb-2">📁 Estrutura na Hospedagem:</p>
        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">{`/public_html\n├── config.php    → Credenciais MySQL\n└── api.php       → API Standalone (mapeamento embutido)`}</pre>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-xl border border-neon-green/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-neon-green" />
          <p className="text-xs font-bold text-foreground">🎯 V7 — Platform Adapter Engine</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { icon: "🔧", title: "Adapter Engine", desc: "Cada plataforma tem adaptador isolado com cache e configuração independente." },
            { icon: "💳", title: "Gateway Universal", desc: "PIX, REST, Webhook, Custom, SQL — pagamento real na aprovação." },
            { icon: "🔍", title: "Scanner v2.0", desc: "Escaneia banco, detecta tabelas, mapeia automaticamente." },
            { icon: "🔬", title: "Diagnóstico V7", desc: "Testa endpoints, gateway, mapeamento e dados reais." },
          ].map((f, i) => (
            <div key={i} className="rounded-lg bg-secondary/30 border border-border/30 p-3">
              <p className="text-sm mb-1">{f.icon}</p>
              <p className="text-[11px] font-bold text-foreground">{f.title}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="space-y-3">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isOpen = openSection === idx;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.03 }}>
              <button onClick={() => setOpenSection(isOpen ? null : idx)}
                className="w-full rounded-xl border border-border/40 hover:border-primary/30 p-4 text-left transition-all" style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{sec.title}</p>
                    <p className="text-[10px] text-muted-foreground">{sec.description}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </div>
              </button>
              {isOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="rounded-b-xl border border-t-0 border-border/40 p-4" style={{ background: "hsl(var(--card))" }}>
                  {sec.content}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Tutorial;
