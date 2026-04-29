import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleFont } from "@/lib/brand-font";
import { cn } from "@/lib/utils";

export type CarouselAIWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
};

type ImageMode = "none" | "bg" | "grid" | "mixed";

type FontPair = { heading: string; body: string; label: string; archetypes: string[] };

const FONT_PAIRS: FontPair[] = [
  { heading: "Playfair Display", body: "DM Sans", label: "Sofisticado", archetypes: ["governante", "sabio"] },
  { heading: "Syne", body: "Outfit", label: "Popular", archetypes: ["cara-comum", "bobo"] },
  { heading: "Oswald", body: "Inter", label: "Autoridade", archetypes: ["sabio", "heroi"] },
  { heading: "Raleway", body: "Lato", label: "Cuidador", archetypes: ["cuidador", "inocente"] },
  { heading: "Space Grotesk", body: "Fraunces", label: "Criador", archetypes: ["criador", "mago"] },
  { heading: "Bebas Neue", body: "Inter", label: "Herói", archetypes: ["heroi", "fora-da-lei"] },
];

const SUGGESTED_PALETTES: { label: string; colors: [string, string, string]; archetypes: string[] }[] = [
  { label: "Sofisticado", colors: ["#1A1714", "#C9A875", "#F5F0E8"], archetypes: ["governante", "sabio", "amante"] },
  { label: "Cuidador", colors: ["#E8B4B8", "#3D3B40", "#F8F1F1"], archetypes: ["cuidador", "inocente"] },
  { label: "Energia", colors: ["#FF5A1F", "#1A1A1A", "#FFFFFF"], archetypes: ["heroi", "explorador", "fora-da-lei"] },
  { label: "Criativo", colors: ["#7C3AED", "#FCD34D", "#0F172A"], archetypes: ["criador", "mago", "bobo"] },
  { label: "Natural", colors: ["#3F6E4E", "#E8E1D3", "#1F2A1F"], archetypes: ["explorador", "cara-comum"] },
];

type DnaInfo = {
  palette: [string, string, string] | null;
  brandFont: string | null;
  archetype: string | null;
};

