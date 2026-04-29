## Filtro por cliente no Planner

Adicionar seletor "Para qual cliente?" no topo de `/planner`, filtrando semanas/posts por cliente sem alterar o visual atual de colunas.

### Como o cliente é associado a um post

A tabela `content_posts` não tem coluna `client_id` hoje, e a ferramenta de migração de schema não está disponível nesta sessão. Para evitar bloqueio, o vínculo será armazenado como **marcador invisível** no campo `notes` que já existe:

```
[[client:<uuid>]]
<conteúdo de notas normal>
```

Helpers em `src/lib/content-types.ts` extraem/aplicam esse marcador, expondo um `client_id` virtual no objeto `ContentPost`. Quando o usuário editar um post no diálogo, ele só verá as notas reais (o marcador é removido na leitura e adicionado de volta no save).

> Quando a ferramenta de migração estiver disponível, dá pra promover esse marcador para coluna real `client_id uuid REFERENCES clients(id) ON DELETE SET NULL` sem perder dados — basta ler todos os posts, extrair o marcador e gravar na coluna nova.

### Mudanças

**`src/lib/content-types.ts`**
- Adicionar `client_id?: string | null` (virtual) ao `ContentPost`.
- Helpers `extractClientId(notes)`, `encodeNotesWithClient(clientId, notes)`, `withClientId(post)`.

**`src/routes/dashboard.planner.tsx`**
- Carregar `clients` (id, name) do usuário em paralelo com weeks/posts.
- Após carregar `posts`, mapeá-los por `withClientId` para popular `client_id`.
- Estado `selectedClient: string` ("all" por padrão).
- Renderizar seletor "Para qual cliente?" como um `Select` shadcn no topo (acima do `<PageHeader />`), com opções "Todos os clientes" + lista do hub.
- `filteredPosts`: aplica filtro de cliente antes de search/tags.
- Quando "Todos" selecionado: cards mostram chip colorido com nome do cliente (cor estável derivada do uuid).
- Quando um cliente específico está ativo: ocultar chip (já está implícito), demais filtros funcionam normalmente.
- `openNewPost`: passa `selectedClient` (se específico) como `defaultClientId` ao `PostDialog`.
- `handleSavePost`: usa `encodeNotesWithClient(value.client_id, value.notes)` para gravar; lê de volta com `withClientId` para atualizar o estado.
- `handleDuplicatePost`: preserva o marcador do original (notes já vem encoded).

**`src/components/plano/PostDialog.tsx`**
- Adicionar prop `clients: { id: string; name: string }[]` e `defaultClientId?: string`.
- Estado novo `clientId: string | null`.
- Hidratar do `post.client_id` ou `defaultClientId` ao abrir.
- Adicionar `Select` "Cliente" ao lado de Semana/Status (grid de 3 colunas em sm).
- `PostDialogValue` ganha `client_id: string | null`.
- Persistir no autosave/draft junto com os demais campos.

**`src/components/plano/PostCard.tsx`**
- Aceitar prop opcional `clientName?: string` e `clientColor?: string`.
- Quando presente, renderizar chip pequeno (`px-2 py-0.5 rounded-full text-[10px] font-medium`) abaixo do título com fundo `clientColor` em opacidade leve e texto colorido. Cor derivada determinística do `client_id` (hash → hue HSL).

**`src/components/plano/WeekColumn.tsx`**
- Repassa props `getClientName`, `getClientColor` (ou objeto `clientsMap`) para `PostCard`.
- Quando `selectedClient !== "all"` o `WeekColumn` recebe um flag `showClientChip={false}` para ocultar.

### Comportamento esperado

- Seletor padrão = "Todos os clientes" → comportamento atual + chip de cliente nos cards.
- Selecionar um cliente específico → semanas continuam visíveis (visual idêntico), apenas posts filtrados; chip do cliente some (redundante).
- "Novo post" com cliente específico ativo → diálogo abre com cliente já selecionado.
- "Novo post" com "Todos" → cliente vazio (usuário escolhe no dropdown).
- Dnd, busca, tags continuam funcionando normalmente.

### Limitações conhecidas

- Posts antigos não têm marcador → aparecem como "sem cliente"; o usuário pode atribuir editando.
- O filtro depende do marcador estar correto no `notes`; o helper é tolerante se ausente.
