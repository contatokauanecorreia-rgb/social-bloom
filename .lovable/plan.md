## Ajustes no seletor de princípios de design

Em `src/components/studio/CarouselAIWizard.tsx`, na seção "Princípios de design":

### 1. Mostrar exatamente 5 cards visíveis por vez
- O wrapper de cada card passa de `width: 100` para usar `flex-basis` calculado: `width: calc((100% - 4 * 12px) / 5)` (5 cards + 4 gaps de `gap-3`).
- Cards mantêm `aspect-[4/5]` para a preview e o label embaixo.

### 2. Setas internas, redondas, com hold-to-scroll (anexos 4 e 5)
- Remover as duas setas externas (`ChevronLeft`/`ChevronRight` ao redor do trilho).
- Adicionar duas setas redondas pequenas **sobrepostas** ao trilho:
  - `<button>` absoluto à esquerda (top centralizado, `left-1`) com `ChevronLeft`.
  - `<button>` absoluto à direita (`right-1`) com `ChevronRight`.
  - Estilo: `h-9 w-9 rounded-full bg-background/95 border border-border shadow-md`, fundo branco, ícone discreto — igual aos anexos 4/5.
- Comportamento de **arrastar segurando**:
  - `onMouseDown` / `onTouchStart` inicia um `requestAnimationFrame` loop que chama `scrollLeft += 6` (esq: `-= 6`) por frame.
  - `onMouseUp`, `onMouseLeave`, `onTouchEnd` cancelam o loop.
  - Helper `useHoldScroll(direction)` retornando handlers para evitar duplicação.
- Esconder seta esquerda quando `scrollLeft === 0`; esconder direita quando atingiu o fim. Usar listener `onScroll` no trilho para atualizar dois booleans `canScrollLeft`/`canScrollRight`.

### 3. Limpeza visual
- Remover `scroll-smooth` (atrapalha o scroll contínuo).
- Garantir `overflow-x-auto` + scrollbar oculta (já feita).
- Container externo passa a ser `relative` para conter as setas absolutas.

### Sem mudanças em backend, lógica de seleção, validação (3..N), ou previews.

Arquivo único: `src/components/studio/CarouselAIWizard.tsx`.
