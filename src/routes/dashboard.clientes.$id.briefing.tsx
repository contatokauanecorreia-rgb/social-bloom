import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/plano/TagInput";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
  Heart,
  Compass,
  BookOpen,
  Sword,
  Flame,
  Wand2,
  Smile,
  Star,
  Laugh,
  Shield,
  Palette as PaletteIcon,
  Crown,
  Upload,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractPalette, ARCHETYPE_TONE } from "@/lib/extract-palette";

export const Route = createFileRoute("/dashboard/clientes/$id/briefing")({
  component: BriefingPage,
});

type Persona = "amiga-especialista" | "autoridade" | "aspiracional" | "popular";
type AgeRange = "18-24" | "25-35" | "36-45" | "46+";
type Goal = "agendamentos" | "crescer-perfil" | "autoridade" | "vender";
type Frequency = "1-2" | "3-4" | "5-6" | "7+";
type Archetype =
  | "inocente"
  | "explorador"
  | "sabio"
  | "heroi"
  | "fora-da-lei"
  | "mago"
  | "cara-comum"
  | "amante"
  | "bobo"
  | "cuidador"
  | "criador"
  | "governante";

type FontMode = "publica" | "exclusiva";
type PaletteMode = "hex" | "imagem";

type Form = {
  name: string;
  segment: string;
  archetype: Archetype | "";
  palette: [string, string, string];
  paletteMode: PaletteMode;
  brandFont: string;
  brandFontUrl: string;
  fontMode: FontMode;
  personality: string[];
  formality: number;
  persona: Persona[];
  dos: string[];
  donts: string[];
  age: AgeRange | "";
  pains: string;
  dreams: string;
  goal: Goal[];
  competitors: string[];
  frequency: Frequency | "";
};

const initial: Form = {
  name: "",
  segment: "",
  archetype: "",
  palette: ["#FF5C8A", "#1A1714", "#F5F0E8"],
  paletteMode: "hex",
  brandFont: "",
  brandFontUrl: "",
  fontMode: "publica",
  personality: [],
  formality: 3,
  persona: [],
  dos: [],
  donts: [],
  age: "",
  pains: "",
  dreams: "",
  goal: [],
  competitors: ["", "", ""],
  frequency: "",
};

const SEGMENTS = [
  "Saúde e beleza",
  "Alimentação",
  "Serviços locais",
  "Educação",
  "E-commerce",
  "Moda",
  "Outro",
];

const PERSONAS: { id: Persona; label: string; hint: string }[] = [
  {
    id: "amiga-especialista",
    label: "Uma amiga especialista",
    hint: "Indica, não vende. Próxima e didática.",
  },
  {
    id: "autoridade",
    label: "Uma autoridade do setor",
    hint: "Educa, inspira confiança.",
  },
  {
    id: "aspiracional",
    label: "Uma marca aspiracional",
    hint: "Estilo de vida, desejo.",
  },
  {
    id: "popular",
    label: "Uma marca popular",
    hint: "Acessível, próxima, direta.",
  },
];

const AGES: { id: AgeRange; label: string }[] = [
  { id: "18-24", label: "18 – 24 anos" },
  { id: "25-35", label: "25 – 35 anos" },
  { id: "36-45", label: "36 – 45 anos" },
  { id: "46+", label: "46+ anos" },
];

const GOALS: { id: Goal; label: string; cta: string }[] = [
  {
    id: "agendamentos",
    label: "Gerar agendamentos",
    cta: "Inclua sempre uma chamada para agendamento (link na bio, WhatsApp ou DM).",
  },
  {
    id: "crescer-perfil",
    label: "Crescer o perfil",
    cta: "Termine os conteúdos com um gancho que estimule salvar, compartilhar ou comentar.",
  },
  {
    id: "autoridade",
    label: "Construir autoridade",
    cta: "Sempre que possível, traga dados, fontes ou exemplos práticos que reforcem a expertise.",
  },
  {
    id: "vender",
    label: "Vender produto",
    cta: "Conduza o leitor para a oferta com prova social e CTA claro de compra.",
  },
];

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "1-2", label: "1–2x / semana" },
  { id: "3-4", label: "3–4x / semana" },
  { id: "5-6", label: "5–6x / semana" },
  { id: "7+", label: "7x+ / semana" },
];

