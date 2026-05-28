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

const FORMAT_LABEL: Record<string, string> = {
  carrossel: "Carrossel 4:5 (Instagram feed)",
  quadrado: "Post quadrado 1:1 (Instagram feed)",
  stories: "Stories 9:16 (Instagram/Reels vertical)",
};

type SlideIn = { title?: string; subtitle?: string; body?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clientId, format, slides } = (await req.json()) as {
      clientId?: string;
      format?: string;
      slides?: SlideIn[];
    };

    if (!Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos 1 slide." }), {
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

    let contextParts: string[] = [];
    if (clientId) {
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
      if (client?.name) contextParts.push(`Cliente: ${client.name}.`);
      if (briefing?.business_description) contextParts.push(`Negócio: ${briefing.business_description}.`);
      if (briefing?.archetype) {
        contextParts.push(`Arquétipo: ${briefing.archetype}.`);
        const tone = ARCHETYPE_TONE[briefing.archetype as string];
        if (tone) contextParts.push(`Tom: ${tone}.`);
      }
      if (briefing?.tone_of_voice) contextParts.push(`Tom de voz: ${briefing.tone_of_voice}.`);
      if (briefing?.target_audience) contextParts.push(`Público: ${briefing.target_audience}.`);
      if (Array.isArray(briefing?.content_pillars) && briefing.content_pillars.length)
        contextParts.push(`Pilares: ${(briefing.content_pillars as string[]).join(", ")}.`);
    }

    const slidesText = slides
      .map((s, i) => {
        const parts = [
          s.title ? `Título: ${s.title}` : null,
          s.subtitle ? `Subtítulo: ${s.subtitle}` : null,
          s.body ? `Corpo: ${s.body}` : null,
        ].filter(Boolean);
        return `Slide ${i + 1}:\n${parts.join("\n") || "(vazio)"}`;
      })
      .join("\n\n");

    const formatLabel = FORMAT_LABEL[format ?? "carrossel"] ?? "Post de Instagram";

    const systemPrompt =
      `Você é um estrategista sênior de social media brasileiro. ` +
      `Avalie o potencial de performance de um post para Instagram considerando formato, tom, nicho do cliente e melhor horário de publicação. ` +
      (contextParts.length ? `Contexto do cliente: ${contextParts.join(" ")} ` : "") +
      `Formato escolhido: ${formatLabel}. ` +
      `Devolva um score de 1 a 10 (inteiro), explicação curta, melhor janela de horário sugerida (ex: "terça e quinta, 19h–21h"), ` +
      `3 pontos fortes do conteúdo e 3 sugestões de melhoria. Seja específico ao conteúdo, não genérico.`;

    const userPrompt = `Analise estes slides:\n\n${slidesText}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_score",
              description: "Retorna o score preditivo do post.",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "integer", minimum: 1, maximum: 10 },
                  summary: { type: "string", description: "Justificativa curta (1-2 frases)." },
                  bestTime: { type: "string", description: "Janela de horário sugerida em PT-BR." },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3,
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["score", "summary", "bestTime", "strengths", "improvements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_score" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar o post." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw: string = toolCall?.function?.arguments ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(argsRaw);
    } catch {
      console.error("Failed to parse tool args:", argsRaw);
      return new Response(JSON.stringify({ error: "Falha ao interpretar resposta da IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("carrossel-score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
