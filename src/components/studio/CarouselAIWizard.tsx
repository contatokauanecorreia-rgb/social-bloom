import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Image as ImageIcon,
  ImageOff,
  Link2,
  Loader2,
  Search,
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
import { loadCustomFont, loadGoogleFont } from "@/lib/brand-font";
import {
  fetchGoogleFontsCatalog,
  pickSuggestedPairs,
  searchFonts,
  type FontPair,
  type GoogleFontCategory,
  type GoogleFontItem,
} from "@/lib/google-fonts";
import { cn } from "@/lib/utils";
import { createStudioJob, deleteStudioJob, fetchStudioJob, updateStudioJob } from "@/lib/studio-jobs";

export type CarouselAIWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  initialTopic?: string;
  initialJobId?: string | null;
};

type ImageMode = "none" | "bg" | "grid" | "mixed";

// Cores semânticas das previews:
// - IMG = imagens (preto)
// - TITLE = títulos / textos maiores (cinza escuro)
// - BODY = textos menores (cinza claro)
const PC = { IMG: "#1A1A1A", TITLE: "#4B5563", BODY: "#D1D5DB" } as const;

type TextAlignChoice = "left" | "center";
type BgKindChoice = "foto" | "texto";
type SignaturePos6 = "tl" | "tc" | "tr" | "bl" | "bc" | "br";


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
  brandFontUrl: string | null;
  archetype: string | null;
  toneOfVoice: string | null;
  targetAudience: string | null;
  contentPillars: string[];
  businessDescription: string | null;
};

type SelectedSource = "dna" | "suggestion" | "custom";



const CATEGORY_OPTIONS: { key: GoogleFontCategory; label: string }[] = [
  { key: "serif", label: "Serif" },
  { key: "sans-serif", label: "Sans-serif" },
  { key: "display", label: "Display" },
  { key: "handwriting", label: "Handwriting" },
  { key: "monospace", label: "Monospace" },
];

