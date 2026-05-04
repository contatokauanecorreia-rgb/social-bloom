// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SCREENSHOTONE_API_KEY");
    if (!apiKey) {
      console.warn("[screenshot-url] SCREENSHOTONE_API_KEY missing");
      return new Response(
        JSON.stringify({ imageDataUrl: null, error: "Screenshot service unavailable." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const params = new URLSearchParams({
      access_key: apiKey,
      url,
      format: "png",
      block_ads: "true",
      block_cookie_banners: "true",
      full_page: "false",
      viewport_width: "1280",
      viewport_height: "800",
      image_quality: "80",
      cache: "true",
    });

    const resp = await fetch(`https://api.screenshotone.com/take?${params.toString()}`);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[screenshot-url] api error", resp.status, t.slice(0, 200));
      return new Response(
        JSON.stringify({ imageDataUrl: null, error: `Screenshot API ${resp.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = new Uint8Array(await resp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const dataUrl = `data:image/png;base64,${b64}`;

    return new Response(JSON.stringify({ imageDataUrl: dataUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[screenshot-url] fatal", e);
    return new Response(
      JSON.stringify({ imageDataUrl: null, error: e instanceof Error ? e.message : "error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
