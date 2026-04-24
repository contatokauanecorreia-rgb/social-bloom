## Objetivo
Quando a resposta de qualquer agente contiver palavras-chave relacionadas a ideias de conteúdo (`carrossel`, `ângulo`, `ideia`, `conteúdo`, `título`, `direção`), exibir, **apenas no último balão** daquela resposta, dois CTAs:

- **✦ Criar carrossel com KIÜKA** → grava `postly:last-agent = "kiuka"` no `localStorage` e navega para `/dashboard/agentes` (a página já restaura o agente salvo e abre o chat com a KIÜKA).
- **📅 Adicionar ao Planner** → navega para `/dashboard/plano` (rota já existente; `/planner-de-conteudo` não existe).

## Mudanças

### 1. `src/components/agentes/MessageBubble.tsx`
- Adicionar prop opcional `actions?: React.ReactNode` renderizada **abaixo** do conteúdo do balão (apenas para `role === "assistant"`).
- Manter API e estilos atuais inalterados.

### 2. Novo arquivo `src/components/agentes/IdeaActions.tsx`
- Componente client com dois `Button` (variant `outline`, size `sm`, `rounded-full`):
  - **✦ Criar carrossel com KIÜKA** — `onClick`: `localStorage.setItem("postly:last-agent", "kiuka")` + `navigate({ to: "/dashboard/agentes" })` + `router.invalidate()` para forçar o efeito de restauração rodar de novo (caso já esteja na rota).
  - **📅 Adicionar ao Planner** — `onClick`: `navigate({ to: "/dashboard/plano" })`.
- Usa `useNavigate` de `@tanstack/react-router`.
- Layout: `flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40`.

### 3. `src/components/agentes/AgentChatPanel.tsx`
- Adicionar helper puro no topo do arquivo:
  ```ts
  const IDEA_KEYWORDS = /\b(carross[eé]is?|[âa]ngulos?|ideias?|conte[úu]do|t[íi]tulos?|dire[çc][ãa]o)\b/i;
  const hasIdeaKeywords = (text: string) => IDEA_KEYWORDS.test(text);
  ```
- Na renderização da lista de mensagens, calcular o índice do **último balão assistant** da resposta atual e, se o `content` desse balão casar com `IDEA_KEYWORDS`, passar `<IdeaActions />` para a prop `actions` do `MessageBubble` correspondente.
  - Implementação: percorrer `messages` e identificar o último item com `role === "assistant"`. Renderizar `IdeaActions` somente nele (independente do agente atual — escopo confirmado pelo usuário).
- Não exibir os CTAs enquanto `streaming === true` ainda estiver entregando chunks subsequentes — só após o ciclo de chunks terminar (i.e., quando o último item da lista deixou de receber novos irmãos). Como cada chunk vira um novo balão e o último balão da resposta é sempre o "último assistant" no array, basta ocultar os CTAs enquanto `streaming === true`.

## Detalhes de UX
- Match de palavras-chave é **case-insensitive** e cobre variações comuns (plurais, acentos): `carrossel/carrosséis`, `ângulo/angulos`, `ideia/ideias`, `conteúdo/conteudo`, `título/titulos`, `direção/direcao`.
- CTAs aparecem **apenas no último balão assistant** e **só após o streaming terminar**.
- Funcionam para qualquer agente (não só SUR), conforme decidido.

## Sem alterações em
- `supabase/functions/agent-chat/index.ts`
- `src/lib/agents.ts`
- Banco de dados / RLS
- `dashboard.plano.tsx` (já existe)

## Validação manual após implementar
1. No chat com SUR, fazer pergunta que gere resposta com "ideias" ou "ângulos" → CTAs aparecem **só no último balão**.
2. Clicar em "Criar carrossel com KIÜKA" → vai para `/dashboard/agentes` com KIÜKA selecionada.
3. Clicar em "Adicionar ao Planner" → vai para `/dashboard/plano`.
4. Resposta sem palavras-chave (ex: SUR fazendo pergunta de descoberta como "O que você faz hoje?") → **sem CTAs**.