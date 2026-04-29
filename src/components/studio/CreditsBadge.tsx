import { Progress } from "@/components/ui/progress";
import { Sparkles, Infinity as InfinityIcon } from "lucide-react";
import type { CreditsState } from "@/lib/credits";
import { PLAN_LABEL } from "@/lib/credits";
import { cn } from "@/lib/utils";

export function CreditsBadge({ credits, className }: { credits: CreditsState; className?: string }) {
  const isUnlimited = credits.limit === Infinity;
  const percent = isUnlimited ? 100 : Math.min(100, (credits.used / credits.limit) * 100);
  const remainingLabel = isUnlimited ? "Ilimitado" : `${credits.remaining}`;

  return (
    <div
      className={cn(
        "flex flex-col items-end gap-1.5 rounded-xl border bg-card px-4 py-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Plano <span className="font-semibold text-foreground">{PLAN_LABEL[credits.plan]}</span>
      </div>
      <div className="flex items-center gap-2">
        {isUnlimited ? (
          <InfinityIcon className="h-4 w-4 text-primary" />
        ) : null}
        <span className="text-sm font-bold tabular-nums">
          {remainingLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {isUnlimited ? "créditos" : "créditos restantes este mês"}
        </span>
      </div>
      {!isUnlimited && (
        <Progress value={percent} className="h-1.5 w-44" />
      )}
    </div>
  );
}
