// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Mode = "copy";

type Body = {
  mode: Mode;
  clientId?: string | null;
  topic: string;
};

const MODE_INSTRUCTIONS: Record<Mode, string> = {
  copy: `Você é um copywriter brasileiro especialista em redes sociais. Gere UMA legenda pronta para postar (máx. 4 parágrafos curtos), com gancho forte na primeira linha, desenvolvimento, e CTA claro no final. Use emojis com moderação. NÃO use listas em formato de markdown. Responda apenas com a legenda — nada de explicação ou cabeçalho.`,
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

function buildBriefingContext(b: any | null): string {
  if (!b) return "Sem briefing específico — escreva de forma genérica e profissional em português do Brasil.";

  const parts: string[] = [];
  if (b.archetype) {
    parts.push(`Arquétipo de marca: ${b.archetype}.`);
    const tone = ARCHETYPE_TONE[b.archetype as string];
    if (tone) parts.push(`Direção de linguagem: ${tone}.`);
  }
  if (b.tone_of_voice) parts.push(`Tom de voz: ${b.tone_of_voice}.`);
  if (Array.isArray(b.content_pillars) && b.content_pillars.length)
    parts.push(`Personalidade da marca: ${b.content_pillars.join(", ")}.`);
  if (Array.isArray(b.goals) && b.goals.length)
    parts.push(`Objetivo principal: ${b.goals.join(", ")}.`);
  if (b.target_audience) parts.push(`Público-alvo: ${b.target_audience}.`);
  if (Array.isArray(b.dos) && b.dos.length)
    parts.push(`SEMPRE use estas palavras/expressões: ${b.dos.join(", ")}.`);
  if (Array.isArray(b.donts) && b.donts.length)
    parts.push(`NUNCA use: ${b.donts.join(", ")}.`);
  return parts.join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const { mode, clientId, topic } = body;

    if (!topic || !topic.trim()) {
      return new Response(JSON.stringify({ error: "Informe sobre o que é o conteúdo." }), {
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

    // Briefing (se houver clientId) — usa client autenticado para respeitar RLS
    let briefing: any | null = null;
    let clientName: string | null = null;
    if (clientId) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const sb = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
      const supabase = sb.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const [{ data: bData }, { data: cData }] = await Promise.all([
        supabase
          .from("client_briefings")
          .select("tone_of_voice, target_audience, content_pillars, goals, dos, donts, archetype, palette")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
      ]);
      briefing = bData;
      clientName = cData?.name ?? null;
    }

    const briefingCtx = buildBriefingContext(briefing);
    const clientLine = clientName ? `Cliente: ${clientName}.` : "";
    const systemPrompt = `${MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.copy}\n\n${clientLine} ${briefingCtx}`.trim();

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
          { role: "user", content: `Tema/contexto: ${topic.trim()}` },
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
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione saldo na sua workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro na geração de conteúdo." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("studio-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
