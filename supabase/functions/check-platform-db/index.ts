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
    const { db_host, db_port, db_user, db_pass, db_name, tabela_usuarios, tabela_afiliados, tabela_saldo, coluna_saldo } = await req.json();

    if (!db_host || !db_user || !db_pass || !db_name) {
      return new Response(JSON.stringify({ ok: false, error: "Dados de conexão incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return API endpoint info for the platform to implement
    // This edge function serves as a proxy pattern reference
    const apiInfo = {
      ok: true,
      message: "Para conectar ao banco MySQL externo, configure a API na hospedagem da plataforma.",
      required_endpoints: [
        {
          method: "GET",
          path: "/api/stats",
          description: "Retorna total_usuarios, total_afiliados, saldo_total",
          response: { total_usuarios: 0, total_afiliados: 0, saldo_total: 0 }
        },
        {
          method: "GET", 
          path: "/api/depositos",
          description: "Lista depósitos recentes",
          response: [{ nome_usuario: "", valor: 0, pix: "", created_at: "", status: "pendente" }]
        },
        {
          method: "GET",
          path: "/api/saques",
          description: "Lista saques pendentes",
          response: [{ nome_usuario: "", valor: 0, pix: "", created_at: "", status: "pendente" }]
        },
        {
          method: "POST",
          path: "/api/saques/:id/aprovar",
          description: "Aprova um saque"
        },
        {
          method: "POST",
          path: "/api/saques/:id/rejeitar",
          description: "Rejeita um saque"
        }
      ],
      db_config: { db_host, db_port: db_port || 3306, db_user, db_name, tabela_usuarios: tabela_usuarios || "users", tabela_afiliados: tabela_afiliados || "affiliates", tabela_saldo: tabela_saldo || "wallets", coluna_saldo: coluna_saldo || "balance" }
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
