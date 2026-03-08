import { motion } from "framer-motion";
import { BookOpen, Database, Key, Zap, Server, Send, Shield, ArrowRight, Code, FileText, Globe, Copy, CheckCircle, TableProperties, RefreshCw } from "lucide-react";
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
// config.php — Credenciais + Conexão com o Painel
// =====================================================
// Coloque este arquivo na raiz da hospedagem (public_html/)
// Cada plataforma terá seu próprio config.php.

// ── Conexão com o banco MySQL ──
$host = "localhost";          // Host do banco MySQL
$user = "seu_usuario_db";    // Usuário do banco de dados
$pass = "sua_senha_db";      // Senha do banco de dados
$db   = "nome_do_banco";     // Nome do banco da plataforma

// ── Conexão com o Painel (Mapeamento Dinâmico) ──
// Cole aqui a URL do endpoint de mapeamento + sua api_key.
// Encontre esses dados em: Plataformas → Configurar → aba API
$painel_url = "https://SEU_PROJETO.supabase.co/functions/v1/get-platform-mapping?api_key=SUA_API_KEY";
$cache_file = __DIR__ . "/mapping_cache.json";
$cache_ttl  = 60; // Tempo de cache em segundos (60 = 1 minuto)
?>`;

const apiPhpCode = `<?php
// =====================================================
// api.php — API Dinâmica v3.1 — Mapeamento por Tabela
// =====================================================
// Este arquivo NÃO precisa ser editado manualmente.
// Todas as tabelas e colunas são lidas do painel.
// Cada tabela tem suas próprias colunas configuradas.
// =====================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

include 'config.php';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) { echo json_encode(["error" => "Falha: " . $conn->connect_error]); exit; }
$conn->set_charset("utf8mb4");

// ── Mapeamento Dinâmico com Cache ──
function getMapping() {
    global $painel_url, $cache_file, $cache_ttl;
    if (file_exists($cache_file)) {
        $cache = json_decode(file_get_contents($cache_file), true);
        if ($cache && isset($cache["_cached_at"]) && (time() - $cache["_cached_at"]) < $cache_ttl) {
            $cache["_from_cache"] = true; return $cache;
        }
    }
    $ctx = stream_context_create(["http" => ["timeout" => 5]]);
    $response = @file_get_contents($painel_url, false, $ctx);
    if ($response === false) {
        if (file_exists($cache_file)) {
            $cache = json_decode(file_get_contents($cache_file), true);
            if ($cache) { $cache["_from_cache"] = true; $cache["_warning"] = "Painel offline."; return $cache; }
        }
        return null;
    }
    $data = json_decode($response, true);
    if ($data && isset($data["ok"]) && $data["ok"]) {
        $data["_cached_at"] = time();
        file_put_contents($cache_file, json_encode($data));
        $data["_from_cache"] = false; return $data;
    }
    return null;
}

$mapping = getMapping();
if (!$mapping) { echo json_encode(["error" => "Mapeamento indisponível."]); exit; }

// ── Tabelas ──
$t = $mapping["tables"];
$tb_usuarios  = $t["usuarios"]  ?? "users";
$tb_depositos = $t["depositos"] ?? "deposits";
$tb_saques    = $t["saques"]    ?? "withdrawals";
$tb_saldo     = $t["saldo"]     ?? "wallets";
$tb_afiliados = $t["afiliados"] ?? "affiliates";

// ── Colunas por Tabela ──
$cu = $mapping["columns"]["usuarios"]  ?? [];
$cd = $mapping["columns"]["depositos"] ?? [];
$cs = $mapping["columns"]["saques"]    ?? [];
$cw = $mapping["columns"]["saldo"]     ?? [];
$ca = $mapping["columns"]["afiliados"] ?? [];