export function CarouselAIWizard({ open, onOpenChange, clientId }: CarouselAIWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | "loading">(1);

  // Step 1
  const [topic, setTopic] = useState("");
  const [moodboardFile, setMoodboardFile] = useState<File | null>(null);
  const [moodboardPreview, setMoodboardPreview] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(5);
  const [imageMode, setImageMode] = useState<ImageMode>("bg");
  const [aiImages, setAiImages] = useState(true);

  // Step 2
  const [instagram, setInstagram] = useState("");
  const [dna, setDna] = useState<DnaInfo>({ palette: null, brandFont: null, archetype: null });
  const [selectedFontIdx, setSelectedFontIdx] = useState<number>(0);
  const [useDnaFont, setUseDnaFont] = useState(true);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState<number>(0);
  const [useDnaPalette, setUseDnaPalette] = useState(true);

  // Loading
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<number | null>(null);

  const loadingPersistRef = useRef(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      // delay to avoid flicker during close animation
      const t = window.setTimeout(() => {
        if (loadingPersistRef.current) {
          loadingPersistRef.current = false;
          return;
        }
        setStep(1);
        setTopic("");
        setMoodboardFile(null);
        setMoodboardPreview(null);
        setSlideCount(5);
        setImageMode("bg");
        setAiImages(true);
        setInstagram("");
        setSelectedFontIdx(0);
        setSelectedPaletteIdx(0);
        setProgress(0);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Load DNA when step 2 opens
  useEffect(() => {
    if (step !== 2 || !clientId) return;
    let cancelled = false;
    supabase
      .from("client_briefings")
      .select("palette, brand_font, archetype")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const pal = (data?.palette ?? []) as string[];
        const palette: [string, string, string] | null =
          pal.length >= 3 ? [pal[0], pal[1], pal[2]] : null;
        const brandFont = (data?.brand_font as string | null) ?? null;
        const archetype = (data?.archetype as string | null) ?? null;
        setDna({ palette, brandFont, archetype });
        setUseDnaFont(!!brandFont);
        setUseDnaPalette(!!palette);
        if (brandFont) loadGoogleFont(brandFont);

        // Pick best font pair / palette by archetype
        const fontIdx = archetype
          ? FONT_PAIRS.findIndex((p) => p.archetypes.includes(archetype))
          : -1;
        if (!brandFont && fontIdx >= 0) setSelectedFontIdx(fontIdx);

        const palIdx = archetype
          ? SUGGESTED_PALETTES.findIndex((p) => p.archetypes.includes(archetype))
          : -1;
        if (!palette && palIdx >= 0) setSelectedPaletteIdx(palIdx);
      });
    return () => {
      cancelled = true;
    };
  }, [step, clientId]);

  // Preload all font pairs for previews
  useEffect(() => {
    if (step !== 2) return;
    FONT_PAIRS.forEach((p) => {
      loadGoogleFont(p.heading);
      loadGoogleFont(p.body);
    });
  }, [step]);

  const onPickMoodboard = (f: File) => {
    setMoodboardFile(f);
    const reader = new FileReader();
    reader.onload = () => setMoodboardPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const canContinueStep1 = topic.trim().length > 0;

  const fontPair = useMemo<FontPair | null>(() => {
    if (useDnaFont && dna.brandFont) {
      return { heading: dna.brandFont, body: dna.brandFont, label: "DNA da marca", archetypes: [] };
    }
    return FONT_PAIRS[selectedFontIdx] ?? FONT_PAIRS[0];
  }, [useDnaFont, dna.brandFont, selectedFontIdx]);

  const palette = useMemo<[string, string, string]>(() => {
    if (useDnaPalette && dna.palette) return dna.palette;
    return SUGGESTED_PALETTES[selectedPaletteIdx]?.colors ?? SUGGESTED_PALETTES[0].colors;
  }, [useDnaPalette, dna.palette, selectedPaletteIdx]);

  const startProgress = () => {
    setProgress(8);
    let p = 8;
    progressTimer.current = window.setInterval(() => {
      p = Math.min(p + Math.random() * 6 + 2, 92);
      setProgress(p);
    }, 600);
  };

  const stopProgress = () => {
    if (progressTimer.current) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente antes de gerar.");
      return;
    }
    setStep("loading");
    startProgress();
    try {
      const { data, error } = await supabase.functions.invoke("carrossel-generate", {
        body: {
          clientId,
          topic: topic.trim(),
          slideCount,
          imageMode,
          aiImages,
          fontPair: fontPair ? { heading: fontPair.heading, body: fontPair.body } : null,
          palette,
          instagram: instagram.trim() || null,
        },
      });

      if (error) throw error;
      if (!data || !Array.isArray(data.slides)) throw new Error("Resposta inválida da IA.");

      stopProgress();
      setProgress(100);

      const bootstrap = {
        slides: data.slides as Array<{
          title: string;
          subtitle?: string;
          body: string;
          imagePrompt: string;
          imageDataUrl: string | null;
        }>,
        fontPair: fontPair ? { heading: fontPair.heading, body: fontPair.body } : null,
        palette,
        imageMode,
        signature: instagram.trim()
          ? { enabled: true, handle: instagram.trim().startsWith("@") ? instagram.trim() : `@${instagram.trim()}`, position: "br", color: palette[0] }
          : null,
      };
      try {
        sessionStorage.setItem("studio:carrossel:bootstrap", JSON.stringify(bootstrap));
      } catch (e) {
        console.warn("bootstrap sessionStorage failed", e);
      }

      loadingPersistRef.current = true;
      onOpenChange(false);
      navigate({ to: "/dashboard/studio/carrossel" });
    } catch (err) {
      console.error(err);
      stopProgress();
      const msg = err instanceof Error ? err.message : "Erro ao gerar carrossel.";
      toast.error(msg);
      setStep(2);
      setProgress(0);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (step === "loading") return; // bloquear fechar durante loading
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Configurar IA</DialogTitle>
              <DialogDescription>
                Diga sobre o que é o conteúdo e como quer o carrossel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div>
                <Label className="text-sm font-medium">Sobre o que é o conteúdo?</Label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="mt-1"
                  placeholder="Ex: 5 benefícios do pilates para mulheres acima de 40 anos..."
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Moodboard ou referência <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anexe aqui uma referência do Pinterest ou inspiração visual.
                </p>
                {moodboardPreview ? (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={moodboardPreview} alt="moodboard" className="h-16 w-16 rounded object-cover" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMoodboardFile(null);
                        setMoodboardPreview(null);
                      }}
                      className="gap-1 text-xs"
                    >
                      <X className="h-3 w-3" /> Remover
                    </Button>
                  </div>
                ) : (
                  <label className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-background py-3 text-xs font-medium hover:bg-accent">
                    <ImageIcon className="h-4 w-4" />
                    Anexar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickMoodboard(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Número de slides</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSlideCount((n) => Math.max(1, n - 1))}
                    disabled={slideCount <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[3rem] text-center text-2xl font-bold">{slideCount}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSlideCount((n) => Math.min(10, n + 1))}
                    disabled={slideCount >= 10}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="ml-2 text-xs text-muted-foreground">de 1 a 10</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Imagens no carrossel</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["none", "Sem imagens"],
                      ["bg", "Só fundo"],
                      ["grid", "Só grade"],
                      ["mixed", "Intercalar"],
                    ] as [ImageMode, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setImageMode(k)}
                      className={cn(
                        "rounded-lg border bg-background p-3 text-xs font-medium transition",
                        imageMode === k
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:border-primary/40",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Gerar imagens com IA (Nano Banana Pro)</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Gera imagens automáticas para cada slide usando Nano Banana Pro.
                    </p>
                  </div>
                  <Switch checked={aiImages} onCheckedChange={setAiImages} disabled={imageMode === "none"} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setStep(2)} disabled={!canContinueStep1} className="gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Personalizar</DialogTitle>
              <DialogDescription>Identidade visual do seu carrossel.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div>
                <Label className="text-sm font-medium">@ do Instagram (opcional)</Label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@seuperfil"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Combinação de fontes</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {dna.brandFont && (
                    <FontCard
                      heading={dna.brandFont}
                      body={dna.brandFont}
                      label="Sua fonte (DNA)"
                      selected={useDnaFont}
                      onClick={() => setUseDnaFont(true)}
                    />
                  )}
                  {FONT_PAIRS.map((p, i) => (
                    <FontCard
                      key={p.label}
                      heading={p.heading}
                      body={p.body}
                      label={p.label}
                      selected={!useDnaFont && selectedFontIdx === i}
                      onClick={() => {
                        setUseDnaFont(false);
                        setSelectedFontIdx(i);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Paleta de cores</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {dna.palette && (
                    <PaletteCard
                      colors={dna.palette}
                      label="Sua paleta (DNA)"
                      selected={useDnaPalette}
                      onClick={() => setUseDnaPalette(true)}
                    />
                  )}
                  {SUGGESTED_PALETTES.map((p, i) => (
                    <PaletteCard
                      key={p.label}
                      colors={p.colors}
                      label={p.label}
                      selected={!useDnaPalette && selectedPaletteIdx === i}
                      onClick={() => {
                        setUseDnaPalette(false);
                        setSelectedPaletteIdx(i);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleGenerate} className="gap-2">
                Gerar carrossel <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Gerando conteúdo...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A IA está criando seus slides com base no DNA da marca.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <Progress value={progress} />
              <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FontCard({
  heading,
  body,
  label,
  selected,
  onClick,
}: {
  heading: string;
  body: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-background p-3 text-left transition",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40",
      )}
    >
      <div
        style={{ fontFamily: `"${heading}", system-ui, sans-serif`, fontWeight: 700 }}
        className="text-xl leading-tight"
      >
        Aa Título
      </div>
      <div
        style={{ fontFamily: `"${body}", system-ui, sans-serif`, fontWeight: 400 }}
        className="text-sm text-muted-foreground"
      >
        Texto do corpo
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </button>
  );
}

function PaletteCard({
  colors,
  label,
  selected,
  onClick,
}: {
  colors: [string, string, string];
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-background p-3 text-left transition",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40",
      )}
    >
      <div className="flex gap-2">
        {colors.map((c, i) => (
          <div
            key={i}
            className="h-10 flex-1 rounded-md border"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </button>
  );
}
