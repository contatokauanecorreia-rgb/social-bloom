import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Images,
  Video,
  Image as ImageIcon,
  Layers,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/clientes/$id/aprovacao")({
  component: AprovacaoInternaPage,
});

type ContentType = "carrossel" | "reels" | "post" | "story";
type ContentStatus = "aguardando" | "aprovado" | "revisao" | "rascunho";

type Comment = {
  author: string;
  text: string;
  at: string;
};

type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  scheduledFor: string;
  copyPreview: string;
  status: ContentStatus;
  comment?: Comment;
};

const TYPE_META: Record<
  ContentType,
  { label: string; icon: typeof Images; bg: string; chip: string }
> = {
  carrossel: {
    label: "Carrossel",
    icon: Images,
    bg: "from-violet-500 to-fuchsia-500",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
  },
  reels: {
    label: "Reels",
    icon: Video,
    bg: "from-rose-500 to-orange-500",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
  },
  post: {
    label: "Post",
    icon: ImageIcon,
    bg: "from-sky-500 to-cyan-500",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  story: {
    label: "Story",
    icon: Layers,
    bg: "from-amber-500 to-yellow-500",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

const STATUS_META: Record<ContentStatus, { label: string; chip: string }> = {
  aguardando: { label: "Aguardando", chip: "bg-amber-100 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", chip: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  revisao: { label: "Revisão", chip: "bg-rose-100 text-rose-800 border-rose-200" },
  rascunho: { label: "Rascunho", chip: "bg-muted text-muted-foreground border-border" },
};

const MOCK_CONTENTS: ContentItem[] = [
  {
    id: "c1",
    type: "carrossel",
    title: "5 sinais de que sua pele precisa de hidratação profunda",
    scheduledFor: "Seg, 13 mai · 09h00",
    copyPreview:
      "Você sente a pele repuxando logo depois de lavar o rosto? Esse é o primeiro alerta que o seu skincare está pedindo socorro.",
    status: "aguardando",
  },
  {
    id: "c2",
    type: "reels",
    title: "Bastidores: como começa o nosso ritual de cuidado",
    scheduledFor: "Ter, 14 mai · 18h30",
    copyPreview:
      "Spoiler: começa muito antes do produto chegar na sua mão. Vem ver os bastidores de quem cuida da sua pele de verdade.",
    status: "aprovado",
  },
  {
    id: "c3",
    type: "post",
    title: "O mito do 'pele oleosa não precisa de hidratante'",
    scheduledFor: "Qua, 15 mai · 12h00",
    copyPreview:
      "Pele oleosa também desidrata — e quando isso acontece, ela produz ainda mais óleo pra compensar. Hora de quebrar esse ciclo.",
    status: "revisao",
    comment: {
      author: "Júlia (Bela Forma)",
      text: "Adorei! Só troca a primeira frase pra algo menos técnico — algo tipo 'todo mundo já ouviu isso, né?'",
      at: "Ontem · 21h12",
    },
  },
  {
    id: "c4",
    type: "story",
    title: "Enquete: qual é a sua maior dúvida sobre skincare?",
    scheduledFor: "Qui, 16 mai · 10h00",
    copyPreview:
      "Bora trocar uma ideia? Manda sua maior dúvida na enquete que eu respondo todas no fim da semana.",
    status: "rascunho",
  },
  {
    id: "c5",
    type: "carrossel",
    title: "Antes e depois: protocolo de 30 dias",
    scheduledFor: "Sex, 17 mai · 16h00",
    copyPreview:
      "Resultado real de uma cliente que seguiu o protocolo direitinho durante 30 dias. Nada de filtro, nada de mágica.",
    status: "aguardando",
  },
];

function AprovacaoInternaPage() {
  const { id } = Route.useParams();
  const [contents] = useState<ContentItem[]>(MOCK_CONTENTS);

  const counts = useMemo(
    () => ({
      aguardando: contents.filter((c) => c.status === "aguardando").length,
      aprovado: contents.filter((c) => c.status === "aprovado").length,
      revisao: contents.filter((c) => c.status === "revisao").length,
      total: contents.length,
    }),
    [contents],
  );

  const generateLink = async () => {
    const token = `${id.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/aprovar/${token}`
        : `/aprovar/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!", { description: url });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Período atual
          </p>
          <h2 className="text-lg font-semibold">Semana de 13 a 19 de maio</h2>
        </div>
        <Button variant="gradient" onClick={generateLink}>
          <Link2 className="h-4 w-4" />
          Gerar link de aprovação
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricBox icon={Clock} label="Aguardando" value={counts.aguardando} tone="amber" />
        <MetricBox icon={CheckCircle2} label="Aprovados" value={counts.aprovado} tone="emerald" />
        <MetricBox icon={AlertCircle} label="Revisão" value={counts.revisao} tone="rose" />
        <MetricBox icon={FileText} label="Total do mês" value={counts.total} tone="muted" />
      </div>

      <div className="space-y-3">
        {contents.map((c) => (
          <ContentCard key={c.id} item={c} />
        ))}
      </div>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose" | "muted";
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    muted: "border-border bg-background/40 text-foreground",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-4", styles)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const tMeta = TYPE_META[item.type];
  const sMeta = STATUS_META[item.status];
  const TypeIcon = tMeta.icon;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div
          className={cn(
            "relative flex h-32 w-full shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-primary-foreground sm:h-28 sm:w-28",
            tMeta.bg,
          )}
        >
          <TypeIcon className="h-10 w-10 opacity-80" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                tMeta.chip,
              )}
            >
              {tMeta.label}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                sMeta.chip,
              )}
            >
              {sMeta.label}
            </span>
            <span className="text-xs text-muted-foreground">{item.scheduledFor}</span>
          </div>

          <h3 className="font-semibold leading-snug">{item.title}</h3>

          <p className="line-clamp-2 text-sm text-muted-foreground">{item.copyPreview}</p>

          {item.status === "revisao" && item.comment && (
            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-rose-900">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  {item.comment.author}
                </span>
                <span className="font-normal text-rose-700/80">{item.comment.at}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-rose-950/90">
                “{item.comment.text}”
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
