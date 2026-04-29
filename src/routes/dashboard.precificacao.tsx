import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, Copy, Sparkles, TrendingDown, TrendingUp, Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PresetKey = "starter" | "padrao" | "avancado";

const PRESETS: Array<{
  key: PresetKey;
  name: string;
  subtitle: string;
  clients: number;
  posts: number;
  perClient: number;
  badge: string;
  highlight?: boolean;
  icon: typeof Sparkles;
}> = [
  {
    key: "starter",
    name: "Starter",
    subtitle: "Pra começar com tudo",
    clients: 3,
    posts: 12,
    perClient: 800,
    badge: "Início",
    icon: Sparkles,
  },
  {
    key: "padrao",
    name: "Padrão",
    subtitle: "Operação madura",
    clients: 6,
    posts: 16,
    perClient: 1500,
    badge: "Mais escolhido",
    highlight: true,
    icon: Zap,
  },
  {
    key: "avancado",
    name: "Avançado",
    subtitle: "Estúdio premium",
    clients: 10,
    posts: 20,
    perClient: 2500,
    badge: "Premium",
    icon: Crown,
  },
];

export const Route = createFileRoute("/dashboard/precificacao")({
  head: () => ({ meta: [{ title: "Precificação — Postly" }] }),
  component: PrecificacaoPage,
});

