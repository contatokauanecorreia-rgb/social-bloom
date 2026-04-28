## Objetivo

Permitir arrastar os cards de post entre as colunas (semanas) do Planner de conteúdo, com reordenação dentro da mesma semana — comportamento estilo Notion/Trello, com persistência no banco.

## Biblioteca

Adicionar **`@dnd-kit/core`**, **`@dnd-kit/sortable`** e **`@dnd-kit/utilities`** (padrão moderno, acessível, suporta teclado e toque, funciona bem com shadcn). Não há lib de DnD instalada hoje.

## Mudanças

### 1. `src/components/plano/PostCard.tsx`
- Tornar o card "sortable": usar `useSortable({ id: post.id })`.
- Aplicar `transform`, `transition`, `setNodeRef` e listeners de arraste no botão.
- Estado visual durante o drag: opacidade reduzida + leve elevação (sombra/anel).
- Manter o `onClick` para abrir o `PostDialog` (clique simples continua editando; o DnD usa um `activationConstraint` de distância de 6px para não conflitar).

### 2. `src/components/plano/WeekColumn.tsx`
- Envolver a lista de posts em `<SortableContext items={postIds} strategy={verticalListSortingStrategy}>`.
- Tornar a coluna inteira um "droppable" (via `useDroppable` no container da lista) para permitir soltar em colunas vazias.
- Destaque visual quando um card está sobre a coluna (ex.: borda primária + fundo levemente tingido).

### 3. `src/routes/dashboard.plano.tsx`
- Envolver o board em `<DndContext>` com:
  - sensores: Pointer (distância 6px) + Keyboard.
  - `collisionDetection: closestCorners`.
  - `onDragStart` → guarda o `activeId` para mostrar `DragOverlay` com o card "fantasma".
  - `onDragOver` → se o item entrou em outra coluna, faz update otimista do `week_id` localmente para o card seguir o cursor entre colunas.
  - `onDragEnd` → calcula a ordem final, atualiza `position` de todos os afetados e persiste.
- `DragOverlay` renderiza uma cópia do `PostCard` levemente rotacionada/elevada enquanto arrasta.

### 4. Persistência (Supabase)
- Após `onDragEnd`, recomputar `position` (0..n) de todos os posts da(s) coluna(s) afetada(s).
- Atualizar em paralelo via `Promise.all` de `supabase.from("content_posts").update({ week_id, position }).eq("id", ...)` para cada item alterado (apenas os que mudaram de posição ou semana).
- Em caso de erro: reverter o estado local para o snapshot anterior e mostrar `toast.error`.
- Update **otimista**: a UI atualiza instantaneamente; o banco sincroniza em background.

### 5. Compatibilidade com filtros
- DnD fica desabilitado quando há filtro de busca/tag ativo (`hasFilters === true`) — reordenar com lista filtrada gera ambiguidade de `position`. Mostrar tooltip discreto: "Limpe os filtros para reordenar".

## Detalhes técnicos

```tsx
// dashboard.plano.tsx (esqueleto)
<DndContext
  sensors={useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )}
  collisionDetection={closestCorners}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  {weeks.map(w => <WeekColumn ... />)}
  <DragOverlay>{activePost && <PostCard post={activePost} onClick={() => {}} />}</DragOverlay>
</DndContext>
```

```tsx
// onDragEnd — calcula nova posição e persiste só o que mudou
const moved = posts.filter(p => snapshot.find(s => s.id === p.id && (s.position !== p.position || s.week_id !== p.week_id)));
await Promise.all(moved.map(p =>
  supabase.from("content_posts").update({ week_id: p.week_id, position: p.position }).eq("id", p.id)
));
```

## Fora do escopo
- Arrastar **colunas (semanas)** para reordenar — fica para um próximo passo se quiser.
- Multi-seleção de cards.

Posso implementar?