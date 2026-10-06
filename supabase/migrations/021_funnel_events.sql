-- ==============================================================================
-- 021_funnel_events.sql — Sipariş hunisi ölçümü (kişisel veri YOK).
-- Ekleyici migration: uygulamadan ÖNCE çalıştırılır (kod tablo yoksa sessizce atlar).
-- 019/020 Faz 4'e ayrılmıştır (media bucket, journal v2).
-- ==============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id         BIGSERIAL PRIMARY KEY,
  event      TEXT NOT NULL CHECK (event IN ('scan', 'cart_open', 'checkout_start', 'order_ok', 'order_error')),
  ref        TEXT CHECK (ref IS NULL OR ref ~ '^[a-z0-9_-]{1,40}$'),
  code       TEXT CHECK (code IS NULL OR length(code) <= 40),
  order_id   TEXT,
  day        DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Istanbul')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_day_event ON public.funnel_events (day, event);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.funnel_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.funnel_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.funnel_events_id_seq TO service_role;

DROP POLICY IF EXISTS "Service role full access on funnel_events" ON public.funnel_events;
CREATE POLICY "Service role full access on funnel_events" ON public.funnel_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.app_migrations (id) VALUES ('021_funnel_events') ON CONFLICT DO NOTHING;
COMMIT;
