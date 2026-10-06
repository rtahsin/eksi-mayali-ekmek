-- ==============================================================================
-- 022_media_bucket.sql — Medya saklama alanı (storage.buckets / storage.objects).
-- Ekleyici migration: admin yazma, herkese açık okuma.
-- ==============================================================================
BEGIN;

-- 1) 'media' storage bucket'ı oluştur (herkese açık okuma)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760, -- 10MB
  ARRAY['image/webp', 'image/avif', 'image/png', 'image/jpeg', 'image/svg+xml', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/webp', 'image/avif', 'image/png', 'image/jpeg', 'image/svg+xml', 'video/mp4'];

-- 2) RLS Politikaları (storage.objects üzerinde)
-- Okuma: Herkese açık (anon, authenticated, public)
DROP POLICY IF EXISTS "media_public_select" ON storage.objects;
CREATE POLICY "media_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Yazma / Değiştirme / Silme: Yalnızca admin / superadmin (veya service_role)
DROP POLICY IF EXISTS "media_admin_insert" ON storage.objects;
CREATE POLICY "media_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;
CREATE POLICY "media_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;
CREATE POLICY "media_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

-- 3) Migration kaydı
INSERT INTO public.app_migrations (id) VALUES ('022_media_bucket') ON CONFLICT DO NOTHING;

COMMIT;
