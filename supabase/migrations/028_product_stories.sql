-- ==============================================================================
-- 028_product_stories.sql — Ürün sayfasında "Nasıl yapılıyor" adımları.
-- ==============================================================================
-- NE ZAMAN: Kod birleşmeden ÖNCE (eklemeli; eski kod etkilenmez).
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/028_product_stories_smoke.sql.
--
-- İçerik:
--   1) product_stories: ürün başına sıralı adımlar (JSONB). Her adım: başlık, anlatım,
--      isteğe bağlı fotoğraf / kısa video (media bucket, urun/ klasörü) ya da YouTube
--      bağlantısı, isteğe bağlı Bilim odası anı. Yazan/okuyan yalnız sunucu.
--   2) media bucket: kısa klipler için dosya sınırı 10 MB → 50 MB; webm ve iPhone
--      .mov (video/quicktime) türleri eklenir. Dosyalar tarayıcıdan imzalı bağlantıyla
--      doğrudan yüklenir (sunucu gövde sınırına takılmaz).
-- ==============================================================================

BEGIN;

-- 1) Ürün adımları ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_stories (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  steps      JSONB NOT NULL DEFAULT '[]'::jsonb
             CHECK (jsonb_typeof(steps) = 'array' AND jsonb_array_length(steps) <= 12),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_stories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_stories FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.product_stories TO service_role;

DROP POLICY IF EXISTS "Service role full access on product_stories" ON public.product_stories;
CREATE POLICY "Service role full access on product_stories" ON public.product_stories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) media bucket: kısa klipler -----------------------------------------------

UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = ARRAY[
      'image/webp', 'image/avif', 'image/png', 'image/jpeg', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
WHERE id = 'media';

-- 3) app_migrations kaydı -----------------------------------------------------
INSERT INTO public.app_migrations (id) VALUES ('028_product_stories') ON CONFLICT (id) DO NOTHING;

COMMIT;