$col_user_id    = $cu["id"]       ?? "id";
$col_user_name  = $cu["nome"]     ?? "name";
$col_dep_id     = $cd["id"]       ?? "id";
$col_dep_uid    = $cd["user_id"]  ?? "user_id";
$col_dep_valor  = $cd["valor"]    ?? "amount";
$col_dep_pix    = $cd["pix"]      ?? "pix";
$col_dep_status = $cd["status"]   ?? "status";
$col_dep_date   = $cd["created_at"] ?? "created_at";
$col_saq_id     = $cs["id"]       ?? "id";
$col_saq_uid    = $cs["user_id"]  ?? "user_id";
$col_saq_valor  = $cs["valor"]    ?? "amount";
$col_saq_pix    = $cs["pix"]      ?? "pix";
$col_saq_status = $cs["status"]   ?? "status";
$col_saq_date   = $cs["created_at"] ?? "created_at";
$col_wal_uid    = $cw["user_id"]  ?? "user_id";
$col_wal_saldo  = $cw["saldo"]    ?? "balance";
$col_aff_expired = $ca["cooperation_expired"] ?? "cooperation_expired";

$action = $_GET["action"] ?? "";

if ($action === "health") {
    echo json_encode(["ok"=>true,"version"=>"3.1.0","db"=>true,
        "mapping_source"=>$mapping["_from_cache"]?"cache":"painel",
        "tables"=>$t,"time"=>date("c")]); exit;
}

if ($action === "stats") {
    $r1 = $conn->query("SELECT COUNT(*) as total FROM \\\`$tb_usuarios\\\`");
    $r2 = $conn->query("SELECT COUNT(*) as total FROM \\\`$tb_afiliados\\\`");
    $r3 = $conn->query("SELECT COALESCE(SUM(\\\`$col_wal_saldo\\\`),0) as total FROM \\\`$tb_saldo\\\`");
    $err = [];
    if (!$r1) $err[] = "Tabela '$tb_usuarios': ".$conn->error;
    if (!$r2) $err[] = "Tabela '$tb_afiliados': ".$conn->error;
    if (!$r3) $err[] = "Tabela '$tb_saldo'/'$col_wal_saldo': ".$conn->error;
    if ($err) { echo json_encode(["error"=>"Mapeamento","detalhes"=>$err]); exit; }
    echo json_encode(["total_usuarios"=>(int)$r1->fetch_assoc()["total"],
        "total_afiliados"=>(int)$r2->fetch_assoc()["total"],
        "saldo_total"=>(float)$r3->fetch_assoc()["total"]]); exit;
}

if ($action === "depositos") {
    $sql = "SELECT u.\\\`$col_user_name\\\` as nome_usuario, d.\\\`$col_dep_valor\\\` as valor, d.\\\`$col_dep_pix\\\` as pix, d.\\\`$col_dep_date\\\` as created_at, d.\\\`$col_dep_status\\\` as status FROM \\\`$tb_depositos\\\` d JOIN \\\`$tb_usuarios\\\` u ON d.\\\`$col_dep_uid\\\` = u.\\\`$col_user_id\\\` ORDER BY d.\\\`$col_dep_date\\\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error"=>$conn->error,"query"=>$sql]); exit; }
    $rows = []; while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows); exit;
}

if ($action === "saques") {
    $sql = "SELECT w.\\\`$col_saq_id\\\` as id, u.\\\`$col_user_name\\\` as nome_usuario, w.\\\`$col_saq_valor\\\` as valor, w.\\\`$col_saq_pix\\\` as pix, w.\\\`$col_saq_date\\\` as created_at, w.\\\`$col_saq_status\\\` as status FROM \\\`$tb_saques\\\` w JOIN \\\`$tb_usuarios\\\` u ON w.\\\`$col_saq_uid\\\` = u.\\\`$col_user_id\\\` ORDER BY w.\\\`$col_saq_date\\\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error"=>$conn->error,"query"=>$sql]); exit; }
    $rows = []; while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows); exit;
}

if ($action === "aprovar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok"=>false,"error"=>"ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \\\`$tb_saques\\\` SET \\\`$col_saq_status\\\`='aprovado' WHERE \\\`$col_saq_id\\\`=?");
    $stmt->bind_param("i", $id); $stmt->execute();
    echo json_encode(["ok"=>true]); exit;
}

if ($action === "rejeitar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok"=>false,"error"=>"ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \\\`$tb_saques\\\` SET \\\`$col_saq_status\\\`='rejeitado' WHERE \\\`$col_saq_id\\\`=?");
    $stmt->bind_param("i", $id); $stmt->execute();
    echo json_encode(["ok"=>true]); exit;
}

