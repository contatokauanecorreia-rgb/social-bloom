ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS content_posts_client_id_idx
  ON public.content_posts (client_id);