import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe, TableProperties, Columns3, Copy, Code, Key, Download, FileText, Users, Wallet, ArrowDownCircle, ArrowUpCircle, UserCheck, Plus, Trash2, X } from "lucide-react";
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

interface ExtraColumn {
  label: string;
  column: string;
}

interface ExtraTable {
  key: string;
  tableName: string;
  columns: ExtraColumn[];
}

type ExtraColumnsMap = Record<string, ExtraColumn[]>;

const DEFAULT_COLUMNS: Record<string, { field: string; label: string; placeholder: string; desc: string }[]> = {
  usuarios: [
    { field: "coluna_id_usuario", label: "Coluna ID", placeholder: "id", desc: "Identificador único de cada usuário" },
    { field: "coluna_nome_usuario", label: "Coluna Nome", placeholder: "name", desc: "Nome ou username do usuário" },
    { field: "coluna_email_usuario", label: "Coluna Email", placeholder: "email", desc: "Email do usuário (usado em SAC)" },
    { field: "coluna_telefone_usuario", label: "Coluna Telefone", placeholder: "phone", desc: "Telefone/WhatsApp do usuário" },
  ],
  depositos: [
    { field: "coluna_id_deposito", label: "Coluna ID", placeholder: "id", desc: "ID único de cada depósito" },
    { field: "coluna_user_id_deposito", label: "Coluna User ID (FK)", placeholder: "user_id", desc: "Chave que liga o depósito ao usuário" },
    { field: "coluna_valor_deposito", label: "Coluna Valor", placeholder: "amount", desc: "Valor monetário do depósito" },
    { field: "coluna_pix_deposito", label: "Coluna PIX", placeholder: "pix", desc: "Chave PIX usada no depósito" },
    { field: "coluna_status_deposito", label: "Coluna Status", placeholder: "status", desc: "Status: pendente, aprovado, rejeitado" },
    { field: "coluna_created_at_deposito", label: "Coluna Data", placeholder: "created_at", desc: "Data/hora em que o depósito foi feito" },
  ],
  saques: [
    { field: "coluna_id_saque", label: "Coluna ID", placeholder: "id", desc: "ID único de cada saque" },
    { field: "coluna_user_id_saque", label: "Coluna User ID (FK)", placeholder: "user_id", desc: "Chave que liga o saque ao usuário" },
    { field: "coluna_valor_saque", label: "Coluna Valor", placeholder: "amount", desc: "Valor monetário do saque" },
    { field: "coluna_pix_saque", label: "Coluna PIX", placeholder: "pix", desc: "Chave PIX para pagamento do saque" },
    { field: "coluna_status_saque", label: "Coluna Status", placeholder: "status", desc: "Status: pendente, aprovado, rejeitado" },
    { field: "coluna_created_at_saque", label: "Coluna Data", placeholder: "created_at", desc: "Data/hora em que o saque foi solicitado" },
  ],
  saldo: [
    { field: "coluna_user_id_saldo", label: "Coluna User ID (FK)", placeholder: "user_id", desc: "Chave que liga o saldo ao usuário" },
    { field: "coluna_saldo", label: "Coluna Saldo", placeholder: "balance", desc: "Saldo atual disponível do usuário" },
  ],
  afiliados: [
    { field: "coluna_id_afiliado", label: "Coluna ID", placeholder: "id", desc: "ID único do afiliado" },
    { field: "coluna_nome_afiliado", label: "Coluna Nome", placeholder: "name", desc: "Nome do afiliado" },
    { field: "coluna_user_id_afiliado", label: "Coluna User ID (FK)", placeholder: "user_id", desc: "Chave que liga o afiliado ao usuário" },
    { field: "coluna_cooperation_expired", label: "Coluna Cooperação Expirada", placeholder: "cooperation_expired", desc: "Flag se a cooperação expirou (1=sim)" },
  ],
};

