-- ==============================================================================
-- 032_zero_friction_dispatch_b2b_cockpit.sql (Faz 5 — Sevkiyat & B2B Kokpiti)
-- ==============================================================================
-- NE ZAMAN: Faz 5 uygulama kodu yayınlanmadan ÖNCE çalıştırılır (eklemeli şema
--   genişletmeleri + geriye uyumlu create_order_atomic + yeni atomik B2B teslim
--   RPC'si).
-- NASIL: Supabase SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile
--   kuru deneme yapın, ardından COMMIT ile çalıştırın.
--   Sonrasında `supabase/tests/032_zero_friction_dispatch_b2b_cockpit.sql`
--   duman testini çalıştırın.
-- ==============================================================================

BEGIN;

-- 1) CURRENT_ACCOUNTS & ORDERS ŞEMA GENİŞLETMELERİ ------------------------------

ALTER TABLE public.current_accounts
  ADD COLUMN IF NOT EXISTS default_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;

ALTER TABLE public.current_accounts
  ADD COLUMN IF NOT EXISTS standing_order JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.current_accounts
  DROP CONSTRAINT IF EXISTS current_accounts_standing_order_object_check;
ALTER TABLE public.current_accounts
  ADD CONSTRAINT current_accounts_standing_order_object_check
  CHECK (jsonb_typeof(standing_order) = 'object');

CREATE INDEX IF NOT EXISTS idx_current_accounts_default_courier
  ON public.current_accounts(default_courier_id)
  WHERE default_courier_id IS NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS check_orders_source;
ALTER TABLE public.orders
  ADD CONSTRAINT check_orders_source
  CHECK (source IN ('web', 'whatsapp', 'phone', 'in_store', 'admin', 'standing_order'));

CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status_courier
  ON public.orders(delivery_date, status, courier_id);

-- 2) STAFF OPERASYONEL OKUMA RLS POLİTİKALARI ----------------------------------
-- Müşteri, kurye ve admin SELECT politikaları korunur; yalnızca operasyon
-- tablolarına (orders, order_items, order_status_history, couriers,
-- production_checks) staff SELECT erişimi eklenir.
-- Finans/denetim tabloları (current_accounts, account_transactions, payments,
-- courier_settlements, audit_logs) KESİNLİKLE is_admin() olarak kalır.

CREATE OR REPLACE FUNCTION public.is_ops_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = auth.uid()
       AND role IN ('admin', 'superadmin', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_ops_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ops_staff() TO authenticated, service_role;

DROP POLICY IF EXISTS "ops_staff_select_orders" ON public.orders;
CREATE POLICY "ops_staff_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_ops_staff());

DROP POLICY IF EXISTS "ops_staff_select_order_items" ON public.order_items;
CREATE POLICY "ops_staff_select_order_items" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.is_ops_staff());

DROP POLICY IF EXISTS "ops_staff_select_order_status_history" ON public.order_status_history;
CREATE POLICY "ops_staff_select_order_status_history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.is_ops_staff());

DROP POLICY IF EXISTS "ops_staff_select_couriers" ON public.couriers;
CREATE POLICY "ops_staff_select_couriers" ON public.couriers
  FOR SELECT TO authenticated
  USING (public.is_ops_staff());

DROP POLICY IF EXISTS "ops_staff_select_production_checks" ON public.production_checks;
CREATE POLICY "ops_staff_select_production_checks" ON public.production_checks
  FOR SELECT TO authenticated
  USING (public.is_ops_staff());

