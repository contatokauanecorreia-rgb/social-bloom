
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(coalesce(input, '')),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.clients_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := public.slugify(NEW.name);
    IF base = '' THEN base := 'cliente'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.clients WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_slug_trigger ON public.clients;
CREATE TRIGGER clients_set_slug_trigger
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_set_slug();

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM public.clients WHERE slug IS NULL LOOP
    base := public.slugify(r.name);
    IF base = '' THEN base := 'cliente'; END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.clients WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE public.clients SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_client(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  company text,
  avatar_url text,
  instagram text,
  website text,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, company, avatar_url, instagram, website, slug
  FROM public.clients
  WHERE slug = p_slug
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_client_content(p_slug text)
RETURNS TABLE (
  id uuid,
  title text,
  caption text,
  tags text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.caption, p.tags, p.created_at
  FROM public.content_posts p
  JOIN public.clients c ON c.id = p.client_id
  WHERE c.slug = p_slug AND p.status = 'published'
  ORDER BY p.position ASC, p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_client(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_content(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO anon, authenticated;
