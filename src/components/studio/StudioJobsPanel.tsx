import { Layers, Film, Loader2, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { deleteStudioJob, type StudioJob } from "@/lib/studio-jobs";

type Props = {
  running: StudioJob[];
  recent: StudioJob[];
  onOpen: (job: StudioJob) => void;
};

function KindIcon({ kind, className }: { kind: StudioJob["kind"]; className?: string }) {
  return kind === "carrossel" ? <Layers className={className} /> : <Film className={className} />;
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function StudioJobsPanel({ running, recent, onOpen }: Props) {
  if (running.length === 0 && recent.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {running.length > 0 && (
        <section className="rounded-xl border bg-card/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <h3 className="text-sm font-semibold">Em andamento</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {running.length}
            </span>
          </div>
          <ul className="space-y-2">
            {running.map((job) => (
              <li
                key={job.id}
                className="flex items-center gap-3 rounded-lg border bg-background p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <KindIcon kind={job.kind} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={job.progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground">{job.progress}%</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onOpen(job)} className="gap-1">
                  <ExternalLink className="h-3 w-3" /> Abrir
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="rounded-xl border bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Recentes</h3>
          <ul className="space-y-2">
            {recent.map((job) => (
              <li
                key={job.id}
                className="flex items-center gap-3 rounded-lg border bg-background p-3"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    job.status === "done"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {job.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <KindIcon kind={job.kind} className="mr-1 inline h-3 w-3 align-[-2px]" />
                    {job.kind === "carrossel" ? "Carrossel" : "Vídeo"} ·{" "}
                    {job.status === "done" ? "Concluído" : "Falhou"} ·{" "}
                    {timeAgo(job.finished_at ?? job.updated_at)}
                  </p>
                </div>
                {job.status === "done" && (
                  <Button size="sm" variant="outline" onClick={() => onOpen(job)} className="gap-1">
                    <ExternalLink className="h-3 w-3" /> Abrir
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => deleteStudioJob(job.id)}
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
