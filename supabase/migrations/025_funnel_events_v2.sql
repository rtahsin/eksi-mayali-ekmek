-- ==============================================================================
-- 025_funnel_events_v2.sql — Öğrenme ölçümü ve olay özellikleri (P1-10)
-- Ekleyici migration: uygulamadan ÖNCE çalıştırılır (kod sütun yoksa sessizce atlar).
-- ==============================================================================

BEGIN;

-- 1) Yeni sütunlar: props (max 2048 byte) ve env
ALTER TABLE public.funnel_events
  ADD COLUMN IF NOT EXISTS props JSONB,
  ADD COLUMN IF NOT EXISTS env TEXT;

-- 2) props boyut kısıtı (pg_column_size <= 2048 bytes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'funnel_events_props_size_check'
  ) THEN
    ALTER TABLE public.funnel_events
      ADD CONSTRAINT funnel_events_props_size_check
      CHECK (props IS NULL OR pg_column_size(props) <= 2048);
  END IF;
END $$;

-- 3) env kısıtı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'funnel_events_env_check'
  ) THEN
    ALTER TABLE public.funnel_events
      ADD CONSTRAINT funnel_events_env_check
      CHECK (env IS NULL OR env IN ('production', 'preview', 'development'));
  END IF;
END $$;

-- 4) event kısıtına 'learning_session' eklenmesi
ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_event_check;

ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_event_check
  CHECK (event IN ('scan', 'cart_open', 'checkout_start', 'order_ok', 'order_error', 'learning_session'));

-- 5) Migration kaydı
INSERT INTO public.app_migrations (id) VALUES ('025_funnel_events_v2') ON CONFLICT DO NOTHING;

COMMIT;
