
# Integração fal.ai — FLUX 1.1 [pro] para carrosséis

## Objetivo

Substituir o Gemini como engine padrão de geração de imagem por **FLUX 1.1 [pro]** via **fal.ai**, mantendo Gemini como fallback automático caso a chamada principal falhe (timeout, créditos, erro).

Não altera UI, não altera prompts, não altera estrutura de slides. Mudança 100% no backend (edge functions).

## Arquitetura

```text
genOne(slide)
   ├─ tenta fal.ai (FLUX 1.1 [pro])  ← novo, padrão
   │      ↓ falhou (4xx/5xx/timeout)
   └─ fallback Gemini (atual)
          ↓ falhou
       null (slide sem imagem)
```

A mesma lógica é replicada na edge function `carrossel-image` (regeneração individual no editor).

## Passos de implementação

### 1. Configurar API key da fal.ai

- O usuário precisa criar conta em https://fal.ai e gerar uma API key em **Dashboard → Keys**.
- Vou usar `add_secret` para pedir o valor de **`FAL_API_KEY`** e armazenar em Lovable Cloud.
- Não precisa de connector — fal.ai não tem um listado, então é integração via secret + REST.

### 2. Criar helper compartilhado `_shared/fal-image.ts`

Novo arquivo `supabase/functions/_shared/fal-image.ts` exportando:

```ts
export async function generateWithFal(prompt: string, opts?: {
  aspectRatio?: "4:5" | "1:1" | "9:16";
  apiKey: string;
}): Promise<string | null>  // retorna data URL base64 ou null
```

Implementação:
- Endpoint síncrono: `POST https://fal.run/fal-ai/flux-pro/v1.1` com `Authorization: Key ${FAL_API_KEY}`.
- Body: `{ prompt, image_size: "portrait_4_3", num_images: 1, enable_safety_checker: true, output_format: "jpeg" }` (mapeio 4:5 → `portrait_4_3`, mais próximo suportado pelo FLUX pro; 1:1 → `square_hd`; 9:16 → `portrait_16_9`).
- Resposta vem como `{ images: [{ url: "https://fal.media/..." }] }` — fal.ai retorna URL pública, não base64.
- Fetcho a URL e converto para `data:image/jpeg;base64,...` para manter compatibilidade total com o resto do código (que espera data URL).
- Timeout interno de 45s (FLUX 1.1 pro é rápido, 5–15s típico).

### 3. Atualizar `carrossel-generate/index.ts`

Em `genOne` (linha 623), trocar a chamada Gemini por:

```ts
const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
let url: string | null = null;

if (FAL_API_KEY) {
  url = await generateWithFal(prompt, { aspectRatio: "4:5", apiKey: FAL_API_KEY });
  if (url) console.log("[carrossel-generate] image_done_fal", { i });
}

if (!url) {
  // fallback Gemini (código atual)
  console.log("[carrossel-generate] fallback_gemini", { i });
  url = await generateWithGemini(prompt, LOVABLE_API_KEY);
}

return url;
```

Extraio o bloco Gemini atual para uma função `generateWithGemini` no mesmo arquivo (ou no `_shared/`) para clareza.

### 4. Atualizar `carrossel-image/index.ts`

Mesma lógica: tenta fal.ai primeiro, fallback Gemini. Mantém a interface pública intacta (`{ imageDataUrl }`).

### 5. Deploy + teste

- Deploy de `carrossel-generate` e `carrossel-image`.
- Testar gerando 1 carrossel novo (verifico nos logs se `image_done_fal` aparece).
- Testar regeneração individual de slide no editor.

## Considerações técnicas

- **Modelo escolhido:** `fal-ai/flux-pro/v1.1` (não a `ultra`). Razão: FLUX 1.1 [pro] entrega ~95% da qualidade da Ultra a metade do preço (~$0.04 vs $0.06) e ~3x mais rápido. Se quiser depois, é só trocar a string do endpoint para `fal-ai/flux-pro/v1.1-ultra`.
- **Custo estimado:** ~$0.04/imagem. Carrossel de 5 slides com 3 fotos = ~$0.12.
- **Aspect ratio:** FLUX pro 1.1 não tem 4:5 nativo, então uso `portrait_4_3` (1024×1280) que é visualmente equivalente para Instagram.
- **Sem texto nas imagens:** mantenho o prompt negativo atual (`no text, no letters...`), que o FLUX respeita melhor que o Gemini.
- **Fallback automático:** se `FAL_API_KEY` não estiver setada OU a chamada falhar, o sistema cai no Gemini sem erro visível para o usuário. Isso garante que o app continua funcionando mesmo se você não setar a key imediatamente.
- **Sem mudança no schema** das slides nem no frontend. `imageDataUrl` continua sendo data URL base64, só muda o modelo que gerou.

## Arquivos afetados

- **Novo:** `supabase/functions/_shared/fal-image.ts`
- **Editado:** `supabase/functions/carrossel-generate/index.ts` (função `genOne`)
- **Editado:** `supabase/functions/carrossel-image/index.ts` (handler principal)
- **Secret novo:** `FAL_API_KEY` (solicitado via `add_secret` após aprovação)

## O que NÃO está incluído (pode virar próximo passo)

- Seletor de engine no wizard (Gemini / FLUX / Ideogram). Hoje é fixo: tenta FLUX, fallback Gemini.
- Suporte a Ideogram para slides com tipografia integrada.
- UI mostrando qual engine gerou cada imagem.

Se quiser qualquer um desses depois, é incremento simples sobre essa base.
