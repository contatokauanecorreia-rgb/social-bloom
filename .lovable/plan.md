## Causa

A função `supabase/functions/carrossel-generate/index.ts` usa o modelo `google/gemini-3-flash-preview` (preview, instável) com `tool_choice` forçado e schema rígido (`additionalProperties: false`, vários campos opcionais). Nessa combinação, o modelo às vezes devolve `tool_calls[0].function.arguments` com o array `slides` no tamanho certo, mas com `title`, `subtitle` e `body` todos vazios.

Isso explica:

- Logs mostram `slides: 5, fallback: false` — o array existe.
- Pré-vias do wizard aparentam ter texto porque o card de prévia usa o fallback de UI `s.title || \`Slide ${i+1}\`` (linha 1363 de `CarouselAIWizard.tsx`) e oculta o corpo quando `s.body` está vazio. Ou seja, o usuário vê "Slide 1 / Slide 2 / Slide 3" mesmo quando os textos vieram em branco.
- No editor, `slide.text.title/subtitle/body` ficam `""`, então não renderiza nada — só o fundo estilizado (que vem de `s.sistema` / `s.fundo`, esses sim populados pelo servidor a partir dos PRESETS, independente da IA).

## Mudanças

### 1. `supabase/functions/carrossel-generate/index.ts`

- Trocar o modelo `google/gemini-3-flash-preview` por `google/gemini-2.5-flash` (estável, suporta tool calls de forma confiável e é o modelo usado nas outras funções do projeto).
- Logar o tamanho de `tool_calls[0].function.arguments` e uma amostra do primeiro slide retornado, para confirmar conteúdo bruto.
- Após o parse, detectar "slides estruturalmente vazios" (todos os slides com `title`, `subtitle` e `body` simultaneamente em branco) e, nesse caso, cair em `fallbackSlides(topic, clientName, slideCount)` — exatamente como já é feito quando `parsed.slides.length === 0`.
- Marcar `textFallback = true` nesse caminho para que o `meta.fallback` chegue ao cliente refletindo a realidade.

### 2. `src/components/studio/CarouselAIWizard.tsx` (linha ~1363)

Pequeno ajuste de UX para evitar repetir o problema no futuro: na prévia do `VariantPreviewCard`, quando `s.title` está vazio, mostrar um placeholder visualmente discreto (ex.: `"(sem título)"` em cor `muted`) em vez de `\`Slide ${i + 1}\``. Assim, quando a IA falhar de novo, a falha fica visível no próprio wizard antes do usuário ir para o editor.

## Fora de escopo

- Não muda o schema do tool, o consumidor do editor (`dashboard.studio.carrossel.tsx`), banco, RLS ou pacotes.
- Não mexe no fluxo de geração de imagens (que já está funcionando — o log mostra `done_fal`).

## Como validar

1. Abrir o wizard, gerar um carrossel com qualquer cliente.
2. Conferir nos logs do edge function (`carrossel-generate`) a nova linha de diagnóstico — `arguments` deve ter tamanho > 200 chars e o `firstSlide` deve ter `title`/`body` preenchidos.
3. No editor, os 5 slides devem aparecer com título e corpo escritos pela IA.
4. Forçar o caminho fallback (ex.: simular resposta vazia) e confirmar que aparecem os textos genéricos do `fallbackSlides`, em vez de slides em branco.
