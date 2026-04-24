import type { ContentPost } from "@/lib/content-types";
import { TagChip } from "./TagChip";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PostCard({ post, onClick }: { post: ContentPost; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:border-foreground/20 hover:shadow",
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
  );
}
