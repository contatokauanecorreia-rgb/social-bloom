import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/clientes/")({
  head: () => ({ meta: [{ title: "Hub de clientes — Postly" }] }),
  component: ClientesHub,
});

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  paused: "secondary",
  archived: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

function ClientesHub() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // form
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, company, email, avatar_url, status")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar clientes.");
    setClients(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("clients").insert({
      user_id: session.user.id,
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar cliente.");
      return;
    }
    toast.success("Cliente criado!");
    setName("");
    setCompany("");
    setEmail("");
    setNotes("");
    setOpen(false);
    load();
  };

  const filtered = clients.filter((c) =>
    [c.name, c.company ?? ""].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <PageContainer wide>
      <Badge variant="soft" className="mb-3 w-fit">Clientes</Badge>
      <PageHeader
        title="Hub de clientes"
        description="Centralize seus clientes, briefings e aprovações em um só lugar."
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
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-company">Empresa</Label>
                  <Input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-email">E-mail</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="c-notes">Notas</Label>
                  <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar cliente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary-soft">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Nenhum cliente ainda</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Crie seu primeiro cliente para começar a organizar briefings e aprovações.
          </p>
          <Button variant="gradient" className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/dashboard/clientes/$id"
              params={{ id: c.id }}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-foreground/20 hover:shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-base font-semibold text-primary-foreground">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold">{c.name}</h3>
                    <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="text-[10px]">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </div>
                  {c.company && (
                    <p className="truncate text-sm text-muted-foreground">{c.company}</p>
                  )}
                  {c.email && (
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">{c.email}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
