
DROP FUNCTION IF EXISTS public.get_public_client_content(text);

CREATE TABLE IF NOT EXISTS public.post_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  approver_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.post_approvals TO authenticated;
GRANT ALL ON public.post_approvals TO service_role;
ALTER TABLE public.post_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can view approvals" ON public.post_approvals;
CREATE POLICY "Owners can view approvals"
  ON public.post_approvals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = post_approvals.client_id AND c.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  client_id uuid NOT NULL,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 1000),
  CONSTRAINT post_comments_name_len CHECK (author_name IS NULL OR char_length(author_name) <= 80)
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON public.post_comments(post_id, created_at DESC);
GRANT SELECT ON public.post_comments TO authenticated, anon;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can view comments" ON public.post_comments;
CREATE POLICY "Owners can view comments"
  ON public.post_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = post_comments.client_id AND c.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('approval','comment')),
  client_id uuid NOT NULL,
  post_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_client_content(p_slug text)
RETURNS TABLE (
  id uuid, title text, caption text, tags text[], created_at timestamptz,
  approved boolean, approver_name text, approved_at timestamptz, comments_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.caption, p.tags, p.created_at,
    (a.id IS NOT NULL), a.approver_name, a.created_at,
    COALESCE((SELECT count(*)::int FROM public.post_comments cm WHERE cm.post_id = p.id), 0)
  FROM public.content_posts p
  JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN public.post_approvals a ON a.post_id = p.id
  WHERE c.slug = p_slug AND p.status = 'published'
  ORDER BY p.position ASC, p.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_client_content(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_post_comments(p_slug text, p_post_id uuid)
RETURNS TABLE (id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.id, cm.author_name, cm.body, cm.created_at
  FROM public.post_comments cm
  JOIN public.content_posts p ON p.id = cm.post_id
  JOIN public.clients c ON c.id = p.client_id
  WHERE c.slug = p_slug AND cm.post_id = p_post_id
  ORDER BY cm.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_post_comments(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_post_approval(p_slug text, p_post_id uuid, p_author_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_id uuid; v_owner uuid; v_title text; v_clean_name text;
BEGIN
  v_clean_name := NULLIF(trim(coalesce(p_author_name, '')), '');
  IF v_clean_name IS NOT NULL AND char_length(v_clean_name) > 80 THEN RAISE EXCEPTION 'Nome muito longo'; END IF;
  SELECT c.id, c.user_id, p.title INTO v_client_id, v_owner, v_title
  FROM public.content_posts p JOIN public.clients c ON c.id = p.client_id
  WHERE c.slug = p_slug AND p.id = p_post_id AND p.status = 'published';
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Conteúdo não encontrado'; END IF;
  INSERT INTO public.post_approvals (post_id, client_id, approver_name)
  VALUES (p_post_id, v_client_id, v_clean_name) ON CONFLICT (post_id) DO NOTHING;
  INSERT INTO public.notifications (user_id, type, client_id, post_id, payload)
  VALUES (v_owner, 'approval', v_client_id, p_post_id, jsonb_build_object('title', v_title, 'author_name', v_clean_name));
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_post_approval(text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_post_comment(p_slug text, p_post_id uuid, p_author_name text, p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_id uuid; v_owner uuid; v_title text; v_clean_name text; v_clean_body text; v_id uuid;
BEGIN
  v_clean_name := NULLIF(trim(coalesce(p_author_name, '')), '');
  v_clean_body := trim(coalesce(p_body, ''));
  IF char_length(v_clean_body) < 1 OR char_length(v_clean_body) > 1000 THEN RAISE EXCEPTION 'Comentário deve ter entre 1 e 1000 caracteres'; END IF;
  IF v_clean_name IS NOT NULL AND char_length(v_clean_name) > 80 THEN RAISE EXCEPTION 'Nome muito longo'; END IF;
  SELECT c.id, c.user_id, p.title INTO v_client_id, v_owner, v_title
  FROM public.content_posts p JOIN public.clients c ON c.id = p.client_id
  WHERE c.slug = p_slug AND p.id = p_post_id AND p.status = 'published';
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Conteúdo não encontrado'; END IF;
  INSERT INTO public.post_comments (post_id, client_id, author_name, body)
  VALUES (p_post_id, v_client_id, v_clean_name, v_clean_body) RETURNING id INTO v_id;
  INSERT INTO public.notifications (user_id, type, client_id, post_id, payload)
  VALUES (v_owner, 'comment', v_client_id, p_post_id,
    jsonb_build_object('title', v_title, 'author_name', v_clean_name, 'preview', left(v_clean_body, 140)));
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_post_comment(text, uuid, text, text) TO anon, authenticated;
