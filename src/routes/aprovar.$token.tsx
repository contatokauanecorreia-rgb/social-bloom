import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, MessageSquare, Send } from "lucide-react";
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

type Post = {
  id: string;
  title: string;
  copy: string;
  type: string;
  cover: string; // gradient classes
};

const MOCK_CLIENT = "Estúdio Aurora";

const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    title: "Carrossel: 5 erros que matam seu engajamento",
    type: "Carrossel",
    copy: "Você posta direto e mesmo assim parece que ninguém vê? Hoje a gente desmascara os 5 erros mais comuns que estão sabotando o seu alcance — e como corrigir ainda essa semana. ✨",
    cover: "from-violet-500 to-fuchsia-500",
  },
  {
    id: "p2",
    title: "Reel: Bastidores da gravação",
    type: "Reel",
    copy: "Spoiler do que vem por aí 👀 Bastidores da gravação que vai dar o que falar. Marca alguém que precisa ver isso.",
    cover: "from-sky-500 to-cyan-400",
  },
  {
    id: "p3",
    title: "Post: Frase do dia",
    type: "Post feed",
    copy: "“Consistência vence talento quando talento não é consistente.” Salva pra lembrar quando bater a vontade de pausar tudo.",
    cover: "from-amber-500 to-orange-500",
  },
];

const STATUS_META: Record<PostStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  approved: { label: "Aprovado", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  changes: { label: "Ajuste solicitado", className: "bg-amber-100 text-amber-800 border border-amber-200" },
};

type LocalState = Record<string, { status: PostStatus; comment: string; commentOpen: boolean }>;

function PortalAprovacao() {
  const [responses, setResponses] = useState<LocalState>(() =>
    Object.fromEntries(MOCK_POSTS.map((p) => [p.id, { status: "pending" as PostStatus, comment: "", commentOpen: false }])),
  );

  const setStatus = (id: string, status: PostStatus) => {
    setResponses((r) => ({ ...r, [id]: { ...r[id], status, commentOpen: status === "changes" ? true : r[id].commentOpen } }));
  };

  const setComment = (id: string, comment: string) => {
    setResponses((r) => ({ ...r, [id]: { ...r[id], comment } }));
  };

  const send = () => {
    const pending = Object.values(responses).filter((r) => r.status === "pending").length;
    if (pending > 0) {
      toast.error(`Ainda há ${pending} post(s) sem resposta.`);
      return;
    }
    toast.success("Respostas enviadas! O criador será notificado.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-primary shadow-primary" />
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Postly · Aprovação</div>
            <h1 className="text-base font-bold tracking-tight">Conteúdo para {MOCK_CLIENT}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Olá! Hora de aprovar 🎉</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja cada post abaixo. Você pode aprovar ou pedir ajustes — quando terminar, clique em "Enviar respostas".
          </p>
        </div>

        <div className="grid gap-4">
          {MOCK_POSTS.map((post) => {
            const r = responses[post.id];
            const meta = STATUS_META[r.status];
            return (
              <Card key={post.id} className="overflow-hidden">
                <div className={cn("h-32 w-full bg-gradient-to-br", post.cover)} />
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="soft" className="text-[10px]">{post.type}</Badge>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{post.copy}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={r.status === "approved" ? "default" : "outline"}
                      className={cn(r.status === "approved" && "bg-emerald-600 hover:bg-emerald-700")}
                      onClick={() => setStatus(post.id, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={r.status === "changes" ? "default" : "outline"}
                      className={cn(r.status === "changes" && "bg-amber-600 hover:bg-amber-700")}
                      onClick={() => setStatus(post.id, "changes")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Solicitar ajuste
                    </Button>
                  </div>

                  {r.status === "changes" && (
                    <div className="mt-3">
                      <Textarea
                        rows={3}
                        placeholder="Conte o que precisa ajustar..."
                        value={r.comment}
                        onChange={(e) => setComment(post.id, e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border bg-card/60 p-5">
          <div className="text-sm text-muted-foreground">
            {Object.values(responses).filter((r) => r.status !== "pending").length} de {MOCK_POSTS.length} respondidos
          </div>
          <Button variant="gradient" onClick={send}>
            <Send className="h-4 w-4" />
            Enviar respostas
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Token de demonstração — esta é uma prévia do portal público.
        </p>
      </main>
    </div>
  );
}
