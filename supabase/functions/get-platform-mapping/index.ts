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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: platform, error } = await supabase
      .from("plataformas")
      .select("id, nome, tabela_usuarios, tabela_depositos, tabela_saques, tabela_saldo, tabela_afiliados, coluna_id_usuario, coluna_nome_usuario, coluna_user_id_fk, coluna_valor_deposito, coluna_valor_saque, coluna_pix, coluna_status, coluna_created_at, coluna_saldo")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!platform) {
      return new Response(JSON.stringify({ ok: false, error: "Plataforma não encontrada. Verifique a api_key." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapping = {
      ok: true,
      platform_id: platform.id,
      platform_name: platform.nome,
      tables: {
        usuarios: platform.tabela_usuarios ?? "users",
        depositos: platform.tabela_depositos ?? "deposits",
        saques: platform.tabela_saques ?? "withdrawals",
        saldo: platform.tabela_saldo ?? "wallets",
        afiliados: platform.tabela_afiliados ?? "affiliates",
      },
      columns: {
        id_usuario: platform.coluna_id_usuario ?? "id",
        nome_usuario: platform.coluna_nome_usuario ?? "name",
        user_id_fk: platform.coluna_user_id_fk ?? "user_id",
        valor_deposito: platform.coluna_valor_deposito ?? "amount",
        valor_saque: platform.coluna_valor_saque ?? "amount",
        pix: platform.coluna_pix ?? "pix",
        status: platform.coluna_status ?? "status",
        created_at: platform.coluna_created_at ?? "created_at",
        saldo: platform.coluna_saldo ?? "balance",
      },
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(mapping), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
