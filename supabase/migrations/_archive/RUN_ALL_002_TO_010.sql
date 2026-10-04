-- ==============================================================================
-- EKMEKLAB: KESİNTİSİZ TAM TESLİMAT VE ATOMİK SİPARİŞ MİGRATİON SETİ (002 - 010)
-- Bu script repodaki 002'den 010'a kadar olan tüm migration'ları orijinal sırasıyla,
-- eksiksiz RLS politikaları, foreign key'leri ve fonksiyonlarıyla içerir.
-- Supabase SQL Editor'da tek seferde kopyalayıp RUN edebilirsiniz.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ENUM GÜVENLİĞİ
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'courier';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'staff';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. KURYE TABLOSU VE İZİNLERİ (002_create_couriers.sql)
-- ------------------------------------------------------------------------------
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
    AND profiles.role::text IN ('admin', 'superadmin')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ORDERS TABLOSUNU GENİŞLETME (003_extend_orders.sql)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. SİPARİŞ DURUM GEÇMİŞİ TABLOSU (004_create_order_status_history.sql)
-- ------------------------------------------------------------------------------
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
    AND profiles.role::text IN ('admin', 'superadmin')
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

-- ------------------------------------------------------------------------------
-- 4. ÖDEMELER TABLOSU (005_create_payments.sql)
-- ------------------------------------------------------------------------------
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
    AND profiles.role::text IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 5. MÜŞTERİ CANLI KONUM TABLOSU & KVKK (006_create_customer_locations.sql)
-- ------------------------------------------------------------------------------
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
    AND profiles.role::text IN ('admin', 'superadmin', 'courier', 'staff')
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

-- ------------------------------------------------------------------------------
-- 6. PROFILES VE ORDERS RLS GENİŞLETME (007_extend_profiles_and_orders_rls.sql)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'courier';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
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
    AND profiles.role::text IN ('admin', 'superadmin')
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
    AND profiles.role::text IN ('admin', 'superadmin')
  )
);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 7. GÜVENLİK VE RLS İYİLEŞTİRMELERİ (008_fix_security_and_rls.sql)
-- ------------------------------------------------------------------------------
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_account_transactions" ON public.account_transactions;
CREATE POLICY "admin_manage_account_transactions" ON public.account_transactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "courier_insert_payments" ON public.payments;
CREATE POLICY "courier_insert_payments" ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.profile_id = auth.uid()
    AND couriers.id = courier_id
  )
);

DROP POLICY IF EXISTS "courier_view_assigned_payments" ON public.payments;
CREATE POLICY "courier_view_assigned_payments" ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.profile_id = auth.uid()
    AND couriers.id = courier_id
  )
);

CREATE OR REPLACE FUNCTION public.check_order_status_progression()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('teslim_edildi', 'iptal') AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'HATA: % durumundaki nihai bir siparişin durumu değiştirilemez.', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_status_progression ON public.orders;
CREATE TRIGGER trg_order_status_progression
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_order_status_progression();

-- ------------------------------------------------------------------------------
-- 8. RLS POLİTİKA ÇAKIŞMALARINI DÜZELTME (009_fix_rls_policy_conflicts.sql)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users read their own orders or admins read all" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users read their own order items or admins read all" ON public.order_items;

DROP POLICY IF EXISTS "customers_insert_own_items" ON public.order_items;
CREATE POLICY "customers_insert_own_items" ON public.order_items FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders
    WHERE user_id = auth.uid() AND status = 'bekliyor'
  )
);

-- ------------------------------------------------------------------------------
-- 9. ATOMİK SİPARİŞ VE ADVISORY LOCK (010_atomic_order_and_schema_improvements.sql)
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status ON public.orders(delivery_date, status);
CREATE INDEX IF NOT EXISTS idx_orders_phone_created ON public.orders(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cari_id TEXT REFERENCES public.current_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time_window TEXT;

ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2);
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS slip_number TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- Sıralı, Çakışmasız Sipariş Numarası RPC (pg_advisory_xact_lock ile)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  seq_val INTEGER;
  num TEXT;
  lock_key BIGINT;
