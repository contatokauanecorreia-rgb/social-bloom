// deno-lint-ignore-file no-explicit-any
import {
  fallbackVisualPrompt,
  generateWithFal,
  looksLikeCopyNotImagePrompt,
  sanitizeImageNote,
} from "../_shared/fal-image.ts";

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
  plannerSource?: {
    posts: { title: string; tags: string[]; notes: string | null }[];
  } | null;
  gridLayout?: string | null;
  designPrinciples?: string[] | null;
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
    const { clientId, topic, imageMode, aiImages, instagram, textOnly, referenceImageDataUrl, plannerSource, designPrinciples } = body;
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
    const ALINHAMENTO = (body.alignment === "left" || body.alignment === "right" || body.alignment === "center")
      ? body.alignment
      : "center";

    // ---- Princípios de design unificam a geração ----
    // Não há mais detecção por DNA. Os princípios escolhidos pelo usuário
    // mapeiam diretamente para um TIPO de slide (M*/C*) que o renderer já
    // suporta. Sempre ativamos AMBOS os sistemas no schema da tool para que
    // o modelo possa devolver qualquer combinação por slide.
    const isMinimalist = true;
    const isCreative = true;
    console.log("[carrossel-generate] principles-driven", { alignment: ALINHAMENTO, principles: designPrinciples });

    const COR_DESTAQUE = Array.isArray(briefing?.palette) && briefing!.palette.length
      ? briefing!.palette[0]
      : "#FF5A1F";

    // Mapa: princípio → { sistema, tipo, fundo, descrição do layout }.
    // Cada card mostrado ao usuário no Wizard equivale a UM destes presets.
    // - preto = imagem; cinza escuro = título; cinza claro = corpo.
    type ImageFrame = "full" | "top-60" | "half-left" | "half-right" | "centered-square" | "bottom-third" | null;
    const PRINCIPLE_TO_LAYOUT: Record<string, { sistema: "minimalista" | "criativo"; tipo: string; fundo: string; hasImage: boolean; imageFrame: ImageFrame; layout: string }> = {
      "espaco-branco":   { sistema: "minimalista", tipo: "M3", fundo: "off-white",        hasImage: false, imageFrame: null,              layout: "fundo limpo, MUITO respiro, título curto centralizado e corpo bem curto. Texto ocupa no máximo 35% do slide." },
      "contraste":       { sistema: "minimalista", tipo: "M4", fundo: "foto",             hasImage: true,  imageFrame: "top-60",          layout: "foto editorial dominando ~60% do topo, texto curto escuro na metade inferior sobre o fundo claro." },
      "proporcao":       { sistema: "criativo",    tipo: "C2", fundo: "off-white",        hasImage: false, imageFrame: null,              layout: "DOIS títulos enormes empilhados (cada um 1 linha curta), corpo bem pequeno depois. Sem foto." },
      "hierarquia":      { sistema: "minimalista", tipo: "M2", fundo: "bege-texturizado", hasImage: false, imageFrame: null,              layout: "três níveis claros: título grande, subtítulo médio, corpo pequeno. Tudo empilhado e alinhado à esquerda." },
      "enfase":          { sistema: "criativo",    tipo: "C4", fundo: "off-white",        hasImage: false, imageFrame: null,              layout: "uma palavra do título recebe destaque (palavra_destaque). Subtítulo curto deslocado, corpo médio. Sem foto." },
      "equilibrio":      { sistema: "minimalista", tipo: "M4", fundo: "off-white",        hasImage: true,  imageFrame: "half-left",       layout: "duas zonas equilibradas: imagem na metade esquerda, texto na metade direita sobre fundo claro." },
      "alinhamento":     { sistema: "minimalista", tipo: "M1", fundo: "off-white",        hasImage: false, imageFrame: null,              layout: "tipografia pura. TUDO rigidamente alinhado (esquerda ou centro). Sem foto, sem decoração." },
      "harmonia":        { sistema: "minimalista", tipo: "M4", fundo: "bege-texturizado", hasImage: true,  imageFrame: "centered-square", layout: "quadrado fotográfico centralizado com margens generosas mostrando o fundo bege. Texto curto abaixo." },
      "margens":         { sistema: "minimalista", tipo: "M3", fundo: "off-white",        hasImage: false, imageFrame: null,              layout: "moldura ampla. Conteúdo concentrado no centro com bastante respiro nas bordas." },
      "direcionamento":  { sistema: "criativo",    tipo: "C3", fundo: "off-white",        hasImage: true,  imageFrame: "bottom-third",    layout: "foto na faixa inferior (~33%) com ticker horizontal sobreposto. Texto no topo." },
      "variedade":       { sistema: "criativo",    tipo: "C3", fundo: "off-white",        hasImage: true,  imageFrame: "top-60",          layout: "mosaico visual: foto no topo + ticker + título dominante embaixo." },
      "ritmo":           { sistema: "criativo",    tipo: "C1", fundo: "foto",             hasImage: true,  imageFrame: "full",            layout: "alternância densa/leve. Foto editorial dominando o slide inteiro, título gigante sobreposto." },
    };

    const principlesList = Array.isArray(designPrinciples) && designPrinciples.length
      ? designPrinciples.filter((id) => PRINCIPLE_TO_LAYOUT[id])
      : ["espaco-branco", "contraste", "hierarquia"];
    const sequence: string[] = Array.from({ length: slideCount }, (_, i) => principlesList[i % principlesList.length]);

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