const FORMALITY_LABELS = [
  "Muito informal",
  "Informal",
  "Equilibrado",
  "Formal",
  "Muito formal",
];

const STEPS = [
  "Identidade",
  "Tom de voz",
  "Público",
  "Objetivos",
  "Branding",
  "Revisão",
];

const ARCHETYPES: {
  id: Archetype;
  label: string;
  hint: string;
  Icon: typeof Heart;
}[] = [
  { id: "inocente", label: "Inocente", hint: "Otimista, puro, simples", Icon: Smile },
  { id: "explorador", label: "Explorador", hint: "Aventureiro, autêntico", Icon: Compass },
  { id: "sabio", label: "Sábio", hint: "Inteligente, confiável", Icon: BookOpen },
  { id: "heroi", label: "Herói", hint: "Corajoso, inspirador", Icon: Sword },
  { id: "fora-da-lei", label: "Fora da Lei", hint: "Rebelde, disruptivo", Icon: Flame },
  { id: "mago", label: "Mago", hint: "Visionário, transformador", Icon: Wand2 },
  { id: "cara-comum", label: "Cara Comum", hint: "Acessível, humano", Icon: Star },
  { id: "amante", label: "Amante", hint: "Sensual, íntimo", Icon: Heart },
  { id: "bobo", label: "Bobo da Corte", hint: "Divertido, irreverente", Icon: Laugh },
  { id: "cuidador", label: "Cuidador", hint: "Protetor, generoso", Icon: Shield },
  { id: "criador", label: "Criador", hint: "Criativo, original", Icon: PaletteIcon },
  { id: "governante", label: "Governante", hint: "Líder, premium", Icon: Crown },
];

function BriefingPage() {
  const { id: clientId } = Route.useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(initial);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
      supabase
        .from("client_briefings")
        .select("dos, donts, extra, archetype, palette, brand_font, brand_font_url")
        .eq("client_id", clientId)
        .maybeSingle(),
    ]).then(([c, b]) => {
      if (!active) return;
      const extra = ((b.data?.extra as Record<string, unknown> | null) ?? {}) as Partial<Form>;
      const palette = (b.data?.palette ?? []) as string[];
      setForm({
        ...initial,
        ...extra,
        name: c.data?.name ?? extra.name ?? "",
        dos: b.data?.dos ?? extra.dos ?? [],
        donts: b.data?.donts ?? extra.donts ?? [],
        archetype: ((b.data?.archetype as Archetype | null) ?? extra.archetype ?? "") as Archetype | "",
        palette: [
          palette[0] ?? extra.palette?.[0] ?? initial.palette[0],
          palette[1] ?? extra.palette?.[1] ?? initial.palette[1],
          palette[2] ?? extra.palette?.[2] ?? initial.palette[2],
        ] as [string, string, string],
        brandFont: (b.data?.brand_font as string | null) ?? extra.brandFont ?? "",
        brandFontUrl: (b.data?.brand_font_url as string | null) ?? extra.brandFontUrl ?? "",
        competitors:
          extra.competitors && extra.competitors.length === 3
            ? extra.competitors
            : ["", "", ""],
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [clientId]);

  const update = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const aiContext = useMemo(() => buildContext(form), [form]);

  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      toast.error("Sessão expirada.");
      return;
    }

    if (form.name.trim()) {
      await supabase.from("clients").update({ name: form.name.trim() }).eq("id", clientId);
    }

    const personaLabels = PERSONAS.filter((p) => form.persona.includes(p.id as Persona)).map((p) => p.label);
    const goalLabels = GOALS.filter((g) => form.goal.includes(g.id as Goal)).map((g) => g.label);
    const ageLabel = AGES.find((a) => a.id === form.age)?.label ?? "";

    const { error } = await supabase.from("client_briefings").upsert(
      [
        {
          client_id: clientId,
          user_id: session.user.id,
          tone_of_voice: personaLabels.length
            ? `${personaLabels.join(" + ")} · ${FORMALITY_LABELS[form.formality - 1]}`
            : FORMALITY_LABELS[form.formality - 1],
          target_audience: [
            ageLabel,
            form.pains.trim() && `Dores: ${form.pains.trim()}`,
            form.dreams.trim() && `Sonhos: ${form.dreams.trim()}`,
          ]
            .filter(Boolean)
            .join(". "),
          content_pillars: form.personality,
          goals: goalLabels,
          dos: form.dos,
          donts: form.donts,
          archetype: form.archetype || null,
          palette: form.palette,
          brand_font: form.brandFont.trim() || null,
          brand_font_url: form.brandFontUrl.trim() || null,
          extra: form as unknown as never,
        },
      ],
      { onConflict: "client_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar DNA da marca.");
      return;
    }
    toast.success("DNA da marca salvo!");
    navigate({ to: "/dashboard/clientes/$id", params: { id: clientId } });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DNA da marca</h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que a IA precisa saber para escrever como essa marca.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active && "border-primary bg-primary text-primary-foreground shadow-sm",
                  done && !active && "border-emerald-200 bg-emerald-50 text-emerald-700",
                  !active && !done && "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <span className="tabular-nums">{i + 1}</span>}
                {label}
              </button>
            );
          })}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && <StepIdentidade form={form} update={update} />}
          {step === 1 && <StepTomDeVoz form={form} update={update} />}
          {step === 2 && <StepPublico form={form} update={update} />}
          {step === 3 && <StepObjetivos form={form} update={update} />}
          {step === 4 && (
            <StepBranding form={form} update={update} clientId={clientId} />
          )}
          {step === 5 && <StepRevisao form={form} aiContext={aiContext} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="gradient" onClick={() => setStep((s) => s + 1)}>
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="gradient" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar DNA da marca
          </Button>
        )}
      </div>
    </div>
  );
}

