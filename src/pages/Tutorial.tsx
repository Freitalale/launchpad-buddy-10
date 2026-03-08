import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe, Copy, CheckCircle, TableProperties } from "lucide-react";
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

const configPhpCode = `<?php
// =====================================================
// config.php — Configuração do banco de dados MySQL
// =====================================================
// Coloque este arquivo na raiz da hospedagem (public_html/)
// Cada plataforma terá seu próprio config.php com credenciais diferentes.

$host = "localhost";          // Host do banco MySQL (geralmente "localhost")
$user = "seu_usuario_db";    // Usuário do banco de dados
$pass = "sua_senha_db";      // Senha do banco de dados
$db   = "nome_do_banco";     // Nome do banco da plataforma

?>`;

const apiPhpCode = `<?php
// =====================================================
// api.php — API principal do Master Painel Pro
// =====================================================
// Este arquivo é o ponto central de comunicação entre
// o painel Lovable e o banco de dados da plataforma.
//
// Hospede na raiz: https://suaplataforma.com/api.php
// O painel chamará cada endpoint via query string ?action=xxx
// =====================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");       // CORS — permite requisições do painel
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Responder preflight OPTIONS (necessário para CORS)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

include 'config.php';  // Inclui as credenciais do banco

$conn = new mysqli($host, $user, $pass, $db);

// Verifica conexão
if ($conn->connect_error) {
    echo json_encode(["error" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}

$conn->set_charset("utf8mb4");
$action = $_GET["action"] ?? "";

// =====================================================
// ENDPOINT: stats
// URL: api.php?action=stats
// Método: GET
// Retorna: total_usuarios, total_afiliados, saldo_total
// Usado por: Dashboard (cards de resumo)
// =====================================================
if ($action === "stats") {
    $users = $conn->query("SELECT COUNT(*) as total FROM users")->fetch_assoc()["total"];
    $affiliates = $conn->query("SELECT COUNT(*) as total FROM affiliates")->fetch_assoc()["total"];
    $balance = $conn->query("SELECT COALESCE(SUM(balance), 0) as total FROM wallets")->fetch_assoc()["total"];

    echo json_encode([
        "total_usuarios"  => (int)$users,
        "total_afiliados" => (int)$affiliates,
        "saldo_total"     => (float)$balance
    ]);
    exit;
}

// =====================================================
// ENDPOINT: depositos
// URL: api.php?action=depositos
// Método: GET
// Retorna: array de depósitos com nome_usuario, valor, pix, created_at, status
// Usado por: Página Depósitos e Dashboard (gráficos)
// =====================================================
if ($action === "depositos") {
    $stmt = $conn->prepare(
        "SELECT u.name as nome_usuario, d.amount as valor, d.pix, 
                d.created_at, d.status
         FROM deposits d
         JOIN users u ON d.user_id = u.id
         ORDER BY d.created_at DESC
         LIMIT 500"
    );
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            "nome_usuario" => $row["nome_usuario"],
            "valor"        => (float)$row["valor"],
            "pix"          => $row["pix"],
            "created_at"   => $row["created_at"],
            "status"       => $row["status"]
        ];
    }
    echo json_encode($rows);
    exit;
}

// =====================================================
// ENDPOINT: saques
// URL: api.php?action=saques
// Método: GET
// Retorna: array de saques com id, nome_usuario, valor, pix, created_at, status
// Usado por: Página Saques (listagem + aprovar/reprovar)
// =====================================================
if ($action === "saques") {
    $stmt = $conn->prepare(
        "SELECT w.id, u.name as nome_usuario, w.amount as valor, w.pix, 
                w.created_at, w.status
         FROM withdrawals w
         JOIN users u ON w.user_id = u.id
         ORDER BY w.created_at DESC
         LIMIT 500"
    );
    $stmt->execute();
    $result = $stmt->get_result();

    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            "id"           => (int)$row["id"],
            "nome_usuario" => $row["nome_usuario"],
            "valor"        => (float)$row["valor"],
            "pix"          => $row["pix"],
            "created_at"   => $row["created_at"],
            "status"       => $row["status"]
        ];
    }
    echo json_encode($rows);
    exit;
}

// =====================================================
// ENDPOINT: aprovar_saque
// URL: api.php?action=aprovar_saque
// Método: POST (body: id=123)
// Usado por: Botão "Aprovar" na página Saques
// =====================================================
if ($action === "aprovar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) {
        echo json_encode(["ok" => false, "error" => "ID inválido"]);
        exit;
    }
    $stmt = $conn->prepare("UPDATE withdrawals SET status='aprovado' WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true, "message" => "Saque aprovado"]);
    exit;
}

// =====================================================
// ENDPOINT: rejeitar_saque
// URL: api.php?action=rejeitar_saque
// Método: POST (body: id=123)
// Usado por: Botão "Reprovar" na página Saques
// =====================================================
if ($action === "rejeitar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) {
        echo json_encode(["ok" => false, "error" => "ID inválido"]);
        exit;
    }
    $stmt = $conn->prepare("UPDATE withdrawals SET status='rejeitado' WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true, "message" => "Saque rejeitado"]);
    exit;
}

// =====================================================
// ENDPOINT: remover_afiliados
// URL: api.php?action=remover_afiliados
// Método: POST
// Usado por: Sistema de Cooperação (automático ou manual)
// Remove SOMENTE afiliados com cooperação expirada.
// NUNCA remove usuários da tabela users.
// =====================================================
if ($action === "remover_afiliados") {
    $stmt = $conn->prepare("DELETE FROM affiliates WHERE cooperation_expired = 1");
    $stmt->execute();
    $affected = $stmt->affected_rows;
    echo json_encode(["ok" => true, "removed" => $affected]);
    exit;
}

// =====================================================
// ENDPOINT: health
// URL: api.php?action=health
// Método: GET
// Usado por: Página Saúde do Sistema para verificar se a API está online
// =====================================================
if ($action === "health") {
    echo json_encode([
        "ok"      => true,
        "version" => "1.0.0",
        "db"      => !$conn->connect_error,
        "time"    => date("Y-m-d H:i:s")
    ]);
    exit;
}

// Ação não reconhecida
echo json_encode(["error" => "Ação não reconhecida: " . $action]);
?>`;

const testHtmlCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Teste API — Master Painel Pro</title>
    <style>
        body { font-family: monospace; background: #0a0a0f; color: #e0e0e0; padding: 20px; }
        h1 { color: #00c4ff; }
        button { background: #00c4ff; color: #000; border: none; padding: 8px 16px; 
                 margin: 4px; cursor: pointer; border-radius: 6px; font-weight: bold; }
        button:hover { background: #00a0dd; }
        .error { color: #ff4444; }
        .success { color: #00d67c; }
        pre { background: #111; padding: 15px; border-radius: 8px; overflow-x: auto; 
              border: 1px solid #222; max-height: 400px; }
        .status { margin: 10px 0; padding: 10px; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>🔌 Teste de Conexão — API Master Painel Pro</h1>
    <p>Configure a URL da API abaixo e teste cada endpoint:</p>
    
    <input id="apiUrl" value="https://suaplataforma.com/api.php" 
           style="width: 400px; padding: 8px; background: #111; color: #fff; border: 1px solid #333; border-radius: 6px;" />
    <br><br>

    <button onclick="testEndpoint('health')">🏥 Health Check</button>
    <button onclick="testEndpoint('stats')">📊 Stats</button>
    <button onclick="testEndpoint('depositos')">💰 Depósitos</button>
    <button onclick="testEndpoint('saques')">💸 Saques</button>
    <button onclick="testAll()">🚀 Testar Todos</button>
    
    <div id="status" class="status"></div>
    <pre id="result">Clique em um botão para testar...</pre>

    <script>
    function getApi() { return document.getElementById("apiUrl").value; }
    
    async function testEndpoint(action) {
        const statusEl = document.getElementById("status");
        const resultEl = document.getElementById("result");
        const url = getApi() + "?action=" + action;
        statusEl.innerHTML = "⏳ Testando " + action + "...";
        
        try {
            const t0 = performance.now();
            const r = await fetch(url);
            const ms = Math.round(performance.now() - t0);
            const data = await r.json();
            
            statusEl.innerHTML = '<span class="success">✅ ' + action + ' — OK (' + ms + 'ms)</span>';
            resultEl.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
            statusEl.innerHTML = '<span class="error">❌ ' + action + ' — ERRO: ' + e.message + '</span>';
            resultEl.textContent = "Erro: " + e.message + "\\n\\nVerifique:\\n1. URL está correta\\n2. api.php existe na hospedagem\\n3. CORS está configurado (Access-Control-Allow-Origin: *)";
        }
    }
    
    async function testAll() {
        const actions = ["health", "stats", "depositos", "saques"];
        let results = {};
        let allOk = true;
        
        for (const action of actions) {
            try {
                const r = await fetch(getApi() + "?action=" + action);
                const data = await r.json();
                results[action] = { ok: true, data };
            } catch (e) {
                results[action] = { ok: false, error: e.message };
                allOk = false;
            }
        }
        
        const statusEl = document.getElementById("status");
        statusEl.innerHTML = allOk 
            ? '<span class="success">✅ Todos os endpoints funcionando!</span>'
            : '<span class="error">⚠️ Alguns endpoints falharam</span>';
        document.getElementById("result").textContent = JSON.stringify(results, null, 2);
    }
    </script>
</body>
</html>`;

const sqlCode = `-- =====================================================
-- Banco de Dados MySQL — Estrutura completa
-- Execute estes comandos no phpMyAdmin ou terminal MySQL
-- =====================================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de afiliados
CREATE TABLE IF NOT EXISTS affiliates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    cooperation_expired BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_expired (cooperation_expired)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de carteiras/saldos
CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de depósitos
CREATE TABLE IF NOT EXISTS deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    pix VARCHAR(255),
    status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de saques
CREATE TABLE IF NOT EXISTS withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    pix VARCHAR(255),
    status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dados de teste (opcional)
INSERT INTO users (name, email) VALUES 
('João Silva', 'joao@email.com'),
('Maria Santos', 'maria@email.com'),
('Pedro Costa', 'pedro@email.com');

INSERT INTO wallets (user_id, balance) VALUES (1, 1500.00), (2, 3200.50), (3, 800.00);

INSERT INTO affiliates (user_id, name, code) VALUES 
(1, 'João Silva', 'AFF001'),
(2, 'Maria Santos', 'AFF002');

INSERT INTO deposits (user_id, amount, pix, status) VALUES 
(1, 500.00, '11999998888', 'aprovado'),
(2, 1200.00, 'maria@pix.com', 'aprovado'),
(3, 300.00, '00011122233', 'pendente');

INSERT INTO withdrawals (user_id, amount, pix, status) VALUES 
(1, 200.00, '11999998888', 'pendente'),
(2, 500.00, 'maria@pix.com', 'pendente');`;

const sections = [
  {
    icon: Globe, color: "neon-blue", title: "1. Visão Geral da Arquitetura",
    description: "Como funciona a comunicação entre o painel e as plataformas",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Master Painel Pro funciona como um <strong className="text-foreground">centralizador</strong> que se conecta ao banco de dados de cada plataforma via API REST.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📐 Arquitetura:</p>
          {[
            "Frontend: React + Vite (este painel)",
            "Backend: Lovable Cloud (autenticação, dados, funções)",
            "Plataformas: Cada plataforma tem sua API (api.php) + banco MySQL",
            "Comunicação: O painel faz fetch() → API da plataforma responde JSON",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔄 Fluxo de Dados:</p>
          {[
            "1. Usuário deposita/saca na plataforma → banco MySQL registra",
            "2. Painel chama api.php?action=depositos → API lê o banco → retorna JSON",
            "3. Painel exibe dados em tempo real no Dashboard, Depósitos, Saques",
            "4. Ao aprovar/reprovar saque → Painel envia POST → API atualiza banco",
            "5. Eventos Telegram são disparados automaticamente via configuração",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Database, color: "neon-purple", title: "2. Criar o Banco de Dados MySQL",
    description: "SQL completo para criar todas as tabelas necessárias",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Execute este SQL no <strong className="text-foreground">phpMyAdmin</strong> ou terminal MySQL da hospedagem. Crie um banco de dados para cada plataforma.</p>
        <div className="rounded-lg bg-neon-amber/5 border border-neon-amber/20 p-2">
          <p className="text-[10px] text-neon-amber font-semibold">⚠️ Tabelas obrigatórias: users, affiliates, wallets, deposits, withdrawals</p>
        </div>
        <CodeBlock code={sqlCode} language="sql" />
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30">
          <p className="text-[11px] font-bold text-foreground mb-2">📋 Resumo das tabelas:</p>
          {[
            "users → Cadastro de usuários (name, email, phone)",
            "affiliates → Afiliados vinculados (cooperation_expired para expiração)",
            "wallets → Saldo de cada usuário (balance)",
            "deposits → Depósitos realizados (amount, pix, status)",
            "withdrawals → Saques solicitados (amount, pix, status — aprovado/rejeitado/pendente)",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Key, color: "neon-amber", title: "3. Arquivo config.php",
    description: "Configuração de conexão com o banco — um por plataforma",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Crie o arquivo <strong className="text-foreground">config.php</strong> na mesma pasta do api.php com as credenciais do banco MySQL.</p>
        <CodeBlock code={configPhpCode} language="php" />
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-2">
          <p className="text-[10px] text-neon-green font-semibold">✅ Na Hostinger: vá em Bancos de Dados → MySQL para ver host, usuário e senha.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Code, color: "neon-green", title: "4. Arquivo api.php — API Completa",
    description: "Código completo da API com todos os endpoints documentados linha a linha",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Este é o <strong className="text-foreground">arquivo principal</strong>. Cada endpoint é chamado pelo painel automaticamente.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-1">
          <p className="text-[11px] font-bold text-foreground mb-2">📡 Mapa de Endpoints → Botões do Painel:</p>
          {[
            "?action=stats → Dashboard (cards de resumo: usuários, afiliados, saldo)",
            "?action=depositos → Página Depósitos (lista todos os depósitos)",
            "?action=saques → Página Saques (lista saques pendentes/aprovados)",
            "?action=aprovar_saque → Botão ✅ Aprovar na página Saques",
            "?action=rejeitar_saque → Botão ❌ Reprovar na página Saques",
            "?action=remover_afiliados → Cooperação expirada (automático)",
            "?action=health → Saúde do Sistema (verificação de API)",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-blue mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <CodeBlock code={apiPhpCode} language="php" />
      </div>
    ),
  },
  {
    icon: FileText, color: "neon-cyan", title: "5. Arquivo test_api.html — Teste Visual",
    description: "HTML para testar cada endpoint da API direto no navegador",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Suba este arquivo na mesma hospedagem e acesse pelo navegador para testar todos os endpoints <strong className="text-foreground">antes de integrar com o painel</strong>.</p>
        <CodeBlock code={testHtmlCode} language="html" />
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30">
          <p className="text-[11px] font-bold text-foreground mb-2">🧪 Como testar:</p>
          {[
            "1. Suba test_api.html para public_html/",
            "2. Acesse https://suaplataforma.com/test_api.html",
            "3. Altere a URL da API no campo de texto se necessário",
            "4. Clique em cada botão e verifique se o JSON retornado está correto",
            "5. Se der erro de CORS, verifique os headers no api.php",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Server, color: "neon-blue", title: "6. Configurar Plataforma no Painel",
    description: "Passo a passo para conectar a API ao painel",
    content: (
      <div className="space-y-2">
        {[
          "1. Vá em 'Plataformas' → clique em 'Nova Plataforma'",
          "2. Preencha o nome e a URL da plataforma (ex: https://gerenteriquinho.online)",
          "3. Clique em 'Configurar' na plataforma criada",
          "4. Na aba 'Banco de Dados', preencha host, porta, usuário, senha e nome do banco",
          "5. Configure o mapeamento de tabelas (users, affiliates, wallets)",
          "6. Clique em 'Verificar Configuração' para validar",
          "7. Vá em 'Saúde do Sistema' → 'Verificar Todas APIs' para diagnóstico completo",
          "8. Se todos os endpoints estiverem verdes ✅, a integração está pronta!",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
        <div className="rounded-lg bg-neon-amber/5 border border-neon-amber/20 p-2 mt-2">
          <p className="text-[10px] text-neon-amber font-semibold">⚠️ A URL deve apontar para o domínio onde está o api.php. Ex: https://gerenteriquinho.online</p>
        </div>
      </div>
    ),
  },
  {
    icon: Send, color: "neon-cyan", title: "7. Configurar Telegram Bot",
    description: "Como criar o bot e configurar eventos automáticos",
    content: (
      <div className="space-y-2">
        {[
          "1. Abra o Telegram e busque @BotFather",
          "2. Envie /newbot e siga as instruções para criar um bot",
          "3. Copie o Bot Token (ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)",
          "4. Crie um grupo/canal e adicione o bot como administrador",
          "5. Para obter o Chat ID, envie uma mensagem no grupo e acesse:",
          "   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates",
          "6. No painel, vá em 'Integrações' → cole Bot Token e Chat ID",
          "7. Clique em 'Testar Conexão' para verificar",
          "8. Em 'Eventos', configure as mensagens com chaves dinâmicas",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 mt-2">
          <p className="text-[11px] font-bold text-foreground mb-2">🔑 Chaves dinâmicas disponíveis:</p>
          {[
            "{nome_usuario} — Nome do usuário",
            "{valor} — Valor monetário (R$)",
            "{nome_plataforma} — Nome da plataforma",
            "{quantidade_usuarios} — Total de usuários",
            "{quantidade_dias} — Dias da cooperação",
            "{pix} — Chave Pix do usuário",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-neon-cyan mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Zap, color: "neon-red", title: "8. Cooperação — Exclusão de Afiliados",
    description: "Como funciona a remoção automática de afiliados",
    content: (
      <div className="space-y-2">
        {[
          "Na configuração de cada plataforma, defina 'Dias de Cooperação' (ex: 30)",
          "A data de expiração é calculada automaticamente",
          "Quando expira, o sistema pode: excluir somente afiliados OU enviar notificação Telegram",
          "Usuários totais NUNCA são excluídos",
          "A API chama ?action=remover_afiliados → DELETE FROM affiliates WHERE cooperation_expired = 1",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-red mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
      </div>
    ),
  },
  {
    icon: TableProperties, color: "neon-purple", title: "9. Mapeamento Dinâmico de Tabelas",
    description: "Como configurar nomes diferentes de tabelas e colunas para cada plataforma",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O <strong className="text-foreground">Mapeamento Dinâmico</strong> permite integrar qualquer banco de dados sem alterar o código da API. Cada plataforma pode ter nomes diferentes de tabelas e colunas.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📐 Como funciona:</p>
          {[
            "1. Vá em Plataformas → Configurar → aba Mapeamento",
            "2. Configure os nomes reais das tabelas do banco (ex: transactions em vez de deposits)",
            "3. Configure os nomes reais das colunas (ex: balance_amount em vez de balance)",
            "4. Clique em 'Testar Estrutura do Banco' para validar",
            "5. O api.php usará automaticamente os nomes configurados nas queries SQL",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📋 Tabelas configuráveis:</p>
          {[
            "Tabela de Usuários → padrão: users",
            "Tabela de Depósitos → padrão: deposits",
            "Tabela de Saques → padrão: withdrawals",
            "Tabela de Saldo → padrão: wallets",
            "Tabela de Afiliados → padrão: affiliates",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-cyan mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📋 Colunas configuráveis:</p>
          {[
            "ID do Usuário → padrão: id",
            "Nome do Usuário → padrão: name",
            "FK User ID → padrão: user_id",
            "Valor Depósito → padrão: amount",
            "Valor Saque → padrão: amount",
            "Chave PIX → padrão: pix",
            "Status → padrão: status",
            "Data Criação → padrão: created_at",
            "Saldo → padrão: balance",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-purple mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 mt-2">
          <p className="text-[10px] text-primary font-semibold">💡 Exemplo: Se o banco usa "transactions" em vez de "deposits" e "balance_amount" em vez de "balance", basta mapear no painel — sem alterar código.</p>
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2">
          <p className="text-[10px] text-destructive font-semibold">⚠️ Se o mapeamento estiver errado, o diagnóstico mostrará: "coluna 'X' não encontrada na tabela 'Y'. Verifique o mapeamento de colunas."</p>
        </div>
      </div>
    ),
  },
  {
    icon: Shield, color: "neon-blue", title: "10. Segurança e Checklist Final",
    description: "Boas práticas de segurança e checklist de verificação",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30">
          <p className="text-[11px] font-bold text-foreground mb-2">🔒 Segurança:</p>
          {[
            "Prepared statements no api.php para evitar SQL injection",
            "CORS configurado (Access-Control-Allow-Origin: *)",
            "Validação de inputs antes de executar queries",
            "RLS no Lovable Cloud — cada usuário acessa apenas seus dados",
            "Tokens e senhas protegidos no banco",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-neon-blue mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">✅ Checklist Final:</p>
          {[
            "Banco MySQL criado com todas as tabelas",
            "config.php com credenciais corretas",
            "api.php hospedado e acessível via HTTPS",
            "test_api.html testado — todos endpoints retornando JSON",
            "Plataforma adicionada no painel com URL correta",
            "Saúde do Sistema mostrando todos endpoints verdes",
            "Telegram Bot configurado e testado",
            "Eventos configurados com mensagens personalizadas",
            "Cooperação definida por plataforma",
            "Dashboard exibindo dados reais da API",
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
          Tutorial <span className="gradient-text">& Documentação Completa</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Guia definitivo: API, banco de dados, integração real e diagnóstico de erros</p>
      </motion.div>

      {/* Quick Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-primary/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <p className="text-xs font-bold text-foreground mb-2">📁 Estrutura de Arquivos na Hospedagem:</p>
        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">
{`/public_html
├── config.php        → Credenciais do banco MySQL
├── api.php           → API principal (todos os endpoints)
└── test_api.html     → HTML para testar endpoints no navegador`}
        </pre>
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
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors">
                <div className={`p-2 rounded-lg bg-${section.color}/10`}>
                  <Icon className={`w-5 h-5 text-${section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm text-foreground">{section.title}</h2>
                  <p className="text-[10px] text-muted-foreground">{section.description}</p>
                </div>
                <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="px-4 pb-4 border-t border-border/30 pt-3">
                  {section.content}
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
