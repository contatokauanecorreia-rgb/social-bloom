import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const BUCKET = 'video-workflow-inputs';
const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

const createUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

const startTranscriptionSchema = z.object({
  storagePath: z.string().min(1).max(500),
});

const getStatusSchema = z.object({
  transcriptId: z.string().min(1).max(100),
});

/**
 * Generate a signed upload URL so the browser can PUT the video
 * directly to private storage without proxying through the server.
 */
export const createSignedUploadUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createUploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}-${safeName}`;

    const { data: signed, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !signed) {
      throw new Error(`Não foi possível gerar URL de upload: ${error?.message ?? 'erro desconhecido'}`);
    }

    return {
      storagePath,
      uploadUrl: signed.signedUrl,
      token: signed.token,
    };
  });

/**
 * Generate a download signed URL for the uploaded video and submit it to
 * AssemblyAI for transcription. Returns the transcript ID for polling.
 */
export const startTranscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => startTranscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error('ASSEMBLYAI_API_KEY não configurada.');
    }

    const { supabase, userId } = context;

    // Owner check — path must start with the user's id.
    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error('Caminho de arquivo inválido.');
    }

    const { data: signed, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(data.storagePath, 60 * 60 * 2); // 2 hours

    if (error || !signed?.signedUrl) {
      throw new Error(`Não foi possível ler o vídeo: ${error?.message ?? 'erro desconhecido'}`);
    }

    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: signed.signedUrl,
        speech_models: ['universal-2'],

        language_detection: true,
        punctuate: true,
        format_text: true,
      }),

    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AssemblyAI recusou o pedido (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as { id?: string; error?: string };
    if (!json.id) {
      throw new Error(json.error ?? 'AssemblyAI não retornou um ID de transcrição.');
    }

    return { transcriptId: json.id };
  });

/**
 * Poll AssemblyAI for the current status of a transcription job.
 */
export const getTranscriptionStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => getStatusSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error('ASSEMBLYAI_API_KEY não configurada.');
    }

    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${encodeURIComponent(data.transcriptId)}`, {
      headers: { authorization: apiKey },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AssemblyAI status falhou (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      status: 'queued' | 'processing' | 'completed' | 'error';
      text?: string | null;
      language_code?: string | null;
      error?: string | null;
      utterances?: Array<{ start: number; end: number; text: string; speaker?: string }> | null;
    };

    return {
      status: json.status,
      text: json.text ?? null,
      language: json.language_code ?? null,
      utterances: json.utterances ?? null,
      error: json.error ?? null,
    };
  });
