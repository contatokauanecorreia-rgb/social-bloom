import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Loader2, Plus, X, Check } from "lucide-react";
import { TagInput } from "./TagInput";
import type { ContentPost, ContentWeek, PostStatus } from "@/lib/content-types";

export type PostDialogValue = {
  id?: string;
  title: string;
  week_id: string;
  tags: string[];
  notes: string;
  status: PostStatus;
};

type DraftPayload = {
  title: string;
  weekId: string;
  tags: string[];
  noteBlocks: string[];
  status: PostStatus;
  savedAt: number;
};

const DRAFT_PREFIX = "postly:plano:draft:";
const draftKey = (postId?: string) => `${DRAFT_PREFIX}${postId ?? "new"}`;

function readDraft(postId?: string): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(postId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(postId: string | undefined, payload: DraftPayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(postId), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

function clearDraft(postId?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(postId));
  } catch {
    // ignore
  }
}

export function PostDialog({
  open,
  onOpenChange,
  post,
  defaultWeekId,
  weeks,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ContentPost | null;
  defaultWeekId?: string;
  weeks: ContentWeek[];
  onSave: (value: PostDialogValue) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [weekId, setWeekId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [noteBlocks, setNoteBlocks] = useState<string[]>([""]);
  const [status, setStatus] = useState<PostStatus>("planned");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const noteRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const focusLastRef = useRef(false);
  const hydratedRef = useRef(false);

  // Hidrata estado ao abrir, restaurando rascunho local se existir e for mais novo
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    const baseTitle = post?.title ?? "";
    const baseWeek = post?.week_id ?? defaultWeekId ?? weeks[0]?.id ?? "";
    const baseTags = post?.tags ?? [];
    const raw = post?.notes ?? "";
    const baseBlocks = raw ? raw.split(/\n\n---\n\n/) : [""];
    const baseStatus: PostStatus = post?.status ?? "planned";

    const draft = readDraft(post?.id);
    if (draft) {
      setTitle(draft.title);
      setWeekId(draft.weekId || baseWeek);
      setTags(draft.tags);
      setNoteBlocks(draft.noteBlocks.length ? draft.noteBlocks : [""]);
      setStatus(draft.status);
      setDraftRestored(true);
      setSavedAt(draft.savedAt);
    } else {
      setTitle(baseTitle);
      setWeekId(baseWeek);
      setTags(baseTags);
      setNoteBlocks(baseBlocks.length ? baseBlocks : [""]);
      setStatus(baseStatus);
      setDraftRestored(false);
      setSavedAt(null);
    }
    // marca como hidratado no próximo tick para não disparar autosave
    requestAnimationFrame(() => {
      hydratedRef.current = true;
    });
  }, [open, post, defaultWeekId, weeks]);

  // Autosave em localStorage com debounce
  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      const payload: DraftPayload = {
        title,
        weekId,
        tags,
        noteBlocks,
        status,
        savedAt: Date.now(),
      };
      writeDraft(post?.id, payload);
      setSavedAt(payload.savedAt);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [open, post?.id, title, weekId, tags, noteBlocks, status]);

  useEffect(() => {
    if (focusLastRef.current) {
      const last = noteRefs.current[noteBlocks.length - 1];
      last?.focus();
      focusLastRef.current = false;
    }
  }, [noteBlocks.length]);

  const updateBlock = (index: number, value: string) => {
    setNoteBlocks((prev) => prev.map((b, i) => (i === index ? value : b)));
  };

  const addBlock = () => {
    focusLastRef.current = true;
    setNoteBlocks((prev) => [...prev, ""]);
  };

  const removeBlock = (index: number) => {
    setNoteBlocks((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    if (!title.trim() || !weekId) return;
    setSaving(true);
    try {
      const serializedNotes = noteBlocks
        .map((b) => b.trim())
        .filter(Boolean)
        .join("\n\n---\n\n");
      await onSave({
        id: post?.id,
        title: title.trim(),
        week_id: weekId,
        tags,
        notes: serializedNotes,
        status,
      });
      clearDraft(post?.id);
      setDraftRestored(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setSaving(true);
    try {
      await onDelete(post.id);
      clearDraft(post.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {post ? "Editar post" : "Novo post"}
            </DialogTitle>
          </DialogHeader>

          <Textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do post"
            rows={2}
            className="resize-none border-0 px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 md:text-3xl"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Semana
              </Label>
              <Select value={weekId} onValueChange={setWeekId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar semana" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Tags
            </Label>
            <TagInput value={tags} onChange={setTags} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Notas
            </Label>
            <div className="space-y-2">
              {noteBlocks.map((block, index) => (
                <div key={index} className="group relative">
                  <Textarea
                    ref={(el) => {
                      noteRefs.current[index] = el;
                    }}
                    value={block}
                    onChange={(e) => updateBlock(index, e.target.value)}
                    placeholder={index === 0 ? "Roteiro, ideias, hooks..." : "Mais notas..."}
                    rows={4}
                    className={noteBlocks.length > 1 ? "pr-10" : undefined}
                  />
                  {noteBlocks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBlock(index)}
                      className="absolute right-2 top-2 h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Remover bloco"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addBlock}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Adicionar bloco
            </Button>
          </div>


          <DialogFooter className="!justify-between">
            <div>
              {post && (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim() || !weekId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este post?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
