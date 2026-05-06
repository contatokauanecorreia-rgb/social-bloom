
## Objetivo

Remover por completo o Google Nano Banana e o Gemini flash-image do pipeline de imagens do carrossel. A partir desta mudança, **toda imagem do carrossel virá exclusivamente do FLUX 1.1 Pro (FAL)**. Se o FLUX falhar, o slide simplesmente fica sem imagem (em vez de cair para um modelo de qualidade inferior que estava puxando o resultado para baixo).

Motivação: comparando a imagem gerada no app (look "básico", iluminação chapada, textura de pele plástica) com o padrão FLUX (editorial, foto realista, profundidade), está claro que o fallback Nano Banana estava entrando em parte das gerações e contaminando a qualidade média.

## O que vou mudar

### 1. `supabase/functions/carrossel-image/index.ts`
- Remover o `import { generateWithNanoBanana } from "../_shared/lovable-image.ts"`.
- Remover os blocos de fallback Nano Banana Pro e Gemini 2.5 flash-image.
- Manter apenas a chamada `generateWithFal(...)` como única engine.
- Se o FLUX retornar `null` (falha técnica, blank image, etc.), responder com `{ imageDataUrl: null }` para o cliente tratar como "regenerar manualmente".
- Atualizar logs: só `done_fal` ou `fal_failed_no_fallback`.
- Manter intactas as proteções `looksLikeCopyNotImagePrompt`, `sanitizeImageNote`, `fallbackVisualPrompt`.

### 2. `supabase/functions/carrossel-generate/index.ts`
- Remover o `import { generateWithNanoBanana } from "../_shared/lovable-image.ts"`.
- No loop de `imageJobs`, remover os dois fallbacks (Nano Banana Pro e Gemini flash-image).
- Manter `generateWithFal(...)` como única engine.
- Quando o FLUX falhar, deixar o slide sem imagem (campo de imagem vazio) em vez de cair em outro modelo.
- Logs: só `image_done_fal` e `image_failed_fal_no_fallback`.

### 3. `supabase/functions/_shared/lovable-image.ts`
- Apagar o arquivo (não será mais usado por nenhuma função).

### 4. Verificação
- Conferir via `rg` que não sobrou nenhuma referência a `generateWithNanoBanana`, `lovable-image.ts`, `gemini-3-pro-image-preview` ou `gemini-2.5-flash-image` no projeto.

## Resultado esperado

- 100% das imagens do carrossel passam a vir do FLUX 1.1 Pro.
- Nada de "estética Nano Banana" misturada nos resultados — a qualidade média sobe e fica consistente.
- Quando o FLUX falhar pontualmente em um slide, esse slide fica sem foto e você pode regenerar — o que é melhor do que entregar uma imagem fraca.
- Toda a lógica anti-texto-na-imagem e anti-imagem-preta continua intacta.

## Riscos / trade-offs

- **Sem fallback** = se o FAL_API_KEY estourar limite ou der instabilidade, alguns slides virão sem imagem na hora. Aceitável dado o objetivo de qualidade.
- Se mais tarde você quiser um fallback, dá para reintroduzir um modelo melhor (ex.: outro endpoint do FAL como FLUX dev/schnell), mas **nunca** o Nano Banana.
