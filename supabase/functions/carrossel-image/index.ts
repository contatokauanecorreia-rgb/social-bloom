// deno-lint-ignore-file no-explicit-any
import { generateWithFal, sanitizeImageNote } from "../_shared/fal-image.ts";

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

    const safePrompt = sanitizeImageNote(prompt);
    const styleStr = imageStyle && imageStyle.trim()
      ? `Visual style: ${imageStyle.trim()}.`
      : (archetype ? `Brand archetype: ${archetype}.` : "");
    const segStr = segment ? `Segment: ${segment}.` : "";
    const fullPrompt = `Pure photographic image with absolutely no text, no letters, no words, no typography, no captions, no signs, no logos with text, no watermarks anywhere in the frame. ${safePrompt}. ${styleStr} ${segStr} Editorial, high quality, soft natural lighting, instagram feed aesthetic, vertical 4:5 composition. Pure photographic/visual content only — absolutely no text, no letters, no typography, no captions, no watermarks, no logos with text, no signs anywhere in the image. Final constraint: zero text, zero letters, zero typography in the final image — any book, screen, sign, paper or label visible must appear blank, closed, powered off, or out of focus.`;

    // 1) Tenta fal.ai (FLUX 1.1 [pro]) primeiro
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (FAL_API_KEY) {
      const falUrl = await generateWithFal(fullPrompt, {
        apiKey: FAL_API_KEY,
        aspectRatio: "4:5",
        timeoutMs: 45_000,
      });
      if (falUrl) {
        console.log("[carrossel-image] done_fal");
        return new Response(JSON.stringify({ imageDataUrl: falUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.warn("[carrossel-image] fal_failed_fallback_gemini");
    }

    // 2) Fallback Gemini
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Nenhuma engine de imagem configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("[carrossel-image] gemini_error", resp.status, t.slice(0, 200));
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ imageDataUrl: null, error: `AI ${resp.status}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const ok = typeof url === "string" && url.startsWith("data:");
    console.log("[carrossel-image] done_gemini", { ok });

    return new Response(JSON.stringify({ imageDataUrl: ok ? url : null }), {
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
