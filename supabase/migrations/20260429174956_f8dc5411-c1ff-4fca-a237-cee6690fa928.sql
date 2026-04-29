-- Add brand font fields to client_briefings
ALTER TABLE public.client_briefings
  ADD COLUMN IF NOT EXISTS brand_font text,
  ADD COLUMN IF NOT EXISTS brand_font_url text;

-- Create public bucket for brand assets (fonts, background images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for brand-assets
CREATE POLICY "Brand assets are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Authenticated users can upload to their own folder (path prefix = auth.uid())
CREATE POLICY "Users can upload their own brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);