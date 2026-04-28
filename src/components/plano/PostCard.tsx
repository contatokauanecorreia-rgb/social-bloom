import type { ContentPost } from "@/lib/content-types";
import { TagChip } from "./TagChip";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function PostCard({
  post,
  onClick,
  draggable = true,
  isOverlay = false,
}: {
  post: ContentPost;
  onClick: () => void;
  draggable?: boolean;
  isOverlay?: boolean;
}) {
  const sortable = useSortable({
    id: post.id,
    data: { type: "post", weekId: post.week_id },
    disabled: !draggable,
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
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
          "group w-full cursor-grab rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:border-foreground/20 hover:shadow active:cursor-grabbing",
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
    </div>
  );
}
