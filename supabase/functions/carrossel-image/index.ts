// deno-lint-ignore-file no-explicit-any
import {
  fallbackVisualPrompt,
  generateWithFal,
  looksLikeCopyNotImagePrompt,
  sanitizeImageNote,
} from "../_shared/fal-image.ts";

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
      visualSeed = fallbackVisualPrompt({ archetype, segment, imageStyle, topic: prompt });
    }

    const safePrompt = sanitizeImageNote(visualSeed);
    const styleStr = imageStyle && imageStyle.trim()
      ? `Visual style: ${imageStyle.trim()}.`
      : (archetype ? `Brand archetype: ${archetype}.` : "");
    const segStr = segment ? `Segment: ${segment}.` : "";
    const fullPrompt = `${safePrompt}. ${styleStr} ${segStr} Ultra-realistic editorial photography, shot on full-frame camera with 50mm prime lens, natural soft directional lighting, shallow depth of field with smooth bokeh, fine skin micro-texture, photographic grain, true-to-life colors, high optical sharpness, instagram feed aesthetic, vertical 4:5 composition, professional 2K quality. Anatomically correct hands with five fingers, realistic facial features, natural body proportions, no extra limbs, no distorted faces, no melted or warped features. No text, no letters, no captions, no logos, no watermarks anywhere in the image.`;

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");

    // ÚNICA ENGINE: FAL/FLUX 1.1 Pro — fotografia ultrarrealista.
    // Sem fallback: se falhar, retornamos null e o cliente pode regenerar.
    if (!FAL_API_KEY) {
      return new Response(JSON.stringify({ error: "FAL_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    console.warn("[carrossel-image] fal_failed_no_fallback");
    return new Response(JSON.stringify({ imageDataUrl: null }), {
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
