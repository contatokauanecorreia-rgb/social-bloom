
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-workflow-inputs',
  'video-workflow-inputs',
  false,
  524288000, -- 500 MB
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "vwi_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'video-workflow-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vwi_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'video-workflow-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vwi_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'video-workflow-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vwi_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'video-workflow-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);
