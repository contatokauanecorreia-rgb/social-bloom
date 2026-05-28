# Bloco 1 — Transcrição automática com AssemblyAI

## Objetivo
Quando o usuário enviar um vídeo no Bloco 1 do Video Workflow, o arquivo é salvo em storage privado, enviado à AssemblyAI para transcrição, e o texto fica disponível para os Blocos 2 e 5.

## O que será implementado

### 1. Segredo
- `ASSEMBLYAI_API_KEY` via formulário seguro (`add_secret`). Você cola a chave nova após revogar a antiga.

### 2. Storage
- Novo bucket **privado** `video-workflow-inputs`.
- Políticas RLS: cada usuário só lê/escreve dentro de `{user_id}/...`.
- URLs assinadas (2h) geradas no servidor para a AssemblyAI baixar o vídeo.

### 3. Server functions (`src/lib/assemblyai.functions.ts`)
- `createSignedUploadUrl({ fileName, contentType })` → retorna URL assinada de upload + `storagePath`.
- `startTranscription({ storagePath })` → gera signed URL de download, faz `POST https://api.assemblyai.com/v2/transcript` com `{ audio_url, language_detection: true, punctuate: true, format_text: true }`, retorna `{ transcriptId }`.
- `getTranscriptionStatus({ transcriptId })` → `GET /v2/transcript/{id}`, retorna `{ status: 'queued'|'processing'|'completed'|'error', text, utterances, language_code, error }`.

### 4. UI — `VideoUploadBlock.tsx`
Três estados visuais:
- **Enviando**: barra de progresso do upload direto pro storage.
- **Transcrevendo**: spinner + label "Transcrevendo áudio…" com polling a cada 3s.
- **Pronto**: card com idioma detectado, texto da transcrição (scroll), botão "Copiar transcrição completa".

Bloco só conta como `complete` quando upload **e** transcrição terminam.

### 5. Estado compartilhado (`useVideoWorkflowState`)
Novos campos:
- `videoStoragePath: string | null`
- `transcription: { text, utterances, language } | null`
- `transcriptionStatus: 'idle' | 'uploading' | 'transcribing' | 'ready' | 'error'`

Disponível para os próximos blocos consumirem.

## Fora de escopo (próximas rodadas)
- Bloco 5 / Luma (próxima entrega)
- Edição manual da transcrição
- Tabela `video_generations` (vem com o Luma)

## Detalhes técnicos
- Arquivos novos: `src/lib/assemblyai.functions.ts`, migração SQL do bucket + policies.
- Editados: `src/components/studio/video-workflow/blocks/VideoUploadBlock.tsx`, `VideoWorkflowCanvas.tsx`, hook de estado.
- Auth: server functions usam `requireSupabaseAuth` (usuário precisa estar logado).
- Tamanho máx. recomendado: 500MB (AssemblyAI aceita maiores, mas mantemos limite no client).

## Ordem de execução após aprovação
1. `add_secret` para `ASSEMBLYAI_API_KEY` (você cola a chave nova)
2. Migração do bucket + policies
3. Server functions
4. UI + estado
5. Teste end-to-end com vídeo curto
