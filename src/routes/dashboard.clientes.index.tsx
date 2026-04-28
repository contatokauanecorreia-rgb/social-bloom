import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Clock, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/clientes/")({
  head: () => ({ meta: [{ title: "Meus clientes — Postly" }] }),
  component: ClientesHub,
});

type Status = "ativo" | "pausado" | "encerrado";

type ClientCard = {
  id: string;
  name: string;
  segment: string;
  status: Status;
  contentsThisMonth: number;
  awaitingApproval: number;
};

const INITIAL: ClientCard[] = [
  { id: "studio-bela-forma", name: "Studio Bela Forma", segment: "Saúde e beleza", status: "ativo", contentsThisMonth: 12, awaitingApproval: 3 },
  { id: "restaurante-folha-verde", name: "Restaurante Folha Verde", segment: "Alimentação", status: "ativo", contentsThisMonth: 8, awaitingApproval: 0 },
  { id: "academia-forcaviva", name: "Academia ForçaViva", segment: "Fitness", status: "pausado", contentsThisMonth: 0, awaitingApproval: 0 },
];

const STATUS_STYLE: Record<Status, string> = {
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pausado: "bg-amber-100 text-amber-800 border-amber-200",
  encerrado: "bg-rose-100 text-rose-800 border-rose-200",
};

const STATUS_LABEL: Record<Status, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ClientesHub() {
  const [clients, setClients] = useState<ClientCard[]>(INITIAL);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const newClient: ClientCard = {
      id: slugify(name) || `c-${Date.now()}`,
      name: name.trim(),
      segment: segment.trim() || "Sem segmento",
      status: "ativo",
      contentsThisMonth: 0,
      awaitingApproval: 0,
    };
    setClients((prev) => [newClient, ...prev]);
    setName("");
    setSegment("");
    setNotes("");
    setOpen(false);
    toast.success("Cliente adicionado!");
  };

  return (
    <PageContainer wide>
      <Badge variant="soft" className="mb-3 w-fit">Clientes</Badge>
      <PageHeader
        title="Meus clientes"
        description="Acompanhe a operação de cada cliente em um só lugar."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4" />
                Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="c-name">Nome *</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Studio Bela Forma" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-segment">Segmento / Nicho</Label>
                  <Input id="c-segment" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: Saúde e beleza" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-notes">Notas</Label>
                  <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate}>Criar cliente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        {clients.map((c) => (
          <article
            key={c.id}
            className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-foreground/20 hover:shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
                {getInitials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">{c.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{c.segment}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      STATUS_STYLE[c.status],
                    )}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-background/40 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Este mês
                </div>
                <div className="mt-0.5 text-xl font-bold tabular-nums">{c.contentsThisMonth}</div>
                <div className="text-[11px] text-muted-foreground">conteúdos</div>
              </div>

              <div
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  c.awaitingApproval > 0
                    ? "border-amber-200 bg-amber-50"
                    : "bg-background/40",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider",
                    c.awaitingApproval > 0 ? "text-amber-700" : "text-muted-foreground",
                  )}
                >
                  <Clock className="h-3 w-3" />
                  Aguardando
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-xl font-bold tabular-nums",
                    c.awaitingApproval > 0 && "text-amber-800",
                  )}
                >
                  {c.awaitingApproval}
                </div>
                <div
                  className={cn(
                    "text-[11px]",
                    c.awaitingApproval > 0 ? "text-amber-700" : "text-muted-foreground",
                  )}
                >
                  aprovação
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/clientes/$id" params={{ id: c.id }}>
                  Acessar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </PageContainer>
  );
}