type StepProps = {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
};

function StepIdentidade({ form, update }: StepProps) {
  return (
    <div className="space-y-6">
      <Header title="Identidade" subtitle="Quem é a marca e como ela quer ser percebida." />
      <Field label="Nome do cliente">
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ex: Studio Bela Forma"
        />
      </Field>
      <Field label="Segmento">
        <ChoiceGrid
          options={SEGMENTS.map((s) => ({ id: s, label: s }))}
          value={form.segment}
          onChange={(v) => update("segment", v)}
          cols={3}
        />
      </Field>
      <Field
        label="Personalidade em 3 palavras"
        hint="Ex: acolhedora, técnica, divertida"
      >
        <TagInput
          value={form.personality}
          onChange={(v) => update("personality", v)}
          placeholder="Digite uma palavra e pressione Enter"
        />
      </Field>
    </div>
  );
}

function StepTomDeVoz({ form, update }: StepProps) {
  return (
    <div className="space-y-6">
      <Header title="Tom de voz" subtitle="Como a marca conversa com o público." />

      <Field label="Formalidade" hint={FORMALITY_LABELS[form.formality - 1]}>
        <div className="px-1 pt-2">
          <Slider
            value={[form.formality]}
            onValueChange={(v) => update("formality", v[0] as Form["formality"])}
            min={1}
            max={5}
            step={1}
            minStepsBetweenThumbs={0}
          />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Muito informal</span>
            <span>Muito formal</span>
          </div>
        </div>
      </Field>

      <Field label="A marca se parece com…">
        <ChoiceGrid
          options={PERSONAS.map((p) => ({ id: p.id, label: p.label, hint: p.hint }))}
          value={form.persona}
          onChange={(v) => update("persona", v as Persona)}
          cols={2}
        />
      </Field>

      <Field label="Palavras que a marca USA" hint="Vocabulário recorrente e seguro.">
        <div className="rounded-md border-2 border-emerald-200 bg-emerald-50/40 p-1">
          <TagInput
            value={form.dos}
            onChange={(v) => update("dos", v)}
            placeholder="Ex: cuidado, evolução, ritual"
          />
        </div>
      </Field>

      <Field label="O que a marca NUNCA deve dizer">
        <div className="rounded-md border-2 border-rose-200 bg-rose-50/40 p-1">
          <TagInput
            value={form.donts}
            onChange={(v) => update("donts", v)}
            placeholder="Ex: gordinha, problema, milagre"
          />
        </div>
      </Field>
    </div>
  );
}

