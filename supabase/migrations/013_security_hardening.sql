-- ==============================================================================
-- 013_security_hardening.sql  (Faz 0 — docs/YOL_HARITASI.md §6)
-- ==============================================================================
-- NE ZAMAN: Faz 0 uygulama kodu canlıya alındıktan SONRA.
--   (Eski kod `security_settings` satırı yoksa PIN'i "1453" kabul ediyordu; bu
--    migration o satırı siler. Yeni kodda PIN yolu tamamen kaldırıldı.)
-- NASIL: Supabase SQL Editor → önce son satırdaki COMMIT yerine ROLLBACK ile kuru
--   deneme, sonra COMMIT. Öncesi ve sonrası `supabase/tests/013_verify.sql`.
-- İdempotent: 4 Ekim acil SQL'i ile çakışmaz, tekrar çalıştırılabilir.
--
-- İçerik:
--   1) app_migrations kayıt tablosu
--   2) Güvenli handle_new_user (e-postaya göre rol yok, çakışmada rol değişmez)
--   3) SECURITY DEFINER / hassas fonksiyonlar: PUBLIC/anon/authenticated'dan REVOKE,
--      service_role'e GRANT, sabit search_path (is_admin hariç; RLS ona muhtaç)
--   4) profiles: kullanıcı sadece ad/telefon/avatar güncelleyebilir (rol değil)
--   5) orders / order_items / payments: istemci tarafı müşteri yazımı yok
--   6) bakery_settings: herkese açık okuma yok; PIN ve cihaz kayıtları silinir
-- ==============================================================================

BEGIN;

-- 1) Migration kayıt tablosu ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_migrations FROM anon, authenticated;

-- 2) Profil tetikleyicisi: e-postaya göre rol yok, çakışmada rol asla değişmez ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles AS p (id, email, full_name, phone, avatar_url)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(p.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, p.avatar_url),
    updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user(%): %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

-- 3) SECURITY DEFINER / hassas fonksiyonlar (tüm overload'lar; is_admin hariç) ----
DO $$ DECLARE r record; v_sig text; BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname <> 'is_admin'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND (p.prosecdef OR p.proname IN ('create_order_atomic','record_cari_transaction_atomic',
           'adjust_cari_balance','check_rate_limit','generate_slip_number','generate_order_number',
           'cleanup_expired_customer_locations','handle_new_user','check_order_status_progression'))
  LOOP
    v_sig := format('%I.%I(%s)', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    IF r.proname <> 'handle_new_user' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_sig);
    END IF;
  END LOOP;
END $$;

DO $$ BEGIN   -- admin tarayıcısı Faz 3'e kadar kullanıyor (manuel sipariş numarası)
  IF to_regprocedure('public.generate_order_number()') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
  END IF;
END $$;

ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() STABLE;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Bundan sonra oluşturulan fonksiyonlar varsayılan olarak herkese açık olmasın
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 4) Profil: rol kendi kendine değiştirilemez ----------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;

-- 5) Siparişler: müşteri tarafı istemci yazımı yok (sipariş API'si service-role ile yazar)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "customers_create_orders" ON public.orders;
DROP POLICY IF EXISTS "customers_cancel_own_pending" ON public.orders;
DROP POLICY IF EXISTS "Users read their own orders or admins read all" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "customers_insert_own_items" ON public.order_items;
DROP POLICY IF EXISTS "Users read their own order items or admins read all" ON public.order_items;

DROP POLICY IF EXISTS "customers_view_own_orders" ON public.orders;
CREATE POLICY "customers_view_own_orders" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_orders" ON public.orders;
CREATE POLICY "admin_full_access_orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "customers_view_own_items" ON public.order_items;
CREATE POLICY "customers_view_own_items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "admin_full_items" ON public.order_items;
CREATE POLICY "admin_full_items" ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6) Ayarlar: herkese açık okuma yok (tüm okuyucular service-role); PIN/cihaz kayıtları silinir
DROP POLICY IF EXISTS "Public read bakery settings" ON public.bakery_settings;
DELETE FROM public.bakery_settings WHERE key IN ('security_settings', 'trusted_devices');

INSERT INTO public.app_migrations (id) VALUES ('013_security_hardening') ON CONFLICT DO NOTHING;

COMMIT;
