# Padrão de layout + limite de caracteres dos slides

## 1. Padrão visual (igual à referência)

A imagem em anexo define o "layout-mãe" de TODO slide do carrossel, independente do DNA (minimalista / criativo / padrão), do tipo (M1–M5 / C1–C5) e do alinhamento (left/right/center):

- Bloco de texto **encostado nas laterais com margem consistente** de ~7% da largura do slide (não 16% como hoje).
- Bloco **ancorado no canto inferior**, ocupando aproximadamente os 60% inferiores do slide. O título começa por volta de `y = 42%` e o corpo flui para baixo (na referência, assinatura no topo, título no meio-superior do bloco, corpo logo abaixo).
- **Hierarquia tipográfica fixa**:
  - Título: peso 800–900, line-height 1.0, com possibilidade de palavras destacadas em cor de acento (igual hoje).
  - Corpo: peso 400, line-height 1.45, com **espaçamento de parágrafo** (`\n\n` vira `margin-bottom` real) — hoje quebras viram só `pre-wrap` colado.
- **Espaçamento vertical entre blocos** padronizado proporcional ao tamanho do slide (em vez dos 16/12 px fixos atuais):
  - título → subtítulo: `format.w * 0.025`
  - subtítulo → corpo: `format.w * 0.035`
  - parágrafo → parágrafo (dentro do corpo): `format.w * 0.022`
- O alinhamento (left/right/center) muda **apenas** `text-align` e o `align-items` do bloco — a **posição, margens e ritmo vertical permanecem idênticos**.

### Onde mexe no código
`src/routes/dashboard.studio.carrossel.tsx` → função `SlideContent` (linhas ~1819–1899) e constantes `TITLE_TO_SUBTITLE` / `SUBTITLE_TO_BODY` (117/118):
- Trocar `width: format.w * 0.84` por `width: format.w * 0.86` e usar padding lateral fixo via container absoluto com `left/right = format.w * 0.07`.
- Trocar a âncora `top: slide.textPos.y * 100%` + `translate(-50%, -50%)` por bloco ancorado em `bottom: format.w * 0.08` quando `textPos.y >= 0.5`, mantendo o ponto de inserção compatível com o seletor "posição do texto" da sidebar.
- Substituir constantes fixas por valores derivados de `format.w`.
- No `<p>` do body, dividir por `\n\n` e renderizar cada parágrafo como elemento separado com `margin-bottom` proporcional (mantendo `\n` simples como quebra de linha dentro do parágrafo).

Esse layout vale também para os tipos M1–M5 e C1–C5 — eles continuam adicionando seus elementos (label, tags, ticker, decor) sobrepostos, mas o **bloco principal de texto usa o mesmo padrão**.

## 2. Limites de caracteres

Regra única, aplicada por slide, contando espaços e quebras de linha:
- Slide **sem título** (`title === ""`): `subtitle + body ≤ 369` chars
- Slide **com título**: `title + subtitle + body ≤ 422` chars

### Onde aplica

**a) Geração por IA** — `supabase/functions/carrossel-generate/index.ts`
Adicionar ao `systemPrompt` (após "REGRAS ABSOLUTAS", ~linha 298) uma seção dura:

```
LIMITES DE CARACTERES POR SLIDE (regra absoluta, contando espaços e quebras):
- Slide SEM título: a soma de subtítulo + corpo NÃO pode passar de 369 caracteres.
- Slide COM título: a soma de título + subtítulo + corpo NÃO pode passar de 422 caracteres.
- Esses limites valem para todos os tipos (M1–M5, C1–C5) e todos os DNAs.
- Se a ideia não couber, corte adjetivos e advérbios — nunca ultrapasse.
```

E adicionar **truncamento defensivo** no parsing dos slides retornados (perto da linha 526), para garantir mesmo se o modelo desobedecer:

```ts
function enforceLimit(s: { title: string; subtitle: string; body: string }) {
  const hasTitle = s.title.trim().length > 0;
  const limit = hasTitle ? 422 : 369;
  // se ultrapassar, encurta o body preservando título e subtítulo
  // ...
}
```

**b) Editor manual** — `src/routes/dashboard.studio.carrossel.tsx`
- Mostrar contador `123 / 422` (ou `/ 369`) abaixo do slide ativo, na sidebar de texto.
- Estado vermelho quando passar do limite.
- Não bloquear digitação (só sinalizar) — o usuário pode estar reorganizando.

## 3. Resumo dos arquivos editados

- `src/routes/dashboard.studio.carrossel.tsx` — `SlideContent` (layout padronizado), constantes de espaçamento, contador de caracteres no painel lateral.
- `supabase/functions/carrossel-generate/index.ts` — regra de limite no prompt + truncamento defensivo.

## 4. O que NÃO muda

- Posição da assinatura (canto), label/tags/ticker/decor dos sistemas minimalista e criativo.
- Cores, fontes, paleta, palavra de destaque, círculo SVG do C4, etc.
- Engine de imagem (FLUX.2 [klein]) — segue como está.
