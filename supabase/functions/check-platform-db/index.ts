import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      db_host, db_port, db_user, db_pass, db_name,
      // Table mapping
      tabela_usuarios = "users",
      tabela_afiliados = "affiliates",
      tabela_saldo = "wallets",
      tabela_depositos = "deposits",
      tabela_saques = "withdrawals",
      // Column mapping
      coluna_saldo = "balance",
      coluna_id_usuario = "id",
      coluna_nome_usuario = "name",
      coluna_valor_deposito = "amount",
      coluna_valor_saque = "amount",
      coluna_pix = "pix",
      coluna_status = "status",
      coluna_created_at = "created_at",
      coluna_user_id_fk = "user_id",
    } = body;

    if (!db_host || !db_user || !db_pass || !db_name) {
      return new Response(JSON.stringify({ ok: false, error: "Dados de conexão incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate dynamic api.php code based on mapping
    const apiPhpCode = generateApiPhp({
      tabela_usuarios, tabela_afiliados, tabela_saldo, tabela_depositos, tabela_saques,
      coluna_saldo, coluna_id_usuario, coluna_nome_usuario,
      coluna_valor_deposito, coluna_valor_saque, coluna_pix, coluna_status, coluna_created_at, coluna_user_id_fk,
    });

    const apiInfo = {
      ok: true,
      message: "Mapeamento dinâmico configurado. Use o api.php gerado abaixo.",
      mapping: {
        tables: { tabela_usuarios, tabela_afiliados, tabela_saldo, tabela_depositos, tabela_saques },
        columns: { coluna_saldo, coluna_id_usuario, coluna_nome_usuario, coluna_valor_deposito, coluna_valor_saque, coluna_pix, coluna_status, coluna_created_at, coluna_user_id_fk },
      },
      generated_queries: {
        stats: `SELECT COUNT(*) as total FROM ${tabela_usuarios}`,
        stats_affiliates: `SELECT COUNT(*) as total FROM ${tabela_afiliados}`,
        stats_balance: `SELECT SUM(${coluna_saldo}) as total FROM ${tabela_saldo}`,
        depositos: `SELECT u.${coluna_nome_usuario} as nome_usuario, d.${coluna_valor_deposito} as valor, d.${coluna_pix} as pix, d.${coluna_created_at} as created_at, d.${coluna_status} as status FROM ${tabela_depositos} d JOIN ${tabela_usuarios} u ON d.${coluna_user_id_fk} = u.${coluna_id_usuario} ORDER BY d.${coluna_created_at} DESC LIMIT 100`,
        saques: `SELECT u.${coluna_nome_usuario} as nome_usuario, w.${coluna_valor_saque} as valor, w.${coluna_pix} as pix, w.${coluna_created_at} as created_at, w.${coluna_status} as status, w.${coluna_id_usuario} as id FROM ${tabela_saques} w JOIN ${tabela_usuarios} u ON w.${coluna_user_id_fk} = u.${coluna_id_usuario} ORDER BY w.${coluna_created_at} DESC LIMIT 100`,
      },
      generated_api_php: apiPhpCode,
      db_config: { db_host, db_port: db_port || 3306, db_user, db_name },
    };

    return new Response(JSON.stringify(apiInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateApiPhp(m: Record<string, string>): string {
  return `<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
include 'config.php';
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) { echo json_encode(["error" => "DB connection failed"]); exit; }
$action = $_GET["action"] ?? "";

if ($action === "health") {
    echo json_encode(["status" => "ok", "timestamp" => date("c")]);
}

if ($action === "stats") {
    $users = $conn->query("SELECT COUNT(*) as total FROM ${m.tabela_usuarios}")->fetch_assoc()["total"];
    $affiliates = $conn->query("SELECT COUNT(*) as total FROM ${m.tabela_afiliados}")->fetch_assoc()["total"];
    $balance = $conn->query("SELECT SUM(${m.coluna_saldo}) as total FROM ${m.tabela_saldo}")->fetch_assoc()["total"];
    echo json_encode(["total_usuarios" => (int)$users, "total_afiliados" => (int)$affiliates, "saldo_total" => (float)$balance]);
}

if ($action === "depositos") {
    $result = $conn->query("SELECT u.${m.coluna_nome_usuario} as nome_usuario, d.${m.coluna_valor_deposito} as valor, d.${m.coluna_pix} as pix, d.${m.coluna_created_at} as created_at, d.${m.coluna_status} as status FROM ${m.tabela_depositos} d JOIN ${m.tabela_usuarios} u ON d.${m.coluna_user_id_fk} = u.${m.coluna_id_usuario} ORDER BY d.${m.coluna_created_at} DESC LIMIT 100");
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows);
}

if ($action === "saques") {
    $result = $conn->query("SELECT u.${m.coluna_nome_usuario} as nome_usuario, w.${m.coluna_valor_saque} as valor, w.${m.coluna_pix} as pix, w.${m.coluna_created_at} as created_at, w.${m.coluna_status} as status, w.id FROM ${m.tabela_saques} w JOIN ${m.tabela_usuarios} u ON w.${m.coluna_user_id_fk} = u.${m.coluna_id_usuario} ORDER BY w.${m.coluna_created_at} DESC LIMIT 100");
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    echo json_encode($rows);
}

if ($action === "aprovar_saque") {
    $id = $conn->real_escape_string($_POST["id"] ?? "");
    $conn->query("UPDATE ${m.tabela_saques} SET ${m.coluna_status}='approved' WHERE ${m.coluna_id_usuario}='$id'");
    echo json_encode(["ok" => true, "affected" => $conn->affected_rows]);
}

if ($action === "rejeitar_saque") {
    $id = $conn->real_escape_string($_POST["id"] ?? "");
    $conn->query("UPDATE ${m.tabela_saques} SET ${m.coluna_status}='rejected' WHERE ${m.coluna_id_usuario}='$id'");
    echo json_encode(["ok" => true, "affected" => $conn->affected_rows]);
}

if ($action === "remover_afiliados") {
    $conn->query("DELETE FROM ${m.tabela_afiliados} WHERE cooperation_expired = 1");
    echo json_encode(["ok" => true]);
}
?>`;
}
