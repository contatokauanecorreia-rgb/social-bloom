import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/clientes/$id/aprovacao")({
  component: AprovacaoInternaPage,
});

type Batch = {
  id: string;
  title: string;
  status: "waiting" | "approved" | "changes";
  postsCount: number;
  createdAt: string;
  token: string;
};

const STATUS_META: Record<Batch["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  waiting: { label: "Aguardando cliente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  changes: { label: "Com ajustes", variant: "outline" },
};

const initialBatches: Batch[] = [
  {
    id: "b1",
    title: "Lote — Semana 1 de Maio",
    status: "approved",
    postsCount: 5,
    createdAt: "28 abr 2026",
    token: "demo-aprov-001",
  },
  {
    id: "b2",
    title: "Lote — Semana 2 de Maio",
    status: "waiting",
    postsCount: 4,
    createdAt: "27 abr 2026",
    token: "demo-aprov-002",
  },
  {
    id: "b3",
    title: "Lote — Reels Maio",
    status: "changes",
    postsCount: 3,
    createdAt: "25 abr 2026",
    token: "demo-aprov-003",
  },
];

function AprovacaoInternaPage() {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);

  const createBatch = () => {
    const id = `b${Date.now()}`;
    setBatches((prev) => [
      {
        id,
        title: `Novo lote (${prev.length + 1})`,
        status: "waiting",
        postsCount: 0,
        createdAt: new Date().toLocaleDateString("pt-BR"),
        token: `demo-${id}`,
      },
      ...prev,
    ]);
    toast.success("Lote criado (demonstração).");
  };

  const copy = async (token: string) => {
    const url = `${window.location.origin}/aprovar/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Em breve: integração real com posts do Planner.
        </div>
        <Button variant="gradient" size="sm" onClick={createBatch}>
          <Plus className="h-4 w-4" />
          Criar novo lote
        </Button>
      </div>

      <div className="grid gap-3">
        {batches.map((b) => {
          const meta = STATUS_META[b.status];
          return (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{b.title}</h3>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.postsCount} {b.postsCount === 1 ? "post" : "posts"} · criado em {b.createdAt}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => copy(b.token)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar link
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/aprovar/${b.token}`} target="_blank" rel="noreferrer">
                      <Link2 className="h-3.5 w-3.5" />
                      Abrir portal
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
