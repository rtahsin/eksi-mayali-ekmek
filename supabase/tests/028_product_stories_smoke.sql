-- ==============================================================================
-- 028_product_stories_smoke.sql — 028_product_stories duman testi.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_pid TEXT;
BEGIN
  SELECT id INTO v_pid FROM public.products LIMIT 1;
  ASSERT v_pid IS NOT NULL, 'deneme için ürün yok';

  -- 1) Adımlar yazılır ve okunur
  INSERT INTO public.product_stories (product_id, steps)
  VALUES (v_pid, '[{"id":"TEST","title":"TEST adım","text":"","media":null,"anId":null}]'::jsonb)
  ON CONFLICT (product_id) DO UPDATE SET steps = EXCLUDED.steps;
  ASSERT (SELECT jsonb_array_length(steps) FROM public.product_stories WHERE product_id = v_pid) = 1, 'adım yazılamadı';

  -- 2) 12'den fazla adım reddedilmeli
  BEGIN
    UPDATE public.product_stories
    SET steps = (SELECT jsonb_agg(jsonb_build_object('id', g)) FROM generate_series(1, 13) g)
    WHERE product_id = v_pid;
    RAISE EXCEPTION 'adım sayısı kısıtı çalışmadı';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 3) Bilinmeyen ürün reddedilmeli
  BEGIN
    INSERT INTO public.product_stories (product_id) VALUES ('TEST_yok_boyle_urun');
    RAISE EXCEPTION 'ürün yabancı anahtarı çalışmadı';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  -- 4) Tarayıcı rolleri erişemez
  ASSERT NOT has_table_privilege('anon', 'public.product_stories', 'SELECT'), 'anon okuyabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.product_stories', 'UPDATE'), 'authenticated yazabiliyor';

  -- 5) media bucket kısa kliplere hazır
  ASSERT (SELECT file_size_limit FROM storage.buckets WHERE id = 'media') = 52428800, 'dosya sınırı 50 MB değil';
  ASSERT (SELECT 'video/quicktime' = ANY (allowed_mime_types) FROM storage.buckets WHERE id = 'media'), '.mov izinli değil';

  ASSERT EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '028_product_stories'), 'app_migrations kaydı yok';
END $$;

ROLLBACK;