type Extras = {
  stories: boolean;
  reels: boolean;
  report: boolean;
  meeting: boolean;
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MOCK_CLIENTS = [
  { id: "c1", name: "Bela Forma Estética", posts: 16, currentCharged: 1200 },
  { id: "c2", name: "Padaria Trigo de Ouro", posts: 8, currentCharged: 600 },
  { id: "c3", name: "Studio Pilates Vita", posts: 12, currentCharged: 900 },
  { id: "c4", name: "Dr. Lucas Odonto", posts: 10, currentCharged: 1500 },
  { id: "c5", name: "Brechó Manu", posts: 6, currentCharged: 400 },
];

const EXTRA_DEFS: Array<{
  key: keyof Extras;
  label: string;
  hint: string;
}> = [
  { key: "stories", label: "Stories", hint: "+20% do valor" },
  { key: "reels", label: "Reels", hint: "+30% do valor" },
  { key: "report", label: "Relatório mensal", hint: "+R$ 150 / cliente" },
  { key: "meeting", label: "Reunião mensal", hint: "+R$ 200 / cliente" },
];

function computePerClient(posts: number, hoursPerPost: number, hourlyRate: number, extras: Extras) {
  const baseHours = posts * hoursPerPost;
  const baseValue = baseHours * hourlyRate;
  let multiplier = 1;
  if (extras.stories) multiplier += 0.2;
  if (extras.reels) multiplier += 0.3;
  let value = baseValue * multiplier;
  if (extras.report) value += 150;
  if (extras.meeting) value += 200;
  return { baseHours, value };
}

function PrecificacaoPage() {
  const [clients, setClients] = useState(5);
  const [postsPerClient, setPostsPerClient] = useState(12);
  const [hoursPerPost, setHoursPerPost] = useState(1.5);
  const [hourlyRate, setHourlyRate] = useState(80);
  const [extras, setExtras] = useState<Extras>({
    stories: true,
    reels: true,
    report: false,
    meeting: false,
  });
  const [overrides, setOverrides] = useState<Record<string, number>>(
    Object.fromEntries(MOCK_CLIENTS.map((c) => [c.id, c.currentCharged])),
  );

  const result = useMemo(() => {
    const { baseHours, value: perClient } = computePerClient(
      postsPerClient,
      hoursPerPost,
      hourlyRate,
      extras,
    );
    const monthlyTotal = perClient * clients;
    const yearlyTotal = monthlyTotal * 12;
    const hoursMonthAll = baseHours * clients;
    const implicitRate = baseHours > 0 ? perClient / baseHours : 0;
    return { perClient, monthlyTotal, yearlyTotal, hoursMonthAll, implicitRate, baseHours };
  }, [clients, postsPerClient, hoursPerPost, hourlyRate, extras]);

  const tableRows = useMemo(() => {
    return MOCK_CLIENTS.map((c) => {
      const { value: suggested } = computePerClient(c.posts, hoursPerPost, hourlyRate, extras);
      const charged = overrides[c.id] ?? 0;
      const delta = suggested - charged;
      return { ...c, suggested, charged, delta };
    });
  }, [overrides, hoursPerPost, hourlyRate, extras]);

  const totals = useMemo(() => {
    return tableRows.reduce(
      (acc, r) => ({
        charged: acc.charged + r.charged,
        suggested: acc.suggested + r.suggested,
        delta: acc.delta + r.delta,
      }),
      { charged: 0, suggested: 0, delta: 0 },
    );
  }, [tableRows]);

  const copySummary = async () => {
    const lines = [
      "Resumo da precificação — Postly",
      `Clientes ativos: ${clients}`,
      `Posts/cliente/mês: ${postsPerClient}`,
      `Horas por post: ${hoursPerPost}h`,
      `Valor hora: ${BRL.format(hourlyRate)}`,
      `Extras: ${EXTRA_DEFS.filter((e) => extras[e.key]).map((e) => e.label).join(", ") || "nenhum"}`,
      "",
      `Valor por cliente/mês: ${BRL.format(result.perClient)}`,
      `Total mensal: ${BRL.format(result.monthlyTotal)}`,
      `Total anual: ${BRL.format(result.yearlyTotal)}`,
      `Horas/mês totais: ${result.hoursMonthAll}h · Hora implícita: ${BRL.format(result.implicitRate)}`,
    ].join("\n");
    await navigator.clipboard.writeText(lines);
    toast.success("Resumo copiado!");
  };

  return (
    <PageContainer wide>
      <Badge variant="soft" className="mb-3 w-fit">
        Negócio
      </Badge>
      <PageHeader
        title="Calculadora de precificação"
        description="Simule seu valor ideal por cliente em segundos."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Inputs */}
        <div className="grid gap-4">
          <SliderCard
            label="Clientes ativos"
            value={`${clients} ${clients === 1 ? "cliente" : "clientes"}`}
          >
            <Slider
              min={1}
              max={20}
              step={1}
              value={[clients]}
              onValueChange={(v) => setClients(v[0])}
            />
            <ScaleHint left="1" right="20" />
          </SliderCard>

          <SliderCard label="Posts por cliente / mês" value={`${postsPerClient} posts`}>
            <Slider
              min={4}
              max={30}
              step={1}
              value={[postsPerClient]}
              onValueChange={(v) => setPostsPerClient(v[0])}
            />
            <ScaleHint left="4" right="30" />
          </SliderCard>

          <SliderCard label="Horas estimadas por post" value={`${hoursPerPost.toFixed(1)} h`}>
            <Slider
              min={0.5}
              max={3}
              step={0.5}
              value={[hoursPerPost]}
              onValueChange={(v) => setHoursPerPost(v[0])}
            />
            <ScaleHint left="0.5h" right="3h" />
          </SliderCard>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Valor hora desejado</CardTitle>
                <span className="text-sm font-semibold tabular-nums">
                  {BRL.format(hourlyRate)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min={0}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Extras incluídos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {EXTRA_DEFS.map((ex) => {
                const checked = extras[ex.key];
                return (
                  <label
                    key={ex.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      checked ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setExtras((e) => ({ ...e, [ex.key]: Boolean(v) }))
                      }
                      className="mt-0.5"
                    />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-medium leading-none">{ex.label}</span>
                      <span className="text-xs text-muted-foreground">{ex.hint}</span>
                    </div>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Result */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-primary/30 bg-gradient-primary-soft">
            <CardContent className="grid gap-5 p-6">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calculator className="h-3.5 w-3.5" />
                  Valor sugerido / cliente · mês
                </div>
                <div className="mt-2 text-5xl font-bold tabular-nums text-gradient-primary">
                  {BRL.format(result.perClient)}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total mensal
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {BRL.format(result.monthlyTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total anual
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {BRL.format(result.yearlyTotal)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-background/60 p-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">{result.hoursMonthAll}h</span>{" "}
                  / mês de trabalho total
                </div>
                <div className="mt-1">
                  Custo por hora implícito:{" "}
                  <span className="font-semibold text-foreground">
                    {BRL.format(result.implicitRate)}
                  </span>
                </div>
              </div>

              <Button variant="outline" onClick={copySummary}>
                <Copy className="h-4 w-4" />
                Copiar resumo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comparison table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Comparação por cliente</CardTitle>
          <p className="text-xs text-muted-foreground">
            Valores sugeridos com a configuração atual de horas, hora e extras.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Posts / mês</TableHead>
                <TableHead className="text-right">Cobrado hoje</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => {
                const positive = row.delta >= 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.posts}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={row.charged}
                        onChange={(e) =>
                          setOverrides((o) => ({
                            ...o,
                            [row.id]: Number(e.target.value) || 0,
                          }))
                        }
                        className="ml-auto h-8 w-28 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {BRL.format(row.suggested)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          positive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800",
                        )}
                      >
                        {positive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {positive ? "+" : "−"}
                        {BRL.format(Math.abs(row.delta)).replace("R$", "R$ ")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Totais</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">
                  {BRL.format(totals.charged)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {BRL.format(totals.suggested)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  <span
                    className={cn(
                      totals.delta >= 0 ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {totals.delta >= 0 ? "+" : "−"}
                    {BRL.format(Math.abs(totals.delta))}
                  </span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function SliderCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

function ScaleHint({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
