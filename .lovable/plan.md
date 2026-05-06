## Problema

A interface diz "Nano Banana Pro", mas o backend gera imagens via **FAL/FLUX 1.1 Pro**, não via Google Nano Banana. Isso causa:

1. **Texto nas imagens** — FLUX desenha letras/palavras mesmo com prompt negativo. Nano Banana respeita "no text" bem melhor.
2. **Imagens pretas/falhando** — safety checker do FAL devolve PNG preto sólido como "sucesso" para conteúdo editorial legítimo. As gambiarras atuais (desligar safety, detectar blank, fallback) tratam o sintoma, não a causa.

Logs confirmam: `[carrossel-image] done_fal` — FAL é o caminho primário.

## Solução

Trocar o provedor primário de imagem para **Google Nano Banana via Lovable AI Gateway** (modelos `google/gemini-3-pro-image-preview` para "pro" e `google/gemini-3.1-flash-image-preview` para versão rápida). Usa `LOVABLE_API_KEY` (já configurado), zero chave nova.

## Mudanças

### 1. `supabase/functions/_shared/lovable-image.ts` (NOVO)
Nova função `generateWithNanoBanana(prompt, { apiKey, model, aspectRatio })` que:
- Chama `https://ai.gateway.lovable.dev/v1/chat/completions` com `modalities: ["image","text"]`.
- Modelo padrão: `google/gemini-3-pro-image-preview`.
- Extrai `data:image/...;base64,...` de `choices[0].message.images[0].image_url.url`.
- Reaproveita `isLikelyBlankImage` como guarda extra.
- Trata 429/402 (rate limit / créditos) com log claro e retorna null para fallback.

### 2. `supabase/functions/carrossel-image/index.ts`
- Importa `generateWithNanoBanana`.
- Ordem nova de tentativa:
  1. Nano Banana (Lovable AI) — primário.
  2. FAL/FLUX — fallback se Nano Banana falhar (mantém código atual).
  3. Gemini 2.5 flash-image — último recurso (já existe).
- Mantém `looksLikeCopyNotImagePrompt` + `fallbackVisualPrompt` + `sanitizeImageNote` (essas validações continuam úteis).

### 3. `supabase/functions/carrossel-generate/index.ts`
Mesma troca de ordem (Nano Banana primeiro, FAL fallback).

### 4. `src/components/studio/CarouselAIWizard.tsx` e `CarouselModeDialog.tsx`
Texto da UI já diz "Nano Banana Pro" — agora vai ser verdade. Sem mudança de UI necessária.

### 5. Deploy
Deploy de `carrossel-image` e `carrossel-generate`.

## Resultado esperado

- Imagens **sem texto inventado** (ponto forte do Nano Banana).
- **Sem mais imagens pretas** do safety checker do FAL.
- Mesma chave (`LOVABLE_API_KEY`), nada para o usuário configurar.
- FAL continua disponível como fallback se Nano Banana ficar fora do ar ou rate-limitado.
