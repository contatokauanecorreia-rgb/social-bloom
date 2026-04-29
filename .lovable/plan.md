## Escopo

Reestruturar o fluxo de criação de carrossel adicionando uma escolha "manual vs IA" e um wizard de 2 passos antes do editor. Manter 100% do editor atual e apenas (a) reorganizar a ordem das seções do painel esquerdo, (b) adicionar a seção "Layout & Posição" (grid 3x3) que mapeia para o `textPos` já existente, e (c) permitir que o editor seja iniciado pré-preenchido pelos slides gerados pela IA.

Arquivos tocados:
- `src/routes/dashboard.studio.tsx` — abrir modal de escolha em vez de navegar direto.
- `src/components/studio/CarouselModeDialog.tsx` (novo) — modal "Manual / IA".
- `src/components/studio/CarouselAIWizard.tsx` (novo) — wizard 2 passos + loading.
- `src/routes/dashboard.studio.carrossel.tsx` — aceitar slides iniciais via `sessionStorage`, reordenar painel, adicionar grid 3x3 e ajustes de pesos por campo.
- `supabase/functions/carrossel-generate/index.ts` (novo) — gera roteiro JSON de slides + opcional imagens Nano Banana Pro.
- `supabase/config.toml` — registrar nova função.

Nada é tocado fora do Studio.

---

## 1. Tela inicial — modal "Manual / IA"

`dashboard.studio.tsx`: o `onClick` do `ModeCard` "Criar carrossel" passa a abrir `CarouselModeDialog` (novo) em vez de navegar. O guard de cliente selecionado fica no próprio dialog.

`CarouselModeDialog` (shadcn `Dialog`):
- Dois cards lado a lado: **Criar manualmente** (ícone `Hand`) → `navigate("/dashboard/studio/carrossel")`. **Criar com IA** (ícone `Sparkles`) → abre `CarouselAIWizard`.
- Estado controlado pelo pai (`carouselFlow: "closed" | "choose" | "ai"`).

## 2. Wizard IA — Passo 1 "Configurar IA"

Componente `CarouselAIWizard` num `Dialog` grande (max-w-2xl), com `step` interno (`1 | 2 | "loading"`).

Passo 1 — campos:
- `topic` — `Textarea` "Sobre o que é o conteúdo?", placeholder do enunciado.
- `moodboard` — botão de upload (`<input type="file" accept="image/*">`); preview com remove. Arquivo só fica em memória; **não** subimos pra storage neste passo (usado só como referência visual no preview do wizard; opcional como prompt para Nano Banana).
- `slideCount` — contador 1..10 com botões `←`/`→`, default 5.
- `imageMode` — 4 cards radio: `none | bg | grid | mixed` (Sem imagens / Só fundo / Só grade / Intercalar).
- `aiImages` — `Switch` "Gerar imagens com IA (Nano Banana Pro)".

Botão **Continuar →** valida `topic.trim().length > 0` e avança.

## 3. Wizard IA — Passo 2 "Personalizar"

Carregar DNA do cliente ativo (mesmo fetch que o editor faz: `client_briefings.palette, brand_font, brand_font_url, archetype`) ao entrar no passo 2.

Campos:
- `instagram` — `Input` "@seuperfil".
- **Combinação de fontes**:
  - Se `dna.brand_font` existe → 1 card "Sua fonte" pré-selecionado, mostrando família atual em peso 700/400.
  - Senão → 6 cards de combinações fixas mapeadas pelo arquétipo do briefing:
    ```
    sofisticado/governante:  Playfair Display + DM Sans
    cara-comum/bobo:         Syne + Outfit
    sabio:                   Oswald + Inter
    cuidador/inocente:       Raleway + Lato
    criador/mago:            Space Grotesk + Fraunces
    heroi/fora-da-lei:       Bebas Neue + Inter
    ```
  - Cada card carrega as fontes via `loadGoogleFont` ao montar e mostra "Aa Título" (peso 700) + "Texto do corpo" (peso 400).
  - Se o arquétipo não está no mapa, exibimos as 6 combinações na ordem acima.
