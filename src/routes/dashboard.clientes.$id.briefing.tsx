import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "@/components/plano/TagInput";

export const Route = createFileRoute("/dashboard/clientes/$id/briefing")({
  component: BriefingPage,
});

type Briefing = {
  business_description: string;
  target_audience: string;
  tone_of_voice: string;
  content_pillars: string[];
  goals: string[];
  dos: string[];
  donts: string[];
  references: string;
};

const empty: Briefing = {
  business_description: "",
  target_audience: "",
  tone_of_voice: "",
  content_pillars: [],
  goals: [],
  dos: [],
  donts: [],
  references: "",
};

function BriefingPage() {
  const { id: clientId } = Route.useParams();
  const [data, setData] = useState<Briefing>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("client_briefings")
      .select("business_description, target_audience, tone_of_voice, content_pillars, goals, dos, donts, references")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          setData({
            business_description: row.business_description ?? "",
            target_audience: row.target_audience ?? "",
            tone_of_voice: row.tone_of_voice ?? "",
            content_pillars: row.content_pillars ?? [],
            goals: row.goals ?? [],
            dos: row.dos ?? [],
            donts: row.donts ?? [],
            references: row.references ?? "",
          });
        }
        setLoading(false);
      });
  }, [clientId]);

  const update = <K extends keyof Briefing>(key: K, value: Briefing[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("client_briefings").upsert(
      {
        client_id: clientId,
        user_id: session.user.id,
        ...data,
      },
      { onConflict: "client_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar briefing.");
      return;
    }
    toast.success("Briefing salvo!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Section title="Sobre o negócio" hint="Descreva em poucas linhas o que o cliente faz.">
        <Textarea rows={4} value={data.business_description} onChange={(e) => update("business_description", e.target.value)} />
      </Section>

      <Section title="Público-alvo" hint="Quem é a pessoa que consome esse conteúdo?">
        <Textarea rows={3} value={data.target_audience} onChange={(e) => update("target_audience", e.target.value)} />
      </Section>

      <Section title="Tom de voz" hint="Ex: descontraído, técnico, próximo, irônico...">
        <Textarea rows={2} value={data.tone_of_voice} onChange={(e) => update("tone_of_voice", e.target.value)} />
      </Section>

      <Section title="Pilares de conteúdo" hint="3 a 6 temas que guiam tudo que é publicado.">
        <TagInput value={data.content_pillars} onChange={(v) => update("content_pillars", v)} placeholder="Ex: Educação, Bastidores..." />
      </Section>

      <Section title="Objetivos" hint="O que o cliente quer alcançar?">
        <TagInput value={data.goals} onChange={(v) => update("goals", v)} placeholder="Ex: Aumentar engajamento" />
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section title="Faça" hint="O que sempre fazer.">
          <TagInput value={data.dos} onChange={(v) => update("dos", v)} placeholder="Ex: Usar emojis" />
        </Section>
        <Section title="Não faça" hint="O que evitar a todo custo.">
          <TagInput value={data.donts} onChange={(v) => update("donts", v)} placeholder="Ex: Falar de concorrentes" />
        </Section>
      </div>

      <Section title="Referências" hint="Links e exemplos inspiradores.">
        <Textarea rows={4} value={data.references} onChange={(e) => update("references", e.target.value)} placeholder="Cole aqui links, perfis e referências." />
      </Section>

      <div className="flex justify-end">
        <Button variant="gradient" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar briefing
        </Button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
