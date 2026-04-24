## Chat de Agentes em "Criar conteúdo"

Transformar a página `/dashboard/agentes` em uma interface de mensageiro com 4 agentes especializados de IA, layout em 2 colunas (lista de agentes à esquerda, chat ativo à direita).

---

### 1. Layout (`src/routes/dashboard.agentes.tsx`)

**Grid de 2 colunas** ocupando altura total da viewport:
- **Coluna esquerda (320px)**: Lista de agentes (`AgentList`)
- **Coluna direita (flex-1)**: Painel de chat (`AgentChatPanel`) — **nunca vazio**, sempre exibe o último agente aberto (default: SUR)

A página deve usar `PageContainer` com `wide` para aproveitar mais espaço. O título "Criar conteúdo" fica no header.

---

### 2. Definição dos Agentes (`src/lib/agents.ts`)

```ts
export const AGENTS = [
  {
    id: "sur",
    name: "SUR",
    role: "Explorador de ideias",
    description: "Explorador de ideias para criação de conteúdo",
    avatar: "/agents/sur.png",
    accent: "from-emerald-400 to-teal-500",
    systemPrompt: "Você é SUR, explorador de ideias..."
  },
  {
    id: "kiuka",
    name: "KIÜKA",
    role: "Criadora de carrosséis",
    description: "Criadora de carrosséis que convertem",
    avatar: "/agents/kiuka.png",
    accent: "from-pink-400 to-rose-500",
    systemPrompt: "Você é KIÜKA, especialista em carrosséis..."
  },
  {
    id: "kimo",
    name: "KIMO",
    role: "Roteirista de vídeos",
    description: "Cria roteiros reais que convertem e conectam",
    avatar: "/agents/kimo.png",
    accent: "from-amber-400 to-orange-500",
    systemPrompt: "Você é KIMO, roteirista..."
  },
  {
    id: "roxy",
    name: "ROXY STUDIO",
    role: "Character Designer",
    description: "Cria prompts para pessoas e personagens",
    avatar: "/agents/roxy.png",
    accent: "from-violet-400 to-purple-500",
    systemPrompt: "Você é ROXY STUDIO, character designer..."
  },
] as const;
```

Avatares usarão **placeholders coloridos com iniciais** (gerados via `Avatar` + `AvatarFallback` do shadcn) — sem necessidade de upload de imagens nesta etapa.

---

### 3. Componentes Novos

**`src/components/agentes/AgentList.tsx`**
- Lista vertical de cards clicáveis
- Cada card mostra: avatar (com gradiente do `accent`), nome, descrição curta
- **Indicador verde "online"** (`h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background`) posicionado abaixo do nome
- Card ativo: borda + fundo destacado

**`src/components/agentes/AgentChatPanel.tsx`**
- Header: avatar grande, nome, descrição da função, ponto verde online
- Área de mensagens scrollável (`overflow-y-auto`) com `ReactMarkdown`
- Input fixo no rodapé (`Textarea` + botão Enviar)
- Estado vazio (sem mensagens): preview da função do agente
- Streaming via SSE — tokens aparecem progressivamente

**`src/components/agentes/MessageBubble.tsx`**
- Bolhas alinhadas: usuário à direita (`bg-primary`), agente à esquerda (`bg-muted`)
- Suporte a markdown via `react-markdown`

---

### 4. Banco de Dados (Migração)

```sql
-- Conversas (uma por agente, por usuário)
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_id)
);

-- Mensagens
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS: usuário só acessa seus próprios dados (auth.uid() = user_id) para todas as operações
```

Salvar último agente aberto no `localStorage` (`postly:last-agent`) para que ao voltar à página, o chat correto seja exibido automaticamente.

---

### 5. Edge Function (`supabase/functions/agent-chat/index.ts`)

- Recebe `{ agent_id, conversation_id, messages }`
- Carrega `systemPrompt` correto do `AGENTS` (server-side, nunca confiar no client)
- Chama Lovable AI Gateway com `google/gemini-3-flash-preview` e `stream: true`
- Devolve o `response.body` diretamente como `text/event-stream`
- Trata erros 429 (rate limit) e 402 (créditos) com mensagens claras

Mensagens são persistidas: a do usuário antes de chamar a IA, e a do assistente após o stream completar (no client, via `supabase.from('agent_messages').insert`).

---

### 6. Fluxo de Interação

1. Usuário entra em `/dashboard/agentes` → carrega último agente do localStorage (ou SUR como default)
2. Lista da esquerda mostra os 4 agentes com indicador verde online
3. Usuário clica em outro agente → painel direito troca, carrega histórico daquela conversa
4. Usuário digita e envia → mensagem aparece imediatamente, indicador "digitando..." no agente, resposta da IA streama token a token
5. Se for a primeira mensagem com aquele agente → cria registro em `agent_conversations`

---

### Arquivos a criar/editar

- ✏️ `src/routes/dashboard.agentes.tsx` — substitui placeholder por layout 2 colunas
- 🆕 `src/lib/agents.ts` — definição dos 4 agentes
- 🆕 `src/components/agentes/AgentList.tsx`
- 🆕 `src/components/agentes/AgentChatPanel.tsx`
- 🆕 `src/components/agentes/MessageBubble.tsx`
- 🆕 `src/components/agentes/OnlineDot.tsx` — pontinho verde reutilizável
- 🆕 `supabase/functions/agent-chat/index.ts` — streaming AI
- 🆕 Migração SQL: `agent_conversations` + `agent_messages` + RLS
- 📦 `bun add react-markdown` (caso ainda não esteja instalado)

Posso prosseguir com essa implementação?