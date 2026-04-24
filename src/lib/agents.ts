import surImg from "@/assets/agents/sur.jpg";
import kiukaImg from "@/assets/agents/kiuka.jpg";
import kimoImg from "@/assets/agents/kimo.jpg";
import roxyImg from "@/assets/agents/roxy.jpg";

export type AgentId = "sur" | "kiuka" | "kimo" | "roxy";

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  initials: string;
  accent: string; // tailwind gradient (from-X to-Y)
  avatar: string;
  greeting: string;
};

export const AGENTS: Agent[] = [
  {
    id: "sur",
    name: "SUR",
    role: "Explorador de ideias",
    description: "Explorador de ideias para criação de conteúdo",
    initials: "SU",
    accent: "from-fuchsia-500 via-rose-500 to-orange-400",
    greeting:
      "Oi! Eu sou o **SUR** ✦ Me conta sobre seu nicho, público ou um tema que você quer explorar — e eu te trago ideias frescas pra criar conteúdo.",
  },
  {
    id: "kiuka",
    name: "KIÜKA",
    role: "Criadora de carrosséis",
    description: "Criadora de carrosséis que convertem",
    initials: "KI",
    accent: "from-cyan-400 via-violet-400 to-orange-300",
    greeting:
      "E aí, sou a **KIÜKA** 🎨 Me diz o tema do carrossel + objetivo (engajar, vender, educar) e eu monto a estrutura slide a slide pra você.",
  },
  {
    id: "kimo",
    name: "KIMO",
    role: "Roteirista de vídeos",
    description: "Cria roteiros reais que convertem e conectam",
    initials: "KM",
    accent: "from-purple-500 via-fuchsia-500 to-pink-500",
    greeting:
      "Salve! Sou o **KIMO** 🎬 Me passa a ideia do vídeo (formato, duração, mensagem) e eu escrevo um roteiro real, que conecta e converte.",
  },
  {
    id: "roxy",
    name: "ROXY STUDIO",
    role: "Character Designer",
    description: "Cria prompts para pessoas e personagens",
    initials: "RX",
    accent: "from-rose-500 via-red-500 to-amber-500",
    greeting:
      "Oi, aqui é a **ROXY STUDIO** ✨ Descreve o personagem ou pessoa que você quer (vibe, estilo, contexto) e eu monto um prompt detalhado pra geração de imagem.",
  },
];

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
