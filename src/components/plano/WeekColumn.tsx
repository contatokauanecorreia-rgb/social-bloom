import { useState, type KeyboardEvent } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { PostCard } from "./PostCard";
import type { ContentPost, ContentWeek } from "@/lib/content-types";

export function WeekColumn({
  week,
  posts,
  onRename,
  onDelete,
  onAddPost,
  onOpenPost,
  dndDisabled = false,
}: {
  week: ContentWeek;
  posts: ContentPost[];
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddPost: (weekId: string) => void;
  onOpenPost: (post: ContentPost) => void;
  dndDisabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-${week.id}`,
    data: { type: "week", weekId: week.id },
    disabled: dndDisabled,
  });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(week.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commit = async () => {
    setEditing(false);
    const next = draftName.trim();
    if (next && next !== week.name) {
      await onRename(week.id, next);
    } else {
      setDraftName(week.name);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraftName(week.name);
      setEditing(false);
    }
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-muted/40 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        {editing ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            className="h-7 flex-1 px-1.5 py-0 text-sm font-medium"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary"
          >
            {week.name}
          </button>
        )}
        <span className="text-xs tabular-nums text-muted-foreground">{posts.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
              aria-label="Opções da semana"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Excluir semana
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        {posts.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhum post ainda.
          </div>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onClick={() => onOpenPost(p)} />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 justify-start text-muted-foreground hover:text-foreground"
        onClick={() => onAddPost(week.id)}
      >
        <Plus className="h-4 w-4" />
        Novo post
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir semana "{week.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {posts.length} post(s) dessa semana serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(week.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
