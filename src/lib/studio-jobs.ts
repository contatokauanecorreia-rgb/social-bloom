import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StudioJobKind = "carrossel" | "video";
export type StudioJobStatus = "running" | "done" | "error" | "canceled";

export type StudioJob = {
  id: string;
  user_id: string;
  client_id: string | null;
  kind: StudioJobKind;
  status: StudioJobStatus;
  progress: number;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export async function createStudioJob(args: {
  kind: StudioJobKind;
  clientId: string | null;
  title: string;
  input: Record<string, unknown>;
}): Promise<string | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("studio_jobs")
    .insert({
      user_id: uid,
      client_id: args.clientId,
      kind: args.kind,
      title: args.title,
      input: args.input,
      status: "running",
      progress: 0,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("createStudioJob failed", error);
    return null;
  }
  return data?.id ?? null;
}

export async function updateStudioJob(
  jobId: string,
  patch: Partial<Pick<StudioJob, "progress" | "status" | "result" | "error" | "title">>,
) {
  const next: Record<string, unknown> = { ...patch };
  if (patch.status && patch.status !== "running") {
    next.finished_at = new Date().toISOString();
  }
  const { error } = await supabase.from("studio_jobs").update(next).eq("id", jobId);
  if (error) console.warn("updateStudioJob failed", error);
}

export async function fetchStudioJob(jobId: string): Promise<StudioJob | null> {
  const { data, error } = await supabase
    .from("studio_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) {
    console.warn("fetchStudioJob failed", error);
    return null;
  }
  return (data as StudioJob | null) ?? null;
}

export async function deleteStudioJob(jobId: string) {
  await supabase.from("studio_jobs").delete().eq("id", jobId);
}

/**
 * Subscribes to the current user's studio_jobs.
 * - Loads active (running) + last 5 completed jobs.
 * - Realtime updates.
 * - Toasts when a running job transitions to done/error.
 */
export function useStudioJobs(userId: string | null) {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const prevStatusById = new Map<string, StudioJobStatus>();

    const load = async () => {
      const { data } = await supabase
        .from("studio_jobs")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      const rows = (data ?? []) as StudioJob[];
      rows.forEach((j) => prevStatusById.set(j.id, j.status));
      setJobs(rows);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("studio_jobs-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "studio_jobs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newRow = payload.new as StudioJob | undefined;
          const oldRow = payload.old as StudioJob | undefined;

          if (payload.eventType === "DELETE" && oldRow) {
            setJobs((arr) => arr.filter((j) => j.id !== oldRow.id));
            prevStatusById.delete(oldRow.id);
            return;
          }

          if (!newRow) return;

          // Detect running -> done/error transition for toast
          const prev = prevStatusById.get(newRow.id);
          if (prev === "running" && (newRow.status === "done" || newRow.status === "error")) {
            if (newRow.status === "done") {
              toast.success(
                newRow.kind === "carrossel"
                  ? `Carrossel "${newRow.title}" pronto!`
                  : `Vídeo "${newRow.title}" pronto!`,
              );
            } else {
              toast.error(
                `${newRow.kind === "carrossel" ? "Carrossel" : "Vídeo"} "${newRow.title}" falhou: ${newRow.error ?? "erro desconhecido"}`,
              );
            }
          }
          prevStatusById.set(newRow.id, newRow.status);

          setJobs((arr) => {
            const idx = arr.findIndex((j) => j.id === newRow.id);
            if (idx === -1) return [newRow, ...arr];
            const copy = arr.slice();
            copy[idx] = newRow;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const running = jobs.filter((j) => j.status === "running");
  const recent = jobs
    .filter((j) => j.status === "done" || j.status === "error")
    .slice(0, 5);

  return { jobs, running, recent, loading };
}
