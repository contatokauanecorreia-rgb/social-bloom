// Shared mock client briefings used by content-creation surfaces
// (studio de agentes, gerador de carrosséis, etc.). IDs match
// the mock client cards in dashboard.clientes.index.tsx.

export type ClientBriefing = {
  id: string;
  name: string;
  segment: string;
  toneOfVoice: string;
  objective: string;
  keywords: string[];
  alwaysUse: string[];
  neverUse: string[];
};

export const CLIENT_BRIEFINGS: ClientBriefing[] = [
  {
    id: "studio-bela-forma",
    name: "Studio Bela Forma",
    segment: "Saúde e beleza",
    toneOfVoice: "Acolhedor e especialista",
    objective: "Atrair agendamentos de avaliação",
    keywords: ["autoestima", "rotina", "resultado real"],
    alwaysUse: ["você", "cuidado", "transformação"],
    neverUse: ["milagre", "barato", "promoção relâmpago"],
  },
  {
    id: "restaurante-folha-verde",
    name: "Restaurante Folha Verde",
    segment: "Alimentação",
    toneOfVoice: "Casual e afetivo",
    objective: "Aumentar reservas no fim de semana",
    keywords: ["fresco", "do dia", "feito à mão"],
    alwaysUse: ["nosso", "casa", "sabor"],
    neverUse: ["industrial", "fast food", "congelado"],
  },
  {
    id: "academia-forcaviva",
    name: "Academia ForçaViva",
    segment: "Fitness",
    toneOfVoice: "Energético e direto",
    objective: "Captar matrículas para a próxima turma",
    keywords: ["evolução", "constância", "comunidade"],
    alwaysUse: ["bora", "treino", "meta"],
    neverUse: ["preguiça", "desistir", "impossível"],
  },
];

export function getClientBriefing(id: string | null | undefined): ClientBriefing | null {
  if (!id) return null;
  return CLIENT_BRIEFINGS.find((c) => c.id === id) ?? null;
}

export const ACTIVE_CLIENT_STORAGE_KEY = "postly:active-client";
