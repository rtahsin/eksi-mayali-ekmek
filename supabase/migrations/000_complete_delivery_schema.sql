-- ==============================================================================
-- EKMEKLAB: TÜM SİPARİŞ & TESLİMAT SİSTEMİ VERİTABANI ŞEMASI (002 - 007 BİRLEŞİK)
-- Supabase SQL Editor üzerinden tek seferde çalıştırılabilir.
-- ==============================================================================

-- 1. KURYE TABLOSU (002_create_couriers.sql)
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'motorcycle' CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle', 'on_foot')),
    is_active BOOLEAN DEFAULT true,
    is_on_shift BOOLEAN DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    location_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_couriers_active_shift ON public.couriers(is_active, is_on_shift);
CREATE INDEX IF NOT EXISTS idx_couriers_profile ON public.couriers(profile_id);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_self_view" ON public.couriers;
CREATE POLICY "courier_self_view" ON public.couriers FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "courier_update_location" ON public.couriers;
CREATE POLICY "courier_update_location" ON public.couriers FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_couriers" ON public.couriers;
CREATE POLICY "admin_manage_couriers" ON public.couriers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. ORDERS TABLOSU GENİŞLETME (003_extend_orders.sql)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_shared BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT check_orders_source 
    CHECK (source IN ('web', 'whatsapp', 'phone', 'in_store', 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT check_orders_cancelled_by 
    CHECK (cancelled_by IN ('customer', 'admin', 'system'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON public.orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_cari ON public.orders(cari_id);

CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  seq_val INTEGER;
  num TEXT;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_number FROM '\d+$') AS INTEGER
      )
    ), 0
  ) + 1
  INTO seq_val
  FROM public.orders
  WHERE order_number LIKE 'SIP-' || yymm || '-%';
  
  num := 'SIP-' || yymm || '-' || LPAD(seq_val::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  r RECORD;
  idx INT := 1;
  yymm TEXT := TO_CHAR(NOW(), 'YYMM');
BEGIN
  FOR r IN (SELECT id FROM public.orders WHERE order_number IS NULL OR order_number = '' ORDER BY created_at ASC) LOOP
    UPDATE public.orders 
    SET order_number = 'SIP-' || yymm || '-' || LPAD(idx::TEXT, 3, '0')
    WHERE id = r.id;
    idx := idx + 1;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);


-- 3. SİPARİŞ DURUM GEÇMİŞİ (004_create_order_status_history.sql)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_role TEXT NOT NULL CHECK (changed_by_role IN ('system', 'admin', 'courier', 'customer')),
    changed_by_id TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_osh_order ON public.order_status_history(order_id, created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_view_own_order_status_history" ON public.order_status_history;
CREATE POLICY "customers_view_own_order_status_history" ON public.order_status_history FOR SELECT
USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "admin_full_status_history" ON public.order_status_history;
CREATE POLICY "admin_full_status_history" ON public.order_status_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "courier_view_assigned_order_status_history" ON public.order_status_history;
CREATE POLICY "courier_view_assigned_order_status_history" ON public.order_status_history FOR SELECT
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.couriers c ON o.courier_id = c.id
    WHERE c.profile_id = auth.uid()
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 4. ÖDEMELER (005_create_payments.sql)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'pos', 'online_card', 'transfer', 'cari')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partial')),
    paid_at TIMESTAMPTZ,
    collected_by TEXT CHECK (collected_by IN ('courier', 'admin', 'system')),
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    transaction_ref TEXT,
    cari_transaction_id UUID REFERENCES public.account_transactions(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_courier ON public.payments(courier_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_view_own_payments" ON public.payments;
CREATE POLICY "customers_view_own_payments" ON public.payments FOR SELECT
USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 5. MÜŞTERİ CANLI KONUM TABLOSU & KVKK (006_create_customer_locations.sql)
CREATE TABLE IF NOT EXISTS public.customer_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custloc_order ON public.customer_locations(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custloc_created_at ON public.customer_locations(created_at);

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_share_location" ON public.customer_locations;
CREATE POLICY "customer_share_location" ON public.customer_locations FOR INSERT
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "staff_view_locations" ON public.customer_locations;
CREATE POLICY "staff_view_locations" ON public.customer_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_locations;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_customer_locations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.customer_locations
  WHERE created_at < NOW() - INTERVAL '72 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. PROFILES VE ORDERS RLS GENİŞLETME (007_extend_profiles_and_orders_rls.sql)
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

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