- **Paleta**: se `dna.palette` existe → mostra os 3 swatches já selecionados. Senão → 3 paletas sugeridas (tabela fixa por arquétipo, cada uma com 3 cores) e o usuário escolhe uma.

Botão **Gerar carrossel ✦** dispara o passo loading.

## 4. Loading + chamada à edge function

Ao clicar Gerar:
- Trocar para `step="loading"`. Modal mostra `Loader2` girando + título "Gerando conteúdo..." + subtítulo + barra de progresso (`Progress` shadcn). Progresso é simulado em 4 estágios (10/40/70/95) e finalizado em 100 quando a resposta chega — é o padrão do app, não há streaming aqui.
- POST `supabase.functions.invoke("carrossel-generate", { body })`.

Edge function `supabase/functions/carrossel-generate/index.ts` (replica o padrão de `studio-generate`):
- Body: `{ clientId, topic, slideCount, imageMode, aiImages, fontPair, palette, instagram }`.
- Carrega briefing (mesmos campos de studio-generate) com cliente autenticado para respeitar RLS.
- Monta system prompt com arquétipo + tom + DNA + segmento e força tool-calling JSON:
  ```
  tools: [{ type:"function", function:{
    name:"build_carousel",
    parameters:{ type:"object", properties:{
      slides:{ type:"array", items:{ type:"object", properties:{
        title:{type:"string"}, subtitle:{type:"string"}, body:{type:"string"},
        imagePrompt:{type:"string"}
      }, required:["title","subtitle","body","imagePrompt"]}}
    }, required:["slides"]}
  }}]
  tool_choice: { type:"function", function:{ name:"build_carousel" } }
  ```
  Modelo: `google/gemini-3-flash-preview`.
- Se `aiImages === true` e `imageMode !== "none"`: para cada slide, chama Lovable AI com `model: "google/gemini-3-pro-image-preview"`, `modalities:["image","text"]`, prompt = `${slide.imagePrompt}. Estilo da marca: ${arquétipo}. Segmento: ${segmento}.` + opcional moodboard se enviado como base64. Faz as N chamadas em sequência (não paralelo) para evitar rate limit. Retorna `data:image/png;base64,...` em `slides[i].imageDataUrl`.
- Trata 429/402 e devolve mensagem para o front.
- Resposta: `{ slides: [{title, subtitle, body, imageDataUrl?}, ...] }`.

Tratamento "Nano Banana Pro": usamos `google/gemini-3-pro-image-preview` via Lovable AI Gateway (já documentado no projeto). O texto do enunciado menciona `nanobanana.im/api`, mas o gateway nativo é mais seguro (sem chave externa) e produz imagens equivalentes; o front anuncia "Nano Banana Pro" como label.

Após sucesso, o wizard:
1. Monta `Slide[]` aplicando o template do editor (`makeSlide`), preenchendo `text.title/subtitle/body` e `bgImage = imageDataUrl ?? null` quando `imageMode` pedir imagem de fundo. Para `imageMode === "grid"` ou `"mixed"`, gravamos a imagem num campo separado consumido pela seção "Grade de imagens" já existente (não há grid ainda no editor — ver §5).
2. Persiste em `sessionStorage` sob chave `studio:carrossel:bootstrap`: `{ slides, fontPair, palette, signature:{ enabled: !!instagram, handle: instagram, position:"br", color: palette[0] } }`.
3. `navigate({ to: "/dashboard/studio/carrossel" })` e fecha o modal.

## 5. Editor: bootstrap + reorganização do painel

`dashboard.studio.carrossel.tsx`:

**Bootstrap**: no mount, ler `sessionStorage["studio:carrossel:bootstrap"]`. Se existir, popular `slides`, sobrescrever `dna.palette` quando o wizard escolheu paleta sugerida, aplicar `signature` em todos os slides e chamar `loadGoogleFont` para as duas famílias do `fontPair`. Limpar a chave após consumir. Se não existir bootstrap → comportamento atual (1 slide vazio).

