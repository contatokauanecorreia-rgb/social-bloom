// Cliente para Google Fonts Developer API
// A chave é de browser (restrinja por HTTP referrer no Google Cloud Console).

const GOOGLE_FONTS_API_KEY = "AIzaSyDwR6s4pd9l3Umcqbz8bN4ZoOqS_kufj-A";
const CATALOG_URL = `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`;
const CACHE_KEY = "google-fonts-catalog-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type GoogleFontCategory =
  | "serif"
  | "sans-serif"
  | "display"
  | "handwriting"
  | "monospace";

export type GoogleFontItem = {
  family: string;
  category: GoogleFontCategory;
  variants: string[];
  subsets: string[];
};

export type FontPair = {
  heading: string;
  body: string;
  label: string;
};

let memoryCache: GoogleFontItem[] | null = null;
let inflight: Promise<GoogleFontItem[]> | null = null;

export async function fetchGoogleFontsCatalog(): Promise<GoogleFontItem[]> {
  if (memoryCache) return memoryCache;
  if (inflight) return inflight;

  // sessionStorage cache
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; items: GoogleFontItem[] };
        if (Date.now() - parsed.ts < CACHE_TTL_MS && Array.isArray(parsed.items)) {
          memoryCache = parsed.items;
          return memoryCache;
        }
      }
    } catch {
      /* ignore */
    }
  }

  inflight = (async () => {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`Google Fonts API: ${res.status}`);
    const json = (await res.json()) as { items: GoogleFontItem[] };
    const items = (json.items ?? []).map((it) => ({
      family: it.family,
      category: it.category as GoogleFontCategory,
      variants: it.variants ?? [],
      subsets: it.subsets ?? [],
    }));
    memoryCache = items;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
      } catch {
        /* ignore quota */
      }
    }
    return items;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function searchFonts(
  catalog: GoogleFontItem[],
  query: string,
  categories: GoogleFontCategory[],
  limit = 60,
): GoogleFontItem[] {
  const q = query.trim().toLowerCase();
  const out: GoogleFontItem[] = [];
  for (const f of catalog) {
    if (categories.length > 0 && !categories.includes(f.category)) continue;
    if (q && !f.family.toLowerCase().includes(q)) continue;
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Sugestões inteligentes ----------

export type DnaForFonts = {
  archetype: string | null;
  toneOfVoice: string | null;
  targetAudience: string | null;
  contentPillars: string[];
  businessDescription: string | null;
};

type Profile = {
  headingCats: GoogleFontCategory[];
  bodyCats: GoogleFontCategory[];
  // famílias preferidas (se existirem no catálogo, priorizamos)
  preferredHeading: string[];
  preferredBody: string[];
};

const ARCHETYPE_PROFILES: Record<string, Profile> = {
  governante: {
    headingCats: ["serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Playfair Display", "Cormorant Garamond", "Cormorant", "Libre Bodoni", "Bodoni Moda"],
    preferredBody: ["Inter", "DM Sans", "Manrope"],
  },
  sabio: {
    headingCats: ["serif"],
    bodyCats: ["sans-serif", "serif"],
    preferredHeading: ["Lora", "Merriweather", "Source Serif Pro", "Spectral"],
    preferredBody: ["Inter", "Source Sans 3", "Source Sans Pro", "Roboto"],
  },
  amante: {
    headingCats: ["serif", "display"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Cormorant Garamond", "Italiana", "Playfair Display"],
    preferredBody: ["Lato", "Manrope", "DM Sans"],
  },
  "cara-comum": {
    headingCats: ["sans-serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Nunito", "Quicksand", "Rubik"],
    preferredBody: ["Open Sans", "Inter", "Lato"],
  },
  cuidador: {
    headingCats: ["sans-serif", "serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Raleway", "Quicksand", "Nunito", "Cormorant"],
    preferredBody: ["Lato", "Open Sans", "Inter"],
  },
  inocente: {
    headingCats: ["sans-serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Quicksand", "Nunito", "Comfortaa"],
    preferredBody: ["Open Sans", "Lato", "Inter"],
  },
  bobo: {
    headingCats: ["display", "handwriting"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Fredoka", "Pacifico", "Caveat", "Bungee"],
    preferredBody: ["Nunito", "Inter", "Open Sans"],
  },
  heroi: {
    headingCats: ["display", "sans-serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Bebas Neue", "Oswald", "Anton", "Archivo Black"],
    preferredBody: ["Inter", "Roboto", "Manrope"],
  },
  "fora-da-lei": {
    headingCats: ["display"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Anton", "Bebas Neue", "Staatliches", "Bungee"],
    preferredBody: ["Inter", "Roboto Mono", "Space Grotesk"],
  },
  criador: {
    headingCats: ["display", "serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Space Grotesk", "Fraunces", "Syne", "DM Serif Display"],
    preferredBody: ["Inter", "DM Sans", "Manrope"],
  },
  mago: {
    headingCats: ["serif", "display"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Cinzel", "Marcellus", "Cormorant Garamond"],
    preferredBody: ["Manrope", "Inter", "DM Sans"],
  },
  explorador: {
    headingCats: ["sans-serif", "serif"],
    bodyCats: ["sans-serif"],
    preferredHeading: ["Outfit", "Work Sans", "Archivo", "Fraunces"],
    preferredBody: ["Inter", "DM Sans", "Lato"],
  },
};

const DEFAULT_PROFILE: Profile = {
  headingCats: ["sans-serif", "serif"],
  bodyCats: ["sans-serif"],
  preferredHeading: ["Inter", "DM Sans", "Manrope", "Outfit", "Work Sans"],
  preferredBody: ["Inter", "DM Sans", "Manrope"],
};

function pick(catalog: GoogleFontItem[], preferred: string[], cats: GoogleFontCategory[], used: Set<string>, n: number) {
  const have = new Map(catalog.map((c) => [c.family, c]));
  const out: GoogleFontItem[] = [];
  for (const name of preferred) {
    const c = have.get(name);
    if (c && !used.has(c.family)) {
      out.push(c);
      used.add(c.family);
      if (out.length >= n) return out;
    }
  }
  for (const c of catalog) {
    if (out.length >= n) break;
    if (!cats.includes(c.category)) continue;
    if (used.has(c.family)) continue;
    out.push(c);
    used.add(c.family);
  }
  return out;
}

export function pickSuggestedPairs(
  catalog: GoogleFontItem[],
  dna: DnaForFonts,
  count = 5,
): FontPair[] {
  const archetype = (dna.archetype ?? "").toLowerCase();
  const profile = ARCHETYPE_PROFILES[archetype] ?? DEFAULT_PROFILE;

  const usedHeading = new Set<string>();
  const usedBody = new Set<string>();

  const headings = pick(catalog, profile.preferredHeading, profile.headingCats, usedHeading, count + 2);
  const bodies = pick(catalog, profile.preferredBody, profile.bodyCats, usedBody, count + 2);

  const pairs: FontPair[] = [];
  for (let i = 0; i < count; i++) {
    const h = headings[i % headings.length];
    const b = bodies[i % bodies.length];
    if (!h || !b) break;
    pairs.push({
      heading: h.family,
      body: b.family,
      label: `${h.family} + ${b.family}`,
    });
  }
  return pairs;
}