LIMITES DE CARACTERES POR SLIDE (regra absoluta — vale para TODOS os tipos M1–M5, C1–C5 e qualquer DNA, contando espaços e quebras de linha):
- Slide SEM título (titulo = ""): a soma de subtitulo + corpo NÃO pode ultrapassar 369 caracteres.
- Slide COM título: a soma de titulo + subtitulo + corpo NÃO pode ultrapassar 422 caracteres.
- Se a ideia não couber, corte adjetivos, advérbios e conectivos — nunca ultrapasse o limite.
- Prefira frases curtas e diretas. Cada slide é um respiro visual.

---

ENTREGA: Entregue a saída chamando a função \`build_carousel\`. Mapeie os campos assim:
- titulo → title
- subtitulo → subtitle
- corpo → body
- nota_visual → imagePrompt (SEMPRE em inglês, descrevendo apenas conteúdo visual/fotográfico no estilo "${ESTILO_IMAGENS}").
  REGRAS DURAS para a nota_visual (NÃO QUEBRE):
  • PROIBIDO mencionar: text, letters, words, typography, captions, signs, signage, billboards, posters, banners, labels, tags, stickers, business cards, menus, brochures, flyers, documents, watermarks, logos with text, tattoos with letters, clothing with text/logos, packaging with brand names, screens/monitors/phones/laptops/TVs showing UI or text, books/magazines/newspapers/journals/notebooks with visible writing or covers with text.
  • Se a cena pediria naturalmente um desses objetos, descreva-os como: "closed", "blank", "powered off", "out of focus", "plain unbranded", ou substitua por equivalente sem texto (ex: "closed book with a plain blank cover" em vez de "open book").
  • A imagem final precisa ser puramente visual/fotográfica, ZERO letras visíveis em qualquer lugar do quadro.

Não inclua o campo \`legenda\`. Não escreva nada fora da chamada da função.`;

    // ====================================================================
    // SISTEMA UNIFICADO: PRINCÍPIOS DE DESIGN COMO ÚNICA FONTE DE LAYOUT
    // ====================================================================
    const principleAppendix = `

---

SISTEMA UNIFICADO DE LAYOUT — PRINCÍPIOS DE DESIGN

O usuário escolheu ${principlesList.length} princípio(s) de design. Cada slide DEVE seguir EXATAMENTE o layout do princípio atribuído a ele (na ordem cíclica abaixo). NÃO existe DNA minimalista ou criativo separado — o princípio é a única fonte do layout.

SEQUÊNCIA OBRIGATÓRIA POR SLIDE (não pode trocar a ordem):
${sequence.map((id, i) => {
  const p = PRINCIPLE_TO_LAYOUT[id];
  return `Slide ${i + 1} → PRINCÍPIO "${id.toUpperCase()}" → sistema=${p.sistema}, tipo=${p.tipo}, fundo=${p.fundo}\n  Layout: ${p.layout}\n  ${p.hasImage ? "TEM imagem (preencha nota_visual em inglês)." : "SEM imagem (imagePrompt vazio)."}`;
}).join("\n")}

REGRAS DE PREENCHIMENTO POR SLIDE:
- Os campos \`sistema\` e \`tipo\` SÃO OBRIGATÓRIOS e devem ser EXATAMENTE os definidos acima por slide. Nunca mude.
- O campo \`fundo\` deve ser o definido acima.
- Densidade do texto deve respeitar o layout: princípios "espaco-branco", "alinhamento", "margens" pedem texto MUITO curto (1 linha de título + 1 de corpo). "proporcao", "ritmo", "variedade" pedem texto médio. "hierarquia", "direcionamento" pedem 3 níveis claros (título, subtítulo, corpo).
- Para tipos com imagem (M4, C1, C3): preencha \`nota_visual\` em INGLÊS, descrevendo APENAS conteúdo visual/fotográfico no estilo "${ESTILO_IMAGENS}". O renderer usará essa nota como \`imagePrompt\`.
- Para tipos sem imagem (M1, M2, M3, C2, C4, C5): \`imagePrompt\` vazio.
- Para C2/C4: preencha \`palavra_destaque\` com UMA palavra do título.
- Para C3: preencha \`ticker_texto\` com 2-3 palavras curtas em CAPS.
- Para M2/M3/M4/M5: preencha \`label\` curto em CAPS.
- Para M4: preencha \`tags\` (2-3 tags curtas).
- Sempre escolha um \`elemento_decorativo\` (minimalista) ou \`elemento_grafico\` (criativo) coerente.
- Cor de destaque do criativo: ${COR_DESTAQUE}.
- Alinhamento dos textos: ${ALINHAMENTO}.

REGRAS DURAS para a \`nota_visual\` (NÃO QUEBRE):
• PROIBIDO mencionar: text, letters, words, typography, captions, signs, signage, billboards, posters, banners, labels, tags, stickers, business cards, menus, brochures, flyers, documents, watermarks, logos with text, screens/monitors/phones/laptops/TVs showing UI or text, books/magazines/newspapers/journals/notebooks with visible writing or covers with text.
• Se a cena pediria naturalmente um desses objetos, descreva-os como "closed", "blank", "powered off", "out of focus", "plain unbranded".
• Imagem 100% visual, ZERO letras visíveis.
`;

    const plannerAppendix = plannerSource && Array.isArray(plannerSource.posts) && plannerSource.posts.length ? `

---

ADAPTAÇÃO DO PLANNER

A fonte do conteúdo são posts JÁ planejados pelo usuário no Planner. Trate-os como BRIEFING BRUTO, não como texto final. Reescreva e reorganize em ${N} slides aplicando os princípios de design definidos acima.

REGRAS DE ADAPTAÇÃO:
- Não copie o título do post como título do slide. Extraia a IDEIA CENTRAL e reescreva.
- Se vários posts foram selecionados, costure-os em uma narrativa única.
- Mantenha tom de voz, palavras obrigatórias e proibidas do briefing.
- Respeite os limites de caracteres (369 sem título, 422 com título).
- Respeite a SEQUÊNCIA de princípios definida acima — cada slide tem seu layout fixo.
` : "";

    const finalSystemPrompt = systemPrompt + principleAppendix + plannerAppendix;

    const slideItemProperties: any = {
      title: { type: "string" },
      subtitle: { type: "string" },
      body: { type: "string" },
      imagePrompt: { type: "string" },
      // Schema unificado — princípio dita o tipo, mas aceitamos todos.
      sistema: { type: "string", enum: ["minimalista", "criativo"] },
      tipo: { type: "string", enum: ["M1", "M2", "M3", "M4", "M5", "C1", "C2", "C3", "C4", "C5"] },
      fundo: { type: "string", enum: ["off-white", "bege-texturizado", "foto", "branco"] },
      label: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      elemento_decorativo: {
        type: "string",
        enum: ["seta", "asterisco", "triangulo", "seta-circular", "nenhum"],
      },
      palavra_destaque: { type: "string" },
      ticker_texto: { type: "string" },
      elemento_grafico: {
        type: "string",
        enum: ["circulo", "seta-curva", "ticker", "seta-vertical", "toggle"],
      },
      nota_visual: { type: "string" },
    };

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
                  properties: slideItemProperties,
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

    const plannerBlock = plannerSource && plannerSource.posts?.length
      ? "\n\nPOSTS DO PLANNER (matéria-prima — adapte com os 12 princípios de design):\n" +
        plannerSource.posts
          .map((p, i) => `${i + 1}. Título: ${p.title}${p.tags?.length ? ` | tags: ${p.tags.join(", ")}` : ""}${p.notes ? `\n   Notas: ${p.notes}` : ""}`)
          .join("\n")
      : "";

    const userContent: any = referenceImageDataUrl
      ? [
          { type: "text", text: `Tema/contexto: ${topic.trim()}${plannerBlock}` },
          { type: "image_url", image_url: { url: referenceImageDataUrl } },
        ]
      : `Tema/contexto: ${topic.trim()}${plannerBlock}`;

    const aiResp = await callAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "build_carousel" } },
      },
      LOVABLE_API_KEY,
    );

    let textFallback = false;
    type SlideOut = {
      title: string;
      subtitle: string;
      body: string;
      imagePrompt: string;
      imageDataUrl: string | null;
      sistema?: "minimalista" | "criativo";
      tipo?: "M1" | "M2" | "M3" | "M4" | "M5" | "C1" | "C2" | "C3" | "C4" | "C5";
      fundo?: "off-white" | "bege-texturizado" | "foto" | "branco";
      label?: string;
      tags?: string[];
      elemento_decorativo?: "seta" | "asterisco" | "triangulo" | "seta-circular" | "nenhum";
      palavra_destaque?: string;
      ticker_texto?: string;
      elemento_grafico?: "circulo" | "seta-curva" | "ticker" | "seta-vertical" | "toggle";
      alignment?: "left" | "center" | "right";
    };
    let slides: SlideOut[] = [];

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("[carrossel-generate] AI text error", aiResp.status, t);
      slides = fallbackSlides(topic.trim(), clientName, slideCount);
      textFallback = true;
    } else {
      const data = await aiResp.json();
      const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { slides: any[] } = { slides: [] };
      try {
        parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
      } catch (e) {
        console.error("[carrossel-generate] parse tool call failed", e);
      }

      slides = (parsed.slides ?? []).slice(0, slideCount).map((s: any, idx: number) => {
        // Princípio dita o layout — sobrescreve qualquer sistema/tipo/fundo do modelo.
        const principleId = sequence[idx] ?? sequence[sequence.length - 1];
        const layout = PRINCIPLE_TO_LAYOUT[principleId];
        const out: SlideOut = {
          title: s.title ?? "",
          subtitle: s.subtitle ?? "",
          body: s.body ?? "",
          imagePrompt: s.imagePrompt ?? "",
          imageDataUrl: null,
          alignment: ALINHAMENTO,
        };
        out.sistema = layout.sistema;
        out.tipo = layout.tipo as any;
        out.fundo = layout.fundo as any;

        if (layout.sistema === "minimalista") {
          if (typeof s.label === "string") out.label = s.label;
          if (Array.isArray(s.tags)) out.tags = s.tags.filter((x: any) => typeof x === "string");
          if (s.elemento_decorativo) out.elemento_decorativo = s.elemento_decorativo;
        } else {
          if (typeof s.palavra_destaque === "string") out.palavra_destaque = s.palavra_destaque;
          if (typeof s.ticker_texto === "string") out.ticker_texto = s.ticker_texto;
          if (s.elemento_grafico) out.elemento_grafico = s.elemento_grafico;
        }

        // Imagem: presente apenas se o princípio pede.
        if (layout.hasImage) {
          if (typeof s.nota_visual === "string" && s.nota_visual.trim()) {
            out.imagePrompt = s.nota_visual.trim();
          }
        } else {
          out.imagePrompt = "";
        }
        return out;
      });

      if (slides.length === 0) {
        console.warn("[carrossel-generate] empty slides from model — using fallback");
        slides = fallbackSlides(topic.trim(), clientName, slideCount);
        textFallback = true;
      } else {
        while (slides.length < slideCount) {
          slides.push({ title: "", subtitle: "", body: "", imagePrompt: topic, imageDataUrl: null, alignment: ALINHAMENTO });
        }
      }
    }

    // Trava defensiva: garante limite de caracteres por slide.
    // Sem título: subtitle+body <= 369. Com título: title+subtitle+body <= 422.
    slides = slides.map((s) => {
      const hasTitle = (s.title ?? "").trim().length > 0;
      const limit = hasTitle ? 422 : 369;
      const used = (hasTitle ? s.title.length : 0) + s.subtitle.length + s.body.length;
      if (used <= limit) return s;
      let over = used - limit;
      // 1) corta o body do fim, preservando palavras
      if (over > 0 && s.body.length > 0) {
        const newLen = Math.max(0, s.body.length - over);
        let cut = s.body.slice(0, newLen).replace(/\s+\S*$/, "").trimEnd();
        if (cut.length < s.body.length && cut.length > 0 && !/[.!?…]$/.test(cut)) cut += "…";
        over -= s.body.length - cut.length;
        s.body = cut;
      }
      // 2) ainda sobrando — corta subtítulo
      if (over > 0 && s.subtitle.length > 0) {
        const newLen = Math.max(0, s.subtitle.length - over);
        s.subtitle = s.subtitle.slice(0, newLen).replace(/\s+\S*$/, "").trimEnd();
      }
      return s;
    });

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
        let seed = (note ?? "").trim();
        if (looksLikeCopyNotImagePrompt(seed)) {
          console.warn("[carrossel-generate] prompt_looked_like_copy", {
            len: seed.length,
            preview: seed.slice(0, 120),
          });
          seed = fallbackVisualPrompt({
            archetype: archetypeStr || null,
            segment: segStr || null,
            imageStyle: ESTILO_IMAGENS,
            topic: TEMA,
          });
        }
        const safeNote = sanitizeImageNote(seed);
        const { camera, dof } = inferCamera(safeNote);
        const parts = [
          `Photograph: ${safeNote}.`,
          `Visual style: ${ESTILO_IMAGENS}.`,
          `Lighting: logically motivated natural or ambient light, soft and directional, photographically plausible, well exposed.`,
          `Camera/lens/angle: ${camera}.`,
          `Depth of field: ${dof}.`,
          paletteStr ? `Color palette: ${paletteStr}.` : "",
          `Mood and narrative: editorial, neutral, emotionally coherent with the slide message; storytelling aligned with the topic.`,
          hasReference
            ? `Reference cues: respect composition, light behavior, framing, depth, environment, color palette and styling extracted from the attached visual reference.`
            : "",
          segStr ? `Brand segment: ${segStr}.` : "",
          archetypeStr ? `Brand archetype: ${archetypeStr}.` : "",
          `Anatomy: anatomically correct hands with exactly five fingers, realistic facial features, natural body proportions, no extra limbs, no distorted faces, no melted or warped features.`,
          `Quality: high optical sharpness, fine detail, natural skin micro texture, realistic photography clarity, professional, 2K resolution.`,
          `Composition: editorial, balanced, professional magazine-grade.`,
          `Aspect ratio: vertical 4:5.`,
          `No text, no letters, no captions, no logos, no watermarks anywhere in the image.`,
        ].filter(Boolean);
        return parts.join(" ");
      };

      const genOne = async (i: number): Promise<string | null> => {
        const s = slides[i];
        // Sistema minimalista: tipos M1/M2/M3 nunca usam foto.
        if (s.sistema === "minimalista" && (s.tipo === "M1" || s.tipo === "M2" || s.tipo === "M3")) {
          console.log("[carrossel-generate] image_skip_minimalist", { i, tipo: s.tipo });
          return null;
        }
        // Sistema criativo: tipos C2/C4/C5 nunca usam foto.
        if (s.sistema === "criativo" && (s.tipo === "C2" || s.tipo === "C4" || s.tipo === "C5")) {
          console.log("[carrossel-generate] image_skip_creative", { i, tipo: s.tipo });
          return null;
        }
        // Sem nota visual? não gera para sistemas com tipos.
        // Sem nota visual? não usa o tópico inteiro (que pode ser o copy do
        // Planner) — pula a geração para não desenhar texto.
        if (!s.imagePrompt || !s.imagePrompt.trim()) {
          console.log("[carrossel-generate] image_skip_no_prompt", { i });
          return null;
        }
        const prompt = buildImagePrompt(s.imagePrompt);
        console.log("[carrossel-generate] image_start", { i, ms: Date.now() - t0 });

        // ÚNICA ENGINE: FAL/FLUX 1.1 Pro — fotografia ultrarrealista.
        // Sem fallback: se falhar, o slide fica sem imagem (usuário regenera).
        const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
        if (!FAL_API_KEY) {
          console.warn("[carrossel-generate] image_skip_no_fal_key", { i });
          return null;
        }
        const falUrl = await generateWithFal(prompt, {
          apiKey: FAL_API_KEY,
          aspectRatio: "4:5",
          timeoutMs: Math.min(60_000, Math.max(10_000, remaining() - 3_000)),
        });
        if (falUrl) {
          console.log("[carrossel-generate] image_done_fal", { i, ms: Date.now() - t0 });
          return falUrl;
        }
        console.warn("[carrossel-generate] image_failed_fal_no_fallback", { i });
        return null;
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
          designPrinciples: Array.isArray(designPrinciples) ? designPrinciples : null,
          principlesPerSlide: sequence,
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
