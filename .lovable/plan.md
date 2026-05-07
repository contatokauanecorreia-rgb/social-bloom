## Objetivo

Refazer a seção "Imagens no carrossel" do `CarouselAIWizard` para mostrar **12 princípios de design de conteúdo** como cartões visuais selecionáveis (multi-seleção), corrigir o bug do espaço em branco no carrossel de previews, e mapear corretamente as cores dos retângulos nas previews. Os princípios escolhidos passam a guiar a geração visual dos slides no backend.

## Escopo

### 1. `src/components/studio/CarouselAIWizard.tsx`

**Cores das previews (semântica nova):**
- Preto `#1A1A1A` → imagens (placeholder de foto)
- Cinza escuro `#4B5563` → títulos / textos maiores (substitui os retângulos atualmente pretos que representam títulos)
- Cinza claro `#D1D5DB` → textos menores / corpo

**Substituir `GRID_LAYOUTS` por `DESIGN_PRINCIPLES` (12 itens)** com SVG preview 4:5 cada:

1. Espaço em Branco — muito respiro, título pequeno centralizado
2. Contraste — bloco preto grande + texto claro pequeno
3. Proporção — título XL ocupando 2/3, corpo 1/3
4. Hierarquia — título grande, subtítulo médio, corpo pequeno empilhados
5. Ênfase — palavra destacada em bloco preto cercada por texto cinza
6. Equilíbrio — coluna de imagem + coluna de texto simétricas
7. Alinhamento — tudo alinhado à esquerda em grid rígido
8. Harmonia — imagem suave de fundo + bloco de texto pequeno
9. Margens — moldura grossa branca, conteúdo concentrado no centro
10. Direcionalidade (Z/L) — diagonal: título topo-esq → imagem → CTA base-dir
11. Variedade — mosaico misto: imagem + 2 blocos de texto de tamanhos diferentes
12. Ritmo — 3 faixas horizontais alternando imagem / texto / imagem

Cada item: `{ id, label, preview(colors) }` (sem `mode`, derivado pela presença de retângulos pretos no layout).

**Estado:**
- Trocar `gridLayout: GridLayoutId` + `gridIndex` por `selectedPrinciples: string[]` (ids).
- Default: 3 primeiros (`espaco-branco`, `contraste`, `hierarquia`) para já atender o mínimo.
- `imageMode` e `aiImages` derivados: `aiImages = selectedPrinciples.length > 0 && algumPrincípioContémImagem` (princípios 1, 3, 7, 9 são apenas texto; os demais incluem imagem). `imageMode = "mixed"` quando há mistura.

**Validação:**
- `canContinueStep1` exige `selectedPrinciples.length >= 3`.
- Limite superior: `Math.min(slideCount, 10)`. Se o usuário reduzir `slideCount` abaixo do total selecionado, truncar do fim.
- Mensagem inline: "Selecione no mínimo 3 e até {slideCount} princípios" (vermelha quando < 3, neutra caso contrário).

**Layout do seletor (corrige o espaço em branco):**
- Usar grid rolável horizontal sem o truque `translateX(calc(50% - ...))` que causa o vão branco quando o item ativo é o primeiro.
- Estrutura: `<button arrow-left/> <div overflow-x-auto flex gap-3 snap-x/> <button arrow-right/>` — a seta esquerda chama `scrollBy({ left: -240 })`, a direita `scrollBy({ left: 240 })`.
- Seta direita já existe; garantir que ambas estejam visíveis nos extremos (sem desabilitar) e posicionadas em lados opostos com `justify-between`.
- Cards passam a mostrar um check no canto quando selecionados (toggle), borda primária quando ativo.
- Dots inferiores removidos (não fazem sentido em multi-seleção); substituir por contador `"{selecionados}/{slideCount} princípios"`.

**Envio ao backend (`handleGenerate`):** trocar `gridLayout` por `designPrinciples: selectedPrinciples` no payload e no `bootstrap` salvo em `sessionStorage`.

### 2. `supabase/functions/carrossel-generate/index.ts`

- Aceitar `designPrinciples?: string[]` no `Body` (manter `gridLayout` por compat, ignorado).
- Quando presente, anexar ao `systemPrompt` um bloco "PRINCÍPIOS VISUAIS APLICADOS" que mapeia **um princípio por slide** (cíclico se houver menos princípios que slides), instruindo a IA a escolher `tipo`, `fundo`, `elemento_grafico`, `palavra_destaque` coerentes com o princípio daquele slide. Tabela curta no prompt: id → diretriz visual (ex.: "ritmo: alternar imagem/texto entre slides", "ênfase: usar `palavra_destaque` em bloco preto", etc.).
- Devolver `meta.designPrinciples` para o editor saber qual princípio rege cada slide.

### 3. `src/routes/dashboard.studio.carrossel.tsx`

- Ler `designPrinciples` do bootstrap (sem alterar o renderer ainda — a influência principal vem via prompt). Apenas remover dependência de `gridLayout`.

## Detalhes técnicos

- Constante `PRINCIPLE_COLORS = { image: "#1A1A1A", title: "#4B5563", body: "#D1D5DB" }` reutilizada em todas as previews.
- Princípios "só texto" (sem `image`): `espaco-branco`, `proporcao`, `alinhamento`, `margens`. Os demais têm pelo menos um retângulo preto.
- Util `togglePrinciple(id)` com guarda de teto `selectedPrinciples.length < Math.min(slideCount, 10)` antes de adicionar.
- Quando `slideCount` muda para baixo: `useEffect` trunca `selectedPrinciples` para no máximo `slideCount`.

## Arquivos

- `src/components/studio/CarouselAIWizard.tsx` (refatora seção)
- `supabase/functions/carrossel-generate/index.ts` (novo bloco de prompt)
- `src/routes/dashboard.studio.carrossel.tsx` (apenas remover leitura obsoleta)
