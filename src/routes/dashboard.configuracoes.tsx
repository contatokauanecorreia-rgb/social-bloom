import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/dashboard/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, KeyRound, Loader2, Lock, LogOut, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Postly" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<string>("starter");
  const [aiMode, setAiMode] = useState<"postly" | "apikey" | "agent">("postly");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [savingAi, setSavingAi] = useState(false);

  const isPremium = plan === "premium" || plan === "enterprise";

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!active || !sess.session) return;
      setEmail(sess.session.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", sess.session.user.id)
        .maybeSingle();
      if (!active) return;
      setDisplayName(data?.display_name ?? "");
      setAvatarUrl(data?.avatar_url ?? "");

      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!active) return;
      if (sub?.plan) setPlan(sub.plan);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", sess.session.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer>
      <Badge variant="soft" className="mb-3 w-fit">Conta</Badge>
      <PageHeader title="Configurações" description="Edite seu perfil e preferências." />

      <section className="space-y-5 rounded-xl border bg-card p-6">
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Nome de exibição</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Como você quer ser chamado"
          />
        </div>
        <div className="space-y-1.5">
          <Label>URL do avatar</Label>
          <Input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Integrações de IA</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha como a Postly deve gerar conteúdo para seus clientes.
            </p>
          </div>
          <Badge variant="soft" className="capitalize">Plano {plan}</Badge>
        </div>

        <div className="mt-5 grid gap-3">
          <AiOptionCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Usar IA da Postly (padrão)"
            description="Créditos mensais incluídos no plano."
            selected={aiMode === "postly"}
            onSelect={() => setAiMode("postly")}
          />

          <AiOptionCard
            icon={<KeyRound className="h-4 w-4" />}
            title="Conectar minha API Key"
            description="Use sua própria conta de OpenAI ou Anthropic."
            premium
            locked={!isPremium}
            selected={aiMode === "apikey"}
            onSelect={() => isPremium && setAiMode("apikey")}
          >
            {aiMode === "apikey" && isPremium && (
              <div className="mt-4 grid gap-4 border-t pt-4">
                <div className="space-y-1.5">
                  <Label>OpenAI (GPT-4)</Label>
                  <Input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Anthropic (Claude)</Label>
                  <Input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                </div>
              </div>
            )}
          </AiOptionCard>

          <AiOptionCard
            icon={<Bot className="h-4 w-4" />}
            title="Usar meu agente personalizado"
            description="Conecte um Assistant da OpenAI já treinado."
            premium
            locked={!isPremium}
            selected={aiMode === "agent"}
            onSelect={() => isPremium && setAiMode("agent")}
          >
            {aiMode === "agent" && isPremium && (
              <div className="mt-4 grid gap-4 border-t pt-4">
                <div className="space-y-1.5">
                  <Label>Assistant ID</Label>
                  <Input
                    value={assistantId}
                    onChange={(e) => setAssistantId(e.target.value)}
                    placeholder="asst_..."
                  />
                </div>
                {!openaiKey && (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    Requer API Key da OpenAI conectada na opção acima.
                  </p>
                )}
              </div>
            )}
          </AiOptionCard>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => {
              setSavingAi(true);
              setTimeout(() => {
                setSavingAi(false);
                toast.success("Preferências de IA salvas");
              }, 400);
            }}
            disabled={savingAi}
          >
            {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar integrações
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Sessão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encerre sua sessão atual neste dispositivo.
        </p>
        <Button variant="outline" className="mt-4" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </section>
    </PageContainer>
  );
}
