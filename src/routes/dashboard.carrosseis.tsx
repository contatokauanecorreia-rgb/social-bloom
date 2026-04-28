import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid } from "lucide-react";
import { ClientContextBar } from "@/components/clientes/ClientContextBar";
import { ACTIVE_CLIENT_STORAGE_KEY } from "@/lib/client-context";

export const Route = createFileRoute("/dashboard/carrosseis")({
  head: () => ({ meta: [{ title: "Gerar carrosséis — Postly" }] }),
  component: CarrosseisPage,
});

function CarrosseisPage() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY);
    if (saved) setClientId(saved);
  }, []);

  const handleChange = (id: string | null) => {
    setClientId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(ACTIVE_CLIENT_STORAGE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
    }
  };

  return (
    <PageContainer>
      <Badge variant="soft" className="mb-3 w-fit">Em breve</Badge>
      <PageHeader
        title="Gerar carrosséis"
        description="Geração automática de carrosséis com IA."
      />

      <ClientContextBar value={clientId} onChange={handleChange} className="mb-6" />

      <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
        <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo você vai criar carrosséis prontos com um clique.
        </p>
      </div>
    </PageContainer>
  );
}
