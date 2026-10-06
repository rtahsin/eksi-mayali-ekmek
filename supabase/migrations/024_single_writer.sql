-- ==============================================================================
-- 024_single_writer.sql  (Faz P1-09 — docs/IS_PAKETLERI.md)
-- ==============================================================================
-- NE ZAMAN: Kod yayınından SONRA çalıştırılır (tarayıcı yazımları kaldırıldıktan sonra).
--   Önce sonu ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/024_smoke.sql.
--
-- İçerik:
--   orders, order_items, payments, order_status_history tablolarındaki
--   tüm tarayıcı INSERT / UPDATE / DELETE politikalarını kaldırır.
--   Yalnızca SELECT politikaları bırakılır.
--   Yazma işlemleri TEK YAZAR ilkesi (ADR-0007) gereği yalnızca sunucu
--   tarafından (service_role anahtarlı API / RPC) yapılabilir.
-- ==============================================================================

BEGIN;

-- 1) orders tablosu: Yazma politikaları kaldırılır, yalnızca SELECT kalır
DROP POLICY IF EXISTS "customers_create_orders" ON public.orders;
DROP POLICY IF EXISTS "customers_cancel_own_pending" ON public.orders;
DROP POLICY IF EXISTS "admin_full_access_orders" ON public.orders;
DROP POLICY IF EXISTS "courier_deliver_assigned" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;

DROP POLICY IF EXISTS "admin_select_orders" ON public.orders;
CREATE POLICY "admin_select_orders" ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- 2) order_items tablosu: Yazma politikaları kaldırılır, yalnızca SELECT kalır
DROP POLICY IF EXISTS "customers_insert_own_items" ON public.order_items;
DROP POLICY IF EXISTS "admin_full_items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

DROP POLICY IF EXISTS "admin_select_order_items" ON public.order_items;
CREATE POLICY "admin_select_order_items" ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- 3) payments tablosu: Yazma politikaları kaldırılır, yalnızca SELECT kalır
DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;

DROP POLICY IF EXISTS "admin_staff_select_payments" ON public.payments;
CREATE POLICY "admin_staff_select_payments" ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

-- 4) order_status_history tablosu: Yazma politikaları kaldırılır, yalnızca SELECT kalır
DROP POLICY IF EXISTS "admin_full_status_history" ON public.order_status_history;

DROP POLICY IF EXISTS "admin_select_order_status_history" ON public.order_status_history;
CREATE POLICY "admin_select_order_status_history" ON public.order_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- app_migrations kaydı
INSERT INTO public.app_migrations (id) VALUES ('024_single_writer') ON CONFLICT DO NOTHING;

COMMIT;
