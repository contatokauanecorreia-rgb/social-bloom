## BLOCO 10 — Integrações de IA em /configuracoes

Adicionar uma nova seção "Integrações de IA" na página de configurações, abaixo do bloco de perfil e antes do bloco de Sessão. A seção é puramente de UI/local (sem persistência no banco neste bloco — apenas estado local + mock de plano), seguindo o padrão dos blocos anteriores.

### Comportamento

- **Plano atual** lido do `user_subscriptions.plan` (já existente). Mapeamento:
  - `starter` / `pro` → campos Premium ficam **bloqueados** (cadeado + tooltip "Disponível no Premium")
  - `premium` (ou superior) → campos liberados
- **3 opções mutuamente exclusivas** via radio group:
  1. **Usar IA da Postly (padrão)** — sempre disponível. Mostra "Créditos mensais incluídos no plano".
  2. **Conectar minha API Key (Premium)** — bloqueada para Starter/Pro. Quando ativa, mostra dois campos:
     - OpenAI (GPT-4) — input type password (API Key)
     - Anthropic (Claude) — input type password (API Key)
  3. **Usar meu agente personalizado (Premium)** — bloqueada para Starter/Pro. Quando ativa, mostra:
     - Assistant ID (input)
     - Aviso: "Requer API Key da OpenAI conectada" (chip de aviso se a opção 2 não estiver com a chave OpenAI preenchida)
- Botão "Salvar integrações" exibe toast "Preferências salvas" (placeholder — sem persistência ainda, alinhado a outros blocos visuais).
- Ícone `Lock` (lucide) sobre cards Premium quando o plano não permite, com `cursor-not-allowed`, opacidade reduzida e badge "Premium".

### UI

- Container: `rounded-xl border bg-card p-6`, título "Integrações de IA" + subtítulo descritivo.
- 3 cards selecionáveis (estilo radio-card) com borda destacada no selecionado (`border-primary`).
- Cada card: ícone (Sparkles / KeyRound / Bot), título, descrição curta, e área condicional de campos.
- Inputs reutilizam `Input` + `Label` do design-system.

### Arquivo modificado

- `src/routes/dashboard.configuracoes.tsx` — adicionar `useEffect` para buscar plano, novo state (`aiMode`, `openaiKey`, `anthropicKey`, `assistantId`) e renderizar a nova `<section>`.

### Imports adicionais

- `KeyRound`, `Bot`, `Sparkles`, `Lock` de `lucide-react`
- nada de novas dependências
