import { Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModeCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  cost: number;
  locked?: boolean;
  lockedLabel?: string;
  disabled?: boolean;
  freeLabel?: string;
  onClick?: () => void;
};

export function ModeCard({
  icon: Icon,
  title,
  description,
  cost,
  locked = false,
  lockedLabel,
  disabled = false,
  freeLabel,
  onClick,
}: ModeCardProps) {
  const isInactive = locked || disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isInactive}
      className={cn(
        "group relative flex h-full flex-col items-start gap-3 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
        !isInactive && "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        isInactive && "cursor-not-allowed opacity-60",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          locked ? "bg-muted text-muted-foreground" : "bg-gradient-primary text-primary-foreground",
        )}
      >
        {locked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-2 flex w-full items-center justify-between">
        {locked ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
            {lockedLabel ?? "Disponível no Pro"}
          </span>
        ) : freeLabel ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {freeLabel}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">
            {cost === 1 ? "1 crédito" : `${cost} créditos`}
          </span>
        )}
      </div>
    </button>
  );
}
