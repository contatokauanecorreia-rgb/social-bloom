import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  MessageSquare,
  Send,
  Sparkles,
  Images,
  Video,
  Image as ImageIcon,
  Layers,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/aprovar/$token")({
  head: () => ({
    meta: [
      { title: "Aprovação de conteúdo — Postly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalAprovacao,
});

type PostStatus = "pending" | "approved" | "changes";
type ContentType = "carrossel" | "reels" | "post" | "story";

type Post = {
  id: string;
  title: string;
  copy: string;
  type: ContentType;
  scheduledFor: string;
};

const MOCK_CLIENT = "Studio Bela Forma";
const MOCK_PERIOD = "Semana de 13 a 19 de maio";

const TYPE_META: Record<
  ContentType,
  { label: string; icon: typeof Images; cover: string }
> = {
  carrossel: {
    label: "Carrossel",
    icon: Images,
    cover: "from-violet-500 to-fuchsia-500",
  },
  reels: { label: "Reels", icon: Video, cover: "from-rose-500 to-orange-500" },
  post: { label: "Post", icon: ImageIcon, cover: "from-sky-500 to-cyan-500" },
  story: {
    label: "Story",
    icon: Layers,
    cover: "from-amber-500 to-yellow-500",
  },
};

const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    type: "carrossel",
    title: "5 sinais de que sua pele precisa de hidratação profunda",
    scheduledFor: "Seg, 13 mai · 09h00",
    copy:
      "Você sente a pele repuxando logo depois de lavar o rosto? Esse é o primeiro alerta que o seu skincare está pedindo socorro.",
  },
  {
    id: "p2",
    type: "reels",
    title: "Bastidores: como começa o nosso ritual de cuidado",
    scheduledFor: "Ter, 14 mai · 18h30",
    copy:
      "Spoiler: começa muito antes do produto chegar na sua mão. Vem ver os bastidores de quem cuida da sua pele de verdade.",
  },
  {
    id: "p3",
    type: "post",
    title: "O mito do 'pele oleosa não precisa de hidratante'",
    scheduledFor: "Qua, 15 mai · 12h00",
    copy:
      "Pele oleosa também desidrata — e quando isso acontece, ela produz ainda mais óleo pra compensar. Hora de quebrar esse ciclo.",
  },
  {
    id: "p4",
    type: "story",
    title: "Enquete: qual é a sua maior dúvida sobre skincare?",
    scheduledFor: "Qui, 16 mai · 10h00",
    copy:
      "Bora trocar uma ideia? Manda sua maior dúvida na enquete que eu respondo todas no fim da semana.",
  },
];

type LocalState = Record<
  string,
  { status: PostStatus; comment: string; commentOpen: boolean }
>;

