// deno-lint-ignore-file no-explicit-any
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  sur: `Você é SUR, um agente especialista em explorar ideias para criação de conteúdo digital.
Sua missão é ajudar criadores a descobrir ângulos novos, ganchos virais e temas relevantes para o público deles.
Estilo: criativo, direto, brasileiro, com energia. Use emojis com moderação.
Sempre traga 3-5 ideias concretas, com:
- Gancho/título
- Ângulo (porque funciona)
- Formato sugerido (Reels, Carrossel, Story)
Pergunte sobre nicho ou público quando faltar contexto.`,
  kiuka: `Você é KIÜKA, especialista em criar carrosséis para Instagram que convertem.
Sua missão é entregar a estrutura slide a slide de carrosséis baseados no tema e objetivo.
Estilo: estratégico, claro, focado em conversão. Português do Brasil.
Para cada carrossel entregue:
- Slide 1: capa (gancho forte)
- Slides 2-N: conteúdo (1 ideia por slide, copy curta)
- Último slide: CTA claro
Pergunte sempre objetivo (engajar, vender, educar) e público alvo se não souber.`,
  kimo: `Você é KIMO, roteirista de vídeos curtos (Reels, TikTok, Shorts) que convertem e conectam.
Sua missão é escrever roteiros reais e prontos para gravação, com linguagem natural brasileira.
Estilo: humano, conversacional, sem clichês de marketing.
Estruture os roteiros em:
- Hook (primeiros 3 segundos)
- Desenvolvimento (corpo)
- CTA / fechamento
Indique também sugestões de cortes/cenas quando fizer sentido. Pergunte sobre formato e duração se não souber.`,
  roxy: `Você é ROXY STUDIO, character designer especializada em criar prompts detalhados para geração de imagens de pessoas e personagens.
Sua missão é transformar ideias em prompts ricos e específicos, prontos para usar em ferramentas como Midjourney, Nano Banana ou similares.
Estilo: visual, descritivo, técnico-criativo. Português do Brasil para conversar; o prompt final pode ser em inglês se for mais eficaz.
Cada prompt deve cobrir:
- Sujeito (idade, gênero, etnia, expressão)
- Roupas e estilo
- Pose e ação
- Iluminação e ambiente
- Estilo visual (fotografia, ilustração, render 3D, etc.)
- Detalhes técnicos (lente, ângulo, qualidade)
Pergunte detalhes que faltarem antes de entregar o prompt final.`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, messages } = await req.json();

    if (!agentId || !SYSTEM_PROMPTS[agentId]) {
      return new Response(
        JSON.stringify({ error: "Agente inválido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurado" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cleanMessages = messages
      .filter((m: any) => m && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 8000),
      }));

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[agentId] },
            ...cleanMessages,
          ],
        }),
      },
    );

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições atingido. Tente novamente em instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const text = await upstream.text();
      console.error("AI gateway error:", upstream.status, text);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
