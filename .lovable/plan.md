## Diagnóstico real

Os logs do gateway (analytics) mostram que as últimas chamadas a `carrossel-generate` retornam **504 após ~150s** (`execution_time_ms: 150090`). Não é "92% de progresso" — é o **timeout do gateway de Edge Functions** (150s). A causa é o loop de imagens em `supabase/functions/carrossel-generate/index.ts`: ele chama `google/gemini-3-pro-image-preview` **sequencialmente para cada slide** (5 a 10 chamadas, cada uma de 15–30s). Total > 150s → 504.

Observações importantes:
- O timeout do gateway é **fixo em 150s** — não é configurável via `config.toml`. "Aumentar para 60s" na verdade pioraria; o que precisamos é **ficar abaixo de 150s** e ter fallback.
- O texto do carrossel é gerado em ~5–10s (rápido). O gargalo é só a geração de imagem.

## Mudanças (somente em `supabase/functions/carrossel-generate/index.ts`)

### 1. Logs detalhados no início, meio e fim

```ts
const t0 = Date.now();
console.log("[carrossel-generate] start", { slideCount, imageMode, aiImages, hasClient: !!clientId });
// ... após texto:
console.log("[carrossel-generate] text_done", { ms: Date.now()-t0, slides: slides.length });
// ... antes/depois de cada imagem:
console.log("[carrossel-generate] image_start", { i, ms: Date.now()-t0 });
console.log("[carrossel-generate] image_done", { i, ok, ms: Date.now()-t0 });
// ... fim:
console.log("[carrossel-generate] done", { totalMs: Date.now()-t0, withImages: slides.filter(s=>s.imageDataUrl).length });
```

### 2. Imagens em paralelo com deadline global (120s)

Substituir o `for` sequencial por `Promise.all` com `Promise.race` contra um deadline de **120s** (margem de segurança vs. 150s do gateway). Slides cuja imagem não voltar a tempo ficam com `imageDataUrl: null` — o editor abre normalmente.

```ts
const DEADLINE_MS = 120_000;
const remaining = () => DEADLINE_MS - (Date.now() - t0);

if (aiImages && imageMode !== "none" && remaining() > 10_000) {
  const results = await Promise.allSettled(
    slides.map((s, i) => Promise.race([
      generateImage(s, i),                                  // existing logic extracted
      new Promise<null>((res) => setTimeout(() => res(null), Math.max(5_000, remaining() - 2_000))),
    ]))
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) slides[i].imageDataUrl = r.value;
  });
}
```

### 3. Fallback de slides quando o **texto** falha

Se a chamada de texto retornar !ok, ou o tool-call vier vazio/inválido, **não retornar 4xx/5xx**. Em vez disso, montar 5 slides locais a partir de `topic` + `clientName` e responder **200**:

```ts
function fallbackSlides(topic: string, clientName: string | null, n: number) {
  const who = clientName ? ` para ${clientName}` : "";
  const base = [
    { title: topic.slice(0, 40), subtitle: "", body: `Conteúdo${who} sobre ${topic}.` },
    { title: "Por que importa", subtitle: "", body: `O que ${topic} muda no dia a dia.` },
    { title: "Como aplicar", subtitle: "", body: `3 passos práticos para começar agora.` },
    { title: "Erros comuns", subtitle: "", body: `O que evitar ao tratar de ${topic}.` },
    { title: "Próximo passo", subtitle: "CTA", body: `Salve este post e compartilhe${who}.` },
  ];
  return base.slice(0, n).map((s) => ({ ...s, imagePrompt: topic, imageDataUrl: null }));
}
```

Usado em dois pontos:
- `if (!aiResp.ok)` → log do erro + `slides = fallbackSlides(...)` + seguir o fluxo (sem imagens).
- `catch (e)` no try externo → retornar **200** com `fallbackSlides` em vez de 500, com `meta.fallback: true`.

Mantém-se o early-return 400 apenas quando `topic` está vazio (validação de input).

### 4. Resposta sempre 200 com JSON válido

O retorno final continua igual (`{ slides, meta }`), mas `meta` ganha:
- `meta.fallback: boolean` — true se texto caiu no fallback.
- `meta.imagesGenerated: number` — quantas imagens entraram a tempo.
- `meta.totalMs: number`.

## Não alterado

- `supabase/config.toml` (timeout do gateway não é configurável; `verify_jwt = true` mantido).
- Cliente `CarouselAIWizard.tsx` — já trata `data.slides` e abre o editor; com 200 garantido, o erro "non-2xx" desaparece.
- Prompt, schema do tool-call, briefing context, paleta, modelo de texto.

## Resultado esperado

- Texto sempre volta (real ou fallback) → editor sempre abre.
- Imagens vêm em paralelo dentro do deadline; as que não couberem ficam como `null` e podem ser regeradas depois.
- Logs permitem ver em qual slide/etapa qualquer falha futura ocorre.
