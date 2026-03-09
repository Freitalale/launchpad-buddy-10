import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Server, Settings as SettingsIcon, Save, TestTube, RefreshCw, CheckCircle, AlertCircle, Wifi, Zap, Globe, TableProperties, Columns3, Copy, Code, Key, Download, FileText, Users, Wallet, ArrowDownCircle, ArrowUpCircle, UserCheck, Plus, Trash2, X, Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Plataforma, useUpdatePlatform } from "@/hooks/usePlatforms";
import { usePlatformApi } from "@/hooks/usePlatformApi";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface ScanResult {
  ok: boolean;
  database?: string;
  total_tables?: number;
  all_tables?: string[];
  tables?: Record<string, { columns: { name: string; type: string; key?: string; nullable?: boolean }[]; row_count: number }>;
  suggestions?: Record<string, { table: string; confidence: number; columns: Record<string, string | null> } | null>;
  error?: string;
}

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

// Column field mapping from suggestion keys to form fields
const SUGGESTION_TO_FORM: Record<string, Record<string, string>> = {
  usuarios: { id: "coluna_id_usuario", nome: "coluna_nome_usuario", email: "coluna_email_usuario", telefone: "coluna_telefone_usuario" },
  depositos: { id: "coluna_id_deposito", user_id: "coluna_user_id_deposito", valor: "coluna_valor_deposito", pix: "coluna_pix_deposito", status: "coluna_status_deposito", created_at: "coluna_created_at_deposito" },
  saques: { id: "coluna_id_saque", user_id: "coluna_user_id_saque", valor: "coluna_valor_saque", pix: "coluna_pix_saque", status: "coluna_status_saque", created_at: "coluna_created_at_saque" },
  saldo: { user_id: "coluna_user_id_saldo", saldo: "coluna_saldo" },
  afiliados: { id: "coluna_id_afiliado", nome: "coluna_nome_afiliado", user_id: "coluna_user_id_afiliado", cooperation_expired: "coluna_cooperation_expired" },
};

const TABLE_FIELD_MAP: Record<string, string> = {
  usuarios: "tabela_usuarios",
  depositos: "tabela_depositos",
  saques: "tabela_saques",
  saldo: "tabela_saldo",
  afiliados: "tabela_afiliados",
};

