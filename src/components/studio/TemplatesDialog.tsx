import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleFont, brandFontFamily } from "@/lib/brand-font";

export type CarouselTemplate = {
  id: string;
  name: string;
  client_id: string;
  font_pair: { heading: string; body: string } | null;
  palette: string[];
  layout: any;
  overlay: any;
  signature: any;
  image_style: string | null;
  created_at: string;
};

export type TemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
};

export function TemplatesDialog({ open, onOpenChange, clientId }: TemplatesDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CarouselTemplate[]>([]);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("carousel_templates" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Erro ao carregar templates.");
          setTemplates([]);
        } else {
          const rows = (data ?? []) as unknown as CarouselTemplate[];
          setTemplates(rows);
          // Pré-carregar fontes para o preview
          rows.forEach((t) => {
            if (t.font_pair?.heading) loadGoogleFont(t.font_pair.heading);
            if (t.font_pair?.body) loadGoogleFont(t.font_pair.body);
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  const handleUse = (t: CarouselTemplate) => {
    try {
      sessionStorage.setItem("studio:carrossel:template", JSON.stringify(t));
    } catch (e) {
      console.warn("template sessionStorage failed", e);
    }
    onOpenChange(false);
    navigate({ to: "/dashboard/studio/carrossel" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("carousel_templates" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir template.");
      return;
    }
    setTemplates((arr) => arr.filter((t) => t.id !== id));
    toast.success("Template excluído.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates salvos</DialogTitle>
          <DialogDescription>
            Reutilize estilos de carrossel que você já criou para este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!clientId ? (
            <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Selecione um cliente para ver os templates.
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Nenhum template salvo ainda. Crie um carrossel e salve como template.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => {
                const headingFont = t.font_pair?.heading ?? null;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    {/* Preview cores */}
                    <div className="flex shrink-0 -space-x-1.5">
                      {(t.palette ?? []).slice(0, 3).map((c, i) => (
                        <span
                          key={i}
                          className="inline-block h-7 w-7 rounded-full border-2 border-card"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {headingFont ? ` · ${headingFont}` : ""}
                      </div>
                    </div>

                    {/* Amostra fonte */}
                    {headingFont && (
                      <div
                        className="hidden shrink-0 sm:block text-xl"
                        style={{ fontFamily: brandFontFamily(headingFont) }}
                      >
                        Aa
                      </div>
                    )}

                    <Button size="sm" onClick={() => handleUse(t)}>
                      Usar este template
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                      title="Excluir template"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
