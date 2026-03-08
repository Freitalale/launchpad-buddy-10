import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Keywords for auto-detection
const USER_TABLE_HINTS = ["user", "usuario", "player", "member", "cliente", "account", "jogador"];
const DEPOSIT_TABLE_HINTS = ["deposit", "deposito", "payment", "pagamento", "transaction", "transacao", "recarga", "charge"];
const WITHDRAWAL_TABLE_HINTS = ["withdraw", "saque", "cashout", "payout", "retirada"];
const WALLET_TABLE_HINTS = ["wallet", "saldo", "balance", "carteira", "account_balance", "conta"];
const AFFILIATE_TABLE_HINTS = ["affiliate", "afiliado", "referral", "parceiro", "partner", "indicacao"];

const USER_COL_HINTS: Record<string, string[]> = {
  id: ["id", "user_id", "player_id", "uid", "member_id", "cliente_id"],
  nome: ["name", "nome", "username", "user_name", "full_name", "display_name", "nick", "nickname", "player_name"],
  email: ["email", "e_mail", "mail", "correo"],
  telefone: ["phone", "telefone", "tel", "celular", "mobile", "whatsapp", "fone"],
};

const DEPOSIT_COL_HINTS: Record<string, string[]> = {
  id: ["id", "deposit_id", "transaction_id", "payment_id"],
  user_id: ["user_id", "player_id", "uid", "member_id", "cliente_id", "account_id", "fk_user"],
  valor: ["amount", "value", "valor", "total", "deposit_amount", "payment_amount", "quantia"],
  pix: ["pix", "pix_key", "chave_pix", "payment_method", "metodo", "payment_key", "key_pix"],
  status: ["status", "state", "situacao", "payment_status", "deposit_status"],
  created_at: ["created_at", "date", "data", "created", "timestamp", "dt_created", "data_criacao", "payment_date", "deposit_date"],
};

const WITHDRAWAL_COL_HINTS: Record<string, string[]> = {
  id: ["id", "withdrawal_id", "saque_id", "cashout_id", "payout_id"],
  user_id: ["user_id", "player_id", "uid", "member_id", "cliente_id", "account_id", "fk_user"],
  valor: ["amount", "value", "valor", "total", "withdraw_amount", "saque_valor", "quantia"],
  pix: ["pix", "pix_key", "chave_pix", "wallet_address", "payment_key", "key_pix", "conta_destino"],
  status: ["status", "state", "situacao", "withdrawal_status", "saque_status"],
  created_at: ["created_at", "date", "data", "created", "timestamp", "dt_created", "data_criacao", "withdrawal_date", "saque_date"],
};

const WALLET_COL_HINTS: Record<string, string[]> = {
  user_id: ["user_id", "player_id", "uid", "member_id", "cliente_id", "account_id", "fk_user"],
  saldo: ["balance", "saldo", "amount", "valor", "available", "disponivel", "total"],
};

const AFFILIATE_COL_HINTS: Record<string, string[]> = {
  id: ["id", "affiliate_id", "afiliado_id", "referral_id"],
  nome: ["name", "nome", "username", "affiliate_name"],
  user_id: ["user_id", "player_id", "uid", "member_id", "referred_by", "fk_user"],
  cooperation_expired: ["cooperation_expired", "expired", "expirado", "ativo", "active", "is_active", "status"],
};

function matchTable(tableName: string, hints: string[]): number {
  const lower = tableName.toLowerCase();
  let score = 0;
  for (const hint of hints) {
    if (lower === hint) score += 10;
    else if (lower.includes(hint)) score += 5;
    else if (lower.startsWith(hint) || lower.endsWith(hint)) score += 3;
  }
  return score;
}

function matchColumn(columns: string[], hints: string[]): string | null {
  // Exact match first
  for (const hint of hints) {
    const exact = columns.find(c => c.toLowerCase() === hint);
    if (exact) return exact;
  }
  // Partial match
  for (const hint of hints) {
    const partial = columns.find(c => c.toLowerCase().includes(hint));
    if (partial) return partial;
  }
  return null;
}

