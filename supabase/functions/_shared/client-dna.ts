// Loads and formats the "DNA" (briefing) of a client for AI prompts.
// Shared by carrossel-generate and planner-ideas.

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

export type ClientDNA = {
  clientName: string | null;
  segment: string | null;
  archetype: string | null;
  archetypeTone: string | null;
  toneOfVoice: string | null;
  targetAudience: string | null;
  businessDescription: string | null;
  goals: string[];
  contentPillars: string[];
  dos: string[];
  donts: string[];
  palette: string[];
  references: string | null;
  /** Pre-formatted human-readable block ready to drop into a system prompt. */
  prompt: string;
  /** Raw briefing row (or null) for callers that need extra fields. */
  raw: Record<string, unknown> | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export async function loadClientDNA(
  supabase: SupabaseLike,
  clientId: string | null | undefined,
): Promise<ClientDNA> {
  const empty: ClientDNA = {
    clientName: null,
    segment: null,
    archetype: null,
    archetypeTone: null,
    toneOfVoice: null,
    targetAudience: null,
    businessDescription: null,
    goals: [],
    contentPillars: [],
    dos: [],
    donts: [],
    palette: [],
    references: null,
    prompt:
      "Sem briefing específico para este cliente — escreva de forma profissional em português do Brasil.",
    raw: null,
  };

  if (!clientId) return empty;

  const [{ data: bData }, { data: cData }] = await Promise.all([
    supabase
      .from("client_briefings")
      .select(
        "tone_of_voice, target_audience, business_description, content_pillars, goals, dos, donts, archetype, palette, references",
      )
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase.from("clients").select("name, company").eq("id", clientId).maybeSingle(),
  ]);

  const dna: ClientDNA = { ...empty, raw: bData ?? null };
  dna.clientName = cData?.name ?? null;
  dna.segment = cData?.company ?? null;
  dna.archetype = bData?.archetype ?? null;
  dna.archetypeTone = bData?.archetype ? ARCHETYPE_TONE[bData.archetype] ?? null : null;
  dna.toneOfVoice = bData?.tone_of_voice ?? null;
  dna.targetAudience = bData?.target_audience ?? null;
  dna.businessDescription = bData?.business_description ?? null;
  dna.goals = Array.isArray(bData?.goals) ? bData.goals : [];
  dna.contentPillars = Array.isArray(bData?.content_pillars) ? bData.content_pillars : [];
  dna.dos = Array.isArray(bData?.dos) ? bData.dos : [];
  dna.donts = Array.isArray(bData?.donts) ? bData.donts : [];
  dna.palette = Array.isArray(bData?.palette) ? bData.palette : [];
  dna.references = bData?.references ?? null;

  const lines: string[] = [];
  lines.push("=== DNA DA MARCA (use este contexto em todas as escolhas) ===");
  if (dna.clientName) lines.push(`Cliente: ${dna.clientName}`);
  if (dna.segment) lines.push(`Segmento / nicho: ${dna.segment}`);
  if (dna.businessDescription) lines.push(`Sobre o negócio: ${dna.businessDescription}`);
  if (dna.archetype) {
    lines.push(
      `Arquétipo: ${dna.archetype}${dna.archetypeTone ? ` (${dna.archetypeTone})` : ""}`,
    );
  }
  if (dna.toneOfVoice) lines.push(`Tom de voz: ${dna.toneOfVoice}`);
  if (dna.targetAudience) lines.push(`Público-alvo: ${dna.targetAudience}`);
  if (dna.goals.length) lines.push(`Objetivos: ${dna.goals.join(", ")}`);
  if (dna.contentPillars.length) lines.push(`Pilares de conteúdo: ${dna.contentPillars.join(", ")}`);
  if (dna.dos.length) lines.push(`SEMPRE usar / dizer: ${dna.dos.join(", ")}`);
  if (dna.donts.length) lines.push(`NUNCA usar / dizer: ${dna.donts.join(", ")}`);
  if (dna.palette.length) lines.push(`Paleta de cores: ${dna.palette.join(", ")}`);
  if (dna.references) lines.push(`Referências da marca: ${dna.references}`);

  dna.prompt = lines.join("\n");
  return dna;
}
