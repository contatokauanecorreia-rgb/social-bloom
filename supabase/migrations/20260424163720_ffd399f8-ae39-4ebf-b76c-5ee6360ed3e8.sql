-- Weeks (Kanban columns)
CREATE TABLE public.content_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weeks"
  ON public.content_weeks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weeks"
  ON public.content_weeks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weeks"
  ON public.content_weeks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weeks"
  ON public.content_weeks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_content_weeks_user_position
  ON public.content_weeks(user_id, position);

CREATE TRIGGER update_content_weeks_updated_at
  BEFORE UPDATE ON public.content_weeks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Posts (Kanban cards)
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_id UUID NOT NULL REFERENCES public.content_weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','published')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own posts"
  ON public.content_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON public.content_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.content_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.content_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_content_posts_user_week_position
  ON public.content_posts(user_id, week_id, position);

CREATE INDEX idx_content_posts_tags
  ON public.content_posts USING GIN(tags);

CREATE TRIGGER update_content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();