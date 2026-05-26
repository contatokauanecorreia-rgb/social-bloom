## Objetivo

No Planner, quando a IA gerar ideias, elas devem ser salvas automaticamente no planner do cliente selecionado, e cada ideia ganha um botão "Usar como legenda" que grava o texto como legenda do post correspondente.

## Decisões assumidas (você pulou as perguntas)

- **Auto-save**: assim que a IA terminar de gerar, cada ideia já é criada como post no planner do cliente (na primeira semana existente). O botão "Adicionar" deixa de ser necessário e é removido. Os cards de ideia passam a mostrar o vínculo com o post criado.
- **Campo legenda**: criar uma coluna nova `caption` (text, nullable) em `content_posts`. O campo `notes` continua existindo para anotações livres; "Usar como legenda" preenche/atualiza `caption`.

## Mudanças

### 1. Banco (`content_posts`)
- Migração: `ALTER TABLE content_posts ADD COLUMN caption text;` (sem mudança de RLS — políticas existentes já cobrem).

### 2. `src/routes/dashboard.planner.tsx`
- Após `setIdeas(json.ideas)`, disparar auto-save: para cada ideia, inserir um `content_post` (status `planned`, na primeira semana do cliente selecionado), guardando o `id` retornado. Mostrar toast único "N ideias adicionadas ao planner".
- Guardar estado `ideaPostIds: Record<number, string>` mapeando índice da ideia → id do post criado.
- Remover o botão "Adicionar" (não é mais necessário) e a função `handleAddIdeaToPlanner`.
- Manter "Gerar carrossel".
- Adicionar botão **"Usar como legenda"** em cada card: faz `update` em `content_posts` setando `caption = "${idea.title}\n\n${idea.description}"` no post correspondente; toast "Legenda salva".
- Tratar caso sem semana: se `weeks.length === 0`, criar automaticamente uma semana padrão ("Semana 1") antes do auto-save, ou exibir aviso e não autossalvar.
- Tratar caso sem cliente selecionado: manter o gate atual (não gerar ideias sem `ideasClientId`).

### 3. Tipos
- `src/integrations/supabase/types.ts` é auto-gerado após a migração — não editar manualmente. Atualizar quaisquer `type ContentPost` locais no arquivo do planner para incluir `caption?: string | null`.

## Fora de escopo
- UI para exibir/editar a legenda nos cards de post do board (pode ser feita em uma próxima iteração). Esta entrega apenas grava o campo.
- Mudar o `CarouselAIWizard` ou o Studio.
