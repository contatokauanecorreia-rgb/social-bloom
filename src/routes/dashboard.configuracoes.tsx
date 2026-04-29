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
