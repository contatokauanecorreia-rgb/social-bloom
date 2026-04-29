import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Download,
  Image as ImageIcon,
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
import { ensureBrandFont, brandFontFamily } from "@/lib/brand-font";
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
  overlay: { enabled: boolean; intensity: number; type: OverlayType };
  text: { title: string; subtitle: string; body: string };
  fontSize: { title: number; subtitle: number; body: number };
  textColor: { title: string; subtitle: string; body: string };
  textAlign: { title: TextAlign; subtitle: TextAlign; body: TextAlign };
  fontWeight: { title: number; subtitle: number; body: number };
  textPos: { x: number; y: number };
  signature: { enabled: boolean; handle: string; position: SignaturePos; color: string };
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

  const [format, setFormat] = useState<Format | null>(null);
  const [formatPickerOpen, setFormatPickerOpen] = useState(true);

  const [slides, setSlides] = useState<Slide[]>([makeSlide()]);
  const [activeId, setActiveId] = useState<string>(() => "");
  const [selectedField, setSelectedField] = useState<TextField | null>(null);

  const [exporting, setExporting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [plannerTitles, setPlannerTitles] = useState<string[]>([]);

  // initial setup
  useEffect(() => {
    if (slides.length > 0 && !activeId) setActiveId(slides[0].id);
  }, [slides, activeId]);

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
        .select("title")
        .eq("user_id", userId)
        .eq("client_id", saved)
        .order("created_at", { ascending: false })
        .limit(200),
    ]).then(([c, b, p]) => {
      setClientName(c.data?.name ?? "");
      const palette = (b.data?.palette ?? []) as string[];
      const next: BriefingDNA = {
        palette: [
          palette[0] ?? DEFAULT_PALETTE[0],
          palette[1] ?? DEFAULT_PALETTE[1],
          palette[2] ?? DEFAULT_PALETTE[2],
        ],
        brandFont: (b.data?.brand_font as string | null) ?? null,
        brandFontUrl: (b.data?.brand_font_url as string | null) ?? null,
      };
      setDna(next);
      ensureBrandFont(next.brandFont, next.brandFontUrl);
      const titles = ((p.data ?? []) as { title: string | null }[])
        .map((r) => r.title)
        .filter((t): t is string => !!t && t.trim().length > 0);
      setPlannerTitles(Array.from(new Set(titles)));
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

  const moveActiveText = (dxFraction: number, dyFraction: number) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        const x = Math.max(0.05, Math.min(0.95, s.textPos.x + dxFraction));
        const y = Math.max(0.05, Math.min(0.95, s.textPos.y + dyFraction));
        return { ...s, textPos: { x, y } };
      }),
    );
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

  // -------- Handler escolha de formato --------

  const handlePickFormat = (f: Format) => {
    setFormat(f);
    setFormatPickerOpen(false);
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
                  plannerTitles={plannerTitles}
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

            {/* Preview central */}
            <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
              <ScaledPreview
                slide={activeSlide}
                format={format}
                dna={dna}
                onMoveText={moveActiveText}
              />
            </main>
          </div>

          {/* Barra de slides */}
          <div className="border-t bg-card p-3">
            <SlidesBar
              slides={slides}
              format={format}
              dna={dna}
              activeId={activeId}
              onSelect={setActiveId}
              onAdd={addSlide}
              onRemove={removeSlide}
              onReorder={(from, to) => {
                setSlides((prev) => arrayMove(prev, from, to));
              }}
            />
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

      <FormatPickerDialog
        open={formatPickerOpen}
        onPick={handlePickFormat}
        onCancel={() => navigate({ to: "/dashboard/studio" })}
      />
    </div>
  );
}

// ---------- Subcomponentes ----------

