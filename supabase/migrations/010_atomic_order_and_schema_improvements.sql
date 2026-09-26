-- ==============================================================================
-- EKMEKLAB MIGRATION 010: ATOMIC ORDER CREATION & SCHEMA IMPROVEMENTS
-- ==============================================================================

-- 1. Unique constraint on order_number
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_order_number'
  ) THEN
    -- In case of existing duplicates, this will ensure uniqueness
    ALTER TABLE public.orders ADD CONSTRAINT uq_orders_order_number UNIQUE (order_number);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint uq_orders_order_number might already exist or conflicting data present';
END $$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status 
  ON public.orders(delivery_date, status);

CREATE INDEX IF NOT EXISTS idx_orders_phone_created 
  ON public.orders(phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
  ON public.orders(user_id) WHERE user_id IS NOT NULL;

-- 3. Orders schema enrichment
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cari_id TEXT 
  REFERENCES public.current_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_time_window TEXT;

-- 4. Account transactions enrichment
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2);
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS slip_number TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 5. Products ordering and quantity rules
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- 6. Sequential, collision-free order number RPC with transaction advisory lock
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  seq_val INTEGER;
  num TEXT;
  lock_key BIGINT;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  
  -- Acquire an advisory xact lock per YYMM window to eliminate race conditions
  lock_key := ('x' || substr(md5('order_number_' || yymm), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);
  
  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(order_number, '^SIP-' || yymm || '-', ''), order_number)::INTEGER
    ), 0
  ) + 1
  INTO seq_val
  FROM public.orders
  WHERE order_number LIKE 'SIP-' || yymm || '-%';
  
  num := 'SIP-' || yymm || '-' || LPAD(seq_val::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Atomic Order Creation Function (single transaction for orders, items, history, payments)
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
  -- Generate order number atomically
  v_order_number := public.generate_order_number();
  v_order_id := p_order->>'id';

  IF v_order_id IS NULL OR v_order_id = '' THEN
    v_order_id := 'ORD-' || substring(gen_random_uuid()::text from 1 for 8);
  END IF;

  -- 1. Insert Order
  INSERT INTO public.orders (
    id,
    order_number,
    user_id,
    customer_name,
    phone,
    delivery_method,
    delivery_address,
    district,
    neighborhood,
    address_detail,
    delivery_date,
    status,
    payment_method,
    payment_status,
    source,
    subtotal,
    shipping_fee,
    total_amount,
    order_notes,
    idempotency_key,
    location_shared,
    customer_lat,
    customer_lng,
    location_consent_at,
    cari_id,
    courier_notes,
    delivery_time_window,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    p_user_id,
    p_order->>'customer_name',
    p_order->>'phone',
    COALESCE(p_order->>'delivery_method', 'courier'),
    p_order->>'delivery_address',
    p_order->>'district',
    p_order->>'neighborhood',
    p_order->>'address_detail',
    COALESCE(p_order->>'delivery_date', 'today'),
    COALESCE(p_order->>'status', 'bekliyor'),
    p_order->>'payment_method',
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

  -- 2. Insert Items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        total_price,
        image_url,
        weight,
        made_to_order
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

  -- 3. Status History
  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_role,
    changed_by_id,
    note
  ) VALUES (
    v_order_id,
    NULL,
    COALESCE(p_order->>'status', 'bekliyor'),
    COALESCE(p_order->>'changed_by_role', 'customer'),
    p_user_id::TEXT,
    COALESCE(p_order->>'history_note', 'Sipariş oluşturuldu')
  );

  -- 4. Payments
  v_total := (p_order->>'total_amount')::NUMERIC;
  v_pay_method := CASE
    WHEN p_order->>'payment_method' = 'cash_on_delivery' THEN 'cash'
    WHEN p_order->>'payment_method' = 'pos_at_door' THEN 'pos'
    WHEN p_order->>'payment_method' = 'cari' THEN 'cari'
    ELSE 'online_card'
  END;

  INSERT INTO public.payments (
    order_id,
    amount,
    method,
    status,
    note
  ) VALUES (
    v_order_id,
    v_total,
    v_pay_method,
    'pending',
    'Sipariş oluşturuldu'
  );

  -- 5. Customer Locations
  IF COALESCE((p_order->>'location_shared')::BOOLEAN, false) 
     AND (p_order->>'customer_lat') IS NOT NULL 
     AND (p_order->>'customer_lng') IS NOT NULL THEN
    INSERT INTO public.customer_locations (
      order_id,
      lat,
      lng,
      accuracy
    ) VALUES (
      v_order_id,
      (p_order->>'customer_lat')::DOUBLE PRECISION,
      (p_order->>'customer_lng')::DOUBLE PRECISION,
      10
    );
  END IF;

  -- 6. Update Profile Stats
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
