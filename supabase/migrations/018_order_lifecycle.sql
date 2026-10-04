-- ==============================================================================
-- 018_order_lifecycle.sql  (Faz 3b-2 — docs/YOL_HARITASI.md §6)
-- ==============================================================================
-- NE ZAMAN: Faz 3b-2 uygulama kodu yayınlanmadan ÖNCE (yeni fonksiyonlar eklemeli;
--   create_order_atomic v5 eski çağrılarla uyumlu). Önce sonu ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/018_smoke.sql.
--
-- İçerik:
--   1) create_order_atomic v5: cari siparişte sipariş anında borç YAZILMAZ (015'teki dal eski
--      "debt" türüyle yazıyordu ve 016 sonrası kırıktı). Cari borcu teslimde yazılır.
--   2) mark_order_delivered: teslim + ödeme + cari tek işlemde; aynı teslim iki kez gelirse
--      (çevrimdışı kuyruk tekrarı) ikinci çağrı hiçbir şey yazmaz.
--        cash/pos/transfer → tek "completed" ödeme satırı, payment_status = paid
--        unpaid            → ödeme satırı yok, payment_status = pending
--        cari siparişte    → teslimat fişi (satis, sipariş kalemleriyle) + nakit/POS/havale ise tahsilat
--   3) cancel_order_atomic: iptal + geçmiş + cari siparişin fiş/tahsilatlarına storno.
--   4) generate_order_number tarayıcı rolünden geri alınır (manuel sipariş artık sunucuda).
-- ==============================================================================

BEGIN;

-- 1) create_order_atomic v5 (015 v4'ün aynısı; yalnız cari defter dalı çıkarıldı) ---------------
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

  -- Cari siparişte borç sipariş anında yazılmaz: teslimde mark_order_delivered yazar (018)

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

-- 2) mark_order_delivered ------------------------------------------------------------------
--   p_payment: 'cash' | 'pos' | 'transfer' | 'unpaid'
--   p_actor_role: 'courier' | 'admin' ; p_courier_id: couriers.id (varsa)
CREATE OR REPLACE FUNCTION public.mark_order_delivered(
  p_order_id TEXT,
  p_payment TEXT,
  p_actor_role TEXT DEFAULT 'admin',
  p_actor_id TEXT DEFAULT NULL,
  p_courier_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_payment_id UUID;
  v_cari_tx UUID;
  v_ledger_method TEXT;
  r JSONB;
BEGIN
  IF p_payment NOT IN ('cash', 'pos', 'transfer', 'unpaid') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT: %', p_payment;
  END IF;
  IF p_actor_role NOT IN ('courier', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE: %', p_actor_role;
  END IF;

  SELECT id, order_number, status::text AS status, cari_id, total_amount, delivery_date
    INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;
  IF v_order.status = 'teslim_edildi' THEN
    -- Çevrimdışı kuyruk tekrarı ya da çift tıklama: ikinci kayıt yok
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;
  IF v_order.status = 'iptal' THEN
    RAISE EXCEPTION 'ORDER_CANCELLED: %', p_order_id;
  END IF;

  UPDATE public.orders
  SET status = 'teslim_edildi'::order_status_type,
      delivered_at = now(),
      payment_status = CASE WHEN p_payment = 'unpaid' THEN 'pending' ELSE 'paid' END,
      courier_id = COALESCE(p_courier_id, courier_id),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by_role, changed_by_id, note)
  VALUES (p_order_id, v_order.status, 'teslim_edildi', p_actor_role, p_actor_id,
          COALESCE(NULLIF(TRIM(p_note), ''), 'Teslim edildi') || ' · ödeme: ' || p_payment);

  -- Cari sipariş: teslimat fişi (yoksa) + alınan ödeme cariye tahsilat
  IF v_order.cari_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.account_transactions t
      WHERE t.order_id = p_order_id AND t.type = 'satis'
        AND NOT EXISTS (SELECT 1 FROM public.account_transactions s WHERE s.reverses_id = t.id)
    ) AND COALESCE(v_order.total_amount, 0) > 0 THEN
      SELECT jsonb_agg(jsonb_build_object('name', oi.product_name, 'quantity', oi.quantity,
                                          'unitPrice', oi.unit_price, 'productId', oi.product_id))
        INTO v_items FROM public.order_items oi WHERE oi.order_id = p_order_id;
      PERFORM public.record_cari_transaction_atomic(
        v_order.cari_id, 'satis', v_order.total_amount,
        'Sipariş ' || COALESCE(v_order.order_number, p_order_id), NULL, v_order.delivery_date,
        v_items, p_order_id);
    END IF;

    IF p_payment <> 'unpaid' AND COALESCE(v_order.total_amount, 0) > 0 THEN
      v_ledger_method := CASE p_payment WHEN 'cash' THEN 'nakit' WHEN 'pos' THEN 'pos' ELSE 'banka_havale' END;
      r := public.record_cari_transaction_atomic(
        v_order.cari_id, 'tahsilat', v_order.total_amount,
        'Teslimatta tahsilat · ' || COALESCE(v_order.order_number, p_order_id), v_ledger_method, NULL, NULL, p_order_id);
      v_cari_tx := (r->>'transaction_id')::uuid;
    END IF;
  END IF;

  -- Tek ödeme satırı (aynı sipariş için tamamlanmış ödeme zaten varsa yazılmaz)
  IF p_payment <> 'unpaid' AND COALESCE(v_order.total_amount, 0) > 0
     AND NOT EXISTS (SELECT 1 FROM public.payments WHERE order_id = p_order_id AND status = 'completed') THEN
    INSERT INTO public.payments (order_id, amount, method, status, paid_at, collected_by, courier_id, cari_transaction_id, note)
    VALUES (p_order_id, v_order.total_amount, p_payment, 'completed', now(), p_actor_role, p_courier_id, v_cari_tx, p_note)
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'already', false, 'payment_id', v_payment_id, 'cari_transaction_id', v_cari_tx);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_delivered(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

-- 3) cancel_order_atomic --------------------------------------------------------------------
--   p_expected_status: verilirse sipariş hâlâ o durumda olmalı (müşteri yalnız "bekliyor"u iptal eder)
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
  p_order_id TEXT,
  p_reason TEXT,
  p_actor_role TEXT,
  p_actor_id TEXT DEFAULT NULL,
  p_expected_status TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_tx RECORD;
  v_reversed INTEGER := 0;
