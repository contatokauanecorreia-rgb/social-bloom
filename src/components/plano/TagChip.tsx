import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tagColor } from "@/lib/tag-color";

export function TagChip({
  label,
  onRemove,
  onClick,
  active,
  className,
}: {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const color = tagColor(label);
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        color,
        interactive && "cursor-pointer transition-shadow hover:shadow-sm",
        active && "ring-2 ring-foreground/30",
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-sm hover:bg-black/10"
          aria-label={`Remover ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
