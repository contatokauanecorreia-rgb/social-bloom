import { cn } from "@/lib/utils";

export function OnlineDot({ className }: { className?: string }) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background",
          className,
        )}
      />
      <span className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-60" />
    </span>
  );
}