BEGIN
  IF p_actor_role NOT IN ('customer', 'admin', 'system') THEN
    RAISE EXCEPTION 'INVALID_ROLE: %', p_actor_role;
  END IF;

  SELECT id, status::text AS status, cari_id INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;
  IF v_order.status = 'iptal' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;
  IF v_order.status = 'teslim_edildi' THEN
    RAISE EXCEPTION 'ORDER_DELIVERED: %', p_order_id;
  END IF;
  IF p_expected_status IS NOT NULL AND v_order.status <> p_expected_status THEN
    RAISE EXCEPTION 'STATUS_CHANGED: %', v_order.status;
  END IF;

  UPDATE public.orders
  SET status = 'iptal'::order_status_type,
      cancelled_at = now(),
      cancelled_by = p_actor_role,
      cancel_reason = NULLIF(TRIM(COALESCE(p_reason, '')), ''),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by_role, changed_by_id, note)
  VALUES (p_order_id, v_order.status, 'iptal', p_actor_role, p_actor_id, NULLIF(TRIM(COALESCE(p_reason, '')), ''));

  -- Bekleyen ödeme satırları kapanır (tamamlanmış ödeme varsa iadesi elle yapılır)
  UPDATE public.payments
  SET status = 'failed', note = 'Sipariş iptali: ' || COALESCE(NULLIF(TRIM(p_reason), ''), '-'), updated_at = now()
  WHERE order_id = p_order_id AND status = 'pending';

  -- Cari: bu siparişe yazılmış ve iptal edilmemiş hareketler ters kayıtla geri alınır
  IF v_order.cari_id IS NOT NULL THEN
    FOR v_tx IN
      SELECT t.id FROM public.account_transactions t
      WHERE t.order_id = p_order_id AND t.type IN ('satis', 'tahsilat')
        AND NOT EXISTS (SELECT 1 FROM public.account_transactions s WHERE s.reverses_id = t.id)
      ORDER BY t.created_at
    LOOP
      PERFORM public.record_cari_transaction_atomic(
        v_order.cari_id, 'storno', 0, 'Sipariş iptali', NULL, NULL, NULL, p_order_id, v_tx.id);
      v_reversed := v_reversed + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already', false, 'reversed', v_reversed);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4) Sipariş numarası yalnız sunucuda -------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO service_role;

INSERT INTO public.app_migrations (id) VALUES ('018_order_lifecycle') ON CONFLICT DO NOTHING;

COMMIT;