function PortalAprovacao() {
  const [responses, setResponses] = useState<LocalState>(() =>
    Object.fromEntries(
      MOCK_POSTS.map((p) => [
        p.id,
        { status: "pending" as PostStatus, comment: "", commentOpen: false },
      ]),
    ),
  );

  const pendingCount = useMemo(
    () => Object.values(responses).filter((r) => r.status === "pending").length,
    [responses],
  );

  const approve = (id: string) => {
    setResponses((r) => ({
      ...r,
      [id]: { ...r[id], status: "approved", commentOpen: false },
    }));
    toast.success("Resposta registrada. O social media foi notificado.");
  };

  const toggleComment = (id: string) => {
    setResponses((r) => ({
      ...r,
      [id]: { ...r[id], commentOpen: !r[id].commentOpen },
    }));
  };

  const setComment = (id: string, comment: string) => {
    setResponses((r) => ({ ...r, [id]: { ...r[id], comment } }));
  };

  const submitComment = (id: string) => {
    const r = responses[id];
    if (!r.comment.trim()) {
      toast.error("Escreva o que precisa ser ajustado.");
      return;
    }
    setResponses((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "changes", commentOpen: false },
    }));
    toast.success("Resposta registrada. O social media foi notificado.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Postly · Aprovação
              </div>
              <h1 className="text-base font-bold leading-tight tracking-tight">
                {MOCK_CLIENT}
              </h1>
              <div className="text-xs text-muted-foreground">{MOCK_PERIOD}</div>
            </div>
          </div>
          {pendingCount > 0 ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount}{" "}
              {pendingCount === 1
                ? "conteúdo aguardando aprovação"
                : "conteúdos aguardando aprovação"}
            </span>
          ) : (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Check className="h-3.5 w-3.5" />
              Tudo respondido
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Olá! Hora de aprovar 🎉
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja cada post abaixo. Aprove ou solicite uma revisão — sua resposta
            é registrada na hora e o social media é notificado.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {MOCK_POSTS.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              state={responses[post.id]}
              onApprove={() => approve(post.id)}
              onToggleComment={() => toggleComment(post.id)}
              onCommentChange={(v) => setComment(post.id, v)}
              onSubmitComment={() => submitComment(post.id)}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-xl border bg-card/60 p-5 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Dica:</strong> você pode voltar
            a este link a qualquer momento para revisar suas respostas.
          </p>
          {pendingCount === 0 && (
            <Button
              variant="gradient"
              size="sm"
              onClick={() =>
                toast.success("Tudo enviado! O social media já foi notificado.")
              }
            >
              <Send className="h-3.5 w-3.5" />
              Concluir
            </Button>
          )}
        </div>
      </main>

      <footer className="border-t py-6">
        <p className="text-center text-xs text-muted-foreground/70">
          Powered by{" "}
          <span className="font-semibold text-foreground">Postly</span>
        </p>
      </footer>
    </div>
  );
}

function PostCard({
  post,
  state,
  onApprove,
  onToggleComment,
  onCommentChange,
  onSubmitComment,
}: {
  post: Post;
  state: { status: PostStatus; comment: string; commentOpen: boolean };
  onApprove: () => void;
  onToggleComment: () => void;
  onCommentChange: (v: string) => void;
  onSubmitComment: () => void;
}) {
  const tMeta = TYPE_META[post.type];
  const TypeIcon = tMeta.icon;
  const approved = state.status === "approved";
  const changes = state.status === "changes";

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div
        className={cn(
          "relative flex h-44 w-full items-center justify-center bg-gradient-to-br text-primary-foreground",
          tMeta.cover,
        )}
      >
        <TypeIcon className="h-12 w-12 opacity-80" />
        {approved && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-900/70 backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg ring-4 ring-emerald-300/40">
              <Check className="h-6 w-6 text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">
              Aprovado
            </span>
          </div>
        )}
        {changes && (
          <div className="absolute right-2 top-2 rounded-full bg-amber-500/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
            Revisão pedida
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="soft" className="text-[11px]">
            {tMeta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {post.scheduledFor}
          </span>
          {approved && (
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Aprovado
            </span>
          )}
        </div>

        <h3 className="font-semibold leading-snug">{post.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
          {post.copy}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onApprove}
            disabled={approved}
            className={cn(
              "bg-emerald-600 text-white hover:bg-emerald-700",
              approved && "opacity-80",
            )}
          >
            <Check className="h-3.5 w-3.5" />
            {approved ? "Aprovado" : "Aprovar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleComment}
            disabled={approved}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Solicitar revisão
          </Button>
        </div>

        {state.commentOpen && !approved && (
          <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3">
            <Textarea
              rows={3}
              placeholder="Conte o que precisa ajustar..."
              value={state.comment}
              onChange={(e) => onCommentChange(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="gradient" onClick={onSubmitComment}>
                <Send className="h-3.5 w-3.5" />
                Enviar
              </Button>
            </div>
          </div>
        )}

        {changes && state.comment && !state.commentOpen && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              Seu comentário
            </div>
            <p className="mt-1 text-sm text-amber-950/90">"{state.comment}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
