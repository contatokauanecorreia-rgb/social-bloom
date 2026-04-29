import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, Clock, FileText, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/clientes/")({
  head: () => ({ meta: [{ title: "Hub de clientes — Postly" }] }),
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
  isMock?: boolean;
};

const MOCKS: ClientCard[] = [
  {
    id: "mock-studio-bela-forma",
    name: "Studio Bela Forma",
    segment: "Saúde e beleza",
    status: "ativo",
    contentsThisMonth: 12,
    awaitingApproval: 3,
    isMock: true,
  },
  {
    id: "mock-restaurante-folha-verde",
    name: "Restaurante Folha Verde",
    segment: "Alimentação",
    status: "ativo",
    contentsThisMonth: 8,
    awaitingApproval: 0,
    isMock: true,
  },
  {
    id: "mock-academia-forcaviva",
    name: "Academia ForçaViva",
    segment: "Fitness",
    status: "pausado",
    contentsThisMonth: 0,
    awaitingApproval: 0,
    isMock: true,
  },
];

const STATUS_STYLE: Record<Status, string> = {
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pausado: "bg-amber-100 text-amber-800 border-amber-200",
  encerrado: "bg-zinc-100 text-zinc-700 border-zinc-200",
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

function normalizeStatus(s: string | null | undefined): Status {
  if (s === "pausado" || s === "paused") return "pausado";
  if (s === "encerrado" || s === "archived" || s === "inactive") return "encerrado";
  return "ativo";
}

function ClientesHub() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState<Status>("ativo");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company, status")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error || !data || data.length === 0) {
        setClients(MOCKS);
      } else {
        setClients(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            segment: c.company ?? "Sem segmento",
            status: normalizeStatus(c.status),
            contentsThisMonth: 0,
            awaitingApproval: 0,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setName("");
    setSegment("");
    setStatus("ativo");
    setNotes("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setCreating(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCreating(false);
      toast.error("Sessão expirada.");
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        company: segment.trim() || null,
        status,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    setCreating(false);

    if (error || !data) {
      toast.error("Erro ao criar cliente.");
      return;
    }

    toast.success("Cliente criado! Vamos preencher o DNA da marca.");
    resetForm();
    setOpen(false);
    navigate({
      to: "/dashboard/clientes/$id/briefing",
      params: { id: data.id },
    });
  };

  return (
    <PageContainer wide>
      <Badge variant="soft" className="mb-3 w-fit">
        Clientes
      </Badge>
      <PageHeader
        title="Hub de clientes"
        description="Acompanhe a operação de cada cliente em um só lugar."
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
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
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Studio Bela Forma"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-segment">Segmento</Label>
                  <Input
                    id="c-segment"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Saúde e beleza"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    {(["ativo", "pausado", "encerrado"] as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm transition-all",
                          status === s
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "hover:border-foreground/30",
                        )}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-notes">Notas (opcional)</Label>
                  <Textarea
                    id="c-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Após criar, você será levado direto ao DNA da marca para
                  preencher o briefing.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar e preencher DNA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {clients.some((c) => c.isMock) && (
            <div className="mb-4 rounded-lg border border-dashed bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              Você ainda não cadastrou clientes — abaixo estão exemplos para
              você visualizar como o hub funciona.
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {clients.map((c) => (
              <ClientCardItem key={c.id} client={c} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function ClientCardItem({ client: c }: { client: ClientCard }) {
  return (
    <article
      className={cn(
        "group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-foreground/20 hover:shadow",
        c.isMock && "opacity-80",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
          {getInitials(c.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{c.name}</h3>
              <Badge variant="soft" className="mt-1">
                {c.segment}
              </Badge>
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
          <div className="mt-0.5 text-xl font-bold tabular-nums">
            {c.contentsThisMonth}
          </div>
          <div className="text-[11px] text-muted-foreground">conteúdos</div>
        </div>

        <div
          className={cn(
            "rounded-lg border px-3 py-2.5",
            c.awaitingApproval > 0
              ? "border-orange-200 bg-orange-50"
              : "bg-background/40",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider",
              c.awaitingApproval > 0
                ? "text-orange-700"
                : "text-muted-foreground",
            )}
          >
            <Clock className="h-3 w-3" />
            Aguardando
          </div>
          <div
            className={cn(
              "mt-0.5 text-xl font-bold tabular-nums",
              c.awaitingApproval > 0 && "text-orange-800",
            )}
          >
            {c.awaitingApproval}
          </div>
          <div
            className={cn(
              "text-[11px]",
              c.awaitingApproval > 0
                ? "text-orange-700"
                : "text-muted-foreground",
            )}
          >
            aprovação
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        {c.isMock ? (
          <Button variant="outline" size="sm" disabled>
            Exemplo
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/clientes/$id" params={{ id: c.id }}>
              Acessar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
