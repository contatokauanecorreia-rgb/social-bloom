## BLOCO 11 — Sistema de Planos em /plano

Substituir a página atual (que mostra apenas "Postly Free") por uma comparação de 3 planos (Starter, Pro, Premium) com seleção real conectada ao banco. Manter os blocos de "Forma de pagamento" e "Histórico de cobrança" abaixo dos cards.

### Comportamento

- Carregar `user_subscriptions.plan` do usuário logado para identificar o plano atual.
- Renderizar 3 cards lado a lado (md:grid-cols-3, empilhados no mobile):
  - **Starter** — R$37/mês — 7 features
  - **Pro** — R$87/mês — destaque "Mais popular" (borda primary + badge gradient) — 5 features
  - **Premium** — R$197/mês — ícone de coroa — 5 features
- Cada card mostra: nome, tagline curta, preço grande, lista de features com checkmark, botão de ação.
- Card do plano atual exibe badge "Plano atual" e botão desabilitado com texto "Plano atual".
- Demais cards: botão "Escolher {Plano}" que faz `upsert` em `user_subscriptions` (`{ user_id, plan }` com `onConflict: "user_id"`), atualiza estado local e dispara toast de sucesso.

### Conteúdo dos planos (textual)

**Starter — R$37/mês**
- Clientes ilimitados
- Hub de clientes completo
- DNA da marca completo
- Portal de aprovação visual
- Studio: Criar copy + Criar carrossel
- 20 créditos de IA/mês
- Cola conteúdo manual sem limite

**Pro — R$87/mês** (Mais popular)
- Tudo do Starter
- Studio: todos os modos desbloqueados
- 100 créditos de IA/mês
- Planner de conteúdo
- Precificação guiada

**Premium — R$197/mês**
- Tudo do Pro
- Créditos ilimitados
- Conecta API Key própria
- Conecta agente personalizado
- Workspace para times (em breve)

### UI

- Cards: `rounded-2xl border bg-card p-6 shadow-sm`. Pro recebe `border-primary shadow-primary` + badge flutuante `-top-3 left-6` com gradient. Plano atual ganha `border-primary/50` (quando não é o Pro) + badge `-top-3 right-6`.
- Botão do Pro usa `bg-gradient-primary shadow-primary` quando não é o atual.
- Premium: ícone `Crown` em amber ao lado do nome.

### Arquivo modificado

- `src/routes/dashboard.plano.tsx` — reescrever conteúdo (mantém `head()`, `PageContainer`, `PageHeader`).

### Imports

- `useEffect`, `useState` de react
- `Check`, `Sparkles`, `CreditCard`, `Crown` de lucide-react
- `supabase`, `toast`, `cn` (já disponíveis no projeto)

Sem novas dependências, sem mudanças de schema (a tabela `user_subscriptions` já tem a coluna `plan`).
