// deno-lint-ignore-file no-explicit-any
// Shared helper: gera imagem via fal.ai (FLUX 1.1 [pro]).
// Retorna data URL base64 (compatível com o resto do pipeline) ou null em caso de falha.

type AspectRatio = "4:5" | "1:1" | "9:16" | "3:4";

// FLUX.2 [klein] aceita enums OU { width, height }. Para 4:5 e 3:4 não há
// enum exato, então passamos dimensões customizadas.
function mapImageSize(ar: AspectRatio | undefined): string | { width: number; height: number } {
  switch (ar) {
    case "1:1": return "square_hd";
    case "9:16": return "portrait_16_9";
    case "3:4": return { width: 1024, height: 1365 };
    case "4:5":
    default:
      return { width: 1024, height: 1280 };
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
        // Desligamos o safety checker do FAL aqui porque ele estava devolvendo
        // imagens pretas sólidas como "sucesso" para prompts editoriais
        // perfeitamente legítimos (ex.: yoga, lifestyle). A moderação real é
        // feita pelo gateway/Lovable AI quando houver fallback.
        enable_safety_checker: false,
        output_format: "jpeg",
        safety_tolerance: "6",
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
    const nsfwFlags: any[] = Array.isArray(data?.has_nsfw_concepts) ? data.has_nsfw_concepts : [];
    if (nsfwFlags.some(Boolean)) {
      console.warn("[fal-image] nsfw_blocked_by_safety_checker — returning null so caller can fallback");
      return null;
    }
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

    // Heurística anti-imagem-em-branco: imagens preto-sólido / placeholder
    // do safety checker do FAL costumam ter byte-payload extremamente uniforme
    // (sequência longa do mesmo byte). Detectamos isso amostrando o buffer.
    if (isLikelyBlankImage(buf)) {
      console.warn("[fal-image] suspect_blank_image — discarding, caller should fallback", {
        bytes: buf.length,
        contentType,
      });
      return null;
    }

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

/**
 * Heurística rápida para detectar imagens "blank"/sólidas que algumas engines
 * (ex.: FAL com safety checker disparado) devolvem como placeholder preto.
 *
 * Estratégia:
 * - Amostra ~256 bytes do payload em posições espalhadas.
 * - Se quase todos os bytes amostrados forem o mesmo valor (>95%), tratamos
 *   como imagem provavelmente uniforme/inutilizável e descartamos.
 * - Também descartamos imagens muito pequenas (provavelmente erro/placeholder).
 */
export function isLikelyBlankImage(buf: Uint8Array): boolean {
  if (!buf || buf.length < 2_000) return true;

  const samples = 256;
  // Pula um possível header (PNG/JPEG) para evitar viés.
  const start = Math.min(2048, Math.floor(buf.length * 0.05));
  const end = buf.length - 32;
  if (end <= start) return false;

  const counts = new Map<number, number>();
  for (let i = 0; i < samples; i++) {
    const idx = start + Math.floor(((end - start) * i) / samples);
    const v = buf[idx];
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let topByte = 0;
  let topCount = 0;
  for (const [b, c] of counts) {
    if (c > topCount) {
      topCount = c;
      topByte = b;
    }
  }
  const ratio = topCount / samples;
  if (ratio >= 0.95) {
    console.warn("[fal-image] blank_check uniform_bytes", { topByte, ratio });
    return true;
  }
  return false;
}
