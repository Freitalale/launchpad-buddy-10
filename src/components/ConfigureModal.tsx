import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe, TableProperties, Columns3, Copy, Code, Key, Download, FileText } from "lucide-react";
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
    tabela_usuarios: "users", tabela_afiliados: "affiliates", tabela_saldo: "wallets", coluna_saldo: "balance",
    tabela_depositos: "deposits", tabela_saques: "withdrawals",
    coluna_id_usuario: "id", coluna_nome_usuario: "name",
    coluna_valor_deposito: "amount", coluna_valor_saque: "amount",
    coluna_pix: "pix", coluna_status: "status", coluna_created_at: "created_at", coluna_user_id_fk: "user_id",
    webhook_telegram: "", webhook_outro: "", gateway_chave: "",
    cooperacao_dias: 30,
  });

  useEffect(() => {
    if (platform) {
      setForm({
        url: platform.url ?? "",
        db_host: platform.db_host ?? "",
        db_port: platform.db_port ?? 3306,
        db_user: platform.db_user ?? "",
        db_pass: platform.db_pass ?? "",
        db_name: platform.db_name ?? "",
        tabela_usuarios: platform.tabela_usuarios ?? "users",
        tabela_afiliados: platform.tabela_afiliados ?? "affiliates",
        tabela_saldo: platform.tabela_saldo ?? "wallets",
        coluna_saldo: platform.coluna_saldo ?? "balance",
        tabela_depositos: (platform as any).tabela_depositos ?? "deposits",
        tabela_saques: (platform as any).tabela_saques ?? "withdrawals",
        coluna_id_usuario: (platform as any).coluna_id_usuario ?? "id",
        coluna_nome_usuario: (platform as any).coluna_nome_usuario ?? "name",
        coluna_valor_deposito: (platform as any).coluna_valor_deposito ?? "amount",
        coluna_valor_saque: (platform as any).coluna_valor_saque ?? "amount",
        coluna_pix: (platform as any).coluna_pix ?? "pix",
        coluna_status: (platform as any).coluna_status ?? "status",
        coluna_created_at: (platform as any).coluna_created_at ?? "created_at",
        coluna_user_id_fk: (platform as any).coluna_user_id_fk ?? "user_id",
        webhook_telegram: platform.webhook_telegram ?? "",
        webhook_outro: platform.webhook_outro ?? "",
        gateway_chave: platform.gateway_chave ?? "",
        cooperacao_dias: platform.cooperacao_dias ?? 30,
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
// Credenciais do banco MySQL
$host = "${form.db_host || "localhost"}";
$user = "${form.db_user || "seu_usuario_db"}";
$pass = "${form.db_pass || "sua_senha_db"}";
$db   = "${form.db_name || "nome_do_banco"}";

// ── Conexão com o Painel (Mapeamento Dinâmico) ──
$painel_url = "${mappingEndpoint}";
$cache_file = __DIR__ . "/mapping_cache.json";
$cache_ttl  = 60; // segundos
?>`;
  };

  const generateApiPhp = () => {
    return `<?php
// =====================================================
// api.php — API Dinâmica Controlada pelo Painel
// =====================================================
// Este arquivo NÃO precisa ser editado manualmente.
// Todas as tabelas e colunas são lidas do painel.
// Mude no painel → a API muda automaticamente.
// =====================================================

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

include 'config.php';

// ── Conexão MySQL ──
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["error" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

// ── Buscar Mapeamento do Painel (com cache) ──
function getMapping() {
    global $painel_url, $cache_file, $cache_ttl;
    
    // Verificar cache
    if (file_exists($cache_file)) {
        $cache = json_decode(file_get_contents($cache_file), true);
        if ($cache && isset($cache["_cached_at"]) && (time() - $cache["_cached_at"]) < $cache_ttl) {
            $cache["_from_cache"] = true;
            return $cache;
        }
    }
    
    // Buscar do painel
    $ctx = stream_context_create(["http" => ["timeout" => 5]]);
    $response = @file_get_contents($painel_url, false, $ctx);
    
    if ($response === false) {
        // Painel offline — usar último cache
        if (file_exists($cache_file)) {
            $cache = json_decode(file_get_contents($cache_file), true);
            if ($cache) {
                $cache["_from_cache"] = true;
                $cache["_warning"] = "Painel temporariamente offline. Usando último cache.";
                return $cache;
            }
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
    echo json_encode([
        "error" => "Não foi possível obter o mapeamento do painel.",
        "causa" => "Verifique se a api_key está correta no config.php e se o painel está online.",
        "painel_url" => $painel_url
    ]);
    exit;
}

// ── Extrair nomes de tabelas e colunas ──
$t = $mapping["tables"];
$c = $mapping["columns"];

$tabela_usuarios   = $t["usuarios"]   ?? "users";
$tabela_depositos  = $t["depositos"]  ?? "deposits";
$tabela_saques     = $t["saques"]     ?? "withdrawals";
$tabela_saldo      = $t["saldo"]      ?? "wallets";
$tabela_afiliados  = $t["afiliados"]  ?? "affiliates";

$col_id_usuario      = $c["id_usuario"]      ?? "id";
$col_nome_usuario    = $c["nome_usuario"]    ?? "name";
$col_user_id_fk      = $c["user_id_fk"]      ?? "user_id";
$col_valor_deposito  = $c["valor_deposito"]  ?? "amount";
$col_valor_saque     = $c["valor_saque"]     ?? "amount";
$col_pix             = $c["pix"]             ?? "pix";
$col_status          = $c["status"]          ?? "status";
$col_created_at      = $c["created_at"]      ?? "created_at";
$col_saldo           = $c["saldo"]           ?? "balance";

$action = $_GET["action"] ?? "";

// =====================================================
// ENDPOINT: health
// =====================================================
if ($action === "health") {
    echo json_encode([
        "ok"      => true,
        "version" => "3.0.0-dynamic",
        "db"      => true,
        "mapping_source" => $mapping["_from_cache"] ? "cache" : "painel",
        "warning" => $mapping["_warning"] ?? null,
        "tables"  => $t,
        "columns" => $c,
        "time"    => date("Y-m-d H:i:s")
    ]);
    exit;
}

// =====================================================
// ENDPOINT: stats
// =====================================================
if ($action === "stats") {
    $r1 = $conn->query("SELECT COUNT(*) as total FROM \`$tabela_usuarios\`");
    $r2 = $conn->query("SELECT COUNT(*) as total FROM \`$tabela_afiliados\`");
    $r3 = $conn->query("SELECT COALESCE(SUM(\`$col_saldo\`), 0) as total FROM \`$tabela_saldo\`");
    
    $errors = [];
    if (!$r1) $errors[] = "Tabela '$tabela_usuarios' não encontrada: " . $conn->error;
    if (!$r2) $errors[] = "Tabela '$tabela_afiliados' não encontrada: " . $conn->error;
    if (!$r3) $errors[] = "Tabela '$tabela_saldo' ou coluna '$col_saldo' não encontrada: " . $conn->error;
    
    if (!empty($errors)) {
        echo json_encode(["error" => "Erro no mapeamento", "detalhes" => $errors, "causa" => "Verifique os nomes de tabelas/colunas no painel."]);
        exit;
    }
    
    echo json_encode([
        "total_usuarios"  => (int)$r1->fetch_assoc()["total"],
        "total_afiliados" => (int)$r2->fetch_assoc()["total"],
        "saldo_total"     => (float)$r3->fetch_assoc()["total"]
    ]);
    exit;
}

// =====================================================
// ENDPOINT: depositos
// =====================================================
if ($action === "depositos") {
    $sql = "SELECT u.\`$col_nome_usuario\` as nome_usuario, 
                   d.\`$col_valor_deposito\` as valor, 
                   d.\`$col_pix\` as pix, 
                   d.\`$col_created_at\` as created_at, 
                   d.\`$col_status\` as status
            FROM \`$tabela_depositos\` d
            JOIN \`$tabela_usuarios\` u ON d.\`$col_user_id_fk\` = u.\`$col_id_usuario\`
            ORDER BY d.\`$col_created_at\` DESC
            LIMIT 500";
    
    $result = $conn->query($sql);
    if (!$result) {
        echo json_encode([
            "error" => "Erro SQL: " . $conn->error,
            "causa" => "Verifique o mapeamento de tabelas/colunas no painel.",
            "query" => $sql
        ]);
        exit;
    }

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
// =====================================================
if ($action === "saques") {
    $sql = "SELECT w.id, 
                   u.\`$col_nome_usuario\` as nome_usuario, 
                   w.\`$col_valor_saque\` as valor, 
                   w.\`$col_pix\` as pix, 
                   w.\`$col_created_at\` as created_at, 
                   w.\`$col_status\` as status
            FROM \`$tabela_saques\` w
            JOIN \`$tabela_usuarios\` u ON w.\`$col_user_id_fk\` = u.\`$col_id_usuario\`
            ORDER BY w.\`$col_created_at\` DESC
            LIMIT 500";
    
    $result = $conn->query($sql);
    if (!$result) {
        echo json_encode([
            "error" => "Erro SQL: " . $conn->error,
            "causa" => "Verifique o mapeamento de tabelas/colunas no painel.",
            "query" => $sql
        ]);
        exit;
    }

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
// =====================================================
if ($action === "aprovar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok" => false, "error" => "ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tabela_saques\` SET \`$col_status\`='aprovado' WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true, "message" => "Saque aprovado"]);
    exit;
}

// =====================================================
// ENDPOINT: rejeitar_saque
// =====================================================
if ($action === "rejeitar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok" => false, "error" => "ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tabela_saques\` SET \`$col_status\`='rejeitado' WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["ok" => true, "message" => "Saque rejeitado"]);
    exit;
}

// =====================================================
// ENDPOINT: remover_afiliados
// =====================================================
if ($action === "remover_afiliados") {
    $stmt = $conn->prepare("DELETE FROM \`$tabela_afiliados\` WHERE cooperation_expired = 1");
    $stmt->execute();
    echo json_encode(["ok" => true, "removed" => $stmt->affected_rows]);
    exit;
}

echo json_encode(["error" => "Ação não reconhecida: " . $action]);
?>`;
  };

  const handleTestApi = async () => {
    setTesting(true);
    setTestResult(null);
    setTestDetails([]);
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
      toast({ title: "✅ API validada!", description: `Latência: ${result.latency_ms}ms — Todos endpoints OK` });
    } else {
      setTestResult("error");
      const firstError = result.errors[0]?.message ?? "Verifique os detalhes";
      toast({ title: "⚠️ Problemas encontrados", description: firstError, variant: "destructive" });
    }
    setTesting(false);
  };

  const handleTestStructure = async () => {
    setTestingStructure(true);
    setStructureResult([]);
    const results: string[] = [];
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : null;
    if (!apiUrl) {
      results.push("❌ URL da API não configurada");
      setStructureResult(results);
      setTestingStructure(false);
      return;
    }
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
            if (json.error) {
              results.push(`❌ ${m.label} — ${json.error}${json.causa ? ` | ${json.causa}` : ""}`);
            } else {
              results.push(`✅ ${m.label} — OK`);
            }
          } catch {
            results.push(`⚠️ ${m.label} — JSON inválido.`);
          }
        } else {
          results.push(`❌ ${m.label} — HTTP ${res.status}`);
        }
      } catch (e: any) {
        results.push(`❌ ${m.label} — ${e.name === "AbortError" ? "Timeout" : e.message}`);
      }
    }
    results.push("", "📋 Colunas mapeadas:");
    const columnChecks = [
      { col: form.coluna_id_usuario, label: "ID Usuário" },
      { col: form.coluna_nome_usuario, label: "Nome Usuário" },
      { col: form.coluna_valor_deposito, label: "Valor Depósito" },
      { col: form.coluna_valor_saque, label: "Valor Saque" },
      { col: form.coluna_pix, label: "Chave PIX" },
      { col: form.coluna_status, label: "Status" },
      { col: form.coluna_created_at, label: "Data Criação" },
      { col: form.coluna_saldo, label: "Saldo" },
    ];
    for (const c of columnChecks) {
      results.push(c.col?.trim() ? `  ✅ ${c.label} → ${c.col}` : `  ⚠️ ${c.label} → não configurada`);
    }
    setStructureResult(results);
    setTestingStructure(false);
    toast({ title: "Teste de estrutura concluído" });
  };

  const handleTestMappingEndpoint = async () => {
    try {
      const res = await fetch(mappingEndpoint);
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Endpoint de mapeamento OK", description: `Plataforma: ${data.platform_name}` });
      } else {
        toast({ title: "❌ Erro no endpoint", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "❌ Erro de conexão", description: e.message, variant: "destructive" });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const testPlatform = { ...platform, url: form.url };
    await api.syncPlatformData(testPlatform);
    setSyncing(false);
  };

  const handleSave = async () => {
    try {
      const cooperacao_expira = form.cooperacao_dias
        ? new Date(Date.now() + form.cooperacao_dias * 86400000).toISOString().split("T")[0]
        : null;
      await updatePlatform.mutateAsync({
        id: platform.id,
        url: form.url || null,
        db_host: form.db_host || null,
        db_port: form.db_port || 3306,
        db_user: form.db_user || null,
        db_pass: form.db_pass || null,
        db_name: form.db_name || null,
        tabela_usuarios: form.tabela_usuarios,
        tabela_afiliados: form.tabela_afiliados,
        tabela_saldo: form.tabela_saldo,
        coluna_saldo: form.coluna_saldo,
        webhook_telegram: form.webhook_telegram || null,
        webhook_outro: form.webhook_outro || null,
        gateway_chave: form.gateway_chave || null,
        cooperacao_dias: form.cooperacao_dias || null,
        cooperacao_expira,
        tabela_depositos: form.tabela_depositos,
        tabela_saques: form.tabela_saques,
        coluna_id_usuario: form.coluna_id_usuario,
        coluna_nome_usuario: form.coluna_nome_usuario,
        coluna_valor_deposito: form.coluna_valor_deposito,
        coluna_valor_saque: form.coluna_valor_saque,
        coluna_pix: form.coluna_pix,
        coluna_status: form.coluna_status,
        coluna_created_at: form.coluna_created_at,
        coluna_user_id_fk: form.coluna_user_id_fk,
      } as any);
      toast({ title: "Configurações salvas!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const MappingField = ({ label, value, field, placeholder }: { label: string; value: string; field: string; placeholder: string }) => (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        className="bg-secondary h-8 text-xs font-mono" placeholder={placeholder} />
    </div>
  );

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <CheckCircle className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
      {copiedField === field ? "Copiado!" : "Copiar"}
    </Button>
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
              <p className="text-xs text-muted-foreground">API dinâmica, banco de dados, mapeamento, webhooks e cooperação</p>
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
                className="bg-secondary h-9 text-sm font-mono" placeholder="https://gerenteriquinho.online" />
              <p className="text-[10px] text-muted-foreground mt-1">O painel acessará: {form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "—"}</p>
            </div>

            {/* API Key section */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground">Chave da API (api_key)</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Essa chave conecta o api.php ao painel. O api.php usa essa chave para buscar o mapeamento de tabelas automaticamente.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] font-mono bg-background/50 px-2 py-1.5 rounded border border-border/50 text-foreground truncate">{apiKey || "Salve a plataforma para gerar"}</code>
                <CopyButton text={apiKey} field="api_key" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTestApi} disabled={testing || !form.url}
                className={`gap-2 h-8 text-xs flex-1 ${testResult === "success" ? "border-neon-green/60 text-neon-green" : testResult === "error" ? "border-neon-red/60 text-neon-red" : ""}`}>
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : testResult === "success" ? <CheckCircle className="w-3 h-3" /> : testResult === "error" ? <AlertCircle className="w-3 h-3" /> : <TestTube className="w-3 h-3" />}
                {testing ? "Testando..." : testResult === "success" ? "API Validada!" : "Testar API"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleTestMappingEndpoint} disabled={!apiKey} className="gap-2 h-8 text-xs">
                <Zap className="w-3 h-3" /> Testar Endpoint
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !form.url} className="gap-2 h-8 text-xs">
                {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Sincronizar
              </Button>
            </div>
            {testDetails.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                <p className="text-[10px] font-bold text-foreground mb-1">Resultado do teste:</p>
                {testDetails.map((d, i) => (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground">{d}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="rounded-lg bg-accent/30 border border-accent/50 p-2 mb-2">
              <p className="text-[10px] text-accent-foreground font-semibold">ℹ️ O banco é acessado pelo api.php na hospedagem. Configure aqui para gerar os arquivos automaticamente.</p>
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

          {/* Mapping Tab */}
          <TabsContent value="mapping" className="space-y-4 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TableProperties className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Mapeamento Dinâmico — Controlado pelo Painel</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Altere os nomes aqui → salve → o api.php na hospedagem usará automaticamente os novos nomes. <strong className="text-foreground">Sem editar código PHP.</strong></p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Tabelas</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MappingField label="Tabela de Usuários" value={form.tabela_usuarios} field="tabela_usuarios" placeholder="users" />
                <MappingField label="Tabela de Depósitos" value={form.tabela_depositos} field="tabela_depositos" placeholder="deposits" />
                <MappingField label="Tabela de Saques" value={form.tabela_saques} field="tabela_saques" placeholder="withdrawals" />
                <MappingField label="Tabela de Saldo / Carteira" value={form.tabela_saldo} field="tabela_saldo" placeholder="wallets" />
                <MappingField label="Tabela de Afiliados" value={form.tabela_afiliados} field="tabela_afiliados" placeholder="affiliates" />
              </div>
            </div>

            <div className="border-t border-border/50 pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Columns3 className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Colunas</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MappingField label="ID do Usuário" value={form.coluna_id_usuario} field="coluna_id_usuario" placeholder="id" />
                <MappingField label="Nome do Usuário" value={form.coluna_nome_usuario} field="coluna_nome_usuario" placeholder="name" />
                <MappingField label="FK User ID (depósitos/saques)" value={form.coluna_user_id_fk} field="coluna_user_id_fk" placeholder="user_id" />
                <MappingField label="Valor do Depósito" value={form.coluna_valor_deposito} field="coluna_valor_deposito" placeholder="amount" />
                <MappingField label="Valor do Saque" value={form.coluna_valor_saque} field="coluna_valor_saque" placeholder="amount" />
                <MappingField label="Chave PIX" value={form.coluna_pix} field="coluna_pix" placeholder="pix" />
                <MappingField label="Status da Transação" value={form.coluna_status} field="coluna_status" placeholder="status" />
                <MappingField label="Data de Criação" value={form.coluna_created_at} field="coluna_created_at" placeholder="created_at" />
                <MappingField label="Saldo da Carteira" value={form.coluna_saldo} field="coluna_saldo" placeholder="balance" />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-2">
              <p className="text-[10px] font-bold text-foreground">💡 Preview da query gerada</p>
              <p className="text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded">
                SELECT u.<span className="text-primary">{form.coluna_nome_usuario}</span> as nome_usuario, d.<span className="text-primary">{form.coluna_valor_deposito}</span> as valor
                <br />FROM <span className="text-primary">{form.tabela_depositos}</span> d
                <br />JOIN <span className="text-primary">{form.tabela_usuarios}</span> u ON d.<span className="text-primary">{form.coluna_user_id_fk}</span> = u.<span className="text-primary">{form.coluna_id_usuario}</span>
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleTestStructure} disabled={testingStructure || !form.url}
              className="w-full gap-2 h-9 text-xs">
              {testingStructure ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
              {testingStructure ? "Testando Estrutura..." : "Testar Estrutura do Banco"}
            </Button>

            {structureResult.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                <p className="text-[10px] font-bold text-foreground mb-1">Resultado:</p>
                {structureResult.map((r, i) => (
                  <p key={i} className={`text-[10px] font-mono ${r.startsWith("✅") ? "text-neon-green" : r.startsWith("❌") ? "text-destructive" : r.startsWith("⚠️") ? "text-neon-amber" : "text-muted-foreground"}`}>{r}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Generate Tab — NEW */}
          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Code className="w-4 h-4 text-neon-green" />
                <p className="text-xs font-bold text-foreground">Gerar Arquivos da API — Tudo Pronto</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Todos os arquivos já vêm com <strong className="text-foreground">URL, banco, api_key e endpoint preenchidos</strong>. Copie e suba na hospedagem — sem editar nada.</p>
            </div>

            {/* Download ZIP button */}
            <Button variant="outline" size="sm" onClick={() => {
              const files = [
                { name: "config.php", content: generateConfigPhp() },
                { name: "api.php", content: generateApiPhp() },
                { name: "test_api.html", content: generateTestHtml() },
              ];
              // Simple multi-file download (one at a time)
              files.forEach((f, i) => {
                setTimeout(() => {
                  const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = f.name;
                  a.click();
                  URL.revokeObjectURL(url);
                }, i * 300);
              });
              toast({ title: "📥 Baixando 3 arquivos", description: "config.php, api.php e test_api.html" });
            }} className="w-full gap-2 h-9 text-xs border-neon-green/30 text-neon-green hover:bg-neon-green/10">
              <Download className="w-3.5 h-3.5" /> Baixar Todos os Arquivos (config.php + api.php + test_api.html)
            </Button>

            {/* config.php */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">📄 config.php — Credenciais + Painel</p>
                <div className="flex gap-1">
                  <CopyButton text={generateConfigPhp()} field="config_php" />
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => {
                    const blob = new Blob([generateConfigPhp()], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "config.php"; a.click();
                    URL.revokeObjectURL(url);
                  }}><Download className="w-3 h-3" /> Baixar</Button>
                </div>
              </div>
              <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre max-h-48">{generateConfigPhp()}</pre>
            </div>

            {/* api.php */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">📄 api.php — API Dinâmica v3.0</p>
                <div className="flex gap-1">
                  <CopyButton text={generateApiPhp()} field="api_php" />
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => {
                    const blob = new Blob([generateApiPhp()], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "api.php"; a.click();
                    URL.revokeObjectURL(url);
                  }}><Download className="w-3 h-3" /> Baixar</Button>
                </div>
              </div>
              <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre max-h-48">{generateApiPhp()}</pre>
            </div>

            {/* test_api.html */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">📄 test_api.html — Teste Visual</p>
                <div className="flex gap-1">
                  <CopyButton text={generateTestHtml()} field="test_html" />
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => {
                    const blob = new Blob([generateTestHtml()], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "test_api.html"; a.click();
                    URL.revokeObjectURL(url);
                  }}><Download className="w-3 h-3" /> Baixar</Button>
                </div>
              </div>
              <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre max-h-48">{generateTestHtml()}</pre>
            </div>

            {/* Structure summary */}
            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3">
              <p className="text-[10px] font-bold text-foreground mb-2">📁 Estrutura na hospedagem:</p>
              <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed">{`/public_html
├── config.php           ✅ Credenciais + api_key preenchidas
├── api.php              ✅ API dinâmica (busca mapeamento do painel)
├── mapping_cache.json   ⏳ Gerado automaticamente pela API
└── test_api.html        ✅ Teste visual com URL preenchida`}</pre>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
              <p className="text-[10px] text-primary font-semibold">💡 Após subir os arquivos: acesse {form.url ? `${form.url.replace(/\/$/, "")}/api.php?action=health` : "seusite.com/api.php?action=health"} — se retornar OK, a API está funcionando. Depois, mude qualquer mapeamento no painel → a API se adapta em até 60s.</p>
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Webhook Telegram (opcional)</Label>
              <Input value={form.webhook_telegram} onChange={e => setForm(p => ({ ...p, webhook_telegram: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Webhook Discord/Slack (opcional)</Label>
              <Input value={form.webhook_outro} onChange={e => setForm(p => ({ ...p, webhook_outro: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="https://..." /></div>
            <div><Label className="text-xs text-muted-foreground">Gateway de Pagamento (opcional)</Label>
              <Input value={form.gateway_chave} onChange={e => setForm(p => ({ ...p, gateway_chave: e.target.value }))} className="bg-secondary h-9 text-sm font-mono" placeholder="pk_live_..." /></div>
          </TabsContent>

          {/* Cooperation Tab */}
          <TabsContent value="cooperation" className="space-y-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Dias de Cooperação</Label>
              <Input type="number" value={form.cooperacao_dias} onChange={e => setForm(p => ({ ...p, cooperacao_dias: Number(e.target.value) }))} className="bg-secondary h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Quando atingir esse limite, somente afiliados podem ser removidos.</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-xs text-accent-foreground font-semibold">⚠️ Cooperação configura exclusão de afiliados</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quando a cooperação expira, o sistema chama ?action=remover_afiliados na API. Nunca exclui usuários totais.</p>
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
