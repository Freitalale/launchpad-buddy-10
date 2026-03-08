import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe, Copy, CheckCircle, TableProperties, RefreshCw, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CodeBlock = ({ code, language = "php" }: { code: string; language?: string }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg border border-border/50 bg-secondary/50 overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={handleCopy}>
          {copied ? <CheckCircle className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
};

const sections = [
  {
    icon: Globe, color: "neon-blue", title: "1. Visão Geral — API v4.0 com Auto-Detect",
    description: "Como o painel detecta e configura automaticamente o banco de dados",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Master Painel Pro v4.0 possui um <strong className="text-foreground">detector automático de banco de dados</strong> que escaneia MySQL, identifica tabelas e colunas, e preenche o mapeamento sozinho.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-green">⚡ Fluxo v4.0:</p>
          {[
            "1. Suba api.php + config.php na hospedagem (aba Gerar)",
            "2. Na aba Scanner, clique em 'Escanear Banco de Dados'",
            "3. O sistema escaneia TODAS as tabelas e colunas do MySQL",
            "4. Detecta automaticamente tabelas de usuários, depósitos, saques, saldo e afiliados",
            "5. Sugere mapeamento com % de confiança para cada tabela",
            "6. Clique 'Aplicar Mapeamento Detectado' → tudo preenchido automaticamente",
            "7. Revise na aba Mapeamento se necessário → Salvar",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Search, color: "neon-purple", title: "2. Detector Automático de Banco",
    description: "Como o scanner identifica tabelas e colunas inteligentemente",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O scanner usa <strong className="text-foreground">inteligência por palavras-chave</strong> para identificar automaticamente cada tabela e coluna.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔍 Detecção de Tabelas:</p>
          {[
            "Usuários → user, usuario, player, member, cliente, account, jogador",
            "Depósitos → deposit, deposito, payment, pagamento, transaction, recarga",
            "Saques → withdraw, saque, cashout, payout, retirada",
            "Saldo → wallet, saldo, balance, carteira, account_balance",
            "Afiliados → affiliate, afiliado, referral, parceiro, partner",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📋 Detecção de Colunas (exemplos):</p>
          {[
            "ID → id, user_id, player_id, uid, member_id",
            "Nome → name, nome, username, display_name, nickname",
            "Valor → amount, value, valor, total, deposit_amount",
            "PIX → pix, pix_key, chave_pix, payment_method, payment_key",
            "Status → status, state, situacao, payment_status",
            "Data → created_at, date, data, timestamp, dt_created",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-purple mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
          <p className="text-[10px] text-primary font-semibold">💡 O scanner dá uma % de confiança para cada detecção. Se não encontrar, a tabela fica como "Não detectado" e você pode configurar manualmente.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Database, color: "neon-cyan", title: "3. Tabelas e Colunas Necessárias",
    description: "O que cada tabela e coluna faz no painel",
    content: (
      <div className="space-y-3">
        {[
          { name: "👥 Tabela de Usuários", cols: [
            "id — Identificador único de cada usuário",
            "nome — Nome ou username exibido em depósitos, saques e SAC",
            "email — Email do usuário (usado para contato e SAC)",
            "telefone — Telefone/WhatsApp do usuário",
          ]},
          { name: "💰 Tabela de Depósitos", cols: [
            "id — ID único do depósito",
            "user_id (FK) — Chave que liga ao usuário (JOIN)",
            "valor — Valor monetário do depósito (decimal)",
            "pix — Chave PIX usada no pagamento",
            "status — pendente, aprovado ou rejeitado",
            "created_at — Data/hora do depósito",
          ]},
          { name: "💸 Tabela de Saques", cols: [
            "id — ID único do saque (usado para aprovar/rejeitar)",
            "user_id (FK) — Chave que liga ao usuário",
            "valor — Valor do saque",
            "pix — Chave PIX para pagamento",
            "status — pendente, aprovado ou rejeitado",
            "created_at — Data/hora da solicitação",
          ]},
          { name: "💳 Tabela de Saldo/Carteira", cols: [
            "user_id (FK) — Chave que liga ao usuário",
            "saldo — Valor do saldo atual (somado no Dashboard)",
          ]},
          { name: "🤝 Tabela de Afiliados", cols: [
            "id — ID do afiliado",
            "nome — Nome do afiliado",
            "user_id (FK) — Chave que liga ao usuário",
            "cooperation_expired — Flag 0/1 se expirou (usado para remoção automática)",
          ]},
        ].map((table, idx) => (
          <div key={idx} className="rounded-lg bg-secondary/30 p-3 border border-border/30">
            <p className="text-[11px] font-bold text-foreground mb-2">{table.name}</p>
            {table.cols.map((c, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground">{c}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Key, color: "neon-amber", title: "4. Arquivo config.php",
    description: "Credenciais do banco + URL do painel",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O config.php contém <strong className="text-foreground">credenciais do banco e URL do painel</strong>. Nenhum nome de tabela — tudo vem do mapeamento.</p>
        <CodeBlock code={`<?php
// config.php — Gerado pelo Painel v4.0
$host = "localhost";
$user = "seu_usuario_db";
$pass = "sua_senha_db";
$db   = "nome_do_banco";
$painel_url = "https://SEU_PROJETO/functions/v1/get-platform-mapping?api_key=SUA_API_KEY";
$cache_file = __DIR__ . "/mapping_cache.json";
$cache_ttl  = 60;
?>`} language="php" />
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">📋 Onde encontrar:</p>
          {[
            "Host, Usuário, Senha → painel de hospedagem (cPanel, Hostinger, etc.)",
            "URL + api_key → Plataformas → Configurar → aba API",
            "💡 Use o botão 'Gerar Arquivos' na aba Gerar para criar tudo automaticamente!",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Code, color: "neon-green", title: "5. Arquivo api.php v4.0",
    description: "API com scan_db, mapeamento dinâmico, cache e fallback",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O api.php v4.0 inclui <strong className="text-foreground">scan_db para detecção automática</strong> + todos os endpoints necessários.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-1">
          <p className="text-[11px] font-bold text-neon-green mb-1">⚡ v4.0 — Novidades:</p>
          {[
            "scan_db — Lista todas tabelas e colunas do banco (usado pelo Scanner)",
            "Depósitos e saques funcionam mesmo sem tabela de usuários (fallback inteligente)",
            "Tabelas desativadas são ignoradas automaticamente",
            "Erros incluem 'fix' com sugestão de correção",
            "Aceita ID via GET ou POST para aprovar/rejeitar saques",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-1">
          <p className="text-[11px] font-bold text-foreground mb-2">📡 Endpoints v4.0:</p>
          {[
            "?action=health → Saúde + versão + features disponíveis",
            "?action=stats → Dashboard (usuários, afiliados, saldo)",
            "?action=depositos → Lista depósitos com nome, valor, PIX, status",
            "?action=saques → Lista saques pendentes para aprovação",
            "?action=aprovar_saque → Aprovar saque (POST/GET id)",
            "?action=rejeitar_saque → Rejeitar saque (POST/GET id)",
            "?action=remover_afiliados → Remover afiliados expirados",
            "?action=scan_db → Escaneia todas tabelas e colunas do banco",
            "?action=extra&table=KEY → Consulta tabelas extras customizadas",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: FileText, color: "neon-cyan", title: "6. Passo a Passo Completo",
    description: "Da instalação ao funcionamento completo",
    content: (
      <div className="space-y-2">
        {[
          "1. Vá em 'Plataformas' → 'Nova Plataforma' → preencha nome e URL",
          "2. Clique em 'Configurar' → aba 'Banco' → preencha host, porta, usuário, senha, banco",
          "3. Aba 'Gerar' → 'Baixar Todos' → suba config.php + api.php + test_api.html na hospedagem",
          "4. Abra test_api.html no navegador → teste 'Health' para confirmar que api.php funciona",
          "5. Volte ao painel → aba 'Scanner' → clique 'Escanear Banco de Dados'",
          "6. O sistema lista todas tabelas/colunas e sugere o mapeamento automático",
          "7. Clique 'Aplicar Mapeamento Detectado' → tabelas e colunas preenchidas",
          "8. Aba 'Mapeamento' → revise se tudo está correto → ajuste se necessário",
          "9. Clique 'Salvar' → mapeamento gravado no painel",
          "10. Aba 'API' → 'Testar API' → todos endpoints devem ficar verdes ✅",
          "11. Depósitos e Saques agora aparecem automaticamente no painel!",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-2 mt-2">
          <p className="text-[10px] text-neon-green font-semibold">✅ Qualquer mudança no mapeamento reflete na API em até 60 segundos!</p>
        </div>
      </div>
    ),
  },
  {
    icon: Send, color: "neon-cyan", title: "7. Telegram Bot",
    description: "Como criar o bot e configurar eventos automáticos",
    content: (
      <div className="space-y-2">
        {[
          "1. Abra o Telegram e busque @BotFather",
          "2. Envie /newbot e siga as instruções",
          "3. Copie o Bot Token",
          "4. Crie um grupo e adicione o bot como admin",
          "5. Obtenha o Chat ID via getUpdates",
          "6. No painel → Integrações → cole Bot Token e Chat ID",
          "7. Configure eventos com chaves dinâmicas: {nome_usuario}, {valor}, {pix}, etc.",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
      </div>
    ),
  },
  {
    icon: RefreshCw, color: "neon-amber", title: "8. Cache e Comportamento Offline",
    description: "Como a API funciona quando o painel está offline",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📦 Sistema de Cache:</p>
          {[
            "Cache de mapeamento em mapping_cache.json (60s TTL)",
            "Dentro do TTL → usa cache sem chamar o painel",
            "Após TTL → busca mapeamento atualizado",
            "Painel offline → usa último cache + adiciona warning",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Shield, color: "neon-blue", title: "9. Segurança e Checklist Final",
    description: "Verificação completa antes de ir ao ar",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">✅ Checklist v4.0:</p>
          {[
            "api.php v4.0 hospedado e acessível via HTTPS",
            "config.php com credenciais + URL do painel + api_key",
            "Scanner: banco escaneado e mapeamento aplicado",
            "Mapeamento revisado na aba Mapeamento",
            "Testar API → todos endpoints verdes ✅",
            "test_api.html → health mostra version: 4.0.0",
            "Depósitos aparecem na tela de Depósitos",
            "Saques aparecem e podem ser aprovados/rejeitados",
            "Dashboard mostra estatísticas reais",
          ].map((t, i) => (
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
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Tutorial <span className="gradient-text">& Documentação v4.0</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">API com detector automático de banco, mapeamento inteligente e geração de arquivos</p>
      </motion.div>

      {/* Quick Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-primary/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <p className="text-xs font-bold text-foreground mb-2">📁 Estrutura na Hospedagem:</p>
        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">
{`/public_html
├── config.php           → Credenciais + URL do painel + api_key
├── api.php              → API v4.0 (auto-detect + mapeamento dinâmico)
├── mapping_cache.json   → Cache local (gerado automaticamente)
└── test_api.html        → HTML para testar endpoints + scan_db`}
        </pre>
      </motion.div>

      {/* Auto-detect highlight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-xl border border-neon-green/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-neon-green" />
          <p className="text-xs font-bold text-foreground">🔍 Novo: Detector Automático de Banco</p>
        </div>
        <p className="text-[10px] text-muted-foreground">O painel escaneia o MySQL da plataforma, detecta tabelas e colunas automaticamente, e sugere o mapeamento ideal. Sem digitar nomes de tabelas manualmente.</p>
      </motion.div>

      <div className="space-y-3">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          const isOpen = openSection === idx;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.04 }}
              className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <button onClick={() => setOpenSection(isOpen ? null : idx)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${section.color}/10`}><Icon className={`w-4 h-4 text-${section.color}`} /></div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{section.title}</p>
                    <p className="text-[10px] text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <span className="text-muted-foreground text-lg">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <div className="px-4 pb-4 border-t border-border/30 pt-3">{section.content}</div>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Tutorial;
