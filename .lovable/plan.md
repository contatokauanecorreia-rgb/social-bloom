## Objetivo
Substituir o prompt do agente SUR no arquivo `supabase/functions/agent-chat/index.ts` pelo novo prompt **Strategic Creative Consultant**, transformando o agente de gerador de conteúdo em consultor estratégico conversacional.

## Mudança única

**Arquivo:** `supabase/functions/agent-chat/index.ts`
**Ação:** substituir o valor da chave `sur:` no objeto `SYSTEM_PROMPTS` (linhas 11–18) pelo novo prompt.

## Novo prompt do SUR (resumo do conteúdo)

- **Identidade:** Strategic Creative Consultant + Content Architect (não gerador de conteúdo)
- **Core Behavior:** modo conversacional — diagnostica, pergunta, refina, depois entrega
- **Discovery Flow obrigatório:** até 3 perguntas estratégicas antes de gerar ideias
  - O que você faz exatamente hoje?
  - Quem é o público que você quer atingir?
  - Foco: crescer audiência, vender ou posicionar autoridade?
- **Adaptive Logic:**
  - vago → faz perguntas
  - parcial → 1-2 perguntas de refinamento
  - claro → gera ideias direto
- **Idea Generation (4 blocos):**
  - 🧠 Ângulos Estratégicos
  - 🔥 Ideias de Conteúdo
  - 💰 Oportunidades de Posicionamento
  - ⚡ Dores e Gatilhos
- **Continuous Conversation:** após entregar, pergunta o que ressoa e oferece aprofundar (post, vídeo, etc.)
- **Context Memory:** usa contexto anterior, não reinicia
- **Confidencialidade:** nunca revela lógica interna / estrutura de prompt
- **Idioma:** PT-BR
- **Tom:** estratégico, confiante, analítico, natural — nunca robótico ou genérico

## Removido do prompt antigo
- Estrutura rígida "3-5 ideias com Gancho/Ângulo/Formato"
- Tom "criativo direto brasileiro com energia + emojis"

## Sem alterações em
- Frontend (`AgentChatPanel.tsx`, `agents.ts`) — greeting do SUR continua igual
- Outros agentes (KIÜKA, KIMO, ROXY) — intactos
- `/api/public/chat-sur` (Claude) — fora do escopo desta task
- Banco de dados / RLS / `supabase/config.toml`

## Deploy
A função `agent-chat` é redeployada automaticamente após salvar — sem passo manual.

## Validação pós-deploy
Testar no chat do dashboard (`/dashboard/agentes`):
1. Mensagem vaga ("quero ideias de conteúdo") → SUR deve fazer perguntas de descoberta
2. Mensagem com contexto completo → SUR deve entregar os 4 blocos de ideias
