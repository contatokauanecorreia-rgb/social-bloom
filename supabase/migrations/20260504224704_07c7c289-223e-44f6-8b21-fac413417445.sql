CREATE TABLE public.carousel_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  font_pair JSONB,
  palette TEXT[] NOT NULL DEFAULT '{}',
  layout JSONB,
  overlay JSONB,
  signature JSONB,
  image_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.carousel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carousel templates"
ON public.carousel_templates FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carousel templates"
ON public.carousel_templates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carousel templates"
ON public.carousel_templates FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_carousel_templates_client ON public.carousel_templates(client_id, created_at DESC);