function StepPublico({ form, update }: StepProps) {
  return (
    <div className="space-y-6">
      <Header title="Público" subtitle="Para quem cada conteúdo está sendo escrito." />

      <Field label="Faixa etária principal">
        <ChoiceGrid
          options={AGES.map((a) => ({ id: a.id, label: a.label }))}
          value={form.age}
          onChange={(v) => update("age", v as AgeRange)}
          cols={4}
        />
      </Field>

      <Field label="Quais são as maiores dores desse público?">
        <Textarea
          rows={3}
          value={form.pains}
          onChange={(e) => update("pains", e.target.value)}
          placeholder="O que tira o sono dessas pessoas?"
        />
      </Field>

      <Field label="O que esse público sonha em alcançar?">
        <Textarea
          rows={3}
          value={form.dreams}
          onChange={(e) => update("dreams", e.target.value)}
          placeholder="Como seria uma vida ideal para eles?"
        />
      </Field>
    </div>
  );
}

function StepObjetivos({ form, update }: StepProps) {
  const setCompetitor = (i: number, v: string) => {
    const next = [...form.competitors];
    next[i] = v;
    update("competitors", next);
  };
  return (
    <div className="space-y-6">
      <Header title="Objetivos" subtitle="O que cada conteúdo precisa entregar." />

      <Field label="Objetivo principal">
        <ChoiceGrid
          options={GOALS.map((g) => ({ id: g.id, label: g.label }))}
          value={form.goal}
          onChange={(v) => update("goal", v as Goal)}
          cols={2}
        />
      </Field>

      <Field
        label="Concorrentes que o cliente acompanha"
        hint="Até 3 perfis do Instagram."
      >
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              value={form.competitors[i] ?? ""}
              onChange={(e) => setCompetitor(i, e.target.value)}
              placeholder={`@perfil${i + 1}`}
            />
          ))}
        </div>
      </Field>

      <Field label="Frequência de postagem">
        <ChoiceGrid
          options={FREQUENCIES.map((f) => ({ id: f.id, label: f.label }))}
          value={form.frequency}
          onChange={(v) => update("frequency", v as Frequency)}
          cols={4}
        />
      </Field>
    </div>
  );
}

function StepBranding({
  form,
  update,
  clientId,
}: StepProps & { clientId: string }) {
  return (
    <div className="space-y-8">
      <Header
        title="Branding"
        subtitle="Arquétipo, tipografia e paleta — a identidade visual e simbólica."
      />

      <ArchetypeGrid
        value={form.archetype}
        onChange={(v) => update("archetype", v)}
      />

      <FontPicker form={form} update={update} clientId={clientId} />

      <PalettePicker form={form} update={update} clientId={clientId} />
    </div>
  );
}