type HiddenColumnsMap = Record<string, string[]>;
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
  const [verifying, setVerifying] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<Record<string, boolean>>({});
  const [verifyResult, setVerifyResult] = useState<{ version: string; endpoints: { name: string; status: string; detail: string }[] } | null>(null);

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanDetails, setShowScanDetails] = useState(false);

  // Extra dynamic columns per built-in table
  const [extraColumns, setExtraColumns] = useState<ExtraColumnsMap>({});
  const [extraTables, setExtraTables] = useState<ExtraTable[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<HiddenColumnsMap>({});
  const [disabledTables, setDisabledTables] = useState<DisabledTablesSet>([]);
  const [statusMaps, setStatusMaps] = useState<Record<string, Record<string, string>>>({
    saques: { approve: "approved", reject: "rejected", pending: "pending" },
    depositos: { approve: "approved", reject: "rejected", pending: "pending" },
  });

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
      const extra = p.mapeamento_extra ?? {};
      setExtraColumns(extra.colunas_extra ?? {});
      setExtraTables(extra.tabelas_extra ?? []);
      setHiddenColumns(extra.colunas_ocultas ?? {});
      setDisabledTables(extra.tabelas_desativadas ?? []);
      setStatusMaps(extra.status_maps ?? {
        saques: { approve: "approved", reject: "rejected", pending: "pending" },
        depositos: { approve: "approved", reject: "rejected", pending: "pending" },
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

  // ── Scanner ──
  const handleScanDatabase = async () => {
    if (!form.url) {
      toast({ title: "URL necessária", description: "Configure a URL da plataforma na aba API primeiro.", variant: "destructive" });
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      let apiUrl = form.url;
      if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
        apiUrl = `https://${apiUrl}`;
      }
      const { data, error } = await supabase.functions.invoke("scan-database", {
        body: { api_url: apiUrl },
      });
      if (error) throw error;
      setScanResult(data as ScanResult);
      if (data?.ok) {
        const detectedCount = Object.values(data.suggestions ?? {}).filter((v: any) => v !== null).length;
        toast({ title: `🔍 Escaneamento completo!`, description: `${data.total_tables} tabelas encontradas, ${detectedCount} detectadas automaticamente.` });
      } else {
        toast({ title: "Erro no escaneamento", description: data?.error ?? "Erro desconhecido", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setScanResult({ ok: false, error: e.message });
    }
    setScanning(false);
  };

  const applySuggestions = () => {
    if (!scanResult?.suggestions) return;
    const newForm = { ...form };
    for (const [category, suggestion] of Object.entries(scanResult.suggestions)) {
      if (!suggestion) continue;
      // Set table name
      const tableField = TABLE_FIELD_MAP[category];
      if (tableField) (newForm as any)[tableField] = suggestion.table;
      // Set column mappings
      const colMap = SUGGESTION_TO_FORM[category];
      if (colMap) {
        for (const [colKey, formField] of Object.entries(colMap)) {
          const detected = suggestion.columns[colKey];
          if (detected) (newForm as any)[formField] = detected;
        }
      }
    }
    setForm(newForm);
    // Enable detected, disable non-detected
    const newDisabled = Object.entries(scanResult.suggestions)
      .filter(([_, v]) => v === null)
      .map(([k]) => k);
    setDisabledTables(newDisabled);
    toast({ title: "✅ Mapeamento aplicado!", description: "Tabelas e colunas preenchidas automaticamente. Revise e salve." });
  };

  // -- Extra column helpers --
  const addExtraColumn = (tableKey: string) => {
    setExtraColumns(prev => ({ ...prev, [tableKey]: [...(prev[tableKey] ?? []), { label: "", column: "" }] }));
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
  const hideDefaultColumn = (tableKey: string, field: string) => {
    setHiddenColumns(prev => ({ ...prev, [tableKey]: [...(prev[tableKey] ?? []), field] }));
  };
  const showDefaultColumn = (tableKey: string, field: string) => {
    setHiddenColumns(prev => ({ ...prev, [tableKey]: (prev[tableKey] ?? []).filter(f => f !== field) }));
  };
  const addExtraTable = () => {
    setExtraTables(prev => [...prev, { key: `custom_${Date.now()}`, tableName: "", columns: [] }]);
  };
  const updateExtraTable = (idx: number, tableName: string) => {
    setExtraTables(prev => { const t = [...prev]; t[idx] = { ...t[idx], tableName }; return t; });
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

  const buildMapeamentoExtra = () => ({
    colunas_extra: extraColumns, tabelas_extra: extraTables,
    colunas_ocultas: hiddenColumns, tabelas_desativadas: disabledTables,
    status_maps: statusMaps,
  });

  const generateConfigPhp = () => {
    return `<?php
// config.php — Gerado pelo Painel v5.0
// Plataforma: ${platform.nome}
// Gerado em: ${new Date().toISOString()}
$host = "${form.db_host || "localhost"}";
$user = "${form.db_user || "seu_usuario_db"}";
$pass = "${form.db_pass || "sua_senha_db"}";
$db   = "${form.db_name || "nome_do_banco"}";
$port = ${form.db_port || 3306};
?>`;
  };

  const generateMappingJson = () => {
    return JSON.stringify({
      usuarios: {
        table: form.tabela_usuarios || "users",
        id: form.coluna_id_usuario || "id",
        name: form.coluna_nome_usuario || "name",
        email: form.coluna_email_usuario || "email",
        phone: form.coluna_telefone_usuario || "phone",
      },
      depositos: {
        table: form.tabela_depositos || "deposits",
        id: form.coluna_id_deposito || "id",
        user_id: form.coluna_user_id_deposito || "user_id",
        amount: form.coluna_valor_deposito || "amount",
        pix: form.coluna_pix_deposito || "pix",
        status: form.coluna_status_deposito || "status",
        date: form.coluna_created_at_deposito || "created_at",
      },
      saques: {
        table: form.tabela_saques || "withdrawals",
        id: form.coluna_id_saque || "id",
        user_id: form.coluna_user_id_saque || "user_id",
        amount: form.coluna_valor_saque || "amount",
        pix: form.coluna_pix_saque || "pix",
        status: form.coluna_status_saque || "status",
        date: form.coluna_created_at_saque || "created_at",
      },
      saldo: {
        table: form.tabela_saldo || "wallets",
        user_id: form.coluna_user_id_saldo || "user_id",
        balance: form.coluna_saldo || "balance",
      },
      afiliados: {
        table: form.tabela_afiliados || "affiliates",
        id: form.coluna_id_afiliado || "id",
        name: form.coluna_nome_afiliado || "name",
        user_id: form.coluna_user_id_afiliado || "user_id",
        expired: form.coluna_cooperation_expired || "cooperation_expired",
      },
      status_maps: {
        saques: statusMaps.saques ?? { approve: "approved", reject: "rejected", pending: "pending" },
        depositos: statusMaps.depositos ?? { approve: "approved", reject: "rejected", pending: "pending" },
      },
      version: "6.0.0",
      updated_at: new Date().toISOString(),
      platform: platform.nome,
    }, null, 2);
  };

  const generateApiPhp = () => {
    return `<?php
// api.php — API Standalone v6.0 (Universal Status Mapping + Hybrid Mapping)
// Plataforma: ${platform.nome}
// Gerado em: ${new Date().toISOString()}
// ARQUITETURA: Lê mapping_cache.json → quando você muda no painel, basta atualizar o JSON

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

try {

error_reporting(0);
ini_set("display_errors", "0");

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit; }

include 'config.php';
$conn = new mysqli($host, $user, $pass, $db, $port);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

// ═══ HELPERS ═══
function table_exists($conn, $table) {
    $r = @$conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($table) . "'");
    return $r && $r->num_rows > 0;
}
function get_columns($conn, $table) {
    $cols = [];
    $r = @$conn->query("SHOW COLUMNS FROM \`$table\`");
    if ($r) { while ($c = $r->fetch_assoc()) { $cols[] = $c["Field"]; } }
    return $cols;
}
function col_exists($conn, $table, $col) {
    return in_array($col, get_columns($conn, $table));
}

// ═══ LOAD MAPPING (mapping_cache.json é LEI) ═══
$mapping_file = __DIR__ . "/mapping_cache.json";
if (file_exists($mapping_file)) {
    $map = json_decode(file_get_contents($mapping_file), true);
} else {
    // Fallback inline (valores do momento da geração)
    $map = json_decode('${generateMappingJson().replace(/'/g, "\\'")}', true);
}

$action = $_GET["action"] ?? "";

// ═══ UPDATE_MAPPING — Painel envia novo mapeamento em tempo real ═══
if ($action === "update_mapping") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || !isset($input["usuarios"])) {
        echo json_encode(["ok" => false, "error" => "JSON de mapeamento inválido"]); exit;
    }
    $input["updated_at"] = date("c");
    $written = @file_put_contents($mapping_file, json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($written === false) {
        echo json_encode(["ok" => false, "error" => "Sem permissão de escrita em mapping_cache.json"]); exit;
    }
    echo json_encode(["ok" => true, "message" => "Mapeamento atualizado", "bytes" => $written]); exit;
}

// ═══ GET_MAPPING — Retorna mapeamento atual ═══
if ($action === "get_mapping") {
    echo json_encode(["ok" => true, "mapping" => $map, "source" => file_exists($mapping_file) ? "file" : "inline"]); exit;
}

// ═══ SCAN_DB ═══
if ($action === "scan_db") {
    $tables_result = $conn->query("SHOW TABLES");
    if (!$tables_result) { echo json_encode(["error" => $conn->error]); exit; }
    $tables = [];
    while ($row = $tables_result->fetch_array()) {
        $tn = $row[0];
        $cr = $conn->query("SHOW COLUMNS FROM \`$tn\`");
        $columns = [];
        if ($cr) { while ($c = $cr->fetch_assoc()) { $columns[] = ["name"=>$c["Field"],"type"=>$c["Type"],"key"=>$c["Key"]??"","nullable"=>$c["Null"]==="YES"]; } }
        $cnt = @$conn->query("SELECT COUNT(*) as t FROM \`$tn\`");
        $count = $cnt ? (int)$cnt->fetch_assoc()["t"] : 0;
        $tables[$tn] = ["columns" => $columns, "count" => $count];
    }
    echo json_encode(["ok"=>true,"database"=>$db,"tables"=>$tables,"total"=>count($tables)]); exit;
}

// ═══ DIAGNOSTICO PROFUNDO v5.8 ═══
if ($action === "diagnostico") {
    $diag = ["mapping"=>[],"column_checks"=>[],"saldo_debug"=>null,"mapping_source"=>file_exists($mapping_file)?"file":"inline"];
    $entities = [
        "usuarios" => ["table" => $map["usuarios"]["table"] ?? "users", "required_cols" => [$map["usuarios"]["id"] ?? "id", $map["usuarios"]["name"] ?? "name"]],
        "depositos" => ["table" => $map["depositos"]["table"] ?? "deposits", "required_cols" => [$map["depositos"]["id"] ?? "id", $map["depositos"]["user_id"] ?? "user_id", $map["depositos"]["amount"] ?? "amount", $map["depositos"]["status"] ?? "status", $map["depositos"]["date"] ?? "created_at"]],
        "saques" => ["table" => $map["saques"]["table"] ?? "withdrawals", "required_cols" => [$map["saques"]["id"] ?? "id", $map["saques"]["user_id"] ?? "user_id", $map["saques"]["amount"] ?? "amount", $map["saques"]["status"] ?? "status", $map["saques"]["date"] ?? "created_at"]],
        "saldo" => ["table" => $map["saldo"]["table"] ?? "wallets", "required_cols" => [$map["saldo"]["user_id"] ?? "user_id", $map["saldo"]["balance"] ?? "balance"]],
        "afiliados" => ["table" => $map["afiliados"]["table"] ?? "affiliates", "required_cols" => [$map["afiliados"]["expired"] ?? "cooperation_expired"]],
    ];

    foreach ($entities as $key => $cfg) {
        $t = $cfg["table"];
        $exists = table_exists($conn, $t);
        $cols = $exists ? get_columns($conn, $t) : [];
        $cnt = 0;
        if ($exists) { $r = @$conn->query("SELECT COUNT(*) as t FROM \`$t\`"); if ($r) $cnt = (int)$r->fetch_assoc()["t"]; }
        
        // Check each required column
        $col_results = [];
        foreach ($cfg["required_cols"] as $rc) {
            $col_results[$rc] = $exists ? in_array($rc, $cols) : false;
        }
        $missing_cols = array_keys(array_filter($col_results, function($v) { return !$v; }));
        
        $diag["mapping"][$key] = [
            "table" => $t, "exists" => $exists, "columns" => $cols, "count" => $cnt,
            "column_checks" => $col_results, "missing_columns" => $missing_cols,
        ];
    }

    // Saldo debug detalhado
    $tb_saldo = $map["saldo"]["table"] ?? "wallets";
    $col_bal = $map["saldo"]["balance"] ?? "balance";
    if (table_exists($conn, $tb_saldo)) {
        $hasSaldoCol = col_exists($conn, $tb_saldo, $col_bal);
        $saldoTotal = 0;
        $sampleValues = [];
        if ($hasSaldoCol) {
            $r = @$conn->query("SELECT COALESCE(SUM(\`$col_bal\`),0) as total FROM \`$tb_saldo\`");
            if ($r) $saldoTotal = (float)$r->fetch_assoc()["total"];
            $r2 = @$conn->query("SELECT \`$col_bal\` FROM \`$tb_saldo\` WHERE \`$col_bal\` > 0 LIMIT 5");
            if ($r2) { while ($s = $r2->fetch_assoc()) $sampleValues[] = (float)$s[$col_bal]; }
        }
        $all_cols = get_columns($conn, $tb_saldo);
        $possible_balance_cols = array_filter($all_cols, function($c) {
            return preg_match('/(balance|saldo|amount|valor|credits|money|wallet|disponivel)/i', $c);
        });
        $diag["saldo_debug"] = [
            "table" => $tb_saldo, "column" => $col_bal, "column_exists" => $hasSaldoCol,
            "total" => $saldoTotal, "sample_values" => $sampleValues,
            "all_columns" => $all_cols, "possible_balance_columns" => array_values($possible_balance_cols),
        ];
    }

    echo json_encode(["ok"=>true,"version"=>"5.8.0","diagnostico"=>$diag]); exit;
}

// ═══ HEALTH ═══
if ($action === "health") {
    $checks = [];
    foreach (["usuarios","depositos","saques","saldo","afiliados"] as $key) {
        $t = $map[$key]["table"] ?? "";
        $checks[$key] = ["table"=>$t,"exists"=>table_exists($conn, $t)];
    }
    echo json_encode(["ok"=>true,"version"=>"5.8.0","db"=>true,"time"=>date("c"),"tables"=>$checks,
        "mapping_source"=>file_exists($mapping_file)?"file":"inline",
        "features"=>["scan_db","diagnostico","update_mapping","get_mapping","standalone","hybrid_mapping"]]); exit;
}

// ═══ STATS ═══
if ($action === "stats") {
    $result = ["total_usuarios"=>0,"total_afiliados"=>0,"saldo_total"=>0.0,"total_depositos"=>0,"total_saques"=>0];
    $tb = $map["usuarios"]["table"] ?? "users";
    if (table_exists($conn, $tb)) { $r = @$conn->query("SELECT COUNT(*) as total FROM \`$tb\`"); if ($r) $result["total_usuarios"] = (int)$r->fetch_assoc()["total"]; }
    $tb = $map["afiliados"]["table"] ?? "affiliates";
    if (table_exists($conn, $tb)) { $r = @$conn->query("SELECT COUNT(*) as total FROM \`$tb\`"); if ($r) $result["total_afiliados"] = (int)$r->fetch_assoc()["total"]; }
    $tb = $map["saldo"]["table"] ?? "wallets"; $col = $map["saldo"]["balance"] ?? "balance";
    if (table_exists($conn, $tb) && col_exists($conn, $tb, $col)) { $r = @$conn->query("SELECT COALESCE(SUM(\`$col\`),0) as total FROM \`$tb\`"); if ($r) $result["saldo_total"] = (float)$r->fetch_assoc()["total"]; }
    $tb = $map["depositos"]["table"] ?? "deposits";
    if (table_exists($conn, $tb)) { $r = @$conn->query("SELECT COUNT(*) as total FROM \`$tb\`"); if ($r) $result["total_depositos"] = (int)$r->fetch_assoc()["total"]; }
    $tb = $map["saques"]["table"] ?? "withdrawals";
    if (table_exists($conn, $tb)) { $r = @$conn->query("SELECT COUNT(*) as total FROM \`$tb\`"); if ($r) $result["total_saques"] = (int)$r->fetch_assoc()["total"]; }
    echo json_encode($result); exit;
}

// ═══ DEPOSITOS ═══
if ($action === "depositos") {
    $d = $map["depositos"]; $u = $map["usuarios"];
    $tb_d = $d["table"] ?? "deposits"; $tb_u = $u["table"] ?? "users";
    if (!table_exists($conn, $tb_d)) { echo json_encode([]); exit; }
    $hasUsers = table_exists($conn, $tb_u);
    $col_uid = $d["user_id"] ?? "user_id"; $col_val = $d["amount"] ?? "amount";
    $col_pix = $d["pix"] ?? "pix"; $col_dt = $d["date"] ?? "created_at"; $col_st = $d["status"] ?? "status";
    $col_uname = $u["name"] ?? "name"; $col_u_id = $u["id"] ?? "id";

    if ($hasUsers) {
        $sql = "SELECT u.\`$col_uname\` as nome_usuario, d.\`$col_val\` as valor, " .
            (col_exists($conn,$tb_d,$col_pix) ? "d.\`$col_pix\`" : "''") . " as pix, " .
            "d.\`$col_dt\` as created_at, d.\`$col_st\` as status " .
            "FROM \`$tb_d\` d LEFT JOIN \`$tb_u\` u ON d.\`$col_uid\`=u.\`$col_u_id\` ORDER BY d.\`$col_dt\` DESC LIMIT 500";
    } else {
        $sql = "SELECT \`$col_uid\` as nome_usuario, \`$col_val\` as valor, " .
            (col_exists($conn,$tb_d,$col_pix) ? "\`$col_pix\`" : "''") . " as pix, " .
            "\`$col_dt\` as created_at, \`$col_st\` as status FROM \`$tb_d\` ORDER BY \`$col_dt\` DESC LIMIT 500";
    }
    $r = @$conn->query($sql);
    if (!$r) { echo json_encode(["error" => "SQL Error: " . $conn->error, "sql" => $sql]); exit; }
    $rows = []; while ($x = $r->fetch_assoc()) $rows[] = $x;
    echo json_encode($rows); exit;
}

// ═══ SAQUES ═══
if ($action === "saques") {
    $w = $map["saques"]; $u = $map["usuarios"];
    $tb_w = $w["table"] ?? "withdrawals"; $tb_u = $u["table"] ?? "users";
    if (!table_exists($conn, $tb_w)) { echo json_encode([]); exit; }
    $hasUsers = table_exists($conn, $tb_u);
    $col_wid = $w["id"] ?? "id"; $col_wuid = $w["user_id"] ?? "user_id";
    $col_wval = $w["amount"] ?? "amount"; $col_wpix = $w["pix"] ?? "pix";
    $col_wdt = $w["date"] ?? "created_at"; $col_wst = $w["status"] ?? "status";
    $col_uname = $u["name"] ?? "name"; $col_u_id = $u["id"] ?? "id";

    if ($hasUsers) {
        $sql = "SELECT w.\`$col_wid\` as id, u.\`$col_uname\` as nome_usuario, w.\`$col_wval\` as valor, " .
            (col_exists($conn,$tb_w,$col_wpix) ? "w.\`$col_wpix\`" : "''") . " as pix, " .
            "w.\`$col_wdt\` as created_at, w.\`$col_wst\` as status " .
            "FROM \`$tb_w\` w LEFT JOIN \`$tb_u\` u ON w.\`$col_wuid\`=u.\`$col_u_id\` ORDER BY w.\`$col_wdt\` DESC LIMIT 500";
    } else {
        $sql = "SELECT \`$col_wid\` as id, \`$col_wuid\` as nome_usuario, \`$col_wval\` as valor, " .
            (col_exists($conn,$tb_w,$col_wpix) ? "\`$col_wpix\`" : "''") . " as pix, " .
            "\`$col_wdt\` as created_at, \`$col_wst\` as status FROM \`$tb_w\` ORDER BY \`$col_wdt\` DESC LIMIT 500";
    }
    $r = @$conn->query($sql);
    if (!$r) { echo json_encode(["error" => "SQL Error: " . $conn->error, "sql" => $sql]); exit; }
    $rows = []; while ($x = $r->fetch_assoc()) $rows[] = $x;
    echo json_encode($rows); exit;
}

// ═══ APROVAR/REJEITAR SAQUE (Universal Status Mapping v6.0) ═══
if ($action === "aprovar_saque" || $action === "rejeitar_saque") {
    $id = $_POST["id"] ?? $_GET["id"] ?? "";
    if (empty($id)) { echo json_encode(["ok"=>false,"error"=>"ID inválido"]); exit; }
    // Universal status mapping — lê do mapping (status_maps.saques)
    $sm = $map["status_maps"]["saques"] ?? [];
    $status = $action === "aprovar_saque" 
        ? ($sm["approve"] ?? "approved") 
        : ($sm["reject"] ?? "rejected");
    $tb = $map["saques"]["table"] ?? "withdrawals";
    $col_st = $map["saques"]["status"] ?? "status";
    $col_id = $map["saques"]["id"] ?? "id";
    $id_escaped = $conn->real_escape_string($id);
    $status_escaped = $conn->real_escape_string($status);
    $conn->query("UPDATE \`$tb\` SET \`$col_st\`='$status_escaped' WHERE \`$col_id\`='$id_escaped'");
    echo json_encode(["ok"=>true,"affected"=>$conn->affected_rows,"status_set"=>$status,"mapping_used"=>$sm]); exit;
}

// ═══ GET_STATUS_MAP — Auto-detecta valores de status do banco ═══
if ($action === "get_status_map") {
    $result = [];
    foreach (["saques","depositos"] as $entity) {
        $tb = $map[$entity]["table"] ?? "";
        $col = $map[$entity]["status"] ?? "status";
        if (table_exists($conn, $tb) && col_exists($conn, $tb, $col)) {
            $r = @$conn->query("SELECT DISTINCT \`$col\` as s FROM \`$tb\` LIMIT 50");
            $vals = [];
            if ($r) { while ($row = $r->fetch_assoc()) { $vals[] = $row["s"]; } }
            $result[$entity] = ["column" => $col, "distinct_values" => $vals, "count" => count($vals)];
        } else {
            $result[$entity] = ["column" => $col, "error" => "Tabela ou coluna não encontrada"];
        }
    }
    echo json_encode(["ok"=>true,"status_maps"=>$result,"current_mapping"=>$map["status_maps"] ?? []]); exit;
}

// ═══ REMOVER AFILIADOS ═══
if ($action === "remover_afiliados") {
    $tb = $map["afiliados"]["table"] ?? "affiliates";
    $col = $map["afiliados"]["expired"] ?? "cooperation_expired";
    $conn->query("DELETE FROM \`$tb\` WHERE \`$col\` = 1");
    echo json_encode(["ok"=>true,"removed"=>$conn->affected_rows]); exit;
}

echo json_encode(["error"=>"Ação não reconhecida: ".$action,
    "available"=>["health","stats","depositos","saques","aprovar_saque","rejeitar_saque","remover_afiliados","scan_db","diagnostico","update_mapping","get_mapping"],
    "version"=>"5.8.0"]);

} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(["error"=>"PHP Exception: ".$e->getMessage(),"file"=>basename($e->getFile()),"line"=>$e->getLine(),"version"=>"5.8.0"]);
}
?>`;
  };

  const generateTelegramWebhook = () => {
    return `<?php
// telegram_webhook.php — Webhook de Notificações Telegram
// Plataforma: ${platform.nome}
// Gerado em: ${new Date().toISOString()}

error_reporting(0);
ini_set("display_errors", "0");
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

include 'config.php';
$conn = new mysqli($host, $user, $pass, $db, $port);
if ($conn->connect_error) {
    echo json_encode(["error" => "DB connection failed"]); exit;
}
$conn->set_charset("utf8mb4");

// Configuração do Telegram
$bot_token = $_GET["bot_token"] ?? "";
$chat_id   = $_GET["chat_id"] ?? "";
$event     = $_GET["event"] ?? "";

if (!$bot_token || !$chat_id) {
    echo json_encode(["error" => "bot_token e chat_id são obrigatórios"]); exit;
}

function sendTelegram($bot_token, $chat_id, $message) {
    $url = "https://api.telegram.org/bot{$bot_token}/sendMessage";
    $data = ["chat_id" => $chat_id, "text" => $message, "parse_mode" => "HTML"];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $result = curl_exec($ch);
    curl_close($ch);
    return json_decode($result, true);
}

// Receber dados via POST (webhook de plataforma)
$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;

if ($event === "deposito" || ($input["type"] ?? "") === "deposit") {
    $nome = $input["user_name"] ?? $input["nome"] ?? "Desconhecido";
    $valor = $input["amount"] ?? $input["valor"] ?? 0;
    $msg = "💰 <b>NOVO DEPÓSITO</b>\\n\\n👤 Usuário: {$nome}\\n💵 Valor: R\$ " . number_format((float)$valor, 2, ",", ".") . "\\n📍 Plataforma: ${platform.nome}";
    $result = sendTelegram($bot_token, $chat_id, $msg);
    echo json_encode(["ok" => true, "telegram" => $result]); exit;
}

if ($event === "saque" || ($input["type"] ?? "") === "withdrawal") {
    $nome = $input["user_name"] ?? $input["nome"] ?? "Desconhecido";
    $valor = $input["amount"] ?? $input["valor"] ?? 0;
    $msg = "💸 <b>NOVO SAQUE</b>\\n\\n👤 Usuário: {$nome}\\n💵 Valor: R\$ " . number_format((float)$valor, 2, ",", ".") . "\\n📍 Plataforma: ${platform.nome}";
    $result = sendTelegram($bot_token, $chat_id, $msg);
    echo json_encode(["ok" => true, "telegram" => $result]); exit;
}

if ($event === "novo_usuario" || ($input["type"] ?? "") === "new_user") {
    $nome = $input["user_name"] ?? $input["nome"] ?? "Novo Usuário";
    $msg = "👤 <b>NOVO USUÁRIO</b>\\n\\n🆕 Nome: {$nome}\\n📍 Plataforma: ${platform.nome}";
    $result = sendTelegram($bot_token, $chat_id, $msg);
    echo json_encode(["ok" => true, "telegram" => $result]); exit;
}

if ($event === "test") {
    $msg = "🔔 <b>TESTE DE NOTIFICAÇÃO</b>\\n\\n✅ Webhook configurado com sucesso!\\n📍 Plataforma: ${platform.nome}\\n⏰ " . date("d/m/Y H:i:s");
    $result = sendTelegram($bot_token, $chat_id, $msg);
    echo json_encode(["ok" => true, "telegram" => $result]); exit;
}

echo json_encode(["error" => "Evento não reconhecido", "available" => ["deposito", "saque", "novo_usuario", "test"]]);
?>`;
  };

  const generateWebhookPix = () => {
    const tb = {
      d: form.tabela_depositos || "deposits",
      s: form.tabela_saques || "withdrawals",
      u: form.tabela_usuarios || "users",
    };
    const col = {
      duid: form.coluna_user_id_deposito || "user_id",
      dval: form.coluna_valor_deposito || "amount",
      dpix: form.coluna_pix_deposito || "pix",
      dst: form.coluna_status_deposito || "status",
      suid: form.coluna_user_id_saque || "user_id",
      sval: form.coluna_valor_saque || "amount",
      spix: form.coluna_pix_saque || "pix",
      sst: form.coluna_status_saque || "status",
    };
    return `<?php
// webhook_pix.php — Webhook para Gateway de Pagamento PIX
// Plataforma: ${platform.nome}
// Gerado em: ${new Date().toISOString()}
// Recebe callbacks de gateways PIX e atualiza o banco de dados

error_reporting(0);
ini_set("display_errors", "0");
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");

include 'config.php';
$conn = new mysqli($host, $user, $pass, $db, $port);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed"]); exit;
}
$conn->set_charset("utf8mb4");

// Receber dados do gateway
$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_GET["action"] ?? $input["action"] ?? "";

// ═══ CONFIRMAR DEPÓSITO PIX ═══
if ($action === "confirmar_deposito") {
    $user_id = intval($input["user_id"] ?? 0);
    $valor = floatval($input["valor"] ?? $input["amount"] ?? 0);
    $pix = $conn->real_escape_string($input["pix"] ?? $input["document"] ?? "");
    $tx_id = $conn->real_escape_string($input["tx_id"] ?? $input["transaction_id"] ?? "");
    
    if ($user_id <= 0 || $valor <= 0) {
        echo json_encode(["ok" => false, "error" => "user_id e valor são obrigatórios"]); exit;
    }
    
    $sql = "INSERT INTO \`${tb.d}\` (\`${col.duid}\`, \`${col.dval}\`, \`${col.dpix}\`, \`${col.dst}\`) VALUES ($user_id, $valor, '$pix', 'aprovado')";
    $r = @$conn->query($sql);
    
    if ($r) {
        echo json_encode(["ok" => true, "id" => $conn->insert_id, "message" => "Depósito confirmado"]);
    } else {
        echo json_encode(["ok" => false, "error" => $conn->error]);
    }
    exit;
}

// ═══ CONFIRMAR SAQUE PIX ═══
if ($action === "confirmar_saque") {
    $user_id = intval($input["user_id"] ?? 0);
    $valor = floatval($input["valor"] ?? $input["amount"] ?? 0);
    $pix = $conn->real_escape_string($input["pix"] ?? $input["document"] ?? "");
    
    if ($user_id <= 0 || $valor <= 0) {
        echo json_encode(["ok" => false, "error" => "user_id e valor são obrigatórios"]); exit;
    }
    
    $sql = "INSERT INTO \`${tb.s}\` (\`${col.suid}\`, \`${col.sval}\`, \`${col.spix}\`, \`${col.sst}\`) VALUES ($user_id, $valor, '$pix', 'pendente')";
    $r = @$conn->query($sql);
    
    if ($r) {
        echo json_encode(["ok" => true, "id" => $conn->insert_id, "message" => "Saque registrado como pendente"]);
    } else {
        echo json_encode(["ok" => false, "error" => $conn->error]);
    }
    exit;
}

// ═══ CALLBACK GATEWAY ═══
if ($action === "callback" || $action === "webhook") {
    // Formato genérico de callback de gateway PIX
    $status = $input["status"] ?? $input["payment_status"] ?? "";
    $tx_id = $input["tx_id"] ?? $input["transaction_id"] ?? $input["id"] ?? "";
    $type = $input["type"] ?? "deposit";
    
    $log = date("c") . " | callback | status=$status | tx=$tx_id | type=$type";
    @file_put_contents("webhook_log.txt", $log . "\\n", FILE_APPEND);
    
    echo json_encode(["ok" => true, "received" => true, "status" => $status]);
    exit;
}

echo json_encode([
    "ok" => true,
    "version" => "1.0.0",
    "platform" => "${platform.nome}",
    "available_actions" => ["confirmar_deposito", "confirmar_saque", "callback"],
    "usage" => "POST com JSON body contendo action, user_id, valor, pix"
]);
?>`;
  };

  const generateTestHtml = () => {
    const rawUrl = form.url ? form.url.replace(/\/$/, "") : "";
    const fullUrl = rawUrl && !rawUrl.startsWith("http") ? `https://${rawUrl}` : rawUrl;
    const apiUrl = fullUrl ? `${fullUrl}/api.php` : "https://seusite.com/api.php";
    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Teste API v5.8 — ${platform.nome}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI',monospace;background:#0a0a0f;color:#e0e0e0;padding:20px;margin:0}h1{color:#00c4ff;margin-bottom:5px}h2{color:#888;font-size:14px;margin-top:0}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}button{background:#00c4ff;color:#000;border:none;padding:10px 18px;cursor:pointer;border-radius:8px;font-weight:bold;font-size:13px;transition:all .2s}button:hover{background:#00a0dd;transform:scale(1.02)}button.scan{background:#a855f7}button.scan:hover{background:#9333ea}button.diag{background:#f59e0b}button.diag:hover{background:#d97706}button.map{background:#22c55e}button.map:hover{background:#16a34a}pre{background:#0d0d15;padding:12px;border-radius:8px;overflow-x:auto;border:1px solid #1a1a2e;max-height:350px;font-size:12px;line-height:1.5}input{width:100%;max-width:600px;padding:10px;background:#111;color:#fff;border:1px solid #333;border-radius:8px;font-size:14px;font-family:monospace}.status-bar{padding:12px;border-radius:8px;margin:10px 0;font-weight:bold;font-size:13px}.status-bar.ok{background:#22c55e15;border:1px solid #22c55e40;color:#22c55e}.status-bar.fail{background:#ef444415;border:1px solid #ef444440;color:#ef4444}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin:15px 0}.card{background:#111;border:1px solid #222;border-radius:10px;padding:15px}.card h3{margin:0 0 8px;font-size:13px;color:#00c4ff}.card.ok{border-color:#22c55e}.card.fail{border-color:#ef4444}</style>
</head><body>
<h1>🔌 Teste API v5.8 — ${platform.nome}</h1>
<h2>API Híbrida — mapping_cache.json + Direct Mapping</h2>
<input id="apiUrl" value="${apiUrl}" placeholder="URL da API (api.php)" />
<div class="controls">
<button onclick="testEndpoint('health')">🏥 Health</button>
<button onclick="testEndpoint('stats')">📊 Stats</button>
<button onclick="testEndpoint('depositos')">💰 Depósitos</button>
<button onclick="testEndpoint('saques')">💸 Saques</button>
<button class="scan" onclick="testEndpoint('scan_db')">🔍 Scan DB</button>
<button class="diag" onclick="testEndpoint('diagnostico')">🔧 Diagnóstico</button>
<button class="map" onclick="testEndpoint('get_mapping')">📋 Ver Mapping</button>
<button onclick="testAll()">🚀 Testar Todos</button>
</div>
<div id="status"></div>
<div class="grid" id="results"></div>
<pre id="raw">Clique em um botão para começar...</pre>
<script>
const g=id=>document.getElementById(id);
const api=()=>g("apiUrl").value;
async function testEndpoint(a){
  g("status").innerHTML='<div class="status-bar">⏳ Testando '+a+'...</div>';
  try{const t=performance.now();const r=await fetch(api()+"?action="+a);const ms=Math.round(performance.now()-t);const txt=await r.text();
  let d;try{d=JSON.parse(txt)}catch(e){g("status").innerHTML='<div class="status-bar fail">❌ Resposta não é JSON válido</div>';g("raw").textContent=txt.slice(0,2000);return}
  const ok=!d.error;
  g("status").innerHTML='<div class="status-bar '+(ok?"ok":"fail")+'">'+(ok?"✅":"❌")+" "+a+" — "+(ok?ms+"ms":d.error)+"</div>";
  g("raw").textContent=JSON.stringify(d,null,2);
  }catch(e){g("status").innerHTML='<div class="status-bar fail">❌ '+e.message+"</div>";g("raw").textContent=e.message}
}
async function testAll(){
  const actions=["health","stats","depositos","saques","get_mapping"];let html="";let allOk=true;
  for(const a of actions){try{const t=performance.now();const r=await fetch(api()+"?action="+a);const ms=Math.round(performance.now()-t);const txt=await r.text();
  let d;try{d=JSON.parse(txt)}catch(e){allOk=false;html+='<div class="card fail"><h3>'+a+'</h3><pre>Não é JSON: '+txt.slice(0,300)+"</pre></div>";continue}
  const ok=!d.error;if(!ok)allOk=false;
  html+='<div class="card '+(ok?"ok":"fail")+'"><h3>'+a+" — "+(ok?"OK "+ms+"ms":"FALHA")+"</h3><pre>"+JSON.stringify(d,null,2).slice(0,500)+"</pre></div>";
  }catch(e){allOk=false;html+='<div class="card fail"><h3>'+a+'</h3><pre>'+e.message+"</pre></div>"}}
  g("status").innerHTML='<div class="status-bar '+(allOk?"ok":"fail")+'">'+(allOk?"✅ Todos OK!":"⚠️ Alguns falharam")+"</div>";
  g("results").innerHTML=html;
}
</script></body></html>`;
  };

  // Push mapping to remote API via update_mapping endpoint
  const handlePushMapping = async () => {
    if (!form.url) {
      toast({ title: "URL necessária", variant: "destructive" });
      return;
    }
    const apiUrl = `${form.url.replace(/\/$/, "")}/api.php`;
    const mapping = JSON.parse(generateMappingJson());
    try {
      const res = await fetch(`${apiUrl}?action=update_mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapping),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Mapeamento sincronizado!", description: `mapping_cache.json atualizado no servidor (${data.bytes} bytes)` });
      } else {
        toast({ title: "❌ Erro", description: data.error ?? "Falha ao atualizar mapping", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "❌ Erro de conexão", description: e.message, variant: "destructive" });
    }
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
      if (disabledTables.includes(m.key)) { results.push(`⏭️ ${m.label} — Desativada`); continue; }
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

  const handleVerifyApi = async () => {
    if (!form.url) {
      toast({ title: "URL necessária", variant: "destructive" });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    const apiUrl = `${form.url.replace(/\/$/, "")}/api.php`;
    const endpoints = [
      { name: "health", action: "health" },
      { name: "stats", action: "stats" },
      { name: "depositos", action: "depositos" },
      { name: "saques", action: "saques" },
      { name: "diagnostico", action: "diagnostico" },
    ];
    let version = "desconhecida";
    const results: { name: string; status: string; detail: string }[] = [];
    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${apiUrl}?action=${ep.action}`, { signal: controller.signal });
        clearTimeout(timeout);
        const txt = await res.text();
        let json: any;
        try { json = JSON.parse(txt); } catch { results.push({ name: ep.name, status: "error", detail: "Resposta não é JSON" }); continue; }
        if (json.error) {
          results.push({ name: ep.name, status: "error", detail: json.error });
        } else {
          if (json.version) version = json.version;
          if (ep.name === "health") {
            const tables = json.tables ?? {};
            const allExist = Object.values(tables).every((t: any) => t.exists);
            results.push({ name: ep.name, status: allExist ? "ok" : "warning", detail: `v${json.version ?? "?"} — ${allExist ? "Todas tabelas OK" : "Algumas tabelas faltam"}` });
          } else if (ep.name === "stats") {
            results.push({ name: ep.name, status: "ok", detail: `Usuários: ${json.total_usuarios ?? 0} | Saldo: R$${Number(json.saldo_total ?? 0).toFixed(2)}` });
          } else if (ep.name === "depositos" || ep.name === "saques") {
            const count = Array.isArray(json) ? json.length : 0;
            results.push({ name: ep.name, status: count > 0 ? "ok" : "warning", detail: `${count} registros retornados` });
          } else if (ep.name === "diagnostico") {
            const diag = json.diag ?? json.diagnostico ?? {};
            if (json.version) version = json.version;
            results.push({ name: ep.name, status: "ok", detail: `Diagnóstico OK — v${json.version ?? version}` });
          }
        }
      } catch (e: any) {
        results.push({ name: ep.name, status: "error", detail: e.name === "AbortError" ? "Timeout (8s)" : e.message });
      }
    }
    setVerifyResult({ version, endpoints: results });
    const allOk = results.every(r => r.status === "ok");
    toast(allOk
      ? { title: `✅ API v${version} verificada!`, description: "Todos os endpoints funcionando" }
      : { title: `⚠️ API v${version}`, description: "Alguns endpoints com problemas", variant: "destructive" });
    setVerifying(false);
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

  const toggleTable = (key: string) => {
    setDisabledTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const renderTableSection = (meta: typeof TABLE_META[0]) => {
    const Icon = meta.icon;
    const tableValue = (form as any)[meta.tableField] ?? meta.defaultTable;
    const defaultCols = DEFAULT_COLUMNS[meta.key] ?? [];
    const hidden = hiddenColumns[meta.key] ?? [];
    const visibleCols = defaultCols.filter(c => !hidden.includes(c.field));
    const extras = extraColumns[meta.key] ?? [];
    const isDisabled = disabledTables.includes(meta.key);
    const suggestion = scanResult?.suggestions?.[meta.key];

    return (
      <div key={meta.key} className={`rounded-lg border p-3 space-y-2 transition-all ${isDisabled ? "border-border/30 opacity-50" : "border-border/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
            <div>
              <p className="text-xs font-semibold text-foreground">{meta.label} → {tableValue}</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{meta.desc}</p>
              {suggestion && (
                <p className="text-[9px] text-neon-green mt-0.5">
                  🔍 Detectado: <strong>{suggestion.table}</strong> ({suggestion.confidence}% confiança)
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {!isDisabled && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-primary" onClick={() => addExtraColumn(meta.key)}>
                <Plus className="w-3 h-3" /> Coluna
              </Button>
            )}
            <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 ${isDisabled ? "text-neon-green" : "text-destructive"}`} onClick={() => toggleTable(meta.key)}>
              {isDisabled ? <><Plus className="w-3 h-3 mr-1" /> Ativar</> : <><Trash2 className="w-3 h-3 mr-1" /> Desativar</>}
            </Button>
          </div>
        </div>

        {!isDisabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <MF label="Nome da Tabela" value={tableValue} field={meta.tableField} placeholder={meta.defaultTable} />
              {visibleCols.map(col => (
                <div key={col.field} className="relative group">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {col.label}
                    <span className="text-[8px] text-muted-foreground/60 italic hidden group-hover:inline">— {col.desc}</span>
                  </Label>
                  <div className="flex gap-1">
                    <Input value={(form as any)[col.field] ?? col.placeholder} onChange={e => setForm(p => ({ ...p, [col.field]: e.target.value }))}
                      className="bg-secondary h-7 text-[11px] font-mono flex-1" placeholder={col.placeholder} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => hideDefaultColumn(meta.key, col.field)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
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

            {hidden.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[9px] text-muted-foreground">Removidas (clique para restaurar):</span>
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
          </>
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
              <p className="text-xs text-muted-foreground">API v5.8 — Mapeamento Híbrido (mapping_cache.json + Direct Mapping)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="api" className="text-xs gap-1"><Globe className="w-3 h-3" /> API</TabsTrigger>
            <TabsTrigger value="database" className="text-xs gap-1"><Database className="w-3 h-3" /> Banco</TabsTrigger>
            <TabsTrigger value="scanner" className="text-xs gap-1"><Search className="w-3 h-3" /> Scanner</TabsTrigger>
            <TabsTrigger value="mapping" className="text-xs gap-1"><TableProperties className="w-3 h-3" /> Mapeamento</TabsTrigger>
            <TabsTrigger value="generate" className="text-xs gap-1"><Code className="w-3 h-3" /> Gerar</TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs gap-1"><Wifi className="w-3 h-3" /> Webhooks</TabsTrigger>
            <TabsTrigger value="cooperation" className="text-xs gap-1"><Server className="w-3 h-3" /> Coop</TabsTrigger>
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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleTestApi} disabled={testing || !form.url}
                className={`gap-2 h-8 text-xs flex-1 ${testResult === "success" ? "border-neon-green/60 text-neon-green" : testResult === "error" ? "border-neon-red/60 text-neon-red" : ""}`}>
                {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                {testing ? "Testando..." : testResult === "success" ? "API OK!" : "Testar API"}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePushMapping} disabled={!form.url} className="gap-2 h-8 text-xs border-accent/50 text-accent hover:bg-accent/10">
                <Zap className="w-3 h-3" /> Sync Mapping
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || !form.url} className="gap-2 h-8 text-xs">
                {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync Dados
              </Button>
            </div>
            {testDetails.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-1">
                {testDetails.map((d, i) => <p key={i} className="text-[10px] font-mono text-muted-foreground">{d}</p>)}
              </div>
            )}

            {/* Installation Guide - shows when API fails */}
            {testResult === "error" && (
              <div className="space-y-3">
                <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-sm font-bold text-destructive">⚠️ API não encontrada na hospedagem!</p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong className="text-foreground">O que está acontecendo:</strong> O painel tenta acessar <code className="bg-background/50 px-1 rounded">{form.url?.replace(/\/$/, "")}/api.php</code> mas o arquivo <strong>não existe</strong> no servidor.</p>
                    <p><strong className="text-foreground">Solução:</strong> Você precisa criar 2 arquivos PHP na hospedagem. Siga os passos abaixo:</p>
                  </div>
                </div>

                {/* Step-by-step */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <p className="text-sm font-bold text-foreground">📋 Passo a Passo — Instalação em 3 minutos</p>
                  
                  {/* Step 1 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>1</span>
                      <p className="text-xs font-bold text-foreground">Crie o arquivo <code className="bg-background/50 px-1 rounded text-primary">config.php</code></p>
                    </div>
                    <div className="relative">
                      <pre className="bg-background/80 border border-border/50 rounded-lg p-3 text-[10px] font-mono text-foreground overflow-x-auto max-h-40">{generateConfigPhp()}</pre>
                      <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-[10px] gap-1 bg-background/80" 
                        onClick={() => { navigator.clipboard.writeText(generateConfigPhp()); toast({ title: "✅ config.php copiado!" }); }}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>2</span>
                      <p className="text-xs font-bold text-foreground">Crie o arquivo <code className="bg-background/50 px-1 rounded text-primary">api.php</code></p>
                    </div>
                    <div className="relative">
                      <pre className="bg-background/80 border border-border/50 rounded-lg p-3 text-[10px] font-mono text-foreground overflow-x-auto max-h-60">{generateApiPhp().slice(0, 800)}...{"\n\n// (arquivo completo - clique Copiar)"}</pre>
                      <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-[10px] gap-1 bg-background/80"
                        onClick={() => { navigator.clipboard.writeText(generateApiPhp()); toast({ title: "✅ api.php copiado!", description: "Arquivo completo copiado para a área de transferência" }); }}>
                        <Copy className="w-3 h-3" /> Copiar Tudo
                      </Button>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>3</span>
                      <p className="text-xs font-bold text-foreground">Suba os 2 arquivos na hospedagem</p>
                    </div>
                    <div className="bg-background/80 border border-border/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
                      <p>📁 Acesse o <strong className="text-foreground">Gerenciador de Arquivos</strong> da hospedagem (cPanel, Hostinger, etc)</p>
                      <p>📂 Vá até a pasta <code className="bg-secondary px-1 rounded text-primary">public_html/</code> (raiz do site)</p>
                      <p>📄 Crie ou faça upload de <code className="text-primary">config.php</code> e <code className="text-primary">api.php</code></p>
                      <p>🌐 Teste acessando: <a href={`${form.url?.replace(/\/$/, "")}/api.php?action=health`} target="_blank" className="text-primary underline">{form.url?.replace(/\/$/, "")}/api.php?action=health</a></p>
                      <p>✅ Se aparecer <code className="bg-secondary px-1 rounded text-accent">{"{"}"ok":true,"version":"5.0.0"{"}"}</code> está funcionando!</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/30 p-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>4</span>
                    <p className="text-xs text-foreground">Volte aqui e clique <strong className="text-primary">Testar API</strong> novamente. Deve ficar tudo ✅</p>
                  </div>
                </div>

                {/* Quick download all */}
                <Button className="w-full gap-2 h-10 text-sm font-bold" style={{ background: "var(--gradient-primary)" }}
                  onClick={() => {
                    const files = [
                      { name: "config.php", content: generateConfigPhp() },
                      { name: "api.php", content: generateApiPhp() },
                      { name: "mapping_cache.json", content: generateMappingJson() },
                      { name: "test_api.html", content: generateTestHtml() },
                      { name: "telegram_webhook.php", content: generateTelegramWebhook() },
                      { name: "webhook_pix.php", content: generateWebhookPix() },
                    ];
                    files.forEach((f, i) => setTimeout(() => {
                      const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = f.name; a.click();
                    }, i * 300));
                    toast({ title: "📦 6 arquivos baixados!", description: "config.php + api.php + mapping_cache.json + test_api.html + telegram_webhook.php + webhook_pix.php" });
                  }}>
                  <Download className="w-4 h-4" /> Baixar Todos os Arquivos (6)
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4 mt-4">
            <div className="rounded-lg bg-accent/30 border border-accent/50 p-2">
              <p className="text-[10px] text-accent-foreground font-semibold">ℹ️ Credenciais do MySQL da hospedagem. Usadas no config.php gerado.</p>
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

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-4 mt-4">
            <div className="rounded-lg bg-gradient-to-r from-primary/10 to-chart-4/10 border border-primary/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">🔍 Scanner Completo do Banco de Dados</p>
                  <p className="text-[10px] text-muted-foreground">Mostra TODAS as tabelas, colunas, tipos e quantidade de registros do MySQL remoto.</p>
                </div>
              </div>

              <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-1">
                <p className="text-[10px] font-bold text-foreground">📋 Pré-requisitos:</p>
                <p className="text-[9px] text-muted-foreground">1. Configure a URL na aba API</p>
                <p className="text-[9px] text-muted-foreground">2. Suba o api.php v5.4 na hospedagem (aba Gerar → Baixar Todos)</p>
                <p className="text-[9px] text-muted-foreground">3. O Scanner usa o endpoint <code className="bg-background/50 px-1 rounded">?action=scan_db</code> do api.php</p>
              </div>

              <Button onClick={handleScanDatabase} disabled={scanning || !form.url}
                className="w-full gap-2 h-10 text-sm font-bold"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--chart-4)))" }}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {scanning ? "Escaneando banco de dados..." : "🔍 Escanear Banco de Dados"}
              </Button>
            </div>

            {/* Scan Results */}
            {scanResult && scanResult.ok && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="rounded-lg border border-neon-green/40 bg-neon-green/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-neon-green">✅ Banco: {scanResult.database} — {scanResult.total_tables} tabelas encontradas</p>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowScanDetails(!showScanDetails)}>
                      {showScanDetails ? "Ocultar detalhes" : "📋 Ver todas tabelas"}
                    </Button>
                  </div>

                  {/* Quick overview - all tables with row counts */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {scanResult.all_tables?.map(t => {
                      const tData = scanResult.tables?.[t];
                      const rowCount = tData?.row_count ?? 0;
                      const isDetected = Object.values(scanResult.suggestions ?? {}).some((s: any) => s?.table === t);
                      return (
                        <span key={t} className={`text-[9px] px-2 py-0.5 rounded border cursor-default ${
                          isDetected ? "border-neon-green/40 bg-neon-green/10 text-neon-green font-bold" : 
                          rowCount > 0 ? "border-primary/30 bg-primary/5 text-foreground" :
                          "border-border/30 bg-secondary text-muted-foreground"
                        }`}>
                          {t} <span className="opacity-70">({rowCount} rows, {tData?.columns?.length ?? 0} cols)</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed table view */}
                {showScanDetails && scanResult.tables && (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {Object.entries(scanResult.tables).map(([tableName, tableData]) => {
                      const isDetected = Object.entries(scanResult.suggestions ?? {}).find(([_, s]) => (s as any)?.table === tableName);
                      const detectedAs = isDetected ? isDetected[0] : null;
                      const meta = detectedAs ? TABLE_META.find(m => m.key === detectedAs) : null;
                      return (
                        <div key={tableName} className={`rounded-lg border p-3 space-y-2 ${
                          detectedAs ? "border-neon-green/30 bg-neon-green/5" : "border-border/40 bg-secondary/30"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {meta ? <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} /> : <Database className="w-3.5 h-3.5 text-muted-foreground" />}
                              <p className="text-xs font-bold text-foreground">{tableName}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                                {tableData.row_count} registros
                              </span>
                              {detectedAs && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green font-bold">
                                  → {meta?.label ?? detectedAs}
                                </span>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2 text-primary" onClick={() => {
                              // Click to use this table - fill in the closest mapping field + auto-map columns
                              const targetKey = detectedAs ?? prompt(`Usar "${tableName}" como tabela de:\n\nusuarios, depositos, saques, saldo, afiliados`);
                              if (targetKey) {
                                const field = TABLE_FIELD_MAP[targetKey];
                                if (field) {
                                  const newForm = { ...form, [field]: tableName };
                                  // Auto-map columns from scanned data
                                  const colMap = SUGGESTION_TO_FORM[targetKey];
                                  const scannedCols = tableData.columns.map(c => c.name);
                                  if (colMap) {
                                    const colKeywords: Record<string, string[]> = {
                                      id: ["id", "uid", "pk", "ID"],
                                      nome: ["name", "nome", "username", "display_name", "nickname", "login"],
                                      email: ["email", "mail", "e_mail"],
                                      telefone: ["phone", "telefone", "celular", "whatsapp", "tel", "mobile"],
                                      user_id: ["user_id", "usuario_id", "player_id", "uid", "member_id", "fk_user"],
                                      valor: ["amount", "value", "valor", "total", "deposit_amount", "withdraw_amount", "price"],
                                      pix: ["pix", "pix_key", "chave_pix", "document", "cpf", "payment_key", "payment_method"],
                                      status: ["status", "state", "situacao", "payment_status", "estado"],
                                      created_at: ["created_at", "date", "data", "timestamp", "dt_created", "created", "data_criacao"],
                                      saldo: ["balance", "saldo", "amount", "valor", "credit", "credito", "wallet_balance"],
                                      cooperation_expired: ["cooperation_expired", "expired", "expirado", "is_expired"],
                                    };
                                    for (const [colKey, formField] of Object.entries(colMap)) {
                                      const keywords = colKeywords[colKey] ?? [colKey];
                                      const found = scannedCols.find(sc => keywords.some(kw => sc.toLowerCase() === kw.toLowerCase()));
                                      if (found) (newForm as any)[formField] = found;
                                    }
                                  }
                                  setForm(newForm);
                                  const mappedCount = Object.keys(colMap ?? {}).length;
                                  toast({ title: `✅ "${tableName}" → ${targetKey}`, description: `Tabela e ${mappedCount} colunas mapeadas automaticamente. Revise no Mapeamento.` });
                                }
                              }
                            }}>
                              Usar esta tabela
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tableData.columns.map((col, ci) => (
                              <span key={ci} className={`text-[8px] px-1.5 py-0.5 rounded border font-mono ${
                                col.key === "PRI" ? "border-primary/40 bg-primary/10 text-primary font-bold" :
                                col.key === "MUL" || col.key === "UNI" ? "border-chart-4/30 bg-chart-4/5 text-chart-4" :
                                "border-border/30 bg-background/50 text-muted-foreground"
                              }`}>
                                {col.key === "PRI" ? "🔑 " : col.key === "MUL" ? "🔗 " : ""}{col.name}
                                <span className="opacity-60 ml-0.5">({col.type})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Suggestions */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-xs font-bold text-foreground">Detecção Automática</p>
                  </div>

                  {Object.entries(scanResult.suggestions ?? {}).map(([key, suggestion]) => {
                    const meta = TABLE_META.find(m => m.key === key);
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const tData = suggestion ? scanResult.tables?.[suggestion.table] : null;
                    return (
                      <div key={key} className={`rounded-lg border p-2 ${suggestion ? "border-neon-green/30 bg-neon-green/5" : "border-border/30 bg-secondary/30"}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3 h-3 ${suggestion ? "text-neon-green" : "text-muted-foreground"}`} />
                          <p className="text-[10px] font-bold text-foreground">{meta.label}</p>
                          {suggestion ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green font-bold">
                              {suggestion.table} — {tData?.row_count ?? 0} registros — {suggestion.confidence}%
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-bold">Não detectado</span>
                          )}
                        </div>
                        {suggestion && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(suggestion.columns).map(([colKey, colVal]) => (
                              <span key={colKey} className={`text-[8px] px-1 py-0.5 rounded ${colVal ? "bg-neon-green/10 text-neon-green border border-neon-green/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                                {colKey}: {colVal ?? "❌ não encontrado"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button onClick={applySuggestions} className="w-full gap-2 h-9 text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(142 70% 45%))" }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Aplicar Mapeamento Detectado
                  </Button>
                  <p className="text-[9px] text-muted-foreground text-center">Aplica as sugestões na aba Mapeamento. Depois revise e clique <strong>Salvar</strong>.</p>
                </div>
              </div>
            )}

            {scanResult && !scanResult.ok && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <p className="text-xs font-bold text-destructive">❌ Erro no escaneamento</p>
                <p className="text-[10px] text-muted-foreground">{scanResult.error}</p>
                <div className="text-[9px] text-muted-foreground space-y-1">
                  <p>Possíveis causas:</p>
                  <p>• O api.php v5.4 não está instalado na hospedagem</p>
                  <p>• O endpoint scan_db não está disponível</p>
                  <p>• A URL da plataforma está incorreta</p>
                  <p>• O servidor está offline ou bloqueando CORS</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Mapping Tab */}
          <TabsContent value="mapping" className="space-y-3 mt-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TableProperties className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Mapeamento Completo — Tabelas & Colunas</p>
              </div>
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>Configure os nomes exatos das tabelas e colunas. Use o <strong className="text-primary">Scanner</strong> para preencher automaticamente.</p>
                <p>• <strong className="text-foreground">Desativar tabela</strong> — ignora na API se não existe.</p>
                <p>• <strong className="text-foreground">+ Coluna</strong> — adiciona campo extra.</p>
                <p>• <strong className="text-foreground">✕</strong> — remove coluna que a plataforma não usa.</p>
              </div>
            </div>

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

            <div className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-2">
              <p className="text-[10px] font-bold text-foreground">💡 Preview — Query de saques</p>
              <p className="text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded">
                SELECT w.<span className="text-primary">{form.coluna_id_saque}</span>, u.<span className="text-primary">{form.coluna_nome_usuario}</span>, w.<span className="text-primary">{form.coluna_valor_saque}</span>, w.<span className="text-primary">{form.coluna_pix_saque}</span>, w.<span className="text-primary">{form.coluna_status_saque}</span>
                <br />FROM <span className="text-primary">{form.tabela_saques}</span> w
                <br />JOIN <span className="text-primary">{form.tabela_usuarios}</span> u ON w.<span className="text-primary">{form.coluna_user_id_saque}</span> = u.<span className="text-primary">{form.coluna_id_usuario}</span>
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

          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="rounded-lg bg-neon-green/5 border border-neon-green/20 p-3">
             <div className="flex items-center gap-2 mb-1">
                <Code className="w-4 h-4 text-neon-green" />
                <p className="text-xs font-bold text-foreground">Gerar Arquivos da API v5.8 — Hybrid Mapping</p>
              </div>
              <p className="text-[10px] text-muted-foreground">API lê mapping_cache.json → mude o mapeamento no painel → clique "Sync Mapping" → API usa imediatamente.</p>
              <p className="text-[10px] text-accent-foreground font-semibold mt-1">⚡ v5.8: mapping_cache.json + update_mapping + col_exists + diagnóstico de colunas</p>
            </div>

            {/* Sync mapping button */}
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs font-bold text-foreground">Sincronizar Mapeamento em Tempo Real</p>
                  <p className="text-[9px] text-muted-foreground">Envia o mapeamento atual do painel direto para o mapping_cache.json do servidor. Sem precisar baixar/subir arquivos.</p>
                </div>
              </div>
              <Button onClick={handlePushMapping} disabled={!form.url}
                className="w-full gap-2 h-9 text-sm font-bold bg-accent text-accent-foreground hover:bg-accent/90">
                <Zap className="w-4 h-4" /> Sincronizar Mapeamento → Servidor
              </Button>
            </div>

            {/* Verify API Version */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Verificar API na Hospedagem</p>
                  <p className="text-[9px] text-muted-foreground">Testa todos os endpoints e verifica a versão instalada</p>
                </div>
              </div>
              <Button onClick={handleVerifyApi} disabled={verifying || !form.url}
                className="w-full gap-2 h-10 text-sm font-bold"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--chart-4)))" }}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {verifying ? "Verificando todos os endpoints..." : "🔍 Verificar API Instalada"}
              </Button>

              {verifyResult && (
                <div className="space-y-2">
                  <div className={`rounded-lg border p-2 ${verifyResult.endpoints.every(e => e.status === "ok") ? "border-neon-green/40 bg-neon-green/5" : "border-neon-amber/40 bg-neon-amber/5"}`}>
                    <p className={`text-xs font-bold ${verifyResult.endpoints.every(e => e.status === "ok") ? "text-neon-green" : "text-neon-amber"}`}>
                      Versão detectada: v{verifyResult.version}
                    </p>
                  </div>
                  {verifyResult.endpoints.map((ep, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg border p-2 ${ep.status === "ok" ? "border-neon-green/30 bg-neon-green/5" : ep.status === "warning" ? "border-neon-amber/30 bg-neon-amber/5" : "border-destructive/30 bg-destructive/5"}`}>
                      {ep.status === "ok" ? <CheckCircle className="w-3.5 h-3.5 text-neon-green shrink-0" /> : ep.status === "warning" ? <AlertCircle className="w-3.5 h-3.5 text-neon-amber shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-foreground capitalize">{ep.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{ep.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/50 pt-3">
              <p className="text-xs font-bold text-foreground mb-2">📦 Arquivos Disponíveis</p>
            </div>

            {/* Download all button */}
            <Button variant="outline" size="sm" onClick={() => {
              const files = [
                { name: "config.php", content: generateConfigPhp() },
                { name: "api.php", content: generateApiPhp() },
                { name: "mapping_cache.json", content: generateMappingJson() },
                { name: "test_api.html", content: generateTestHtml() },
                { name: "telegram_webhook.php", content: generateTelegramWebhook() },
                { name: "webhook_pix.php", content: generateWebhookPix() },
              ];
              files.forEach((f, i) => setTimeout(() => {
                const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); URL.revokeObjectURL(url);
              }, i * 300));
              toast({ title: "📥 Baixando 6 arquivos", description: "config.php + api.php + mapping_cache.json + test_api.html + webhooks" });
            }} className="w-full gap-2 h-10 text-sm font-bold border-neon-green/30 text-neon-green hover:bg-neon-green/10"
              style={{ background: "linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 70% 45% / 0.1))" }}>
              <Download className="w-4 h-4" /> Baixar Todos (6 arquivos)
            </Button>

            {/* Individual files with separate Generate Preview / Download */}
            {[
              { name: "config.php", label: "📄 config.php", gen: generateConfigPhp, field: "config_php", type: "text/plain" },
              { name: "api.php", label: "📄 api.php — v5.8 Hybrid Mapping", gen: generateApiPhp, field: "api_php", type: "text/plain" },
              { name: "mapping_cache.json", label: "📋 mapping_cache.json — Mapeamento Dinâmico", gen: generateMappingJson, field: "mapping_json", type: "application/json" },
              { name: "test_api.html", label: "📄 test_api.html — v5.8", gen: generateTestHtml, field: "test_html", type: "text/html" },
              { name: "telegram_webhook.php", label: "📄 telegram_webhook.php", gen: generateTelegramWebhook, field: "telegram_php", type: "text/plain" },
              { name: "webhook_pix.php", label: "📄 webhook_pix.php", gen: generateWebhookPix, field: "webhook_pix_php", type: "text/plain" },
            ].map(f => {
              const isPreviewOpen = previewFiles[f.name] ?? false;
              return (
                <div key={f.name} className="space-y-2 rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">{f.label}</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setPreviewFiles(p => ({ ...p, [f.name]: !isPreviewOpen }))}>
                        <Code className="w-3 h-3" /> {isPreviewOpen ? "Esconder" : "Gerar Preview"}
                      </Button>
                      <CopyButton text={f.gen()} field={f.field} />
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 border-neon-green/30 text-neon-green hover:bg-neon-green/10" onClick={() => {
                        const blob = new Blob([f.gen()], { type: f.type }); const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); URL.revokeObjectURL(url);
                        toast({ title: `📥 ${f.name} baixado!` });
                      }}>
                        <Download className="w-3 h-3" /> Baixar
                      </Button>
                    </div>
                  </div>
                  {isPreviewOpen && (
                    <pre className="rounded-lg border border-border/50 bg-secondary/50 p-3 overflow-x-auto text-[10px] text-muted-foreground font-mono whitespace-pre max-h-60">{f.gen()}</pre>
                  )}
                </div>
              );
            })}
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