if ($action === "remover_afiliados") {
    $stmt = $conn->prepare("DELETE FROM \\\`$tb_afiliados\\\` WHERE \\\`$col_aff_expired\\\` = 1");
    $stmt->execute();
    echo json_encode(["ok"=>true,"removed"=>$stmt->affected_rows]); exit;
}

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
    </style>
</head>
<body>
    <h1>🔌 Teste de Conexão — API Master Painel Pro v3.0</h1>
    <p>Configure a URL da API abaixo e teste cada endpoint:</p>
    
    <input id="apiUrl" value="https://suaplataforma.com/api.php" 
           style="width: 400px; padding: 8px; background: #111; color: #fff; border: 1px solid #333; border-radius: 6px;" />
    <br><br>

    <button onclick="testEndpoint('health')">🏥 Health</button>
    <button onclick="testEndpoint('stats')">📊 Stats</button>
    <button onclick="testEndpoint('depositos')">💰 Depósitos</button>
    <button onclick="testEndpoint('saques')">💸 Saques</button>
    <button onclick="testAll()">🚀 Testar Todos</button>
    
    <div id="status" style="margin: 10px 0; padding: 10px;"></div>
    <pre id="result">Clique em um botão para testar...</pre>

    <script>
    function getApi() { return document.getElementById("apiUrl").value; }
    
    async function testEndpoint(action) {
        const statusEl = document.getElementById("status");
        const resultEl = document.getElementById("result");
        statusEl.innerHTML = "⏳ Testando " + action + "...";
        try {
            const t0 = performance.now();
            const r = await fetch(getApi() + "?action=" + action);
            const ms = Math.round(performance.now() - t0);
            const data = await r.json();
            
            if (data.mapping_source) {
                statusEl.innerHTML = '<span class="success">✅ ' + action + ' — OK (' + ms + 'ms) | Mapeamento: ' + data.mapping_source + '</span>';
            } else {
                statusEl.innerHTML = '<span class="success">✅ ' + action + ' — OK (' + ms + 'ms)</span>';
            }
            resultEl.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
            statusEl.innerHTML = '<span class="error">❌ ' + action + ' — ERRO: ' + e.message + '</span>';
            resultEl.textContent = "Erro: " + e.message;
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
                results[action] = { ok: !data.error, data };
                if (data.error) allOk = false;
            } catch (e) {
                results[action] = { ok: false, error: e.message };
                allOk = false;
            }
        }
        document.getElementById("status").innerHTML = allOk 
            ? '<span class="success">✅ Todos os endpoints funcionando!</span>'
            : '<span class="error">⚠️ Alguns endpoints falharam</span>';
        document.getElementById("result").textContent = JSON.stringify(results, null, 2);
    }
    </script>
