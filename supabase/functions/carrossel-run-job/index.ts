// deno-lint-ignore-file no-explicit-any
// Background runner: termina a geração de imagens de um studio_jobs do carrossel.
// É chamado pelo client (após escolha da variante OU ao reabrir o editor/studio
// com um job em fase "images" ainda rodando). Responde 202 imediatamente e
// continua processando via EdgeRuntime.waitUntil, então fecha o navegador
// não interrompe a geração.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fallbackVisualPrompt,
  generateWithFal,
  looksLikeCopyNotImagePrompt,
  sanitizeImageNote,
} from "../_shared/fal-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ImageJob = {
  slideIndex: number;
  imagePrompt: string;
  imageStyle?: string | null;
};

type JobResult = {
  phase?: "variants" | "images" | "done";
  variant?: "minimalista" | "criativo";
  bootstrap?: {
    palette?: [string, string, string];
    archetype?: string | null;
    [k: string]: unknown;
  };
  imageJobs?: ImageJob[];
  images?: Record<string, string>;
  imagesDone?: number;
  imagesTotal?: number;
  [k: string]: unknown;
};

// Lock em memória — evita dois loops concorrentes no mesmo container.
const inFlight = new Set<string>();

async function generateOne(
  job: ImageJob,
  archetype: string | null,
): Promise<string | null> {
  const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
  if (!FAL_API_KEY) return null;

  let visualSeed = (job.imagePrompt ?? "").trim();
  if (!visualSeed || looksLikeCopyNotImagePrompt(visualSeed)) {
    visualSeed = fallbackVisualPrompt({
      archetype,
      segment: null,
      imageStyle: job.imageStyle ?? null,
      topic: visualSeed || "",
    });
  }
  const safePrompt = sanitizeImageNote(visualSeed);
  const styleStr = job.imageStyle && job.imageStyle.trim()
    ? `Visual style: ${job.imageStyle.trim()}.`
    : archetype
      ? `Brand archetype: ${archetype}.`
      : "";
  const fullPrompt =
    `${safePrompt}. ${styleStr} Ultra-realistic cinematic photography with rich saturated colors, deep contrast and visible texture. No text, no letters, no captions, no logos, no watermarks anywhere in the image.`;

  try {
    return await generateWithFal(fullPrompt, {
      apiKey: FAL_API_KEY,
      aspectRatio: "4:5",
      timeoutMs: 60_000,
    });
  } catch (e) {
    console.warn("[carrossel-run-job] fal failed", e);
    return null;
  }
}

async function runJob(jobId: string) {
  if (inFlight.has(jobId)) return;
  inFlight.add(jobId);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data: row, error } = await admin
      .from("studio_jobs")
      .select("id, status, kind, result")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !row) return;
    if (row.kind !== "carrossel" || row.status !== "running") return;

    const result = (row.result ?? {}) as JobResult;
    if (result.phase !== "images") return;

    const jobs = Array.isArray(result.imageJobs) ? result.imageJobs : [];
    const archetype = result.bootstrap?.archetype ?? null;
    const total = result.imagesTotal ?? jobs.length;

    if (jobs.length === 0) {
      await admin
        .from("studio_jobs")
        .update({
          status: "done",
          progress: 100,
          finished_at: new Date().toISOString(),
          result: { ...result, phase: "done" },
        })
        .eq("id", jobId);
      return;
    }

    const images: Record<string, string> = { ...(result.images ?? {}) };
    let done = result.imagesDone ?? Object.keys(images).length;

    const pending = jobs.filter((j) => images[String(j.slideIndex)] == null);

    for (const job of pending) {
      // Confirma que o job ainda está running antes de cada imagem.
      const { data: check } = await admin
        .from("studio_jobs")
        .select("status")
        .eq("id", jobId)
        .maybeSingle();
      if (!check || check.status !== "running") return;

      const url = await generateOne(job, archetype);
      if (url) {
        images[String(job.slideIndex)] = url;
        done += 1;
      }
      const percent = total > 0 ? Math.min(99, Math.round((done / total) * 100)) : 50;
      await admin
        .from("studio_jobs")
        .update({
          progress: percent,
          result: {
            ...result,
            images,
            imagesDone: done,
            imagesTotal: total,
            phase: "images",
          },
        })
        .eq("id", jobId);
    }

    const allDone = done >= total;
    await admin
      .from("studio_jobs")
      .update({
        status: allDone ? "done" : "error",
        progress: allDone ? 100 : Math.round((done / Math.max(1, total)) * 100),
        finished_at: new Date().toISOString(),
        error: allDone
          ? null
          : "Algumas imagens falharam — abra o carrossel para regenerar.",
        result: {
          ...result,
          images,
          imagesDone: done,
          imagesTotal: total,
          phase: "done",
        },
      })
      .eq("id", jobId);
  } catch (e) {
    console.error("[carrossel-run-job] fatal", e);
    try {
      await admin
        .from("studio_jobs")
        .update({
          status: "error",
          error: e instanceof Error ? e.message : "erro desconhecido",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch (_) { /* ignore */ }
  } finally {
    inFlight.delete(jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { jobId } = (await req.json()) as { jobId?: string };
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dispara o processamento em background e responde imediatamente.
    // @ts-ignore — EdgeRuntime existe no runtime do Supabase Edge Functions.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(jobId));
    } else {
      // Fallback local — não esperamos, mas mantém referência.
      void runJob(jobId);
    }

    return new Response(JSON.stringify({ accepted: true, jobId }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
