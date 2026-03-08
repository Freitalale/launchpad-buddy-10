import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("api_key");

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "api_key é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: p, error } = await supabase
      .from("plataformas")
      .select("*")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!p) {
      return new Response(JSON.stringify({ ok: false, error: "Plataforma não encontrada." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse extras
    const extra = p.mapeamento_extra ?? {};
    const extraCols = extra.colunas_extra ?? {};
    const extraTables = extra.tabelas_extra ?? [];
    const hiddenCols = extra.colunas_ocultas ?? {};
    const disabledTables: string[] = extra.tabelas_desativadas ?? [];

    // Build per-table column mappings (include extras, exclude hidden)
    const buildColumns = (tableKey: string, defaults: Record<string, string>) => {
      const hidden = hiddenCols[tableKey] ?? [];
      const result: Record<string, string> = {};
      
      // Add defaults (skip hidden by checking if field name is in hidden list)
      for (const [key, value] of Object.entries(defaults)) {
        // hidden stores field names like "coluna_email_usuario", we need to check
        const isHidden = hidden.some((h: string) => h.includes(key) || h === `coluna_${key}`);
        if (!isHidden) {
          result[key] = value;
        }
      }

      // Add extras
      const tableExtras = extraCols[tableKey] ?? [];
      for (const ec of tableExtras) {
        if (ec.label && ec.column) {
          result[ec.label] = ec.column;
        }
      }

      return result;
    };

    // Build extra tables mapping
    const extraTablesMapping: Record<string, { table_name: string; columns: Record<string, string> }> = {};
    for (const et of extraTables) {
      if (et.tableName) {
        const cols: Record<string, string> = {};
        for (const col of (et.columns ?? [])) {
          if (col.label && col.column) {
            cols[col.label] = col.column;
          }
        }
        extraTablesMapping[et.key] = { table_name: et.tableName, columns: cols };
      }
    }

    const mapping = {
      ok: true,
      platform_id: p.id,
      platform_name: p.nome,
      tables: {
        usuarios: p.tabela_usuarios ?? "users",
        depositos: p.tabela_depositos ?? "deposits",
        saques: p.tabela_saques ?? "withdrawals",
        saldo: p.tabela_saldo ?? "wallets",
        afiliados: p.tabela_afiliados ?? "affiliates",
      },
      columns: {
        usuarios: buildColumns("usuarios", {
          id: p.coluna_id_usuario ?? "id",
          nome: p.coluna_nome_usuario ?? "name",
          email: p.coluna_email_usuario ?? "email",
          telefone: p.coluna_telefone_usuario ?? "phone",
        }),
        depositos: buildColumns("depositos", {
          id: p.coluna_id_deposito ?? "id",
          user_id: p.coluna_user_id_deposito ?? p.coluna_user_id_fk ?? "user_id",
          valor: p.coluna_valor_deposito ?? "amount",
          pix: p.coluna_pix_deposito ?? p.coluna_pix ?? "pix",
          status: p.coluna_status_deposito ?? p.coluna_status ?? "status",
          created_at: p.coluna_created_at_deposito ?? p.coluna_created_at ?? "created_at",
        }),
        saques: buildColumns("saques", {
          id: p.coluna_id_saque ?? "id",
          user_id: p.coluna_user_id_saque ?? p.coluna_user_id_fk ?? "user_id",
          valor: p.coluna_valor_saque ?? "amount",
          pix: p.coluna_pix_saque ?? p.coluna_pix ?? "pix",
          status: p.coluna_status_saque ?? p.coluna_status ?? "status",
          created_at: p.coluna_created_at_saque ?? p.coluna_created_at ?? "created_at",
        }),
        saldo: buildColumns("saldo", {
          user_id: p.coluna_user_id_saldo ?? "user_id",
          saldo: p.coluna_saldo ?? "balance",
        }),
        afiliados: buildColumns("afiliados", {
          id: p.coluna_id_afiliado ?? "id",
          nome: p.coluna_nome_afiliado ?? "name",
          user_id: p.coluna_user_id_afiliado ?? "user_id",
          cooperation_expired: p.coluna_cooperation_expired ?? "cooperation_expired",
        }),
      },
      extra_tables: extraTablesMapping,
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(mapping), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
