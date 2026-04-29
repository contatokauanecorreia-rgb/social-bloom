import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, RefreshCw, CalendarPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { consumeCredits, refundCredits, MODE_COST } from "@/lib/credits";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onCreditsChange: () => void;
};

export function CopyGeneratorDialog({ open, onOpenChange, clientId, onCreditsChange }: Props) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTopic("");
      setResult(null);
      setGenerating(false);
    }
  }, [open]);

  const callGenerate = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Sessão expirada.");

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-generate`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ mode: "copy", clientId, topic }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json?.error ?? "Erro ao gerar conteúdo.");
    }
    return json.content as string;
  };

  const generate = async (isRegen = false) => {
    if (!topic.trim()) {
      toast.error("Conte sobre o que é o conteúdo.");
      return;
    }
    setGenerating(true);
    let consumed = false;
    try {
      await consumeCredits(MODE_COST.copy);
      consumed = true;
      onCreditsChange();
      const content = await callGenerate();
      setResult(content);
      toast.success(isRegen ? "Copy regenerada!" : "Copy gerada!");
    } catch (err) {
      if (consumed) {
        await refundCredits(MODE_COST.copy);
        onCreditsChange();
      }
      toast.error(err instanceof Error ? err.message : "Erro ao gerar.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success("Copiado para a área de transferência!");
  };

  const saveToPlanner = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      // Find or create a "Semana 1" content_week for this user
      const { data: weeks } = await supabase
        .from("content_weeks")
        .select("id, position")
        .eq("user_id", session.user.id)
        .order("position", { ascending: true })
        .limit(1);

      let weekId = weeks?.[0]?.id;
      if (!weekId) {
        const { data: newWeek, error: wErr } = await supabase
          .from("content_weeks")
          .insert({ user_id: session.user.id, name: "Semana 1", position: 0 })
          .select("id")
          .single();
        if (wErr) throw wErr;
        weekId = newWeek.id;
      }

      const title = topic.trim().slice(0, 80) || "Copy gerada";
      const { error: pErr } = await supabase.from("content_posts").insert({
        user_id: session.user.id,
        week_id: weekId,
        title,
        notes: result,
        status: "planned",
        position: 0,
        tags: ["studio", "copy"],
      });
      if (pErr) throw pErr;

      toast.success("Salvo no Planner!");
      onOpenChange(false);
      navigate({ to: "/dashboard/planner" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar copy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="topic">Sobre o que é esse conteúdo?</Label>
            <Textarea
              id="topic"
              rows={4}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: promoção dia das mães, dica de autocuidado, lançamento de produto..."
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais contexto você der, melhor a copy fica.
            </p>
          </div>

          {!result && (
            <Button
              variant="gradient"
              className="w-full"
              onClick={() => generate(false)}
              disabled={generating || !topic.trim()}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar copy — 1 crédito
                </>
              )}
            </Button>
          )}

          {result && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-primary/30 bg-gradient-primary-soft p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Copy gerada
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {result}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generate(true)}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Regenerar (1 crédito)
                </Button>
                <Button variant="gradient" size="sm" onClick={saveToPlanner} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="h-3.5 w-3.5" />
                  )}
                  Salvar no Planner
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
