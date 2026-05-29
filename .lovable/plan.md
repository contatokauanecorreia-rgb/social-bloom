## Bloco 5 — Geração com Luma Ray2

### O que vai acontecer quando o usuário clicar em "Gerar vídeo"

1. O Bloco 5 envia ao backend:
   - O vídeo do Bloco 1 (caminho no storage `video-workflow-inputs/...` já existente)
   - O prompt do Bloco 2 (se em modo "prompt") ou a imagem do Bloco 2 (modo "image")
   - O modelo selecionado no Bloco 3 (`luma-flex`, `luma-reimagine` ou `kling`)
   - Os ajustes do Bloco 4 (LUT + contraste/saturação/temperatura) concatenados ao prompt
2. O backend chama a API do FAL (Luma Ray 2) e retorna um `requestId`.
3. O frontend faz polling do status e atualiza a barra de progresso real (0 → 100%) com rótulos de etapa.
4. Quando termina, o vídeo gerado aparece dentro do bloco com 3 botões:
   - **Baixar MP4** — download direto do arquivo
   - **Editar cortes e legendas** — abre editor (placeholder navegando para `/studio/video-editor?src=...`, a ser implementado depois)
   - **Enviar ao cliente** — placeholder (toast "em breve") até o fluxo de envio existir

### Arquivos novos

- `src/lib/luma.functions.ts` — server functions TanStack:
  - `startLumaGeneration({ storagePath, sceneMode, scenePrompt, sceneImagePath, model, color })` → gera signed URL do vídeo de entrada, monta prompt final (incluindo LUT/ajustes), chama FAL `queue.submit` e retorna `{ requestId, endpoint }`.
  - `getLumaStatus({ requestId, endpoint })` → consulta `queue.status`; quando `COMPLETED`, busca `queue.result` e retorna `{ status, progress, videoUrl }`.
- (Reusa `FAL_API_KEY` já configurado.)

### Arquivos editados

- `src/components/studio/video-workflow/VideoWorkflowCanvas.tsx`:
  - Substitui o `handleGenerate` simulado por chamada real às server functions + polling a cada 3s.
  - Estados novos: `generatedVideoUrl`, `lumaRequestId`, `lumaEndpoint`.
  - Bloco 5 renderiza `<video>` + 3 botões após `done`.
  - Se imagem do Bloco 2 estiver em modo "image", faz upload prévio para `video-workflow-inputs` (reusa `createSignedUploadUrl`) antes de chamar `startLumaGeneration`.

### Mapeamento de modelos para endpoints FAL

- `luma-flex` → `fal-ai/luma-dream-machine/ray-2-flash/image-to-video` (ou `video-to-video` quando aplicável)
- `luma-reimagine` → `fal-ai/luma-dream-machine/ray-2/modify`
- `kling` → `fal-ai/kling-video/v2/master/image-to-video` (mantido como opção alternativa via mesma camada)

### O que NÃO faz parte deste passo

- Editor de cortes/legendas (botão só navega para rota placeholder).
- Fluxo "Enviar ao cliente" (mostra toast "em breve").
- Persistência do vídeo gerado em uma tabela de histórico.

Confirme se posso prosseguir, ou se quer ajustar o mapeamento de modelos / comportamento dos botões pós-geração.