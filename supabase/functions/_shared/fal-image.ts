// deno-lint-ignore-file no-explicit-any
// Shared helper: gera imagem via fal.ai (FLUX 1.1 [pro]).
// Retorna data URL base64 (compatível com o resto do pipeline) ou null em caso de falha.

type AspectRatio = "4:5" | "1:1" | "9:16" | "3:4";

function mapImageSize(ar: AspectRatio | undefined): string {
  switch (ar) {
    case "1:1": return "square_hd";
    case "9:16": return "portrait_16_9";
    case "3:4":
    case "4:5":
    default:
      return "portrait_4_3";
  }
}

export async function generateWithFal(
  prompt: string,
  opts: { apiKey: string; aspectRatio?: AspectRatio; timeoutMs?: number },
): Promise<string | null> {
  const { apiKey, aspectRatio = "4:5", timeoutMs = 45_000 } = opts;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch("https://fal.run/fal-ai/flux-pro/v1.1", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: mapImageSize(aspectRatio),
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
        safety_tolerance: "2",
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("[fal-image] http_error", { status: resp.status, body: t.slice(0, 300) });
      return null;
    }

    const data: any = await resp.json();
    const url: string | undefined = data?.images?.[0]?.url;
    if (!url || typeof url !== "string") {
      console.error("[fal-image] no_url_in_response", { keys: Object.keys(data ?? {}) });
      return null;
    }

    // Baixa a imagem e converte para data URL base64
    const imgResp = await fetch(url);
    if (!imgResp.ok) {
      console.error("[fal-image] image_fetch_failed", { status: imgResp.status });
      return null;
    }
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await imgResp.arrayBuffer());

    // Base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    return `data:${contentType};base64,${b64}`;
  } catch (e) {
    console.error("[fal-image] exception", String(e));
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
