import { Sparkles, Target, MessageCircle, Tag, type LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CLIENT_BRIEFINGS, getClientBriefing } from "@/lib/client-context";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
  /** compact = chat header (sem bloco "sempre/nunca usar"). default = card cheio. */
  variant?: "default" | "compact";
};

const NONE = "__none";

export function ClientContextBar({ value, onChange, className, variant = "default" }: Props) {
  const briefing = getClientBriefing(value);
  const compact = variant === "compact";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Para qual cliente?
        </label>
        <div className="sm:w-72">
          <Select
            value={value ?? NONE}
            onValueChange={(v) => onChange(v === NONE ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem cliente (genérico)</SelectItem>
              {CLIENT_BRIEFINGS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {briefing && (
        <div
          className={cn(
            "rounded-xl border border-primary/30 bg-gradient-primary-soft",
            compact ? "p-3" : "p-4",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Contexto ativo · a IA vai usar este briefing
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{briefing.name}</span>
            <Badge variant="soft" className="text-[10px]">
              {briefing.segment}
            </Badge>
          </div>

          <div className={cn("mt-3 grid gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-3")}>
            <ContextRow icon={MessageCircle} label="Tom de voz" value={briefing.toneOfVoice} />
            <ContextRow icon={Target} label="Objetivo" value={briefing.objective} />
            <ContextRow icon={Tag} label="Palavras-chave" chips={briefing.keywords} />
          </div>

          {!compact && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ChipBlock label="Sempre usar" chips={briefing.alwaysUse} tone="positive" />
              <ChipBlock label="Nunca usar" chips={briefing.neverUse} tone="negative" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContextRow({
  icon: Icon,
  label,
  value,
  chips,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  chips?: string[];
}) {
  return (
    <div className="rounded-lg bg-background/60 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      {value && <p className="mt-1 text-sm font-medium text-foreground">{value}</p>}
      {chips && (
        <div className="mt-1 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipBlock({
  label,
  chips,
  tone,
}: {
  label: string;
  chips: string[];
  tone: "positive" | "negative";
}) {
  const palette =
    tone === "positive"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";
  return (
    <div className="rounded-lg bg-background/60 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {chips.map((c) => (
          <span key={c} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", palette)}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
