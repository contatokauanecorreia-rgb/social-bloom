import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function IdeaActions() {
  const navigate = useNavigate();

  const goToKiuka = () => {
    navigate({ to: "/dashboard/studio", search: { agent: "kiuka" } });
  };

  const goToPlanner = () => {
    navigate({ to: "/dashboard/plano" });
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-full text-xs"
        onClick={goToKiuka}
      >
        ✦ Criar carrossel com KIÜKA
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-full text-xs"
        onClick={goToPlanner}
      >
        📅 Salvar no Planner
      </Button>
    </div>
  );
}
