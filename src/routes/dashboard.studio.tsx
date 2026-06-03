import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Layers, Film } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { ClientPicker, type ClientOption } from "@/components/studio/ClientPicker";
import { CreditsBadge } from "@/components/studio/CreditsBadge";
import { CreditsExhaustedBanner } from "@/components/studio/CreditsExhaustedBanner";
import { ModeCard } from "@/components/studio/ModeCard";
import { CarouselAIWizard } from "@/components/studio/CarouselAIWizard";
import { StudioJobsPanel } from "@/components/studio/StudioJobsPanel";
import { fetchCredits, MODE_COST, type CreditsState } from "@/lib/credits";
import { useStudioJobs, type StudioJob } from "@/lib/studio-jobs";
import { ACTIVE_CLIENT_STORAGE_KEY } from "@/lib/client-context";

export const Route = createFileRoute("/dashboard/studio")({
  head: () => ({ meta: [{ title: "Studio — Postly" }] }),
  component: StudioPage,
});

function StudioPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== "/dashboard/studio" && pathname !== "/dashboard/studio/";
  const [userId, setUserId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselJobId, setCarouselJobId] = useState<string | null>(null);
  const { running, recent } = useStudioJobs(userId);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.session.user.id);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([
      supabase
        .from("clients")
        .select("id, name, company")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      fetchCredits(),
    ])
      .then(([clientsRes, creditsRes]) => {
        if (cancelled) return;
        const list: ClientOption[] = (clientsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          segment: c.company ?? null,
        }));
        setClients(list);
        setCredits(creditsRes);

        // Restore last active client
        const saved =
          typeof window !== "undefined"
            ? window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY)
            : null;
        if (saved && list.some((c) => c.id === saved)) {
          setClientId(saved);
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.");
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleClientChange = (id: string | null) => {
    setClientId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(ACTIVE_CLIENT_STORAGE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
    }
  };

  if (isChildRoute) {
    return <Outlet />;
  }

  if (!userId || !credits) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const exhausted = credits.limit !== Infinity && credits.remaining <= 0;

  return (
    <PageContainer wide>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="soft" className="mb-3 w-fit">
            Studio
          </Badge>
          <PageHeader
            title="Studio"
            description="Gere carrosséis e vídeos com a IA da Postly."
          />
        </div>
        <CreditsBadge credits={credits} />
      </div>

      {exhausted && (
        <div className="mb-6">
          <CreditsExhaustedBanner />
        </div>
      )}

      <div className="mb-8">
        <ClientPicker value={clientId} onChange={handleClientChange} clients={clients} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          icon={Layers}
          title="Gerar carrossel"
          description="Slides completos com design da marca."
          cost={MODE_COST.carrossel}
          disabled={exhausted}
          onClick={() => {
            if (!clientId) {
              toast.error("Selecione um cliente antes de criar um carrossel.");
              return;
            }
            setCarouselOpen(true);
          }}
        />
        <ModeCard
          icon={Film}
          title="Gerar vídeo"
          description="Pipeline visual com upload, cenário, IA e LUTs."
          cost={MODE_COST.roteiro}
          disabled={exhausted}
          onClick={() => navigate({ to: "/dashboard/studio/video-workflow" })}
        />
      </div>

      <CarouselAIWizard
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
        clientId={clientId}
      />
    </PageContainer>
  );
}
