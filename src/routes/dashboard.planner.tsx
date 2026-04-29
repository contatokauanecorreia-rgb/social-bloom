import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, X, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { WeekColumn } from "@/components/plano/WeekColumn";
import { TagChip } from "@/components/plano/TagChip";
import { PostDialog, type PostDialogValue } from "@/components/plano/PostDialog";
import { PostCard } from "@/components/plano/PostCard";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ContentPost, ContentWeek } from "@/lib/content-types";

export const Route = createFileRoute("/dashboard/planner")({
  head: () => ({
    meta: [
      { title: "Planner de conteúdo — Postly" },
      { name: "description", content: "Organize seus posts por semana." },
    ],
  }),
  component: PlanoPage,
});

function PlanoPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<ContentWeek[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [defaultWeekId, setDefaultWeekId] = useState<string | undefined>();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragSnapshot, setDragSnapshot] = useState<ContentPost[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadAll = useCallback(async (uid: string) => {
    const [w, p, c] = await Promise.all([
      supabase
        .from("content_weeks")
        .select("*")
        .eq("user_id", uid)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("content_posts")
        .select("*")
        .eq("user_id", uid)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("clients")
        .select("id,name")
        .eq("user_id", uid)
        .order("name", { ascending: true }),
    ]);
    if (w.error) toast.error(w.error.message);
    if (p.error) toast.error(p.error.message);
    if (c.error) toast.error(c.error.message);
    setWeeks((w.data ?? []) as ContentWeek[]);
    setPosts((p.data ?? []) as ContentPost[]);
    setClients((c.data ?? []) as { id: string; name: string }[]);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      setUserId(data.session.user.id);
      await loadAll(data.session.user.id);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadAll]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) for (const t of p.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (selectedClient !== "all" && p.client_id !== selectedClient) return false;
      if (q) {
        const hay = `${p.title} ${p.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeTags.length > 0) {
        for (const t of activeTags) if (!p.tags.includes(t)) return false;
      }
      return true;
    });
  }, [posts, search, activeTags, selectedClient]);

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, c.name);
    return m;
  }, [clients]);
  const getClientName = useCallback(
    (id: string | null) => (id ? clientNameById.get(id) : undefined),
    [clientNameById],
  );

  const postsByWeek = useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    for (const w of weeks) map.set(w.id, []);
    for (const p of filteredPosts) {
      const arr = map.get(p.week_id);
      if (arr) arr.push(p);
    }
    return map;
  }, [weeks, filteredPosts]);

  const handleAddWeek = async () => {
    if (!userId) return;
    const name = `Semana ${weeks.length + 1}`;
    const position = weeks.length;
    const { data, error } = await supabase
      .from("content_weeks")
      .insert({ user_id: userId, name, position })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setWeeks((prev) => [...prev, data as ContentWeek]);
    toast.success("Semana adicionada");
  };

  const handleRenameWeek = async (id: string, name: string) => {
    const { error } = await supabase.from("content_weeks").update({ name }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setWeeks((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
  };

  const handleDeleteWeek = async (id: string) => {
    const { error } = await supabase.from("content_weeks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setWeeks((prev) => prev.filter((w) => w.id !== id));
    setPosts((prev) => prev.filter((p) => p.week_id !== id));
    toast.success("Semana removida");
  };

  const openNewPost = (weekId?: string) => {
    if (weeks.length === 0) {
      toast.error("Crie uma semana primeiro.");
      return;
    }
    setEditingPost(null);
    setDefaultWeekId(weekId ?? weeks[0]?.id);
    setDialogOpen(true);
  };

  const openEditPost = (post: ContentPost) => {
    setEditingPost(post);
    setDefaultWeekId(undefined);
    setDialogOpen(true);
  };

  const handleSavePost = async (value: PostDialogValue) => {
    if (!userId) return;
    if (value.id) {
      const { data, error } = await supabase
        .from("content_posts")
        .update({
          title: value.title,
          week_id: value.week_id,
          client_id: value.client_id,
          tags: value.tags,
          notes: value.notes || null,
          status: value.status,
        })
        .eq("id", value.id)
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        throw error;
      }
      setPosts((prev) => prev.map((p) => (p.id === value.id ? (data as ContentPost) : p)));
      toast.success("Post atualizado");
    } else {
      const sameWeekCount = posts.filter((p) => p.week_id === value.week_id).length;
      const { data, error } = await supabase
        .from("content_posts")
        .insert({
          user_id: userId,
          title: value.title,
          week_id: value.week_id,
          client_id: value.client_id,
          tags: value.tags,
          notes: value.notes || null,
          status: value.status,
          position: sameWeekCount,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        throw error;
      }
      setPosts((prev) => [...prev, data as ContentPost]);
      toast.success("Post criado");
    }
  };

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from("content_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Post removido");
  };

  const handleDuplicatePost = async (post: ContentPost) => {
    if (!userId) return;
    const sameWeekCount = posts.filter((p) => p.week_id === post.week_id).length;
    const { data, error } = await supabase
      .from("content_posts")
      .insert({
        user_id: userId,
        title: `${post.title} (cópia)`,
        week_id: post.week_id,
        client_id: post.client_id,
        tags: post.tags,
        notes: post.notes,
        status: post.status,
        position: sameWeekCount,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) => [...prev, data as ContentPost]);
    toast.success("Post duplicado");
  };

  const toggleTag = (t: string) => {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const clearFilters = () => {
    setSearch("");
    setActiveTags([]);
  };

  const hasFilters = search.trim() !== "" || activeTags.length > 0;

  const activePost = activeId ? posts.find((p) => p.id === activeId) ?? null : null;

  const findContainer = (id: string): string | null => {
    if (weeks.some((w) => `week-${w.id}` === id)) return id.replace(/^week-/, "");
    const post = posts.find((p) => p.id === id);
    return post?.week_id ?? null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setDragSnapshot(posts);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeContainer = findContainer(activeIdStr);
    const overContainer = findContainer(overIdStr);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setPosts((prev) => {
      const activeItem = prev.find((p) => p.id === activeIdStr);
      if (!activeItem) return prev;
      const without = prev.filter((p) => p.id !== activeIdStr);
      const overItems = without.filter((p) => p.week_id === overContainer);
      const overIndex = overItems.findIndex((p) => p.id === overIdStr);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;

      const otherWeeks = without.filter((p) => p.week_id !== overContainer);
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        { ...activeItem, week_id: overContainer },
        ...overItems.slice(insertAt),
      ];
      return [...otherWeeks, ...newOverItems];
    });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      setDragSnapshot(null);
      return;
    }
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const overContainer = findContainer(overIdStr);
    if (!overContainer) {
      setDragSnapshot(null);
      return;
    }

    // Reordenação dentro do mesmo container
    let nextPosts = posts;
    const activeItem = posts.find((p) => p.id === activeIdStr);
    if (!activeItem) {
      setDragSnapshot(null);
      return;
    }

    if (activeItem.week_id === overContainer && activeIdStr !== overIdStr) {
      const containerItems = posts.filter((p) => p.week_id === overContainer);
      const oldIndex = containerItems.findIndex((p) => p.id === activeIdStr);
      const newIndex = containerItems.findIndex((p) => p.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(containerItems, oldIndex, newIndex);
        nextPosts = [...posts.filter((p) => p.week_id !== overContainer), ...reordered];
        setPosts(nextPosts);
      }
    }

    // Recalcula positions de todas as semanas afetadas
    const snapshot = dragSnapshot ?? [];
    const normalized: ContentPost[] = [];
    for (const w of weeks) {
      const items = nextPosts.filter((p) => p.week_id === w.id);
      items.forEach((p, idx) => normalized.push({ ...p, position: idx }));
    }

    const changed = normalized.filter((p) => {
      const prev = snapshot.find((s) => s.id === p.id);
      return !prev || prev.week_id !== p.week_id || prev.position !== p.position;
    });

    setPosts(normalized);
    setDragSnapshot(null);

    if (changed.length === 0) return;

    const results = await Promise.all(
      changed.map((p) =>
        supabase
          .from("content_posts")
          .update({ week_id: p.week_id, position: p.position })
          .eq("id", p.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Falha ao salvar a ordem. Revertendo.");
      setPosts(snapshot);
    }
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer wide>
      <div className="mb-4 flex flex-col gap-1.5 rounded-xl border bg-card/40 p-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:w-44">
          <Users className="h-4 w-4" />
          <Label htmlFor="planner-client" className="cursor-pointer text-sm font-medium">
            Para qual cliente?
          </Label>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger id="planner-client" className="sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Badge variant="soft" className="mb-3 w-fit">Conteúdo</Badge>
      <PageHeader
        title="Planner de conteúdo"
        description="Organize seus posts por semana, com tags livres e filtros."
        actions={
          <>
            <Button variant="outline" onClick={handleAddWeek}>
              <Plus className="h-4 w-4" />
              Nova semana
            </Button>
            <Button onClick={() => openNewPost()}>
              <Plus className="h-4 w-4" />
              Novo post
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card/40 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou nota..."
              className="pl-9"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <TagChip
                key={t}
                label={t}
                active={activeTags.includes(t)}
                onClick={() => toggleTag(t)}
              />
            ))}
          </div>
        )}
      </div>

      {weeks.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
          <h3 className="text-lg font-semibold">Comece criando uma semana</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada semana é uma coluna do seu quadro. Adicione quantas precisar.
          </p>
          <Button className="mt-4" onClick={handleAddWeek}>
            <Plus className="h-4 w-4" />
            Criar primeira semana
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            if (dragSnapshot) setPosts(dragSnapshot);
            setActiveId(null);
            setDragSnapshot(null);
          }}
        >
          {hasFilters && (
            <p className="mb-2 text-xs text-muted-foreground">
              Limpe os filtros para reordenar arrastando.
            </p>
          )}
          <div className="-mx-6 overflow-x-auto px-6 pb-4 md:-mx-10 md:px-10">
            <div className="flex min-h-[60vh] gap-3">
              {weeks.map((w) => (
                <WeekColumn
                  key={w.id}
                  week={w}
                  posts={postsByWeek.get(w.id) ?? []}
                  onRename={handleRenameWeek}
                  onDelete={handleDeleteWeek}
                  onAddPost={openNewPost}
                  onOpenPost={openEditPost}
                  onDuplicatePost={handleDuplicatePost}
                  onDeletePost={(p) => handleDeletePost(p.id)}
                  dndDisabled={hasFilters}
                  getClientName={getClientName}
                  showClientChip={selectedClient === "all"}
                />
              ))}
              <button
                type="button"
                onClick={handleAddWeek}
                className="flex h-12 w-72 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Nova semana
              </button>
            </div>
          </div>
          <DragOverlay>
            {activePost ? (
              <PostCard post={activePost} onClick={() => {}} draggable={false} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <PostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={editingPost}
        defaultWeekId={defaultWeekId}
        defaultClientId={selectedClient !== "all" ? selectedClient : null}
        weeks={weeks}
        clients={clients}
        onSave={handleSavePost}
        onDelete={handleDeletePost}
      />
    </PageContainer>
  );
}
