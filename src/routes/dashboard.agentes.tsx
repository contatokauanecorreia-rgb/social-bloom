import { createFileRoute } from "@tanstack/react-router";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/dashboard/agentes")({
  head: () => ({ meta: [{ title: "Criar conteúdo — Postly" }] }),
  component: AgentesPage,
});

function AgentesPage() {
  return (
    <PageContainer>
      <Badge variant="soft" className="mb-3 w-fit">Em breve</Badge>
      <PageHeader
        title="Criar conteúdo"
        description="Gere roteiros, legendas e ideias de posts com IA."
      />
      <div className="rounded-xl border border-dashed bg-card/40 p-12 text-center">
        <Bot className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Em breve: configure agentes para atendimento automático.
        </p>
      </div>
    </PageContainer>
  );
}
