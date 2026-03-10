import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gateway_key, amount, pix_key, pix_type, description, gateway_endpoint } = await req.json();

    if (!gateway_key || amount === undefined || amount === null || !pix_key) {
      return new Response(JSON.stringify({ success: false, error: "Parâmetros obrigatórios: gateway_key, amount, pix_key" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default PixUP endpoint
    const endpoint = gateway_endpoint || "https://api.pixup.com.br/v2/pix/payment";

    const body = {
      amount: Number(amount),
      pix_key: pix_key,
      pix_type: pix_type || "cpf",
      description: description || "Saque aprovado via painel",
    };

    console.log(`[pix-payout] Enviando pagamento: R$ ${amount} → ${pix_key}`);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gateway_key}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ error: "Resposta inválida" }));

    if (res.ok && (data.success || data.status === "approved" || data.status === "processing")) {
      console.log(`[pix-payout] ✅ Pagamento enviado com sucesso`);
      return new Response(JSON.stringify({
        success: true,
        transaction_id: data.id || data.transaction_id || null,
        status: data.status || "processing",
        raw: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error(`[pix-payout] ❌ Falha:`, data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || `HTTP ${res.status}`,
        raw: data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.error(`[pix-payout] Erro:`, e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
