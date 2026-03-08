import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe, Copy, CheckCircle, TableProperties, RefreshCw, Search, Sparkles, Wallet, ArrowDownCircle, ArrowUpCircle, Users, Settings, Activity } from "lucide-react";
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
    icon: Globe, color: "neon-blue", title: "1. Visão Geral — API v5.6 (Direct Mapping)",
    description: "Como o painel funciona: mapeamento manual é LEI absoluta",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Master Painel Pro v5.6 usa <strong className="text-foreground">Mapeamento Direto</strong> — o que você configurar é exatamente o que será usado. Zero fallbacks, zero substituições automáticas.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-green">⚡ Fluxo v5.6:</p>
          {[
            "1. Crie a plataforma e preencha nome + URL da hospedagem",
            "2. Em Configurar → aba Banco → preencha host, porta, usuário, senha, banco",
            "3. Aba Gerar → copie config.php + api.php v5.6 → suba na hospedagem",
            "4. Aba Scanner → Escanear Banco de Dados → veja TODAS as tabelas reais",
            "5. Para cada tabela, clique 'Usar esta tabela' → mapeamento automático",
            "6. Aba Mapeamento → revise e ajuste manualmente se necessário",
            "7. Clique Salvar → gere NOVO api.php v5.6 → suba novamente",
            "8. Aba API → Testar API → todos endpoints devem responder",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
          <p className="text-[10px] font-bold text-destructive mb-1">⚠️ IMPORTANTE — v5.6 vs versões anteriores:</p>
          <p className="text-[10px] text-muted-foreground">Na v5.6, <strong>NÃO há fallback automático</strong>. Se você colocar "wallets" mas a tabela real é "balances", o saldo será R$ 0,00. Use o Scanner para descobrir os nomes corretos.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Search, color: "neon-purple", title: "2. Scanner de Banco de Dados",
    description: "Detecta todas as tabelas, registros e colunas do MySQL remoto",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Scanner v2.0 mostra <strong className="text-foreground">todas as tabelas reais</strong> do banco com contagem de registros, tipos e chaves.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📊 O que o Scanner mostra:</p>
          {[
            "Nome de TODAS as tabelas do banco MySQL",
            "Quantidade de registros em cada tabela",
            "Todas as colunas com tipo (varchar, int, decimal, etc)",
            "Chaves primárias (🔑) e estrangeiras (🔗)",
            "Detecção automática com % de confiança",
            "Botão 'Usar esta tabela' para mapear direto",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
          <p className="text-[10px] text-primary font-semibold">💡 Ao clicar "Usar esta tabela", o sistema preenche automaticamente a tabela E as colunas detectadas. Depois é só revisar e salvar.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Database, color: "neon-cyan", title: "3. Mapeamento de Tabelas e Colunas",
    description: "O que cada tabela e coluna faz no painel — e como configurar",
    content: (
      <div className="space-y-3">
        {[
          { icon: "👥", name: "Tabela de Usuários", desc: "Conta total de usuários e exibe nomes em depósitos/saques/SAC", cols: [
            "id — Identificador único de cada usuário",
            "nome — Nome ou username exibido em toda a plataforma",
            "email — Email do usuário (usado para contato e SAC)",
            "telefone — Telefone/WhatsApp do usuário",
          ]},
          { icon: "💰", name: "Tabela de Depósitos", desc: "Lista depósitos no painel com valor, PIX e status", cols: [
            "id — ID único do depósito",
            "user_id (FK) — Chave que liga ao usuário (JOIN automático)",
            "valor — Valor monetário do depósito (decimal/float)",
            "pix — Chave PIX usada no pagamento",
            "status — pendente, aprovado ou rejeitado",
            "created_at — Data/hora do depósito (para ordenação)",
          ]},
          { icon: "💸", name: "Tabela de Saques", desc: "Lista saques com botões Aprovar/Rejeitar", cols: [
            "id — ID único do saque (OBRIGATÓRIO para aprovar/rejeitar)",
            "user_id (FK) — Chave que liga ao usuário",
            "valor — Valor do saque",
            "pix — Chave PIX para pagamento",
            "status — pendente, aprovado ou rejeitado",
            "created_at — Data/hora da solicitação",
          ]},
          { icon: "💳", name: "Tabela de Saldo/Carteira", desc: "Soma o saldo total de todos os jogadores no Dashboard", cols: [
            "user_id (FK) — Chave que liga ao usuário",
            "saldo — Valor do saldo atual (COALESCE SUM no Dashboard)",
            "⚠️ Se esta tabela não existir ou estiver com nome errado, o saldo mostra R$ 0,00",
          ]},
          { icon: "🤝", name: "Tabela de Afiliados", desc: "Conta afiliados e permite remoção automática dos expirados", cols: [
            "id — ID do afiliado",
            "nome — Nome do afiliado",
            "user_id (FK) — Chave que liga ao usuário",
            "cooperation_expired — Flag 0/1 se expirou (usado para remoção automática)",
          ]},
        ].map((table, idx) => (
          <div key={idx} className="rounded-lg bg-secondary/30 p-3 border border-border/30">
            <p className="text-[11px] font-bold text-foreground mb-1">{table.icon} {table.name}</p>
            <p className="text-[9px] text-muted-foreground mb-2 italic">{table.desc}</p>
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
    description: "Credenciais do banco MySQL (sem tabelas — tudo via mapeamento)",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O config.php contém <strong className="text-foreground">apenas credenciais</strong>. Os nomes de tabelas e colunas ficam embutidos no api.php v5.6.</p>
        <CodeBlock code={`<?php
// config.php — Gerado pelo Painel v5.6
$host = "localhost";
$user = "seu_usuario_db";
$pass = "sua_senha_db";
$db   = "nome_do_banco";
$port = 3306;
?>`} language="php" />
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">📋 Onde encontrar:</p>
          {[
            "Host, Usuário, Senha → painel de hospedagem (cPanel, Hostinger, etc.)",
            "Banco de Dados → nome exato do banco MySQL criado na hospedagem",
            "Porta → geralmente 3306 (padrão MySQL)",
            "💡 Use o botão 'Gerar Arquivos' na aba Gerar para criar tudo automaticamente!",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Code, color: "neon-green", title: "5. API v5.6 — Mapeamento Direto",
    description: "Standalone — sem cache, sem fallback, sem dependência",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O api.php v5.6 é <strong className="text-foreground">standalone</strong> — todos os nomes de tabelas e colunas estão embutidos no arquivo. Não depende do painel para funcionar.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-1">
          <p className="text-[11px] font-bold text-neon-green mb-1">⚡ v5.6 — Diferenças:</p>
          {[
            "✅ Mapeamento Direto — usa EXATAMENTE o que você configurou",
            "✅ Zero Fallbacks — sem find_col, sem auto-detect de colunas",
            "✅ Standalone — não precisa buscar mapeamento no painel",
            "✅ Erros em JSON — nunca retorna HTML mesmo com erro PHP",
            "✅ scan_db — Lista todas tabelas para o Scanner do painel",
            "✅ diagnostico — Verifica se tabelas existem e mostra colunas reais",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-1">
          <p className="text-[11px] font-bold text-foreground mb-2">📡 Endpoints v5.6:</p>
          {[
            "?action=health → Saúde + versão + tabelas existentes",
            "?action=stats → Dashboard (usuários, afiliados, saldo, dep, saques)",
            "?action=depositos → Lista depósitos com JOIN na tabela de usuários",
            "?action=saques → Lista saques para aprovação/rejeição",
            "?action=aprovar_saque → Aprovar saque (POST/GET id)",
            "?action=rejeitar_saque → Rejeitar saque (POST/GET id)",
            "?action=remover_afiliados → Remover afiliados com cooperation_expired=1",
            "?action=scan_db → Lista TODAS tabelas com colunas e contagem",
            "?action=diagnostico → Verifica existência de cada tabela mapeada",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
          <p className="text-[10px] font-bold text-destructive mb-1">⚠️ Lembre-se:</p>
          <p className="text-[10px] text-muted-foreground">Sempre que mudar o mapeamento no painel, você precisa gerar um NOVO api.php v5.6 e subir na hospedagem. Os nomes ficam embutidos no arquivo.</p>
        </div>
      </div>
    ),
  },
  {
    icon: FileText, color: "neon-cyan", title: "6. Passo a Passo Completo",
    description: "Da instalação ao funcionamento — todos os passos detalhados",
    content: (
      <div className="space-y-2">
        {[
          "1. Vá em 'Plataformas' → 'Nova Plataforma' → preencha nome e URL",
          "2. Clique em 'Configurar' → aba 'Banco' → preencha host, porta, usuário, senha, banco",
          "3. Aba 'Gerar' → 'Baixar Todos' → suba config.php + api.php na hospedagem",
          "4. Teste acessando: suaurl.com/api.php?action=health no navegador",
          "5. Se aparecer JSON com 'ok':true → API instalada com sucesso",
          "6. Volte ao painel → aba 'Scanner' → clique 'Escanear Banco de Dados'",
          "7. O sistema mostra TODAS as tabelas reais com registros e colunas",
          "8. Para cada tabela, clique 'Usar esta tabela' → selecione o tipo (usuarios, depositos, etc)",
          "9. O mapeamento de tabela E colunas é preenchido automaticamente",
          "10. Aba 'Mapeamento' → revise se as colunas estão corretas → ajuste se necessário",
          "11. Clique 'Salvar' → mapeamento gravado",
          "12. ⚠️ IMPORTANTE: Aba 'Gerar' → gere NOVO api.php v5.6 → suba na hospedagem",
          "13. Aba 'API' → 'Testar API' → todos endpoints devem responder ✅",
          "14. Saúde do Sistema → Diagnóstico Completo → deve mostrar dados reais",
          "15. Dashboard, Depósitos e Saques agora mostram dados reais!",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-2 mt-2">
          <p className="text-[10px] text-neon-green font-semibold">✅ Para que mudanças no mapeamento reflitam, SEMPRE gere novo api.php e suba na hospedagem!</p>
        </div>
      </div>
    ),
  },
  {
    icon: Activity, color: "neon-amber", title: "7. Diagnóstico Profundo",
    description: "Como usar o Diagnóstico do Sistema para encontrar problemas",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Diagnóstico v5.6 testa <strong className="text-foreground">tudo de verdade</strong> — busca dados reais e verifica se tabelas existem.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔬 O que o Diagnóstico verifica:</p>
          {[
            "Testa os 4 endpoints (health, stats, depositos, saques)",
            "Busca dados REAIS da API — não só se responde",
            "Mostra quantidade real de usuários, saldo, depósitos e saques",
            "Verifica se cada tabela mapeada EXISTE no banco via diagnostico",
            "Detecta versão da API — avisa se está desatualizada",
            "Lista TODOS os problemas com severidade (Crítico, Aviso, Info)",
            "Cada problema tem causa provável + solução detalhada",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
          <p className="text-[10px] font-bold text-destructive mb-1">Problemas comuns que o Diagnóstico detecta:</p>
          {[
            "🔴 Saldo R$ 0,00 → tabela de saldo com nome errado no mapeamento",
            "🔴 Saques: 0 → tabela de saques com nome errado (ex: withdraws vs withdrawals)",
            "🔴 Tabela não existe → nome mapeado diferente do nome real no banco",
            "🟡 API desatualizada → api.php é versão antiga, gere novo v5.6",
            "🟡 Usando valores padrão → nunca mudou de 'wallets' para o nome real",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Send, color: "neon-cyan", title: "8. Telegram Bot",
    description: "Como criar o bot e configurar notificações automáticas",
    content: (
      <div className="space-y-2">
        {[
          "1. Abra o Telegram e busque @BotFather",
          "2. Envie /newbot e siga as instruções — copie o Bot Token",
          "3. Crie um grupo e adicione o bot como admin",
          "4. Envie uma mensagem no grupo e acesse: api.telegram.org/bot{TOKEN}/getUpdates",
          "5. Copie o Chat ID do resultado",
          "6. No painel → Integrações → cole Bot Token e Chat ID → Ativar",
          "7. Configure quais eventos notificar (depósito, saque, novo usuário, etc)",
          "8. Em Eventos → personalize mensagens com variáveis: {nome_usuario}, {valor}, {pix}, etc.",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
      </div>
    ),
  },
  {
    icon: RefreshCw, color: "neon-amber", title: "9. Sincronização Automática",
    description: "Como funciona o auto-sync de 30 segundos",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">⏱️ Motor de Sync:</p>
          {[
            "A cada 30 segundos, o painel busca stats, depósitos e saques de cada plataforma",
            "Stats (usuários, afiliados, saldo) são atualizados no banco do painel",
            "Depósitos e saques são sincronizados via upsert (sem duplicatas)",
            "Se a plataforma ficar offline por 2+ minutos, envia alerta no Telegram",
            "Cache inteligente: stats 30s, dados financeiros 20s",
            "Se a API cair, usa último cache disponível",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Shield, color: "neon-blue", title: "10. Checklist Final v5.6",
    description: "Verificação completa antes de considerar tudo funcionando",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">✅ Checklist v5.6:</p>
          {[
            "config.php com credenciais corretas na hospedagem",
            "api.php v5.6 gerado COM o mapeamento correto e hospedado",
            "Scanner: banco escaneado e tabelas mapeadas corretamente",
            "Mapeamento revisado — nomes de tabelas e colunas conferidos",
            "Testar API → todos endpoints respondem ✅",
            "Diagnóstico Profundo → 0 problemas críticos",
            "Dashboard mostra saldo REAL (não R$ 0,00)",
            "Depósitos mostram dados reais com valor e status",
            "Saques aparecem com botões Aprovar/Rejeitar funcionais",
            "Telegram configurado e testado (opcional)",
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
          Tutorial <span className="gradient-text">& Documentação v5.6</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">API Standalone com Mapeamento Direto — zero fallbacks, controle total</p>
      </motion.div>

      {/* Quick Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-primary/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <p className="text-xs font-bold text-foreground mb-2">📁 Estrutura na Hospedagem:</p>
        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">
{`/public_html
├── config.php    → Credenciais do banco MySQL
└── api.php       → API v5.6 Standalone (mapeamento embutido)`}
        </pre>
        <p className="text-[9px] text-muted-foreground mt-2 italic">v5.6 não usa mapping_cache.json — tudo embutido no api.php</p>
      </motion.div>

      {/* v5.6 highlight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-xl border border-neon-green/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-neon-green" />
          <p className="text-xs font-bold text-foreground">🎯 v5.6 — Mapeamento Direto (Zero Fallbacks)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: "📋", title: "Seu Mapeamento é LEI", desc: "O que você digitar no painel é exatamente o que a API usa. Sem find_col, sem auto-detect de colunas." },
            { icon: "🔍", title: "Scanner v2.0", desc: "Escaneia banco com contagem de registros, tipos de colunas, chaves PRI/FK. Botão 'Usar esta tabela' mapeia tudo." },
            { icon: "🔬", title: "Diagnóstico Profundo", desc: "Verifica dados REAIS — mostra saldo, depósitos, saques. Detecta tabelas inexistentes e mapeamento errado." },
          ].map((f, i) => (
            <div key={i} className="rounded-lg bg-secondary/30 border border-border/30 p-3">
              <p className="text-sm mb-1">{f.icon}</p>
              <p className="text-[11px] font-bold text-foreground">{f.title}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isOpen = openSection === idx;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.03 }}>
              <button onClick={() => setOpenSection(isOpen ? null : idx)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${isOpen ? `border-${sec.color}/40` : "border-border/40 hover:border-primary/30"}`}
                style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--primary) / 0.1)` }}>
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
