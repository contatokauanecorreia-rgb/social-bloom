import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";

export const Route = createFileRoute("/dashboard/plano")({
  head: () => ({
    meta: [
      { title: "Plano e assinatura — Postly" },
      { name: "description", content: "Gerencie seu plano e cobrança no Postly." },
    ],
  }),
  component: PlanoAssinaturaPage,
});

const PLAN_FEATURES = [
  "Studio de conteúdo com agentes IA",
  "Planner de conteúdo ilimitado",
  "Hub de clientes",
  "Geração de carrosséis",
  "Suporte por e-mail",
];

function PlanoAssinaturaPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Plano e assinatura"
        description="Acompanhe seu plano atual, faturas e faça upgrade quando precisar."
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Plano atual */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Plano atual</span>
                <Badge variant="secondary">Free</Badge>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Postly Free</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Você está usando a versão gratuita. Faça upgrade para liberar todos os recursos.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight">R$ 0</div>
              <div className="text-xs text-muted-foreground">/mês</div>
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="bg-gradient-primary shadow-primary">
              <Sparkles className="h-4 w-4" />
              Fazer upgrade para Pro
            </Button>
            <Button variant="outline">Comparar planos</Button>
          </div>
        </section>

        {/* Forma de pagamento */}
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
      </div>

      {/* Histórico de cobrança */}
      <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Histórico de cobrança</h3>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm font-medium">Nenhuma cobrança ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Suas faturas aparecerão aqui após o primeiro pagamento.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
