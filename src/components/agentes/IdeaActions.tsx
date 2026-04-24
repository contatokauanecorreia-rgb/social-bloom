import { useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function IdeaActions() {
  const navigate = useNavigate();
  const router = useRouter();

  const goToKiuka = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("postly:last-agent", "kiuka");
    }
    navigate({ to: "/dashboard/agentes" }).then(() => {
      router.invalidate();
    });
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
        📅 Adicionar ao Planner
      </Button>
    </div>
  );
}
