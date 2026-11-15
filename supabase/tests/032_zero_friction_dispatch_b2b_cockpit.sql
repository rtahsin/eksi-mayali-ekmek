-- ==============================================================================
-- 032_zero_friction_dispatch_b2b_cockpit.sql duman testi.
-- Hiçbir şey kalıcı olmaz (ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_day_str TEXT := to_char((now() AT TIME ZONE 'Europe/Istanbul')::date + 1, 'YYYY-MM-DD');
  v_courier_id UUID := gen_random_uuid();
  v_err TEXT;
  v_res JSONB;
  v_order_id TEXT;
BEGIN
  -- 1) Migration kaydı
  ASSERT EXISTS (
    SELECT 1 FROM public.app_migrations WHERE id = '032_zero_friction_dispatch_b2b_cockpit'
  ), '032_zero_friction_dispatch_b2b_cockpit app_migrations kaydı yok';

  -- 2) Yeni kolonlar, CHECK kısıtları ve indeksler
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'current_accounts' AND column_name = 'default_courier_id'
  ), 'current_accounts.default_courier_id yok';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'current_accounts' AND column_name = 'standing_order'
  ), 'current_accounts.standing_order yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_current_accounts_default_courier'
  ), 'idx_current_accounts_default_courier yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_orders_delivery_date_status_courier'
  ), 'idx_orders_delivery_date_status_courier yok';

  -- standing_order object CHECK testi (array reddedilmeli)
  BEGIN
    INSERT INTO public.current_accounts (id, name, balance, standing_order, status, created_at, updated_at)
    VALUES ('cari_BAD032', 'TEST BAD 032', 0, '[]'::jsonb, 'active', now(), now());
    RAISE EXCEPTION 'standing_order array engellenmedi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%current_accounts_standing_order_object_check%', 'Beklenen standing_order check değil: ' || v_err;
  END;

  -- 3) is_ops_staff() yetki + RLS politika izolasyonu
  ASSERT NOT has_function_privilege('anon', 'public.is_ops_staff()', 'EXECUTE'),
    'anon is_ops_staff çağırabiliyor';
  ASSERT has_function_privilege('authenticated', 'public.is_ops_staff()', 'EXECUTE'),
    'authenticated is_ops_staff çağıramıyor';
  ASSERT has_function_privilege('service_role', 'public.is_ops_staff()', 'EXECUTE'),
    'service_role is_ops_staff çağıramıyor';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'ops_staff_select_orders'
  ), 'ops_staff_select_orders yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'ops_staff_select_order_items'
  ), 'ops_staff_select_order_items yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'order_status_history' AND policyname = 'ops_staff_select_order_status_history'
  ), 'ops_staff_select_order_status_history yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'couriers' AND policyname = 'ops_staff_select_couriers'
  ), 'ops_staff_select_couriers yok';
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'production_checks' AND policyname = 'ops_staff_select_production_checks'
  ), 'ops_staff_select_production_checks yok';

  -- Finans/denetim tablolarına staff SELECT politikası ASLA eklenmemeli
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('current_accounts', 'account_transactions', 'payments', 'courier_settlements', 'audit_logs')
       AND (qual ~* 'is_ops_staff' OR qual ~* '''staff''')
  ), 'Finans/denetim tablosuna staff SELECT sızıntısı var';

  -- 4) RPC execute izinleri (yalnız service_role)
  ASSERT NOT has_function_privilege('authenticated', 'public.create_order_atomic(jsonb, jsonb, uuid)', 'EXECUTE'),
    'authenticated create_order_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege('authenticated',
    'public.deliver_b2b_order_flexible_atomic(text, jsonb, jsonb, numeric, text, text, text, uuid, text, boolean)', 'EXECUTE'),
    'authenticated deliver_b2b_order_flexible_atomic çağırabiliyor';
  ASSERT has_function_privilege('service_role',
    'public.deliver_b2b_order_flexible_atomic(text, jsonb, jsonb, numeric, text, text, text, uuid, text, boolean)', 'EXECUTE'),
    'service_role deliver_b2b_order_flexible_atomic çağıramıyor';

  -- 5) Test verileri: kurye, aktif/pasif/unavailable ürünler, cari
  INSERT INTO public.couriers (id, display_name, phone, vehicle_type, is_active, is_on_shift)
  VALUES (v_courier_id, 'TEST Kurye 032', '05550000032', 'motorcycle', true, true);

  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, capacity_units)
  VALUES
    ('SMOKE-032-OK', 'TEST Ekmek 032', 'smoke-032-ok', 100, 'bread', true, true, 'daily', 1),
    ('SMOKE-032-UNAVAIL', 'TEST Toptan Özel 032', 'smoke-032-unavail', 80, 'bread', true, false, 'daily', 1),
    ('SMOKE-032-INACTIVE', 'TEST Pasif 032', 'smoke-032-inactive', 50, 'bread', false, false, 'daily', 1);

  INSERT INTO public.current_accounts (
    id, name, balance, credit_limit, default_courier_id, standing_order, status, created_at, updated_at
  ) VALUES (
    'cari_SMOKE032',
    'TEST B2B 032',
    0,
    300,
    v_courier_id,
    '{"enabled":true,"schedule":{"1":{"SMOKE-032-OK":2}}}'::jsonb,
    'active',
    now(),
    now()
  );

  -- 6) create_order_atomic vitrin (v_bypass = false) sıkı kuralları korumalı
  BEGIN
    PERFORM public.create_order_atomic(
      jsonb_build_object(
        'customer_name', 'TEST Vitrin', 'phone', '05000000000', 'delivery_address', 'TEST',
        'delivery_method', 'courier', 'payment_method', 'cash_on_delivery',
        'subtotal', 100, 'shipping_fee', 0, 'total_amount', 100,
        'delivery_date', v_day_str, 'status', 'kuryede', 'bypass_limits', false
      ),
      '[{"product_id":"SMOKE-032-OK","product_name":"TEST Ekmek 032","quantity":1,"unit_price":100,"total_price":100}]'::jsonb
    );
    RAISE EXCEPTION 'Vitrin kuryede durumuna izin verdi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%INVALID_INITIAL_STATUS%', 'Beklenen INVALID_INITIAL_STATUS değil: ' || v_err;
  END;

  BEGIN
    PERFORM public.create_order_atomic(
      jsonb_build_object(
        'customer_name', 'TEST Vitrin', 'phone', '05000000000', 'delivery_address', 'TEST',
        'delivery_method', 'courier', 'payment_method', 'cash_on_delivery',
        'subtotal', 80, 'shipping_fee', 0, 'total_amount', 80,
        'delivery_date', v_day_str, 'status', 'bekliyor', 'bypass_limits', false
      ),
      '[{"product_id":"SMOKE-032-UNAVAIL","product_name":"TEST Toptan Özel 032","quantity":1,"unit_price":80,"total_price":80}]'::jsonb
    );
    RAISE EXCEPTION 'Vitrin is_available=false ürüne izin verdi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%PRODUCT_UNAVAILABLE%', 'Beklenen PRODUCT_UNAVAILABLE değil: ' || v_err;
  END;

  BEGIN
    PERFORM public.create_order_atomic(
      jsonb_build_object(
        'customer_name', 'TEST Vitrin', 'phone', '05000000000', 'delivery_address', 'TEST',
        'delivery_method', 'courier', 'payment_method', 'cash_on_delivery',
        'subtotal', 25, 'shipping_fee', 0, 'total_amount', 25,
        'delivery_date', v_day_str, 'status', 'bekliyor', 'bypass_limits', false
      ),
      '[{"product_id":null,"product_name":"Serbest","quantity":1,"unit_price":25,"total_price":25}]'::jsonb
    );
    RAISE EXCEPTION 'Vitrin serbest kaleme izin verdi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%PRODUCT_UNAVAILABLE%', 'Beklenen PRODUCT_UNAVAILABLE değil: ' || v_err;
  END;

  -- 7) create_order_atomic operasyon (v_bypass = true): kuryede + is_available=false + serbest kalem + kurye alanları
  v_res := public.create_order_atomic(
    jsonb_build_object(
      'id', 'ORD-SMOKE032-B2B',
      'customer_name', 'TEST B2B 032', 'phone', '05000000032', 'delivery_address', 'TEST Adres',
      'delivery_method', 'courier', 'payment_method', 'cari',
      'subtotal', 210, 'shipping_fee', 0, 'total_amount', 210,
      'delivery_date', v_day_str, 'status', 'kuryede', 'source', 'standing_order',
      'bypass_limits', true, 'cari_id', 'cari_SMOKE032',
      'courier_id', v_courier_id::text, 'stop_sequence', 3, 'courier_notes', 'Arka kapıdan teslim'
    ),
    '[
      {"product_id":"SMOKE-032-UNAVAIL","product_name":"TEST Toptan Özel 032","quantity":2,"unit_price":80,"total_price":160},
      {"product_id":null,"product_name":"Özel Galeta","quantity":2,"unit_price":25,"total_price":50,"capacity_units":0}
    ]'::jsonb
  );
  v_order_id := v_res->>'order_id';
  ASSERT v_order_id = 'ORD-SMOKE032-B2B', 'Sipariş ID beklenenden farklı';
  ASSERT (SELECT courier_id FROM public.orders WHERE id = v_order_id) = v_courier_id, 'courier_id yazılmadı';
  ASSERT (SELECT assigned_at IS NOT NULL FROM public.orders WHERE id = v_order_id), 'assigned_at yazılmadı';
  ASSERT (SELECT stop_sequence FROM public.orders WHERE id = v_order_id) = 3, 'stop_sequence yazılmadı';
  ASSERT (SELECT courier_notes FROM public.orders WHERE id = v_order_id) = 'Arka kapıdan teslim', 'courier_notes yazılmadı';
  ASSERT (SELECT source FROM public.orders WHERE id = v_order_id) = 'standing_order', 'source=standing_order yazılmadı';
  ASSERT (SELECT count(*) FROM public.order_items WHERE order_id = v_order_id AND product_id IS NULL) = 1,
    'serbest kalem order_items içine product_id=NULL ile yazılmadı';

  -- is_active = false bypass ile bile reddedilmeli
  BEGIN
    PERFORM public.create_order_atomic(
      jsonb_build_object(
        'customer_name', 'TEST Pasif', 'phone', '05000000032', 'delivery_address', 'TEST',
        'delivery_method', 'courier', 'payment_method', 'cari',
        'subtotal', 50, 'shipping_fee', 0, 'total_amount', 50,
        'delivery_date', v_day_str, 'status', 'hazirlaniyor', 'bypass_limits', true
      ),
      '[{"product_id":"SMOKE-032-INACTIVE","product_name":"TEST Pasif 032","quantity":1,"unit_price":50,"total_price":50}]'::jsonb
    );
    RAISE EXCEPTION 'is_active=false ürün bypass ile kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%PRODUCT_UNAVAILABLE%', 'Beklenen PRODUCT_UNAVAILABLE değil: ' || v_err;
  END;

  -- 8) deliver_b2b_order_flexible_atomic: non-cari sipariş reddedilmeli
  PERFORM public.create_order_atomic(
    jsonb_build_object(
      'id', 'ORD-SMOKE032-RETAIL',
      'customer_name', 'TEST Perakende', 'phone', '05000000099', 'delivery_address', 'TEST',
      'delivery_method', 'courier', 'payment_method', 'cash_on_delivery',
      'subtotal', 100, 'shipping_fee', 0, 'total_amount', 100,
      'delivery_date', v_day_str, 'status', 'hazirlaniyor', 'bypass_limits', true
    ),
    '[{"product_id":"SMOKE-032-OK","product_name":"TEST Ekmek 032","quantity":1,"unit_price":100,"total_price":100}]'::jsonb
  );

  BEGIN
    PERFORM public.deliver_b2b_order_flexible_atomic(
      'ORD-SMOKE032-RETAIL',
      '[{"productId":"SMOKE-032-OK","name":"TEST Ekmek 032","quantity":1,"unitPrice":100}]'::jsonb
    );
    RAISE EXCEPTION 'Cari olmayan sipariş teslim edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%NOT_CARI_ORDER%', 'Beklenen NOT_CARI_ORDER değil: ' || v_err;
  END;

  -- 9) deliver_b2b_order_flexible_atomic: kredi limiti aşımı engellenmeli (credit_limit=300, net=400, tahsilat=0)
  BEGIN
    PERFORM public.deliver_b2b_order_flexible_atomic(
      v_order_id,
      '[{"productId":"SMOKE-032-OK","name":"TEST Ekmek 032","quantity":4,"unitPrice":100}]'::jsonb,
      '[]'::jsonb,
      0,
      NULL,
      'courier',
      NULL,
      v_courier_id,
      'Limit testi',
      false
    );
    RAISE EXCEPTION 'Kredi limiti aşımı engellenmedi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CREDIT_LIMIT_EXCEEDED%', 'Beklenen CREDIT_LIMIT_EXCEEDED değil: ' || v_err;
  END;

  -- 10) deliver_b2b_order_flexible_atomic: esnek teslimat + iade + kısmi nakit tahsilat
  -- Teslim: 3 * 100 (300) + 2 * 25 serbest (50) = 350 brüt
  -- İade: 1 * 80 = 80 => net_total = 270; tahsilat = 120 (cash) => bakiye = 150 <= 300
  v_res := public.deliver_b2b_order_flexible_atomic(
    v_order_id,
    '[
      {"productId":"SMOKE-032-OK","name":"TEST Ekmek 032","quantity":3,"unitPrice":100},
      {"name":"Özel Galeta","quantity":2,"unitPrice":25}
    ]'::jsonb,
    '[{"productId":"SMOKE-032-UNAVAIL","name":"TEST Toptan Özel 032","quantity":1,"unitPrice":80}]'::jsonb,
    120,
    'cash',
    'courier',
    'courier-smoke-032',
    v_courier_id,
    'TEST kısmi teslim + iade'
  );

  ASSERT NOT (v_res->>'already')::boolean, 'İlk esnek teslim already=true döndü';
  ASSERT (v_res->>'net_total')::numeric = 270, 'net_total 270 değil: ' || (v_res->>'net_total');
  ASSERT (v_res->>'collected')::numeric = 120, 'collected 120 değil';
  ASSERT (v_res->>'payment_id') IS NOT NULL, 'payment_id boş';

  ASSERT (SELECT status::text FROM public.orders WHERE id = v_order_id) = 'teslim_edildi', 'Sipariş teslim_edildi olmadı';
  ASSERT (SELECT total_amount FROM public.orders WHERE id = v_order_id) = 270, 'orders.total_amount 270 değil';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = v_order_id) = 'partial', 'payment_status partial değil';
  ASSERT (SELECT count(*) FROM public.order_items WHERE order_id = v_order_id) = 2, 'order_items güncellenmedi';
  ASSERT (SELECT cari_transaction_id IS NOT NULL FROM public.payments WHERE id = (v_res->>'payment_id')::uuid),
    'payments.cari_transaction_id NULL kaldı';

  -- Simetrik bakiye kontrolü: +270 - 120 = 150
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE032') = 150, 'Cari bakiye 150 değil';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE032')
       = (SELECT SUM(delta) FROM public.account_transactions WHERE account_id = 'cari_SMOKE032'),
    'Simetrik bakiye ≠ SUM(delta)';

  -- 11) İdempotency: aynı siparişe ikinci çağrı already=true döner, çift kayıt atmaz
  v_res := public.deliver_b2b_order_flexible_atomic(
    v_order_id,
    '[{"productId":"SMOKE-032-OK","name":"TEST Ekmek 032","quantity":1,"unitPrice":100}]'::jsonb
  );
  ASSERT (v_res->>'already')::boolean, 'İkinci çağrı already=true dönmedi';
  ASSERT (SELECT count(*) FROM public.payments WHERE order_id = v_order_id) = 1, 'İkinci çağrıda çift ödeme yazıldı';
  ASSERT (SELECT count(*) FROM public.account_transactions WHERE order_id = v_order_id) = 2,
    'İkinci çağrıda çift cari hareketi yazıldı';

  RAISE NOTICE '032 smoke OK (delivery_date=%)', v_day;
END $$;

ROLLBACK;
