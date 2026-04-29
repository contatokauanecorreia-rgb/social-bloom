import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, MessageCircle, Target, Tag, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ClientOption = {
  id: string;
  name: string;
  segment: string | null;
};

export type ActiveBriefing = {
  toneOfVoice: string | null;
  goals: string[];
  contentPillars: string[];
  archetype: string | null;
  palette: string[];
};

const NONE = "__none";

const ARCHETYPE_LABEL: Record<string, string> = {
  cuidador: "Cuidador",
  criador: "Criador",
  sabio: "Sábio",
  heroi: "Herói",
  rebelde: "Rebelde",
  inocente: "Inocente",
};

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  clients: ClientOption[];
};

export function ClientPicker({ value, onChange, clients }: Props) {
  const [briefing, setBriefing] = useState<ActiveBriefing | null>(null);
  const active = clients.find((c) => c.id === value) ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setBriefing(null);
      return;
    }
    supabase
      .from("client_briefings")
      .select("tone_of_voice, goals, content_pillars, archetype, palette")
      .eq("client_id", value)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setBriefing(
          data
            ? {
                toneOfVoice: data.tone_of_voice ?? null,
                goals: data.goals ?? [],
                contentPillars: data.content_pillars ?? [],
                archetype: data.archetype ?? null,
                palette: data.palette ?? [],
              }
            : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="flex flex-col gap-4">
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
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {active && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-primary-soft p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Contexto ativo · DNA da marca
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-foreground">{active.name}</span>
            {active.segment && (
              <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {active.segment}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <InfoBlock icon={MessageCircle} label="Tom de voz" value={briefing?.toneOfVoice ?? "—"} />
            <InfoBlock
              icon={Target}
              label="Objetivo"
              value={briefing?.goals?.length ? briefing.goals.join(", ") : "—"}
            />
            <InfoBlock
              icon={Crown}
              label="Arquétipo"
              value={
                briefing?.archetype
                  ? ARCHETYPE_LABEL[briefing.archetype] ?? briefing.archetype
                  : "—"
              }
            />
            <PaletteBlock palette={briefing?.palette ?? []} />
          </div>

          {briefing?.contentPillars && briefing.contentPillars.length > 0 && (
            <div className="mt-3 rounded-lg bg-background/60 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3 w-3" />
                Palavras-chave
              </div>
              <div className="flex flex-wrap gap-1.5">
                {briefing.contentPillars.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    #{p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function PaletteBlock({ palette }: { palette: string[] }) {
  const colors = palette.length > 0 ? palette.slice(0, 3) : ["#E5E7EB", "#E5E7EB", "#E5E7EB"];
  return (
    <div className="rounded-lg bg-background/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Paleta
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {colors.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn("h-7 w-7 rounded-full border border-border shadow-inner")}
              style={{ backgroundColor: c }}
            />
            <span className="font-mono text-[9px] text-muted-foreground">{c.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
