# BLOCO 2 — Studio de conteúdo

Substituição completa de `/dashboard/studio`. Remove os 4 agentes (SUR, KIÜKA, KIMO, ROXY) e a interface de chat por uma tela orientada a "modos de criação" com créditos.

## 1. Banco de dados (migrations)

### 1.1 Plano + créditos do usuário
Nova tabela `user_subscriptions`:
- `id uuid pk`
- `user_id uuid unique not null` (uma assinatura por usuário)
- `plan text not null default 'starter'` (`starter` | `pro` | `premium`)
- `credits_used int not null default 0`
- `period_start timestamptz not null default now()` (reseta mensalmente)
- `created_at`, `updated_at`

RLS: usuário só lê/edita a própria linha. Trigger para `updated_at`.
Trigger no `auth.users` (estende `handle_new_user`) para criar a linha do plano `starter` automaticamente.

Limites em código (não no banco):
- `starter` → 20 créditos
- `pro` → 100 créditos
- `premium` → `Infinity` (ilimitado)

### 1.2 Estender briefing com arquétipo + paleta
Adiciona colunas em `client_briefings`:
- `archetype text` (ex: "Cuidador", "Criador", "Sábio"…)
- `palette text[] default '{}'` (até 3 HEX, ex: `{"#E91E63","#FFFFFF","#2D2D2D"}`)

(Campos opcionais; preenchidos no wizard.)

## 2. Wizard de briefing — novo passo "Marca"

`src/routes/dashboard.clientes.$id.briefing.tsx`
- Adiciona um passo entre "Identidade" e "Tom de voz" chamado **"Marca"**:
  - **Arquétipo da marca**: `ChoiceGrid` com 6 opções (Cuidador, Criador, Sábio, Herói, Rebelde, Inocente).
  - **Paleta de cores**: 3 inputs `<input type="color">` com preview e HEX exibido abaixo de cada um.
- `STEPS` passa a ter 6 itens.
- `save()` agora persiste `archetype` e `palette` em `client_briefings`.
- Carrega esses campos no `useEffect` inicial.

## 3. Server functions / edge function

### 3.1 `src/server/credits.functions.ts` (createServerFn)
- `getMyCredits()` → `{ plan, used, limit, remaining }` (lê `user_subscriptions`, lê o plano e calcula limite a partir do mapa de planos).
- `consumeCredits({ amount })` → valida saldo, incrementa `credits_used`, retorna saldo novo. Lança erro se zerar.
Ambas usam `requireSupabaseAuth` middleware.

### 3.2 Edge function `studio-generate`
`supabase/functions/studio-generate/index.ts` — Lovable AI (`google/gemini-3-flash-preview`).
- `verify_jwt = true` (usa sessão).
- Body: `{ mode: "copy", clientId?: string, topic: string }`.
- Backend: monta system prompt usando o briefing do cliente (nome, segmento, tom, arquétipo, dos/donts, objetivo). Chama gateway, retorna `{ content }`.
- 429/402 propagados como toasts no client.
- O cliente (Studio) chama `consumeCredits({ amount: 1 })` ANTES de chamar `studio-generate`. Se gerar erro, devolve crédito (`consumeCredits` aceita amount negativo opcional).

## 4. Tela `/dashboard/studio`

Reescreve `src/routes/dashboard.studio.tsx` do zero (descarta `AgentList`, `AgentChatPanel`, `getAgent` etc — arquivos ficam no projeto, mas não são mais importados por essa rota).

Estrutura visual (mobile-first, design system rosa atual):

```
┌──────────────────────────────────────────────────────────┐
│ Studio de conteúdo               [42 créditos restantes] │
│ Para qual cliente? [▾ Studio Bela Forma]   [▓▓▓░░░ 42%] │
├──────────────────────────────────────────────────────────┤
│ ✦ Contexto ativo                                         │
│ Studio Bela Forma · Saúde e beleza                       │
│ Tom: acolhedor · Objetivo: agendamentos                  │
│ Arquétipo: Cuidador     [#E91E63] [#FFF] [#2D2D2D]      │
│ #autoestima  #rotina  #resultado                         │
├──────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│ │ Copy    │ │Carrossel│ │ Pauta 🔒│ │Roteiro🔒│          │
│ │ 1 cred  │ │ 3 cred  │ │ 5 cred  │ │ 3 cred  │          │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└──────────────────────────────────────────────────────────┘
```

Componentes novos em `src/components/studio/`:
- `CreditsBadge.tsx` — exibe "X créditos restantes este mês" + `<Progress />`. "Ilimitado" para Premium.
- `ClientPicker.tsx` — Select com clientes reais do Supabase (`clients` table) + bloco "Contexto ativo" (puxa `client_briefings` por `client_id`, exibe nome+segmento, tom, objetivo, palavras-chave (`content_pillars`), arquétipo, 3 círculos com HEX da paleta).
- `ModeCard.tsx` — card grande com ícone, título, descrição, custo. Aceita `locked` (ícone cadeado + "Disponível no Pro"). Bloqueado também quando créditos zerados.
- `CreditsExhaustedBanner.tsx` — banner rosa: "Seus créditos acabaram. Faça upgrade para continuar gerando." com botão linkando `/dashboard/plano`.
- `CopyGeneratorDialog.tsx` (modal):
  - Textarea "Sobre o que é esse conteúdo?" + hint.
  - Botão "Gerar copy — 1 crédito" (loading state).
  - Resultado em card com 3 botões: "Copiar" (clipboard + toast), "Regenerar" (consome +1 crédito, chama de novo), "Salvar no planner" (cria post em `content_posts` na primeira semana com `notes` = copy gerada e título derivado do tópico, navega para `/dashboard/planner`).

Lógica do componente raiz:
- `useEffect` carrega: créditos, lista de clientes (Supabase), cliente ativo do `localStorage` (`postly:active-client`).
- Modos `pauta` e `roteiro`: `locked = plan === 'starter'`.
- `carrossel`: clicar → toast "Em breve" (rota `/studio/carrossel` não criada agora).
- `copy`: abre `CopyGeneratorDialog`.
- Após gerar/regenerar com sucesso: refetch dos créditos.
- Se `remaining === 0`: todos os cards ficam desabilitados e mostra `CreditsExhaustedBanner` no topo.

## 5. Limpeza

- Sidebar e rotas existentes mantidas (BLOCO 1 já feito).
- `src/components/agentes/*` e `src/lib/agents.ts` ficam no projeto (não tocam) mas deixam de ser importados pelo Studio. Edge function `agent-chat` segue existindo (para uso futuro).

## 6. Detalhes técnicos

- `studio-generate` lê briefing do cliente via `supabase` autenticado (RLS), monta `systemPrompt` com `archetype`, `palette` (informativa), `toneOfVoice`, `dos`, `donts`, `targetAudience`, `goals`. Garante PT-BR.
- Cobrança de crédito é **server-side** (`consumeCredits` server fn). Cliente nunca confia em valor local — sempre refaz `getMyCredits()` após operação.
- Reset mensal: helper em `getMyCredits` checa se `period_start` foi há mais de 30 dias e reseta `credits_used` + `period_start`.
- `package.json`: nenhuma dependência nova necessária.

## Fora de escopo (BLOCOs futuros)

- Telas reais de carrossel, pauta, roteiro (cards já presentes, mas só copy é funcional agora).
- Cobrança real / integração de pagamento na tela `/plano` — apenas botão "Fazer upgrade" levando para a tela existente.
- Histórico de gerações persistido (cada copy gerada é volátil até "Salvar no planner").

Posso implementar?