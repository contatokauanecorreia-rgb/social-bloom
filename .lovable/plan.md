## Dashboard estilo Notion + Plano de Conteúdo Kanban por semana

### Visão geral

- **Sidebar fixa à esquerda** (estilo Notion): logo Postly no topo, lista de tópicos (Início, Plano de conteúdo, Carrosséis, Agentes, Configurações) com ícones + labels. Colapsável para modo "ícone".
- **Área central**: cada tópico abre uma página com largura limitada e centralizada (estilo Notion: `max-w-5xl mx-auto px-8 py-10`), título grande no topo e conteúdo abaixo.
- **Modal centralizado** ao clicar em qualquer card de post (Dialog do shadcn) com todos os campos editáveis.

### Estrutura de rotas (TanStack Router)

```
src/routes/
  dashboard.tsx                 → layout (Sidebar + Outlet, guarda de auth)
  dashboard.index.tsx           → /dashboard (boas-vindas + atalhos)
  dashboard.plano.tsx           → /dashboard/plano (Kanban por semana)
  dashboard.carrosseis.tsx      → /dashboard/carrosseis (placeholder)
  dashboard.agentes.tsx         → /dashboard/agentes (placeholder)
  dashboard.configuracoes.tsx   → /dashboard/configuracoes (perfil + sair)
```

### Layout

```text
┌───────────────────────────────────────────────────────────┐
│ [hamb]                                  email   [sair]    │
├──────────┬────────────────────────────────────────────────┤
│ Postly   │                                                │
│          │           ┌──────────────────────────┐         │
│ Inicio   │           │                          │         │
│ Plano    │           │   Conteudo centralizado  │         │
│ Carross  │           │    (max-w-5xl, py-10)    │         │
│ Agentes  │           │                          │         │
│ Config   │           └──────────────────────────┘         │
│          │                                                │
└──────────┴────────────────────────────────────────────────┘
```

### Plano de Conteúdo — Kanban por semana

Página `/dashboard/plano`:

1. **Header**: título "Plano de conteúdo" + botão "Nova semana" + botão "Novo post".
2. **Barra de filtros**:
   - Input de busca por texto (título e conteúdo do card).
   - Chips de **tags** dinâmicos: a barra mostra todas as tags já usadas pelo usuário; clicando em uma chip ela é ativada (toggle) e o quadro filtra para mostrar só cards com aquela tag. Várias chips ativas = filtro AND.
   - Botão "Limpar filtros" quando houver alguma chip ativa.
3. **Quadro Kanban** com rolagem horizontal: uma coluna por semana criada pelo usuário.

#### Coluna (semana)

- Título editável inline (clica e renomeia, ex: "Semana 1", "Lançamento", "Black Friday").
- Menu no header da coluna: Renomear / Excluir semana (com `AlertDialog` de confirmação — exclui também os posts da semana).
- Lista de cards verticalmente.
- Botão "+ Novo post" no fim da coluna.

#### Card

Visual inspirado no anexo:
- Título em negrito.
- Lista de tags coloridas abaixo (cores geradas deterministicamente a partir do texto da tag — assim "Reels" sempre tem a mesma cor).
- Click no card abre **Modal centralizado** com edição completa.

#### Modal "Editar post" (centralizado, estilo Notion)

- Título grande editável (textarea sem borda, autoexpansível).
- **Semana** (Select com semanas existentes + opção "Criar nova").
- **Tags** (input multi-tag livre): usuário digita qualquer texto e pressiona Enter para adicionar. Pode ter quantas quiser. Cada tag aparece como chip removível. Sem lista pré-definida — total liberdade.
- **Notas** (Textarea grande, opcional).
- **Status** (Select: Planejado / Publicado).
- Footer: botão "Excluir" (vermelho, à esquerda) + "Salvar" (à direita).

Salvamento: imediato ao clicar "Salvar" (mostra toast).

### Backend (migrations)

Duas tabelas, ambas com RLS por `user_id`.

**`content_weeks`** — colunas do Kanban
- `id`, `user_id` (NOT NULL), `name` (text NOT NULL), `position` (int NOT NULL — ordena as colunas), `created_at`, `updated_at`.

**`content_posts`**
- `id`, `user_id` (NOT NULL)
- `week_id` (uuid NOT NULL, REFERENCES content_weeks ON DELETE CASCADE)
- `title` (text NOT NULL)
- `tags` (text[] NOT NULL DEFAULT '{}') — array de tags livres
- `notes` (text)
- `status` (text NOT NULL DEFAULT 'planned' CHECK in 'planned','published')
- `position` (int NOT NULL — ordena cards dentro da semana)
- `created_at`, `updated_at`

Policies (ambas tabelas, todas `to authenticated`, `auth.uid() = user_id`):
SELECT, INSERT, UPDATE, DELETE.

Triggers `update_updated_at_column` reaproveitando a função existente.

Index: `(user_id, position)` em `content_weeks`; `(user_id, week_id, position)` em `content_posts`; GIN em `tags` para busca rápida por tag.

### Validação (Zod)

```ts
const weekSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const postSchema = z.object({
  title: z.string().trim().min(1).max(200),
  week_id: z.string().uuid(),
  tags: z.array(z.string().trim().min(1).max(40)).max(15),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(['planned','published']),
});
```

### Componentes a criar

- `src/components/dashboard/AppSidebar.tsx`
- `src/components/dashboard/DashboardTopbar.tsx`
- `src/components/dashboard/PageContainer.tsx` (wrapper centralizado max-w-5xl)
- `src/components/plano/WeekColumn.tsx`
- `src/components/plano/PostCard.tsx`
- `src/components/plano/PostDialog.tsx` (modal de edição)
- `src/components/plano/TagInput.tsx` (input multi-tag livre)
- `src/components/plano/TagChip.tsx` (chip colorido — cor derivada do hash do texto)
- `src/lib/tag-color.ts` (função `tagColor(label)` que devolve classe tailwind a partir de paleta fixa de 8 cores soft)

### Página inicial da dashboard (`/dashboard`)

- Saudação "Olá, {nome}" + 3 cards-resumo (total semanas, total posts planejados, próxima publicação).
- 4 cards de atalho linkando para as subpáginas.

### Configurações (`/dashboard/configuracoes`)

- Editar `display_name`, `avatar_url`. Botão "Sair da conta".

### Notas técnicas

- shadcn `Sidebar`, `Dialog`, `AlertDialog`, `Select`, `Popover`, `Textarea`, `Badge`, `Input`, `Button` (todos já presentes).
- Cores das tags: paleta de 8 (rose, amber, lime, emerald, sky, indigo, violet, fuchsia) com variantes `bg-X-100 text-X-800 dark:bg-X-900/40 dark:text-X-200`. Função `hash(text) % 8` escolhe a cor — mesma tag sempre tem a mesma cor.
- Drag-and-drop **não** está nesta entrega (ordenação será por botões "para cima/baixo" no menu do card). Pode ser adicionado depois.
- Sem edge functions; tudo via supabase client com RLS.

### Fora do escopo

- Drag-and-drop entre semanas (próxima iteração).
- Gerador de carrosséis com IA (próxima).
- Configuração dos agentes 24/7 (próxima).
- Compartilhar quadro / colaboração multi-usuário.