const TABLE_META: { key: string; icon: any; color: string; tableField: string; defaultTable: string; label: string; desc: string }[] = [
  { key: "usuarios", icon: Users, color: "text-primary", tableField: "tabela_usuarios", defaultTable: "users", label: "Usuários", desc: "Tabela principal de usuários. O painel usa para contar usuários, exibir nomes em depósitos/saques/SAC." },
  { key: "depositos", icon: ArrowDownCircle, color: "text-neon-green", tableField: "tabela_depositos", defaultTable: "deposits", label: "Depósitos", desc: "Tabela de depósitos. O painel lista, filtra por status, mostra valores e PIX na tela de Depósitos." },
  { key: "saques", icon: ArrowUpCircle, color: "text-neon-amber", tableField: "tabela_saques", defaultTable: "withdrawals", label: "Saques", desc: "Tabela de saques. Permite listar, aprovar e rejeitar saques pelo painel." },
  { key: "saldo", icon: Wallet, color: "text-chart-4", tableField: "tabela_saldo", defaultTable: "wallets", label: "Saldo/Carteira", desc: "Tabela de saldos. Soma o saldo total de todos os usuários no Dashboard." },
  { key: "afiliados", icon: UserCheck, color: "text-chart-5", tableField: "tabela_afiliados", defaultTable: "affiliates", label: "Afiliados", desc: "Tabela de afiliados. Controla cooperação, conta afiliados e permite remoção automática dos expirados." },
];

