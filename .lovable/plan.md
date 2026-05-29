## Causa

O endpoint `https://queue.fal.run/fal-ai/luma-dream-machine/ray-2/modify/requests/<id>/status` responde 405. O FAL Queue espera o app id base (`fal-ai/luma-dream-machine`) — não o subpath `/ray-2/modify`. A resposta do submit já entrega `status_url` e `response_url` corretos.

## Mudanças

**`src/lib/luma.functions.ts`**
- `statusSchema`: aceitar `requestId`, `statusUrl`, `responseUrl` (validar `https://queue.fal.run/` prefix, max 500).
- `startLumaGeneration`: ler `status_url` e `response_url` da resposta do submit e retornar `{ requestId, statusUrl, responseUrl }`.
- `getLumaStatus`: usar `data.statusUrl` (com `?logs=1`) e `data.responseUrl` em vez de reconstruir a partir de `MODIFY_ENDPOINT`.

**`src/components/studio/video-workflow/VideoWorkflowCanvas.tsx`**
- Capturar `statusUrl` e `responseUrl` no destructuring de `startLumaFn(...)`.
- Passar os três campos em cada `getLumaStatusFn({ data: { requestId, statusUrl, responseUrl } })`.

Sem migrations, sem novos pacotes.
