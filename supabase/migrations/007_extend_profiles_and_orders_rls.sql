-- ==============================================================================
-- EKMEKLAB: PROFILES GENİŞLETME & ORDERS/ORDER_ITEMS RLS POLİTİKALARI (GÖREV 6)
-- ==============================================================================

-- 1. profiles tablosuna kurye rolü ve istatistik alanları
DO $$ BEGIN
    ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'courier';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. orders tablosu RLS politikalarını aktifleştir ve güncelle
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_view_own_orders" ON public.orders;
CREATE POLICY "customers_view_own_orders" ON public.orders FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "customers_create_orders" ON public.orders;
CREATE POLICY "customers_create_orders" ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'bekliyor');

DROP POLICY IF EXISTS "customers_cancel_own_pending" ON public.orders;
CREATE POLICY "customers_cancel_own_pending" ON public.orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'bekliyor')
WITH CHECK (status = 'iptal');

DROP POLICY IF EXISTS "admin_full_access_orders" ON public.orders;
CREATE POLICY "admin_full_access_orders" ON public.orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "courier_view_assigned" ON public.orders;
CREATE POLICY "courier_view_assigned" ON public.orders FOR SELECT
USING (
  courier_id IN (
    SELECT id FROM public.couriers WHERE profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "courier_deliver_assigned" ON public.orders;
CREATE POLICY "courier_deliver_assigned" ON public.orders FOR UPDATE
USING (
  courier_id IN (
    SELECT id FROM public.couriers WHERE profile_id = auth.uid()
  ) AND status = 'kuryede'
)
WITH CHECK (status = 'teslim_edildi');

-- 3. order_items tablosu RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_view_own_items" ON public.order_items;
CREATE POLICY "customers_view_own_items" ON public.order_items FOR SELECT
USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "admin_full_items" ON public.order_items;
CREATE POLICY "admin_full_items" ON public.order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Realtime yayını
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
