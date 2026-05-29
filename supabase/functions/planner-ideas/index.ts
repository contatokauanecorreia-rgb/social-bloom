import { callClaudeTool } from "../_shared/claude.ts";
import { loadClientDNA } from "../_shared/client-dna.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_PUBLISHABLE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const supabase = sb.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const dna = await loadClientDNA(supabase, clientId);

    const systemPrompt =
      `Você é um estrategista de conteúdo brasileiro especialista em redes sociais. ` +
      `Use o DNA da marca abaixo para criar ideias específicas para o nicho do cliente — ` +
      `nada genérico, nada copy-paste.\n\n${dna.prompt}\n\n` +
      `Gere exatamente 5 ideias de post originais e alinhadas ao nicho, tom e objetivos do cliente.`;

    const res = await callClaudeTool<{ ideas: { title: string; description: string }[] }>({
      system: systemPrompt,
      user: "Gere as 5 ideias agora.",
      maxTokens: 2048,
      temperature: 0.8,
      tool: {
        name: "emit_ideas",
        description: "Retorna 5 ideias de post.",
        input_schema: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título curto e direto (máx. 80 caracteres)" },
                  description: { type: "string", description: "Ângulo do conteúdo (máx. 150 caracteres)" },
                },
                required: ["title", "description"],
              },
            },
          },
          required: ["ideas"],
        },
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: res.error }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ideas = Array.isArray(res.data?.ideas) ? res.data.ideas.slice(0, 5) : [];
    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("planner-ideas error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
