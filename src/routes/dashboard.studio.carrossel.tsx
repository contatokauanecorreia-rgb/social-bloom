import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Trash2,
  Type,
  X,
} from "lucide-react";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACTIVE_CLIENT_STORAGE_KEY } from "@/lib/client-context";
import { cn } from "@/lib/utils";
import { ensureBrandFont, brandFontFamily, loadGoogleFont } from "@/lib/brand-font";
import { markPlannerHasDraft } from "@/lib/planner-notification";

export const Route = createFileRoute("/dashboard/studio/carrossel")({
  head: () => ({ meta: [{ title: "Editor de carrossel — Postly" }] }),
  component: CarrosselEditorPage,
});

// ---------- Tipos ----------

type FormatKey = "carrossel" | "quadrado" | "stories";
type Format = { key: FormatKey; label: string; w: number; h: number };
type OverlayType = "dark" | "light" | "gradient";
type TextField = "title" | "subtitle" | "body";
type TextAlign = "left" | "center" | "right";
type SignaturePos = "bl" | "br" | "tl" | "tr";

type Slide = {
  id: string;
  bgImage: string | null;
  bgPos: { x: number; y: number };
  bgZoom: number;
  grid: { enabled: boolean };
  overlay: { enabled: boolean; intensity: number; type: OverlayType };
  text: { title: string; subtitle: string; body: string };
  fontSize: { title: number; subtitle: number; body: number };
  textColor: { title: string; subtitle: string; body: string };
  textAlign: { title: TextAlign; subtitle: TextAlign; body: TextAlign };
  fontWeight: { title: number; subtitle: number; body: number };
  textPos: { x: number; y: number };
  signature: { enabled: boolean; handle: string; position: SignaturePos; color: string };
  // Sistema visual minimalista ou criativo (opcional, retornado pela edge function)
  system?: "minimalista" | "criativo";
  slideType?: "M1" | "M2" | "M3" | "M4" | "M5" | "C1" | "C2" | "C3" | "C4" | "C5";
  bgKind?: "off-white" | "bege-texturizado" | "foto" | "branco";
  label?: string;
  tags?: string[];
  decor?: "seta" | "asterisco" | "triangulo" | "seta-circular" | "nenhum";
  highlightWord?: string;
  tickerText?: string;
  graphic?: "circulo" | "seta-curva" | "ticker" | "seta-vertical" | "toggle";
  accentColor?: string;
  imageFrame?: "full" | "top-60" | "half-left" | "half-right" | "centered-square" | "bottom-third" | null;
};

type BriefingDNA = {
  palette: [string, string, string];
  brandFont: string | null;
  brandFontUrl: string | null;
};

const FORMATS: Format[] = [
  { key: "carrossel", label: "Carrossel (4:5)", w: 1080, h: 1350 },
  { key: "quadrado", label: "Quadrado (1:1)", w: 1080, h: 1080 },
  { key: "stories", label: "Stories (9:16)", w: 1080, h: 1920 },
];

const DEFAULT_PALETTE: [string, string, string] = ["#E91E63", "#FFFFFF", "#2D2D2D"];

const TITLE_TO_SUBTITLE = 16;
const SUBTITLE_TO_BODY = 12;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const makeSlide = (template?: Slide, paletteColor?: string): Slide => ({
  id: newId(),
  bgImage: template?.bgImage ?? null,
  bgPos: template ? { ...template.bgPos } : { x: 0.5, y: 0.5 },
  bgZoom: template?.bgZoom ?? 1,
  grid: template ? { ...template.grid } : { enabled: false },
  overlay: template ? { ...template.overlay } : { enabled: false, intensity: 40, type: "dark" },
  text: { title: "", subtitle: "", body: "" },
  fontSize: template
    ? { ...template.fontSize }
    : { title: 72, subtitle: 36, body: 28 },
  textColor: template
    ? { ...template.textColor }
    : { title: "#1A1A1A", subtitle: "#1A1A1A", body: "#333333" },
  textAlign: template
    ? { ...template.textAlign }
    : { title: "center", subtitle: "center", body: "center" },
  fontWeight: template
    ? { ...template.fontWeight }
    : { title: 700, subtitle: 500, body: 400 },
  textPos: template ? { ...template.textPos } : { x: 0.5, y: 0.5 },
  signature: template
    ? { ...template.signature }
    : {
        enabled: false,
        handle: "",
        position: "br",
        color: paletteColor ?? DEFAULT_PALETTE[0],
      },
});

// ---------- Página ----------

function CarrosselEditorPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [dna, setDna] = useState<BriefingDNA>({
    palette: DEFAULT_PALETTE,
    brandFont: null,
    brandFontUrl: null,
  });

  const [format, setFormat] = useState<Format>(FORMATS[0]);

  // Bootstrap state populated from sessionStorage (when user came from AI wizard)
  const bootstrapRef = useRef<{
    slides?: Array<{
      title: string;
      subtitle?: string;
      body: string;
      imagePrompt?: string;
      imageDataUrl: string | null;
      sistema?: "minimalista" | "criativo";
      tipo?: "M1" | "M2" | "M3" | "M4" | "M5" | "C1" | "C2" | "C3" | "C4" | "C5";
      fundo?: "off-white" | "bege-texturizado" | "foto" | "branco";
      imageFrame?: "full" | "top-60" | "half-left" | "half-right" | "centered-square" | "bottom-third" | null;
      label?: string;
      tags?: string[];
      elemento_decorativo?: "seta" | "asterisco" | "triangulo" | "seta-circular" | "nenhum";
      palavra_destaque?: string;
      ticker_texto?: string;
      elemento_grafico?: "circulo" | "seta-curva" | "ticker" | "seta-vertical" | "toggle";
      alignment?: "left" | "center" | "right";
    }>;
    fontPair?: { heading: string; body: string } | null;
    palette?: [string, string, string];
    imageMode?: "none" | "bg" | "grid" | "mixed";
    signature?: { enabled: boolean; handle: string; position: SignaturePos; color: string } | null;
    imageJobs?: { slideIndex: number; imagePrompt: string; imageStyle?: string | null }[];
    archetype?: string | null;
    imageStyle?: string | null;
    fontWeightOverride?: { title: number; subtitle: number; body: number } | null;
  } | null>(null);

  const [slides, setSlides] = useState<Slide[]>([makeSlide()]);
  const [activeId, setActiveId] = useState<string>(() => "");
  const [selectedField, setSelectedField] = useState<TextField | null>(null);
  const [pageFontPair, setPageFontPair] = useState<{ heading: string; body: string } | null>(null);

  const [exporting, setExporting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [plannerPosts, setPlannerPosts] = useState<
    { id: string; title: string; tags: string[]; notes: string | null }[]
  >([]);
  const [imageProgress, setImageProgress] = useState<{
    current: number;
    total: number;
    percent: number;
  } | null>(null);

  // Salvar como template
  const [saveTemplateChecked, setSaveTemplateChecked] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // initial setup
  useEffect(() => {
    if (slides.length > 0 && !activeId) setActiveId(slides[0].id);
  }, [slides, activeId]);

  // Consume bootstrap from AI wizard (sessionStorage) on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("studio:carrossel:bootstrap");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      bootstrapRef.current = data;
      window.sessionStorage.removeItem("studio:carrossel:bootstrap");

      // Auto-pick default format (carrossel 4:5) when arriving from AI flow
      setFormat(FORMATS[0]);

      const aiSlides = Array.isArray(data.slides) ? data.slides : [];
      const sigBase = data.signature ?? null;
      const palette: [string, string, string] | undefined = data.palette;

      const built: Slide[] = aiSlides.map((s: any) => {
        const slide = makeSlide(undefined, palette?.[0]);
        slide.text = {
          title: s.title ?? "",
          subtitle: s.subtitle ?? "",
          body: s.body ?? "",
        };
        // Só aplica bgImage se o princípio pede foto. Princípios com fundo
        // off-white / bege-texturizado / branco não devem receber imagem.
        if (s.imageDataUrl && s.fundo === "foto") slide.bgImage = s.imageDataUrl;
        if (sigBase) slide.signature = { ...sigBase };

        // Alinhamento global escolhido no wizard
        const align = (s.alignment === "left" || s.alignment === "right" || s.alignment === "center")
          ? s.alignment
          : null;
        if (align) {
          slide.textAlign = { title: align, subtitle: align, body: align };
        }

        // Sistema minimalista
        if (s.sistema === "minimalista") {
          slide.system = "minimalista";
          slide.slideType = s.tipo;
          slide.bgKind = s.fundo;
          slide.label = s.label;
          slide.tags = Array.isArray(s.tags) ? s.tags : undefined;
          slide.decor = s.elemento_decorativo;

          // Cores neutras + tipografia para minimalista (M1/M2/M3 sem foto)
          const isPhoto = s.fundo === "foto";
          if (isPhoto) {
            slide.textColor = { title: "#FFFFFF", subtitle: "#F5F5F5", body: "#F5F5F5" };
            slide.overlay = { enabled: true, intensity: 30, type: "dark" };
          } else {
            slide.textColor = { title: "#1A1714", subtitle: "#3D3B40", body: "#3D3B40" };
            slide.overlay = { enabled: false, intensity: 0, type: "dark" };
          }
        } else if (s.sistema === "criativo") {
          slide.system = "criativo";
          slide.slideType = s.tipo;
          slide.bgKind = s.fundo;
          slide.highlightWord = s.palavra_destaque;
          slide.tickerText = s.ticker_texto;
          slide.graphic = s.elemento_grafico;
          slide.accentColor = palette?.[0] ?? DEFAULT_PALETTE[0];

          const accent = slide.accentColor!;
          const isPhoto = s.fundo === "foto";
          if (isPhoto) {
            // C1: sem overlay; C3: overlay leve
            slide.textColor = { title: "#FFFFFF", subtitle: "#FFFFFF", body: "#F5F5F5" };
            slide.overlay = s.tipo === "C1"
              ? { enabled: false, intensity: 0, type: "dark" }
              : { enabled: true, intensity: 25, type: "dark" };
          } else if (s.tipo === "C2") {
            // título na cor de destaque, subtítulo preto
            slide.textColor = { title: accent, subtitle: "#0A0A0A", body: "#1A1A1A" };
            slide.overlay = { enabled: false, intensity: 0, type: "dark" };
          } else if (s.tipo === "C5") {
            // todo texto na cor de destaque
            slide.textColor = { title: accent, subtitle: accent, body: accent };
            slide.overlay = { enabled: false, intensity: 0, type: "dark" };
          } else {
            // C4 e fallbacks: preto sobre off-white
            slide.textColor = { title: "#0A0A0A", subtitle: "#1A1A1A", body: "#1A1A1A" };
            slide.overlay = { enabled: false, intensity: 0, type: "dark" };
          }
          // Pesos mais fortes
          slide.fontWeight = { title: 900, subtitle: 700, body: 400 };
        } else if (s.imageDataUrl) {
          // Comportamento legacy
          slide.textColor = { title: "#FFFFFF", subtitle: "#FFFFFF", body: "#F5F5F5" };
          slide.overlay = { enabled: true, intensity: 40, type: "dark" };
        }
        return slide;
      });
      if (built.length > 0) {
        const withWeight = data.fontWeightOverride
          ? built.map((s) => ({ ...s, fontWeight: { ...data.fontWeightOverride! } }))
          : built;
        setSlides(withWeight);
        setActiveId(withWeight[0].id);
      }

      if (data.fontPair?.heading) {
        loadGoogleFont(data.fontPair.heading);
        loadGoogleFont(data.fontPair.body);
        setPageFontPair(data.fontPair);
      }
    } catch (e) {
      console.warn("bootstrap parse error", e);
    }
  }, []);

  // Consume saved template from sessionStorage (when user came from "Templates salvos" card)
  const templateAppliedRef = useRef(false);
  useEffect(() => {
    if (templateAppliedRef.current) return;
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("studio:carrossel:template");
    if (!raw) return;
    try {
      const tpl = JSON.parse(raw);
      window.sessionStorage.removeItem("studio:carrossel:template");
      templateAppliedRef.current = true;

      setFormat(FORMATS[0]);

      const palette = (tpl.palette ?? []) as string[];
      if (palette.length >= 3) {
        setDna((prev) => ({ ...prev, palette: [palette[0], palette[1], palette[2]] }));
      }
      if (tpl.font_pair?.heading) {
        loadGoogleFont(tpl.font_pair.heading);
        if (tpl.font_pair.body) loadGoogleFont(tpl.font_pair.body);
        setPageFontPair({ heading: tpl.font_pair.heading, body: tpl.font_pair.body ?? tpl.font_pair.heading });
      }

      const baseSlide = makeSlide(undefined, palette[0]);
      const merged: Slide = {
        ...baseSlide,
        fontSize: tpl.layout?.fontSize ?? baseSlide.fontSize,
        textAlign: tpl.layout?.textAlign ?? baseSlide.textAlign,
        fontWeight: tpl.layout?.fontWeight ?? baseSlide.fontWeight,
        textPos: tpl.layout?.textPos ?? baseSlide.textPos,
        overlay: tpl.overlay ?? baseSlide.overlay,
        signature: tpl.signature
          ? { ...baseSlide.signature, ...tpl.signature }
          : baseSlide.signature,
      };
      setSlides([merged]);
      setActiveId(merged.id);

      toast.success(`Template "${tpl.name}" aplicado.`);
    } catch (e) {
      console.warn("template parse error", e);
    }
  }, []);

  // Background image generation loop — consumes imageJobs from bootstrap
  const imageGenStartedRef = useRef(false);
  useEffect(() => {
    if (imageGenStartedRef.current) return;
    const jobs = bootstrapRef.current?.imageJobs;
    if (!jobs || jobs.length === 0) return;
    if (slides.length === 0) return;
    imageGenStartedRef.current = true;

    const palette = bootstrapRef.current?.palette ?? dna.palette;
    const archetype = bootstrapRef.current?.archetype ?? null;
    const total = jobs.length;

    (async () => {
      let okCount = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setImageProgress({
          current: i + 1,
          total,
          percent: Math.round(((i) / total) * 100),
        });
        try {
          const { data, error } = await supabase.functions.invoke("carrossel-image", {
            body: { prompt: job.imagePrompt, palette, archetype, imageStyle: job.imageStyle ?? null },
          });
          if (error) throw error;
          const url: string | undefined = data?.imageDataUrl;
          if (url) {
            okCount += 1;
            setSlides((prev) => {
              if (job.slideIndex < 0 || job.slideIndex >= prev.length) return prev;
              return prev.map((s, idx) => {
                if (idx !== job.slideIndex) return s;
                // Defesa: só aplica foto se o slide foi marcado como bgKind "foto".
                if (s.bgKind && s.bgKind !== "foto") return s;
                return {
                  ...s,
                  bgImage: url,
                  textColor: { title: "#FFFFFF", subtitle: "#FFFFFF", body: "#F5F5F5" },
                  overlay: { ...s.overlay, enabled: true, intensity: 40, type: "dark" },
                };
              });
            });
          } else {
            console.warn("carrossel-image returned no image", job, data);
          }
          setImageProgress({
            current: i + 1,
            total,
            percent: Math.round(((i + 1) / total) * 100),
          });
        } catch (err) {
          console.error("carrossel-image job failed", job, err);
        }
      }
      setImageProgress(null);
      if (okCount === total && total > 0) {
        toast.success("Imagens geradas 🎨");
      } else if (okCount > 0) {
        toast.success(`Imagens geradas: ${okCount}/${total}. Algumas falharam — você pode regenerar pelo editor.`);
      } else if (total > 0) {
        toast.error("Não foi possível gerar as imagens agora. Tente regenerar pelo editor.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.session.user.id);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY)
        : null;
    if (!saved) {
      // Não redireciona: o guard no /studio já previne o caso comum.
      // Se o usuário abrir a URL direto sem cliente, o editor segue
      // funcionando em modo "sem DNA" (paleta/fonte padrão).
      return;
    }
    setClientId(saved);

    Promise.all([
      supabase.from("clients").select("name").eq("id", saved).maybeSingle(),
      supabase
        .from("client_briefings")
        .select("palette, brand_font, brand_font_url")
        .eq("client_id", saved)
        .maybeSingle(),
      supabase
        .from("content_posts")
        .select("id, title, tags, notes")
        .eq("user_id", userId)
        .eq("client_id", saved)
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([c, b, p]) => {
      setClientName(c.data?.name ?? "");
      const palette = (b.data?.palette ?? []) as string[];
      const bootstrapPalette = bootstrapRef.current?.palette;
      const next: BriefingDNA = {
        palette: bootstrapPalette ?? [
          palette[0] ?? DEFAULT_PALETTE[0],
          palette[1] ?? DEFAULT_PALETTE[1],
          palette[2] ?? DEFAULT_PALETTE[2],
        ],
        brandFont: (b.data?.brand_font as string | null) ?? null,
        brandFontUrl: (b.data?.brand_font_url as string | null) ?? null,
      };
      setDna(next);
      ensureBrandFont(next.brandFont, next.brandFontUrl);
      const rows = ((p.data ?? []) as {
        id: string;
        title: string | null;
        tags: string[] | null;
        notes: string | null;
      }[])
        .filter((r) => !!r.title && r.title.trim().length > 0)
        .map((r) => ({ id: r.id, title: r.title!, tags: r.tags ?? [], notes: r.notes }));
      setPlannerPosts(rows);
    });
  }, [userId, navigate]);

  const activeSlide = useMemo(
    () => slides.find((s) => s.id === activeId) ?? slides[0],
    [slides, activeId],
  );

  // -------- Mutações --------

  const updateActive = (mutator: (s: Slide) => Slide) => {
    setSlides((prev) => prev.map((s) => (s.id === activeId ? mutator(s) : s)));
  };

  const applyToAll = (mutator: (s: Slide, source: Slide) => Slide) => {
    const source = slides.find((s) => s.id === activeId);
    if (!source) return;
    setSlides((prev) => prev.map((s) => mutator(s, source)));
  };

  const addSlide = () => {
    const tpl = slides.find((s) => s.id === activeId);
    const ns = makeSlide(tpl, dna.palette[0]);
    setSlides((prev) => [...prev, ns]);
    setActiveId(ns.id);
  };


  const removeSlide = (id: string) => {
    if (slides.length === 1) {
      toast.info("Você precisa de pelo menos 1 slide.");
      return;
    }
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const setBgImage = async (file: File, applyAll: boolean) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (applyAll) {
        setSlides((prev) => prev.map((s) => ({ ...s, bgImage: url })));
      } else {
        updateActive((s) => ({ ...s, bgImage: url }));
      }
    };
    reader.readAsDataURL(file);
  };

  // -------- Export ZIP --------

  const exportRef = useRef<HTMLDivElement | null>(null);

  const exportZip = async () => {
    if (!format) return;
    setExporting(true);
    const zip = new JSZip();
    try {
      for (let i = 0; i < slides.length; i++) {
        const node = document.getElementById(`slide-export-${slides[i].id}`);
        if (!node) continue;
        // Garantir que fontes estejam carregadas
        if ("fonts" in document) {
          await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready;
        }
        const canvas = await html2canvas(node, {
          useCORS: true,
          backgroundColor: null,
          width: format.w,
          height: format.h,
          windowWidth: format.w,
          windowHeight: format.h,
          scale: 1,
        });
        const blob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falhou"))), "image/png"),
        );
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      saveAs(out, `carrossel-${Date.now()}.zip`);
      markPlannerHasDraft();
      toast.success(
        "Download iniciado! 🎉 Não esquece de pegar a legenda do seu post no Planner de conteúdo 📝",
        { duration: 8000 },
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar ZIP.");
    } finally {
      setExporting(false);
    }
  };

  const saveDraft = async () => {
    if (!userId || !clientId) return;
    setSavingDraft(true);
    try {
      // garantir uma semana
      const { data: weeks } = await supabase
        .from("content_weeks")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      let weekId = weeks?.[0]?.id;
      if (!weekId) {
        const { data: created } = await supabase
          .from("content_weeks")
          .insert({ user_id: userId, name: "Backlog", position: 0 })
          .select("id")
          .single();
        weekId = created?.id;
      }
      if (!weekId) throw new Error("Sem semana");

      const firstTitle = slides.find((s) => s.text.title)?.text.title || "Rascunho de carrossel";
      const payload = JSON.stringify({ format, slides });
      const { error } = await supabase.from("content_posts").insert({
        user_id: userId,
        week_id: weekId,
        title: `Rascunho de carrossel — ${clientName || firstTitle}`,
        notes: payload,
        status: "backlog",
        tags: ["carrossel", "rascunho"],
        position: 0,
      });
      if (error) throw error;
      markPlannerHasDraft();
      toast.success("Rascunho salvo no Planner.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar rascunho.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!userId || !clientId) {
      toast.error("Selecione um cliente para salvar templates.");
      return;
    }
    const name = templateName.trim();
    if (!name) {
      toast.error("Dê um nome ao template.");
      return;
    }
    if (!activeSlide) return;
    setSavingTemplate(true);
    try {
      const payload = {
        user_id: userId,
        client_id: clientId,
        name,
        font_pair: pageFontPair ?? null,
        palette: dna.palette as unknown as string[],
        layout: {
          fontSize: activeSlide.fontSize,
          textAlign: activeSlide.textAlign,
          fontWeight: activeSlide.fontWeight,
          textPos: activeSlide.textPos,
        },
        overlay: activeSlide.overlay,
        signature: {
          position: activeSlide.signature.position,
          color: activeSlide.signature.color,
        },
        image_style: bootstrapRef.current?.imageStyle ?? null,
      };
      const { error } = await supabase.from("carousel_templates" as any).insert(payload);
      if (error) throw error;
      toast.success("Template salvo!");
      setSaveTemplateChecked(false);
      setTemplateName("");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  // -------- Render --------

  if (!userId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-muted/30 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/dashboard/studio" })}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold">Editor de carrossel</h1>
          <p className="text-xs text-muted-foreground">
            {clientName ? `${clientName} · ` : ""}
            {format ? `${format.w}×${format.h}` : ""}
          </p>
        </div>

        {/* Salvar como template */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium">
            <Checkbox
              checked={saveTemplateChecked}
              onCheckedChange={(v) => {
                const on = v === true;
                setSaveTemplateChecked(on);
                if (!on) setTemplateName("");
              }}
              disabled={!clientId}
            />
            Salvar como template
          </label>
          {saveTemplateChecked && (
            <>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Carrossel institucional pilates"
                className="h-8 w-56 text-xs"
              />
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="gap-1.5"
              >
                {savingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar template
              </Button>
            </>
          )}
        </div>
      </header>

      {format && activeSlide && (
        <>
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Painel esquerdo */}
            <aside className="w-full shrink-0 border-b bg-card lg:w-[300px] lg:border-b-0 lg:border-r">
              <div className="max-h-[60vh] overflow-y-auto p-4 lg:max-h-[calc(100vh-12rem)]">
                <EditorPanel
                  slide={activeSlide}
                  dna={dna}
                  selectedField={selectedField}
                  setSelectedField={setSelectedField}
                  onUpdateActive={updateActive}
                  onApplyToAll={applyToAll}
                  onPickImage={setBgImage}
                  plannerTitles={plannerPosts.map((p) => p.title)}
                  plannerPosts={plannerPosts}
                  onApplyPlannerPost={(post) => {
                    updateActive((s) => ({
                      ...s,
                      text: { title: post.title, subtitle: "", body: post.notes ?? "" },
                    }));
                    toast.success("Slide atualizado com conteúdo do Planner.");
                  }}
                />
              </div>
              <div className="space-y-2 border-t p-3">
                <Button
                  className="w-full gap-2"
                  onClick={exportZip}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Baixar todos
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={saveDraft}
                  disabled={savingDraft}
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar rascunho
                </Button>
              </div>
            </aside>

            {/* Área central — slides lado a lado horizontalmente */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {imageProgress && (
                <div className="border-b bg-card px-6 py-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Gerando imagens em segundo plano…</span>
                    <span>
                      {imageProgress.current}/{imageProgress.total}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${imageProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full min-w-max items-center gap-6 px-8 py-6">
                  {slides.map((s, i) => (
                    <SlideCard
                      key={s.id}
                      slide={s}
                      index={i}
                      format={format}
                      dna={dna}
                      active={s.id === activeId}
                      onSelect={() => setActiveId(s.id)}
                      onRemove={() => removeSlide(s.id)}
                      onSelectField={s.id === activeId ? setSelectedField : undefined}
                      onEditField={
                        s.id === activeId
                          ? (field, value) =>
                              updateActive((sl) => ({
                                ...sl,
                                text: { ...sl.text, [field]: value },
                              }))
                          : undefined
                      }
                    />
                  ))}
                  <AddSlideCard format={format} onAdd={addSlide} />
                </div>
              </div>
            </main>
          </div>

          {/* Nodes ocultos para export em tamanho real */}
          <div
            ref={exportRef}
            aria-hidden
            style={{
              position: "fixed",
              left: -99999,
              top: 0,
              pointerEvents: "none",
            }}
          >
            {slides.map((s) => (
              <div
                key={s.id}
                id={`slide-export-${s.id}`}
                style={{ width: format.w, height: format.h }}
              >
                <SlideContent slide={s} format={format} dna={dna} />
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

// ---------- Subcomponentes ----------

type PlannerPost = { id: string; title: string; tags: string[]; notes: string | null };

function EditorPanel({
  slide,
  dna,
  selectedField,
  setSelectedField,
  onUpdateActive,
  onApplyToAll,
  onPickImage,
  plannerTitles,
  plannerPosts,
  onApplyPlannerPost,
}: {
  slide: Slide;
  dna: BriefingDNA;
  selectedField: TextField | null;
  setSelectedField: (f: TextField | null) => void;
  onUpdateActive: (m: (s: Slide) => Slide) => void;
  onApplyToAll: (m: (s: Slide, source: Slide) => Slide) => void;
  onPickImage: (f: File, applyAll: boolean) => void;
  plannerTitles: string[];
  plannerPosts: PlannerPost[];
  onApplyPlannerPost: (post: PlannerPost) => void;
}) {
  const [applyImageAll, setApplyImageAll] = useState(false);
  const [applySigAll, setApplySigAll] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);


  return (
    <div className="space-y-6">
      {/* PLANNER DE CONTEÚDO */}
      <div>
        <button
          type="button"
          onClick={() => setPlannerOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border bg-background px-2.5 py-2 text-left transition hover:border-primary/40"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            {plannerOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <FileText className="h-3.5 w-3.5 text-primary" />
            Planner de conteúdo
          </span>
          <span className="text-[10px] text-muted-foreground">
            {plannerPosts.length} {plannerPosts.length === 1 ? "post" : "posts"}
          </span>
        </button>
        {plannerOpen && (
          <div className="mt-2 max-h-[240px] overflow-y-auto rounded-md border bg-muted/20 p-1.5">
            {plannerPosts.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                Nenhum post no Planner para este cliente.
              </p>
            ) : (
              <ul className="space-y-1">
                {plannerPosts.map((post) => {
                  const tagsLower = post.tags.map((t) => t.toLowerCase());
                  const type = tagsLower.includes("carrossel")
                    ? "carrossel"
                    : tagsLower.includes("reels")
                      ? "reels"
                      : "post";
                  const firstNoteLine = post.notes?.split("\n").find((l) => l.trim()) ?? "";
                  return (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => onApplyPlannerPost(post)}
                        className="group w-full rounded-md border border-transparent bg-background p-2 text-left transition hover:border-primary/40 hover:bg-accent"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-[11px] font-medium leading-snug">
                            {post.title}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              type === "carrossel" && "bg-primary/15 text-primary",
                              type === "reels" && "bg-purple-500/15 text-purple-600",
                              type === "post" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {type}
                          </span>
                        </div>
                        {firstNoteLine && (
                          <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
                            {firstNoteLine}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* CONTAGEM DE CARACTERES */}
      {(() => {
        const t = slide.text.title ?? "";
        const s = slide.text.subtitle ?? "";
        const b = slide.text.body ?? "";
        const hasTitle = t.trim().length > 0;
        const used = (hasTitle ? t.length : 0) + s.length + b.length;
        const limit = hasTitle ? 422 : 369;
        const over = used > limit;
        return (
          <Section title="Caracteres do slide">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {hasTitle ? "Com título" : "Sem título"}
              </span>
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  over ? "text-destructive" : "text-foreground",
                )}
              >
                {used} / {limit}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  over ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Padrão: 369 sem título · 422 com título (espaços e quebras contam).
            </p>
          </Section>
        );
      })()}

      {/* IMAGEM */}
      <Section title="Imagem de fundo">
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-background py-3 text-xs font-medium hover:bg-accent">
          <ImageIcon className="h-4 w-4" />
          Anexar imagem
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickImage(f, applyImageAll);
              e.target.value = "";
            }}
          />
        </label>
        {slide.bgImage && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={slide.bgImage}
              alt="bg"
              className="h-14 w-14 rounded object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateActive((s) => ({ ...s, bgImage: null }))}
              className="gap-1 text-xs"
            >
              <Trash2 className="h-3 w-3" /> Remover
            </Button>
          </div>
        )}
        {slide.bgImage && (
          <div className="mt-3 space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Zoom ({slide.bgZoom.toFixed(2)}x)
              </Label>
              <Slider
                className="mt-1"
                value={[slide.bgZoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(v) =>
                  onUpdateActive((s) => ({ ...s, bgZoom: v[0] }))
                }
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Posição X ({Math.round(slide.bgPos.x * 100)}%)
              </Label>
              <Slider
                className="mt-1"
                value={[slide.bgPos.x * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) =>
                  onUpdateActive((s) => ({ ...s, bgPos: { ...s.bgPos, x: v[0] / 100 } }))
                }
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Posição Y ({Math.round(slide.bgPos.y * 100)}%)
              </Label>
              <Slider
                className="mt-1"
                value={[slide.bgPos.y * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) =>
                  onUpdateActive((s) => ({ ...s, bgPos: { ...s.bgPos, y: v[0] / 100 } }))
                }
              />
            </div>
          </div>
        )}
        <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Checkbox
            checked={applyImageAll}
            onCheckedChange={(v) => setApplyImageAll(!!v)}
          />
          Aplicar também em todos os slides
        </label>
      </Section>

      {/* GRADE DE IMAGEM */}
      <Section title="Grade de imagem">
        <div className="flex items-center justify-between">
          <span className="text-xs flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Mostrar grade 3x3
          </span>
          <Switch
            checked={slide.grid.enabled}
            onCheckedChange={(v) =>
              onUpdateActive((s) => ({ ...s, grid: { enabled: v } }))
            }
          />
        </div>
      </Section>

      {/* OVERLAY */}
      <Section title="Sombra / overlay">
        <div className="flex items-center justify-between">
          <span className="text-xs">Ativar overlay</span>
          <Switch
            checked={slide.overlay.enabled}
            onCheckedChange={(v) =>
              onUpdateActive((s) => ({
                ...s,
                overlay: { ...s.overlay, enabled: v },
              }))
            }
          />
        </div>
        {slide.overlay.enabled && (
          <>
            <div className="mt-3">
              <Label className="text-[11px] text-muted-foreground">
                Intensidade ({slide.overlay.intensity}%)
              </Label>
              <Slider
                className="mt-1"
                value={[slide.overlay.intensity]}
                onValueChange={(v) =>
                  onUpdateActive((s) => ({
                    ...s,
                    overlay: { ...s.overlay, intensity: v[0] },
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
            <RadioGroup
              className="mt-3 grid grid-cols-3 gap-2"
              value={slide.overlay.type}
              onValueChange={(v) =>
                onUpdateActive((s) => ({
                  ...s,
                  overlay: { ...s.overlay, type: v as OverlayType },
                }))
              }
            >
              {(["dark", "light", "gradient"] as OverlayType[]).map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-1 rounded-md border bg-background py-1.5 text-[11px] capitalize",
                    slide.overlay.type === t && "border-primary text-primary",
                  )}
                >
                  <RadioGroupItem value={t} className="sr-only" />
                  {t === "dark" ? "Escuro" : t === "light" ? "Claro" : "Gradiente"}
                </label>
              ))}
            </RadioGroup>
          </>
        )}
      </Section>

      {/* CORES */}
      <Section title="Cores">
        <p className="text-[11px] text-muted-foreground">
          {selectedField
            ? `Aplicar em: ${
                selectedField === "title"
                  ? "Título"
                  : selectedField === "subtitle"
                  ? "Subtítulo"
                  : "Corpo"
              }`
            : "Selecione um campo de texto para aplicar a cor."}
        </p>
        <div className="mt-2 flex gap-2">
          {dna.palette.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={!selectedField}
              onClick={() => {
                if (!selectedField) return;
                onUpdateActive((s) => ({
                  ...s,
                  textColor: { ...s.textColor, [selectedField]: c },
                }));
              }}
              className={cn(
                "h-9 w-9 rounded-full border-2 shadow-inner transition disabled:cursor-not-allowed disabled:opacity-50",
                "border-border hover:scale-105",
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </Section>

      {/* ASSINATURA */}
      <Section title="Assinatura">
        <div className="flex items-center justify-between">
          <span className="text-xs">Ativar assinatura</span>
          <Switch
            checked={slide.signature.enabled}
            onCheckedChange={(v) =>
              onUpdateActive((s) => ({
                ...s,
                signature: { ...s.signature, enabled: v },
              }))
            }
          />
        </div>
        {slide.signature.enabled && (
          <>
            <div className="mt-3">
              <Label className="text-[11px] text-muted-foreground">@ da marca</Label>
              <Input
                value={slide.signature.handle}
                onChange={(e) =>
                  onUpdateActive((s) => ({
                    ...s,
                    signature: { ...s.signature, handle: e.target.value },
                  }))
                }
                placeholder="@suamarca"
                className="mt-1 text-sm"
              />
            </div>
            <div className="mt-3">
              <Label className="text-[11px] text-muted-foreground">Posição</Label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {([
                  ["tl", "Sup. esquerdo"],
                  ["tr", "Sup. direito"],
                  ["bl", "Inf. esquerdo"],
                  ["br", "Inf. direito"],
                ] as [SignaturePos, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      onUpdateActive((s) => ({
                        ...s,
                        signature: { ...s.signature, position: k },
                      }))
                    }
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[11px]",
                      slide.signature.position === k
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-[11px] text-muted-foreground">Cor</Label>
              <div className="mt-1 flex gap-2">
                {dna.palette.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      onUpdateActive((s) => ({
                        ...s,
                        signature: { ...s.signature, color: c },
                      }))
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition hover:scale-105",
                      slide.signature.color === c ? "border-foreground" : "border-border",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox
                checked={applySigAll}
                onCheckedChange={(v) => {
                  const checked = !!v;
                  setApplySigAll(checked);
                  if (checked) {
                    onApplyToAll((s, src) => ({ ...s, signature: { ...src.signature } }));
                  }
                }}
              />
              Aplicar em todos os slides
            </label>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ScaledPreview({
  slide,
  format,
  dna,
  editable,
  onEditField,
  onSelectField,
}: {
  slide: Slide;
  format: Format;
  dna: BriefingDNA;
  editable?: boolean;
  onEditField?: (field: TextField, value: string) => void;
  onSelectField?: (f: TextField) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth - 48;
      const ph = parent.clientHeight - 48;
      if (pw <= 0 || ph <= 0) return;
      const s = Math.min(pw / format.w, ph / format.h);
      setScale(Math.max(0.05, s));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (ref.current?.parentElement) ro.observe(ref.current.parentElement);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [format]);

  return (
    <div
      ref={ref}
      style={{
        width: format.w * scale,
        height: format.h * scale,
        position: "relative",
      }}
      className="rounded-2xl shadow-lg ring-1 ring-border overflow-hidden bg-white"
    >
      <div
        style={{
          width: format.w,
          height: format.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <SlideContent
          slide={slide}
          format={format}
          dna={dna}
          scale={scale}
          editable={editable}
          onEditField={onEditField}
          onSelectField={onSelectField}
        />
      </div>
    </div>
  );
}

function SlideContent({
  slide,
  format,
  dna,
  editable,
  onEditField,
  onSelectField,
}: {
  slide: Slide;
  format: Format;
  dna: BriefingDNA;
  scale?: number;
  editable?: boolean;
  onEditField?: (field: TextField, value: string) => void;
  onSelectField?: (f: TextField) => void;
}) {
  const overlayBg = (() => {
    if (!slide.overlay.enabled) return "transparent";
    const a = slide.overlay.intensity / 100;
    if (slide.overlay.type === "dark") return `rgba(0,0,0,${a})`;
    if (slide.overlay.type === "light") return `rgba(255,255,255,${a})`;
    return `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,${a}) 100%)`;
  })();

  const family = brandFontFamily(dna.brandFont);

  // alinhamento do bloco como um todo derivado do alinhamento do título
  const blockAlignItems =
    slide.textAlign.title === "left"
      ? "flex-start"
      : slide.textAlign.title === "right"
      ? "flex-end"
      : "center";

  const editableHandlers = (field: TextField) =>
    editable
      ? {
          contentEditable: true,
          suppressContentEditableWarning: true,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectField?.(field);
          },
          onBlur: (e: React.FocusEvent<HTMLElement>) => {
            onEditField?.(field, e.currentTarget.innerText);
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).blur();
            }
          },
        }
      : {};

  const editableStyle: React.CSSProperties = editable
    ? { outline: "none", cursor: "text" }
    : {};

  const sigPadding = format.w * 0.05;
  const sigStyle: React.CSSProperties = {
    position: "absolute",
    fontSize: format.w * 0.025,
    fontWeight: 600,
    color: slide.signature.color,
    fontFamily: family,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  };
  if (slide.signature.position === "tl") {
    sigStyle.top = sigPadding;
    sigStyle.left = sigPadding;
  } else if (slide.signature.position === "tr") {
    sigStyle.top = sigPadding;
    sigStyle.right = sigPadding;
  } else if (slide.signature.position === "bl") {
    sigStyle.bottom = sigPadding;
    sigStyle.left = sigPadding;
  } else {
    sigStyle.bottom = sigPadding;
    sigStyle.right = sigPadding;
  }

  // dot grid pattern só quando não há imagem
  const isMinimal = slide.system === "minimalista";
  const isCreative = slide.system === "criativo";
  const accent = slide.accentColor ?? dna.palette[0];
  const dotBg: React.CSSProperties = isMinimal
    ? (() => {
        if (slide.bgKind === "foto") return { backgroundColor: "#F5F0E8" };
        if (slide.bgKind === "bege-texturizado") {
          return {
            backgroundColor: "#EDE5D6",
            backgroundImage:
              "radial-gradient(rgba(60,40,20,0.05) 1px, transparent 1px), radial-gradient(rgba(60,40,20,0.04) 1px, transparent 1px)",
            backgroundSize: "6px 6px, 14px 14px",
            backgroundPosition: "0 0, 3px 3px",
          };
        }
        return { backgroundColor: "#F5F0E8" };
      })()
    : isCreative
    ? (() => {
        if (slide.bgKind === "foto") return { backgroundColor: "#0A0A0A" };
        if (slide.bgKind === "branco") return { backgroundColor: "#FFFFFF" };
        // off-white texturizado leve
        return {
          backgroundColor: "#F5F0E8",
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "10px 10px",
        };
      })()
    : !slide.bgImage
    ? {
        backgroundColor: "#ffffff",
        backgroundImage:
          "radial-gradient(circle, rgba(0,0,0,0.18) 1.5px, transparent 1.5px)",
        backgroundSize: "32px 32px",
      }
    : { backgroundColor: "#ffffff" };

  // Renderiza texto com marcação *palavra* como itálico
  const renderItalicized = (txt: string): React.ReactNode => {
    if (!txt) return txt;
    const parts = txt.split(/(\*[^*]+\*)/g);
    return parts.map((p, i) =>
      p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
        <em key={i} style={{ fontStyle: "italic", fontWeight: 400 }}>
          {p.slice(1, -1)}
        </em>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  const decorChar =
    slide.decor === "seta" ? "→" :
    slide.decor === "asterisco" ? "*" :
    slide.decor === "triangulo" ? "▲" :
    slide.decor === "seta-circular" ? "⊙" : "";
  const minimalPad = format.w * 0.045; // ~48px @1080w

  // Render do título no sistema CRIATIVO com palavra-destaque (círculo SVG / underline / bold extra)
  const renderCreativeTitle = (txt: string): React.ReactNode => {
    if (!txt) return txt;
    const word = (slide.highlightWord ?? "").trim();
    const upper = slide.slideType === "C5" ? txt.toUpperCase() : txt;
    if (!word) return upper;
    const wordRe = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
    const parts = upper.split(wordRe);
    return parts.map((p, i) => {
      if (!wordRe.test(p)) return <span key={i}>{p}</span>;
      if (slide.slideType === "C2") {
        return (
          <span
            key={i}
            style={{
              color: accent,
              borderBottom: `${format.w * 0.012}px solid ${accent}`,
              paddingBottom: format.w * 0.005,
            }}
          >
            {p}
          </span>
        );
      }
      if (slide.slideType === "C4") {
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", padding: `0 ${format.w * 0.015}px` }}>
            <svg
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              <ellipse
                cx="50" cy="30" rx="46" ry="24"
                fill="none" stroke={accent} strokeWidth="2.2"
                transform="rotate(-3 50 30)"
              />
            </svg>
            <span style={{ fontStyle: "italic", position: "relative" }}>{p}</span>
          </span>
        );
      }
      if (slide.slideType === "C5") {
        return <span key={i} style={{ fontWeight: 900, color: accent }}>{p}</span>;
      }
      return <span key={i}>{p}</span>;
    });
  };

  return (
    <div
      style={{
        width: format.w,
        height: format.h,
        position: "relative",
        overflow: "hidden",
        fontFamily: family,
        ...dotBg,
      }}
    >
      {slide.bgImage && (
        <img
          src={slide.bgImage}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${slide.bgPos.x * 100}% ${slide.bgPos.y * 100}%`,
            transform: `scale(${slide.bgZoom})`,
            transformOrigin: `${slide.bgPos.x * 100}% ${slide.bgPos.y * 100}%`,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: overlayBg }} />
      {slide.grid.enabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: `${100 / 3}% ${100 / 3}%`,
          }}
        />
      )}

      {/* === Sistema visual minimalista: label, tags e decor === */}
      {isMinimal && slide.label && (
        <div
          style={{
            position: "absolute",
            top: minimalPad,
            left: slide.slideType === "M3" || slide.slideType === "M4" ? 0 : minimalPad,
            right: slide.slideType === "M3" || slide.slideType === "M4" ? 0 : "auto",
            textAlign: slide.slideType === "M3" || slide.slideType === "M4" ? "center" : "left",
            fontSize: format.w * 0.018,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: slide.bgImage ? "#FFFFFF" : "#3D3B40",
            fontStyle: slide.slideType === "M3" ? "italic" : "normal",
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          {slide.label}
        </div>
      )}
      {isMinimal && slide.slideType === "M4" && Array.isArray(slide.tags) && slide.tags.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: minimalPad,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: `0 ${minimalPad}px`,
            pointerEvents: "none",
          }}
        >
          {slide.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.65)",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: `6px ${format.w * 0.018}px`,
                fontSize: format.w * 0.016,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {isMinimal && decorChar && (
        <div
          style={{
            position: "absolute",
            bottom: minimalPad,
            left: minimalPad,
            fontSize: format.w * 0.04,
            color: slide.bgImage ? "#FFFFFF" : "#3D3B40",
            opacity: 0.8,
            pointerEvents: "none",
          }}
        >
          {decorChar}
        </div>
      )}

      {/* === Sistema visual CRIATIVO: ticker, setas, toggle, marca duplicada === */}
      {isCreative && slide.slideType === "C3" && slide.tickerText && (
        <div
          style={{
            position: "absolute",
            top: `${66}%`,
            left: 0,
            right: 0,
            height: format.w * 0.08,
            background: accent,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: format.w * 0.035,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ paddingInline: format.w * 0.02 }}>
              {slide.tickerText} •
            </span>
          ))}
        </div>
      )}
      {isCreative && slide.slideType === "C4" && slide.graphic === "seta-curva" && (
        <svg
          viewBox="0 0 200 120"
          style={{
            position: "absolute",
            right: minimalPad,
            top: format.h * 0.55,
            width: format.w * 0.18,
            height: format.w * 0.12,
            pointerEvents: "none",
          }}
        >
          <path
            d="M10,20 C60,10 140,30 170,80"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <polyline
            points="160,70 175,82 162,92"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {isCreative && slide.slideType === "C4" && (
        <div
          style={{
            position: "absolute",
            bottom: minimalPad,
            right: minimalPad,
            color: accent,
            fontSize: format.w * 0.035,
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          ⊙→
        </div>
      )}
      {isCreative && slide.slideType === "C5" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: accent,
            fontSize: format.w * 0.08,
            fontWeight: 900,
            pointerEvents: "none",
            opacity: 0.9,
          }}
        >
          ↓
        </div>
      )}
      {isCreative && slide.slideType === "C5" && (
        <div
          style={{
            position: "absolute",
            bottom: minimalPad,
            right: minimalPad,
            color: accent,
            fontSize: format.w * 0.04,
            fontWeight: 900,
            pointerEvents: "none",
          }}
        >
          →
        </div>
      )}
      {isCreative && slide.slideType === "C1" && slide.signature.handle && (
        <div
          style={{
            position: "absolute",
            top: minimalPad,
            right: minimalPad,
            color: "#FFFFFF",
            fontSize: format.w * 0.022,
            fontWeight: 800,
            letterSpacing: 1,
            pointerEvents: "none",
          }}
        >
          {slide.signature.handle}
        </div>
      )}
      {(() => {
        // === LAYOUT-MÃE PADRONIZADO ===
        // Bloco de texto encostado nas laterais (~7% padding) e ancorado no
        // bloco inferior do slide, igual à referência. Vale para todos os
        // DNAs e tipos. Alinhamento muda apenas text-align/align-items.
        const sidePad = format.w * 0.07;
        const bottomPad = format.w * 0.13;
        // Por padrão, ancoramos pelo BOTTOM (referência). Se o usuário moveu
        // textPos para a metade superior, voltamos ao modo "âncora central".
        const anchorBottom = (slide.textPos?.y ?? 0.5) >= 0.45;
        const gapTitleSub = format.w * 0.025;
        const gapSubBody = format.w * 0.035;
        const gapPara = format.w * 0.022;

        const renderBody = (txt: string) => {
          const transformed =
            isCreative && slide.slideType === "C5" && !editable
              ? txt.toUpperCase()
              : txt;
          const paragraphs = transformed.split(/\n{2,}/);
          return paragraphs.map((para, i) => (
            <span
              key={i}
              style={{
                display: "block",
                marginTop: i === 0 ? 0 : gapPara,
                whiteSpace: "pre-wrap",
              }}
            >
              {isMinimal && !editable ? renderItalicized(para) : para}
            </span>
          ));
        };

        const containerStyle: React.CSSProperties = anchorBottom
          ? {
              position: "absolute",
              left: sidePad,
              right: sidePad,
              bottom: bottomPad,
              display: "flex",
              flexDirection: "column",
              alignItems: blockAlignItems,
              userSelect: editable ? "text" : "none",
            }
          : {
              position: "absolute",
              left: sidePad,
              right: sidePad,
              top: `${(slide.textPos?.y ?? 0.5) * 100}%`,
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: blockAlignItems,
              userSelect: editable ? "text" : "none",
            };

        return (
          <div style={containerStyle}>
            {(editable || slide.text.title) && (
              <h1
                {...editableHandlers("title")}
                style={{
                  fontSize: slide.fontSize.title,
                  color: slide.textColor.title,
                  fontWeight: slide.fontWeight.title,
                  lineHeight: 1.05,
                  margin: 0,
                  textAlign: slide.textAlign.title,
                  width: "100%",
                  ...editableStyle,
                }}
              >
                {isMinimal && !editable
                  ? renderItalicized(slide.text.title)
                  : isCreative && !editable
                  ? renderCreativeTitle(slide.text.title)
                  : slide.text.title}
              </h1>
            )}
            {(editable || slide.text.subtitle) && (
              <h2
                {...editableHandlers("subtitle")}
                style={{
                  fontSize: slide.fontSize.subtitle,
                  color: slide.textColor.subtitle,
                  fontWeight: slide.fontWeight.subtitle,
                  lineHeight: 1.2,
                  margin: 0,
                  marginTop: slide.text.title || editable ? gapTitleSub : 0,
                  textAlign: slide.textAlign.subtitle,
                  width: "100%",
                  ...editableStyle,
                }}
              >
                {slide.text.subtitle}
              </h2>
            )}
            {(editable || slide.text.body) && (
              <p
                {...editableHandlers("body")}
                style={{
                  fontSize: slide.fontSize.body,
                  color: slide.textColor.body,
                  fontWeight: slide.fontWeight.body,
                  lineHeight: 1.45,
                  margin: 0,
                  marginTop:
                    slide.text.subtitle || editable
                      ? gapSubBody
                      : slide.text.title
                      ? gapTitleSub
                      : 0,
                  textAlign: slide.textAlign.body,
                  width: "100%",
                  ...editableStyle,
                }}
              >
                {renderBody(slide.text.body)}
              </p>
            )}
          </div>
        );
      })()}

      {slide.signature.enabled && slide.signature.handle && (
        <div style={sigStyle}>{slide.signature.handle}</div>
      )}
    </div>
  );
}

// ---------- Barra de slides ----------

function SlidesBar({
  slides,
  format,
  dna,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onReorder,
}: {
  slides: Slide[];
  format: Format;
  dna: BriefingDNA;
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <SlideThumb
              key={s.id}
              slide={s}
              index={i}
              format={format}
              dna={dna}
              active={s.id === activeId}
              onSelect={() => onSelect(s.id)}
              onRemove={() => onRemove(s.id)}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[88px] w-[70px] shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Slide</span>
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SlideThumb({
  slide,
  index,
  format,
  dna,
  active,
  onSelect,
  onRemove,
}: {
  slide: Slide;
  index: number;
  format: Format;
  dna: BriefingDNA;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const ar = format.w / format.h;
  const thumbH = 88;
  const thumbW = thumbH * ar;
  const scale = thumbW / format.w;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={cn(
        "group relative shrink-0 rounded-md border-2 bg-card",
        active ? "border-primary" : "border-transparent",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        {...attributes}
        {...listeners}
        className="block overflow-hidden rounded-[4px]"
        style={{ width: thumbW, height: thumbH }}
      >
        <div
          style={{
            width: format.w,
            height: format.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          <SlideContent slide={slide} format={format} dna={dna} />
        </div>
      </button>
      <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
        {index + 1}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow group-hover:flex"
        title="Remover"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function SlideCard({
  slide,
  index,
  format,
  dna,
  active,
  onSelect,
  onRemove,
  onEditField,
  onSelectField,
}: {
  slide: Slide;
  index: number;
  format: Format;
  dna: BriefingDNA;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEditField?: (field: TextField, value: string) => void;
  onSelectField?: (f: TextField) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [cardH, setCardH] = useState(420);

  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement?.parentElement;
      if (!parent) return;
      const h = parent.clientHeight - 48;
      const clamped = Math.min(640, Math.max(320, h));
      setCardH(clamped);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (ref.current?.parentElement?.parentElement) {
      ro.observe(ref.current.parentElement.parentElement);
    }
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [format]);

  const ar = format.w / format.h;
  const cardW = cardH * ar;
  const scale = cardH / format.h;

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        "group relative shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-all",
        "border-4",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-transparent hover:border-primary/40",
      )}
      style={{ width: cardW, height: cardH }}
    >
      <div
        style={{
          width: format.w,
          height: format.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <SlideContent
          slide={slide}
          format={format}
          dna={dna}
          scale={scale}
          editable={active}
          onEditField={onEditField}
          onSelectField={onSelectField}
        />
      </div>
      <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {index + 1}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80 text-background shadow transition-colors hover:bg-foreground"
        title="Remover slide"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddSlideCard({ format, onAdd }: { format: Format; onAdd: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [cardH, setCardH] = useState(420);

  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement?.parentElement;
      if (!parent) return;
      const h = parent.clientHeight - 48;
      setCardH(Math.min(640, Math.max(320, h)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (ref.current?.parentElement?.parentElement) {
      ro.observe(ref.current.parentElement.parentElement);
    }
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [format]);

  const cardW = cardH * (format.w / format.h);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onAdd}
      className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      style={{ width: cardW, height: cardH }}
    >
      <Plus className="h-10 w-10" />
      <span className="text-sm font-medium">Adicionar slide</span>
    </button>
  );
}
