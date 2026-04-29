import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/dashboard/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Link2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Postly" }] }),
  component: ClientLayout,
});

type ClientHeader = {
  id: string;
  name: string;
  company: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

function ClientLayout() {
  const { id } = Route.useParams();
  const { pathname } = useLocation();
  const [client, setClient] = useState<ClientHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("clients")
      .select("id, name, company, status, created_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setClient(data ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const tabs: Array<{
    to:
      | "/dashboard/clientes/$id"
      | "/dashboard/clientes/$id/briefing"
      | "/dashboard/clientes/$id/conteudos"
      | "/dashboard/clientes/$id/aprovacao"
      | "/dashboard/clientes/$id/precificacao";
    label: string;
    exact?: boolean;
  }> = [
    { to: "/dashboard/clientes/$id", label: "Visão geral", exact: true },
    { to: "/dashboard/clientes/$id/briefing", label: "DNA da marca" },
    { to: "/dashboard/clientes/$id/conteudos", label: "Conteúdos" },
    { to: "/dashboard/clientes/$id/aprovacao", label: "Aprovação" },
    { to: "/dashboard/clientes/$id/precificacao", label: "Precificação" },
  ];

  const mockToken = `${id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/aprovar/${mockToken}` : `/aprovar/${mockToken}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <PageContainer>
        <Link to="/dashboard/clientes" className="text-sm text-muted-foreground hover:underline">
          ← Voltar para Clientes
        </Link>
        <div className="mt-10 text-center text-muted-foreground">Cliente não encontrado.</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer wide>
      <Link
        to="/dashboard/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-xl font-semibold text-primary-foreground">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{client.name}</h1>
              <Badge variant="soft">{STATUS_LABEL[client.status] ?? client.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              {client.company && <span>{client.company}</span>}
              {client.company && <span className="text-muted-foreground/40">•</span>}
              <span>
                Cliente desde{" "}
                {new Date(client.created_at).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <Button variant="gradient-outline" onClick={() => setLinkOpen(true)}>
          <Link2 className="h-4 w-4" />
          Gerar link de aprovação
        </Button>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((tab) => {
          const target = tab.to.replace("$id", id);
          const active = tab.exact ? pathname === target : pathname.startsWith(target);
          return (
            <Link
              key={tab.label}
              to={tab.to}
              params={{ id }}
              className={cn(
                "border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Outlet />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link público de aprovação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com seu cliente. Ele poderá aprovar ou solicitar ajustes sem precisar de login.
          </p>
          <div className="flex gap-2">
            <Input value={publicUrl} readOnly />
            <Button variant="outline" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70">
            ✦ Em breve: tokens persistentes e expiração configurável.
          </p>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
