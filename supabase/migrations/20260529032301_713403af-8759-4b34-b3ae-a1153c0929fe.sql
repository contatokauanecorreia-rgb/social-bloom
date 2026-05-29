UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4','video/quicktime','video/webm','video/x-matroska',
  'image/jpeg','image/png','image/webp'
]
WHERE id = 'video-workflow-inputs';