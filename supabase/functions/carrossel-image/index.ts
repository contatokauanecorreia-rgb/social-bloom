// deno-lint-ignore-file no-explicit-any
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleStr = imageStyle && imageStyle.trim()
      ? `Visual style: ${imageStyle.trim()}.`
      : (archetype ? `Brand archetype: ${archetype}.` : "");
    const segStr = segment ? `Segment: ${segment}.` : "";
    const fullPrompt = `${prompt}. ${styleStr} ${segStr} Editorial, high quality, soft natural lighting, instagram feed aesthetic, vertical 4:5 composition.`;

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
      console.error("[carrossel-image] error", resp.status, t.slice(0, 200));
      const status = resp.status === 429 ? 429 : resp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ imageDataUrl: null, error: `AI ${resp.status}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const ok = typeof url === "string" && url.startsWith("data:");

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
