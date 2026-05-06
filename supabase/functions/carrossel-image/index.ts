// deno-lint-ignore-file no-explicit-any
import {
  fallbackVisualPrompt,
  generateWithFal,
  looksLikeCopyNotImagePrompt,
  sanitizeImageNote,
} from "../_shared/fal-image.ts";
import { generateWithNanoBanana } from "../_shared/lovable-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  prompt: string;
  archetype?: string | null;
  segment?: string | null;
  imageStyle?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, archetype, segment, imageStyle } = (await req.json()) as Body;
    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "Prompt vazio." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trava de segurança: se vier copy/texto do Planner em vez de descrição
    // visual, descartamos e usamos um prompt visual neutro.
    let visualSeed = prompt.trim();
    if (looksLikeCopyNotImagePrompt(visualSeed)) {
      console.warn("[carrossel-image] prompt_looked_like_copy, using fallback", {
        len: visualSeed.length,
        preview: visualSeed.slice(0, 120),
      });
      visualSeed = fallbackVisualPrompt({ archetype, segment, imageStyle });
    }

    const safePrompt = sanitizeImageNote(visualSeed);
    const styleStr = imageStyle && imageStyle.trim()
      ? `Visual style: ${imageStyle.trim()}.`
      : (archetype ? `Brand archetype: ${archetype}.` : "");
    const segStr = segment ? `Segment: ${segment}.` : "";
    // Prompt enxuto para FLUX: descrição visual primeiro, restrição de texto
    // mencionada uma única vez no final. Excesso de instrução negativa estava
    // colapsando o resultado para uma imagem preta sólida.
    const fullPrompt = `${safePrompt}. ${styleStr} ${segStr} Editorial photography, soft natural lighting, instagram feed aesthetic, vertical 4:5 composition, vibrant and well exposed. No text, no letters, no captions, no logos, no watermarks anywhere in the image.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");

    // 1) PRIMÁRIO: FAL/FLUX 1.1 Pro — fotografia ultrarrealista (escolha do usuário).
    if (FAL_API_KEY) {
      const falUrl = await generateWithFal(fullPrompt, {
        apiKey: FAL_API_KEY,
        aspectRatio: "4:5",
        timeoutMs: 60_000,
      });
      if (falUrl) {
        console.log("[carrossel-image] done_fal");
        return new Response(JSON.stringify({ imageDataUrl: falUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[carrossel-image] fal_failed_fallback_nano_banana");
    }

    // 2) FALLBACK técnico: Nano Banana Pro (só quando FLUX falhar).
    if (LOVABLE_API_KEY) {
      const nbUrl = await generateWithNanoBanana(fullPrompt, {
        apiKey: LOVABLE_API_KEY,
        model: "google/gemini-3-pro-image-preview",
        timeoutMs: 60_000,
      });
      if (nbUrl) {
        console.log("[carrossel-image] done_nano_banana_fallback");
        return new Response(JSON.stringify({ imageDataUrl: nbUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[carrossel-image] nano_banana_failed_fallback_gemini_flash");

      // 3) ÚLTIMO RECURSO: Gemini 2.5 flash-image
      const flashUrl = await generateWithNanoBanana(fullPrompt, {
        apiKey: LOVABLE_API_KEY,
        model: "google/gemini-2.5-flash-image",
        timeoutMs: 45_000,
      });
      console.log("[carrossel-image] done_gemini_flash", { ok: !!flashUrl });
      return new Response(JSON.stringify({ imageDataUrl: flashUrl ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Nenhuma engine de imagem configurada." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[carrossel-image] fatal", e);
    return new Response(
      JSON.stringify({ imageDataUrl: null, error: e instanceof Error ? e.message : "error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
