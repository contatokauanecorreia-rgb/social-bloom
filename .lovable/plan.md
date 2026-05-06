## Trocar engine de imagem para FLUX.2 [klein]

Sim, dá para trocar. O FLUX.2 [klein] da Black Forest Labs já está disponível na FAL (mesma `FAL_API_KEY` que usamos hoje), em duas variantes:

- `fal-ai/flux-2/klein/9b` — qualidade maior, **$0.006 / megapixel**
- `fal-ai/flux-2/klein/4b` — mais rápido/barato, **$0.005 / megapixel**

Recomendo **9B** para carrossel editorial (melhor realismo, texto mais nítido, edição nativa). É um upgrade real sobre o FLUX 1.1 pro atual.

### O que muda na prática

Tudo acontece em **um único arquivo**: `supabase/functions/_shared/fal-image.ts`. O resto do pipeline (`carrossel-image`, `carrossel-generate`, sanitização de prompt, anti-blank, fallback) continua igual.

Mudanças no `generateWithFal`:

1. **Endpoint**: `https://fal.run/fal-ai/flux-pro/v1.1` → `https://fal.run/fal-ai/flux-2/klein/9b`
2. **Aspect ratio 4:5**: o klein não tem enum `portrait_4_3` que case com 4:5; vou passar `image_size: { width: 1024, height: 1280 }` para 4:5 nativo (antes mapeávamos para `portrait_4_3` que era 3:4). Os outros (1:1, 9:16) continuam via enum.
3. **Remover params não suportados**: `safety_tolerance` e `output_format: "jpeg"` não existem nesse schema (output padrão é PNG; podemos manter `output_format: "jpeg"` que é aceito).
4. **Manter**: `enable_safety_checker: false`, detecção de NSFW, heurística anti-blank, conversão para data URL base64 — tudo continua valendo.

### Onde o usuário vê

- Label na UI (`CarouselAIWizard.tsx` e `CarouselModeDialog.tsx`) hoje diz "Midjourney". Posso:
  - **(a)** manter "Midjourney" (fachada, como combinamos antes), ou
  - **(b)** trocar para "FLUX.2 [klein]" para refletir a engine real.

### Custo / latência esperados

- 1 imagem 4:5 (1024×1280 ≈ 1.3 MP) no 9B ≈ **~$0.008/imagem**.
- Carrossel de 8 slides ≈ **~$0.06**.
- Latência típica do klein é menor que a do FLUX 1.1 pro (modelo destilado, ~4 inference steps default).

### Riscos

- FLUX.2 klein é destilado e otimizado — em geral melhora pele/luz/composição editorial, mas pode ter "estilo" levemente diferente do 1.1 pro. Se você não gostar, reverter é trocar a URL do endpoint de volta.
- O `num_inference_steps` default é 4 (rápido). Se quisermos mais detalhe, podemos subir para 6–8 (custo de latência, mesmo preço por MP).

### Perguntas antes de implementar

1. **Variante**: 9B (qualidade) ou 4B (mais barato/rápido)?
2. **Label na UI**: manter "Midjourney" ou mostrar "FLUX.2 [klein]"?

Se você só responder "vai", eu sigo com **9B + label "FLUX.2 [klein]"**.