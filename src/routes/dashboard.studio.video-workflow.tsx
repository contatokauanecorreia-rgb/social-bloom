import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoWorkflowCanvas } from "@/components/studio/video-workflow/VideoWorkflowCanvas";

export const Route = createFileRoute("/dashboard/studio/video-workflow")({
  head: () => ({
    meta: [
      { title: "Video Workflow — Postly" },
      { name: "description", content: "Canvas visual para gerar vídeos com IA, do upload ao grading." },
      { property: "og:title", content: "Video Workflow — Postly" },
      { property: "og:description", content: "Pipeline visual de vídeo com IA: upload, cenário, modelo, LUTs e geração." },
    ],
  }),
  component: VideoWorkflowPage,
});

function VideoWorkflowPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  if (!ready) return null;

  return (
    <PageContainer wide>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Badge variant="soft" className="mb-3 w-fit">
            Studio · Vídeo
          </Badge>
          <PageHeader
            title="Video Workflow"
            description="Conecte upload, cenário, IA, LUTs e geração em um pipeline visual."
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard/studio" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <VideoWorkflowCanvas />
    </PageContainer>
  );
}
