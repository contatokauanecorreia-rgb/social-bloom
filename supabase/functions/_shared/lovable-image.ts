// deno-lint-ignore-file no-explicit-any
// Shared helper: gera imagem via Lovable AI Gateway (Google Nano Banana / Gemini image models).
// Retorna data URL base64 ou null em caso de falha (para o caller usar fallback).

import { isLikelyBlankImage } from "./fal-image.ts";

export type NanoBananaModel =
  | "google/gemini-3-pro-image-preview"      // Nano Banana Pro (alta qualidade)
  | "google/gemini-3.1-flash-image-preview"  // Nano Banana 2 (rápido, qualidade pro)
  | "google/gemini-2.5-flash-image";         // Nano Banana clássico (mais barato)

export async function generateWithNanoBanana(
  prompt: string,
  opts: {
    apiKey: string;
    model?: NanoBananaModel;
    timeoutMs?: number;
  },
): Promise<string | null> {
  const { apiKey, model = "google/gemini-3-pro-image-preview", timeoutMs = 60_000 } = opts;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      if (resp.status === 429) {
        console.warn("[nano-banana] rate_limited", { model });
      } else if (resp.status === 402) {
        console.warn("[nano-banana] payment_required", { model });
      } else {
        console.error("[nano-banana] http_error", { status: resp.status, model, body: t.slice(0, 300) });
      }
      return null;
    }

    const data: any = await resp.json();
    const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url || typeof url !== "string" || !url.startsWith("data:")) {
      console.error("[nano-banana] no_image_in_response", { model, keys: Object.keys(data ?? {}) });
      return null;
    }

    // Guard: detecta imagem em branco (mesma heurística usada no FAL)
    try {
      const commaIdx = url.indexOf(",");
      if (commaIdx > 0) {
        const b64 = url.slice(commaIdx + 1);
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        if (isLikelyBlankImage(buf)) {
          console.warn("[nano-banana] suspect_blank_image — discarding", { model, bytes: buf.length });
          return null;
        }
      }
    } catch {
      // se não conseguir decodificar para checar, segue com a URL mesmo assim
    }

    return url;
  } catch (e) {
    console.error("[nano-banana] exception", String(e));
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
