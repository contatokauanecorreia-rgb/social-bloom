// Deterministic color picker for free-text tags.
// Same label always gets the same color.

const PALETTE = [
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-lime-100 text-lime-800 border-lime-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
];

export function tagColor(label: string): string {
  const normalized = label.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