function ArchetypeGrid({
  value,
  onChange,
}: {
  value: Archetype | "";
  onChange: (v: Archetype) => void;
}) {
  return (
    <Field
      label="Arquétipo da marca"
      hint="Apenas 1 pode ser selecionado. Ele guia o tom de cada texto."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ARCHETYPES.map((a) => {
          const active = value === a.id;
          const Icon = a.Icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border bg-background p-3 text-left transition-all hover:border-foreground/30",
                active && "border-primary bg-primary/5 ring-2 ring-primary/30",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                  active && "bg-primary/15 text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">{a.label}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">
                {a.hint}
              </div>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function FontPicker({
  form,
  update,
  clientId,
}: StepProps & { clientId: string }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const loadGoogleFont = (name: string) => {
    if (!name.trim() || typeof document === "undefined") return;
    const family = name.trim();
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
    const id = `gf-${family.toLowerCase().replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    setPreview(true);
  };

  const onUploadFont = async (file: File) => {
    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const path = `${session.user.id}/${clientId}/font-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      update("brandFontUrl", data.publicUrl);
      update("brandFont", file.name.replace(/\.(ttf|otf|woff2?)$/i, ""));
      toast.success("Fonte enviada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label="Tipografia" hint="A fonte usada nos textos da marca.">
      <div className="space-y-3">
        <div className="flex gap-2">
          <ModeRadio
            checked={form.fontMode === "publica"}
            onClick={() => update("fontMode", "publica")}
            label="Fonte pública"
          />
          <ModeRadio
            checked={form.fontMode === "exclusiva"}
            onClick={() => update("fontMode", "exclusiva")}
            label="Fonte exclusiva"
          />
        </div>

        {form.fontMode === "publica" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={form.brandFont}
                onChange={(e) => {
                  update("brandFont", e.target.value);
                  setPreview(false);
                }}
                placeholder="Ex: Montserrat, Playfair Display"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => loadGoogleFont(form.brandFont)}
                disabled={!form.brandFont.trim()}
              >
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
            {preview && form.brandFont.trim() && (
              <div
                className="rounded-lg border bg-background p-4"
                style={{ fontFamily: `"${form.brandFont}", sans-serif` }}
              >
                <div className="text-2xl font-bold">AaBbCc 123</div>
                <div className="text-sm text-muted-foreground">
                  The quick brown fox jumps over the lazy dog.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-4 text-sm text-muted-foreground hover:border-foreground/30">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Anexar arquivo .ttf / .otf"}
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFont(f);
                }}
              />
            </label>
            {form.brandFontUrl && (
              <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                Arquivo carregado: <span className="font-mono">{form.brandFont || "fonte personalizada"}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

function PalettePicker({
  form,
  update,
  clientId: _clientId,
}: StepProps & { clientId: string }) {
  const [extracting, setExtracting] = useState(false);
  const [sourceImg, setSourceImg] = useState<string | null>(null);

  const setColor = (i: 0 | 1 | 2, hex: string) => {
    const next = [...form.palette] as [string, string, string];
    next[i] = hex.toUpperCase();
    update("palette", next);
  };

  const onExtract = async (file: File) => {
    setExtracting(true);
    try {
      setSourceImg(URL.createObjectURL(file));
      const colors = await extractPalette(file);
      update("palette", colors);
      toast.success("3 cores extraídas!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao extrair cores");
    } finally {
      setExtracting(false);
    }
  };

  const labels = ["Cor primária", "Cor secundária", "Cor de destaque"];

  return (
    <Field label="Paleta de cores" hint="3 cores principais da identidade visual.">
      <div className="space-y-3">
        <div className="flex gap-2">
          <ModeRadio
            checked={form.paletteMode === "hex"}
            onClick={() => update("paletteMode", "hex")}
            label="Inserir códigos HEX"
          />
          <ModeRadio
            checked={form.paletteMode === "imagem"}
            onClick={() => update("paletteMode", "imagem")}
            label="Extrair de imagem"
          />
        </div>

        {form.paletteMode === "imagem" && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-4 text-sm text-muted-foreground hover:border-foreground/30">
            {extracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {extracting ? "Analisando..." : "Enviar imagem da marca"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onExtract(f);
              }}
            />
          </label>
        )}

        {form.paletteMode === "imagem" && sourceImg && (
          <img
            src={sourceImg}
            alt="Imagem fonte"
            className="h-24 w-full rounded-md border object-cover"
          />
        )}

        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl border bg-background p-3"
            >
              <div className="text-[11px] font-medium text-muted-foreground">
                {labels[i]}
              </div>
              <div
                className="h-14 w-full rounded-lg border shadow-inner"
                style={{ backgroundColor: form.palette[i as 0 | 1 | 2] }}
              />
              <input
                type="color"
                value={form.palette[i as 0 | 1 | 2]}
                onChange={(e) => setColor(i as 0 | 1 | 2, e.target.value)}
                className="h-7 w-full cursor-pointer rounded"
              />
              <Input
                value={form.palette[i as 0 | 1 | 2]}
                onChange={(e) => setColor(i as 0 | 1 | 2, e.target.value)}
                className="h-7 text-center font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          ))}
        </div>
      </div>
    </Field>
  );
}

function ModeRadio({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-all",
        checked
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "hover:border-foreground/30",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          checked ? "border-primary" : "border-muted-foreground/40",
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      {label}
    </button>
  );
}

function StepRevisao({ form, aiContext }: { form: Form; aiContext: string }) {
  const personaLabel = PERSONAS.find((p) => p.id === form.persona)?.label ?? "—";
  const goalLabel = GOALS.find((g) => g.id === form.goal)?.label ?? "—";
  const ageLabel = AGES.find((a) => a.id === form.age)?.label ?? "—";
  const archetypeLabel =
    ARCHETYPES.find((a) => a.id === form.archetype)?.label ?? "—";

  // load preview font
  useEffect(() => {
    if (form.fontMode === "publica" && form.brandFont.trim() && typeof document !== "undefined") {
      const family = form.brandFont.trim();
      const id = `gf-${family.toLowerCase().replace(/\s+/g, "-")}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [form.brandFont, form.fontMode]);

  const fontFamily = form.brandFont.trim()
    ? `"${form.brandFont}", sans-serif`
    : undefined;

  return (
    <div className="space-y-6">
      <Header title="Revisão" subtitle="Confira o contexto que será injetado nas gerações." />

      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/60 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
          <Sparkles className="h-4 w-4" />
          Contexto gerado para a IA
        </div>
        <p className="whitespace-pre-line text-sm italic leading-relaxed text-blue-950/90">
          {aiContext}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Segmento" value={form.segment || "—"} />
        <SummaryCard label="Público" value={ageLabel} />
        <SummaryCard label="Tom" value={personaLabel} />
        <SummaryCard label="Objetivo" value={goalLabel} />
        <SummaryCard label="Arquétipo" value={archetypeLabel} />
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview visual
        </div>
        <div
          className="overflow-hidden rounded-2xl border p-8 shadow-sm"
          style={{ backgroundColor: form.palette[0] }}
        >
          <div
            className="text-3xl font-bold"
            style={{ color: form.palette[2], fontFamily }}
          >
            {form.name || "Sua marca"}
          </div>
          <div
            className="mt-2 text-sm"
            style={{ color: form.palette[2], fontFamily, opacity: 0.85 }}
          >
            {personaLabel !== "—"
              ? personaLabel
              : "Tom de voz da sua marca"}
          </div>
          <div className="mt-6 flex gap-2">
            {form.palette.map((c, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: form.palette[2] }}
              />
            ))}
          </div>
          <div
            className="mt-6 inline-block rounded-full px-4 py-2 text-xs font-semibold"
            style={{
              backgroundColor: form.palette[1],
              color: form.palette[2],
              fontFamily,
            }}
          >
            Botão de ação
          </div>
        </div>
      </div>
    </div>
  );
}

function buildContext(f: Form): string {
  const personaLabel = PERSONAS.find((p) => p.id === f.persona)?.label;
  const goal = GOALS.find((g) => g.id === f.goal);
  const ageLabel = AGES.find((a) => a.id === f.age)?.label;
  const archetype = ARCHETYPES.find((a) => a.id === f.archetype);

  const parts: string[] = [];
  parts.push(
    `Você está criando conteúdo para ${f.name || "este cliente"}${f.segment ? `, ${f.segment.toLowerCase()}` : ""} voltado a ${ageLabel ? `pessoas de ${ageLabel.toLowerCase()}` : "seu público-alvo"}.`,
  );
  if (f.personality.length) {
    parts.push(`A marca tem personalidade ${f.personality.join(", ")}.`);
  }
  if (personaLabel) {
    parts.push(
      `Tom de voz: ${personaLabel.toLowerCase()} (${FORMALITY_LABELS[f.formality - 1].toLowerCase()}).`,
    );
  }
  if (archetype) {
    const tone = ARCHETYPE_TONE[archetype.id];
    parts.push(
      `Arquétipo: ${archetype.label}. Direção de linguagem: ${tone}.`,
    );
  }
  if (f.dos.length) parts.push(`Use sempre: ${f.dos.join(", ")}.`);
  if (f.donts.length) parts.push(`Nunca use: ${f.donts.join(", ")}.`);
  if (f.pains.trim()) parts.push(`Dores do público: ${f.pains.trim()}.`);
  if (f.dreams.trim()) parts.push(`Sonhos do público: ${f.dreams.trim()}.`);
  if (goal) {
    parts.push(`O objetivo de cada conteúdo é ${goal.label.toLowerCase()}. ${goal.cta}`);
  }
  return parts.join(" ");
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function ChoiceGrid({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  cols?: 2 | 3 | 4;
}) {
  const colsClass =
    cols === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : cols === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={cn("grid gap-2", colsClass)}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-xl border bg-background p-3 text-left transition-all hover:border-foreground/30",
              active && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <div className="text-sm font-medium">{o.label}</div>
            {o.hint && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {o.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
