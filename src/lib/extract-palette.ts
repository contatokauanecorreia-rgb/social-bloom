// Quantize an image into 3 dominant colors (HEX).
// Pure browser, no dependencies.

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function extractPalette(
  file: File,
): Promise<[string, string, string]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = 64;
    const h = 64;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const buckets = new Map<
      string,
      { r: number; g: number; b: number; n: number }
    >();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      // bucket of 32 (3 most-significant bits per channel)
      const br = data[i] & 0xe0;
      const bg = data[i + 1] & 0xe0;
      const bb = data[i + 2] & 0xe0;
      const key = `${br},${bg},${bb}`;
      const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      cur.r += data[i];
      cur.g += data[i + 1];
      cur.b += data[i + 2];
      cur.n += 1;
      buckets.set(key, cur);
    }

    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);

    const picked: { r: number; g: number; b: number }[] = [];
    for (const c of sorted) {
      const r = c.r / c.n;
      const g = c.g / c.n;
      const b = c.b / c.n;
      // distance check to keep variety
      const isDup = picked.some(
        (p) =>
          Math.abs(p.r - r) < 24 &&
          Math.abs(p.g - g) < 24 &&
          Math.abs(p.b - b) < 24,
      );
      if (!isDup) picked.push({ r, g, b });
      if (picked.length === 3) break;
    }
    while (picked.length < 3) picked.push({ r: 255, g: 255, b: 255 });

    return picked.map((c) => rgbToHex(c.r, c.g, c.b)) as [
      string,
      string,
      string,
    ];
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const ARCHETYPE_TONE: Record<string, string> = {
  inocente: "linguagem acolhedora, otimista e sem pressão",
  cuidador: "linguagem acolhedora, empática e sem pressão",
  heroi: "linguagem provocadora, desafiadora e motivacional",
  "fora-da-lei": "linguagem provocadora, disruptiva e direta",
  sabio: "linguagem de autoridade, premium e fundamentada",
  governante: "linguagem de autoridade, sofisticada e premium",
  bobo: "linguagem leve, próxima e com bom humor",
  "cara-comum": "linguagem leve, próxima e cotidiana",
  explorador: "linguagem aventureira, curiosa e independente",
  amante: "linguagem sensual, íntima e emocional",
  mago: "linguagem visionária, transformadora e inspiradora",
  criador: "linguagem criativa, imaginativa e original",
};
