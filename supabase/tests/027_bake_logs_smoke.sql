-- ==============================================================================
-- 027_bake_logs_smoke.sql — 027_bake_logs duman testi.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_id UUID;
  v_day DATE;
BEGIN
  -- 1) Ürünlü, fotoğrafsız kayıt; gün İstanbul tarihiyle dolar
  INSERT INTO public.bake_logs (items, note)
  VALUES ('[{"productId":"TEST","name":"TEST ekmek","quantity":12}]'::jsonb, 'TEST')
  RETURNING id, day INTO v_id, v_day;
  ASSERT v_id IS NOT NULL, 'kayıt eklenemedi';
  ASSERT v_day = (now() AT TIME ZONE 'Europe/Istanbul')::date, 'gün İstanbul tarihi değil';

  -- 2) Yalnız fotoğraflı kayıt kabul edilir
  INSERT INTO public.bake_logs (photo_path)
  VALUES ('firin/2026-10-27/0b6f3c1e-1d2a-4c3b-9e8f-112233445566.webp');

  -- 3) Ne ürün ne fotoğraf: reddedilmeli
  BEGIN
    INSERT INTO public.bake_logs (items) VALUES ('[]'::jsonb);
    RAISE EXCEPTION 'boş kayıt kısıtı çalışmadı';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 4) firin/ dışına işaret eden fotoğraf yolu reddedilmeli
  BEGIN
    INSERT INTO public.bake_logs (photo_path) VALUES ('../gizli.webp');
    RAISE EXCEPTION 'fotoğraf yolu kısıtı çalışmadı';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 5) Tarayıcı rolleri tabloya erişemez
  ASSERT NOT has_table_privilege('anon', 'public.bake_logs', 'SELECT'), 'anon okuyabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.bake_logs', 'INSERT'), 'authenticated yazabiliyor';

  -- 6) Migration kaydı
  ASSERT EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '027_bake_logs'), 'app_migrations kaydı yok';
END $$;

ROLLBACK;
