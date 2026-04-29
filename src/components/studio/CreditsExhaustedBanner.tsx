import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreditsExhaustedBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary/30 bg-gradient-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Seus créditos acabaram</h3>
          <p className="text-xs text-muted-foreground">
            Faça upgrade para continuar gerando conteúdo este mês.
          </p>
        </div>
      </div>
      <Button asChild variant="gradient" size="sm" className="shrink-0">
        <Link to="/dashboard/plano">Fazer upgrade</Link>
      </Button>
    </div>
  );
}
