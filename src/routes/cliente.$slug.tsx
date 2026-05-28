import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Images,
  Video,
  Image as ImageIcon,
  Layers,
  Check,
  CheckCircle2,
  MessageSquare,
  Instagram,
  Globe,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ContentType = "carrossel" | "reels" | "post" | "story";

type PublicClient = {
  id: string;
  name: string;
  company: string | null;
  avatar_url: string | null;
  instagram: string | null;
  website: string | null;
  slug: string;
};

type PublicPost = {
  id: string;
  title: string;
  caption: string | null;
  tags: string[];
  created_at: string;
  approved: boolean;
  approver_name: string | null;
  approved_at: string | null;
  comments_count: number;
};

type PublicComment = {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

const TYPE_META: Record<ContentType, { label: string; icon: typeof Images; cover: string }> = {
  carrossel: { label: "Carrossel", icon: Images, cover: "from-violet-500 to-fuchsia-500" },
  reels: { label: "Vídeo", icon: Video, cover: "from-rose-500 to-orange-500" },
  post: { label: "Post", icon: ImageIcon, cover: "from-sky-500 to-cyan-500" },
  story: { label: "Story", icon: Layers, cover: "from-amber-500 to-yellow-500" },
};

function detectType(tags: string[]): ContentType {
  const t = tags.map((x) => x.toLowerCase());
  if (t.some((x) => x.includes("carrossel"))) return "carrossel";
  if (t.some((x) => x.includes("reels") || x.includes("vídeo") || x.includes("video"))) return "reels";
  if (t.some((x) => x.includes("story"))) return "story";
  return "post";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const Route = createFileRoute("/cliente/$slug")({
  loader: async ({ params }) => {
    const [{ data: client, error: clientErr }, { data: posts, error: postsErr }] = await Promise.all([
      supabase.rpc("get_public_client", { p_slug: params.slug }).maybeSingle(),
      supabase.rpc("get_public_client_content", { p_slug: params.slug }),
    ]);
    if (clientErr || !client) throw notFound();
    if (postsErr) throw new Error(postsErr.message);
    return { client: client as PublicClient, posts: (posts ?? []) as PublicPost[] };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.client;
    const title = c ? `${c.name} — Conteúdos` : "Conteúdos do cliente";
    const desc = c ? `Conteúdos aprovados de ${c.name}.` : "Vitrine de conteúdos.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
    ];
    if (c?.avatar_url) meta.push({ property: "og:image", content: c.avatar_url });
    return { meta };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Verifique se o link está correto.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: PublicClientPage,
});

const FILTERS: Array<{ key: "all" | ContentType; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "carrossel", label: "Carrosséis" },
  { key: "reels", label: "Vídeos" },
  { key: "post", label: "Posts" },
  { key: "story", label: "Stories" },
];

function PublicClientPage() {
  const { client, posts: initialPosts } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const [posts, setPosts] = useState<PublicPost[]>(initialPosts);
  const [filter, setFilter] = useState<"all" | ContentType>("all");
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase.rpc("get_public_client_content", { p_slug: slug });
    if (data) setPosts(data as PublicPost[]);
  };

  const filtered = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => detectType(p.tags) === filter)),
    [posts, filter],
  );

  const activePost = posts.find((p) => p.id === openPostId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 text-lg font-semibold text-primary-foreground">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt={client.name} className="h-full w-full object-cover" />
            ) : (
              initials(client.name) || "?"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{client.name}</h1>
            {client.company && (
              <p className="truncate text-sm text-muted-foreground">{client.company}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
              {client.instagram && (
                <a
                  href={`https://instagram.com/${client.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Instagram className="h-4 w-4" />
                  {client.instagram.replace(/^@/, "@")}
                </a>
              )}
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  site
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/30 p-10 text-center">
            <p className="text-muted-foreground">Em breve novos conteúdos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((post) => {
              const type = detectType(post.tags);
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={post.id}
                  onClick={() => setOpenPostId(post.id)}
                  className="group overflow-hidden rounded-2xl border bg-card text-left transition hover:shadow-lg"
                >
                  <div
                    className={cn(
                      "relative flex aspect-square items-center justify-center bg-gradient-to-br text-white",
                      meta.cover,
                    )}
                  >
                    <Icon className="h-10 w-10 opacity-80" />
                    <span className="absolute left-2 top-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                      {meta.label}
                    </span>
                    {post.approved && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                        <Check className="h-3 w-3" /> Aprovado
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-medium">{post.title}</p>
                    {post.caption && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption}</p>
                    )}
                    {post.comments_count > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MessageSquare className="h-3 w-3" /> {post.comments_count}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-muted-foreground">
        Feito com Postly
      </footer>

      <PostDialog
        post={activePost}
        slug={slug}
        open={!!activePost}
        onOpenChange={(o) => !o && setOpenPostId(null)}
        onMutated={refresh}
      />
    </div>
  );
}

const commentSchema = z.object({
  name: z.string().trim().max(80).optional(),
  body: z.string().trim().min(1, "Escreva um comentário").max(1000, "Até 1000 caracteres"),
});

function PostDialog({
  post,
  slug,
  open,
  onOpenChange,
  onMutated,
}: {
  post: PublicPost | null;
  slug: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onMutated: () => void;
}) {
  const storageKey = `postly-public-name:${slug}`;
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setName(window.localStorage.getItem(storageKey) ?? "");
    }
  }, [storageKey]);

  useEffect(() => {
    if (!post) return;
    setBody("");
    setLoadingComments(true);
    supabase
      .rpc("get_public_post_comments", { p_slug: slug, p_post_id: post.id })
      .then(({ data }) => setComments((data ?? []) as PublicComment[]))
      .then(() => setLoadingComments(false));
  }, [post, slug]);

  if (!post) return null;
  const type = detectType(post.tags);
  const meta = TYPE_META[type];

  const persistName = (val: string) => {
    setName(val);
    if (typeof window !== "undefined") {
      if (val.trim()) window.localStorage.setItem(storageKey, val.trim());
      else window.localStorage.removeItem(storageKey);
    }
  };

  const handleApprove = async () => {
    if (post.approved) return;
    setApproving(true);
    const { error } = await supabase.rpc("submit_post_approval", {
      p_slug: slug,
      p_post_id: post.id,
      p_author_name: name.trim() || null,
    });
    setApproving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conteúdo aprovado!");
    onMutated();
  };

  const handleComment = async () => {
    const parsed = commentSchema.safeParse({ name, body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique o comentário");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_post_comment", {
      p_slug: slug,
      p_post_id: post.id,
      p_author_name: name.trim() || null,
      p_body: body.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    toast.success("Comentário enviado!");
    const { data } = await supabase.rpc("get_public_post_comments", {
      p_slug: slug,
      p_post_id: post.id,
    });
    setComments((data ?? []) as PublicComment[]);
    onMutated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">{post.title}</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            "flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br text-white",
            meta.cover,
          )}
        >
          <meta.icon className="h-12 w-12 opacity-80" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{meta.label}</Badge>
          {post.approved && (
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
              <Check className="mr-1 h-3 w-3" /> Aprovado
            </Badge>
          )}
        </div>

        {post.caption && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{post.caption}</p>
        )}

        <div className="space-y-3 rounded-xl border bg-card/40 p-4">
          <Input
            placeholder="Seu nome (opcional)"
            maxLength={80}
            value={name}
            onChange={(e) => persistName(e.target.value)}
          />

          {post.approved ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Aprovado{post.approver_name ? ` por ${post.approver_name}` : ""}
              {post.approved_at && (
                <span className="text-xs opacity-70">
                  · {new Date(post.approved_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          ) : (
            <Button onClick={handleApprove} disabled={approving} className="w-full">
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Aprovar este conteúdo
            </Button>
          )}

          <Textarea
            placeholder="Escreva um comentário (opcional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{body.length}/1000</span>
            <Button onClick={handleComment} disabled={submitting || !body.trim()} size="sm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Comentários</h3>
          {loadingComments ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ainda sem comentários.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border bg-card/40 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.author_name || "Anônimo"}</span>
                    <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
