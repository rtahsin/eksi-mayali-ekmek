-- ==============================================================================
-- 🍞 EKMEKLAB MIGRATION: 012_order_to_cari_automation.sql
-- B2B Sipariş → Cari Hesap Otomasyonu (Atomik create_order_atomic Güncellemesi)
-- ==============================================================================

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
  v_cari_id TEXT;
  v_cari_balance NUMERIC;
  v_new_cari_balance NUMERIC;
  v_cari_tx_id UUID;
BEGIN
  v_order_number := public.generate_order_number();
  v_order_id := p_order->>'id';

  IF v_order_id IS NULL OR v_order_id = '' THEN
    v_order_id := 'ORD-' || substring(gen_random_uuid()::text from 1 for 8);
  END IF;

  v_total := (p_order->>'total_amount')::NUMERIC;
  v_pay_method := CASE
    WHEN p_order->>'payment_method' = 'cash_on_delivery' THEN 'cash'
    WHEN p_order->>'payment_method' = 'pos_at_door' THEN 'pos'
    WHEN p_order->>'payment_method' = 'cari' THEN 'cari'
    ELSE 'online_card'
  END;

  -- 1. Siparişi Ekle (PostgreSQL enum tiplerine açık cast ile)
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
    v_total,
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

  -- 7. B2B Cari Hesap Otomasyonu (Cari ID Tanımlıysa)
  v_cari_id := p_order->>'cari_id';
  IF v_cari_id IS NOT NULL AND TRIM(v_cari_id) != '' THEN
    -- Cari hesabın varlığını ve mevcut bakiyesini kilitleyerek oku (FOR UPDATE)
    SELECT balance INTO v_cari_balance
    FROM public.current_accounts
    WHERE id = v_cari_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Belirtilen cari hesap bulunamadı: %', v_cari_id;
    END IF;

    -- Simetrik bakiye: Satış borçtur (+)
    v_new_cari_balance := COALESCE(v_cari_balance, 0) + v_total;

    -- account_transactions tablosuna borç (debt) kaydı oluştur
    INSERT INTO public.account_transactions (
      account_id,
      type,
      amount,
      description,
      payment_method,
      order_id,
      slip_number,
      balance_after,
      date,
      created_at
    ) VALUES (
      v_cari_id,
      'debt',
      v_total,
      'Sipariş Teslimat Fişi [' || v_order_number || ']',
      v_pay_method,
      v_order_id,
      v_order_number,
      v_new_cari_balance,
      NOW(),
      NOW()
    ) RETURNING id INTO v_cari_tx_id;

    -- payments tablosundaki cari_transaction_id referansını güncelle
    UPDATE public.payments
    SET cari_transaction_id = v_cari_tx_id
    WHERE order_id = v_order_id;

    -- current_accounts tablosundaki bakiyeyi güncelle
    UPDATE public.current_accounts
    SET balance = v_new_cari_balance,
        updated_at = NOW()
    WHERE id = v_cari_id;
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
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB, JSONB, UUID) TO postgres;
