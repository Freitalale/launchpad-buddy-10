import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, method, payload } = body as {
      url: string;
      method?: string;
      payload?: any;
    };

    if (!url) {
      return new Response(
        JSON.stringify({ ok: false, error: "URL obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[api-proxy] ${method ?? "GET"} ${url}`);

    const fetchOptions: RequestInit = {
      method: method ?? "GET",
      headers: { "Accept": "application/json" },
    };

    if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
      if (typeof payload === "object") {
        const fd = new FormData();
        for (const [k, v] of Object.entries(payload)) {
          fd.append(k, String(v));
        }
        fetchOptions.body = fd;
      } else {
        fetchOptions.body = String(payload);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchOptions.signal = controller.signal;

    const res = await fetch(url, fetchOptions);
    clearTimeout(timeout);

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error(`[api-proxy] Error:`, e.message);
    const isTimeout = e.name === "AbortError";
    return new Response(
      JSON.stringify({
        ok: false,
        status: 0,
        error: isTimeout ? "Timeout — servidor não respondeu em 15s" : e.message,
        type: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
