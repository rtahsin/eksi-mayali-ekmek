-- 022_smoke.sql — 022_media_bucket duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
BEGIN;
DO $$
BEGIN
  -- 1) Bucket varlığı ve özellikleri
  ASSERT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media' AND public = true
  ), 'media bucket bulunamadı veya public değil';

  -- 2) RLS politikaları varlığı
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_public_select'
  ), 'media_public_select politikası bulunamadı';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_admin_insert'
  ), 'media_admin_insert politikası bulunamadı';

  RAISE NOTICE '022 smoke OK';
END $$;
ROLLBACK;
