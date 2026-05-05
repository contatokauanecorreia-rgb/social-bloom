## Objetivo

Substituir a construção do prompt de imagem na edge function `carrossel-generate` por um motor de raciocínio fotográfico estruturado (em inglês), mantendo todo o resto intacto.

## Arquivo único alterado
`supabase/functions/carrossel-generate/index.ts`

## Mudança pontual (linhas 373-378)

Hoje:
```ts
const archetypeStr = briefing?.archetype ? `Brand archetype: ${briefing.archetype}.` : "";
const segStr = segment ? `Segment: ${segment}.` : "";

const genOne = async (i: number): Promise<string | null> => {
  const s = slides[i];
  const prompt = `${s.imagePrompt}. ${archetypeStr} ${segStr} Editorial, ... vertical 4:5 composition.`;
```

Será substituído por uma função `buildImagePrompt(slide)` que monta o prompt em inglês na ordem exigida:

```
[IMAGE TYPE] [SUBJECT & ACTION] [ENVIRONMENT & CONTEXT]
Visual style: <ESTILO_IMAGENS>
Lighting: <coerente, natural ou motivada>
Camera/lens/angle: <inferido pelo tipo de cena: medium-format / 35mm / portrait prime / cinema camera>
Depth of field: <coerente com a lente>
Color palette: <CORES do DNA>
Mood/Narrative: <derivado do title/body do slide>
Reference cues: <só se houver referência: composition, light behavior, framing, depth, environment, palette, styling>
Quality: high optical sharpness, fine detail rendering, natural skin micro texture, visible pores, realistic photography clarity, professional photography, 2K resolution
Negative: no text, no letters, no typography, no captions, no watermark, no logo, no blurry skin, no plastic skin, no over-smoothed face, no AI skin smoothing, no texture loss
Aspect: vertical 4:5
Brand context: segment <SEGMENTO>, archetype <ARQUETIPO>
```

Onde:
- `[IMAGE TYPE] [SUBJECT & ACTION] [ENVIRONMENT & CONTEXT]` ← `slide.imagePrompt` (já vem em inglês do tool-call)
- `<ESTILO_IMAGENS>` ← variável `ESTILO_IMAGENS` já definida acima na função
- `<CORES>` ← `briefing?.palette` (lista) ou string vazia
- `<SEGMENTO>` / `<ARQUETIPO>` ← `segment` / `briefing?.archetype`
- Câmera/lente: heurística simples sobre `slide.imagePrompt` (palavras-chave `portrait` → 85mm prime; `street` → 35mm; `editorial`/`fashion` → medium-format; `cinematic`/`film` → cinema camera; default → 50mm full-frame). Sem expor lógica ao usuário.
- Referência: incluída só se `referenceImageDataUrl` existir.

## Regras aplicadas no prompt final
- Sempre em inglês
- Sem texto/letras/logos/marcas d'água na imagem
- Sem expressões sugestivas/sensuais (descrições editoriais neutras)
- Iluminação coerente, cena fotograficamente plausível
- Sempre inclui: `natural skin texture, high optical sharpness, realistic photography clarity, 2K resolution`
- Sempre evita (lista negativa): `blurry skin, plastic skin, over-smoothed face, AI skin smoothing, texture loss`
- Nunca pede 8K
- Mantém `vertical 4:5`

## O que NÃO muda
- Nada fora do bloco `genOne` interno (linhas ~373-378).
- Modelo da imagem (`google/gemini-3-pro-image-preview`), modalities, deadline, paralelismo, fallback, padding, system prompt do texto, tool-call, parsing, headers CORS, etc.
- Nenhum outro arquivo.
- Sem logs do prompt construído (não exposto ao usuário).