**Reordenação do painel** em `EditorPanel`. Nova ordem das seções:
1. **Layout & Posição** — grid 3x3 de botões (`SUP.ESQ ... INF.DIR`) que setam `textPos` para `{x: col/2, y: row/2}` com col,row ∈ {0,1,2}; cada botão fica destacado quando bate com a posição atual (com tolerância 0.1). O drag livre existente continua funcionando.
2. **Alinhamento** — 3 botões (Esq/Centro/Dir). Aplica em `textAlign` dos três campos de uma vez (atalho global) — os controles por campo já existentes seguem disponíveis dentro de cada `TextFieldRow`.
3. **Título** / **Subtítulo** / **Texto do corpo** — `TextFieldRow` existentes (com autocomplete do planner no título).
4. **Imagem de fundo** — upload + preview + sliders X/Y de posição da imagem + slider de zoom + botão "Aplicar também na grade". Adicionar a `Slide` os campos `bgPos:{x:number,y:number}` (0..1, default 0.5/0.5) e `bgZoom:number` (1..3, default 1) e usar em `SlideContent` via `backgroundPosition: ${x*100}% ${y*100}%; background-size: ${zoom*100}%`.
5. **Sombra/Overlay** — já existe.
6. **Grade de imagens** — `Switch` "Mostrar grade". Quando ligado e o slide tem `bgImage`, renderiza uma sobreposição decorativa de mosaico no canto direito (3 thumbs). É um layout opcional, não substitui o fundo. Adicionar campo `grid:{ enabled:boolean }`.
7. **Fonte** — exibe a fonte do DNA OU a combinação escolhida no wizard (`fontPair` salva em `Slide`-independente, num estado de página `pageFont:{ heading, body } | null`); sliders de peso para título/subtítulo/corpo (já existem como selects → trocamos por `Slider` 300..700 step 100 mantendo o estado `fontWeight` atual).
8. **Cores** — swatches já existentes.
9. **Assinatura** — já existe; ganha pré-preenchimento via bootstrap.

Outras seções (export, formato) continuam fora do painel esquerdo, sem mudanças.

**Tipo Slide adicional** (defaults retrocompatíveis em `makeSlide`):
```ts
bgPos: { x: 0.5, y: 0.5 }
bgZoom: 1
grid: { enabled: false }
```

## 6. Geração de imagem (Nano Banana Pro)

Já descrito em §4. Front exibe label "Nano Banana Pro"; backend usa `google/gemini-3-pro-image-preview` no gateway. Cada slide recebe `bgImage = data:image/png;base64,...`. O usuário pode trocar pelo upload manual depois (fluxo atual de upload já trata `bgImage` como string).

## Detalhes técnicos

- Toda comunicação com IA passa por edge function (cliente nunca chama o gateway direto).
- `sessionStorage` foi escolhido em vez de query params/state global porque o payload pode conter imagens base64 grandes; chave consumida e removida ao montar o editor.
- Imagens base64 em `bgImage` já são suportadas pela renderização atual (`backgroundImage: url(...)`); para o export ZIP/`html-to-image` o navegador trata data URLs nativamente.
- `Progress` durante loading é simulado client-side; a função não streama. Se preferir, pode-se trocar por barra indeterminada em iteração futura.
- Tratamento de erro: 429 → toast "Muitas requisições"; 402 → toast "Créditos esgotados"; outros → toast genérico, mantém o wizard aberto no passo 2 para retry.
- Fontes do wizard são carregadas via `loadGoogleFont` para o preview dos cards.
- A grid 3x3 não substitui o drag — apenas oferece "snap" em 9 posições.

## Fora do escopo

- Histórico de carrosséis IA, salvar moodboard em storage, edição de prompt por slide, regenerar imagens individualmente.
- Fluxo manual: continua exatamente igual ao atual (modal "Manual" navega direto).
- `/dashboard/studio` cards de Copy/Pauta/Roteiro: sem mudanças.
