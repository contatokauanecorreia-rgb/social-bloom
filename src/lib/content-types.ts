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
  title: string;
  tags: string[];
  notes: string | null;
  status: PostStatus;
  position: number;
};
