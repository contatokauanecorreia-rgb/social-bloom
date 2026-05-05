// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ImageMode = "none" | "bg" | "grid" | "mixed";

type Body = {
  clientId?: string | null;
  topic: string;
  slideCount: number;
  imageMode: ImageMode;
  aiImages: boolean;
  fontPair?: { heading: string; body: string } | null;
  palette?: string[];
  instagram?: string | null;
  textOnly?: boolean;
  referenceImageDataUrl?: string | null;
  alignment?: "left" | "center" | "right";
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

function buildBriefingContext(b: any | null, clientName: string | null) {
  const parts: string[] = [];
  if (clientName) parts.push(`Cliente: ${clientName}.`);
  if (!b) {
    parts.push("Sem briefing específico — escreva de forma profissional em português do Brasil.");
    return parts.join(" ");
  }
  if (b.archetype) {
    parts.push(`Arquétipo de marca: ${b.archetype}.`);
    const tone = ARCHETYPE_TONE[b.archetype as string];
    if (tone) parts.push(`Direção de linguagem: ${tone}.`);
  }
  if (b.tone_of_voice) parts.push(`Tom de voz: ${b.tone_of_voice}.`);
  if (Array.isArray(b.content_pillars) && b.content_pillars.length)
    parts.push(`Pilares: ${b.content_pillars.join(", ")}.`);
  if (Array.isArray(b.goals) && b.goals.length)
    parts.push(`Objetivo: ${b.goals.join(", ")}.`);
  if (b.target_audience) parts.push(`Público: ${b.target_audience}.`);
  if (Array.isArray(b.dos) && b.dos.length)
    parts.push(`SEMPRE use: ${b.dos.join(", ")}.`);
  if (Array.isArray(b.donts) && b.donts.length)
    parts.push(`NUNCA use: ${b.donts.join(", ")}.`);
  return parts.join(" ");
}

async function callAI(payload: unknown, apiKey: string) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function fallbackSlides(topic: string, clientName: string | null, n: number) {
  const who = clientName ? ` para ${clientName}` : "";
  const base = [
    { title: topic.slice(0, 40) || "Tema", subtitle: "", body: `Conteúdo${who} sobre ${topic}.` },
    { title: "Por que importa", subtitle: "", body: `O que ${topic} muda no dia a dia.` },
    { title: "Como aplicar", subtitle: "", body: `3 passos práticos para começar agora.` },
    { title: "Erros comuns", subtitle: "", body: `O que evitar ao tratar de ${topic}.` },
    { title: "Próximo passo", subtitle: "CTA", body: `Salve este post e compartilhe${who}.` },
  ];
  const out = base.slice(0, Math.max(1, n)).map((s) => ({
    ...s,
    imagePrompt: topic,
    imageDataUrl: null as string | null,
  }));
  while (out.length < n) {
    out.push({ title: "", subtitle: "", body: "", imagePrompt: topic, imageDataUrl: null });
  }
  return out;
}

function aiErrorResponse(status: number) {
  if (status === 429)
    return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (status === 402)
    return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione saldo na sua workspace." }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  return new Response(JSON.stringify({ error: "Erro na geração de conteúdo." }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  let topicForFallback = "";
  let clientNameForFallback: string | null = null;
  let slideCountForFallback = 5;
  try {
    const body = (await req.json()) as Body;
    const { clientId, topic, imageMode, aiImages, instagram, textOnly, referenceImageDataUrl } = body;
    const slideCount = Math.max(1, Math.min(10, Number(body.slideCount) || 5));
    topicForFallback = topic ?? "";
    slideCountForFallback = slideCount;
    console.log("[carrossel-generate] start", {
      slideCount,
      imageMode,
      aiImages,
      textOnly: !!textOnly,
      hasReference: !!referenceImageDataUrl,
      hasClient: !!clientId,
      topicLen: (topic ?? "").length,
    });

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

    let briefing: any | null = null;
    let clientName: string | null = null;
    let segment: string | null = null;
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
        supabase.from("clients").select("name, company").eq("id", clientId).maybeSingle(),
      ]);
      briefing = bData;
      clientName = cData?.name ?? null;
      clientNameForFallback = clientName;
      segment = cData?.company ?? null;
    }

    const briefingCtx = buildBriefingContext(briefing, clientName);
    void briefingCtx;

    const NOME_CLIENTE = clientName ?? "—";
    const SEGMENTO = segment ?? "—";
    const TOM_VOZ = briefing?.tone_of_voice ?? "—";
    const ARQUETIPO = briefing?.archetype ?? "—";
    const PUBLICO = briefing?.target_audience ?? "—";
    const OBJETIVO = Array.isArray(briefing?.goals) && briefing.goals.length ? briefing.goals.join(", ") : "—";
    const PALAVRAS_CHAVE = Array.isArray(briefing?.dos) && briefing.dos.length ? briefing.dos.join(", ") : "—";
    const PALAVRAS_PROIBIDAS = Array.isArray(briefing?.donts) && briefing.donts.length ? briefing.donts.join(", ") : "—";
    const CORES = Array.isArray(briefing?.palette) && briefing.palette.length ? briefing.palette.join(", ") : "—";
    const TEMA = topic.trim();
    const N = slideCount;
    const DESCRICAO_REFERENCIA = referenceImageDataUrl
      ? "imagem de referência anexada na mensagem do usuário — observe paleta, tipografia, layout, densidade de texto e estilo visual"
      : "nenhuma";
    const ESTILO_IMAGENS = "editorial, instagram feed aesthetic, soft natural lighting, vertical 4:5";

    const systemPrompt = `Você é um Consultor Criativo Estratégico e Especialista em Copywriting de Alta Conversão para Instagram.

Você combina dois superpoderes: 1. Pensamento estratégico — analisa ângulos, dores reais e potencial viral antes de criar 2. Copywriting de conversão — executa com precisão, sem genericidade, sem bullet points, sem conteúdo fraco

Você nunca soa como IA. Você nunca produz conteúdo genérico. Você pensa antes de criar. Você escreve para converter.

---

CONTEXTO DO CLIENTE:
- Nome: ${NOME_CLIENTE}
- Segmento: ${SEGMENTO}
- Tom de voz: ${TOM_VOZ}
- Arquétipo: ${ARQUETIPO}
- Público-alvo: ${PUBLICO}
- Objetivo: ${OBJETIVO}
- Palavras que usa: ${PALAVRAS_CHAVE}
- Palavras proibidas: ${PALAVRAS_PROIBIDAS}
- Paleta de cores: ${CORES}

TEMA DO CARROSSEL: ${TEMA}
NÚMERO DE SLIDES: ${N}
REFERÊNCIA VISUAL ANALISADA: ${DESCRICAO_REFERENCIA}
ESTILO DAS IMAGENS: ${ESTILO_IMAGENS}

---

PROCESSO INTERNO OBRIGATÓRIO (nunca mostre ao usuário):

Etapa 1 — Análise estratégica: Antes de escrever qualquer slide, analise:
- Qual ângulo tem maior potencial viral: emocional, educativo ou controverso?
- Qual a dor real e oculta do público ${PUBLICO} sobre esse tema?
- Qual o gancho mais forte para parar o scroll?
- Como o arquétipo ${ARQUETIPO} e o tom ${TOM_VOZ} moldam o tratamento do tema?
- Se há referência visual, como o estilo dela influencia a narrativa?
Use essa análise para criar conteúdo superior. Nunca a revele.

Etapa 2 — Execução dos slides:

Slide 1 — Hook de retenção extrema: Máximo 7 palavras no título. Deve gerar curiosidade intensa, identificação imediata ou polêmica controlada. Nenhum slide 1 fraco é aceito.

Slides 2 até ${N - 1} — Desenvolvimento estratégico: Siga essa progressão narrativa:
- Dor real e tensão (o problema que o público vive)
- Agitação (por que isso é pior do que parece)
- Padrão de mercado (o que todo mundo faz de errado)
- Curiosidade e insight (o que poucos sabem)
- Solução e virada (o caminho real)
1 ideia central por slide. Texto contínuo — sem bullet points, sem listas, sem emojis, sem hífens.

Slide ${N - 1} — Pré-CTA: Consolide o insight principal. Prepare emocionalmente para a ação.

Slide ${N} — CTA de ativação: CTA clara alinhada ao objetivo ${OBJETIVO}. Natural, sem soar forçado. Deve gerar ação imediata.

---

REGRAS ABSOLUTAS:
- 100% em português do Brasil
- Zero bullet points
- Zero listas numeradas
- Zero emojis
- Zero hífens decorativos
- Zero conteúdo genérico
- Use naturalmente: ${PALAVRAS_CHAVE}
- NUNCA use: ${PALAVRAS_PROIBIDAS}
- Tom obrigatório: ${TOM_VOZ}
- Fluxo narrativo: Atenção → Conexão → Desejo → Ação (nunca mencione)

---

ENTREGA: Entregue a saída chamando a função \`build_carousel\`. Mapeie os campos assim:
- titulo → title
- subtitulo → subtitle
- corpo → body
- nota_visual → imagePrompt (SEMPRE em inglês, descrevendo apenas conteúdo visual/fotográfico no estilo "${ESTILO_IMAGENS}"; NUNCA peça texto, letras, tipografia, legendas, marca d'água ou logos com texto na imagem)

Não inclua o campo \`legenda\`. Não escreva nada fora da chamada da função.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "build_carousel",
          description: "Retorna os slides do carrossel.",
          parameters: {
            type: "object",
            properties: {
              slides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    body: { type: "string" },
                    imagePrompt: { type: "string" },
                  },
                  required: ["title", "body", "imagePrompt"],
                  additionalProperties: false,
                },
              },
            },
            required: ["slides"],
            additionalProperties: false,
          },
        },
      },
    ];

    const userContent: any = referenceImageDataUrl
      ? [
          { type: "text", text: `Tema/contexto: ${topic.trim()}` },
          { type: "image_url", image_url: { url: referenceImageDataUrl } },
        ]
      : `Tema/contexto: ${topic.trim()}`;

    const aiResp = await callAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "build_carousel" } },
      },
      LOVABLE_API_KEY,
    );

    let textFallback = false;
    let slides: { title: string; subtitle: string; body: string; imagePrompt: string; imageDataUrl: string | null }[] = [];

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[carrossel-generate] AI text error", aiResp.status, t);
      slides = fallbackSlides(topic.trim(), clientName, slideCount);
      textFallback = true;
    } else {
      const data = await aiResp.json();
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { slides: { title: string; subtitle?: string; body: string; imagePrompt: string }[] } = {
        slides: [],
      };
      try {
        parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
      } catch (e) {
        console.error("[carrossel-generate] parse tool call failed", e);
      }

      slides = (parsed.slides ?? []).slice(0, slideCount).map((s) => ({
        title: s.title ?? "",
        subtitle: s.subtitle ?? "",
        body: s.body ?? "",
        imagePrompt: s.imagePrompt ?? "",
        imageDataUrl: null as string | null,
      }));

      if (slides.length === 0) {
        console.warn("[carrossel-generate] empty slides from model — using fallback");
        slides = fallbackSlides(topic.trim(), clientName, slideCount);
        textFallback = true;
      } else {
        // Pad if model returned fewer slides
        while (slides.length < slideCount) {
          slides.push({ title: "", subtitle: "", body: "", imagePrompt: topic, imageDataUrl: null });
        }
      }
    }

    console.log("[carrossel-generate] text_done", {
      ms: Date.now() - t0,
      slides: slides.length,
      fallback: textFallback,
    });

    // Image generation — parallel with global deadline (gateway timeout is ~150s)
    const DEADLINE_MS = 120_000;
    const remaining = () => DEADLINE_MS - (Date.now() - t0);
    let imagesGenerated = 0;

    if (!textOnly && aiImages && imageMode !== "none" && !textFallback && remaining() > 10_000) {
      const paletteStr = Array.isArray(briefing?.palette) && briefing!.palette.length
        ? briefing!.palette.join(", ")
        : "";
      const archetypeStr = briefing?.archetype ?? "";
      const segStr = segment ?? "";
      const hasReference = !!referenceImageDataUrl;

      const inferCamera = (note: string): { camera: string; dof: string } => {
        const n = note.toLowerCase();
        if (/portrait|face|close[- ]?up|beauty/.test(n))
          return { camera: "85mm portrait prime lens, eye-level angle", dof: "shallow depth of field with smooth natural bokeh" };
        if (/street|urban|candid|sidewalk/.test(n))
          return { camera: "35mm full-frame lens, natural eye-level angle", dof: "medium depth of field, environmental context preserved" };
        if (/editorial|fashion|magazine|cover/.test(n))
          return { camera: "medium-format camera with 80mm lens, slightly elevated angle", dof: "controlled shallow depth of field with crisp subject separation" };
        if (/cinema|cinematic|film still|movie/.test(n))
          return { camera: "cinema camera with anamorphic 40mm lens, low angle", dof: "cinematic shallow depth of field with subtle anamorphic bokeh" };
        if (/product|object|still life|flat lay/.test(n))
          return { camera: "100mm macro lens on full-frame, top-down or 45-degree angle", dof: "deep depth of field with full subject sharpness" };
        return { camera: "50mm prime lens on full-frame camera, eye-level angle", dof: "balanced medium depth of field" };
      };

      const buildImagePrompt = (note: string): string => {
        const { camera, dof } = inferCamera(note);
        const parts = [
          `Photograph: ${note}.`,
          `Visual style: ${ESTILO_IMAGENS}.`,
          `Lighting: logically motivated natural or ambient light, soft and directional, photographically plausible.`,
          `Camera/lens/angle: ${camera}.`,
          `Depth of field: ${dof}.`,
          paletteStr ? `Color palette: ${paletteStr}.` : "",
          `Mood and narrative: editorial, neutral, emotionally coherent with the slide message; storytelling aligned with the topic.`,
          hasReference
            ? `Reference cues: respect composition, light behavior, framing, depth, environment, color palette and styling extracted from the attached visual reference.`
            : "",
          segStr ? `Brand segment: ${segStr}.` : "",
          archetypeStr ? `Brand archetype: ${archetypeStr}.` : "",
          `Quality: high optical sharpness, fine detail rendering, natural skin micro texture, visible pores, realistic photography clarity, professional photography, 2K resolution.`,
          `Negative: no text, no letters, no typography, no captions, no watermark, no logo, no signage with words, no blurry skin, no plastic skin, no over-smoothed face, no AI skin smoothing, no texture loss, no suggestive or sensual posing.`,
          `Aspect ratio: vertical 4:5.`,
        ].filter(Boolean);
        return parts.join(" ");
      };

      const genOne = async (i: number): Promise<string | null> => {
        const s = slides[i];
        const prompt = buildImagePrompt(s.imagePrompt || topic.trim());
        console.log("[carrossel-generate] image_start", { i, ms: Date.now() - t0 });
        try {
          const imgResp = await callAI(
            {
              model: "google/gemini-3-pro-image-preview",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            },
            LOVABLE_API_KEY,
          );
          if (!imgResp.ok) {
            const t = await imgResp.text();
            console.error("[carrossel-generate] image error", { i, status: imgResp.status, body: t.slice(0, 200) });
            return null;
          }
          const imgData = await imgResp.json();
          const url = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          const ok = typeof url === "string" && url.startsWith("data:");
          console.log("[carrossel-generate] image_done", { i, ok, ms: Date.now() - t0 });
          return ok ? url : null;
        } catch (e) {
          console.error("[carrossel-generate] image exception", { i, err: String(e) });
          return null;
        }
      };

      const perSlideTimeout = Math.max(5_000, remaining() - 2_000);
      const results = await Promise.allSettled(
        slides.map((_, i) =>
          Promise.race<string | null>([
            genOne(i),
            new Promise<null>((res) => setTimeout(() => res(null), perSlideTimeout)),
          ]),
        ),
      );
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          slides[i].imageDataUrl = r.value;
          imagesGenerated += 1;
        }
      });
    } else if (!textOnly && aiImages && imageMode !== "none") {
      console.warn("[carrossel-generate] skipping images", {
        textFallback,
        remainingMs: remaining(),
      });
    }

    const totalMs = Date.now() - t0;
    console.log("[carrossel-generate] done", { totalMs, slides: slides.length, imagesGenerated, textFallback });

    return new Response(
      JSON.stringify({
        slides,
        meta: {
          archetype: briefing?.archetype ?? null,
          paletteFromBriefing: Array.isArray(briefing?.palette) ? briefing!.palette : null,
          instagram: instagram ?? null,
          fallback: textFallback,
          imagesGenerated,
          totalMs,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[carrossel-generate] fatal", e);
    // Last-resort fallback so the editor still opens.
    const slides = fallbackSlides(topicForFallback || "conteúdo", clientNameForFallback, slideCountForFallback);
    return new Response(
      JSON.stringify({
        slides,
        meta: {
          archetype: null,
          paletteFromBriefing: null,
          instagram: null,
          fallback: true,
          imagesGenerated: 0,
          totalMs: Date.now() - t0,
          error: e instanceof Error ? e.message : "Erro desconhecido",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