function detectColumns(columns: string[], hintMap: Record<string, string[]>): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [key, hints] of Object.entries(hintMap)) {
    result[key] = matchColumn(columns, hints);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_url } = await req.json();

    if (!api_url) {
      return new Response(JSON.stringify({ ok: false, error: "api_url é obrigatório (URL onde está o api.php)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = api_url.replace(/\/$/, "").replace(/\/api\.php$/, "") + "/api.php";

    // Call ?action=scan_db on the remote api.php
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${baseUrl}?action=scan_db`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `API retornou HTTP ${res.status}. Certifique-se de que o api.php v4.0 está instalado com o endpoint scan_db.` 
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scanData = await res.json();
    
    if (scanData.error) {
      return new Response(JSON.stringify({ ok: false, error: scanData.error }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tables: Record<string, { columns: { name: string; type: string }[] }> = scanData.tables ?? {};
    const tableNames = Object.keys(tables);

    // Auto-detect best matches
    const scored: Record<string, { table: string; score: number; columns: Record<string, string | null> }[]> = {
      usuarios: [],
      depositos: [],
      saques: [],
      saldo: [],
      afiliados: [],
    };

    const hintMaps: Record<string, { tableHints: string[]; colHints: Record<string, string[]> }> = {
      usuarios: { tableHints: USER_TABLE_HINTS, colHints: USER_COL_HINTS },
      depositos: { tableHints: DEPOSIT_TABLE_HINTS, colHints: DEPOSIT_COL_HINTS },
      saques: { tableHints: WITHDRAWAL_TABLE_HINTS, colHints: WITHDRAWAL_COL_HINTS },
      saldo: { tableHints: WALLET_TABLE_HINTS, colHints: WALLET_COL_HINTS },
      afiliados: { tableHints: AFFILIATE_TABLE_HINTS, colHints: AFFILIATE_COL_HINTS },
    };

    for (const tableName of tableNames) {
      const colNames = tables[tableName].columns.map(c => c.name);

      for (const [category, { tableHints, colHints }] of Object.entries(hintMaps)) {
        const tableScore = matchTable(tableName, tableHints);
        // Also check column presence to boost score
        const detectedCols = detectColumns(colNames, colHints);
        const colMatchCount = Object.values(detectedCols).filter(v => v !== null).length;
        const totalScore = tableScore + colMatchCount * 2;

        if (totalScore > 0) {
          scored[category].push({
            table: tableName,
            score: totalScore,
            columns: detectedCols,
          });
        }
      }
    }

    // Pick best match for each
    const suggestions: Record<string, { table: string; confidence: number; columns: Record<string, string | null> } | null> = {};
    const usedTables = new Set<string>();

    // Sort each category by score descending and pick best non-duplicate
    for (const category of ["usuarios", "depositos", "saques", "saldo", "afiliados"]) {
      scored[category].sort((a, b) => b.score - a.score);
      const best = scored[category].find(s => !usedTables.has(s.table));
      if (best && best.score >= 3) {
        suggestions[category] = {
          table: best.table,
          confidence: Math.min(100, Math.round((best.score / 20) * 100)),
          columns: best.columns,
        };
        usedTables.add(best.table);
      } else {
        suggestions[category] = null;
      }
    }

    const result = {
      ok: true,
      database: scanData.database ?? "unknown",
      total_tables: tableNames.length,
      tables: Object.fromEntries(
        tableNames.map(t => [t, {
          columns: tables[t].columns,
          row_count: tables[t].columns.length,
        }])
      ),
      all_tables: tableNames,
      suggestions,
      scan_time: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    const msg = error.name === "AbortError" ? "Timeout ao conectar na API (10s)" : error.message;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
