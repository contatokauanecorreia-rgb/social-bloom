import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, FileDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/precificacao")({
  head: () => ({ meta: [{ title: "Precificação — Postly" }] }),
  component: PrecificacaoPage,
});

type Items = {
  posts: { qty: number; price: number };
  carousels: { qty: number; price: number };
  reels: { qty: number; price: number };
  stories: { qty: number; price: number };
  highlights: { qty: number; price: number };
};

type State = {
  items: Items;
  fixedCosts: number;
  margin: number;
  preset: "starter" | "pro" | "premium" | "custom";
};

const PRESETS: Record<"starter" | "pro" | "premium", Items> = {
  starter: {
    posts: { qty: 8, price: 80 },
    carousels: { qty: 4, price: 150 },
    reels: { qty: 2, price: 250 },
    stories: { qty: 12, price: 30 },
    highlights: { qty: 0, price: 50 },
  },
  pro: {
    posts: { qty: 12, price: 100 },
    carousels: { qty: 8, price: 180 },
    reels: { qty: 4, price: 300 },
    stories: { qty: 20, price: 35 },
    highlights: { qty: 2, price: 60 },
  },
  premium: {
    posts: { qty: 20, price: 130 },
    carousels: { qty: 12, price: 220 },
    reels: { qty: 8, price: 400 },
    stories: { qty: 30, price: 45 },
    highlights: { qty: 4, price: 80 },
  },
};

const ITEM_LABELS: Record<keyof Items, string> = {
  posts: "Posts feed",
  carousels: "Carrosséis",
  reels: "Reels",
  stories: "Stories",
  highlights: "Capas de destaque",
};

const STORAGE_KEY = "postly:pricing-state";

const defaultState: State = {
  items: PRESETS.pro,
  fixedCosts: 200,
  margin: 30,
  preset: "pro",
};

function PrecificacaoPage() {
  const [state, setState] = useState<State>(defaultState);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setState(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  const applyPreset = (p: "starter" | "pro" | "premium") => {
    setState((s) => ({ ...s, preset: p, items: PRESETS[p] }));
  };

  const reset = () => {
    setState({ ...defaultState, preset: "custom", items: { posts: { qty: 0, price: 0 }, carousels: { qty: 0, price: 0 }, reels: { qty: 0, price: 0 }, stories: { qty: 0, price: 0 }, highlights: { qty: 0, price: 0 } } });
  };

  const updateItem = (key: keyof Items, field: "qty" | "price", value: number) => {
    setState((s) => ({
      ...s,
      preset: "custom",
      items: { ...s.items, [key]: { ...s.items[key], [field]: value } },
    }));
  };

  const subtotal = useMemo(() => {
    return Object.values(state.items).reduce((acc, it) => acc + it.qty * it.price, 0);
  }, [state.items]);

  const total = useMemo(() => {
    return (subtotal + state.fixedCosts) * (1 + state.margin / 100);
  }, [subtotal, state.fixedCosts, state.margin]);

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    toast.success("Configuração salva!");
  };

  const presets: Array<{ id: "starter" | "pro" | "premium"; label: string; desc: string }> = [
    { id: "starter", label: "Starter", desc: "Para clientes começando." },
    { id: "pro", label: "Pro", desc: "Volume médio recorrente." },
    { id: "premium", label: "Premium", desc: "Operação completa." },
  ];

  return (
    <PageContainer wide>
      <Badge variant="soft" className="mb-3 w-fit">Negócio</Badge>
      <PageHeader
        title="Calculadora de precificação"
        description="Monte pacotes mensais com presets, margem e custos fixos."
        actions={
          <Button variant="gradient" onClick={save}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: presets */}
        <div className="grid gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Presets</h3>
          {presets.map((p) => {
            const active = state.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/20",
                  active && "border-primary shadow-primary",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.label}</span>
                  {active && <Badge variant="soft">Ativo</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
              </button>
            );
          })}
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Começar do zero
          </Button>
        </div>

        {/* Right: configuration */}
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregáveis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="hidden grid-cols-[1fr_100px_140px_140px] gap-3 text-xs font-medium text-muted-foreground sm:grid">
                <div>Item</div>
                <div className="text-right">Qtd / mês</div>
                <div className="text-right">Valor unitário</div>
                <div className="text-right">Subtotal</div>
              </div>
              {(Object.keys(state.items) as Array<keyof Items>).map((key) => {
                const item = state.items[key];
                const sub = item.qty * item.price;
                return (
                  <div key={key} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_100px_140px_140px] sm:items-center">
                    <div className="col-span-2 text-sm font-medium sm:col-span-1">{ITEM_LABELS[key]}</div>
                    <Input
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => updateItem(key, "qty", Number(e.target.value) || 0)}
                      className="text-right"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateItem(key, "price", Number(e.target.value) || 0)}
                      className="text-right"
                    />
                    <div className="text-right text-sm font-semibold tabular-nums">
                      R$ {sub.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custos fixos (R$)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Label htmlFor="fc">Ferramentas, freelas, etc.</Label>
                <Input
                  id="fc"
                  type="number"
                  min={0}
                  value={state.fixedCosts}
                  onChange={(e) => setState((s) => ({ ...s, fixedCosts: Number(e.target.value) || 0 }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Margem (%)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Label htmlFor="m">Lucro desejado sobre o custo.</Label>
                <Input
                  id="m"
                  type="number"
                  min={0}
                  value={state.margin}
                  onChange={(e) => setState((s) => ({ ...s, margin: Number(e.target.value) || 0 }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/30 bg-gradient-primary-soft">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calculator className="h-3.5 w-3.5" /> Valor mensal sugerido
                </div>
                <div className="mt-1 text-4xl font-bold tabular-nums text-gradient-primary">
                  R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Subtotal R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + custos R$ {state.fixedCosts.toLocaleString("pt-BR")} × {(1 + state.margin / 100).toFixed(2)}
                </p>
              </div>
              <Button variant="outline" onClick={() => toast.info("Em breve: exportar PDF.")}>
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