</body>
</html>`;

const sqlCode = `-- =====================================================
-- Banco de Dados MySQL — Estrutura de exemplo
-- Execute no phpMyAdmin ou terminal MySQL
-- =====================================================
-- NOTA: Os nomes das tabelas abaixo são apenas exemplos.
-- Cada plataforma pode usar nomes diferentes!
-- Configure os nomes reais no painel → aba Mapeamento.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    cooperation_expired BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    pix VARCHAR(255),
    status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    pix VARCHAR(255),
    status ENUM('pendente','aprovado','rejeitado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

const sections = [
  {
    icon: Globe, color: "neon-blue", title: "1. Visão Geral — API Controlada pelo Painel",
    description: "Como o painel controla automaticamente a API sem editar código PHP",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O Master Painel Pro v3.1 usa um sistema de <strong className="text-foreground">mapeamento dinâmico por tabela</strong>: a API busca os nomes de tabelas e colunas (separados por tabela) diretamente do painel.</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-2">
          <p className="text-[11px] font-bold text-neon-green">⚡ Fluxo Dinâmico:</p>
          {[
            "1. Administrador configura o mapeamento de tabelas no Painel (aba Mapeamento)",
            "2. O mapeamento é salvo no banco do painel (Lovable Cloud)",
            "3. O api.php na hospedagem busca o mapeamento via endpoint (com cache de 60s)",
            "4. As queries SQL são montadas automaticamente com os nomes configurados",
            "5. Se o admin mudar no painel → a API muda sozinha em até 60 segundos",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📐 Arquitetura:</p>
          {[
            "Frontend: React + Vite (este painel)",
            "Backend: Lovable Cloud (autenticação, dados, funções)",
            "Endpoint de Mapeamento: Edge Function get-platform-mapping (público, autenticado por api_key)",
            "Plataformas: Cada plataforma tem api.php + config.php na hospedagem",
            "Comunicação: api.php → busca mapeamento do painel → monta queries → responde JSON → painel exibe",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
          <p className="text-[10px] text-primary font-semibold">💡 Exemplo: Se a plataforma usa "transactions" em vez de "deposits", basta mudar no painel → aba Mapeamento. O api.php passa a usar "transactions" automaticamente, sem editar nenhum arquivo.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Database, color: "neon-purple", title: "2. Criar o Banco de Dados MySQL",
    description: "SQL de exemplo — os nomes das tabelas podem variar por plataforma",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Execute este SQL no <strong className="text-foreground">phpMyAdmin</strong> ou terminal MySQL. Os nomes das tabelas são apenas exemplos — cada plataforma pode ter nomes diferentes.</p>
        <div className="rounded-lg bg-neon-amber/5 border border-neon-amber/20 p-2">
          <p className="text-[10px] text-neon-amber font-semibold">⚠️ Não se preocupe com nomes exatos! Configure os nomes reais no painel → aba Mapeamento.</p>
        </div>
        <CodeBlock code={sqlCode} language="sql" />
      </div>
    ),
  },
  {
    icon: Key, color: "neon-amber", title: "3. Arquivo config.php — Credenciais + Painel",
    description: "Configuração de conexão com o banco e URL do painel",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O config.php agora contém <strong className="text-foreground">apenas credenciais do banco e a URL do painel</strong>. Nenhum nome de tabela ou coluna — tudo vem do painel automaticamente.</p>
        <CodeBlock code={configPhpCode} language="php" />
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">📋 Onde encontrar os dados:</p>
          {[
            "Host, Usuário, Senha → painel de hospedagem (Hostinger, cPanel, etc.)",
            "URL do Painel + api_key → Plataformas → Configurar → aba API",
            "💡 Dica: Use o botão 'Gerar config.php' na aba Gerar para criar automaticamente!",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Code, color: "neon-green", title: "4. Arquivo api.php — API Dinâmica v3.0",
    description: "API que busca mapeamento do painel automaticamente, com cache e fallback",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O api.php v3.0 <strong className="text-foreground">não tem nomes de tabelas no código</strong>. Ele busca tudo do painel a cada request (com cache de 60s).</p>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3 space-y-1">
          <p className="text-[11px] font-bold text-neon-green mb-1">⚡ Novidades da v3.0:</p>
          {[
            "Mapeamento dinâmico: tabelas e colunas vêm do painel",
            "Cache local: guarda o mapeamento por 60s em mapping_cache.json",
            "Fallback offline: se o painel estiver fora, usa o último cache",
            "Diagnóstico inteligente: erros SQL mostram qual tabela/coluna está errada",
            "Health endpoint: mostra origem do mapeamento (cache ou painel)",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-green mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-1">
          <p className="text-[11px] font-bold text-foreground mb-2">📡 Endpoints:</p>
          {[
            "?action=health → Saúde + origem do mapeamento (cache/painel) + tabelas usadas",
            "?action=stats → Dashboard (usuários, afiliados, saldo)",
            "?action=depositos → Lista de depósitos",
            "?action=saques → Lista de saques",
            "?action=aprovar_saque → Aprovar saque (POST id)",
            "?action=rejeitar_saque → Rejeitar saque (POST id)",
            "?action=remover_afiliados → Remover afiliados expirados",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
        <CodeBlock code={apiPhpCode} language="php" />
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
          <p className="text-[10px] text-primary font-semibold">💡 Use o botão "Gerar api.php" na aba Gerar para gerar o código com sua api_key pré-configurada!</p>
        </div>
      </div>
    ),
  },
  {
    icon: FileText, color: "neon-cyan", title: "5. Arquivo test_api.html — Teste Visual",
    description: "HTML para testar todos os endpoints direto no navegador",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Suba este arquivo na hospedagem para testar <strong className="text-foreground">antes de integrar</strong>. O health agora mostra a origem do mapeamento.</p>
        <CodeBlock code={testHtmlCode} language="html" />
      </div>
    ),
  },
  {
    icon: Server, color: "neon-blue", title: "6. Configurar Plataforma no Painel",
    description: "Passo a passo completo: adicionar, mapear, gerar arquivos, testar",
    content: (
      <div className="space-y-2">
        {[
          "1. Vá em 'Plataformas' → 'Nova Plataforma' → preencha nome e URL",
          "2. Clique em 'Configurar' na plataforma criada",
          "3. Aba 'Banco' → preencha host, porta, usuário, senha e nome do banco",
          "4. Aba 'Mapeamento' → configure os nomes reais das tabelas e colunas do banco",
          "5. Clique em 'Salvar' para gravar todas as configurações",
          "6. Aba 'Gerar' → copie o config.php e api.php gerados automaticamente",
          "7. Suba os dois arquivos na hospedagem (public_html/)",
          "8. Aba 'API' → copie a api_key e cole no config.php da hospedagem",
          "9. Clique em 'Testar API' e 'Testar Endpoint' para validar tudo",
          "10. Se tudo estiver verde ✅, a integração está pronta!",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-2 mt-2">
          <p className="text-[10px] text-neon-green font-semibold">✅ Depois disso, qualquer mudança no mapeamento (painel) reflete automaticamente na API em até 60 segundos!</p>
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
          <p className="text-[11px] font-bold text-foreground mb-2">🔑 Chaves dinâmicas:</p>
          {["{nome_usuario}", "{valor}", "{nome_plataforma}", "{quantidade_usuarios}", "{quantidade_dias}", "{pix}"].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-neon-cyan mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground font-mono">{t}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Zap, color: "neon-red", title: "8. Cooperação — Exclusão de Afiliados",
    description: "Remoção automática de afiliados por tempo de cooperação",
    content: (
      <div className="space-y-2">
        {[
          "Defina 'Dias de Cooperação' na configuração de cada plataforma",
          "A data de expiração é calculada automaticamente",
          "Quando expira, o sistema chama ?action=remover_afiliados na API",
          "Somente afiliados são removidos — usuários totais NUNCA são excluídos",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-red mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">{t}</p></div>
        ))}
      </div>
    ),
  },
  {
    icon: TableProperties, color: "neon-purple", title: "9. Mapeamento Dinâmico — Como Funciona",
    description: "Entenda o sistema que elimina a necessidade de editar código PHP",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">O <strong className="text-foreground">Mapeamento Dinâmico</strong> é o coração do sistema v3.0. Ele permite que cada plataforma tenha nomes diferentes de tabelas e colunas, sem editar código.</p>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📐 Como funciona internamente:</p>
          {[
            "1. Cada plataforma tem uma api_key única gerada automaticamente",
            "2. O config.php da hospedagem contém a api_key + URL do painel",
            "3. Quando o api.php recebe um request, ele chama o endpoint do painel",
            "4. O endpoint retorna: { tables: {usuarios: 'players', ...}, columns: {saldo: 'balance', ...} }",
            "5. O api.php usa esses nomes para montar as queries SQL",
            "6. O resultado é cacheado por 60 segundos em mapping_cache.json",
            "7. Se o painel estiver offline, usa o último cache salvo",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📋 Exemplo prático:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary">Plataforma A</p>
              {["usuarios = users", "depositos = transactions", "saldo = wallets"].map((t, i) => (
                <p key={i} className="text-[10px] text-muted-foreground font-mono">{t}</p>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-neon-cyan">Plataforma B</p>
              {["usuarios = players", "depositos = payments", "saldo = accounts"].map((t, i) => (
                <p key={i} className="text-[10px] text-muted-foreground font-mono">{t}</p>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Ambas usam o <strong>mesmo api.php</strong> — a diferença está no mapeamento configurado no painel.</p>
        </div>
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2">
          <p className="text-[10px] text-destructive font-semibold">⚠️ Se o mapeamento estiver errado, a API retorna: "Tabela 'X' não encontrada" ou "Coluna 'Y' não encontrada". Corrija no painel → aba Mapeamento.</p>
        </div>
      </div>
    ),
  },
  {
    icon: RefreshCw, color: "neon-amber", title: "10. Cache e Comportamento Offline",
    description: "Como a API funciona quando o painel está offline",
    content: (
      <div className="space-y-2">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">📦 Sistema de Cache:</p>
          {[
            "A API guarda o mapeamento em mapping_cache.json na hospedagem",
            "O cache dura 60 segundos (configurável no config.php via $cache_ttl)",
            "Dentro do TTL, a API usa o cache sem chamar o painel",
            "Após o TTL, busca o mapeamento atualizado do painel",
            "Se o painel estiver offline, usa o último cache disponível",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-neon-amber mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 space-y-2">
          <p className="text-[11px] font-bold text-foreground">🔄 Cenários:</p>
          {[
            "Painel online + cache válido → usa cache (rápido)",
            "Painel online + cache expirado → busca novo mapeamento",
            "Painel offline + cache existente → usa cache + adiciona warning",
            "Painel offline + sem cache → retorna erro com instruções",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2"><ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-2">
          <p className="text-[10px] text-neon-green font-semibold">✅ O endpoint ?action=health mostra o campo mapping_source (cache ou painel) e warning se estiver usando fallback.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Shield, color: "neon-blue", title: "11. Segurança e Checklist Final",
    description: "Boas práticas e verificação completa",
    content: (
      <div className="space-y-3">
        <div className="rounded-lg bg-secondary/30 p-3 border border-border/30">
          <p className="text-[11px] font-bold text-foreground mb-2">🔒 Segurança:</p>
          {[
            "api_key única por plataforma — autenticação do endpoint de mapeamento",
            "Prepared statements no api.php para evitar SQL injection",
            "CORS configurado (Access-Control-Allow-Origin: *)",
            "RLS no Lovable Cloud — cada usuário acessa apenas seus dados",
            "Cache local impede leitura excessiva do endpoint",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2 mb-1"><ArrowRight className="w-3 h-3 text-neon-blue mt-0.5 flex-shrink-0" /><p className="text-[10px] text-muted-foreground">{t}</p></div>
          ))}
        </div>
        <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
          <p className="text-[11px] font-bold text-neon-green mb-2">✅ Checklist Final:</p>
          {[
            "Banco MySQL criado",
            "config.php com credenciais + $painel_url + api_key",
            "api.php v3.0 hospedado e acessível via HTTPS",
            "Plataforma adicionada no painel com URL correta",
            "Mapeamento de tabelas/colunas configurado no painel",
            "Botão 'Testar Endpoint' → mapeamento retornado com sucesso",
            "Botão 'Testar API' → todos endpoints verdes ✅",
            "test_api.html testado → health mostra mapping_source: 'painel'",
            "Telegram Bot configurado (opcional)",
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
          Tutorial <span className="gradient-text">& Documentação v3.0</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Guia definitivo: API dinâmica controlada pelo painel, mapeamento automático e diagnóstico</p>
      </motion.div>

      {/* Quick Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-primary/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <p className="text-xs font-bold text-foreground mb-2">📁 Estrutura de Arquivos na Hospedagem:</p>
        <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">
{`/public_html
├── config.php           → Credenciais do banco + URL do painel + api_key
├── api.php              → API dinâmica v3.1 (mapeamento por tabela)
├── mapping_cache.json   → Cache local do mapeamento (gerado automaticamente)
└── test_api.html        → HTML para testar endpoints no navegador`}
        </pre>
      </motion.div>

      {/* Dynamic mapping highlight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-xl border border-neon-green/20 p-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-4 h-4 text-neon-green" />
          <p className="text-xs font-bold text-foreground">⚡ Mude no painel → a API muda sozinha</p>
        </div>
        <p className="text-[10px] text-muted-foreground">O api.php v3.0 não tem nomes de tabelas no código. Ele busca tudo do painel via endpoint. Altere o mapeamento no painel → a API se adapta automaticamente em até 60 segundos.</p>
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
                <div className={`p-2 rounded-lg bg-${section.color}/10`}><Icon className={`w-4 h-4 text-${section.color}`} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{section.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{section.description}</p>
                </div>
                <div className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</div>
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
