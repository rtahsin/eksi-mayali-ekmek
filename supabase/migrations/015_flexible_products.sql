-- ==============================================================================
-- 015_flexible_products.sql  (Faz 2 — docs/YOL_HARITASI.md §6)
-- ==============================================================================
-- NE ZAMAN: Faz 2 uygulama kodu yayınlanmadan ÖNCE. Değişiklikler eklemelidir:
--   eski kod yeni sütunları/tabloları bilmez ama etkilenmez; RPC v4 eski çağrıyı
--   aynen kabul eder (yeni sütunların varsayılanları "sınır yok" demektir).
-- NASIL: önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/015_smoke.sql.
--
-- İçerik:
--   1) products: compare_at_price, availability, daily_limit, lead_time_days,
--      capacity_units, bundle_items, cross_sell (+ tek seferlik doldurma)
--   2) product_sale_dates: "sadece seçtiğim günlerde" satılan ürünlerin günleri
--   3) capacity_days: belirli bir gün için ekmek kapasitesi
--   4) categories.is_visible
--   5) order_items.capacity_units / components (anlık kopya)
--   6) create_order_atomic v4: satış günü, hazırlık süresi, ürün limiti,
--      günlük ekmek kapasitesi (tarih başına kilit altında)
--   7) admin_save_product: ürün + satış günleri tek işlemde
-- ==============================================================================

BEGIN;

-- 1) products --------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS daily_limit integer,
  ADD COLUMN IF NOT EXISTS lead_time_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_units integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bundle_items jsonb,
  ADD COLUMN IF NOT EXISTS cross_sell text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_availability_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_availability_check CHECK (availability IN ('daily', 'dates'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_limits_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_limits_check CHECK (
      (compare_at_price IS NULL OR compare_at_price >= 0)
      AND (daily_limit IS NULL OR daily_limit >= 0)
      AND lead_time_days BETWEEN 0 AND 30
      AND capacity_units BETWEEN 0 AND 100
    );
  END IF;
END $$;

-- Tek seferlik: eşlikçiler (gurme) günlük ekmek kapasitesinden düşmez. Tahsin sonra admin'den düzeltebilir.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '015_flexible_products') THEN
    UPDATE public.products SET capacity_units = 0 WHERE category IN ('gurme', 'pantry');
  END IF;
END $$;

-- Slug tekilliği (yinelenen yoksa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT slug FROM public.products WHERE slug IS NOT NULL AND slug <> '' GROUP BY slug HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug ON public.products (slug) WHERE slug IS NOT NULL AND slug <> '';
  ELSE
    RAISE NOTICE '015: yinelenen slug var, uq_products_slug oluşturulmadı (uygulama tekilliği sağlar)';
  END IF;
END $$;

-- 2) product_sale_dates ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_sale_dates (
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sale_date date NOT NULL,
  quantity_limit integer CHECK (quantity_limit IS NULL OR quantity_limit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, sale_date)
);
CREATE INDEX IF NOT EXISTS idx_product_sale_dates_date ON public.product_sale_dates (sale_date);
ALTER TABLE public.product_sale_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product sale dates" ON public.product_sale_dates;
CREATE POLICY "Public read product sale dates" ON public.product_sale_dates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage product sale dates" ON public.product_sale_dates;
CREATE POLICY "Admin manage product sale dates" ON public.product_sale_dates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3) capacity_days -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.capacity_days (
  day date PRIMARY KEY,
  bread_capacity integer NOT NULL CHECK (bread_capacity >= 0),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capacity_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage capacity days" ON public.capacity_days;
CREATE POLICY "Admin manage capacity days" ON public.capacity_days FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4) categories ----------------------------------------------------------------------
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- 5) order_items anlık kopya ----------------------------------------------------------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS capacity_units integer,
  ADD COLUMN IF NOT EXISTS components jsonb;

-- 6) create_order_atomic v4 ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order JSONB,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_number TEXT;
  v_order_id TEXT;
  v_item JSONB;
  v_total NUMERIC;
  v_status TEXT;
  v_delivery_date DATE;
  v_today DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_idem TEXT;
  v_existing RECORD;
  v_bypass BOOLEAN := COALESCE((p_order->>'bypass_limits')::boolean, false);
  v_line RECORD;
  v_prod RECORD;
  v_limit INTEGER;
  v_sale_limit INTEGER;
  v_reserved INTEGER;
  v_new_units INTEGER := 0;
  v_cap INTEGER;
  v_used INTEGER;
  v_pay_method TEXT;
  v_cari_id TEXT;
  v_cari_balance NUMERIC;
  v_new_cari_balance NUMERIC;
  v_cari_tx_id UUID;
