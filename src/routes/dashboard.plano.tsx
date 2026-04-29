import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, CreditCard, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/plano")({
  head: () => ({
    meta: [
      { title: "Plano e assinatura — Postly" },
      { name: "description", content: "Gerencie seu plano e cobrança no Postly." },
    ],
  }),
  component: PlanoAssinaturaPage,
});

type PlanKey = "starter" | "pro" | "premium";

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: number;
  tagline: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    key: "starter",
    name: "Starter",
    price: 37,
    tagline: "Para quem está começando a organizar a operação.",
    features: [
      "Clientes ilimitados",
      "Hub de clientes completo",
      "DNA da marca completo",
      "Portal de aprovação visual",
      "Studio: Criar copy + Criar carrossel",
      "20 créditos de IA/mês",
      "Cola conteúdo manual sem limite",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 87,
    tagline: "Para social medias que querem escalar com IA.",
    highlight: true,
    features: [
      "Tudo do Starter",
      "Studio: todos os modos desbloqueados",
      "100 créditos de IA/mês",
      "Planner de conteúdo",
      "Precificação guiada",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: 197,
    tagline: "Para agências e times com fluxo avançado.",
    features: [
      "Tudo do Pro",
      "Créditos ilimitados",
      "Conecta API Key própria",
      "Conecta agente personalizado",
      "Workspace para times (em breve)",
    ],
  },
];

function PlanoAssinaturaPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanKey>("starter");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<PlanKey | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!active || !sess.session) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!active) return;
      if (data?.plan && ["starter", "pro", "premium"].includes(data.plan)) {
        setCurrentPlan(data.plan as PlanKey);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = async (key: PlanKey) => {
    if (key === currentPlan) return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      toast.error("Faça login para alterar o plano");
      return;
    }
    setUpdating(key);
    const { error } = await supabase
      .from("user_subscriptions")
      .upsert(
        { user_id: sess.session.user.id, plan: key },
        { onConflict: "user_id" },
      );
    setUpdating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPlan(key);
    toast.success(`Plano ${PLANS.find((p) => p.key === key)?.name} ativado`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Plano e assinatura"
        description="Escolha o plano ideal para o seu momento. Mude quando quiser."
      />

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isUpdating = updating === plan.key;
          return (
            <section
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all",
                plan.highlight && "border-primary shadow-primary",
                isCurrent && !plan.highlight && "border-primary/50",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-6 bg-gradient-primary shadow-primary">
                  <Sparkles className="h-3 w-3" />
                  Mais popular
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="secondary" className="absolute -top-3 right-6">
                  Plano atual
                </Badge>
              )}

              <div className="flex items-center gap-2">
                {plan.key === "premium" && <Crown className="h-4 w-4 text-amber-500" />}
                <h2 className="text-xl font-bold tracking-tight">{plan.name}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">R${plan.price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  "mt-6 w-full",
                  plan.highlight && !isCurrent && "bg-gradient-primary shadow-primary",
                )}
                variant={isCurrent ? "outline" : plan.highlight ? "default" : "outline"}
                disabled={isCurrent || loading || isUpdating}
                onClick={() => handleSelect(plan.key)}
              >
                {isCurrent ? "Plano atual" : isUpdating ? "Ativando..." : `Escolher ${plan.name}`}
              </Button>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Forma de pagamento</h3>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum método de pagamento cadastrado.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Adicionar método de pagamento
          </Button>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Histórico de cobrança</h3>
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
            <p className="text-sm font-medium">Nenhuma cobrança ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Suas faturas aparecerão aqui após o primeiro pagamento.
            </p>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
