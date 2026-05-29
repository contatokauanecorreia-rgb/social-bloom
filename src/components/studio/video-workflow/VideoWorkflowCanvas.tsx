import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Film,
  ImageIcon,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  Play,
  Upload,
  Type,
  RotateCcw,
  X,
  Copy,
  AlertCircle,
  Download,
  Scissors,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  createSignedUploadUrl,
  startTranscription,
  getTranscriptionStatus,
} from "@/lib/assemblyai.functions";
import { startLumaGeneration, getLumaStatus } from "@/lib/luma.functions";
import { supabase } from "@/integrations/supabase/client";



// ---------- Types ----------
type BlockId = "video" | "scene" | "model" | "color" | "generate";

type ModelOption = "luma-flex" | "luma-reimagine" | "kling";
type LutOption = "Cinema" | "Neon" | "Natural" | "B&W" | "Golden" | "Cold";
type SceneMode = "image" | "prompt";

type WorkflowState = {
  videoFile: File | null;
  videoUrl: string | null;
  sceneMode: SceneMode;
  sceneImage: File | null;
  sceneImageUrl: string | null;
  scenePrompt: string;
  model: ModelOption | null;
  contrast: number;
  saturation: number;
  temperature: number;
  lut: LutOption;
};

type Position = { x: number; y: number };
type Layout = Record<BlockId, Position>;

// ---------- Defaults ----------
const BLOCK_W = 320;
const BLOCK_H = 280;
const DEFAULT_LAYOUT: Layout = {
  video: { x: 24, y: 40 },
  scene: { x: 380, y: 40 },
  model: { x: 736, y: 40 },
  color: { x: 200, y: 360 },
  generate: { x: 556, y: 360 },
};
const STORAGE_KEY = "postly-video-workflow-layout";

const MODEL_OPTIONS: { value: ModelOption; name: string; desc: string; eta: string }[] = [
  { value: "luma-flex", name: "Luma Ray2 Flex", desc: "Rápido, ideal para iterações.", eta: "~45s" },
  { value: "luma-reimagine", name: "Luma Ray2 Reimaginar", desc: "Reinterpreta cenário mantendo movimento.", eta: "~90s" },
  { value: "kling", name: "Kling via Replicate", desc: "Maior fidelidade, mais lento.", eta: "~3min" },
];

const LUTS: { name: LutOption; gradient: string }[] = [
  { name: "Cinema", gradient: "linear-gradient(135deg,#2b1d12,#c9a36a)" },
  { name: "Neon", gradient: "linear-gradient(135deg,#ff00c8,#00e5ff)" },
  { name: "Natural", gradient: "linear-gradient(135deg,#a8c8a4,#e8e0c8)" },
  { name: "B&W", gradient: "linear-gradient(135deg,#111,#eee)" },
  { name: "Golden", gradient: "linear-gradient(135deg,#7a4a10,#ffd27a)" },
  { name: "Cold", gradient: "linear-gradient(135deg,#0a2a4a,#9ad3ff)" },
];

