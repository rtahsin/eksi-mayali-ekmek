-- ==============================================================================
-- 025_smoke.sql — 025_funnel_events_v2 duman testi.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_err TEXT;
  v_id BIGINT;
  v_huge_text TEXT;
BEGIN
  -- 1) Geçerli bir learning_session olayı ekle
  INSERT INTO public.funnel_events (event, props, env, ref)
  VALUES (
    'learning_session',
    jsonb_build_object('durationSeconds', 45, 'cardsViewed', 3, 'path', '/laboratuvar'),
    'preview',
    'qr_test'
  )
  RETURNING id INTO v_id;

  ASSERT v_id IS NOT NULL, 'learning_session olayı kaydedilemedi';

  -- 2) 2 KB'tan büyük props reddedilmeli
  v_huge_text := repeat('abcdefghij', 250); -- ~2500 karakter
  BEGIN
    INSERT INTO public.funnel_events (event, props, env)
    VALUES ('learning_session', jsonb_build_object('big', v_huge_text), 'production');
    RAISE EXCEPTION '2 KB üzeri props kısıtı çalışmadı!';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%funnel_events_props_size_check%', 'Beklenmeyen hata mesajı: ' || v_err;
  END;

  -- 3) Geçersiz env değeri reddedilmeli
  BEGIN
    INSERT INTO public.funnel_events (event, env)
    VALUES ('scan', 'invalid_env');
    RAISE EXCEPTION 'Geçersiz env kısıtı çalışmadı!';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%funnel_events_env_check%', 'Beklenmeyen hata mesajı: ' || v_err;
  END;

  RAISE NOTICE '025 smoke OK';
END $$;

ROLLBACK;
