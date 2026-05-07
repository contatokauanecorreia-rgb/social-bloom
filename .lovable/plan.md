## Objetivo

Hoje a geração de slides bifurca o conteúdo em dois "DNAs" (minimalista M1–M5 / criativo C1–C5) detectados automaticamente do briefing, e os princípios escolhidos pelo usuário entram apenas como "diretriz extra". O usuário quer o oposto: **os princípios selecionados são a única fonte de verdade do layout**. Cada slide vira a tradução literal do card que ele escolheu (preto = imagem, cinza escuro = título, cinza claro = corpo). Se ele combina 2 princípios, alterna entre os dois; se combina 5, gera 1 de cada (ou cicla até atingir N slides).

## Mudanças

### 1. Backend — `supabase/functions/carrossel-generate/index.ts`

**Remover** a detecção automática `isMinimalist` / `isCreative` e os blocos `minimalistAppendix` / `creativeAppendix` inteiros (linhas ~210–418). Não há mais "DNA minimalista" nem "DNA criativo" distinto — só princípios.

**Substituir** `PRINCIPLE_GUIDE` por um mapa de **layout estrutural** que descreve exatamente o que cada card de preview mostra. Exemplo:

```
"contraste": {
  layout: "imagem ocupa 60% do topo (fundo preto/foto), texto ocupa 40% inferior em fundo branco",
  hasImage: true,
  imagePosition: "top",
  textBlocks: ["title-medium", "body-small"],
}
"proporcao": {
  layout: "dois retângulos grandes de título empilhados ocupando 50% do slide; corpo curto abaixo",
  hasImage: false,
  textBlocks: ["title-xl", "title-xl", "body-small"],
}
"espaco-branco": {
  layout: "fundo branco liso, título curto e centralizado no meio, corpo curto abaixo, muito respiro",
  hasImage: false,
  textBlocks: ["title-medium-center", "body-small-center"],
}
```

(12 entradas, uma por princípio, todas refletindo exatamente o SVG de preview já existente em `CarouselAIWizard.tsx`.)

**Reescrever `principlesAppendix`** como bloco principal e obrigatório:

- Para cada slide `i`, escolher `principio = designPrinciples[i % designPrinciples.length]`.
- Instruir o modelo a produzir **um slide por princípio na ordem**, com:
  - `imagePrompt` preenchido SE `hasImage = true`, vazio caso contrário.
  - Densidade do texto coerente com `textBlocks` (ex. proporção → título dobrado, corpo curto; espaço-branco → 1 título de 5 palavras + 1 linha de corpo).
- Manter os limites de caracteres já existentes (369/422).

**Tool schema** simplificada: remover `sistema`, `tipo` (M*/C*), `palavra_destaque`, `ticker_texto`, `elemento_grafico`, `elemento_decorativo`, `tags`, `label`, `nota_visual`. Manter apenas:

```
{ title, subtitle, body, imagePrompt, principio }
```

Onde `principio` é o id do princípio aplicado naquele slide (necessário para o renderer escolher o layout).

**Geração de imagem**: substituir as travas `if (s.sistema === "minimalista" && tipo M1/M2/M3) skip` por `if (!PRINCIPLE_LAYOUT[s.principio].hasImage) skip`.

**Meta de resposta**: continuar enviando `designPrinciples`, e adicionar a sequência aplicada por slide (`principlesPerSlide: string[]`).

### 2. Renderer — `src/routes/dashboard.studio.carrossel.tsx`

No bootstrap (linhas ~243–317):

- Remover toda a lógica de `if (s.sistema === "minimalista")` / `if (s.sistema === "criativo")`.
- Em vez disso, mapear `s.principio` para um preset de slide que reproduz o card de preview:
  - **contraste** → `bgKind: "foto"` ocupando 60% topo, texto branco/preto embaixo, overlay opcional.
  - **proporcao** → `bgKind: "branco"`, sem foto, dois títulos empilhados grandes.
  - **espaco-branco** → `bgKind: "branco"`, padding generoso, título centralizado.
  - **hierarquia** → 3 níveis (título, subtítulo médio, corpo) alinhados à esquerda.
  - **enfase** → highlight em palavra do título (reaproveitar `highlightWord` que já existe).
  - **equilibrio** → 2 colunas (imagem + texto).
  - **alinhamento** → tudo rigidamente alinhado conforme `alignment`.
  - **harmonia** → foto suave de fundo + caixa de texto pequena coerente com paleta.
  - **margens** → padding extra-largo, conteúdo central.
  - **direcionamento** → leitura em Z (título topo-esq, corpo base-dir).
  - **variedade** → mosaico (texto + tag + decoração).
  - **ritmo** → densidade alternada com vizinhos (denso se vizinho leve e vice-versa).

Os campos auxiliares (`textColor`, `overlay`, `fontWeight`, `bgKind`) continuam existindo no Slide — só mudamos o **dispatcher** que decide os valores.

A propriedade `Slide.system` / `Slide.slideType` (M*/C*) pode ficar como legacy; passamos a usar uma nova `Slide.principle?: string` lida pelo renderer principal (linhas ~1576+ e ~1843+ que hoje fazem `slideType === "C1"` etc.).

Nas seções que usam `slideType === "C*"` no JSX do canvas, substituir por checagens equivalentes em `slide.principle` (ex.: bloco do ticker C3 vira `principle === "direcionamento"`; círculo C4 vira `principle === "enfase"`).

### 3. Wizard — `src/components/studio/CarouselAIWizard.tsx`

Sem mudanças visuais grandes (UI já está pronta). Apenas:

- Remover o estado/derivação `imageMode`/`aiImages` baseada em "principle hasImage" se ela ainda enviar `none` quando todos os princípios são sem imagem — passamos a enviar `aiImages: any principle.hasImage` e `imageMode: "mixed"` para que o backend decida slide a slide.
- Remover do payload qualquer referência a `gridLayout` legado que ainda exista.

### 4. Limpeza

- Apagar do tipo `Body` (backend) e do bootstrap (frontend) os campos órfãos: `gridLayout`, `sistema`, `tipo` M*/C* (manter por 1 release como opcional para retrocompat de drafts salvos? — **não**, o draft salvo no editor já materializou cores/imagens; só o wizard precisa do novo schema).
- Remover constantes `minimalistArchetypes`, `creativeArchetypes`, `COR_DESTAQUE` se não usado em outro lugar.

## Resultado esperado

Quando o usuário marca **Contraste + Proporção** e pede 4 slides:
- Slide 1: Contraste (foto 60% topo + título/corpo embaixo)
- Slide 2: Proporção (2 títulos enormes empilhados)
- Slide 3: Contraste (cicla)
- Slide 4: Proporção (cicla)

O texto continua respeitando briefing/tom/limites; apenas o **layout** vira reflexo direto do princípio escolhido, sem nenhuma mistura com M1–M5 ou C1–C5.

## Arquivos editados
- `supabase/functions/carrossel-generate/index.ts`
- `src/routes/dashboard.studio.carrossel.tsx`
- `src/components/studio/CarouselAIWizard.tsx`
