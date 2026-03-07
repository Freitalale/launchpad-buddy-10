import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe } from "lucide-react";

const sections = [
  {
    icon: Globe, color: "neon-blue", title: "1. Visão Geral da Arquitetura",
    content: `O Master Painel Pro funciona como um painel centralizador que se conecta ao banco de dados de cada plataforma de apostas.

**Arquitetura:**
- Frontend: React + Vite (este painel)
- Backend: Lovable Cloud (autenticação, dados, funções)
- Plataformas: Cada plataforma tem sua própria API/banco MySQL
- Comunicação: A API de cada plataforma envia dados para o painel via endpoints REST

**Fluxo de dados:**
- A plataforma envia depósitos, saques e cadastros via API
- O painel recebe, armazena e exibe os dados em tempo real
- Eventos são disparados via Telegram automaticamente`,
  },
  {
    icon: Code, color: "neon-green", title: "2. Criar a API na Plataforma (PHP/MySQL)",
    content: `Crie um arquivo \`api.php\` na raiz da hospedagem de cada plataforma:

**Arquivo: api.php**
- <?php
- header("Content-Type: application/json");
- header("Access-Control-Allow-Origin: *");
- 
- $host = "localhost";
- $user = "seu_usuario_db";
- $pass = "sua_senha_db";
- $db = "seu_banco";
- $conn = new mysqli($host, $user, $pass, $db);
- 
- $action = $_GET["action"] ?? "";
- 
- if ($action === "stats") {
-   $users = $conn->query("SELECT COUNT(*) as total FROM users")->fetch_assoc()["total"];
-   $affiliates = $conn->query("SELECT COUNT(*) as total FROM affiliates")->fetch_assoc()["total"];
-   $balance = $conn->query("SELECT SUM(balance) as total FROM wallets")->fetch_assoc()["total"];
-   echo json_encode(["total_usuarios" => $users, "total_afiliados" => $affiliates, "saldo_total" => $balance]);
- }
- 
- if ($action === "depositos") {
-   $result = $conn->query("SELECT u.name as nome_usuario, d.amount as valor, d.pix, d.created_at, d.status FROM deposits d JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC LIMIT 100");
-   $rows = [];
-   while ($row = $result->fetch_assoc()) $rows[] = $row;
-   echo json_encode($rows);
- }
- 
- if ($action === "saques") {
-   $result = $conn->query("SELECT u.name as nome_usuario, w.amount as valor, w.pix, w.created_at, w.status, w.id FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC LIMIT 100");
-   $rows = [];
-   while ($row = $result->fetch_assoc()) $rows[] = $row;
-   echo json_encode($rows);
- }
- 
- if ($action === "aprovar_saque") {
-   $id = intval($_POST["id"]);
-   $conn->query("UPDATE withdrawals SET status='aprovado' WHERE id=$id");
-   echo json_encode(["ok" => true]);
- }
- 
- if ($action === "rejeitar_saque") {
-   $id = intval($_POST["id"]);
-   $conn->query("UPDATE withdrawals SET status='rejeitado' WHERE id=$id");
-   echo json_encode(["ok" => true]);
- }
- 
- if ($action === "remover_afiliados") {
-   $conn->query("DELETE FROM affiliates WHERE cooperation_expired = 1");
-   echo json_encode(["ok" => true]);
- }
- ?>

**URL da API:** https://suaplataforma.com/api.php?action=stats`,
  },
  {
    icon: Database, color: "neon-purple", title: "3. Estrutura do Banco de Dados MySQL",
    content: `Crie estas tabelas no banco MySQL de cada plataforma:

**Tabela: users**
- id INT AUTO_INCREMENT PRIMARY KEY
- name VARCHAR(255)
- email VARCHAR(255)
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Tabela: affiliates**
- id INT AUTO_INCREMENT PRIMARY KEY
- user_id INT (FK → users.id)
- name VARCHAR(255)
- cooperation_expired BOOLEAN DEFAULT 0
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Tabela: wallets**
- id INT AUTO_INCREMENT PRIMARY KEY
- user_id INT (FK → users.id)
- balance DECIMAL(10,2) DEFAULT 0

**Tabela: deposits**
- id INT AUTO_INCREMENT PRIMARY KEY
- user_id INT (FK → users.id)
- amount DECIMAL(10,2)
- pix VARCHAR(255)
- status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente'
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**Tabela: withdrawals**
- id INT AUTO_INCREMENT PRIMARY KEY
- user_id INT (FK → users.id)
- amount DECIMAL(10,2)
- pix VARCHAR(255)
- status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente'
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

**SQL para criar:**
- CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
- CREATE TABLE affiliates (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, name VARCHAR(255), cooperation_expired BOOLEAN DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
- CREATE TABLE wallets (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, balance DECIMAL(10,2) DEFAULT 0);
- CREATE TABLE deposits (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, amount DECIMAL(10,2), pix VARCHAR(255), status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
- CREATE TABLE withdrawals (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, amount DECIMAL(10,2), pix VARCHAR(255), status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
  },
  {
    icon: Key, color: "neon-amber", title: "4. Configurar a Plataforma no Painel",
    content: `**Passo 1:** Vá em "Plataformas" e clique em "Nova Plataforma"
**Passo 2:** Preencha o nome, URL e categoria
**Passo 3:** Clique em "Configurar" na plataforma criada
**Passo 4:** Na aba "Banco de Dados", preencha:
- Host: o IP ou domínio do servidor MySQL
- Porta: geralmente 3306
- Usuário: usuário do banco
- Senha: senha do banco
- Nome do Banco: nome do banco de dados
**Passo 5:** Configure o mapeamento de tabelas:
- tabela_usuarios: nome real (ex: users)
- tabela_afiliados: nome real (ex: affiliates)
- tabela_saldo: nome real (ex: wallets)
- coluna_saldo: nome da coluna (ex: balance)
**Passo 6:** Clique em "Verificar Configuração" para validar
**Passo 7:** Salve e ative a plataforma

**Importante:** A plataforma só pode ficar "online" se o banco estiver configurado corretamente.`,
  },
  {
    icon: Send, color: "neon-cyan", title: "5. Configurar Telegram Bot",
    content: `**Passo 1:** Abra o Telegram e busque @BotFather
**Passo 2:** Envie /newbot e siga as instruções
**Passo 3:** Copie o Bot Token (ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
**Passo 4:** Crie um grupo/canal e adicione o bot como administrador
**Passo 5:** Para obter o Chat ID, envie uma mensagem e acesse:
- https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
- O chat_id estará em "chat":{"id":-1001234567890}
**Passo 6:** No painel, vá em "Integrações" e cole o Bot Token e Chat ID
**Passo 7:** Clique em "Testar Conexão" para verificar
**Passo 8:** Ative os eventos desejados em "Eventos & Mensagens"
**Passo 9:** Cada evento tem sua própria mensagem configurável com chaves dinâmicas

**Chaves disponíveis:**
- {nome_usuario} — Nome do usuário
- {valor} — Valor monetário
- {nome_plataforma} — Nome da plataforma
- {quantidade_usuarios} — Quantidade de usuários
- {quantidade_dias} — Dias da cooperação
- {pix} — Chave Pix`,
  },
  {
    icon: Zap, color: "neon-red", title: "6. Cooperação — Exclusão de Afiliados",
    content: `O sistema de cooperação controla o prazo de parceria com cada plataforma.

**Como configurar:**
- Na configuração de cada plataforma, defina "Dias de Cooperação" (ex: 30)
- A data de expiração é calculada automaticamente
- Quando expira, o sistema pode:
  - Excluir SOMENTE afiliados da plataforma
  - OU enviar notificação via Telegram
  - Usuários totais NUNCA são excluídos

**Nas Configurações Globais:**
- Ative "Exclusão automática de afiliados"
- Defina os dias padrão de cooperação
- Isso serve como fallback para plataformas sem config própria

**Ação na API:**
- Quando a cooperação expira, o painel chama api.php?action=remover_afiliados
- A API executa DELETE FROM affiliates WHERE cooperation_expired = 1`,
  },
  {
    icon: FileText, color: "neon-green", title: "7. Arquivo HTML da API (Alternativo)",
    content: `Se preferir usar um arquivo HTML estático para testar a API:

**Arquivo: test_api.html**
- <!DOCTYPE html>
- <html><head><title>Teste API</title></head>
- <body>
- <h1>Teste de Conexão da API</h1>
- <button onclick="testStats()">Testar Stats</button>
- <button onclick="testDepositos()">Testar Depósitos</button>
- <button onclick="testSaques()">Testar Saques</button>
- <pre id="result"></pre>
- <script>
- const API = "https://suaplataforma.com/api.php";
- async function testStats() {
-   const r = await fetch(API + "?action=stats");
-   document.getElementById("result").textContent = JSON.stringify(await r.json(), null, 2);
- }
- async function testDepositos() {
-   const r = await fetch(API + "?action=depositos");
-   document.getElementById("result").textContent = JSON.stringify(await r.json(), null, 2);
- }
- async function testSaques() {
-   const r = await fetch(API + "?action=saques");
-   document.getElementById("result").textContent = JSON.stringify(await r.json(), null, 2);
- }
- </script>
- </body></html>

**Suba este arquivo para a mesma hospedagem e acesse pelo navegador para testar.**`,
  },
  {
    icon: Shield, color: "neon-blue", title: "8. Segurança e Boas Práticas",
    content: `**RLS (Row Level Security):** Cada usuário só acessa seus próprios dados no painel.

**Autenticação:** Login por email/senha. Não são permitidos cadastros anônimos.

**Dados sensíveis:** Tokens, senhas de banco e chaves ficam protegidos via RLS.

**Realtime:** Depósitos, saques e SACs são atualizados em tempo real.

**API da plataforma — Segurança:**
- Adicione autenticação na API (token Bearer ou chave)
- Valide todos os inputs antes de executar queries
- Use prepared statements para evitar SQL injection
- Limite as queries com LIMIT para evitar sobrecarga
- Configure CORS corretamente

**Backup:** Use os botões de exportação (CSV/PDF) para backup regular.

**Checklist Final:**
- ✅ Banco MySQL configurado na plataforma
- ✅ Arquivo api.php criado e testado
- ✅ Plataforma adicionada no painel com configurações corretas
- ✅ Telegram Bot configurado e testado
- ✅ Eventos configurados com mensagens personalizadas
- ✅ Cooperação definida por plataforma
- ✅ Dashboard mostrando dados reais`,
  },
];

const Tutorial = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-xl md:text-2xl font-black text-foreground">
          Tutorial <span className="gradient-text">& Documentação Completa</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Guia ultra detalhado: API, banco de dados, eventos e integração completa</p>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.08 }}
              className="rounded-xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-${section.color}/10`}>
                    <Icon className={`w-5 h-5 text-${section.color}`} />
                  </div>
                  <h2 className="font-bold text-foreground">{section.title}</h2>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  {section.content.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-bold text-sm text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("**")) {
                      const parts = line.split("**");
                      return (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                          {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-foreground">{part}</strong> : part)}
                        </p>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
                          <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground font-mono">{line.slice(2)}</p>
                        </div>
                      );
                    }
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Tutorial;
