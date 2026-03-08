import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe, TableProperties, Columns3, Copy, Code, Key, Download, FileText, Users, Wallet, ArrowDownCircle, ArrowUpCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Plataforma, useUpdatePlatform } from "@/hooks/usePlatforms";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useToast } from "@/hooks/use-toast";

interface ConfigureModalProps {
  platform: Plataforma | null;
  onClose: () => void;
}

const ConfigureModal = ({ platform, onClose }: ConfigureModalProps) => {
  const { toast } = useToast();
  const updatePlatform = useUpdatePlatform();
  const api = usePlatformApi();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testDetails, setTestDetails] = useState<string[]>([]);
  const [testingStructure, setTestingStructure] = useState(false);
  const [structureResult, setStructureResult] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [form, setForm] = useState({
    url: "", db_host: "", db_port: 3306, db_user: "", db_pass: "", db_name: "",
    // Tables
    tabela_usuarios: "users", tabela_depositos: "deposits", tabela_saques: "withdrawals",
    tabela_saldo: "wallets", tabela_afiliados: "affiliates",
    // Columns — Usuarios
    coluna_id_usuario: "id", coluna_nome_usuario: "name",
    coluna_email_usuario: "email", coluna_telefone_usuario: "phone",
    // Columns — Depositos
    coluna_id_deposito: "id", coluna_user_id_deposito: "user_id",
    coluna_valor_deposito: "amount", coluna_pix_deposito: "pix",
    coluna_status_deposito: "status", coluna_created_at_deposito: "created_at",
    // Columns — Saques
    coluna_id_saque: "id", coluna_user_id_saque: "user_id",
    coluna_valor_saque: "amount", coluna_pix_saque: "pix",
    coluna_status_saque: "status", coluna_created_at_saque: "created_at",
    // Columns — Saldo
    coluna_user_id_saldo: "user_id", coluna_saldo: "balance",
    // Columns — Afiliados
    coluna_id_afiliado: "id", coluna_nome_afiliado: "name",
    coluna_user_id_afiliado: "user_id", coluna_cooperation_expired: "cooperation_expired",
    // Legacy shared (kept for backward compat)
    coluna_pix: "pix", coluna_status: "status", coluna_created_at: "created_at", coluna_user_id_fk: "user_id",
    // Other
    webhook_telegram: "", webhook_outro: "", gateway_chave: "",
    cooperacao_dias: 30,
  });

  useEffect(() => {
    if (platform) {
      const p = platform as any;
      setForm({
        url: p.url ?? "",
        db_host: p.db_host ?? "", db_port: p.db_port ?? 3306,
        db_user: p.db_user ?? "", db_pass: p.db_pass ?? "", db_name: p.db_name ?? "",
        tabela_usuarios: p.tabela_usuarios ?? "users",
        tabela_depositos: p.tabela_depositos ?? "deposits",
        tabela_saques: p.tabela_saques ?? "withdrawals",
        tabela_saldo: p.tabela_saldo ?? "wallets",
        tabela_afiliados: p.tabela_afiliados ?? "affiliates",
        coluna_id_usuario: p.coluna_id_usuario ?? "id",
        coluna_nome_usuario: p.coluna_nome_usuario ?? "name",
        coluna_email_usuario: p.coluna_email_usuario ?? "email",
        coluna_telefone_usuario: p.coluna_telefone_usuario ?? "phone",
        coluna_id_deposito: p.coluna_id_deposito ?? "id",
        coluna_user_id_deposito: p.coluna_user_id_deposito ?? p.coluna_user_id_fk ?? "user_id",
        coluna_valor_deposito: p.coluna_valor_deposito ?? "amount",
        coluna_pix_deposito: p.coluna_pix_deposito ?? p.coluna_pix ?? "pix",
        coluna_status_deposito: p.coluna_status_deposito ?? p.coluna_status ?? "status",
        coluna_created_at_deposito: p.coluna_created_at_deposito ?? p.coluna_created_at ?? "created_at",
        coluna_id_saque: p.coluna_id_saque ?? "id",
        coluna_user_id_saque: p.coluna_user_id_saque ?? p.coluna_user_id_fk ?? "user_id",
        coluna_valor_saque: p.coluna_valor_saque ?? "amount",
        coluna_pix_saque: p.coluna_pix_saque ?? p.coluna_pix ?? "pix",
        coluna_status_saque: p.coluna_status_saque ?? p.coluna_status ?? "status",
        coluna_created_at_saque: p.coluna_created_at_saque ?? p.coluna_created_at ?? "created_at",
        coluna_user_id_saldo: p.coluna_user_id_saldo ?? "user_id",
        coluna_saldo: p.coluna_saldo ?? "balance",
        coluna_id_afiliado: p.coluna_id_afiliado ?? "id",
        coluna_nome_afiliado: p.coluna_nome_afiliado ?? "name",
        coluna_user_id_afiliado: p.coluna_user_id_afiliado ?? "user_id",
        coluna_cooperation_expired: p.coluna_cooperation_expired ?? "cooperation_expired",
        coluna_pix: p.coluna_pix ?? "pix",
        coluna_status: p.coluna_status ?? "status",
        coluna_created_at: p.coluna_created_at ?? "created_at",
        coluna_user_id_fk: p.coluna_user_id_fk ?? "user_id",
        webhook_telegram: p.webhook_telegram ?? "",
        webhook_outro: p.webhook_outro ?? "",
        gateway_chave: p.gateway_chave ?? "",
        cooperacao_dias: p.cooperacao_dias ?? 30,
      });
    }
  }, [platform]);

  if (!platform) return null;

  const apiKey = (platform as any).api_key ?? "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const mappingEndpoint = `${supabaseUrl}/functions/v1/get-platform-mapping?api_key=${apiKey}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateConfigPhp = () => {
    return `<?php
// =====================================================
// config.php — Gerado automaticamente pelo Painel
// =====================================================
$host = "${form.db_host || "localhost"}";
$user = "${form.db_user || "seu_usuario_db"}";
$pass = "${form.db_pass || "sua_senha_db"}";
$db   = "${form.db_name || "nome_do_banco"}";

// ── Conexão com o Painel (Mapeamento Dinâmico) ──
$painel_url = "${mappingEndpoint}";
$cache_file = __DIR__ . "/mapping_cache.json";
$cache_ttl  = 60;
?>`;
  };

  const generateApiPhp = () => {
    return `<?php
// =====================================================
// api.php — API Dinâmica v3.1 — Mapeamento por Tabela
// =====================================================
// Este arquivo NÃO precisa ser editado manualmente.
// Todas as tabelas e colunas são lidas do painel.
// =====================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

include 'config.php';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) { echo json_encode(["error" => "Falha na conexão: " . $conn->connect_error]); exit; }
$conn->set_charset("utf8mb4");

// ── Mapeamento Dinâmico com Cache ──
function getMapping() {
    global $painel_url, $cache_file, $cache_ttl;
    if (file_exists($cache_file)) {
        $cache = json_decode(file_get_contents($cache_file), true);
        if ($cache && isset($cache["_cached_at"]) && (time() - $cache["_cached_at"]) < $cache_ttl) {
            $cache["_from_cache"] = true;
            return $cache;
        }
    }
    $ctx = stream_context_create(["http" => ["timeout" => 5]]);
    $response = @file_get_contents($painel_url, false, $ctx);
    if ($response === false) {
        if (file_exists($cache_file)) {
            $cache = json_decode(file_get_contents($cache_file), true);
            if ($cache) { $cache["_from_cache"] = true; $cache["_warning"] = "Painel offline. Usando cache."; return $cache; }
        }
        return null;
    }
    $data = json_decode($response, true);
    if ($data && isset($data["ok"]) && $data["ok"]) {
        $data["_cached_at"] = time();
        file_put_contents($cache_file, json_encode($data));
        $data["_from_cache"] = false;
        return $data;
    }
    return null;
}

$mapping = getMapping();
if (!$mapping) {
    echo json_encode(["error" => "Mapeamento indisponível. Verifique api_key e painel."]);
    exit;
}

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

// Usuarios
$col_user_id    = $cu["id"]       ?? "id";
$col_user_name  = $cu["nome"]     ?? "name";
$col_user_email = $cu["email"]    ?? "email";
$col_user_phone = $cu["telefone"] ?? "phone";

// Depositos
$col_dep_id         = $cd["id"]         ?? "id";
$col_dep_user_id    = $cd["user_id"]    ?? "user_id";
$col_dep_valor      = $cd["valor"]      ?? "amount";
$col_dep_pix        = $cd["pix"]        ?? "pix";
$col_dep_status     = $cd["status"]     ?? "status";
$col_dep_created_at = $cd["created_at"] ?? "created_at";

// Saques
$col_saq_id         = $cs["id"]         ?? "id";
$col_saq_user_id    = $cs["user_id"]    ?? "user_id";
$col_saq_valor      = $cs["valor"]      ?? "amount";
$col_saq_pix        = $cs["pix"]        ?? "pix";
$col_saq_status     = $cs["status"]     ?? "status";
$col_saq_created_at = $cs["created_at"] ?? "created_at";

// Saldo
$col_wal_user_id = $cw["user_id"] ?? "user_id";
$col_wal_saldo   = $cw["saldo"]   ?? "balance";

// Afiliados
$col_aff_id       = $ca["id"]                  ?? "id";
$col_aff_name     = $ca["nome"]                ?? "name";
$col_aff_user_id  = $ca["user_id"]             ?? "user_id";
$col_aff_expired  = $ca["cooperation_expired"] ?? "cooperation_expired";

$action = $_GET["action"] ?? "";

// ── health ──
if ($action === "health") {
    echo json_encode([
        "ok" => true, "version" => "3.1.0-dynamic",
        "db" => true, "mapping_source" => $mapping["_from_cache"] ? "cache" : "painel",
        "warning" => $mapping["_warning"] ?? null,
        "tables" => $t, "time" => date("Y-m-d H:i:s")
    ]);
    exit;
}

// ── stats ──
if ($action === "stats") {
    $r1 = $conn->query("SELECT COUNT(*) as total FROM \`$tb_usuarios\`");
    $r2 = $conn->query("SELECT COUNT(*) as total FROM \`$tb_afiliados\`");
    $r3 = $conn->query("SELECT COALESCE(SUM(\`$col_wal_saldo\`), 0) as total FROM \`$tb_saldo\`");
    $errors = [];
    if (!$r1) $errors[] = "Tabela '$tb_usuarios': " . $conn->error;
    if (!$r2) $errors[] = "Tabela '$tb_afiliados': " . $conn->error;
    if (!$r3) $errors[] = "Tabela '$tb_saldo' / coluna '$col_wal_saldo': " . $conn->error;
    if (!empty($errors)) { echo json_encode(["error" => "Erro no mapeamento", "detalhes" => $errors]); exit; }
    echo json_encode([
        "total_usuarios" => (int)$r1->fetch_assoc()["total"],
        "total_afiliados" => (int)$r2->fetch_assoc()["total"],
        "saldo_total" => (float)$r3->fetch_assoc()["total"]
    ]);
    exit;
}

// ── depositos ──
if ($action === "depositos") {
    $sql = "SELECT u.\`$col_user_name\` as nome_usuario, d.\`$col_dep_valor\` as valor, d.\`$col_dep_pix\` as pix, d.\`$col_dep_created_at\` as created_at, d.\`$col_dep_status\` as status FROM \`$tb_depositos\` d JOIN \`$tb_usuarios\` u ON d.\`$col_dep_user_id\` = u.\`$col_user_id\` ORDER BY d.\`$col_dep_created_at\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error" => $conn->error, "query" => $sql]); exit; }
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows);
    exit;
}

// ── saques ──
if ($action === "saques") {
    $sql = "SELECT w.\`$col_saq_id\` as id, u.\`$col_user_name\` as nome_usuario, w.\`$col_saq_valor\` as valor, w.\`$col_saq_pix\` as pix, w.\`$col_saq_created_at\` as created_at, w.\`$col_saq_status\` as status FROM \`$tb_saques\` w JOIN \`$tb_usuarios\` u ON w.\`$col_saq_user_id\` = u.\`$col_user_id\` ORDER BY w.\`$col_saq_created_at\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error" => $conn->error, "query" => $sql]); exit; }
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows);
    exit;
}

// ── aprovar_saque ──
if ($action === "aprovar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok" => false, "error" => "ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tb_saques\` SET \`$col_saq_status\`='aprovado' WHERE \`$col_saq_id\`=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true]);
    exit;
}

// ── rejeitar_saque ──
if ($action === "rejeitar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok" => false, "error" => "ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tb_saques\` SET \`$col_saq_status\`='rejeitado' WHERE \`$col_saq_id\`=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true]);
    exit;
}

// ── remover_afiliados ──
if ($action === "remover_afiliados") {
    $stmt = $conn->prepare("DELETE FROM \`$tb_afiliados\` WHERE \`$col_aff_expired\` = 1");
    $stmt->execute();
    echo json_encode(["ok" => true, "removed" => $stmt->affected_rows]);
    exit;
}

echo json_encode(["error" => "Ação não reconhecida: " . $action]);
?>`;
  };

  const generateTestHtml = () => {
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "https://seusite.com/api.php";
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Teste API — ${platform.nome}</title>
    <style>
        body { font-family: monospace; background: #0a0a0f; color: #e0e0e0; padding: 20px; }
        h1 { color: #00c4ff; }
        button { background: #00c4ff; color: #000; border: none; padding: 8px 16px; margin: 4px; cursor: pointer; border-radius: 6px; font-weight: bold; }
        button:hover { background: #00a0dd; }
        .error { color: #ff4444; } .success { color: #00d67c; }
        pre { background: #111; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid #222; max-height: 400px; }
        input { width: 500px; padding: 8px; background: #111; color: #fff; border: 1px solid #333; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>🔌 Teste — ${platform.nome}</h1>
    <input id="apiUrl" value="${apiUrl}" /><br><br>
    <button onclick="testEndpoint('health')">🏥 Health</button>
    <button onclick="testEndpoint('stats')">📊 Stats</button>
    <button onclick="testEndpoint('depositos')">💰 Depósitos</button>
    <button onclick="testEndpoint('saques')">💸 Saques</button>
    <button onclick="testAll()">🚀 Todos</button>
    <div id="status" style="margin:10px 0;padding:10px;"></div>
    <pre id="result">Clique em um botão para testar...</pre>
    <script>
    function getApi(){return document.getElementById("apiUrl").value;}
    async function testEndpoint(a){
        const s=document.getElementById("status"),r=document.getElementById("result");
        s.innerHTML="⏳ "+a+"...";
        try{const t0=performance.now();const res=await fetch(getApi()+"?action="+a);const ms=Math.round(performance.now()-t0);const d=await res.json();
        s.innerHTML=d.error?'<span class="error">❌ '+a+' — '+d.error+'</span>':'<span class="success">✅ '+a+' ('+ms+'ms)</span>';
        r.textContent=JSON.stringify(d,null,2);}catch(e){s.innerHTML='<span class="error">❌ '+e.message+'</span>';r.textContent=e.message;}
    }
    async function testAll(){
        const actions=["health","stats","depositos","saques"];let res={},ok=true;
        for(const a of actions){try{const r=await fetch(getApi()+"?action="+a);const d=await r.json();res[a]={ok:!d.error,data:d};if(d.error)ok=false;}catch(e){res[a]={ok:false,error:e.message};ok=false;}}
        document.getElementById("status").innerHTML=ok?'<span class="success">✅ Todos OK</span>':'<span class="error">⚠️ Falhas</span>';
        document.getElementById("result").textContent=JSON.stringify(res,null,2);
    }
    </script>
</body>
</html>`;
  };

  const handleTestApi = async () => {
    setTesting(true); setTestResult(null); setTestDetails([]);
    const testPlatform = { ...platform, url: form.url };
    const result = await api.checkHealth(testPlatform);
    const details: string[] = [];
    if (result.endpoints.stats.ok) details.push("✅ stats — OK");
    else details.push(`❌ stats — ${result.endpoints.stats.error}`);
    if (result.endpoints.depositos.ok) details.push(`✅ depositos — ${result.endpoints.depositos.count} registros`);
    else details.push(`❌ depositos — ${result.endpoints.depositos.error}`);
    if (result.endpoints.saques.ok) details.push(`✅ saques — ${result.endpoints.saques.count} registros`);
    else details.push(`❌ saques — ${result.endpoints.saques.error}`);
    setTestDetails(details);
    if (result.status === "online") {
      setTestResult("success");
      toast({ title: "✅ API validada!", description: `Latência: ${result.latency_ms}ms` });
    } else {
      setTestResult("error");
      toast({ title: "⚠️ Problemas", description: result.errors[0]?.message ?? "Verifique", variant: "destructive" });
    }
    setTesting(false);
  };

  const handleTestStructure = async () => {
    setTestingStructure(true); setStructureResult([]);
    const results: string[] = [];
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : null;
    if (!apiUrl) { results.push("❌ URL não configurada"); setStructureResult(results); setTestingStructure(false); return; }
    const mappings = [
      { label: `Tabela Usuários (${form.tabela_usuarios})`, action: "stats" },
      { label: `Tabela Depósitos (${form.tabela_depositos})`, action: "depositos" },
      { label: `Tabela Saques (${form.tabela_saques})`, action: "saques" },
      { label: `Tabela Saldo (${form.tabela_saldo})`, action: "stats" },
      { label: `Tabela Afiliados (${form.tabela_afiliados})`, action: "stats" },
    ];
    for (const m of mappings) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${apiUrl}?action=${m.action}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            results.push(json.error ? `❌ ${m.label} — ${json.error}` : `✅ ${m.label} — OK`);
          } catch { results.push(`⚠️ ${m.label} — JSON inválido`); }
        } else { results.push(`❌ ${m.label} — HTTP ${res.status}`); }
      } catch (e: any) { results.push(`❌ ${m.label} — ${e.name === "AbortError" ? "Timeout" : e.message}`); }
    }
    results.push("", "📋 Colunas — Usuários:");
    results.push(`  → ID: ${form.coluna_id_usuario}`, `  → Nome: ${form.coluna_nome_usuario}`, `  → Email: ${form.coluna_email_usuario}`, `  → Telefone: ${form.coluna_telefone_usuario}`);
    results.push("", "📋 Colunas — Depósitos:");
    results.push(`  → ID: ${form.coluna_id_deposito}`, `  → User FK: ${form.coluna_user_id_deposito}`, `  → Valor: ${form.coluna_valor_deposito}`, `  → PIX: ${form.coluna_pix_deposito}`, `  → Status: ${form.coluna_status_deposito}`, `  → Data: ${form.coluna_created_at_deposito}`);
    results.push("", "📋 Colunas — Saques:");
    results.push(`  → ID: ${form.coluna_id_saque}`, `  → User FK: ${form.coluna_user_id_saque}`, `  → Valor: ${form.coluna_valor_saque}`, `  → PIX: ${form.coluna_pix_saque}`, `  → Status: ${form.coluna_status_saque}`, `  → Data: ${form.coluna_created_at_saque}`);
    results.push("", "📋 Colunas — Saldo:");
    results.push(`  → User FK: ${form.coluna_user_id_saldo}`, `  → Saldo: ${form.coluna_saldo}`);
    results.push("", "📋 Colunas — Afiliados:");
    results.push(`  → ID: ${form.coluna_id_afiliado}`, `  → Nome: ${form.coluna_nome_afiliado}`, `  → User FK: ${form.coluna_user_id_afiliado}`, `  → Expirado: ${form.coluna_cooperation_expired}`);
    setStructureResult(results);
    setTestingStructure(false);
    toast({ title: "Teste concluído" });
  };

  const handleTestMappingEndpoint = async () => {
    try {
      const res = await fetch(mappingEndpoint);
      const data = await res.json();
      if (data.ok) toast({ title: "✅ Endpoint OK", description: `Plataforma: ${data.platform_name}` });
      else toast({ title: "❌ Erro", description: data.error, variant: "destructive" });
    } catch (e: any) { toast({ title: "❌ Erro", description: e.message, variant: "destructive" }); }
  };

  const handleSync = async () => { setSyncing(true); await api.syncPlatformData({ ...platform, url: form.url }); setSyncing(false); };

  const handleSave = async () => {
    try {
      const cooperacao_expira = form.cooperacao_dias ? new Date(Date.now() + form.cooperacao_dias * 86400000).toISOString().split("T")[0] : null;
      await updatePlatform.mutateAsync({
        id: platform.id,
        url: form.url || null,
        db_host: form.db_host || null, db_port: form.db_port || 3306,
        db_user: form.db_user || null, db_pass: form.db_pass || null, db_name: form.db_name || null,
        tabela_usuarios: form.tabela_usuarios, tabela_depositos: form.tabela_depositos,
        tabela_saques: form.tabela_saques, tabela_saldo: form.tabela_saldo, tabela_afiliados: form.tabela_afiliados,
        coluna_id_usuario: form.coluna_id_usuario, coluna_nome_usuario: form.coluna_nome_usuario,
        coluna_email_usuario: form.coluna_email_usuario, coluna_telefone_usuario: form.coluna_telefone_usuario,
        coluna_id_deposito: form.coluna_id_deposito, coluna_user_id_deposito: form.coluna_user_id_deposito,
        coluna_valor_deposito: form.coluna_valor_deposito, coluna_pix_deposito: form.coluna_pix_deposito,
        coluna_status_deposito: form.coluna_status_deposito, coluna_created_at_deposito: form.coluna_created_at_deposito,
        coluna_id_saque: form.coluna_id_saque, coluna_user_id_saque: form.coluna_user_id_saque,
        coluna_valor_saque: form.coluna_valor_saque, coluna_pix_saque: form.coluna_pix_saque,
        coluna_status_saque: form.coluna_status_saque, coluna_created_at_saque: form.coluna_created_at_saque,
        coluna_user_id_saldo: form.coluna_user_id_saldo, coluna_saldo: form.coluna_saldo,
        coluna_id_afiliado: form.coluna_id_afiliado, coluna_nome_afiliado: form.coluna_nome_afiliado,
        coluna_user_id_afiliado: form.coluna_user_id_afiliado, coluna_cooperation_expired: form.coluna_cooperation_expired,
        // Legacy shared columns (kept synced)
        coluna_pix: form.coluna_pix_deposito, coluna_status: form.coluna_status_deposito,
        coluna_created_at: form.coluna_created_at_deposito, coluna_user_id_fk: form.coluna_user_id_deposito,
        webhook_telegram: form.webhook_telegram || null, webhook_outro: form.webhook_outro || null,
        gateway_chave: form.gateway_chave || null, cooperacao_dias: form.cooperacao_dias || null,
        cooperacao_expira,
      } as any);
      toast({ title: "Configurações salvas!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const MF = ({ label, value, field, placeholder }: { label: string; value: string; field: string; placeholder: string }) => (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        className="bg-secondary h-7 text-[11px] font-mono" placeholder={placeholder} />
    </div>
  );

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <CheckCircle className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
      {copiedField === field ? "Copiado!" : "Copiar"}
    </Button>
  );

  const TableSection = ({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border p-6 space-y-4" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><SettingsIcon className="w-4 h-4 text-primary" /></div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Configurar — {platform.nome}</h2>
              <p className="text-xs text-muted-foreground">API, banco, mapeamento completo por tabela</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="api" className="text-xs gap-1"><Globe className="w-3 h-3" /> API</TabsTrigger>
            <TabsTrigger value="database" className="text-xs gap-1"><Database className="w-3 h-3" /> Banco</TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs gap-1"><TableProperties className="w-3 h-3" /> Mapeamento</TabsTrigger>
            <TabsTrigger value="generate" className="text-xs gap-1"><Code className="w-3 h-3" /> Gerar</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Wifi className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="cooperation" className="text-xs gap-1"><Server className="w-3 h-3" /> Cooperação</TabsTrigger>
          </TabsList>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-muted-foreground">URL da Plataforma (onde está o api.php)</Label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                className="bg-secondary h-9 text-sm font-mono" placeholder="https://seusite.com" />
              <p className="text-[10px] text-muted-foreground mt-1">Endpoint: {form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "—"}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground">Chave da API (api_key)</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] font-mono bg-background/50 px-2 py-1.5 rounded border border-border/50 text-foreground truncate">{apiKey || "Salve para gerar"}</code>
                <CopyButton text={apiKey} field="api_key" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTestApi} disabled={testing || !form.url}
                className={`gap-2 h-8 text-xs flex-1 ${testResult === "success" ? "border-neon-green/60 text-neon-green" : testResult === "error" ? "border-neon-red/60 text-neon-red" : ""}`}>
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                {testing ? "Testando..." : testResult === "success" ? "API OK!" : "Testar API"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestMappingEndpoint} disabled={!apiKey} className="gap-2 h-8 text-xs">
                <Zap className="w-3 h-3" /> Endpoint
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !form.url} className="gap-2 h-8 text-xs">
                {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync
              </Button>
            </div>
            {testDetails.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                {testDetails.map((d, i) => <p key={i} className="text-[10px] font-mono text-muted-foreground">{d}</p>)}
              </div>
            )}
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="rounded-lg bg-accent/30 border border-accent/50 p-2">
              <p className="text-[10px] text-accent-foreground font-semibold">ℹ️ Credenciais do MySQL da hospedagem. Usadas para gerar o config.php.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">Host</Label>
                <Input value={form.db_host} onChange={e => setForm(p => ({ ...p, db_host: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="localhost" /></div>
              <div><Label className="text-xs text-muted-foreground">Porta</Label>
                <Input type="number" value={form.db_port} onChange={e => setForm(p => ({ ...p, db_port: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" /></div>
              <div><Label className="text-xs text-muted-foreground">Usuário</Label>
                <Input value={form.db_user} onChange={e => setForm(p => ({ ...p, db_user: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" /></div>
              <div><Label className="text-xs text-muted-foreground">Senha</Label>
                <Input type="password" value={form.db_pass} onChange={e => setForm(p => ({ ...p, db_pass: e.target.value }))} className="bg-secondary h-9 text-sm" /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Nome do Banco</Label>
                <Input value={form.db_name} onChange={e => setForm(p => ({ ...p, db_name: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" /></div>
            </div>
          </TabsContent>

          {/* Mapping Tab — EXPANDED per-table */}
          <TabsContent value="mapping" className="space-y-3 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TableProperties className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Mapeamento Completo — Por Tabela</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Configure o nome de <strong className="text-foreground">cada tabela</strong> e <strong className="text-foreground">todas as colunas</strong> usadas pela API. Altere aqui → salve → a API se adapta automaticamente.</p>
            </div>

            {/* USUARIOS */}
            <TableSection icon={Users} title={`Tabela Usuários → ${form.tabela_usuarios}`} color="text-primary">
              <MF label="Nome da Tabela" value={form.tabela_usuarios} field="tabela_usuarios" placeholder="users" />
              <MF label="Coluna ID" value={form.coluna_id_usuario} field="coluna_id_usuario" placeholder="id" />
              <MF label="Coluna Nome" value={form.coluna_nome_usuario} field="coluna_nome_usuario" placeholder="name" />
              <MF label="Coluna Email" value={form.coluna_email_usuario} field="coluna_email_usuario" placeholder="email" />
              <MF label="Coluna Telefone" value={form.coluna_telefone_usuario} field="coluna_telefone_usuario" placeholder="phone" />
            </TableSection>

            {/* DEPOSITOS */}
            <TableSection icon={ArrowDownCircle} title={`Tabela Depósitos → ${form.tabela_depositos}`} color="text-neon-green">
              <MF label="Nome da Tabela" value={form.tabela_depositos} field="tabela_depositos" placeholder="deposits" />
              <MF label="Coluna ID" value={form.coluna_id_deposito} field="coluna_id_deposito" placeholder="id" />
              <MF label="Coluna User ID (FK)" value={form.coluna_user_id_deposito} field="coluna_user_id_deposito" placeholder="user_id" />
              <MF label="Coluna Valor" value={form.coluna_valor_deposito} field="coluna_valor_deposito" placeholder="amount" />
              <MF label="Coluna PIX" value={form.coluna_pix_deposito} field="coluna_pix_deposito" placeholder="pix" />
              <MF label="Coluna Status" value={form.coluna_status_deposito} field="coluna_status_deposito" placeholder="status" />
              <MF label="Coluna Data" value={form.coluna_created_at_deposito} field="coluna_created_at_deposito" placeholder="created_at" />
            </TableSection>

            {/* SAQUES */}
            <TableSection icon={ArrowUpCircle} title={`Tabela Saques → ${form.tabela_saques}`} color="text-neon-amber">
              <MF label="Nome da Tabela" value={form.tabela_saques} field="tabela_saques" placeholder="withdrawals" />
              <MF label="Coluna ID" value={form.coluna_id_saque} field="coluna_id_saque" placeholder="id" />
              <MF label="Coluna User ID (FK)" value={form.coluna_user_id_saque} field="coluna_user_id_saque" placeholder="user_id" />
              <MF label="Coluna Valor" value={form.coluna_valor_saque} field="coluna_valor_saque" placeholder="amount" />
              <MF label="Coluna PIX" value={form.coluna_pix_saque} field="coluna_pix_saque" placeholder="pix" />
              <MF label="Coluna Status" value={form.coluna_status_saque} field="coluna_status_saque" placeholder="status" />
              <MF label="Coluna Data" value={form.coluna_created_at_saque} field="coluna_created_at_saque" placeholder="created_at" />
            </TableSection>

            {/* SALDO */}
            <TableSection icon={Wallet} title={`Tabela Saldo → ${form.tabela_saldo}`} color="text-chart-4">
              <MF label="Nome da Tabela" value={form.tabela_saldo} field="tabela_saldo" placeholder="wallets" />
              <MF label="Coluna User ID (FK)" value={form.coluna_user_id_saldo} field="coluna_user_id_saldo" placeholder="user_id" />
              <MF label="Coluna Saldo" value={form.coluna_saldo} field="coluna_saldo" placeholder="balance" />
            </TableSection>

            {/* AFILIADOS */}
            <TableSection icon={UserCheck} title={`Tabela Afiliados → ${form.tabela_afiliados}`} color="text-chart-5">
              <MF label="Nome da Tabela" value={form.tabela_afiliados} field="tabela_afiliados" placeholder="affiliates" />
              <MF label="Coluna ID" value={form.coluna_id_afiliado} field="coluna_id_afiliado" placeholder="id" />
              <MF label="Coluna Nome" value={form.coluna_nome_afiliado} field="coluna_nome_afiliado" placeholder="name" />
              <MF label="Coluna User ID (FK)" value={form.coluna_user_id_afiliado} field="coluna_user_id_afiliado" placeholder="user_id" />
              <MF label="Coluna Cooperação Expirada" value={form.coluna_cooperation_expired} field="coluna_cooperation_expired" placeholder="cooperation_expired" />
            </TableSection>

            {/* Preview */}
            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-2">
              <p className="text-[10px] font-bold text-foreground">💡 Preview — Query de depósitos</p>
              <p className="text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded">
                SELECT u.<span className="text-primary">{form.coluna_nome_usuario}</span>, d.<span className="text-primary">{form.coluna_valor_deposito}</span>, d.<span className="text-primary">{form.coluna_pix_deposito}</span>, d.<span className="text-primary">{form.coluna_status_deposito}</span>
                <br />FROM <span className="text-primary">{form.tabela_depositos}</span> d
                <br />JOIN <span className="text-primary">{form.tabela_usuarios}</span> u ON d.<span className="text-primary">{form.coluna_user_id_deposito}</span> = u.<span className="text-primary">{form.coluna_id_usuario}</span>
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleTestStructure} disabled={testingStructure || !form.url} className="w-full gap-2 h-9 text-xs">
              {testingStructure ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
              {testingStructure ? "Testando..." : "Testar Estrutura do Banco"}
            </Button>

            {structureResult.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1 max-h-60 overflow-y-auto">
                {structureResult.map((r, i) => (
                  <p key={i} className={`text-[10px] font-mono ${r.startsWith("✅") ? "text-neon-green" : r.startsWith("❌") ? "text-destructive" : r.startsWith("⚠️") ? "text-neon-amber" : "text-muted-foreground"}`}>{r}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Code className="w-4 h-4 text-neon-green" />
                <p className="text-xs font-bold text-foreground">Gerar Arquivos da API v3.1</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Todos os arquivos com URL, banco, api_key e mapeamento completo por tabela. Copie e suba — sem editar nada.</p>
            </div>

            <Button variant="outline" size="sm" onClick={() => {
              const files = [
                { name: "config.php", content: generateConfigPhp() },
                { name: "api.php", content: generateApiPhp() },
                { name: "test_api.html", content: generateTestHtml() },
              ];
              files.forEach((f, i) => {
                setTimeout(() => {
                  const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = f.name; a.click();
                  URL.revokeObjectURL(url);
                }, i * 300);
              });
              toast({ title: "📥 Baixando 3 arquivos" });
            }} className="w-full gap-2 h-9 text-xs border-neon-green/30 text-neon-green hover:bg-neon-green/10">
              <Download className="w-3.5 h-3.5" /> Baixar Todos (config.php + api.php + test_api.html)
            </Button>

            {[
              { name: "config.php", label: "📄 config.php — Credenciais", gen: generateConfigPhp, field: "config_php", type: "text/plain" },
              { name: "api.php", label: "📄 api.php — API Dinâmica v3.1", gen: generateApiPhp, field: "api_php", type: "text/plain" },
              { name: "test_api.html", label: "📄 test_api.html — Teste Visual", gen: generateTestHtml, field: "test_html", type: "text/html" },
            ].map(f => (
              <div key={f.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{f.label}</p>
                  <div className="flex gap-1">
                    <CopyButton text={f.gen()} field={f.field} />
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => {
                      const blob = new Blob([f.gen()], { type: f.type });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = f.name; a.click();
                      URL.revokeObjectURL(url);
                    }}><Download className="w-3 h-3" /> Baixar</Button>
                  </div>
                </div>
                <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre max-h-40">{f.gen()}</pre>
              </div>
            ))}

            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3">
              <p className="text-[10px] font-bold text-foreground mb-2">📁 Estrutura na hospedagem:</p>
              <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed">{`/public_html
├── config.php           ✅ Credenciais + api_key
├── api.php              ✅ API v3.1 (mapeamento por tabela)
├── mapping_cache.json   ⏳ Gerado automaticamente
└── test_api.html        ✅ Teste visual`}</pre>
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Webhook Telegram</Label>
              <Input value={form.webhook_telegram} onChange={e => setForm(p => ({ ...p, webhook_telegram: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Webhook Discord/Slack</Label>
              <Input value={form.webhook_outro} onChange={e => setForm(p => ({ ...p, webhook_outro: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Gateway de Pagamento</Label>
              <Input value={form.gateway_chave} onChange={e => setForm(p => ({ ...p, gateway_chave: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="pk_live_..." /></div>
          </TabsContent>

          {/* Cooperation Tab */}
          <TabsContent value="cooperation" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Dias de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias} onChange={e => setForm(p => ({ ...p, cooperacao_dias: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Quando expirar, afiliados podem ser removidos automaticamente.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="h-8 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-3 h-3" /> Salvar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfigureModal;