type HiddenColumnsMap = Record<string, string[]>;
// Track which default tables are disabled
type DisabledTablesSet = string[];

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

  // Extra dynamic columns per built-in table
  const [extraColumns, setExtraColumns] = useState<ExtraColumnsMap>({});
  // Extra custom tables
  const [extraTables, setExtraTables] = useState<ExtraTable[]>([]);
  // Hidden default columns per table
  const [hiddenColumns, setHiddenColumns] = useState<HiddenColumnsMap>({});
  const [disabledTables, setDisabledTables] = useState<DisabledTablesSet>([]);

  const [form, setForm] = useState({
    url: "", db_host: "", db_port: 3306, db_user: "", db_pass: "", db_name: "",
    tabela_usuarios: "users", tabela_depositos: "deposits", tabela_saques: "withdrawals",
    tabela_saldo: "wallets", tabela_afiliados: "affiliates",
    coluna_id_usuario: "id", coluna_nome_usuario: "name",
    coluna_email_usuario: "email", coluna_telefone_usuario: "phone",
    coluna_id_deposito: "id", coluna_user_id_deposito: "user_id",
    coluna_valor_deposito: "amount", coluna_pix_deposito: "pix",
    coluna_status_deposito: "status", coluna_created_at_deposito: "created_at",
    coluna_id_saque: "id", coluna_user_id_saque: "user_id",
    coluna_valor_saque: "amount", coluna_pix_saque: "pix",
    coluna_status_saque: "status", coluna_created_at_saque: "created_at",
    coluna_user_id_saldo: "user_id", coluna_saldo: "balance",
    coluna_id_afiliado: "id", coluna_nome_afiliado: "name",
    coluna_user_id_afiliado: "user_id", coluna_cooperation_expired: "cooperation_expired",
    coluna_pix: "pix", coluna_status: "status", coluna_created_at: "created_at", coluna_user_id_fk: "user_id",
    webhook_telegram: "", webhook_outro: "", gateway_chave: "",
    cooperacao_dias: 30,
  });

  useEffect(() => {
    if (platform) {
      const p = platform as any;
      setForm({
        url: p.url ?? "", db_host: p.db_host ?? "", db_port: p.db_port ?? 3306,
        db_user: p.db_user ?? "", db_pass: p.db_pass ?? "", db_name: p.db_name ?? "",
        tabela_usuarios: p.tabela_usuarios ?? "users", tabela_depositos: p.tabela_depositos ?? "deposits",
        tabela_saques: p.tabela_saques ?? "withdrawals", tabela_saldo: p.tabela_saldo ?? "wallets",
        tabela_afiliados: p.tabela_afiliados ?? "affiliates",
        coluna_id_usuario: p.coluna_id_usuario ?? "id", coluna_nome_usuario: p.coluna_nome_usuario ?? "name",
        coluna_email_usuario: p.coluna_email_usuario ?? "email", coluna_telefone_usuario: p.coluna_telefone_usuario ?? "phone",
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
        coluna_user_id_saldo: p.coluna_user_id_saldo ?? "user_id", coluna_saldo: p.coluna_saldo ?? "balance",
        coluna_id_afiliado: p.coluna_id_afiliado ?? "id", coluna_nome_afiliado: p.coluna_nome_afiliado ?? "name",
        coluna_user_id_afiliado: p.coluna_user_id_afiliado ?? "user_id",
        coluna_cooperation_expired: p.coluna_cooperation_expired ?? "cooperation_expired",
        coluna_pix: p.coluna_pix ?? "pix", coluna_status: p.coluna_status ?? "status",
        coluna_created_at: p.coluna_created_at ?? "created_at", coluna_user_id_fk: p.coluna_user_id_fk ?? "user_id",
        webhook_telegram: p.webhook_telegram ?? "", webhook_outro: p.webhook_outro ?? "",
        gateway_chave: p.gateway_chave ?? "", cooperacao_dias: p.cooperacao_dias ?? 30,
      });
      // Load extras from mapeamento_extra
      const extra = p.mapeamento_extra ?? {};
      setExtraColumns(extra.colunas_extra ?? {});
      setExtraTables(extra.tabelas_extra ?? []);
      setHiddenColumns(extra.colunas_ocultas ?? {});
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

  // -- Extra column helpers --
  const addExtraColumn = (tableKey: string) => {
    setExtraColumns(prev => ({
      ...prev,
      [tableKey]: [...(prev[tableKey] ?? []), { label: "", column: "" }],
    }));
  };

  const updateExtraColumn = (tableKey: string, idx: number, field: "label" | "column", value: string) => {
    setExtraColumns(prev => {
      const cols = [...(prev[tableKey] ?? [])];
      cols[idx] = { ...cols[idx], [field]: value };
      return { ...prev, [tableKey]: cols };
    });
  };

  const removeExtraColumn = (tableKey: string, idx: number) => {
    setExtraColumns(prev => {
      const cols = [...(prev[tableKey] ?? [])];
      cols.splice(idx, 1);
      return { ...prev, [tableKey]: cols };
    });
  };

  // -- Hidden default column helpers --
  const hideDefaultColumn = (tableKey: string, field: string) => {
    setHiddenColumns(prev => ({
      ...prev,
      [tableKey]: [...(prev[tableKey] ?? []), field],
    }));
  };

  const showDefaultColumn = (tableKey: string, field: string) => {
    setHiddenColumns(prev => ({
      ...prev,
      [tableKey]: (prev[tableKey] ?? []).filter(f => f !== field),
    }));
  };

  // -- Extra table helpers --
  const addExtraTable = () => {
    setExtraTables(prev => [...prev, { key: `custom_${Date.now()}`, tableName: "", columns: [] }]);
  };

  const updateExtraTable = (idx: number, tableName: string) => {
    setExtraTables(prev => {
      const t = [...prev];
      t[idx] = { ...t[idx], tableName };
      return t;
    });
  };

  const removeExtraTable = (idx: number) => {
    setExtraTables(prev => prev.filter((_, i) => i !== idx));
  };

  const addExtraTableColumn = (tableIdx: number) => {
    setExtraTables(prev => {
      const t = [...prev];
      t[tableIdx] = { ...t[tableIdx], columns: [...t[tableIdx].columns, { label: "", column: "" }] };
      return t;
    });
  };

  const updateExtraTableColumn = (tableIdx: number, colIdx: number, field: "label" | "column", value: string) => {
    setExtraTables(prev => {
      const t = [...prev];
      const cols = [...t[tableIdx].columns];
      cols[colIdx] = { ...cols[colIdx], [field]: value };
      t[tableIdx] = { ...t[tableIdx], columns: cols };
      return t;
    });
  };

  const removeExtraTableColumn = (tableIdx: number, colIdx: number) => {
    setExtraTables(prev => {
      const t = [...prev];
      const cols = [...t[tableIdx].columns];
      cols.splice(colIdx, 1);
      t[tableIdx] = { ...t[tableIdx], columns: cols };
      return t;
    });
  };

  // Build mapeamento_extra for saving
  const buildMapeamentoExtra = () => ({
    colunas_extra: extraColumns,
    tabelas_extra: extraTables,
    colunas_ocultas: hiddenColumns,
  });

  const generateConfigPhp = () => {
    return `<?php
// config.php — Gerado automaticamente pelo Painel
$host = "${form.db_host || "localhost"}";
$user = "${form.db_user || "seu_usuario_db"}";
$pass = "${form.db_pass || "sua_senha_db"}";
$db   = "${form.db_name || "nome_do_banco"}";
$painel_url = "${mappingEndpoint}";
$cache_file = __DIR__ . "/mapping_cache.json";
$cache_ttl  = 60;
?>`;
  };

  const generateApiPhp = () => {
    return `<?php
// api.php — API Dinâmica v3.2 — Mapeamento por Tabela + Colunas Extras
// Este arquivo NÃO precisa ser editado manualmente.
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

include 'config.php';
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) { echo json_encode(["error" => "Falha: " . $conn->connect_error]); exit; }
$conn->set_charset("utf8mb4");

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

$t = $mapping["tables"];
$tb_usuarios  = $t["usuarios"]  ?? "users";
$tb_depositos = $t["depositos"] ?? "deposits";
$tb_saques    = $t["saques"]    ?? "withdrawals";
$tb_saldo     = $t["saldo"]     ?? "wallets";
$tb_afiliados = $t["afiliados"] ?? "affiliates";

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

// Tabelas extras (custom)
$tabelas_extra = $mapping["extra_tables"] ?? [];

$action = $_GET["action"] ?? "";

if ($action === "health") {
    echo json_encode(["ok"=>true,"version"=>"3.2.0","db"=>true,
        "mapping_source"=>$mapping["_from_cache"]?"cache":"painel",
        "tables"=>$t,"extra_tables"=>array_keys($tabelas_extra),"time"=>date("c")]); exit;
}

if ($action === "stats") {
    $r1 = $conn->query("SELECT COUNT(*) as total FROM \`$tb_usuarios\`");
    $r2 = $conn->query("SELECT COUNT(*) as total FROM \`$tb_afiliados\`");
    $r3 = $conn->query("SELECT COALESCE(SUM(\`$col_wal_saldo\`),0) as total FROM \`$tb_saldo\`");
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
    $sql = "SELECT u.\`$col_user_name\` as nome_usuario, d.\`$col_dep_valor\` as valor, d.\`$col_dep_pix\` as pix, d.\`$col_dep_date\` as created_at, d.\`$col_dep_status\` as status FROM \`$tb_depositos\` d JOIN \`$tb_usuarios\` u ON d.\`$col_dep_uid\` = u.\`$col_user_id\` ORDER BY d.\`$col_dep_date\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error"=>$conn->error,"query"=>$sql]); exit; }
    $rows = []; while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows); exit;
}

if ($action === "saques") {
    $sql = "SELECT w.\`$col_saq_id\` as id, u.\`$col_user_name\` as nome_usuario, w.\`$col_saq_valor\` as valor, w.\`$col_saq_pix\` as pix, w.\`$col_saq_date\` as created_at, w.\`$col_saq_status\` as status FROM \`$tb_saques\` w JOIN \`$tb_usuarios\` u ON w.\`$col_saq_uid\` = u.\`$col_user_id\` ORDER BY w.\`$col_saq_date\` DESC LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error"=>$conn->error,"query"=>$sql]); exit; }
    $rows = []; while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows); exit;
}

if ($action === "aprovar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok"=>false,"error"=>"ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tb_saques\` SET \`$col_saq_status\`='aprovado' WHERE \`$col_saq_id\`=?");
    $stmt->bind_param("i", $id); $stmt->execute();
    echo json_encode(["ok"=>true]); exit;
}

if ($action === "rejeitar_saque") {
    $id = intval($_POST["id"] ?? 0);
    if ($id <= 0) { echo json_encode(["ok"=>false,"error"=>"ID inválido"]); exit; }
    $stmt = $conn->prepare("UPDATE \`$tb_saques\` SET \`$col_saq_status\`='rejeitado' WHERE \`$col_saq_id\`=?");
    $stmt->bind_param("i", $id); $stmt->execute();
    echo json_encode(["ok"=>true]); exit;
}

if ($action === "remover_afiliados") {
    $stmt = $conn->prepare("DELETE FROM \`$tb_afiliados\` WHERE \`$col_aff_expired\` = 1");
    $stmt->execute();
    echo json_encode(["ok"=>true,"removed"=>$stmt->affected_rows]); exit;
}

// Tabelas extras — endpoint genérico
if ($action === "extra" && isset($_GET["table"])) {
    $table_key = $_GET["table"];
    if (!isset($tabelas_extra[$table_key])) {
        echo json_encode(["error" => "Tabela extra '$table_key' não configurada."]); exit;
    }
    $et = $tabelas_extra[$table_key];
    $tb_name = $et["table_name"];
    $cols = $et["columns"] ?? [];
    $select_parts = [];
    foreach ($cols as $alias => $real_col) {
        $select_parts[] = "\`$real_col\` as \`$alias\`";
    }
    $select = empty($select_parts) ? "*" : implode(", ", $select_parts);
    $sql = "SELECT $select FROM \`$tb_name\` LIMIT 500";
    $result = $conn->query($sql);
    if (!$result) { echo json_encode(["error" => $conn->error, "table" => $tb_name]); exit; }
    $rows = []; while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows); exit;
}

echo json_encode(["error" => "Ação não reconhecida: " . $action]);
?>`;
  };

  const generateTestHtml = () => {
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "https://seusite.com/api.php";
    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Teste API — ${platform.nome}</title>
<style>body{font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:20px}h1{color:#00c4ff}button{background:#00c4ff;color:#000;border:none;padding:8px 16px;margin:4px;cursor:pointer;border-radius:6px;font-weight:bold}button:hover{background:#00a0dd}.error{color:#ff4444}.success{color:#00d67c}pre{background:#111;padding:15px;border-radius:8px;overflow-x:auto;border:1px solid #222;max-height:400px}input{width:500px;padding:8px;background:#111;color:#fff;border:1px solid #333;border-radius:6px}</style>
</head><body><h1>🔌 Teste — ${platform.nome}</h1>
<input id="apiUrl" value="${apiUrl}" /><br><br>
<button onclick="testEndpoint('health')">🏥 Health</button>
<button onclick="testEndpoint('stats')">📊 Stats</button>
<button onclick="testEndpoint('depositos')">💰 Depósitos</button>
<button onclick="testEndpoint('saques')">💸 Saques</button>
<button onclick="testAll()">🚀 Todos</button>
<div id="status" style="margin:10px 0;padding:10px;"></div>
<pre id="result">Clique em um botão para testar...</pre>
<script>
function getApi(){return document.getElementById("apiUrl").value}
async function testEndpoint(a){const s=document.getElementById("status"),r=document.getElementById("result");s.innerHTML="⏳ "+a+"...";try{const t0=performance.now();const res=await fetch(getApi()+"?action="+a);const ms=Math.round(performance.now()-t0);const d=await res.json();s.innerHTML=d.error?'<span class="error">❌ '+a+" — "+d.error+"</span>":'<span class="success">✅ '+a+" ("+ms+"ms)</span>";r.textContent=JSON.stringify(d,null,2)}catch(e){s.innerHTML='<span class="error">❌ '+e.message+"</span>";r.textContent=e.message}}
async function testAll(){const actions=["health","stats","depositos","saques"];let res={},ok=true;for(const a of actions){try{const r=await fetch(getApi()+"?action="+a);const d=await r.json();res[a]={ok:!d.error,data:d};if(d.error)ok=false}catch(e){res[a]={ok:false,error:e.message};ok=false}}document.getElementById("status").innerHTML=ok?'<span class="success">✅ Todos OK</span>':'<span class="error">⚠️ Falhas</span>';document.getElementById("result").textContent=JSON.stringify(res,null,2)}
</script></body></html>`;
  };

  const handleTestApi = async () => {
    setTesting(true); setTestResult(null); setTestDetails([]);
    const result = await api.checkHealth({ ...platform, url: form.url });
    const details: string[] = [];
    if (result.endpoints.stats.ok) details.push("✅ stats — OK");
    else details.push(`❌ stats — ${result.endpoints.stats.error}`);
    if (result.endpoints.depositos.ok) details.push(`✅ depositos — ${result.endpoints.depositos.count} registros`);
    else details.push(`❌ depositos — ${result.endpoints.depositos.error}`);
    if (result.endpoints.saques.ok) details.push(`✅ saques — ${result.endpoints.saques.count} registros`);
    else details.push(`❌ saques — ${result.endpoints.saques.error}`);
    setTestDetails(details);
    setTestResult(result.status === "online" ? "success" : "error");
    toast(result.status === "online"
      ? { title: "✅ API validada!", description: `Latência: ${result.latency_ms}ms` }
      : { title: "⚠️ Problemas", description: result.errors[0]?.message ?? "Verifique", variant: "destructive" });
    setTesting(false);
  };

  const handleTestStructure = async () => {
    setTestingStructure(true); setStructureResult([]);
    const results: string[] = [];
    const apiUrl = form.url ? `${form.url.replace(/\/$/, "")}/api.php` : null;
    if (!apiUrl) { results.push("❌ URL não configurada"); setStructureResult(results); setTestingStructure(false); return; }
    for (const m of TABLE_META) {
      const action = m.key === "saldo" || m.key === "afiliados" ? "stats" : m.key;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${apiUrl}?action=${action}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          results.push(json?.error ? `❌ ${m.label} (${(form as any)[m.tableField]}) — ${json.error}` : `✅ ${m.label} (${(form as any)[m.tableField]}) — OK`);
        } else results.push(`❌ ${m.label} — HTTP ${res.status}`);
      } catch (e: any) { results.push(`❌ ${m.label} — ${e.name === "AbortError" ? "Timeout" : e.message}`); }
    }
    setStructureResult(results);
    setTestingStructure(false);
    toast({ title: "Teste concluído" });
  };

  const handleTestMappingEndpoint = async () => {
    try {
      const res = await fetch(mappingEndpoint);
      const data = await res.json();
      toast(data.ok ? { title: "✅ Endpoint OK", description: `Plataforma: ${data.platform_name}` } : { title: "❌ Erro", description: data.error, variant: "destructive" });
    } catch (e: any) { toast({ title: "❌ Erro", description: e.message, variant: "destructive" }); }
  };

  const handleSync = async () => { setSyncing(true); await api.syncPlatformData({ ...platform, url: form.url }); setSyncing(false); };

  const handleSave = async () => {
    try {
      const cooperacao_expira = form.cooperacao_dias ? new Date(Date.now() + form.cooperacao_dias * 86400000).toISOString().split("T")[0] : null;
      await updatePlatform.mutateAsync({
        id: platform.id, url: form.url || null,
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
        coluna_pix: form.coluna_pix_deposito, coluna_status: form.coluna_status_deposito,
        coluna_created_at: form.coluna_created_at_deposito, coluna_user_id_fk: form.coluna_user_id_deposito,
        webhook_telegram: form.webhook_telegram || null, webhook_outro: form.webhook_outro || null,
        gateway_chave: form.gateway_chave || null, cooperacao_dias: form.cooperacao_dias || null,
        cooperacao_expira,
        mapeamento_extra: buildMapeamentoExtra(),
      } as any);
      toast({ title: "Configurações salvas!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const MF = ({ label, value, field, placeholder, onRemove }: { label: string; value: string; field: string; placeholder: string; onRemove?: () => void }) => (
    <div className="relative group">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        <Input value={value} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="bg-secondary h-7 text-[11px] font-mono flex-1" placeholder={placeholder} />
        {onRemove && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={onRemove}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <CheckCircle className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
      {copiedField === field ? "Copiado!" : "Copiar"}
    </Button>
  );

  const renderTableSection = (meta: typeof TABLE_META[0]) => {
    const Icon = meta.icon;
    const tableValue = (form as any)[meta.tableField] ?? meta.defaultTable;
    const defaultCols = DEFAULT_COLUMNS[meta.key] ?? [];
    const hidden = hiddenColumns[meta.key] ?? [];
    const visibleCols = defaultCols.filter(c => !hidden.includes(c.field));
    const extras = extraColumns[meta.key] ?? [];

    return (
      <div key={meta.key} className="rounded-lg border border-border/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
            <p className="text-xs font-semibold text-foreground">{meta.label} → {tableValue}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-primary" onClick={() => addExtraColumn(meta.key)}>
            <Plus className="w-3 h-3" /> Coluna
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Table name field */}
          <MF label="Nome da Tabela" value={tableValue} field={meta.tableField} placeholder={meta.defaultTable} />

          {/* Visible default columns */}
          {visibleCols.map(col => (
            <MF key={col.field} label={col.label} value={(form as any)[col.field] ?? col.placeholder} field={col.field} placeholder={col.placeholder}
              onRemove={() => hideDefaultColumn(meta.key, col.field)} />
          ))}

          {/* Extra custom columns */}
          {extras.map((ec, i) => (
            <div key={`extra-${i}`} className="relative group">
              <div className="flex items-center gap-1">
                <Input value={ec.label} onChange={e => updateExtraColumn(meta.key, i, "label", e.target.value)}
                  className="bg-secondary h-5 text-[9px] font-mono flex-1 border-dashed" placeholder="Nome do campo" />
              </div>
              <div className="flex gap-1 mt-0.5">
                <Input value={ec.column} onChange={e => updateExtraColumn(meta.key, i, "column", e.target.value)}
                  className="bg-accent/20 h-7 text-[11px] font-mono flex-1 border-dashed border-primary/30" placeholder="nome_coluna" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeExtraColumn(meta.key, i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Show hidden columns restore */}
        {hidden.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[9px] text-muted-foreground">Ocultas:</span>
            {hidden.map(field => {
              const col = defaultCols.find(c => c.field === field);
              return (
                <button key={field} onClick={() => showDefaultColumn(meta.key, field)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/40 transition-colors">
                  + {col?.label ?? field}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
              <p className="text-xs text-muted-foreground">API, banco, mapeamento flexível por tabela</p>
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
              <Label className="text-xs text-muted-foreground">URL da Plataforma</Label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                className="bg-secondary h-9 text-sm font-mono" placeholder="https://seusite.com" />
              <p className="text-[10px] text-muted-foreground mt-1">Endpoint: {form.url ? `${form.url.replace(/\/$/, "")}/api.php` : "—"}</p>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-bold text-foreground">api_key</p>
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
              <p className="text-[10px] text-accent-foreground font-semibold">ℹ️ Credenciais do MySQL da hospedagem.</p>
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
          <TabsContent value="mapping" className="space-y-3 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TableProperties className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Mapeamento Flexível</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Configure cada tabela e coluna. Use <strong className="text-foreground">+ Coluna</strong> para adicionar colunas extras e <strong className="text-foreground">✕</strong> para remover as que não precisa.
              </p>
            </div>

            {/* Built-in tables */}
            {TABLE_META.map(meta => renderTableSection(meta))}

            {/* Extra custom tables */}
            {extraTables.map((et, tableIdx) => (
              <div key={et.key} className="rounded-lg border border-dashed border-primary/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Tabela Extra → {et.tableName || "nova_tabela"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-primary" onClick={() => addExtraTableColumn(tableIdx)}>
                      <Plus className="w-3 h-3" /> Coluna
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeExtraTable(tableIdx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Nome da Tabela</Label>
                    <Input value={et.tableName} onChange={e => updateExtraTable(tableIdx, e.target.value)}
                      className="bg-accent/20 h-7 text-[11px] font-mono border-dashed border-primary/30" placeholder="nome_tabela" />
                  </div>
                  {et.columns.map((col, colIdx) => (
                    <div key={colIdx} className="relative group">
                      <Input value={col.label} onChange={e => updateExtraTableColumn(tableIdx, colIdx, "label", e.target.value)}
                        className="bg-secondary h-5 text-[9px] font-mono border-dashed" placeholder="Nome do campo" />
                      <div className="flex gap-1 mt-0.5">
                        <Input value={col.column} onChange={e => updateExtraTableColumn(tableIdx, colIdx, "column", e.target.value)}
                          className="bg-accent/20 h-7 text-[11px] font-mono flex-1 border-dashed border-primary/30" placeholder="nome_coluna" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeExtraTableColumn(tableIdx, colIdx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add extra table button */}
            <Button variant="outline" size="sm" onClick={addExtraTable}
              className="w-full gap-2 h-8 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/5">
              <Plus className="w-3.5 h-3.5" /> Adicionar Nova Tabela
            </Button>

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
              {testingStructure ? "Testando..." : "Testar Estrutura"}
            </Button>

            {structureResult.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1 max-h-60 overflow-y-auto">
                {structureResult.map((r, i) => (
                  <p key={i} className={`text-[10px] font-mono ${r.startsWith("✅") ? "text-neon-green" : r.startsWith("❌") ? "text-destructive" : "text-muted-foreground"}`}>{r}</p>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Code className="w-4 h-4 text-neon-green" />
                <p className="text-xs font-bold text-foreground">Gerar Arquivos da API v3.2</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Inclui tabelas extras e colunas customizadas. Copie e suba — sem editar nada.</p>
            </div>

            <Button variant="outline" size="sm" onClick={() => {
              [{ name: "config.php", content: generateConfigPhp() }, { name: "api.php", content: generateApiPhp() }, { name: "test_api.html", content: generateTestHtml() }]
                .forEach((f, i) => setTimeout(() => {
                  const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); URL.revokeObjectURL(url);
                }, i * 300));
              toast({ title: "📥 Baixando 3 arquivos" });
            }} className="w-full gap-2 h-9 text-xs border-neon-green/30 text-neon-green hover:bg-neon-green/10">
              <Download className="w-3.5 h-3.5" /> Baixar Todos
            </Button>

            {[
              { name: "config.php", label: "📄 config.php", gen: generateConfigPhp, field: "config_php", type: "text/plain" },
              { name: "api.php", label: "📄 api.php — v3.2", gen: generateApiPhp, field: "api_php", type: "text/plain" },
              { name: "test_api.html", label: "📄 test_api.html", gen: generateTestHtml, field: "test_html", type: "text/html" },
            ].map(f => (
              <div key={f.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{f.label}</p>
                  <div className="flex gap-1">
                    <CopyButton text={f.gen()} field={f.field} />
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => {
                      const blob = new Blob([f.gen()], { type: f.type }); const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); URL.revokeObjectURL(url);
                    }}><Download className="w-3 h-3" /> Baixar</Button>
                  </div>
                </div>
                <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono whitespace-pre max-h-40">{f.gen()}</pre>
              </div>
            ))}
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
              <p className="text-[10px] text-muted-foreground mt-1">Quando expirar, afiliados podem ser removidos.</p>
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
