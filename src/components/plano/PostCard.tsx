import { useState } from "react";
import type { ContentPost } from "@/lib/content-types";
import { TagChip } from "./TagChip";
import { CheckCircle2, MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

export function PostCard({
  post,
  onClick,
  onDuplicate,
  onDelete,
  draggable = true,
  isOverlay = false,
}: {
  post: ContentPost;
  onClick: () => void;
  onDuplicate?: (post: ContentPost) => void;
  onDelete?: (post: ContentPost) => void;
  draggable?: boolean;
  isOverlay?: boolean;
}) {
  const sortable = useSortable({
    id: post.id,
    data: { type: "post", weekId: post.week_id },
    disabled: !draggable,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showMenu = !isOverlay && (onDuplicate || onDelete);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card relative",
        isDragging && "opacity-40",
        isOverlay && "rotate-2 shadow-2xl ring-2 ring-primary/40",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        {...attributes}
        {...listeners}
        className={cn(
          "w-full cursor-grab rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:border-foreground/20 hover:shadow active:cursor-grabbing",
        )}
      >
        <div className="flex items-start gap-2">
          <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
          <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground">
            {post.title}
          </h4>
          {post.status === "published" && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
        </div>
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((t) => (
              <TagChip key={t} label={t} />
            ))}
          </div>
        )}
      </button>

      {showMenu && (
        <div
          className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-card/80 text-muted-foreground shadow-sm backdrop-blur hover:bg-accent hover:text-foreground"
                aria-label="Opções do post"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(post)}>
                  <Copy className="h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este post?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.(post);
              }}
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