-- 3) CREATE_ORDER_ATOMIC GÜNCELLEMESİ (018 ÜZERİNE) ----------------------------
-- Vitrin (v_bypass = false) kuralları harfiyen korunur.
-- Operasyon (v_bypass = true) yolunda:
--   - başlangıç durumu 'bekliyor' | 'hazirlaniyor' | 'firinda' | 'kuryede'
--   - is_available = false olan aktif ürünler kabul edilir (yalnız is_active = false reddedilir)
--   - serbest kalem (product_id NULL/boş, unit_price >= 0) desteklenir
--   - courier_id, assigned_at, stop_sequence, courier_notes alanları kaydedilir

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
  v_item_product_id TEXT;
  v_total NUMERIC;
  v_status TEXT;
  v_delivery_date DATE;
  v_today DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_idem TEXT;
  v_existing RECORD;
  v_bypass BOOLEAN := COALESCE((p_order->>'bypass_limits')::boolean, false);
  v_courier_id UUID;
  v_assigned_at TIMESTAMPTZ;
  v_stop_sequence INT;
  v_courier_notes TEXT;
  v_line RECORD;
  v_prod RECORD;
  v_limit INTEGER;
  v_sale_limit INTEGER;
  v_reserved INTEGER;
  v_new_units INTEGER := 0;
  v_cap INTEGER;
  v_used INTEGER;
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
  IF v_bypass THEN
    IF v_status NOT IN ('bekliyor', 'hazirlaniyor', 'firinda', 'kuryede') THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: %', v_status;
    END IF;
  ELSE
    IF v_status NOT IN ('bekliyor', 'hazirlaniyor') THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: %', v_status;
    END IF;
  END IF;

  -- Aynı gün için kapasite/limit kontrolleri sıraya girer (sayaç yok, SUM ile)
  PERFORM pg_advisory_xact_lock(hashtext('ekmeklab:capacity:' || v_delivery_date::text));

  -- Kilit beklerken aynı anahtarlı eşzamanlı istek kaydedilmiş olabilir: kazananı döndür
  IF v_idem IS NOT NULL THEN
    SELECT id, order_number INTO v_existing FROM public.orders WHERE idempotency_key = v_idem;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'order_id', v_existing.id,
                                'order_number', v_existing.order_number, 'is_existing', true);
    END IF;
  END IF;

  FOR v_line IN
    SELECT
      NULLIF(btrim(COALESCE(x->>'product_id', '')), '') AS product_id,
      SUM((x->>'quantity')::integer) AS qty,
      SUM((x->>'quantity')::integer * COALESCE((x->>'capacity_units')::integer, 0)) AS custom_units,
      BOOL_OR((x->>'unit_price') IS NULL OR (x->>'unit_price')::numeric < 0) AS has_invalid_price,
      BOOL_OR(NULLIF(btrim(COALESCE(x->>'product_name', '')), '') IS NULL) AS has_missing_name,
      BOOL_OR((x->>'quantity') IS NULL OR (x->>'quantity')::integer <= 0) AS has_invalid_qty
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) x
    GROUP BY 1
  LOOP
    IF v_line.has_invalid_qty THEN
      RAISE EXCEPTION 'INVALID_ITEM_QUANTITY';
    END IF;

    IF v_line.product_id IS NULL THEN
      IF NOT v_bypass THEN
        RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: custom';
      END IF;
      IF v_line.has_missing_name THEN
        RAISE EXCEPTION 'INVALID_ITEM_NAME';
      END IF;
      IF v_line.has_invalid_price THEN
        RAISE EXCEPTION 'INVALID_ITEM_PRICE';
      END IF;
      v_new_units := v_new_units + COALESCE(v_line.custom_units, 0);
      CONTINUE;
    END IF;

    SELECT id, name, is_active, is_available, availability, daily_limit, lead_time_days, capacity_units
      INTO v_prod FROM public.products WHERE id = v_line.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: %', v_line.product_id;
    END IF;
    IF v_prod.is_active IS FALSE THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: %', v_prod.name;
    END IF;
    IF NOT v_bypass AND v_prod.is_available IS FALSE THEN
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

  v_courier_id := NULLIF(btrim(COALESCE(p_order->>'courier_id', '')), '')::UUID;
  v_assigned_at := CASE
    WHEN v_courier_id IS NOT NULL THEN COALESCE((p_order->>'assigned_at')::TIMESTAMPTZ, now())
    ELSE NULL
  END;
  v_stop_sequence := NULLIF(btrim(COALESCE(p_order->>'stop_sequence', '')), '')::INT;
  v_courier_notes := NULLIF(p_order->>'courier_notes', '');

  BEGIN
    INSERT INTO public.orders (
      id, order_number, user_id, customer_name, phone, delivery_method,
      delivery_address, district, neighborhood, address_detail, delivery_date,
      status, payment_method, payment_status, source, subtotal, shipping_fee,
      total_amount, order_notes, idempotency_key, location_shared,
      customer_lat, customer_lng, location_consent_at, cari_id,
      courier_id, assigned_at, stop_sequence,
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
      v_courier_id, v_assigned_at, v_stop_sequence,
      v_courier_notes, p_order->>'delivery_time_window',
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
      v_item_product_id := NULLIF(btrim(COALESCE(v_item->>'product_id', '')), '');
      INSERT INTO public.order_items (
        order_id, product_id, product_name, quantity, unit_price, total_price,
        image_url, weight, made_to_order, capacity_units, components
      )
      SELECT
        v_order_id,
        v_item_product_id,
        v_item->>'product_name',
        (v_item->>'quantity')::INTEGER,
        (v_item->>'unit_price')::NUMERIC,
        COALESCE(
          (v_item->>'total_price')::NUMERIC,
          ROUND((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC, 2)
        ),
        v_item->>'image_url',
        (v_item->>'weight')::NUMERIC,
        COALESCE((v_item->>'made_to_order')::BOOLEAN, false),
        COALESCE(p.capacity_units, NULLIF(btrim(COALESCE(v_item->>'capacity_units', '')), '')::INTEGER, 0),
        p.bundle_items
      FROM (SELECT 1) one
      LEFT JOIN public.products p ON p.id = v_item_product_id;
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

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Atomic order creation failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) TO service_role;

-- 4) YENİ ATOMİK RPC: DELIVER_B2B_ORDER_FLEXIBLE_ATOMIC -------------------------
-- B2B/cari siparişinde sahada değişen adetleri, bayat/fire iadesini ve kısmi
-- kapıda tahsilatı tek işlemde atomik olarak işler; order_items + orders +
-- payments + cari defterini senkron tutar.

