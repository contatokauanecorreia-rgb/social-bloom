import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/dashboard/clientes/$id/precificacao")({
  component: PrecificacaoCliente,
});

function PrecificacaoCliente() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          Precificação do cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Em breve: contrato, escopo mensal e simulação de pacotes específicos para este cliente.
        </p>
      </CardContent>
    </Card>
  );
}