BEGIN
  yymm := to_char(CURRENT_DATE, 'YYMM');
  lock_key := ('x' || substr(md5('order_number_' || yymm), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT COALESCE(
    MAX(SUBSTRING(order_number FROM 'SIP-[0-9]{4}-([0-9]{3})')::INTEGER),
    0
  ) INTO seq_val
  FROM public.orders
  WHERE order_number LIKE ('SIP-' || yymm || '-%');

  seq_val := seq_val + 1;
  num := 'SIP-' || yymm || '-' || LPAD(seq_val::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Atomik Sipariş Oluşturma RPC Fonksiyonu
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order JSONB,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_number TEXT;
  v_order_id TEXT;
  v_item JSONB;
  v_total NUMERIC;
  v_pay_method TEXT;
BEGIN
  v_order_number := public.generate_order_number();
  v_order_id := p_order->>'id';

  IF v_order_id IS NULL OR v_order_id = '' THEN
    v_order_id := 'ORD-' || substring(gen_random_uuid()::text from 1 for 8);
  END IF;

  -- 1. Siparişi Ekle
  INSERT INTO public.orders (
    id, order_number, user_id, customer_name, phone, delivery_method,
    delivery_address, district, neighborhood, address_detail, delivery_date,
    status, payment_method, payment_status, source, subtotal, shipping_fee,
    total_amount, order_notes, idempotency_key, location_shared,
    customer_lat, customer_lng, location_consent_at, cari_id,
    courier_notes, delivery_time_window, created_at, updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    p_user_id,
    p_order->>'customer_name',
    p_order->>'phone',
    COALESCE(p_order->>'delivery_method', 'courier')::delivery_method_type,
    p_order->>'delivery_address',
    p_order->>'district',
    p_order->>'neighborhood',
    p_order->>'address_detail',
    COALESCE(p_order->>'delivery_date', 'today'),
    COALESCE(p_order->>'status', 'bekliyor')::order_status_type,
    (p_order->>'payment_method')::payment_method_type,
    COALESCE(p_order->>'payment_status', 'pending'),
    COALESCE(p_order->>'source', 'web'),
    (p_order->>'subtotal')::NUMERIC,
    (p_order->>'shipping_fee')::NUMERIC,
    (p_order->>'total_amount')::NUMERIC,
    p_order->>'order_notes',
    p_order->>'idempotency_key',
    COALESCE((p_order->>'location_shared')::BOOLEAN, false),
    (p_order->>'customer_lat')::DOUBLE PRECISION,
    (p_order->>'customer_lng')::DOUBLE PRECISION,
    (p_order->>'location_consent_at')::TIMESTAMPTZ,
    p_order->>'cari_id',
    p_order->>'courier_notes',
    p_order->>'delivery_time_window',
    COALESCE((p_order->>'created_at')::TIMESTAMPTZ, NOW()),
    COALESCE((p_order->>'updated_at')::TIMESTAMPTZ, NOW())
  );

  -- 2. Kalemleri Ekle
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.order_items (
        order_id, product_id, product_name, quantity,
        unit_price, total_price, image_url, weight, made_to_order
      ) VALUES (
        v_order_id,
        v_item->>'product_id',
        v_item->>'product_name',
        (v_item->>'quantity')::INTEGER,
        (v_item->>'unit_price')::NUMERIC,
        (v_item->>'total_price')::NUMERIC,
        v_item->>'image_url',
        (v_item->>'weight')::NUMERIC,
        COALESCE((v_item->>'made_to_order')::BOOLEAN, false)
      );
    END LOOP;
  END IF;

  -- 3. Durum Geçmişini Ekle
  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, changed_by_role, changed_by_id, note
  ) VALUES (
    v_order_id,
    NULL,
    COALESCE(p_order->>'status', 'bekliyor'),
    COALESCE(p_order->>'changed_by_role', 'customer'),
    p_user_id::TEXT,
    COALESCE(p_order->>'history_note', 'Sipariş oluşturuldu')
  );

  -- 4. Ödeme Kaydını Ekle
  v_total := (p_order->>'total_amount')::NUMERIC;
  v_pay_method := CASE
    WHEN p_order->>'payment_method' = 'cash_on_delivery' THEN 'cash'
    WHEN p_order->>'payment_method' = 'pos_at_door' THEN 'pos'
    WHEN p_order->>'payment_method' = 'cari' THEN 'cari'
    ELSE 'online_card'
  END;

  INSERT INTO public.payments (
    order_id, amount, method, status, note
  ) VALUES (
    v_order_id, v_total, v_pay_method, 'pending', 'Sipariş oluşturuldu'
  );

  -- 5. Müşteri GPS Konumunu Ekle (Paylaşılmışsa)
  IF COALESCE((p_order->>'location_shared')::BOOLEAN, false) 
     AND (p_order->>'customer_lat') IS NOT NULL 
     AND (p_order->>'customer_lng') IS NOT NULL THEN
    INSERT INTO public.customer_locations (
      order_id, lat, lng, accuracy
    ) VALUES (
      v_order_id,
      (p_order->>'customer_lat')::DOUBLE PRECISION,
      (p_order->>'customer_lng')::DOUBLE PRECISION,
      10
    );
  END IF;

  -- 6. Profil İstatistiklerini Güncelle (Kullanıcı Oturumu Varsa)
  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      total_orders = COALESCE(total_orders, 0) + 1,
      total_spent = COALESCE(total_spent, 0) + v_total,
      last_order_at = NOW(),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Atomic order creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
