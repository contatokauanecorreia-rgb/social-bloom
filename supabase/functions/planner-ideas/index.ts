const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARCHETYPE_TONE: Record<string, string> = {
  inocente: "linguagem acolhedora, otimista e sem pressão",
  cuidador: "linguagem acolhedora, empática e sem pressão",
  heroi: "linguagem provocadora, desafiadora e motivacional",
  "fora-da-lei": "linguagem provocadora, disruptiva e direta",
  sabio: "linguagem de autoridade, premium e fundamentada",
  governante: "linguagem de autoridade, sofisticada e premium",
  bobo: "linguagem leve, próxima e com bom humor",
  "cara-comum": "linguagem leve, próxima e cotidiana",
  explorador: "linguagem aventureira, curiosa e independente",
  amante: "linguagem sensual, íntima e emocional",
  mago: "linguagem visionária, transformadora e inspiradora",
  criador: "linguagem criativa, imaginativa e original",
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_PUBLISHABLE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const supabase = sb.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const [{ data: briefing }, { data: client }] = await Promise.all([
      supabase
        .from("client_briefings")
        .select("archetype, tone_of_voice, target_audience, content_pillars, business_description")
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
    ]);

    const parts: string[] = [];
    if (client?.name) parts.push(`Cliente: ${client.name}.`);
    if (briefing?.business_description) parts.push(`Negócio: ${briefing.business_description}.`);
    if (briefing?.archetype) {
      parts.push(`Arquétipo: ${briefing.archetype}.`);
      const tone = ARCHETYPE_TONE[briefing.archetype as string];
      if (tone) parts.push(`Tom de linguagem: ${tone}.`);
    }
    if (briefing?.tone_of_voice) parts.push(`Tom de voz: ${briefing.tone_of_voice}.`);
    if (briefing?.target_audience) parts.push(`Público-alvo: ${briefing.target_audience}.`);
    if (Array.isArray(briefing?.content_pillars) && briefing.content_pillars.length)
      parts.push(`Pilares de conteúdo: ${(briefing.content_pillars as string[]).join(", ")}.`);

    const context = parts.length > 0 ? parts.join(" ") + " " : "";

    const systemPrompt =
      `Você é um estrategista de conteúdo brasileiro especialista em redes sociais. ` +
      context +
      `Gere exatamente 5 ideias de post para este cliente. Cada ideia deve ter:\n` +
      `- "title": título curto e direto para o post (máx. 80 caracteres)\n` +
      `- "description": descrição curta explicando o ângulo do conteúdo (máx. 150 caracteres)\n\n` +
      `Responda APENAS com um array JSON válido, sem markdown, sem explicação, sem código. ` +
      `Formato exato: [{"title":"...","description":"..."},{"title":"...","description":"..."}]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere as 5 ideias agora." },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar ideias." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "[]";

    let ideas: { title: string; description: string }[] = [];
    try {
      const clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);
      ideas = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      console.error("Failed to parse ideas JSON:", raw);
      return new Response(JSON.stringify({ error: "Falha ao interpretar resposta da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