BEGIN
  -- Teslim tarihi: yalnızca ISO (YYYY-MM-DD)
  IF COALESCE(p_order->>'delivery_date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_DATE: %', COALESCE(p_order->>'delivery_date', 'null');
  END IF;
  BEGIN
    v_delivery_date := (p_order->>'delivery_date')::date;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'INVALID_DELIVERY_DATE: %', p_order->>'delivery_date';
  END;

  -- İdempotency: aynı anahtarla gelen ikinci istek mevcut siparişi alır
  v_idem := NULLIF(TRIM(COALESCE(p_order->>'idempotency_key', '')), '');
  IF v_idem IS NOT NULL THEN
    SELECT id, order_number INTO v_existing FROM public.orders WHERE idempotency_key = v_idem;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'order_id', v_existing.id,
                                'order_number', v_existing.order_number, 'is_existing', true);
    END IF;
  END IF;

  v_status := COALESCE(p_order->>'status', 'bekliyor');
  IF v_status NOT IN ('bekliyor', 'hazirlaniyor') THEN
    RAISE EXCEPTION 'INVALID_INITIAL_STATUS: %', v_status;
  END IF;

  -- Aynı gün için kapasite/limit kontrolleri sıraya girer (sayaç yok, SUM ile)
  PERFORM pg_advisory_xact_lock(hashtext('ekmeklab:capacity:' || v_delivery_date::text));

  -- Kilit beklerken aynı anahtarlı eşzamanlı istek kaydedilmiş olabilir: kazananı döndür
  -- (aksi halde yeniden deneme, dolmuş kapasite/limit yüzünden yanlışlıkla reddedilir)
  IF v_idem IS NOT NULL THEN
    SELECT id, order_number INTO v_existing FROM public.orders WHERE idempotency_key = v_idem;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'order_id', v_existing.id,
                                'order_number', v_existing.order_number, 'is_existing', true);
    END IF;
  END IF;

  FOR v_line IN
    SELECT x->>'product_id' AS product_id, SUM((x->>'quantity')::integer) AS qty
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) x
    GROUP BY 1
  LOOP
    SELECT id, name, is_active, is_available, availability, daily_limit, lead_time_days, capacity_units
      INTO v_prod FROM public.products WHERE id = v_line.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: %', v_line.product_id;
    END IF;
    IF v_prod.is_active IS FALSE OR v_prod.is_available IS FALSE THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: %', v_prod.name;
    END IF;

    IF NOT v_bypass THEN
      IF v_delivery_date < v_today + COALESCE(v_prod.lead_time_days, 0) THEN
        RAISE EXCEPTION 'LEAD_TIME_NOT_MET: %|%', v_prod.name, v_prod.lead_time_days;
      END IF;

      v_limit := v_prod.daily_limit;
      IF v_prod.availability = 'dates' THEN
        SELECT quantity_limit INTO v_sale_limit FROM public.product_sale_dates
        WHERE product_id = v_prod.id AND sale_date = v_delivery_date;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'NOT_ON_SALE_THIS_DAY: %', v_prod.name;
        END IF;
        v_limit := COALESCE(v_sale_limit, v_limit);
      END IF;

      IF v_limit IS NOT NULL THEN
        SELECT COALESCE(SUM(oi.quantity), 0) INTO v_reserved
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.product_id = v_prod.id AND o.delivery_date = v_delivery_date AND o.status <> 'iptal';
        IF v_reserved + v_line.qty > v_limit THEN
          RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED: %|%', v_prod.name, GREATEST(v_limit - v_reserved, 0);
        END IF;
      END IF;
    END IF;

    v_new_units := v_new_units + v_line.qty * COALESCE(v_prod.capacity_units, 1);
  END LOOP;

  -- Günlük ekmek kapasitesi: o güne özel değer, yoksa ayardaki varsayılan; ikisi de yoksa sınırsız
  IF NOT v_bypass AND v_new_units > 0 THEN
    SELECT bread_capacity INTO v_cap FROM public.capacity_days WHERE day = v_delivery_date;
    IF NOT FOUND THEN
      SELECT CASE WHEN jsonb_typeof(value->'dailyBreadCapacity') = 'number'
                  THEN (value->>'dailyBreadCapacity')::integer END
        INTO v_cap FROM public.bakery_settings WHERE key = 'operational_settings';
    END IF;

    IF v_cap IS NOT NULL THEN
      SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.capacity_units, p.capacity_units, 1)), 0) INTO v_used
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE o.delivery_date = v_delivery_date AND o.status <> 'iptal';
      IF v_used + v_new_units > v_cap THEN
        RAISE EXCEPTION 'DAILY_CAPACITY_FULL: %', GREATEST(v_cap - v_used, 0);
      END IF;
    END IF;
  END IF;

  v_order_number := public.generate_order_number();
  v_order_id := NULLIF(p_order->>'id', '');
  IF v_order_id IS NULL THEN
    v_order_id := 'ORD-' || upper(substring(gen_random_uuid()::text from 1 for 8));
  END IF;
  v_total := (p_order->>'total_amount')::NUMERIC;

  BEGIN
    INSERT INTO public.orders (
      id, order_number, user_id, customer_name, phone, delivery_method,
      delivery_address, district, neighborhood, address_detail, delivery_date,
      status, payment_method, payment_status, source, subtotal, shipping_fee,
      total_amount, order_notes, idempotency_key, location_shared,
      customer_lat, customer_lng, location_consent_at, cari_id,
      courier_notes, delivery_time_window, terms_accepted_at, terms_version,
      created_at, updated_at
    ) VALUES (
      v_order_id, v_order_number, p_user_id,
      p_order->>'customer_name', p_order->>'phone',
      COALESCE(p_order->>'delivery_method', 'courier')::delivery_method_type,
      p_order->>'delivery_address', COALESCE(p_order->>'district', 'Beylikdüzü'),
      p_order->>'neighborhood', p_order->>'address_detail', v_delivery_date,
      v_status::order_status_type, (p_order->>'payment_method')::payment_method_type,
      COALESCE(p_order->>'payment_status', 'pending'), COALESCE(p_order->>'source', 'web'),
      (p_order->>'subtotal')::NUMERIC, (p_order->>'shipping_fee')::NUMERIC, v_total,
      p_order->>'order_notes', v_idem,
      COALESCE((p_order->>'location_shared')::BOOLEAN, false),
      (p_order->>'customer_lat')::DOUBLE PRECISION, (p_order->>'customer_lng')::DOUBLE PRECISION,
      (p_order->>'location_consent_at')::TIMESTAMPTZ, NULLIF(p_order->>'cari_id', ''),
      p_order->>'courier_notes', p_order->>'delivery_time_window',
      (p_order->>'terms_accepted_at')::TIMESTAMPTZ, p_order->>'terms_version',
      COALESCE((p_order->>'created_at')::TIMESTAMPTZ, NOW()),
      COALESCE((p_order->>'updated_at')::TIMESTAMPTZ, NOW())
    );
  EXCEPTION WHEN unique_violation THEN
    IF v_idem IS NOT NULL THEN
      SELECT id, order_number INTO v_existing FROM public.orders WHERE idempotency_key = v_idem;
      IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'order_id', v_existing.id,
                                  'order_number', v_existing.order_number, 'is_existing', true);
      END IF;
    END IF;
    RAISE;
  END;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.order_items (
        order_id, product_id, product_name, quantity, unit_price, total_price,
        image_url, weight, made_to_order, capacity_units, components
      )
      SELECT
        v_order_id,
        v_item->>'product_id',
        v_item->>'product_name',
        (v_item->>'quantity')::INTEGER,
        (v_item->>'unit_price')::NUMERIC,
        (v_item->>'total_price')::NUMERIC,
        v_item->>'image_url',
        (v_item->>'weight')::NUMERIC,
        COALESCE((v_item->>'made_to_order')::BOOLEAN, false),
        p.capacity_units,
        p.bundle_items
      FROM (SELECT 1) one
      LEFT JOIN public.products p ON p.id = v_item->>'product_id';
    END LOOP;
  END IF;

  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, changed_by_role, changed_by_id, note
  ) VALUES (
    v_order_id, NULL, v_status,
    COALESCE(p_order->>'changed_by_role', 'customer'),
    p_user_id::TEXT,
    COALESCE(p_order->>'history_note', 'Sipariş oluşturuldu')
  );

  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET total_orders = COALESCE(total_orders, 0) + 1,
        total_spent = COALESCE(total_spent, 0) + v_total,
        last_order_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- B2B cari (yalnızca admin/sunucu yolu; web siparişi cari_id göndermez)
  v_cari_id := NULLIF(TRIM(COALESCE(p_order->>'cari_id', '')), '');
  IF v_cari_id IS NOT NULL THEN
    v_pay_method := CASE
      WHEN p_order->>'payment_method' = 'cash_on_delivery' THEN 'cash'
      WHEN p_order->>'payment_method' = 'pos_at_door' THEN 'pos'
      ELSE p_order->>'payment_method'
    END;
    SELECT balance INTO v_cari_balance FROM public.current_accounts WHERE id = v_cari_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CARI_NOT_FOUND: %', v_cari_id;
    END IF;
    v_new_cari_balance := COALESCE(v_cari_balance, 0) + v_total;
    INSERT INTO public.account_transactions (
      account_id, type, amount, description, payment_method, order_id,
      slip_number, balance_after, date, created_at
    ) VALUES (
      v_cari_id, 'debt', v_total, 'Sipariş Teslimat Fişi [' || v_order_number || ']',
      v_pay_method, v_order_id, v_order_number, v_new_cari_balance, NOW(), NOW()
    ) RETURNING id INTO v_cari_tx_id;
    UPDATE public.current_accounts SET balance = v_new_cari_balance, updated_at = NOW() WHERE id = v_cari_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'cari_transaction_id', v_cari_tx_id
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Atomic order creation failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) TO service_role;

