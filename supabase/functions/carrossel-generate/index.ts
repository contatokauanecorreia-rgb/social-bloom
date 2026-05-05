// deno-lint-ignore-file no-explicit-any
import { generateWithFal } from "../_shared/fal-image.ts";

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
    const ALINHAMENTO = (body.alignment === "left" || body.alignment === "right" || body.alignment === "center")
      ? body.alignment
      : "center";

    // ---- Detecção automática do Sistema Visual Minimalista ----
    const archLower = (briefing?.archetype ?? "").toLowerCase();
    const toneLower = (briefing?.tone_of_voice ?? "").toLowerCase();
    const segLower = `${segment ?? ""} ${clientName ?? ""}`.toLowerCase();
    const minimalistArchetypes = ["inocente", "sabio", "cuidador", "sofisticado", "governante", "amante"];
    const minimalistTone = /elegante|leve|acolhedor|formal|sofisticad/i;
    const minimalistSegment = /sa[úu]de|beleza|bem.?estar|educa[çc][ãa]o|moda|lifestyle/i;
    const isMinimalist =
      minimalistArchetypes.includes(archLower) ||
      minimalistTone.test(toneLower) ||
      minimalistSegment.test(segLower);
    console.log("[carrossel-generate] minimalist?", { isMinimalist, archLower, alignment: ALINHAMENTO });

    // ---- Detecção automática do Sistema Visual Criativo ----
    const creativeArchetypes = ["criador", "fora-da-lei", "bobo", "heroi", "mago"];
    const creativeTone = /jovem|irreverente|ousad|disruptiv|vibrante/i;
    const creativeSegment = /marketing|tecnolog|moda|entretenimento|ag[êe]ncia|neg[óo]cios?\s*digit|digital/i;
    const isCreative =
      !isMinimalist && (
        creativeArchetypes.includes(archLower) ||
        creativeTone.test(toneLower) ||
        creativeSegment.test(segLower)
      );
    console.log("[carrossel-generate] creative?", { isCreative, archLower });

    const COR_DESTAQUE = Array.isArray(briefing?.palette) && briefing!.palette.length
      ? briefing!.palette[0]
      : "#FF5A1F";

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

    const minimalistAppendix = isMinimalist ? `

---

SISTEMA VISUAL MINIMALISTA — ATIVADO AUTOMATICAMENTE PELO DNA DA MARCA

Você está operando em modo minimalista. Cada slide DEVE também ser classificado em um dos 5 tipos visuais abaixo, e você DEVE retornar os campos extras: \`sistema\`, \`tipo\`, \`fundo\`, \`label\`, \`tags\`, \`elemento_decorativo\` e \`nota_visual\` (apenas M4/M5).

REGRAS GLOBAIS:
- Fundo: off-white (#F5F0E8) OU bege linho texturizado OU foto com overlay máximo 30%. NUNCA fundo colorido sólido.
- Muito espaço negativo: texto ocupa no máximo 60% do slide.
- Margens internas mínimas de 48px em todas as bordas.
- Máximo 2 fontes: 1 serif elegante + 1 sans-serif bold.
- Mix de regular + itálico na mesma linha para ênfase. Marque palavras a destacar entre asteriscos: *palavra*.
- Alinhamento dos textos: ${ALINHAMENTO}.

TIPOS DE SLIDE:
- M1 — Tipografia pura: fundo off-white liso, ZERO imagem, título serif grande no centro, mix regular+itálico, seta → no rodapé esquerdo. Para frases de impacto, declarações, insights.
- M2 — Editorial estruturado: fundo bege texturizado, label asterisco no canto superior esquerdo, título bold grande, subtítulo médio bold com seta circular ⊙ à direita, corpo justificado. Para argumentação e explicação.
- M3 — Fundo neutro + objeto/mockup: fundo bege/linho, label cursivo centralizado no topo, título bold gigante centralizado com mix bold+itálico, corpo justificado. Para apresentação de produto/serviço/resultado.
- M4 — Foto duas zonas: foto editorial de fundo (flat lay, workspace, detalhe), overlay escuro máx 30%, tags em pílulas no topo, label caps + título bold caps no meio, subtítulo serif no rodapé. Para abertura e resultado.
- M5 — Foto cotidiana íntima: foto cotidiana/íntima de fundo, labels nos cantos superiores, título display grande no meio, notas pequenas caps no rodapé esquerdo. Para gancho emocional.

ALTERNÂNCIA OBRIGATÓRIA (NÃO QUEBRE):
- Slide 1: SEMPRE M4 ou M5.
- Slides 2 e 3: M1 ou M2.
- Slides 4 e 5: M2 ou M3.
- Último slide: SEMPRE M1 (CTA tipográfico limpo).
- NUNCA dois slides do mesmo tipo consecutivos.

ELEMENTOS DECORATIVOS PERMITIDOS (e nada mais):
- Seta simples → (apenas no rodapé)
- Tags/pílulas com borda fina (apenas M4)
- Asterisco * como marcador de label
- Triângulo geométrico mínimo
- Seta circular ⊙ como navegação

CAMPOS EXTRAS NA TOOL (obrigatórios em modo minimalista):
- sistema: "minimalista"
- tipo: "M1" | "M2" | "M3" | "M4" | "M5"
- fundo: "off-white" | "bege-texturizado" | "foto"
- label: pequeno texto em CAPS, com asterisco quando fizer sentido (ex: "* CAPÍTULO 01")
- tags: array de strings curtas (apenas M4; vazio nos demais)
- elemento_decorativo: "seta" | "asterisco" | "triangulo" | "seta-circular" | "nenhum"
- nota_visual: descrição em INGLÊS para gerar a foto de fundo (apenas M4 e M5; string vazia em M1/M2/M3)

Para M1/M2/M3, \`imagePrompt\` deve ser string vazia (sem foto). Para M4/M5, \`imagePrompt\` recebe a \`nota_visual\` em inglês.` : "";

    const creativeAppendix = isCreative ? `

---

SISTEMA VISUAL CRIATIVO — ATIVADO AUTOMATICAMENTE PELO DNA DA MARCA

Você está operando em modo criativo. Cada slide DEVE também ser classificado em um dos 5 tipos visuais abaixo, e você DEVE retornar os campos extras: \`sistema\`, \`tipo\`, \`fundo\`, \`palavra_destaque\`, \`ticker_texto\` (apenas C3), \`elemento_grafico\` e \`nota_visual\` (apenas C1/C3).

REGRAS GLOBAIS:
- Contraste visual extremo entre elementos.
- Títulos gigantes que dominam o slide.
- Cor de destaque do DNA (${COR_DESTAQUE}) usada com ousadia.
- Máximo 2 fontes com contraste máximo entre elas.
- Elementos gráficos criativos como diferencial.
- Alinhamento dos textos: ${ALINHAMENTO}.

TIPOS DE SLIDE:
- C1 — Foto + tipografia gigante sobreposta: foto editorial sem overlay, título gigante bold branco diretamente sobre a foto, marca duplicada (canto superior direito + rodapé bold), slogan pequeno no rodapé. Para abertura e impacto visual máximo.
- C2 — Fundo neutro + tipografia colorida explosiva: fundo off-white, label caps com underline no topo, título gigante em fonte display NA COR DE DESTAQUE (${COR_DESTAQUE}), subtítulo bold preto em contraste, mockup/objeto no centro, corpo pequeno no rodapé. Para declarações de impacto e propostas de valor.
- C3 — Foto + faixa ticker: foto editorial de pessoa/ambiente, título bold sans-serif no topo, corpo justificado no centro, faixa horizontal no terço inferior com texto repetido NA COR DE DESTAQUE (${COR_DESTAQUE}), marca nos cantos superiores. Para desenvolvimento e engajamento.
- C4 — Tipografia pura + elemento manuscrito: fundo off-white texturizado, título gigante serif bold + itálico expressivo, palavra-chave destacada com círculo SVG NA COR DE DESTAQUE, seta curva manuscrita SVG NA COR DE DESTAQUE, subtítulo deslocado à direita, rodapé com toggle ⊙→. Para frases provocativas e ganchos emocionais.
- C5 — Tipografia 100% caps + cor dominante: fundo branco, TODO texto em CAPS LOCK BOLD, COR DE DESTAQUE (${COR_DESTAQUE}) dominante em todo o texto, palavras-chave em bold extra, seta vertical ↓ como separador no centro, rodapé com marca + seta →. Para CTA final e declarações de autoridade.

ALTERNÂNCIA OBRIGATÓRIA (NÃO QUEBRE):
- Slide 1: SEMPRE C1 ou C4.
- Slides 2 e 3: C2 ou C3.
- Slides 4 e 5: C3 ou C4.
- Último slide: SEMPRE C5 (CTA dominante).
- NUNCA dois slides do mesmo tipo consecutivos.

ELEMENTOS GRÁFICOS PERMITIDOS POR TIPO (não misturar):
- C2: underline em palavra do título.
- C3: faixa/ticker horizontal com \`ticker_texto\` repetido.
- C4: círculo SVG ao redor da \`palavra_destaque\` + seta curva manuscrita + toggle ⊙→.
- C5: seta vertical ↓ + seta → no rodapé.

CAMPOS EXTRAS NA TOOL (obrigatórios em modo criativo):
- sistema: "criativo"
- tipo: "C1" | "C2" | "C3" | "C4" | "C5"
- fundo: "branco" | "off-white" | "foto"
- palavra_destaque: palavra única do título que recebe círculo/underline (string vazia quando não se aplica)
- ticker_texto: texto curto repetido na faixa (apenas C3; vazio nos demais)
- elemento_grafico: "circulo" | "seta-curva" | "ticker" | "seta-vertical" | "toggle"
- nota_visual: descrição em INGLÊS para gerar a foto (apenas C1 e C3; vazio em C2/C4/C5)

Para C2/C4/C5, \`imagePrompt\` deve ser string vazia (sem foto). Para C1/C3, \`imagePrompt\` recebe a \`nota_visual\` em inglês.` : "";

    const finalSystemPrompt = systemPrompt + minimalistAppendix + creativeAppendix;

    const slideItemProperties: any = {
      title: { type: "string" },
      subtitle: { type: "string" },
      body: { type: "string" },
      imagePrompt: { type: "string" },
    };
    if (isMinimalist) {
      slideItemProperties.sistema = { type: "string" };
      slideItemProperties.tipo = { type: "string", enum: ["M1", "M2", "M3", "M4", "M5"] };
      slideItemProperties.fundo = { type: "string", enum: ["off-white", "bege-texturizado", "foto"] };
      slideItemProperties.label = { type: "string" };
      slideItemProperties.tags = { type: "array", items: { type: "string" } };
      slideItemProperties.elemento_decorativo = {
        type: "string",
        enum: ["seta", "asterisco", "triangulo", "seta-circular", "nenhum"],
      };
      slideItemProperties.nota_visual = { type: "string" };
    }
    if (isCreative) {
      slideItemProperties.sistema = { type: "string" };
      slideItemProperties.tipo = { type: "string", enum: ["C1", "C2", "C3", "C4", "C5"] };
      slideItemProperties.fundo = { type: "string", enum: ["branco", "off-white", "foto"] };
      slideItemProperties.palavra_destaque = { type: "string" };
      slideItemProperties.ticker_texto = { type: "string" };
      slideItemProperties.elemento_grafico = {
        type: "string",
        enum: ["circulo", "seta-curva", "ticker", "seta-vertical", "toggle"],
      };
      slideItemProperties.nota_visual = { type: "string" };
    }

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

      slides = (parsed.slides ?? []).slice(0, slideCount).map((s: any) => {
        const out: SlideOut = {
          title: s.title ?? "",
          subtitle: s.subtitle ?? "",
          body: s.body ?? "",
          imagePrompt: s.imagePrompt ?? "",
          imageDataUrl: null,
          alignment: ALINHAMENTO,
        };
        if (isMinimalist) {
          out.sistema = "minimalista";
          if (s.tipo) out.tipo = s.tipo;
          if (s.fundo) out.fundo = s.fundo;
          if (typeof s.label === "string") out.label = s.label;
          if (Array.isArray(s.tags)) out.tags = s.tags.filter((x: any) => typeof x === "string");
          if (s.elemento_decorativo) out.elemento_decorativo = s.elemento_decorativo;
          // Para M4/M5, garantir que imagePrompt = nota_visual quando vier
          if ((out.tipo === "M4" || out.tipo === "M5") && typeof s.nota_visual === "string" && s.nota_visual.trim()) {
            out.imagePrompt = s.nota_visual.trim();
          }
          // Para M1/M2/M3, NUNCA gerar foto
          if (out.tipo === "M1" || out.tipo === "M2" || out.tipo === "M3") {
            out.imagePrompt = "";
          }
        }
        if (isCreative) {
          out.sistema = "criativo";
          if (s.tipo) out.tipo = s.tipo;
          if (s.fundo) out.fundo = s.fundo;
          if (typeof s.palavra_destaque === "string") out.palavra_destaque = s.palavra_destaque;
          if (typeof s.ticker_texto === "string") out.ticker_texto = s.ticker_texto;
          if (s.elemento_grafico) out.elemento_grafico = s.elemento_grafico;
          if ((out.tipo === "C1" || out.tipo === "C3") && typeof s.nota_visual === "string" && s.nota_visual.trim()) {
            out.imagePrompt = s.nota_visual.trim();
          }
          if (out.tipo === "C2" || out.tipo === "C4" || out.tipo === "C5") {
            out.imagePrompt = "";
          }
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
          isMinimalist ? `Composition style: editorial minimalist, generous negative space, off-white or linen tones, calm and refined.` : "",
          isCreative ? `Composition style: bold editorial, high contrast, vibrant accent color, dynamic energy, magazine-grade.` : "",
          `Aspect ratio: vertical 4:5.`,
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
        if (!s.imagePrompt || !s.imagePrompt.trim()) {
          if (s.sistema === "minimalista" || s.sistema === "criativo") return null;
        }
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
