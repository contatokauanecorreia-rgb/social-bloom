import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Copy,
  Pencil,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/clientes/$id/")({
  component: VisaoGeralCliente,
});

type ClientRow = {
  name: string;
  company: string | null;
};

type BriefingRow = {
  business_description: string | null;
  target_audience: string | null;
  tone_of_voice: string | null;
  content_pillars: string[];
  goals: string[];
  dos: string[];
  donts: string[];
  archetype: string | null;
  palette: string[];
  brand_font: string | null;
  brand_font_url: string | null;
};

function VisaoGeralCliente() {
  const { id } = Route.useParams();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [briefing, setBriefing] = useState<BriefingRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("clients").select("name, company").eq("id", id).maybeSingle(),
      supabase
        .from("client_briefings")
        .select(
          "business_description, target_audience, tone_of_voice, content_pillars, goals, dos, donts, archetype, palette, brand_font, brand_font_url",
        )
        .eq("client_id", id)
        .maybeSingle(),
    ]).then(([c, b]) => {
      if (!active) return;
      setClient(c.data ?? null);
      setBriefing((b.data as BriefingRow | null) ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  // Carrega Google Font dinamicamente quando brand_font_url aponta para fonts.googleapis
  useEffect(() => {
    const url = briefing?.brand_font_url;
    if (!url || !/^https?:\/\//.test(url)) return;
    if (!url.includes("fonts.googleapis.com")) return;
    const existing = document.querySelector(`link[data-brand-font="${url}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.brandFont = url;
    document.head.appendChild(link);
  }, [briefing?.brand_font_url]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Métricas — content_posts ainda não tem client_id; quando adicionarmos
  // a coluna, basta filtrar aqui. Por enquanto, exibimos zerado com nota.
  const metrics = [
    {
      label: "Posts criados",
      value: 0,
      icon: FileText,
      tone: "text-foreground",
      bg: "bg-background/40",
    },
    {
      label: "Aprovados",
      value: 0,
      icon: CheckCircle2,
      tone: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Em revisão",
      value: 0,
      icon: Clock,
      tone: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Taxa de aprovação",
      value: "—",
      icon: TrendingUp,
      tone: "text-foreground",
      bg: "bg-background/40",
    },
  ] as const;

  const niche = client?.company ?? null;
  const tone = briefing?.tone_of_voice ?? null;
  const audience = briefing?.target_audience ?? null;
  const goal = briefing?.goals?.[0] ?? null;

  const dos = briefing?.dos ?? [];
  const donts = briefing?.donts ?? [];

  const palette = useMemo(() => {
    const p = briefing?.palette ?? [];
    return [p[0] ?? null, p[1] ?? null, p[2] ?? null] as Array<string | null>;
  }, [briefing]);

  const brandFont = briefing?.brand_font?.trim() || null;
  const archetype = briefing?.archetype?.trim() || null;
  const hasBranding = palette.some(Boolean) || brandFont || archetype;

  const aiContext = briefing
    ? [
        `Você está criando conteúdo para ${client?.name ?? "este cliente"}${niche ? ` (${niche})` : ""}.`,
        audience ? `Público-alvo: ${audience}` : null,
        tone ? `Tom de voz: ${tone}` : null,
        archetype ? `Arquétipo: ${archetype}` : null,
        briefing.content_pillars?.length
          ? `Pilares de conteúdo: ${briefing.content_pillars.join(", ")}`
          : null,
        briefing.goals?.length ? `Objetivos: ${briefing.goals.join(", ")}` : null,
        dos.length ? `Sempre: ${dos.join(", ")}` : null,
        donts.length ? `Nunca: ${donts.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Preencha o DNA da marca para gerar o contexto da IA deste cliente.";

  const copyContext = async () => {
    await navigator.clipboard.writeText(aiContext);
    toast.success("Contexto copiado!");
  };

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={cn("rounded-xl border p-4", m.bg)}>
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", m.tone)} />
                {m.label}
              </div>
              <div className={cn("mt-1.5 text-2xl font-bold tabular-nums", m.tone)}>
                {m.value}
              </div>
            </div>
          );
        })}
      </div>
      <p className="-mt-3 text-[11px] text-muted-foreground/80">
        ✦ Métricas ficarão dinâmicas assim que os conteúdos forem vinculados a este cliente no Planner.
      </p>

      {/* DNA da marca — Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DNA da marca · Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <BrandField label="Nicho" value={niche} />
          <BrandField label="Tom de voz" value={tone} />
          <BrandField label="Público-alvo" value={audience} />
          <BrandField label="Objetivo principal" value={goal} />
        </CardContent>
      </Card>

      {/* Personalidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalidade da marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PersonalityRow
            title="Faça"
            tags={dos}
            chipClass="border-emerald-200 bg-emerald-50 text-emerald-700"
            empty="Nenhuma palavra positiva definida."
          />
          <PersonalityRow
            title="Evite"
            tags={donts}
            chipClass="border-rose-200 bg-rose-50 text-rose-700"
            empty="Nenhuma palavra a evitar definida."
          />
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!hasBranding && (
            <p className="text-sm text-muted-foreground/80">
              — Defina paleta, fonte e arquétipo no DNA da marca.
            </p>
          )}

          {/* Paleta */}
          {palette.some(Boolean) && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Paleta
              </div>
              <div className="grid grid-cols-3 gap-3">
                {palette.map((hex, i) => (
                  <div key={i} className="space-y-1.5">
                    <div
                      className="h-16 w-full rounded-lg border shadow-sm"
                      style={{ backgroundColor: hex ?? "transparent" }}
                    />
                    <div className="text-[11px] font-mono uppercase text-muted-foreground">
                      {hex ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview tipográfico + arquétipo */}
          {(palette[0] || brandFont || archetype) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-xl p-5 shadow-sm"
                style={{
                  backgroundColor: palette[0] ?? "hsl(var(--muted))",
                  color: palette[2] ?? "#fff",
                }}
              >
                <div className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                  Preview tipográfico
                </div>
                <div
                  className="mt-2 text-3xl font-semibold leading-tight"
                  style={brandFont ? { fontFamily: `"${brandFont}", sans-serif` } : undefined}
                >
                  {client?.name ?? "Sua marca"}
                </div>
                <div
                  className="mt-1 text-sm opacity-90"
                  style={brandFont ? { fontFamily: `"${brandFont}", sans-serif` } : undefined}
                >
                  Aa Bb Cc · 0123456789
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/20 px-2.5 py-0.5 text-[11px] font-medium">
                  Fonte: {brandFont ?? "—"}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border bg-background/40 p-5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Arquétipo
                </div>
                {archetype ? (
                  <Badge variant="soft" className="w-fit text-sm">
                    {archetype}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground/70">— Defina no DNA da marca</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  O arquétipo guia o tom usado em todas as gerações automáticas.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contexto da IA */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Contexto da IA
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Esse contexto é injetado automaticamente em todas as gerações para esse cliente.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyContext}>
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={aiContext}
            readOnly
            rows={9}
            className="resize-none bg-muted/40 font-mono text-xs leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-end">
        <Button asChild variant="gradient">
          <Link to="/dashboard/clientes/$id/briefing" params={{ id }}>
            <Pencil className="h-4 w-4" />
            Editar DNA da marca
          </Link>
        </Button>
      </div>
    </div>
  );
}

function BrandField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-background/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {value ? (
        <div className="mt-1 text-sm text-foreground">{value}</div>
      ) : (
        <div className="mt-1 text-sm text-muted-foreground/70">— Adicione no DNA da marca</div>
      )}
    </div>
  );
}

function PersonalityRow({
  title,
  tags,
  chipClass,
  empty,
}: {
  title: string;
  tags: string[];
  chipClass: string;
  empty: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80",
                chipClass,
              )}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
