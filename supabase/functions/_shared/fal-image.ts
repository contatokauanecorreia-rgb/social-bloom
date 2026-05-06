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

/**
 * Detecta se o "prompt visual" recebido é, na verdade, copy de carrossel
 * (texto do Planner, slides, bullets, CTA, etc.). Quando é, devolvemos um
 * fallback puramente visual em vez de mandar copy para o modelo de imagem.
 */
export function looksLikeCopyNotImagePrompt(s: string): boolean {
  if (!s) return false;
  const txt = s.trim();
  if (txt.length > 600) return true;
  const newlines = (txt.match(/\n/g) || []).length;
  if (newlines >= 3) return true;
  if (/\bSLIDE\s*\d/i.test(txt)) return true;
  if (/(^|\n)\s*[-•·]\s+/.test(txt)) return true;
  if (/\bCTA\b/i.test(txt)) return true;
  if (/\bsub:\s/i.test(txt)) return true;
  // muitas palavras em português é sinal de copy, não de descrição visual
  const ptHits = (txt.match(/\b(você|seu|sua|para|sobre|porque|então|aqui|agora|hoje)\b/gi) || []).length;
  if (ptHits >= 4) return true;
  return false;
}

/**
 * Quando o prompt está contaminado por copy, devolve uma descrição visual
 * curta e segura, sem texto. Mantém pista de marca quando disponível.
 */
export function fallbackVisualPrompt(opts: {
  archetype?: string | null;
  segment?: string | null;
  imageStyle?: string | null;
}): string {
  const style = opts.imageStyle?.trim() || "editorial photography, instagram feed aesthetic";
  const seg = opts.segment?.trim() ? `, brand segment: ${opts.segment.trim()}` : "";
  const arc = opts.archetype?.trim() ? `, brand archetype: ${opts.archetype.trim()}` : "";
  return `${style}${seg}${arc}, candid lifestyle scene with natural soft lighting, calm atmosphere, neutral color palette, vertical 4:5 composition, purely visual photographic content`;
}

/**
 * Reescreve uma "nota visual" para reduzir a chance de o modelo de imagem
 * desenhar texto, letras ou tipografia na cena.
 *
 * - Substitui objetos que naturalmente carregam texto (livro, jornal, tela, placa…)
 *   por versões neutras ("blank", "closed", "off").
 * - Anexa uma instrução final reforçando "no text".
 */
export function sanitizeImageNote(note: string): string {
  if (!note || !note.trim()) return note;
  let s = note;
  let touched = false;

  const replacements: Array<[RegExp, string]> = [
    // EN
    [/\b(an?\s+)?open\s+book\b/gi, "$1closed book with a plain blank cover"],
    [/\bbooks?\b/gi, "closed books with plain blank covers"],
    [/\b(magazines?|newspapers?|journals?|notebooks?|notepads?)\b/gi, "blank-paged $1"],
    [/\b(screens?|monitors?|displays?|laptops?|phones?|tablets?|tvs?|televisions?)\b/gi, "$1 (powered off, dark screen)"],
    [/\b(signs?|signage|billboards?|posters?|banners?|placards?)\b/gi, "blank unmarked $1"],
    [/\b(labels?|tags?|stickers?|business\s+cards?|menus?|brochures?|flyers?|documents?)\b/gi, "blank $1"],
    [/\b(packaging|boxes?|bottles?|cans?|jars?)\s+(with\s+)?(brand|label|text|logo)[^.,;]*/gi, "plain unbranded $1"],
    [/\bwriting\s+on\b/gi, "blank surface on"],
    [/\btattoos?\b/gi, "abstract non-textual tattoos"],
    [/\b(t-?shirts?|shirts?|hoodies?|caps?|hats?|clothing)\s+(with\s+)?(logo|text|writing|print)[^.,;]*/gi, "plain unbranded $1"],
    [/\b(text|letters?|words?|captions?|typography|watermarks?|logos?\s+with\s+text)\b/gi, ""],
    // PT
    [/\blivros?\s+abertos?\b/gi, "livros fechados de capa lisa em branco"],
    [/\blivros?\b/gi, "livros fechados de capa lisa em branco"],
    [/\b(revistas?|jornais?|cadernos?|blocos?\s+de\s+notas?)\b/gi, "$1 com páginas em branco"],
    [/\b(telas?|monitores?|computadores?|notebooks?|celulares?|tablets?|televis(ões|ao)|tvs?)\b/gi, "$1 desligadas"],
    [/\b(placas?|cartazes?|outdoors?|banners?|letreiros?)\b/gi, "$1 em branco sem texto"],
    [/\b(etiquetas?|adesivos?|cart(ões|ao)\s+de\s+visita|menus?|cardápios?|panfletos?|documentos?)\b/gi, "$1 em branco"],
    [/\b(texto|letras?|palavras?|legendas?|tipografia|marca\s+d['’]?[áa]gua|logos?\s+com\s+texto)\b/gi, ""],
  ];

  for (const [re, rep] of replacements) {
    if (re.test(s)) {
      touched = true;
      s = s.replace(re, rep);
    }
  }

  s = s.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();

  const guard =
    " All books are closed with blank covers, all screens are off, all papers and signs are blank, no readable text or letters anywhere in the image.";
  if (!s.toLowerCase().includes("no readable text")) {
    s = s + (s.endsWith(".") ? "" : ".") + guard;
  }

  if (touched) {
    console.log("[sanitize] note_rewritten", { before: note.slice(0, 120), after: s.slice(0, 160) });
  }
  return s;
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