export function CarouselAIWizard({ open, onOpenChange, clientId, initialTopic, initialJobId }: CarouselAIWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | "loading" | "choose">(1);
  const currentJobIdRef = useRef<string | null>(null);
  const backgroundedRef = useRef(false);

  type VariantSlide = {
    title: string;
    subtitle?: string;
    body: string;
    imagePrompt: string;
    imageDataUrl: string | null;
    sistema?: "minimalista" | "criativo";
    tipo?: string;
    fundo?: string;
    imageFrame?: "full" | "top-60" | "half-left" | "half-right" | "centered-square" | "bottom-third" | null;
    label?: string;
    tags?: string[];
    elemento_decorativo?: string;
    palavra_destaque?: string;
    ticker_texto?: string;
    elemento_grafico?: string;
  };
  type VariantData = {
    slides: VariantSlide[];
    archetype: string | null;
  } | null;
  const [variants, setVariants] = useState<{
    minimalista: VariantData;
    criativo: VariantData;
  }>({ minimalista: null, criativo: null });
  // Snapshot dos parâmetros comuns no momento da geração (para usar ao montar o bootstrap)
  const generationCtxRef = useRef<{
    aiImages: boolean;
    imageMode: ImageMode;
    imageStyle: string;
    palette: [string, string, string];
    fontPair: { heading: string; body: string } | null;
    signature: { enabled: boolean; handle: string; position: SignaturePos6; color: string } | null;
    selectedSource: SelectedSource | null;
  } | null>(null);

  // Step 1
  const [contentSource, setContentSource] = useState<"planner" | "ai">("ai");
  const [topic, setTopic] = useState("");
  const [plannerPosts, setPlannerPosts] = useState<
    { id: string; title: string; tags: string[]; notes: string | null }[]
  >([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [slideCount, setSlideCount] = useState(5);
  const [textAlignChoice, setTextAlignChoice] = useState<TextAlignChoice>("left");
  const [bgKinds, setBgKinds] = useState<BgKindChoice[]>(["texto", "foto"]);
  const [signaturePos, setSignaturePos] = useState<SignaturePos6>("br");
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [longContentDialogOpen, setLongContentDialogOpen] = useState(false);
  const [recommendedSlides, setRecommendedSlides] = useState<number>(0);
  const hasImagePrinciple = bgKinds.includes("foto");
  const hasTextOnlyPrinciple = bgKinds.includes("texto");
  const aiImages = hasImagePrinciple;
  const imageMode: ImageMode = !hasImagePrinciple
    ? "none"
    : hasTextOnlyPrinciple
      ? "mixed"
      : "bg";
  const [imageStyle, setImageStyle] = useState("");

  // Step 2 - geral
  const [instagram, setInstagram] = useState("");
  const [dna, setDna] = useState<DnaInfo>({
    palette: null,
    brandFont: null,
    brandFontUrl: null,
    archetype: null,
    toneOfVoice: null,
    targetAudience: null,
    contentPillars: [],
    businessDescription: null,
  });
  const [clientName, setClientName] = useState<string>("seu cliente");

  // Paleta
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState<number>(0);
  const [useDnaPalette, setUseDnaPalette] = useState(true);


  // Fontes
  const [catalog, setCatalog] = useState<GoogleFontItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<FontPair[]>([]);
  const [selected, setSelected] = useState<{ source: SelectedSource; heading: string; body: string } | null>(null);
  const [customPairs, setCustomPairs] = useState<FontPair[]>([]);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterCats, setFilterCats] = useState<GoogleFontCategory[]>([]);
  const [exploreLimit, setExploreLimit] = useState(30);
  const [pendingFont, setPendingFont] = useState<string | null>(null); // ao clicar uma fonte no explorar

  // Loading
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<number | null>(null);
  const loadingPersistRef = useRef(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        if (loadingPersistRef.current) {
          loadingPersistRef.current = false;
          return;
        }
        setStep(1);
        setVariants({ minimalista: null, criativo: null });
        generationCtxRef.current = null;
        setContentSource("ai");
        setTopic("");
        setSelectedPostIds([]);
        setReferenceFile(null);
        setReferenceUrl("");
        setReferenceImageDataUrl(null);
        setReferenceLoading(false);
        setSlideCount(5);
        setTextAlignChoice("left");
        setBgKinds(["texto", "foto"]);
        setSignaturePos("br");
        setSignatureEnabled(true);
        setImageStyle("");
        setInstagram("");
        setSelectedPaletteIdx(0);
        
        setProgress(0);
        setSelected(null);
        setCustomPairs([]);
        setExploreOpen(false);
        setSearchQuery("");
        setDebouncedQuery("");
        setFilterCats([]);
        setExploreLimit(30);
        setPendingFont(null);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Seed topic from initialTopic when wizard opens
  useEffect(() => {
    if (open && initialTopic && initialTopic.trim().length > 0) {
      setContentSource("ai");
      setTopic(initialTopic);
      setStep(1);
    }
  }, [open, initialTopic]);

  // Hydrate from an existing job (reopening an in-progress carousel)
  useEffect(() => {
    if (!open || !initialJobId) return;
    let cancelled = false;
    fetchStudioJob(initialJobId).then((job) => {
      if (cancelled || !job) return;
      currentJobIdRef.current = job.id;
      const result = job.result as {
        phase?: "variants" | "images" | "done";
        variants?: { minimalista: VariantData; criativo: VariantData };
        ctx?: typeof generationCtxRef.current;
        textAlign?: TextAlignChoice;
      } | null;
      const phase = result?.phase;

      // O wizard só lida com a fase de variantes. Para images/done o
      // dashboard navega direto pro editor — aqui só ignoramos.
      if (phase === "images" || phase === "done") {
        onOpenChange(false);
        return;
      }

      if (job.status === "running" && result?.variants && (phase === "variants" || phase == null)) {
        // Variantes prontas, aguardando o usuário escolher.
        if (result.ctx) generationCtxRef.current = result.ctx;
        if (result.textAlign) setTextAlignChoice(result.textAlign);
        setVariants(result.variants);
        setStep("choose");
        setProgress(100);
      } else if (job.status === "running") {
        setStep("loading");
        setProgress(Math.max(10, job.progress));
      } else if (job.status === "error") {
        toast.error(job.error ?? "Erro na geração.");
        setStep(2);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialJobId, onOpenChange]);


  // Carregar DNA + nome do cliente quando entra no passo 2
  useEffect(() => {
    if (step !== 2 || !clientId) return;
    let cancelled = false;

    Promise.all([
      supabase
        .from("client_briefings")
        .select(
          "palette, brand_font, brand_font_url, archetype, tone_of_voice, target_audience, content_pillars, business_description",
        )
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
    ]).then(([{ data }, { data: client }]) => {
      if (cancelled) return;

      const pal = (data?.palette ?? []) as string[];
      const palette: [string, string, string] | null =
        pal.length >= 3 ? [pal[0], pal[1], pal[2]] : null;

      const next: DnaInfo = {
        palette,
        brandFont: (data?.brand_font as string | null) ?? null,
        brandFontUrl: (data?.brand_font_url as string | null) ?? null,
        archetype: (data?.archetype as string | null) ?? null,
        toneOfVoice: (data?.tone_of_voice as string | null) ?? null,
        targetAudience: (data?.target_audience as string | null) ?? null,
        contentPillars: ((data?.content_pillars ?? []) as string[]) || [],
        businessDescription: (data?.business_description as string | null) ?? null,
      };
      setDna(next);
      setUseDnaPalette(!!palette);
      setClientName((client?.name as string | null) ?? "seu cliente");

      const palIdx = next.archetype
        ? SUGGESTED_PALETTES.findIndex((p) => p.archetypes.includes(next.archetype!))
        : -1;
      if (!palette && palIdx >= 0) setSelectedPaletteIdx(palIdx);

      // Pré-carrega fonte do DNA
      if (next.brandFont && next.brandFontUrl) {
        loadCustomFont(next.brandFont, next.brandFontUrl);
      } else if (next.brandFont) {
        loadGoogleFont(next.brandFont);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [step, clientId]);

  // Carregar catálogo do Google Fonts
  useEffect(() => {
    if (step !== 2 || catalog) return;
    let cancelled = false;
    fetchGoogleFontsCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch((err) => {
        console.error("Google Fonts catalog error", err);
        toast.error("Não foi possível carregar o catálogo de fontes.");
      });
    return () => {
      cancelled = true;
    };
  }, [step, catalog]);

  // Gerar sugestões quando catálogo + DNA prontos
  useEffect(() => {
    if (!catalog) return;
    const pairs = pickSuggestedPairs(
      catalog,
      {
        archetype: dna.archetype,
        toneOfVoice: dna.toneOfVoice,
        targetAudience: dna.targetAudience,
        contentPillars: dna.contentPillars,
        businessDescription: dna.businessDescription,
      },
      5,
    );
    setSuggestions(pairs);
    // Preload das sugestões
    pairs.forEach((p) => {
      loadGoogleFont(p.heading);
      loadGoogleFont(p.body);
    });
    // Default: DNA se houver, senão primeira sugestão
    setSelected((cur) => {
      if (cur) return cur;
      if (dna.brandFont) {
        return { source: "dna", heading: dna.brandFont, body: dna.brandFont };
      }
      if (pairs[0]) return { source: "suggestion", heading: pairs[0].heading, body: pairs[0].body };
      return null;
    });
  }, [catalog, dna]);

  // Debounce busca
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // Reset limite ao mudar query/filtros
  useEffect(() => {
    setExploreLimit(30);
  }, [debouncedQuery, filterCats]);

  const exploreResults = useMemo(() => {
    if (!catalog) return [];
    return searchFonts(catalog, debouncedQuery, filterCats, 500);
  }, [catalog, debouncedQuery, filterCats]);

  // Preload nomes visíveis no explorar
  useEffect(() => {
    if (!exploreOpen) return;
    exploreResults.slice(0, exploreLimit).forEach((f) => loadGoogleFont(f.family));
  }, [exploreOpen, exploreResults, exploreLimit]);

  // Carregar posts do Planner do cliente
  useEffect(() => {
    if (!open || step !== 1 || !clientId) return;
    let cancelled = false;
    setLoadingPosts(true);
    supabase.auth.getSession().then(({ data: sess }) => {
      const uid = sess.session?.user?.id;
      if (!uid) {
        if (!cancelled) {
          setPlannerPosts([]);
          setLoadingPosts(false);
        }
        return;
      }
      supabase
        .from("content_posts")
        .select("id, title, tags, notes")
        .eq("user_id", uid)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data }) => {
          if (cancelled) return;
          const rows = (data ?? []) as { id: string; title: string; tags: string[] | null; notes: string | null }[];
          setPlannerPosts(rows.map((r) => ({ ...r, tags: r.tags ?? [] })));
          setLoadingPosts(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, step, clientId]);

  const onPickReferenceFile = (f: File) => {
    setReferenceFile(f);
    setReferenceUrl("");
    const reader = new FileReader();
    reader.onload = () => setReferenceImageDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onUseReferenceUrl = async () => {
    const url = referenceUrl.trim();
    if (!url) return;
    setReferenceLoading(true);
    setReferenceFile(null);
    try {
      const isDirectImage = /\.(jpe?g|png|webp)(\?.*)?$/i.test(url);
      if (isDirectImage) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Não foi possível baixar a imagem.");
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onload = () => setReferenceImageDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
      } else {
        const { data, error } = await supabase.functions.invoke("screenshot-url", {
          body: { url },
        });
        if (error) throw error;
        if (!data?.imageDataUrl) {
          toast.error("Não foi possível processar este link — anexe uma imagem.");
          setReferenceImageDataUrl(null);
        } else {
          setReferenceImageDataUrl(data.imageDataUrl);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao processar link.");
    } finally {
      setReferenceLoading(false);
    }
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferenceUrl("");
    setReferenceImageDataUrl(null);
  };

  const canContinueStep1 =
    (contentSource === "ai" ? topic.trim().length > 0 : selectedPostIds.length > 0) &&
    bgKinds.length >= 1;

  const palette = useMemo<[string, string, string]>(() => {
    if (useDnaPalette && dna.palette) return dna.palette;
    return SUGGESTED_PALETTES[selectedPaletteIdx]?.colors ?? SUGGESTED_PALETTES[0].colors;
  }, [useDnaPalette, dna.palette, selectedPaletteIdx]);

  const fontPairForOutput = useMemo(() => {
    if (!selected) return null;
    return { heading: selected.heading, body: selected.body };
  }, [selected]);

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

  const handleSelectFromExplore = (family: string, role: "heading" | "body") => {
    setSelected((cur) => {
      const base = cur ?? { source: "custom" as SelectedSource, heading: family, body: family };
      const next = { ...base, source: "custom" as SelectedSource, [role]: family };
      // Quando os dois campos foram intencionalmente escolhidos, registra como custom pair único
      const pair: FontPair = { heading: next.heading, body: next.body, label: `${next.heading} + ${next.body}` };
      setCustomPairs((arr) => {
        if (arr.some((p) => p.heading === pair.heading && p.body === pair.body)) return arr;
        return [pair, ...arr].slice(0, 5);
      });
      loadGoogleFont(next.heading);
      loadGoogleFont(next.body);
      return next;
    });
    setPendingFont(null);
  };

  const handleGenerate = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente antes de gerar.");
      return;
    }
    setStep("loading");
    startProgress();
    backgroundedRef.current = false;

    // Monta o "topic" enviado ao backend conforme a fonte de conteúdo
    let effectiveTopic = topic.trim();
    let plannerSource: { posts: { title: string; tags: string[]; notes: string | null }[] } | null = null;
    if (contentSource === "planner") {
      const picked = plannerPosts.filter((p) => selectedPostIds.includes(p.id));
      plannerSource = {
        posts: picked.map((p) => ({ title: p.title, tags: p.tags, notes: p.notes })),
      };
      effectiveTopic = picked.map((p) => p.title).join(" / ") || "Conteúdo do Planner";
    }

    const commonBody = {
      clientId,
      topic: effectiveTopic,
      slideCount,
      imageMode: "none" as ImageMode,
      aiImages: false,
      fontPair: fontPairForOutput,
      palette,
      instagram: instagram.trim() || null,
      textOnly: true,
      referenceImageDataUrl: referenceImageDataUrl ?? null,
      plannerSource,
      designPrinciples: null,
      textAlign: textAlignChoice,
    };

    generationCtxRef.current = {
      aiImages,
      imageMode,
      imageStyle,
      palette,
      fontPair: fontPairForOutput,
      signature:
        signatureEnabled && instagram.trim()
          ? {
              enabled: true,
              handle: instagram.trim().startsWith("@") ? instagram.trim() : `@${instagram.trim()}`,
              position: signaturePos,
              color: palette[0],
            }
          : null,
      selectedSource: selected?.source ?? null,
    };

    // Cria job no banco para rastrear em background
    const jobTitle = (effectiveTopic || "Carrossel").slice(0, 80);
    const jobId = await createStudioJob({
      kind: "carrossel",
      clientId,
      title: jobTitle,
      input: {} as Record<string, unknown>,
    });
    currentJobIdRef.current = jobId;
    if (jobId) updateStudioJob(jobId, { progress: 20 });

    try {
      const [minRes, creRes] = await Promise.all([
        supabase.functions.invoke("carrossel-generate", {
          body: { ...commonBody, bgKinds: ["texto"] },
        }),
        supabase.functions.invoke("carrossel-generate", {
          body: { ...commonBody, bgKinds: ["foto"] },
        }),
      ]);

      stopProgress();

      const parseVariant = (res: typeof minRes): VariantData => {
        if (res.error) {
          console.error("variant error", res.error);
          return null;
        }
        const d = res.data as { slides?: VariantSlide[]; meta?: { archetype?: string | null } } | null;
        if (!d || !Array.isArray(d.slides)) return null;
        return { slides: d.slides, archetype: d.meta?.archetype ?? null };
      };

      const minimalista = parseVariant(minRes);
      const criativo = parseVariant(creRes);

      if (!minimalista && !criativo) {
        throw new Error("A IA não conseguiu gerar nenhuma versão. Tente de novo.");
      }

      // Persiste resultado no job mantendo status=running enquanto o usuário
      // ainda não escolheu uma variante. O job só vira "done" quando o worker
      // global terminar a geração de imagens da variante escolhida.
      if (jobId) {
        updateStudioJob(jobId, {
          progress: 30,
          result: {
            phase: "variants",
            variants: { minimalista, criativo },
            ctx: generationCtxRef.current,
            textAlign: textAlignChoice,
          } as unknown as Record<string, unknown>,
        });
      }

      // Se o modal foi fechado, não atualizamos o state local; o toast global
      // do useStudioJobs avisa o usuário e ele pode reabrir pelo painel.
      if (backgroundedRef.current) {
        return;
      }

      setProgress(100);
      if (!minimalista || !criativo) {
        toast.message(
          "Uma das versões falhou. Você ainda pode escolher a versão gerada ou tentar de novo.",
        );
      }
      setVariants({ minimalista, criativo });
      setStep("choose");
    } catch (err) {
      console.error(err);
      stopProgress();
      const msg = err instanceof Error ? err.message : "Erro ao gerar carrossel.";
      if (jobId) updateStudioJob(jobId, { status: "error", error: msg });
      if (backgroundedRef.current) return;
      toast.error(msg);
      setStep(2);
      setProgress(0);
    }
  };


  const pickVariant = (kind: "minimalista" | "criativo") => {
    const variant = variants[kind];
    const ctx = generationCtxRef.current;
    if (!variant || !ctx) return;

    const trimmedStyle = ctx.imageStyle.trim() || null;
    const deriveVisualSeed = (s: { title?: string; body?: string; subtitle?: string }) => {
      const t = (s.title ?? "").trim();
      const b = (s.body ?? s.subtitle ?? "").trim();
      const seed = [t, b].filter(Boolean).join(". ").slice(0, 200);
      return seed
        ? `editorial lifestyle photograph evoking the mood of: ${seed}`
        : `editorial lifestyle photograph, calm and emotionally resonant scene`;
    };

    // Imagens só fazem sentido na versão criativa (presets com foto).
    const shouldGenImages = ctx.aiImages && kind === "criativo";
    const imageJobs = shouldGenImages
      ? variant.slides
          .map((s, i) => {
            const explicit = typeof s.imagePrompt === "string" ? s.imagePrompt.trim() : "";
            const wantsPhoto =
              s.fundo === "foto" || (s.imageFrame ?? null) !== null || explicit.length > 0;
            if (!wantsPhoto) return null;
            const promptText = explicit.length > 0 ? explicit : deriveVisualSeed(s);
            return {
              slideIndex: i,
              imagePrompt: promptText,
              imageStyle: trimmedStyle,
            };
          })
          .filter(
            (j): j is { slideIndex: number; imagePrompt: string; imageStyle: string | null } =>
              j !== null,
          )
      : [];

    const bootstrap = {
      slides: variant.slides,
      fontPair: ctx.fontPair,
      palette: ctx.palette,
      imageMode: shouldGenImages ? ctx.imageMode : ("none" as ImageMode),
      textAlign: textAlignChoice,
      bgKinds: kind === "minimalista" ? ["texto"] : ["foto"],
      signature: ctx.signature,
      imageJobs,
      archetype: variant.archetype,
      imageStyle: trimmedStyle,
      fontWeightOverride:
        ctx.selectedSource && ctx.selectedSource !== "dna"
          ? { title: 700, subtitle: 500, body: 300 }
          : null,
    };

    try {
      sessionStorage.setItem("studio:carrossel:bootstrap", JSON.stringify(bootstrap));
    } catch (e) {
      console.warn("bootstrap sessionStorage failed", e);
    }

    // Persiste no job para que o worker global continue a geração
    // mesmo se o usuário sair do editor.
    const jobId = currentJobIdRef.current;
    if (jobId) {
      void updateStudioJob(jobId, {
        progress: 35,
        result: {
          phase: imageJobs.length > 0 ? "images" : "done",
          variant: kind,
          bootstrap,
          imageJobs,
          images: {},
          imagesDone: 0,
          imagesTotal: imageJobs.length,
          ctx,
          textAlign: textAlignChoice,
        } as unknown as Record<string, unknown>,
      });
      if (imageJobs.length === 0) {
        // Sem imagens a gerar — marca como concluído imediatamente.
        void updateStudioJob(jobId, { status: "done", progress: 100 });
      }
    }

    loadingPersistRef.current = true;
    onOpenChange(false);
    navigate({
      to: "/dashboard/studio/carrossel",
      search: jobId ? { jobId } : undefined,
    } as never);
  };



  const isSelected = (heading: string, body: string, source: SelectedSource) =>
    !!selected && selected.heading === heading && selected.body === body && selected.source === source;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && step === "loading") {
          // Permite fechar enquanto gera: roda em segundo plano e avisa quando pronto.
          backgroundedRef.current = true;
          loadingPersistRef.current = true;
          toast.message("Geração em andamento", {
            description: "Você pode continuar trabalhando — avisaremos quando ficar pronto.",
          });
          onOpenChange(false);
          return;
        }
        if (!o && step === "choose") {
          // Fechou sem escolher uma versão — limpa o job pendente para não
          // ficar pendurado em "em andamento" para sempre.
          const pendingJobId = currentJobIdRef.current;
          if (pendingJobId) {
            void deleteStudioJob(pendingJobId);
            currentJobIdRef.current = null;
          }
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Configurar carrossel</DialogTitle>
              <DialogDescription>
                Escolha a fonte do conteúdo e como quer o carrossel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* SEÇÃO 1 — Fonte do conteúdo */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Fonte do conteúdo</Label>

                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition",
                    contentSource === "planner"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={contentSource === "planner"}
                    onChange={() => setContentSource("planner")}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Usar conteúdo do Planner</div>
                    <div className="text-xs text-muted-foreground">
                      Selecione um ou mais posts já planejados para este cliente.
                    </div>
                    {contentSource === "planner" && (
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-md border bg-card">
                        {loadingPosts ? (
                          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Carregando posts...
                          </div>
                        ) : plannerPosts.length === 0 ? (
                          <p className="p-3 text-xs text-muted-foreground">
                            Nenhum post no Planner para este cliente.
                          </p>
                        ) : (
                          plannerPosts.map((p) => {
                            const checked = selectedPostIds.includes(p.id);
                            const type =
                              p.tags.find((t) => /carrossel|reels|post/i.test(t))?.toLowerCase() ?? "post";
                            return (
                              <label
                                key={p.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0 hover:bg-accent",
                                  checked && "bg-primary/5",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedPostIds((arr) =>
                                      e.target.checked
                                        ? [...arr, p.id]
                                        : arr.filter((x) => x !== p.id),
                                    );
                                  }}
                                />
                                <span className="flex-1 truncate font-medium">{p.title}</span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {type}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </label>

                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition",
                    contentSource === "ai"
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40",
                  )}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={contentSource === "ai"}
                    onChange={() => setContentSource("ai")}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Gerar com IA</div>
                    <div className="text-xs text-muted-foreground">
                      Descreva o tema e a IA escreve os slides.
                    </div>
                    {contentSource === "ai" && (
                      <Textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={3}
                        className="mt-2"
                        placeholder="Ex: 5 benefícios do pilates para mulheres acima de 40 anos..."
                      />
                    )}
                  </div>
                </label>
              </div>

              {/* SEÇÃO 2 — Referência de conteúdo */}
              <div>
                <Label className="text-sm font-semibold">
                  Referência de conteúdo <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anexe uma imagem ou cole um link (Pinterest, Instagram, site...) — a IA vai analisar paleta, tipografia e estilo visual.
                </p>

                {referenceImageDataUrl ? (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={referenceImageDataUrl} alt="referência" className="h-16 w-16 rounded object-cover" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearReference}
                      className="gap-1 text-xs"
                    >
                      <X className="h-3 w-3" /> Remover
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-background py-3 text-xs font-medium hover:bg-accent">
                      <ImageIcon className="h-4 w-4" />
                      Anexar imagem
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onPickReferenceFile(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Link2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={referenceUrl}
                          onChange={(e) => setReferenceUrl(e.target.value)}
                          placeholder="Colar link"
                          className="h-9 pl-7 text-xs"
                          disabled={referenceLoading}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onUseReferenceUrl}
                        disabled={!referenceUrl.trim() || referenceLoading}
                      >
                        {referenceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Usar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 3 — Configurações (mantida) */}

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
                <Label className="text-sm font-medium">Princípios de design</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolha o alinhamento do texto e os tipos de fundo. A IA distribui os fundos entre os slides.
                </p>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Alinhamento do texto</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["left", "center"] as TextAlignChoice[]).map((a) => {
                        const active = textAlignChoice === a;
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setTextAlignChoice(a)}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-lg border-2 bg-background py-2.5 text-xs font-medium transition",
                              active ? "border-primary shadow-sm" : "border-border hover:border-primary/50",
                            )}
                          >
                            {a === "left" ? <AlignLeft className="h-4 w-4" /> : <AlignCenter className="h-4 w-4" />}
                            {a === "left" ? "Alinhado à esquerda" : "Centralizado"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Tipo de fundo (selecione um ou ambos)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["foto", "texto"] as BgKindChoice[]).map((k) => {
                        const active = bgKinds.includes(k);
                        const isLast = active && bgKinds.length === 1;
                        return (
                          <button
                            key={k}
                            type="button"
                            disabled={isLast}
                            onClick={() => {
                              setBgKinds((arr) =>
                                arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k],
                              );
                            }}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-lg border-2 bg-background py-2.5 text-xs font-medium transition",
                              active ? "border-primary shadow-sm" : "border-border hover:border-primary/50",
                              isLast && "opacity-70 cursor-not-allowed",
                            )}
                          >
                            {k === "foto" ? <ImageIcon className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
                            {k === "foto" ? "Foto cheia" : "Só texto"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4 — Estilo das imagens */}
              {aiImages && imageMode !== "none" && (
                <div>
                  <Label className="text-sm font-medium">
                    Estilo das imagens{" "}
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    rows={2}
                    className="mt-2"
                    placeholder="Ex: editorial minimalista, fotorrealista ao ar livre, cores vibrantes..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se vazio, será usado um estilo padrão baseado no arquétipo da marca.
                  </p>
                </div>
              )}
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

              {/* COMBINAÇÃO DE FONTES */}
              <div>
                <Label className="text-sm font-medium">Combinação de fontes</Label>

                {/* DNA */}
                {dna.brandFont && (
                  <div className="mt-2">
                    <FontCard
                      heading={dna.brandFont}
                      body={dna.brandFont}
                      badge="Sua fonte"
                      badgeTone="dna"
                      selected={isSelected(dna.brandFont, dna.brandFont, "dna")}
                      onClick={() =>
                        setSelected({ source: "dna", heading: dna.brandFont!, body: dna.brandFont! })
                      }
                    />
                  </div>
                )}

                {/* Sugestões */}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sugeridas para você
                  </p>
                  {!catalog ? (
                    <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando fontes do Google...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nenhuma sugestão disponível.</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {suggestions.map((p) => (
                        <FontCard
                          key={`${p.heading}__${p.body}`}
                          heading={p.heading}
                          body={p.body}
                          badge={`Sugerido para ${clientName}`}
                          badgeTone="suggestion"
                          selected={isSelected(p.heading, p.body, "suggestion")}
                          onClick={() =>
                            setSelected({ source: "suggestion", heading: p.heading, body: p.body })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Personalizadas */}
                {customPairs.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Personalizadas
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {customPairs.map((p) => (
                        <FontCard
                          key={`c-${p.heading}__${p.body}`}
                          heading={p.heading}
                          body={p.body}
                          badge="Personalizada"
                          badgeTone="custom"
                          selected={isSelected(p.heading, p.body, "custom")}
                          onClick={() =>
                            setSelected({ source: "custom", heading: p.heading, body: p.body })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Explorar mais */}
                <div className="mt-3 rounded-lg border bg-background">
                  <button
                    type="button"
                    onClick={() => setExploreOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" /> Explorar mais fontes
                    </span>
                    {exploreOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {exploreOpen && (
                    <div className="border-t p-3">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar fonte (ex: Inter, Lora...)"
                        className="text-sm"
                      />

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {CATEGORY_OPTIONS.map((c) => {
                          const active = filterCats.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() =>
                                setFilterCats((arr) =>
                                  active ? arr.filter((x) => x !== c.key) : [...arr, c.key],
                                )
                              }
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] transition",
                                active
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background hover:border-primary/40",
                              )}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      {!catalog ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Carregando catálogo...
                        </div>
                      ) : (
                        <>
                          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
                            {exploreResults.slice(0, exploreLimit).map((f) => (
                              <div key={f.family} className="rounded-md border bg-background">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingFont((cur) => (cur === f.family ? null : f.family))
                                  }
                                  className="flex w-full items-center justify-between px-2.5 py-1.5 text-left hover:bg-accent"
                                >
                                  <span
                                    className="truncate text-sm"
                                    style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}
                                  >
                                    {f.family}
                                  </span>
                                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {f.category}
                                  </span>
                                </button>
                                {pendingFont === f.family && (
                                  <div className="flex gap-1.5 border-t bg-muted/30 px-2.5 py-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px]"
                                      onClick={() => handleSelectFromExplore(f.family, "heading")}
                                    >
                                      Usar como Título
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px]"
                                      onClick={() => handleSelectFromExplore(f.family, "body")}
                                    >
                                      Usar como Corpo
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {exploreResults.length === 0 && (
                              <p className="py-3 text-center text-xs text-muted-foreground">
                                Nenhuma fonte encontrada.
                              </p>
                            )}
                          </div>
                          {exploreResults.length > exploreLimit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full text-xs"
                              onClick={() => setExploreLimit((n) => n + 30)}
                            >
                              Carregar mais
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* PALETA */}
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
              <Button onClick={handleGenerate} disabled={!selected} className="gap-2">
                Gerar carrossel <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Gerando duas versões...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A IA está criando uma versão minimalista e uma criativa para você comparar.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <Progress value={progress} />
              <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          </div>
        )}

        {step === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle>Escolha a versão</DialogTitle>
              <DialogDescription>
                Geramos duas versões do seu carrossel. Escolha qual vai para o editor — você poderá ajustar tudo depois.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <VariantPreviewCard
                kind="minimalista"
                title="Minimalista"
                subtitle="Tipografia limpa, sem foto. Foco no texto."
                variant={variants.minimalista}
                palette={generationCtxRef.current?.palette ?? palette}
                fontPair={generationCtxRef.current?.fontPair ?? fontPairForOutput}
                onPick={() => pickVariant("minimalista")}
              />
              <VariantPreviewCard
                kind="criativo"
                title="Criativo"
                subtitle="Foto editorial cobrindo o slide, texto sobreposto."
                variant={variants.criativo}
                palette={generationCtxRef.current?.palette ?? palette}
                fontPair={generationCtxRef.current?.fontPair ?? fontPairForOutput}
                onPick={() => pickVariant("criativo")}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                As imagens da versão criativa são geradas no editor depois de escolher.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVariants({ minimalista: null, criativo: null });
                  setStep(2);
                  setProgress(0);
                }}
              >
                Gerar de novo
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}

function VariantPreviewCard({
  kind,
  title,
  subtitle,
  variant,
  palette,
  fontPair,
  onPick,
}: {
  kind: "minimalista" | "criativo";
  title: string;
  subtitle: string;
  variant: {
    slides: Array<{ title: string; subtitle?: string; body: string }>;
    archetype: string | null;
  } | null;
  palette: [string, string, string];
  fontPair: { heading: string; body: string } | null;
  onPick: () => void;
}) {
  const headingFont = fontPair?.heading ?? "Inter";
  const bodyFont = fontPair?.body ?? "Inter";
  const slides = variant?.slides ?? [];
  const previewSlides = slides.slice(0, 3);
  const isCriativo = kind === "criativo";

  return (
    <div className="flex flex-col rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {!variant && (
          <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            falhou
          </span>
        )}
      </div>

      {variant ? (
        <div className="grid grid-cols-3 gap-1.5">
          {previewSlides.map((s, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] overflow-hidden rounded border"
              style={{
                background: isCriativo
                  ? `linear-gradient(135deg, ${palette[2]} 0%, ${palette[0]} 100%)`
                  : palette[1],
                color: isCriativo ? "#fff" : palette[2],
              }}
            >
              {isCriativo && (
                <div className="absolute inset-0 bg-black/30" aria-hidden />
              )}
              <div className="relative flex h-full flex-col justify-end p-2">
                <div
                  className="line-clamp-3 text-[9px] font-bold leading-tight"
                  style={{
                    fontFamily: `"${headingFont}", system-ui, sans-serif`,
                    opacity: s.title ? 1 : 0.45,
                    fontStyle: s.title ? "normal" : "italic",
                  }}
                >
                  {s.title || "(sem título)"}
                </div>
                {s.body && (
                  <div
                    className="mt-1 line-clamp-2 text-[7px] opacity-80"
                    style={{ fontFamily: `"${bodyFont}", system-ui, sans-serif` }}
                  >
                    {s.body}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex aspect-[4/2] items-center justify-center rounded border border-dashed text-[11px] text-muted-foreground">
          Não foi possível gerar esta versão.
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {variant ? `${slides.length} slides` : "—"}
      </p>

      <Button
        className="mt-3 w-full gap-1.5"
        onClick={onPick}
        disabled={!variant}
        size="sm"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Escolher esta versão
      </Button>
    </div>
  );
}


function FontCard({
  heading,
  body,
  badge,
  badgeTone,
  selected,
  onClick,
}: {
  heading: string;
  body: string;
  badge: string;
  badgeTone: "dna" | "suggestion" | "custom";
  selected: boolean;
  onClick: () => void;
}) {
  const badgeClass =
    badgeTone === "dna"
      ? "bg-primary/10 text-primary"
      : badgeTone === "suggestion"
      ? "bg-accent text-accent-foreground"
      : "bg-muted text-muted-foreground";
  // Garante que as fontes do par estão carregadas no preview e aguarda antes de renderizar
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFontsReady(false);
    loadGoogleFont(heading);
    loadGoogleFont(body);
    const waitFor = async () => {
      if (typeof document === "undefined" || !("fonts" in document)) {
        if (!cancelled) setFontsReady(true);
        return;
      }
      try {
        await Promise.all([
          (document as any).fonts.load(`700 20px "${heading}"`),
          (document as any).fonts.load(`400 14px "${body}"`),
        ]);
      } catch {
        /* ignore */
      }
      if (!cancelled) setFontsReady(true);
    };
    waitFor();
    return () => {
      cancelled = true;
    };
  }, [heading, body]);

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
        style={{
          fontFamily: `"${heading}", system-ui, sans-serif`,
          fontWeight: 700,
          fontSize: 22,
          lineHeight: 1.1,
          visibility: fontsReady ? "visible" : "hidden",
        }}
      >
        {heading}
      </div>
      {body !== heading && (
        <div
          style={{
            fontFamily: `"${body}", system-ui, sans-serif`,
            fontWeight: 400,
            fontSize: 14,
            visibility: fontsReady ? "visible" : "hidden",
          }}
          className="text-muted-foreground"
        >
          {body}
        </div>
      )}
      <div className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeClass)}>
        {badge}
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
          <div key={i} className="h-10 flex-1 rounded-md border" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </button>
  );
}
