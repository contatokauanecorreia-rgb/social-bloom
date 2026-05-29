import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const BUCKET = 'video-workflow-inputs';
const FAL_QUEUE = 'https://queue.fal.run';
const MODIFY_ENDPOINT = 'fal-ai/luma-dream-machine/ray-2/modify';

const MODEL_TO_MODE: Record<string, 'flex_1' | 'reimagine_1' | 'adhere_1'> = {
  'luma-flex': 'flex_1',
  'luma-reimagine': 'reimagine_1',
  kling: 'adhere_1',
};

const startSchema = z.object({
  videoStoragePath: z.string().min(1).max(500),
  sceneMode: z.enum(['image', 'prompt']),
  scenePrompt: z.string().max(2000).optional().default(''),
  sceneImagePath: z.string().max(500).nullable().optional(),
  model: z.enum(['luma-flex', 'luma-reimagine', 'kling']),
  lut: z.string().max(50).optional().default(''),
  contrast: z.number().min(-100).max(100).optional().default(0),
  saturation: z.number().min(-100).max(100).optional().default(0),
  temperature: z.number().min(-100).max(100).optional().default(0),
});

const statusSchema = z.object({
  requestId: z.string().min(1).max(200),
const statusSchema = z.object({
  requestId: z.string().min(1).max(200),
  statusUrl: z.string().url().startsWith('https://queue.fal.run/').max(500),
  responseUrl: z.string().url().startsWith('https://queue.fal.run/').max(500),
});
  const parts: string[] = [];
  if (input.sceneMode === 'prompt' && input.scenePrompt.trim()) {
    parts.push(input.scenePrompt.trim());
  } else if (input.sceneMode === 'image') {
    parts.push('Recompose the scene using the reference image as the visual setting.');
  }
  const colorBits: string[] = [];
  if (input.lut) colorBits.push(`${input.lut} color grade`);
  if (input.contrast) colorBits.push(`contrast ${input.contrast > 0 ? '+' : ''}${input.contrast}`);
  if (input.saturation) colorBits.push(`saturation ${input.saturation > 0 ? '+' : ''}${input.saturation}`);
  if (input.temperature) colorBits.push(`temperature ${input.temperature > 0 ? '+' : ''}${input.temperature}`);
  if (colorBits.length) parts.push(colorBits.join(', '));
  return parts.join('. ').slice(0, 1500) || 'Enhance the video.';
}

export const startLumaGeneration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => startSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY não configurada.');

    const { supabase, userId } = context;
    if (!data.videoStoragePath.startsWith(`${userId}/`)) {
      throw new Error('Caminho de vídeo inválido.');
    }
    if (data.sceneImagePath && !data.sceneImagePath.startsWith(`${userId}/`)) {
      throw new Error('Caminho de imagem inválido.');
    }

    const { data: videoSigned, error: videoErr } = await supabase
      .storage.from(BUCKET).createSignedUrl(data.videoStoragePath, 60 * 60 * 6);
    if (videoErr || !videoSigned?.signedUrl) {
      throw new Error(`Não foi possível ler o vídeo: ${videoErr?.message ?? 'erro'}`);
    }

    let imageUrl: string | undefined;
    if (data.sceneMode === 'image' && data.sceneImagePath) {
      const { data: imgSigned, error: imgErr } = await supabase
        .storage.from(BUCKET).createSignedUrl(data.sceneImagePath, 60 * 60 * 6);
      if (imgErr || !imgSigned?.signedUrl) {
        throw new Error(`Não foi possível ler a imagem: ${imgErr?.message ?? 'erro'}`);
      }
      imageUrl = imgSigned.signedUrl;
    }

    const prompt = buildPrompt(data);
    const mode = MODEL_TO_MODE[data.model];

    const body: Record<string, unknown> = {
      video_url: videoSigned.signedUrl,
      prompt,
      mode,
    };
    if (imageUrl) body.image_url = imageUrl;

    const res = await fetch(`${FAL_QUEUE}/${MODIFY_ENDPOINT}`, {
      method: 'POST',
      headers: {
        authorization: `Key ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`FAL recusou o pedido (${res.status}): ${txt.slice(0, 300)}`);
    }

    const json = (await res.json()) as { request_id?: string };
    if (!json.request_id) throw new Error('FAL não retornou request_id.');
    return { requestId: json.request_id };
  });

export const getLumaStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY não configurada.');

    const base = `${FAL_QUEUE}/${MODIFY_ENDPOINT}/requests/${encodeURIComponent(data.requestId)}`;
    const statusRes = await fetch(`${base}/status?logs=1`, {
      headers: { authorization: `Key ${apiKey}` },
    });
    if (!statusRes.ok) {
      const txt = await statusRes.text().catch(() => '');
      throw new Error(`Status FAL falhou (${statusRes.status}): ${txt.slice(0, 200)}`);
    }
    const statusJson = (await statusRes.json()) as {
      status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | string;
      queue_position?: number;
      logs?: Array<{ message?: string }>;
    };

    // Derive a rough progress %
    let progress = 5;
    if (statusJson.status === 'IN_QUEUE') {
      progress = 10;
    } else if (statusJson.status === 'IN_PROGRESS') {
      progress = 50;
      const logs = statusJson.logs ?? [];
      // Try to parse a "xx%" mention in the most recent log
      for (let i = logs.length - 1; i >= 0; i--) {
        const m = logs[i]?.message?.match(/(\d{1,3})\s*%/);
        if (m) {
          const pct = Math.min(95, Math.max(15, parseInt(m[1], 10)));
          progress = pct;
          break;
        }
      }
    } else if (statusJson.status === 'COMPLETED') {
      progress = 100;
    }

    if (statusJson.status !== 'COMPLETED') {
      return {
        status: statusJson.status,
        progress,
        videoUrl: null as string | null,
      };
    }

    const resultRes = await fetch(base, {
      headers: { authorization: `Key ${apiKey}` },
    });
    if (!resultRes.ok) {
      const txt = await resultRes.text().catch(() => '');
      throw new Error(`Resultado FAL falhou (${resultRes.status}): ${txt.slice(0, 200)}`);
    }
    const result = (await resultRes.json()) as { video?: { url?: string } };
    const videoUrl = result.video?.url ?? null;
    if (!videoUrl) throw new Error('FAL completou sem vídeo de saída.');

    return { status: 'COMPLETED' as const, progress: 100, videoUrl };
  });
