## Plano — Seletor "Para qual cliente?" + Contexto ativo

Adicionar o seletor de cliente nas duas superfícies de criação que existem hoje (Studio de agentes e Gerar carrosséis), reusando um componente único. Sem backend, dados mock compartilhados, design system existente.

### Arquivos novos

**1. `src/lib/client-context.ts`** — fonte única dos briefings mock.
```ts
export type ClientBriefing = {
  id: string; name: string; segment: string;
  toneOfVoice: string; objective: string;
  keywords: string[]; alwaysUse: string[]; neverUse: string[];
};
export const CLIENT_BRIEFINGS: ClientBriefing[] = [
  { id: "studio-bela-forma", name: "Studio Bela Forma", segment: "Saúde e beleza",
    toneOfVoice: "Acolhedor e especialista", objective: "Atrair agendamentos de avaliação",
    keywords: ["autoestima","rotina","resultado real"],
    alwaysUse: ["você","cuidado","transformação"],
    neverUse: ["milagre","barato","promoção relâmpago"] },
  { id: "restaurante-folha-verde", name: "Restaurante Folha Verde", segment: "Alimentação",
    toneOfVoice: "Casual e afetivo", objective: "Aumentar reservas no fim de semana",
    keywords: ["fresco","do dia","feito à mão"],
    alwaysUse: ["nosso","casa","sabor"],
    neverUse: ["industrial","fast food","congelado"] },
  { id: "academia-forcaviva", name: "Academia ForçaViva", segment: "Fitness",
    toneOfVoice: "Energético e direto", objective: "Captar matrículas para a próxima turma",
    keywords: ["evolução","constância","comunidade"],
    alwaysUse: ["bora","treino","meta"],
    neverUse: ["preguiça","desistir","impossível"] },
];
export function getClientBriefing(id: string | null | undefined) { /* find by id */ }
```
Os IDs batem com os mocks já usados em `dashboard.clientes.index.tsx`.

**2. `src/components/clientes/ClientContextBar.tsx`** — componente reutilizável.
- Topo: label "Para qual cliente?" + `<Select>` (shadcn) com opção "Sem cliente (genérico)" + 3 clientes do mock.
- Quando há cliente selecionado, renderiza um card destacado:
  - Borda `border-primary/30`, fundo `bg-gradient-primary-soft`.
  - Header com ícone `Sparkles` + texto "Contexto ativo · a IA vai usar este briefing".
  - Nome do cliente + `Badge` do segmento.
  - Grid responsivo (`sm:grid-cols-3`) com **Tom de voz**, **Objetivo**, **Palavras-chave** (chips).
  - Linha extra (sm:grid-cols-2): **Sempre usar** (chips emerald) e **Nunca usar** (chips rose).
- Prop `variant="compact"` reduz padding e omite o bloco "sempre/nunca usar" — usado no header do Studio onde o espaço é menor.
- Props: `value: string | null`, `onChange: (id: string | null) => void`, `variant?`.

### Arquivos editados

**3. `src/routes/dashboard.studio.tsx`** — adicionar barra de contexto entre o header e o `AgentChatPanel` no layout desktop (e acima do select de agente no mobile).
- Estado local `const [clientId, setClientId] = useState<string | null>(null)`.
- Persistir em localStorage com chave `postly:active-client` (mesmo padrão do `STORAGE_KEY` do agente).
- Inserir `<ClientContextBar value={clientId} onChange={setClientId} variant="compact" className="border-b bg-card/40 px-5 py-3" />` no topo da `<main>`, antes do `AgentChatPanel`.
- O `AgentChatPanel` continua intacto (sem mudança de assinatura). O contexto é apenas visual nesta etapa — a integração real com a edge function fica para depois (registrado como TODO em comentário).

**4. `src/routes/dashboard.carrosseis.tsx`** — substituir o conteúdo placeholder mantendo `PageHeader` e mensagem "em construção", com a barra de contexto acima:
```tsx
<PageContainer>
  <Badge variant="soft" className="mb-3 w-fit">Em breve</Badge>
  <PageHeader title="Gerar carrosséis" description="Geração automática de carrosséis com IA." />
  <ClientContextBar value={clientId} onChange={setClientId} className="mb-6" />
  <div className="rounded-xl border border-dashed ..."> ...placeholder existente... </div>
</PageContainer>
```
Mesmo padrão de localStorage (`postly:active-client`) para que a escolha sincronize entre Studio e Carrosseis.

### O que NÃO muda
- `AgentChatPanel`, `AgentList`, `AgentAvatar`, edge function `agent-chat`, schema do banco — nenhum toque.
- Sidebar, rotas existentes, cards de cliente do hub.
- Nenhuma migração nem nova dependência (usa `@/components/ui/select` já presente).

### Responsividade
- Seletor e card empilham em mobile (`flex-col` → `sm:flex-row`).
- Grid interno do briefing colapsa para 1 coluna no mobile.

### Acessibilidade / i18n
- Todos os textos em pt-BR.
- Label associado ao select; placeholder e itens em pt-BR; opção "Sem cliente (genérico)".
