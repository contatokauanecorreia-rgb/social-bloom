import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard/clientes/$id/conteudos")({
  component: ConteudosCliente,
});

function ConteudosCliente() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Conteúdos do cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Em breve: lista de posts, status de produção e histórico de entregas para este cliente.
        </p>
      </CardContent>
    </Card>
  );
}
