Aplicar upgrade de ultrarrealismo no FLUX 2 [pro].

Mudanças:

1) `supabase/functions/_shared/fal-image.ts`
   - Substituir `qualityGuard` por linguagem de fotografia real:
     "Shot on Sony A7R V with 85mm f/1.4, dramatic directional lighting with soft fill and rim light, Kodak Portra 400 color grading, rich saturated colors, deep contrast, tack-sharp eyes with catchlight, visible skin pores, subsurface scattering, fine fabric weave, genuine micro-expressions, ultra-detailed 8K, high micro-contrast, true-to-life skin tones." + guards anti-deformidade (5 dedos, sem membros extras, sem rostos derretidos, sem pele plástica/airbrush).
   - Detecção de já-aplicado passa a usar marcador "Shot on Sony A7R V".
   - `num_inference_steps`: 30 → 40
   - `guidance_scale`: 3.5 → 4.5
   - Mantém endpoint `fal-ai/flux-2-pro`, aspect, safety checker off, JPEG.

2) `supabase/functions/carrossel-image/index.ts`
   - Limpar a string `fullPrompt` para remover termos que achatam a imagem ("instagram feed aesthetic", "soft directional lighting" como default, "shallow depth with smooth bokeh") e deixar o tom cinematográfico realista por padrão. Profundidade rasa só quando o slide pedir retrato.
   - Manter remoção de texto/letras na cena.

3) Sem mudanças em layout, limites de caracteres, DNA ou frontend.

4) Deploy de `carrossel-image` e teste visual de um carrossel real.

Resultado esperado: pele com poros, olhos vivos, cores saturadas e contraste cinematográfico — sem perder os anti-deformidade.