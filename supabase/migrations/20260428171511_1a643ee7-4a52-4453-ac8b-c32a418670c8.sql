-- CLIENTS
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  website TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients"
  ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients"
  ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients"
  ON public.clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clients_user_id ON public.clients(user_id);

-- CLIENT BRIEFINGS
CREATE TABLE public.client_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  business_description TEXT,
  target_audience TEXT,
  tone_of_voice TEXT,
  content_pillars TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  dos TEXT[] NOT NULL DEFAULT '{}',
  donts TEXT[] NOT NULL DEFAULT '{}',
  "references" TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client briefings"
  ON public.client_briefings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own client briefings"
  ON public.client_briefings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own client briefings"
  ON public.client_briefings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own client briefings"
  ON public.client_briefings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_client_briefings_updated_at
  BEFORE UPDATE ON public.client_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_briefings_user_id ON public.client_briefings(user_id);
CREATE INDEX idx_client_briefings_client_id ON public.client_briefings(client_id);