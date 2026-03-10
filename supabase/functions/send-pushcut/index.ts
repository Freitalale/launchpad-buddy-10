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
    const { pushcut_url, title, text, api_key } = await req.json();

    if (!pushcut_url) {
      return new Response(JSON.stringify({ ok: false, error: "pushcut_url é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // If an API key is provided, add it as Authorization header
    if (api_key) {
      headers["API-Key"] = api_key;
    }

    console.log(`[send-pushcut] Enviando para ${pushcut_url} — title: "${title}"`);

    const res = await fetch(pushcut_url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: title || "📢 Notificação",
        text: text || "",
      }),
    });

    const responseText = await res.text();
    const ok = res.ok || res.status === 204;

    console.log(`[send-pushcut] ${ok ? "✅" : "❌"} HTTP ${res.status} — ${responseText.slice(0, 200)}`);

    return new Response(JSON.stringify({
      ok,
      status: res.status,
      response: responseText.slice(0, 500),
      error: ok ? null : `HTTP ${res.status}: ${responseText.slice(0, 200)}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[send-pushcut] Erro:`, error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
