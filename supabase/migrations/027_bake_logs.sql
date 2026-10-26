-- ==============================================================================
-- 027_bake_logs.sql — "Fırından çıktı" kayıtları (canlı fırın, adım 1).
-- ==============================================================================
-- NE ZAMAN: Kod birleşmeden ÖNCE (eklemeli; eski kod etkilenmez). 022_media_bucket
--   uygulanmış olmalı (fotoğraflar 'media' bucket'ında, firin/ klasöründe).
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/027_bake_logs_smoke.sql.
--
-- Bir satır = bir fırın çıkışı: saat, çıkan ürünler ve adetleri, isteğe bağlı
-- fotoğraf ve not. Yanlış kayıt silinmez, gizlenir (hidden). Kişisel veri yok.
-- Yazan/okuyan yalnız sunucu (service_role): admin API'si ve ileride ana sayfa.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.bake_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  day        DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Istanbul')::date),
  -- [{ "productId": "...", "name": "Karakılçık", "quantity": 12 }]; ad, ürün sonradan
  -- değişse de kayıt doğru kalsın diye o anki haliyle saklanır.
  items      JSONB NOT NULL DEFAULT '[]'::jsonb
             CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 20),
  photo_path TEXT CHECK (photo_path IS NULL OR photo_path ~ '^firin/[0-9]{4}-[0-9]{2}-[0-9]{2}/[a-f0-9-]{36}\.(webp|jpg)$'),
  note       TEXT CHECK (note IS NULL OR length(note) <= 140),
  hidden     BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bake_logs_not_empty CHECK (jsonb_array_length(items) > 0 OR photo_path IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bake_logs_day ON public.bake_logs (day DESC, baked_at DESC);

ALTER TABLE public.bake_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bake_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bake_logs TO service_role;

DROP POLICY IF EXISTS "Service role full access on bake_logs" ON public.bake_logs;
CREATE POLICY "Service role full access on bake_logs" ON public.bake_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.app_migrations (id) VALUES ('027_bake_logs') ON CONFLICT (id) DO NOTHING;

COMMIT;
