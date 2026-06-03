import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global background worker that finishes carousel image generation
 * for any `studio_jobs` row of the current user that is in `phase: "images"`.
 *
 * Mount once at `/dashboard` layout. It picks up pending image jobs
 * persisted in `studio_jobs.result.imageJobs` and writes each generated
 * image into `studio_jobs.result.images[slideIndex]` as a data URL, so
 * the editor (and any open wizard) can react via Realtime.
 *
 * Closing the browser tab still interrupts the in-flight `carrossel-image`
 * call, but already-completed images are persisted, and the worker resumes
 * from `imagesDone` the next time the user opens any dashboard route.
 */

export type CarouselImageJob = {
  slideIndex: number;
  imagePrompt: string;
  imageStyle?: string | null;
};

type CarouselJobResult = {
  phase?: "variants" | "images" | "done";
  variant?: "minimalista" | "criativo";
  bootstrap?: {
    palette?: [string, string, string];
    archetype?: string | null;
    [k: string]: unknown;
  };
  imageJobs?: CarouselImageJob[];
  images?: Record<string, string>;
  imagesDone?: number;
  imagesTotal?: number;
  [k: string]: unknown;
};

const inFlight = new Set<string>();

async function processOne(jobId: string) {
  if (inFlight.has(jobId)) return;
  inFlight.add(jobId);
  try {
    // Fetch fresh state
    const { data: row, error } = await (supabase as any)
      .from("studio_jobs")
      .select("id, status, kind, result")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !row) return;
    if (row.kind !== "carrossel" || row.status !== "running") return;

    const result = (row.result ?? {}) as CarouselJobResult;
    if (result.phase !== "images") return;

    const jobs = Array.isArray(result.imageJobs) ? result.imageJobs : [];
    if (jobs.length === 0) {
      // Nothing to do — mark done
      await (supabase as any)
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

    const palette = result.bootstrap?.palette ?? null;
    const archetype = result.bootstrap?.archetype ?? null;
    const total = result.imagesTotal ?? jobs.length;
    const images: Record<string, string> = { ...(result.images ?? {}) };
    let done = result.imagesDone ?? Object.keys(images).length;

    // Skip jobs whose slideIndex is already filled
    const pending = jobs.filter((j) => images[String(j.slideIndex)] == null);

    for (const job of pending) {
      try {
        const { data, error: err } = await supabase.functions.invoke("carrossel-image", {
          body: {
            prompt: job.imagePrompt,
            palette,
            archetype,
            imageStyle: job.imageStyle ?? null,
          },
        });
        if (err) throw err;
        const url: string | undefined = (data as { imageDataUrl?: string } | null)?.imageDataUrl;
        if (url) {
          images[String(job.slideIndex)] = url;
          done += 1;
        }
      } catch (e) {
        console.warn("[carousel-worker] image failed", job, e);
      }

      const percent = total > 0 ? Math.min(99, Math.round((done / total) * 100)) : 50;
      await (supabase as any)
        .from("studio_jobs")
        .update({
          progress: percent,
          result: { ...result, images, imagesDone: done, imagesTotal: total, phase: "images" },
        })
        .eq("id", jobId);

      // Re-check that the job wasn't deleted/canceled mid-loop
      const { data: check } = await (supabase as any)
        .from("studio_jobs")
        .select("status")
        .eq("id", jobId)
        .maybeSingle();
      if (!check || check.status !== "running") return;
    }

    const allDone = done >= total;
    await (supabase as any)
      .from("studio_jobs")
      .update({
        status: allDone ? "done" : "error",
        progress: allDone ? 100 : Math.round((done / Math.max(1, total)) * 100),
        finished_at: new Date().toISOString(),
        error: allDone ? null : "Algumas imagens falharam — abra o carrossel para regenerar.",
        result: { ...result, images, imagesDone: done, imagesTotal: total, phase: "done" },
      })
      .eq("id", jobId);
  } finally {
    inFlight.delete(jobId);
  }
}

export function useCarouselImageWorker(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const scan = async () => {
      const { data } = await (supabase as any)
        .from("studio_jobs")
        .select("id, result, status, kind")
        .eq("user_id", userId)
        .eq("kind", "carrossel")
        .eq("status", "running");
      if (cancelled || !data) return;
      for (const row of data) {
        const r = (row.result ?? {}) as CarouselJobResult;
        if (r.phase === "images") {
          void processOne(row.id);
        }
      }
    };

    void scan();

    const uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const channel = supabase
      .channel("carousel-worker-" + userId + "-" + uid)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "studio_jobs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id?: string; kind?: string; status?: string; result?: CarouselJobResult } | undefined;
          if (!row || row.kind !== "carrossel" || row.status !== "running") return;
          if (row.result?.phase === "images") {
            void processOne(row.id!);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
