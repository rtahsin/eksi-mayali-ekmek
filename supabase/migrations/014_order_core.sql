-- ==============================================================================
-- 014_order_core.sql  (Faz 1 — docs/YOL_HARITASI.md §6)
-- ==============================================================================
-- NE ZAMAN: Faz 1 uygulama kodu canlıya alındıktan SONRA (uygulama artık
--   `delivery_date` olarak ISO tarih gönderiyor ve terms alanlarını yolluyor;
--   eski RPC bilinmeyen alanları yok sayar, yani sıra güvenli).
-- NASIL: önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/014_smoke.sql.
-- Ön kontrol (ayrı çalıştırın):
--   SELECT delivery_date, count(*) FROM public.orders GROUP BY 1 ORDER BY 2 DESC;
--
-- İçerik:
--   1) orders.delivery_date: metin ("today"/"tomorrow"/"custom:…") → DATE (İstanbul günü)
--   2) idempotency_key: yinelenenleri boşalt + kısmi UNIQUE index
--   3) order_items(order_id), order_items(product_id) indeksleri
--   4) orders.terms_accepted_at, orders.terms_version (mesafeli satış / KVKK onay ispatı)
--   5) create_order_atomic v3 (aynı imza):
--      - ISO teslim tarihi zorunlu (INVALID_DELIVERY_DATE)
--      - idempotency: aynı anahtar → mevcut siparişi döndürür (eşzamanlı istek dahil)
--      - başlangıç durumu yalnızca bekliyor/hazirlaniyor
--      - oluşturmada payments satırı YOK (ödeme tahsil edilince yazılır)
--      - müşteri konumu sadece siparişe yazılır (customer_locations kullanılmıyor)
--      - cari bloğu admin yolu için korunur
--      - SET search_path + açık REVOKE/GRANT
-- ==============================================================================

BEGIN;

-- 1) delivery_date → DATE ------------------------------------------------------
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_date') <> 'date' THEN
    ALTER TABLE public.orders ALTER COLUMN delivery_date DROP DEFAULT;
    ALTER TABLE public.orders ALTER COLUMN delivery_date TYPE date USING (
      CASE
        WHEN delivery_date ~ '^\d{4}-\d{2}-\d{2}$'        THEN delivery_date::date
        WHEN delivery_date ~ '^custom:\d{4}-\d{2}-\d{2}$' THEN substr(delivery_date, 8)::date
        WHEN delivery_date = 'tomorrow' THEN (created_at AT TIME ZONE 'Europe/Istanbul')::date + 1
        ELSE (created_at AT TIME ZONE 'Europe/Istanbul')::date
      END);
  END IF;
END $$;
ALTER TABLE public.orders ALTER COLUMN delivery_date SET NOT NULL;

-- 2) idempotency_key: tekillik ---------------------------------------------------
UPDATE public.orders o SET idempotency_key = NULL
WHERE o.idempotency_key IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.orders x
              WHERE x.idempotency_key = o.idempotency_key
                AND (x.created_at, x.id) < (o.created_at, o.id));
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency_key
  ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3) indeksler -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- 4) yasal onay sütunları --------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_version text;

-- 5) create_order_atomic v3 ------------------------------------------------------
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
  v_idem TEXT;
  v_existing RECORD;
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
      v_order_id,
      v_order_number,
      p_user_id,
      p_order->>'customer_name',
      p_order->>'phone',
      COALESCE(p_order->>'delivery_method', 'courier')::delivery_method_type,
      p_order->>'delivery_address',
      COALESCE(p_order->>'district', 'Beylikdüzü'),
      p_order->>'neighborhood',
      p_order->>'address_detail',
      v_delivery_date,
      v_status::order_status_type,
      (p_order->>'payment_method')::payment_method_type,
      COALESCE(p_order->>'payment_status', 'pending'),
      COALESCE(p_order->>'source', 'web'),
      (p_order->>'subtotal')::NUMERIC,
      (p_order->>'shipping_fee')::NUMERIC,
      v_total,
      p_order->>'order_notes',
      v_idem,
      COALESCE((p_order->>'location_shared')::BOOLEAN, false),
      (p_order->>'customer_lat')::DOUBLE PRECISION,
      (p_order->>'customer_lng')::DOUBLE PRECISION,
      (p_order->>'location_consent_at')::TIMESTAMPTZ,
      NULLIF(p_order->>'cari_id', ''),
      p_order->>'courier_notes',
      p_order->>'delivery_time_window',
      (p_order->>'terms_accepted_at')::TIMESTAMPTZ,
      p_order->>'terms_version',
      COALESCE((p_order->>'created_at')::TIMESTAMPTZ, NOW()),
      COALESCE((p_order->>'updated_at')::TIMESTAMPTZ, NOW())
    );
  EXCEPTION WHEN unique_violation THEN
    -- Eşzamanlı aynı idempotency anahtarı: kazanan siparişi döndür
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

-- Öz-kontrol: tip dönüşümü gerçekten oldu mu
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_date') <> 'date' THEN
    RAISE EXCEPTION '014 öz-kontrol: delivery_date DATE değil';
  END IF;
  IF has_function_privilege('anon', 'public.create_order_atomic(jsonb,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION '014 öz-kontrol: create_order_atomic anon tarafından çağrılabiliyor';
  END IF;
END $$;

INSERT INTO public.app_migrations (id) VALUES ('014_order_core') ON CONFLICT DO NOTHING;

COMMIT;
