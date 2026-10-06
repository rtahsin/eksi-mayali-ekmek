-- 021_smoke.sql — 021_funnel_events sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
BEGIN;
DO $$
BEGIN
  INSERT INTO public.funnel_events (event, ref) VALUES ('scan', 'qr-koy');
  ASSERT (SELECT count(*) FROM public.funnel_events WHERE ref = 'qr-koy') = 1, 'olay yazılamadı';
  BEGIN
    INSERT INTO public.funnel_events (event) VALUES ('hacked');
    RAISE EXCEPTION 'geçersiz olay kabul edildi';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.funnel_events (event, ref) VALUES ('scan', 'Büyük Harf!');
    RAISE EXCEPTION 'geçersiz ref kabul edildi';
  EXCEPTION WHEN check_violation THEN NULL; END;
  ASSERT NOT has_table_privilege('anon', 'public.funnel_events', 'INSERT'), 'anon yazabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.funnel_events', 'SELECT'), 'authenticated okuyabiliyor';
  RAISE NOTICE '021 smoke OK';
END $$;
ROLLBACK;
