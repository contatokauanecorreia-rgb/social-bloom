## Sistema Visual Criativo para o gerador de carrossel

Adicionar um segundo sistema visual ("criativo") espelhando a arquitetura do sistema minimalista já implementado. Ativado **automaticamente** quando o DNA da marca cruza arquétipo Criador / Fora-da-lei / Bobo / Herói / Mago, ou tom jovem / irreverente / ousado / disruptivo / vibrante, ou segmento marketing / tecnologia / moda / entretenimento / agências / negócios digitais.

Quando uma marca cruza critérios de **ambos** os sistemas, o minimalista vence (já é o mais conservador para perfis que pedem elegância).

---

### 1. Edge function — `supabase/functions/carrossel-generate/index.ts`

**Detector** (depois do bloco `isMinimalist`):

```ts
const creativeArchetypes = ["criador", "fora-da-lei", "bobo", "heroi", "mago"];
const creativeTone = /jovem|irreverente|ousad|disruptiv|vibrante/i;
const creativeSegment = /marketing|tecnolog|moda|entretenimento|ag[êe]ncia|neg[óo]cios?\s*digit|digital/i;
const isCreative = !isMinimalist && (
  creativeArchetypes.includes(archLower) ||
  creativeTone.test(toneLower) ||
  creativeSegment.test(segLower)
);
```

**Apêndice no system prompt** (`creativeAppendix`, anexado quando `isCreative`):
- Regras globais (contraste extremo, títulos gigantes, cor de destaque do DNA = `palette[0]`, máx 2 fontes contrastantes, alinhamento `[ALINHAMENTO]`).
- 5 tipos C1–C5 com função e elementos próprios.
- Regra de alternância: slide 1 = C1 ou C4; 2 e 3 = C2 ou C3; 4 e 5 = C3 ou C4; último = C5; nunca dois iguais consecutivos.
- Elementos gráficos permitidos por tipo (círculo SVG, seta curva, ticker, seta vertical ↓, toggle ⊙→, underline).
- Fontes: Bebas Neue + Inter, Archivo Black + DM Sans, ou Syne + Outfit (se DNA não tiver fonte).
- Campos extras obrigatórios na tool: `sistema: "criativo"`, `tipo`, `fundo`, `palavra_destaque`, `ticker_texto` (só C3), `elemento_grafico`, `nota_visual` (só C1/C3).

`finalSystemPrompt = systemPrompt + minimalistAppendix + creativeAppendix`.

**Tool `build_carousel`** — quando `isCreative`, adicionar propriedades:
- `sistema: { type: "string" }`
- `tipo: { enum: ["C1","C2","C3","C4","C5"] }`
- `fundo: { enum: ["branco","off-white","foto"] }`
- `palavra_destaque: { type: "string" }`
- `ticker_texto: { type: "string" }`
- `elemento_grafico: { enum: ["circulo","seta-curva","ticker","seta-vertical","toggle"] }`
- `nota_visual: { type: "string" }`

**Mapeamento dos slides** (no `slides = parsed.slides.map(...)`): igual ao minimalista. Para C1/C3, `imagePrompt = nota_visual`; para C2/C4/C5, `imagePrompt = ""` (sem foto).

**`SlideOut` type**: estender com `palavra_destaque?: string`, `ticker_texto?: string`, `elemento_grafico?: ...` e `sistema?: "minimalista" | "criativo"` e `tipo` agora aceitando também C1–C5.

**`genOne`**: skip de geração quando `s.sistema === "criativo"` e `s.tipo` ∈ {C2, C4, C5}. Para C1/C3, anexar diretiva extra ao prompt fotográfico: `Composition style: bold editorial, high contrast, vibrant accent color, dynamic energy.`

---

### 2. Wizard — `src/components/studio/CarouselAIWizard.tsx`

Estender o tipo `slidesData` recebido para incluir os campos criativos (`palavra_destaque`, `ticker_texto`, `elemento_grafico`) além dos minimalistas. Nada mais muda — o estado de `alignment` já é enviado.

---

### 3. Editor — `src/routes/dashboard.studio.carrossel.tsx`

**Tipo `Slide`**: estender campos opcionais já existentes:
- `system?: "minimalista" | "criativo"`
- `slideType?: "M1"|"M2"|"M3"|"M4"|"M5" | "C1"|"C2"|"C3"|"C4"|"C5"`
- `bgKind?: "off-white" | "bege-texturizado" | "foto" | "branco"`
- novos: `highlightWord?: string`, `tickerText?: string`, `graphic?: "circulo"|"seta-curva"|"ticker"|"seta-vertical"|"toggle"`

**Bootstrap consumer**: quando `s.sistema === "criativo"`, mapear:
- `slide.system = "criativo"`
- `slide.slideType = s.tipo`
- `slide.bgKind = s.fundo`
- `slide.highlightWord = s.palavra_destaque`
- `slide.tickerText = s.ticker_texto`
- `slide.graphic = s.elemento_grafico`
- Cores: cor de destaque = `palette[0]`. Para C1/C3 com foto, texto branco + sem overlay (C1) ou overlay leve. Para C2 título na cor de destaque, subtítulo preto. Para C5, todo texto na cor de destaque.

**`SlideContent` render**: detectar `slide.system === "criativo"` e:
- Fundo branco/off-white para C2/C4/C5; foto para C1/C3.
- Renderizar `palavra_destaque` no título com:
  - C2: underline bold abaixo do label.
  - C4: círculo SVG ao redor (cor de destaque).
  - C5: bold extra na palavra.
- C3: faixa horizontal no terço inferior com `tickerText` repetido na cor de destaque.
- C4: seta curva manuscrita SVG na cor de destaque + subtítulo deslocado à direita + toggle ⊙→ no rodapé.
- C5: seta vertical ↓ centralizada + seta → no rodapé.
- C1: sem overlay, marca duplicada (canto superior direito + rodapé bold).

Tudo encapsulado em blocos condicionais a `slide.system === "criativo"`. Comportamento legacy e minimalista intactos.

---

### Arquivos editados
- `supabase/functions/carrossel-generate/index.ts`
- `src/components/studio/CarouselAIWizard.tsx`
- `src/routes/dashboard.studio.carrossel.tsx`

Nada mais é alterado: motor fotográfico, sistema minimalista, layout horizontal do editor e demais edge functions permanecem como estão.