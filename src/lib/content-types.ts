export type PostStatus = "planned" | "published";

export type ContentWeek = {
  id: string;
  user_id: string;
  name: string;
  position: number;
};

export type ContentPost = {
  id: string;
  user_id: string;
  week_id: string;
  client_id: string | null;
  title: string;
  tags: string[];
  notes: string | null;
  caption: string | null;
  status: PostStatus;
  position: number;
};

// Deterministic HSL color from any string id, used to colorize client chips.
export function clientColorFromId(id: string): { bg: string; fg: string; border: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return {
    bg: `hsl(${hue} 80% 92%)`,
    fg: `hsl(${hue} 60% 30%)`,
    border: `hsl(${hue} 60% 70%)`,
  };
}