// ---------- Component ----------
export function VideoWorkflowCanvas() {
  const [state, setState] = useState<WorkflowState>({
    videoFile: null,
    videoUrl: null,
    sceneMode: "image",
    sceneImage: null,
    sceneImageUrl: null,
    scenePrompt: "",
    model: null,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    lut: "Natural",
  });


  // --- Block 1: upload + transcription state ---
  type TranscriptionStatus = "idle" | "uploading" | "transcribing" | "ready" | "error";
  type Transcription = { text: string; language: string | null } | null;
  const [videoStoragePath, setVideoStoragePath] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>("idle");
  const [transcription, setTranscription] = useState<Transcription>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const createUploadFn = useServerFn(createSignedUploadUrl);
  const startTranscriptionFn = useServerFn(startTranscription);
  const getStatusFn = useServerFn(getTranscriptionStatus);
  const startLumaFn = useServerFn(startLumaGeneration);
  const getLumaStatusFn = useServerFn(getLumaStatus);

  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [dragging, setDragging] = useState<BlockId | null>(null);
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [stageLabel, setStageLabel] = useState<string>("");
  const [done, setDone] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const generationPollRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);


  // Load saved layout
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Layout;
        if (parsed && typeof parsed === "object") setLayout({ ...DEFAULT_LAYOUT, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      if (state.sceneImageUrl) URL.revokeObjectURL(state.sceneImageUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Completion flags
  const complete = useMemo(
    () => ({
      video: !!state.videoFile && transcriptionStatus === "ready",
      scene:
        state.sceneMode === "image"
          ? !!state.sceneImage
          : state.scenePrompt.trim().length > 0,
      model: !!state.model,
      color: true,
      generate: done,
    }),
    [state, done, transcriptionStatus],
  );


  const canGenerate = complete.video && complete.scene && complete.model && !generating;

  // ---------- Drag ----------
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const onPointerDown = (id: BlockId) => (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    // Ignore drags that start on interactive controls
    const el = e.target as HTMLElement;
    if (el.closest("button, input, textarea, label, [role=radio], [role=slider], video")) {
      return;
    }
    target.setPointerCapture(e.pointerId);
    const pos = layout[id];
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    setDragging(id);
  };

  const onPointerMove = (id: BlockId) => (e: React.PointerEvent) => {
    if (dragging !== id) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - dragOffset.current.dx;
    const y = e.clientY - dragOffset.current.dy;
    const maxX = Math.max(0, rect.width - BLOCK_W);
    const maxY = Math.max(0, rect.height - BLOCK_H);
    setLayout((prev) => ({
      ...prev,
      [id]: {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      },
    }));
  };

  const onPointerUp = () => setDragging(null);

  const resetLayout = () => setLayout(DEFAULT_LAYOUT);
  // ---------- Handlers ----------
  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const resetVideoBlock = useCallback(() => {
    stopPolling();
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    setState((s) => ({ ...s, videoFile: null, videoUrl: null }));
    setVideoStoragePath(null);
    setUploadProgress(0);
    setTranscription(null);
    setTranscriptionError(null);
    setTranscriptionStatus("idle");
  }, [state.videoUrl, stopPolling]);

  const pollTranscription = useCallback(
    (transcriptId: string) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await getStatusFn({ data: { transcriptId } });
          if (status.status === "completed") {
            stopPolling();
            setTranscription({ text: status.text ?? "", language: status.language });
            setTranscriptionStatus("ready");
            toast.success("Transcrição concluída.");
          } else if (status.status === "error") {
            stopPolling();
            setTranscriptionError(status.error ?? "Erro na transcrição.");
            setTranscriptionStatus("error");
            toast.error(`Transcrição falhou: ${status.error ?? "erro desconhecido"}`);
          }
        } catch (err) {
          stopPolling();
          const msg = err instanceof Error ? err.message : "Erro ao verificar status.";
          setTranscriptionError(msg);
          setTranscriptionStatus("error");
          toast.error(msg);
        }
      }, 3000);
    },
    [getStatusFn, stopPolling],
  );

  const handleVideo = async (file: File | null) => {
    if (!file) return;
    if (!/\.(mp4|mov|webm)$/i.test(file.name)) {
      toast.error("Formato inválido. Use MP4, MOV ou WEBM.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Vídeo excede 500MB.");
      return;
    }

    // Local preview + reset prior state
    stopPolling();
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    const url = URL.createObjectURL(file);
    setState((s) => ({ ...s, videoFile: file, videoUrl: url }));
    setTranscription(null);
    setTranscriptionError(null);
    setVideoStoragePath(null);
    setUploadProgress(0);
    setTranscriptionStatus("uploading");

    try {
      // 1. Get signed upload URL
      const { storagePath, token } = await createUploadFn({
        data: { fileName: file.name, contentType: file.type || "video/mp4" },
      });

      // 2. Upload to storage with progress
      await uploadWithProgress({
        bucket: "video-workflow-inputs",
        path: storagePath,
        token,
        file,
        onProgress: setUploadProgress,
      });
      setVideoStoragePath(storagePath);
      setUploadProgress(100);

      // 3. Start transcription
      setTranscriptionStatus("transcribing");
      const { transcriptId } = await startTranscriptionFn({ data: { storagePath } });
      pollTranscription(transcriptId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha no envio do vídeo.";
      setTranscriptionError(msg);
      setTranscriptionStatus("error");
      toast.error(msg);
    }
  };


  const handleSceneImage = (file: File | null) => {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem excede 10MB.");
      return;
    }
    if (state.sceneImageUrl) URL.revokeObjectURL(state.sceneImageUrl);
    const url = URL.createObjectURL(file);
    setState((s) => ({ ...s, sceneImage: file, sceneImageUrl: url }));
  };

  const stopGenerationPolling = useCallback(() => {
    if (generationPollRef.current !== null) {
      window.clearInterval(generationPollRef.current);
      generationPollRef.current = null;
    }
  }, []);

  useEffect(() => stopGenerationPolling, [stopGenerationPolling]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    if (!videoStoragePath) {
      toast.error("Vídeo ainda não foi enviado.");
      return;
    }
    setGenerating(true);
    setDone(false);
    setProgress(5);
    setStageLabel("Preparando…");
    setGeneratedVideoUrl(null);
    setGenerationError(null);

    try {
      // If scene mode is image, upload the image to storage first.
      let sceneImagePath: string | null = null;
      if (state.sceneMode === "image" && state.sceneImage) {
        setStageLabel("Enviando imagem do cenário…");
        const { storagePath, token } = await createUploadFn({
          data: {
            fileName: state.sceneImage.name,
            contentType: state.sceneImage.type || "image/jpeg",
          },
        });
        await uploadWithProgress({
          bucket: "video-workflow-inputs",
          path: storagePath,
          token,
          file: state.sceneImage,
          onProgress: () => {},
        });
        sceneImagePath = storagePath;
      }

      setStageLabel("Enviando para Luma Ray2…");
      setProgress(10);
      const { requestId } = await startLumaFn({
        data: {
          videoStoragePath,
          sceneMode: state.sceneMode,
          scenePrompt: state.scenePrompt,
          sceneImagePath,
          model: state.model!,
          lut: state.lut,
          contrast: state.contrast,
          saturation: state.saturation,
          temperature: state.temperature,
        },
      });

      setStageLabel("Processando vídeo…");
      stopGenerationPolling();
      generationPollRef.current = window.setInterval(async () => {
        try {
          const s = await getLumaStatusFn({ data: { requestId } });
          setProgress(s.progress);
          if (s.status === "IN_QUEUE") setStageLabel("Na fila…");
          else if (s.status === "IN_PROGRESS") setStageLabel("Processando vídeo…");
          if (s.status === "COMPLETED" && s.videoUrl) {
            stopGenerationPolling();
            setGeneratedVideoUrl(s.videoUrl);
            setStageLabel("Concluído");
            setProgress(100);
            setDone(true);
            setGenerating(false);
            toast.success("Vídeo gerado com sucesso.");
          }
        } catch (err) {
          stopGenerationPolling();
          const msg = err instanceof Error ? err.message : "Erro ao consultar status.";
          setGenerationError(msg);
          setStageLabel("Falhou");
          setGenerating(false);
          toast.error(msg);
        }
      }, 3000);
    } catch (err) {
      stopGenerationPolling();
      const msg = err instanceof Error ? err.message : "Falha ao iniciar geração.";
      setGenerationError(msg);
      setStageLabel("Falhou");
      setGenerating(false);
      toast.error(msg);
    }
  }, [
    canGenerate,
    videoStoragePath,
    state,
    createUploadFn,
    startLumaFn,
    getLumaStatusFn,
    stopGenerationPolling,
  ]);



  // ---------- Connection lines ----------
  const order: BlockId[] = ["video", "scene", "model", "color", "generate"];
  const connections = useMemo(() => {
    return order.slice(0, -1).map((id, i) => {
      const a = layout[id];
      const b = layout[order[i + 1]];
      const x1 = a.x + BLOCK_W;
      const y1 = a.y + BLOCK_H / 2;
      const x2 = b.x;
      const y2 = b.y + BLOCK_H / 2;
      const mx = (x1 + x2) / 2;
      return {
        key: `${id}->${order[i + 1]}`,
        d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
        active: complete[id],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, complete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Pipeline fixo: vídeo → cenário → IA → LUTs → gerar. Arraste os blocos para reorganizar o canvas.
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reorganizar
        </Button>
      </div>

      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{
          minHeight: 700,
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Connection lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {connections.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke={c.active ? "var(--primary)" : "var(--border)"}
              strokeWidth={2}
              strokeDasharray={c.active ? "0" : "6 6"}
            />
          ))}
        </svg>

        {/* Blocks */}
        <BlockShell
          id="video"
          title="1. Upload de vídeo"
          icon={<Film className="h-4 w-4" />}
          layout={layout}
          complete={complete.video}
          dragging={dragging}
          onPointerDown={onPointerDown("video")}
          onPointerMove={onPointerMove("video")}
          onPointerUp={onPointerUp}
        >
          {state.videoUrl ? (
            <div className="space-y-2">
              <div
                className="mx-auto overflow-hidden rounded-md bg-black"
                style={{ aspectRatio: videoAspect ?? 9 / 16, maxHeight: 360, width: videoAspect && videoAspect > 1 ? "100%" : "auto", height: videoAspect && videoAspect <= 1 ? 360 : undefined }}
              >
                <video
                  src={state.videoUrl}
                  controls
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) setVideoAspect(v.videoWidth / v.videoHeight);
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{state.videoFile?.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={resetVideoBlock}
                  disabled={transcriptionStatus === "uploading" || transcriptionStatus === "transcribing"}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {transcriptionStatus === "uploading" && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-1.5" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Enviando…</span>
                    <span className="tabular-nums">{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
              )}

              {transcriptionStatus === "transcribing" && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Transcrevendo áudio…
                </div>
              )}

              {transcriptionStatus === "ready" && transcription && (
                <div className="space-y-1.5 rounded-md border border-primary/30 bg-primary/5 p-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>Transcrição{transcription.language ? ` · ${transcription.language}` : ""}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        navigator.clipboard.writeText(transcription.text);
                        toast.success("Transcrição copiada.");
                      }}
                      title="Copiar transcrição completa"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="max-h-24 overflow-auto whitespace-pre-wrap text-[11px] leading-snug text-foreground">
                    {transcription.text || "(sem texto detectado)"}
                  </div>
                </div>
              )}

              {transcriptionStatus === "error" && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span className="flex-1">{transcriptionError ?? "Erro na transcrição."}</span>
                </div>
              )}
            </div>
          ) : (
            <FileDropzone
              accept="video/mp4,video/quicktime,video/webm"
              onFile={handleVideo}
              hint="MP4, MOV ou WEBM (até 500MB)"
              icon={<Upload className="h-5 w-5" />}
            />
          )}

        </BlockShell>

        <BlockShell
          id="scene"
          title="2. Cenário"
          icon={<ImageIcon className="h-4 w-4" />}
          layout={layout}
          complete={complete.scene}
          dragging={dragging}
          onPointerDown={onPointerDown("scene")}
          onPointerMove={onPointerMove("scene")}
          onPointerUp={onPointerUp}
        >
          <div className="space-y-2">
            <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, sceneMode: "image" }))}
                className={cn(
                  "flex-1 rounded px-2 py-1 transition",
                  state.sceneMode === "image" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                <ImageIcon className="mr-1 inline h-3 w-3" /> Imagem
              </button>
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, sceneMode: "prompt" }))}
                className={cn(
                  "flex-1 rounded px-2 py-1 transition",
                  state.sceneMode === "prompt" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                <Type className="mr-1 inline h-3 w-3" /> Prompt
              </button>
            </div>
            {state.sceneMode === "image" ? (
              state.sceneImageUrl ? (
                <div className="space-y-1">
                  <img src={state.sceneImageUrl} alt="Cenário" className="h-28 w-full rounded-md object-cover" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full text-xs"
                    onClick={() => {
                      if (state.sceneImageUrl) URL.revokeObjectURL(state.sceneImageUrl);
                      setState((s) => ({ ...s, sceneImage: null, sceneImageUrl: null }));
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <FileDropzone
                  accept="image/jpeg,image/png,image/webp"
                  onFile={handleSceneImage}
                  hint="JPG, PNG ou WEBP (até 10MB)"
                  icon={<ImageIcon className="h-5 w-5" />}
                  compact
                />
              )
            ) : (
              <div className="space-y-1">
                <Textarea
                  value={state.scenePrompt}
                  onChange={(e) =>
                    setState((s) => ({ ...s, scenePrompt: e.target.value.slice(0, 500) }))
                  }
                  placeholder="Praia ao pôr-do-sol, tons quentes…"
                  className="h-24 resize-none text-xs"
                />
                <div className="text-right text-[10px] text-muted-foreground">
                  {state.scenePrompt.length}/500
                </div>
              </div>
            )}
          </div>
        </BlockShell>

        <BlockShell
          id="model"
          title="3. Modelo de IA"
          icon={<Sparkles className="h-4 w-4" />}
          layout={layout}
          complete={complete.model}
          dragging={dragging}
          onPointerDown={onPointerDown("model")}
          onPointerMove={onPointerMove("model")}
          onPointerUp={onPointerUp}
        >
          <RadioGroup
            value={state.model ?? ""}
            onValueChange={(v) => setState((s) => ({ ...s, model: v as ModelOption }))}
            className="space-y-1.5"
          >
            {MODEL_OPTIONS.map((m) => (
              <Label
                key={m.value}
                htmlFor={`model-${m.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-xs transition",
                  state.model === m.value && "border-primary bg-primary/5",
                )}
              >
                <RadioGroupItem id={`model-${m.value}`} value={m.value} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between font-medium">
                    <span>{m.name}</span>
                    <span className="text-[10px] text-muted-foreground">{m.eta}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </BlockShell>

        <BlockShell
          id="color"
          title="4. LUTs e cor"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          layout={layout}
          complete={complete.color}
          dragging={dragging}
          onPointerDown={onPointerDown("color")}
          onPointerMove={onPointerMove("color")}
          onPointerUp={onPointerUp}
        >
          <div className="space-y-2 text-xs">
            {(["contrast", "saturation", "temperature"] as const).map((key) => {
              const label =
                key === "contrast" ? "Contraste" : key === "saturation" ? "Saturação" : "Temperatura";
              const value = state[key];
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums">{value > 0 ? `+${value}` : value}</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(v) => setState((s) => ({ ...s, [key]: v[0] }))}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {LUTS.map((l) => (
                <button
                  type="button"
                  key={l.name}
                  onClick={() => setState((s) => ({ ...s, lut: l.name }))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border border-border p-1 text-[10px] transition",
                    state.lut === l.name && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="h-5 w-full rounded" style={{ background: l.gradient }} />
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </BlockShell>

        <BlockShell
          id="generate"
          title="5. Gerar"
          icon={<Play className="h-4 w-4" />}
          layout={layout}
          complete={complete.generate}
          dragging={dragging}
          onPointerDown={onPointerDown("generate")}
          onPointerMove={onPointerMove("generate")}
          onPointerUp={onPointerUp}
        >
          <div className="space-y-3">
            {!done && (
              <p className="text-xs text-muted-foreground">
                Confirme as etapas anteriores e inicie a geração com Luma Ray2.
              </p>
            )}
            {!done && (
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Gerar vídeo
                  </>
                )}
              </Button>
            )}
            {(generating || done) && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{stageLabel}</span>
                  <span className="tabular-nums">{Math.round(progress)}%</span>
                </div>
              </div>
            )}
            {generationError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="flex-1">{generationError}</span>
              </div>
            )}
            {done && generatedVideoUrl && (
              <div className="space-y-2">
                <video
                  src={generatedVideoUrl}
                  controls
                  className="h-32 w-full rounded-md bg-black object-contain"
                />
                <div className="grid grid-cols-1 gap-1.5">
                  <Button
                    asChild
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <a href={generatedVideoUrl} download="video-gerado.mp4" target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-3 w-3" />
                      Baixar MP4
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      const url = `/studio/video-editor?src=${encodeURIComponent(generatedVideoUrl)}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Scissors className="mr-1.5 h-3 w-3" />
                    Editar cortes e legendas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => toast.info("Envio ao cliente: em breve.")}
                  >
                    <Send className="mr-1.5 h-3 w-3" />
                    Enviar ao cliente
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-full text-[11px]"
                  onClick={() => {
                    setDone(false);
                    setGeneratedVideoUrl(null);
                    setProgress(0);
                    setStageLabel("");
                  }}
                >
                  Gerar novamente
                </Button>
              </div>
            )}
          </div>

        </BlockShell>
      </div>
    </div>
  );
}

// ---------- Block shell ----------
function BlockShell({
  id,
  title,
  icon,
  children,
  layout,
  complete,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  id: BlockId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  layout: Layout;
  complete: boolean;
  dragging: BlockId | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  const pos = layout[id];
  const isDragging = dragging === id;
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "absolute rounded-xl border bg-card shadow-sm transition-shadow",
        isDragging ? "cursor-grabbing shadow-lg" : "cursor-grab",
        complete ? "border-primary/50" : "border-border",
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: BLOCK_W,
        minHeight: BLOCK_H,
        touchAction: "none",
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        {complete && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ---------- Dropzone ----------
function FileDropzone({
  accept,
  onFile,
  hint,
  icon,
  compact,
}: {
  accept: string;
  onFile: (file: File | null) => void;
  hint: string;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-center transition",
        compact ? "h-24 p-2 text-[11px]" : "h-32 p-3 text-xs",
        hover && "border-primary bg-primary/5",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">Arraste ou clique</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </label>
  );
}

// ---------- Upload helper (XHR for progress) ----------
async function uploadWithProgress({
  bucket,
  path,
  token,
  file,
  onProgress,
}: {
  bucket: string;
  path: string;
  token: string;
  file: File;
  onProgress: (pct: number) => void;
}) {
  // Use the supabase-js signed upload URL flow via fetch with progress.
  // The signed upload uses a special PUT endpoint; supabase-js does it via
  // uploadToSignedUrl, but that lacks progress events. So we replicate it
  // with XHR.
  const { data: sessionData } = await supabase.auth.getSession();
  const baseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
  const url = `${baseUrl}/storage/v1/object/upload/sign/${bucket}/${path}?token=${encodeURIComponent(token)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    if (sessionData.session?.access_token) {
      xhr.setRequestHeader("authorization", `Bearer ${sessionData.session.access_token}`);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload falhou (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error("Falha de rede no upload."));
    xhr.send(file);
  });
}