CREATE OR REPLACE FUNCTION public.deliver_b2b_order_flexible_atomic(
  p_order_id TEXT,
  p_delivered_items JSONB,
  p_return_items JSONB DEFAULT '[]'::jsonb,
  p_collected_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT 'courier',
  p_actor_id TEXT DEFAULT NULL,
  p_courier_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_allow_over_limit BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_account RECORD;
  v_item JSONB;
  v_pid TEXT;
  v_name TEXT;
  v_qty INTEGER;
  v_unit_price NUMERIC;
  v_line_total NUMERIC;
  v_gross NUMERIC := 0;
  v_return NUMERIC := 0;
  v_net_subtotal NUMERIC := 0;
  v_net_total NUMERIC := 0;
  v_collected NUMERIC := ROUND(COALESCE(p_collected_amount, 0), 2);
  v_prev_paid NUMERIC := 0;
  v_total_paid NUMERIC := 0;
  v_payment_status TEXT;
  v_ledger_items JSONB := '[]'::jsonb;
  v_ledger_method TEXT;
  v_sale_tx JSONB := NULL;
  v_pay_tx JSONB := NULL;
  v_pay_tx_id UUID := NULL;
  v_payment_id UUID := NULL;
  v_del_count INT := 0;
  v_ret_count INT := 0;
  v_effective_courier UUID;
  v_actor_uuid UUID;
  v_clean_note TEXT := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF p_actor_role NOT IN ('courier', 'staff', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE: %', p_actor_role;
  END IF;

  IF v_collected < 0 THEN
    RAISE EXCEPTION 'INVALID_COLLECTED_AMOUNT';
  END IF;

  IF v_collected > 0 AND (p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'pos', 'transfer')) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: %', COALESCE(p_payment_method, 'null');
  END IF;

  IF p_delivered_items IS NULL OR jsonb_typeof(p_delivered_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;

  IF p_return_items IS NOT NULL AND jsonb_typeof(p_return_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;

  SELECT id, order_number, status::text AS status, cari_id, shipping_fee, delivery_date, courier_id
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;

  IF v_order.cari_id IS NULL THEN
    RAISE EXCEPTION 'NOT_CARI_ORDER: %', p_order_id;
  END IF;

  IF v_order.status = 'teslim_edildi' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  IF v_order.status = 'iptal' THEN
    RAISE EXCEPTION 'ORDER_CANCELLED: %', p_order_id;
  END IF;

  SELECT id, balance, archived_at, credit_limit
    INTO v_account
    FROM public.current_accounts
   WHERE id = v_order.cari_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CARI_NOT_FOUND: %', v_order.cari_id;
  END IF;

  IF v_account.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_ACCOUNT';
  END IF;

  -- Teslim kalemleri doğrulama + brüt hesap
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_delivered_items)
  LOOP
    v_del_count := v_del_count + 1;
    v_name := NULLIF(btrim(COALESCE(v_item->>'name', v_item->>'productName', v_item->>'product_name', '')), '');
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := ROUND(COALESCE((v_item->>'unitPrice')::NUMERIC, (v_item->>'unit_price')::NUMERIC), 2);
    v_pid := NULLIF(btrim(COALESCE(v_item->>'productId', v_item->>'product_id', '')), '');

    IF v_name IS NULL OR v_qty IS NULL OR v_qty <= 0 OR v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'INVALID_ITEMS';
    END IF;

    v_line_total := ROUND(v_qty * v_unit_price, 2);
    v_gross := ROUND(v_gross + v_line_total, 2);

    v_ledger_items := v_ledger_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_pid,
        'name', v_name,
        'productName', v_name,
        'quantity', v_qty,
        'unitPrice', v_unit_price,
        'lineTotal', v_line_total,
        'isReturn', false
      )
    );
  END LOOP;

  -- İade kalemleri doğrulama + iade düşümü
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_return_items, '[]'::jsonb))
  LOOP
    v_ret_count := v_ret_count + 1;
    v_name := NULLIF(btrim(COALESCE(v_item->>'name', v_item->>'productName', v_item->>'product_name', '')), '');
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := ROUND(COALESCE((v_item->>'unitPrice')::NUMERIC, (v_item->>'unit_price')::NUMERIC), 2);
    v_pid := NULLIF(btrim(COALESCE(v_item->>'productId', v_item->>'product_id', '')), '');

    IF v_name IS NULL OR v_qty IS NULL OR v_qty <= 0 OR v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'INVALID_ITEMS';
    END IF;

    v_line_total := ROUND(v_qty * v_unit_price, 2);
    v_return := ROUND(v_return + v_line_total, 2);

    v_ledger_items := v_ledger_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_pid,
        'name', v_name || ' (İade)',
        'productName', v_name,
        'quantity', -v_qty,
        'unitPrice', v_unit_price,
        'lineTotal', -v_line_total,
        'isReturn', true
      )
    );
  END LOOP;

  IF (v_del_count + v_ret_count) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;

  v_net_subtotal := GREATEST(ROUND(v_gross - v_return, 2), 0);
  v_net_total := ROUND(v_net_subtotal + COALESCE(v_order.shipping_fee, 0), 2);

  IF COALESCE(v_account.credit_limit, 0) > 0
     AND NOT COALESCE(p_allow_over_limit, false)
     AND (COALESCE(v_account.balance, 0) + v_net_total - v_collected) > v_account.credit_limit THEN
    RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED';
  END IF;

  -- Sipariş kalemlerini gerçek teslim edilenlerle değiştir
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_delivered_items)
  LOOP
    v_name := NULLIF(btrim(COALESCE(v_item->>'name', v_item->>'productName', v_item->>'product_name', '')), '');
    v_qty := (v_item->>'quantity')::INTEGER;
    v_unit_price := ROUND(COALESCE((v_item->>'unitPrice')::NUMERIC, (v_item->>'unit_price')::NUMERIC), 2);
    v_pid := NULLIF(btrim(COALESCE(v_item->>'productId', v_item->>'product_id', '')), '');
    v_line_total := ROUND(v_qty * v_unit_price, 2);

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      image_url, weight, capacity_units, components
    )
    SELECT
      p_order_id,
      v_pid,
      v_name,
      v_qty,
      v_unit_price,
      v_line_total,
      COALESCE(NULLIF(btrim(COALESCE(v_item->>'imageUrl', v_item->>'image_url', '')), ''), p.image_url),
      COALESCE(NULLIF(btrim(COALESCE(v_item->>'weight', '')), '')::NUMERIC, p.weight),
      COALESCE(
        NULLIF(btrim(COALESCE(v_item->>'capacityUnits', v_item->>'capacity_units', '')), '')::INTEGER,
        p.capacity_units,
        0
      ),
      p.bundle_items
    FROM (SELECT 1) one
    LEFT JOIN public.products p ON p.id = v_pid;
  END LOOP;

  SELECT COALESCE(SUM(amount) FILTER (WHERE method <> 'cari'), 0)
    INTO v_prev_paid
    FROM public.payments
   WHERE order_id = p_order_id AND status = 'completed';

  v_total_paid := ROUND(v_prev_paid + v_collected, 2);
  v_payment_status := CASE
    WHEN v_net_total <= 0 OR v_total_paid >= v_net_total THEN 'paid'
    WHEN v_total_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  v_effective_courier := COALESCE(p_courier_id, v_order.courier_id);
  v_actor_uuid := CASE
    WHEN p_actor_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN p_actor_id::uuid
    ELSE NULL
  END;

  UPDATE public.orders
     SET subtotal = v_net_subtotal,
         total_amount = v_net_total,
         status = 'teslim_edildi'::order_status_type,
         delivered_at = now(),
         courier_id = v_effective_courier,
         payment_status = v_payment_status,
         updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO public.order_status_history (
    order_id, from_status, to_status, changed_by_role, changed_by_id, note
  ) VALUES (
    p_order_id,
    v_order.status,
    'teslim_edildi',
    p_actor_role,
    p_actor_id,
    COALESCE(v_clean_note, 'Esnek B2B teslimat')
      || CASE
           WHEN v_collected > 0 THEN ' · tahsilat: ' || v_collected::text || ' (' || p_payment_method || ')'
           ELSE ''
         END
  );

  IF v_net_total > 0 AND NOT EXISTS (
    SELECT 1 FROM public.account_transactions t
     WHERE t.order_id = p_order_id
       AND t.type = 'satis'
       AND NOT EXISTS (SELECT 1 FROM public.account_transactions s WHERE s.reverses_id = t.id)
  ) THEN
    v_sale_tx := public.record_cari_transaction_atomic(
      p_account_id => v_order.cari_id,
      p_type => 'satis',
      p_amount => v_net_total,
      p_description => COALESCE(v_clean_note, 'Teslimat ' || COALESCE(v_order.order_number, p_order_id)),
      p_payment_method => NULL,
      p_date => v_order.delivery_date,
      p_items => v_ledger_items,
      p_order_id => p_order_id,
      p_reverses_id => NULL,
      p_created_by => v_actor_uuid
    );
  END IF;

  IF v_collected > 0 THEN
    v_ledger_method := CASE p_payment_method
      WHEN 'cash' THEN 'nakit'
      WHEN 'pos' THEN 'pos'
      ELSE 'banka_havale'
    END;

    v_pay_tx := public.record_cari_transaction_atomic(
      p_account_id => v_order.cari_id,
      p_type => 'tahsilat',
      p_amount => v_collected,
      p_description => 'Teslimatta tahsilat · ' || COALESCE(v_order.order_number, p_order_id),
      p_payment_method => v_ledger_method,
      p_date => NULL,
      p_items => NULL,
      p_order_id => p_order_id,
      p_reverses_id => NULL,
      p_created_by => v_actor_uuid
    );

    v_pay_tx_id := (v_pay_tx->>'transaction_id')::UUID;

    INSERT INTO public.payments (
      order_id, amount, method, status, paid_at, collected_by, courier_id, cari_transaction_id, note
    ) VALUES (
      p_order_id,
      v_collected,
      p_payment_method,
      'completed',
      now(),
      p_actor_role,
      v_effective_courier,
      v_pay_tx_id,
      v_clean_note
    )
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already', false,
    'net_total', v_net_total,
    'collected', v_collected,
    'payment_id', v_payment_id,
    'sale_transaction', v_sale_tx,
    'payment_transaction', v_pay_tx
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deliver_b2b_order_flexible_atomic(TEXT, JSONB, JSONB, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_b2b_order_flexible_atomic(TEXT, JSONB, JSONB, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN)
  TO service_role;

INSERT INTO public.app_migrations (id)
VALUES ('032_zero_friction_dispatch_b2b_cockpit')
ON CONFLICT (id) DO NOTHING;

COMMIT;