-- 7) admin_save_product: ürün + gelecekteki satış günleri TEK işlemde ------------------------
--   p_product: products satırı (jsonb, sütun adlarıyla); p_sale_dates: [{date, limit}] ;
--   p_from: bugün (İstanbul). Geçmiş satış günleri kayıt olarak kalır.
CREATE OR REPLACE FUNCTION public.admin_save_product(p_product JSONB, p_sale_dates JSONB, p_from DATE)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT := p_product->>'id';
BEGIN
  IF v_id IS NULL OR v_id = '' THEN
    RAISE EXCEPTION 'PRODUCT_ID_REQUIRED';
  END IF;

  INSERT INTO public.products AS p (
    id, slug, name, description, price, compare_at_price, image_url, category, weight, weight_unit,
    is_available, is_active, is_popular, is_new, made_to_order, availability, daily_limit,
    lead_time_days, capacity_units, bundle_items, cross_sell, display_order, ingredients,
    flour_types, hydration, masterclass, updated_at
  )
  SELECT r.id, r.slug, r.name, r.description, r.price, r.compare_at_price, r.image_url, r.category, r.weight,
         r.weight_unit, r.is_available, r.is_active, r.is_popular, r.is_new, r.made_to_order,
         COALESCE(r.availability, 'daily'), r.daily_limit, COALESCE(r.lead_time_days, 0),
         COALESCE(r.capacity_units, 1), r.bundle_items, COALESCE(r.cross_sell, '{}'), COALESCE(r.display_order, 0),
         r.ingredients, r.flour_types, r.hydration, r.masterclass, now()
  FROM jsonb_populate_record(NULL::public.products, p_product) r
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
    compare_at_price = EXCLUDED.compare_at_price, image_url = EXCLUDED.image_url, category = EXCLUDED.category,
    weight = EXCLUDED.weight, weight_unit = EXCLUDED.weight_unit, is_available = EXCLUDED.is_available,
    is_active = EXCLUDED.is_active, is_popular = EXCLUDED.is_popular, is_new = EXCLUDED.is_new,
    made_to_order = EXCLUDED.made_to_order, availability = EXCLUDED.availability,
    daily_limit = EXCLUDED.daily_limit, lead_time_days = EXCLUDED.lead_time_days,
    capacity_units = EXCLUDED.capacity_units, bundle_items = EXCLUDED.bundle_items,
    cross_sell = EXCLUDED.cross_sell, display_order = EXCLUDED.display_order,
    ingredients = EXCLUDED.ingredients, flour_types = EXCLUDED.flour_types, hydration = EXCLUDED.hydration,
    masterclass = EXCLUDED.masterclass, updated_at = now();

  DELETE FROM public.product_sale_dates WHERE product_id = v_id AND sale_date >= p_from;

  INSERT INTO public.product_sale_dates (product_id, sale_date, quantity_limit)
  SELECT DISTINCT ON ((d->>'date')::date) v_id, (d->>'date')::date, NULLIF(d->>'limit', '')::integer
  FROM jsonb_array_elements(COALESCE(p_sale_dates, '[]'::jsonb)) d
  WHERE (d->>'date')::date >= p_from;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) TO service_role;

-- Öz-kontrol
DO $$ BEGIN
  IF to_regclass('public.product_sale_dates') IS NULL OR to_regclass('public.capacity_days') IS NULL THEN
    RAISE EXCEPTION '015 öz-kontrol: yeni tablolar oluşmadı';
  END IF;
  IF has_function_privilege('anon', 'public.create_order_atomic(jsonb,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION '015 öz-kontrol: create_order_atomic anon tarafından çağrılabiliyor';
  END IF;
END $$;

INSERT INTO public.app_migrations (id) VALUES ('015_flexible_products') ON CONFLICT DO NOTHING;

COMMIT;
