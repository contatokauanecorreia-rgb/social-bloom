// Carrega fontes da marca em runtime (Google Fonts via <link> ou arquivo custom via FontFace API)

const loadedGoogle = new Set<string>();
const loadedCustom = new Set<string>();

export function isGoogleFontName(font: string) {
  // Heurística: se não tem URL associada, tratamos como Google Font.
  return !!font && !font.startsWith("http");
}

export function loadGoogleFont(family: string) {
  if (typeof document === "undefined") return;
  if (!family || loadedGoogle.has(family)) return;
  loadedGoogle.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export async function loadCustomFont(family: string, url: string) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const key = `${family}::${url}`;
  if (loadedCustom.has(key)) return;
  loadedCustom.add(key);
  try {
    const face = new FontFace(family, `url(${url})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
  } catch (err) {
    console.warn("Falha ao carregar fonte custom", err);
  }
}

export function ensureBrandFont(font: string | null, url: string | null) {
  if (!font) return;
  if (url) {
    loadCustomFont(font, url);
  } else {
    loadGoogleFont(font);
  }
}

export function brandFontFamily(font: string | null) {
  if (!font) return "inherit";
  return `"${font}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
}