function FormatPickerDialog({
  open,
  onPick,
  onCancel,
}: {
  open: boolean;
  onPick: (f: Format) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<FormatKey>("carrossel");
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolha o formato</DialogTitle>
          <DialogDescription>
            Em qual formato você vai criar seu conteúdo?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          {FORMATS.map((f) => {
            const ar = f.w / f.h;
            const isSel = selected === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelected(f.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border bg-background p-3 text-center transition",
                  isSel ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50",
                )}
              >
                <div
                  className="rounded bg-gradient-to-br from-primary/30 to-primary/10"
                  style={{
                    width: 80,
                    height: 80 / ar,
                    maxHeight: 110,
                  }}
                />
                <div className="text-xs font-semibold">{f.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {f.w}×{f.h}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onPick(FORMATS.find((f) => f.key === selected)!)}>
            Começar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorPanel({
  slide,
  dna,
  selectedField,
  setSelectedField,
  onUpdateActive,
  onApplyToAll,
  onPickImage,
}: {
  slide: Slide;
  dna: BriefingDNA;
  selectedField: TextField | null;
  setSelectedField: (f: TextField | null) => void;
  onUpdateActive: (m: (s: Slide) => Slide) => void;
  onApplyToAll: (m: (s: Slide, source: Slide) => Slide) => void;
  onPickImage: (f: File, applyAll: boolean) => void;
}) {
  const [applyImageAll, setApplyImageAll] = useState(false);

  return (
    <div className="space-y-6">
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
        <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Checkbox
            checked={applyImageAll}
            onCheckedChange={(v) => setApplyImageAll(!!v)}
          />
          Aplicar também em todos os slides
        </label>
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

      {/* TEXTO */}
      <Section title="Texto">
        <TextFieldRow
          label="Título"
          value={slide.text.title}
          field="title"
          selected={selectedField === "title"}
          onSelect={() => setSelectedField("title")}
          onChange={(v) =>
            onUpdateActive((s) => ({ ...s, text: { ...s.text, title: v } }))
          }
          onApplyAll={() =>
            onApplyToAll((s, src) => ({
              ...s,
              text: { ...s.text, title: src.text.title },
            }))
          }
          isTextarea={false}
        />
        <TextFieldRow
          label="Subtítulo"
          value={slide.text.subtitle}
          field="subtitle"
          selected={selectedField === "subtitle"}
          onSelect={() => setSelectedField("subtitle")}
          onChange={(v) =>
            onUpdateActive((s) => ({ ...s, text: { ...s.text, subtitle: v } }))
          }
          onApplyAll={() =>
            onApplyToAll((s, src) => ({
              ...s,
              text: { ...s.text, subtitle: src.text.subtitle },
            }))
          }
          isTextarea={false}
        />
        <TextFieldRow
          label="Texto do corpo"
          value={slide.text.body}
          field="body"
          selected={selectedField === "body"}
          onSelect={() => setSelectedField("body")}
          onChange={(v) =>
            onUpdateActive((s) => ({ ...s, text: { ...s.text, body: v } }))
          }
          onApplyAll={() =>
            onApplyToAll((s, src) => ({
              ...s,
              text: { ...s.text, body: src.text.body },
            }))
          }
          isTextarea
        />
      </Section>

      {/* FONTE */}
      <Section title="Fonte">
        <div className="rounded-md border bg-background px-2.5 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Type className="h-3 w-3" />
            DNA da marca
          </div>
          <div className="mt-1 font-medium">
            {dna.brandFont || "Fonte padrão"}
            {dna.brandFontUrl ? " (custom)" : ""}
          </div>
        </div>

        {(["title", "subtitle", "body"] as TextField[]).map((f) => (
          <div key={f} className="mt-3">
            <Label className="text-[11px] capitalize text-muted-foreground">
              Tamanho — {f === "title" ? "Título" : f === "subtitle" ? "Subtítulo" : "Corpo"} (
              {slide.fontSize[f]}px)
            </Label>
            <Slider
              className="mt-1"
              value={[slide.fontSize[f]]}
              min={f === "title" ? 32 : f === "subtitle" ? 20 : 14}
              max={f === "title" ? 140 : f === "subtitle" ? 100 : 80}
              step={1}
              onValueChange={(v) =>
                onUpdateActive((s) => ({
                  ...s,
                  fontSize: { ...s.fontSize, [f]: v[0] },
                }))
              }
            />
          </div>
        ))}
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

function TextFieldRow({
  label,
  value,
  selected,
  onSelect,
  onChange,
  onApplyAll,
  isTextarea,
}: {
  label: string;
  value: string;
  field: TextField;
  selected: boolean;
  onSelect: () => void;
  onChange: (v: string) => void;
  onApplyAll: () => void;
  isTextarea: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2 transition",
        selected ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {isTextarea ? (
        <Textarea
          value={value}
          onFocus={onSelect}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 text-sm"
          placeholder="Digite aqui..."
        />
      ) : (
        <Input
          value={value}
          onFocus={onSelect}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 text-sm"
          placeholder="Digite aqui..."
        />
      )}
      <button
        type="button"
        onClick={onApplyAll}
        className="mt-1 text-[10px] font-medium text-primary hover:underline"
      >
        Aplicar em todos os slides
      </button>
    </div>
  );
}

function ScaledPreview({
  slide,
  format,
  dna,
}: {
  slide: Slide;
  format: Format;
  dna: BriefingDNA;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth - 32;
      const ph = parent.clientHeight - 32;
      const s = Math.min(pw / format.w, ph / format.h, 0.8);
      setScale(s > 0 ? s : 0.3);
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
      className="rounded-2xl shadow-lg ring-1 ring-border"
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
        <SlideContent slide={slide} format={format} dna={dna} />
      </div>
    </div>
  );
}

function SlideContent({
  slide,
  format,
  dna,
}: {
  slide: Slide;
  format: Format;
  dna: BriefingDNA;
}) {
  const overlayBg = (() => {
    if (!slide.overlay.enabled) return "transparent";
    const a = slide.overlay.intensity / 100;
    if (slide.overlay.type === "dark") return `rgba(0,0,0,${a})`;
    if (slide.overlay.type === "light") return `rgba(255,255,255,${a})`;
    return `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,${a}) 100%)`;
  })();

  const family = brandFontFamily(dna.brandFont);

  return (
    <div
      style={{
        width: format.w,
        height: format.h,
        position: "relative",
        overflow: "hidden",
        backgroundColor: dna.palette[2] || "#111",
        fontFamily: family,
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
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: overlayBg }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: format.w * 0.08,
          textAlign: "center",
          gap: 24,
        }}
      >
        {slide.text.title && (
          <h1
            style={{
              fontSize: slide.fontSize.title,
              color: slide.textColor.title,
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {slide.text.title}
          </h1>
        )}
        {slide.text.subtitle && (
          <h2
            style={{
              fontSize: slide.fontSize.subtitle,
              color: slide.textColor.subtitle,
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {slide.text.subtitle}
          </h2>
        )}
        {slide.text.body && (
          <p
            style={{
              fontSize: slide.fontSize.body,
              color: slide.textColor.body,
              fontWeight: 400,
              lineHeight: 1.4,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {slide.text.body}
          </p>
        )}
      </div>
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
