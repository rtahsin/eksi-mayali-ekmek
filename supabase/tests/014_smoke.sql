-- ==============================================================================
-- 014_smoke.sql — 014_order_core sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- Hata yoksa son satırda "014 smoke OK" bildirimi görülür.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  v_order JSONB;
  v_items JSONB := '[{"product_id":"TEST-PROD","product_name":"TEST Ekmek","quantity":2,"unit_price":100,"total_price":200}]';
  r1 JSONB;
  r2 JSONB;
  v_date_type TEXT;
  v_payments INT;
  v_terms TEXT;
  v_failed BOOLEAN;
BEGIN
  v_order := jsonb_build_object(
    'id', 'ORD-SMOKE014',
    'customer_name', 'TEST Smoke',
    'phone', '05000000000',
    'delivery_method', 'courier',
    'delivery_address', 'TEST',
    'neighborhood', 'Barış',
    'address_detail', 'TEST',
    'delivery_date', to_char((now() AT TIME ZONE 'Europe/Istanbul')::date + 1, 'YYYY-MM-DD'),
    'status', 'bekliyor',
    'payment_method', 'cash_on_delivery',
    'subtotal', 200, 'shipping_fee', 150, 'total_amount', 350,
    'idempotency_key', 'IDEM-SMOKE-014',
    'terms_accepted_at', now()::text,
    'terms_version', 'smoke'
  );

  -- 1) Oluşturma
  r1 := public.create_order_atomic(v_order, v_items, NULL);
  ASSERT (r1->>'success')::boolean, 'oluşturma başarısız: ' || r1::text;

  -- 2) Aynı idempotency anahtarı → aynı sipariş, yeni kayıt yok
  r2 := public.create_order_atomic(v_order || jsonb_build_object('id', 'ORD-SMOKE015'), v_items, NULL);
  ASSERT r2->>'order_id' = r1->>'order_id', 'idempotency çalışmıyor: ' || r2::text;
  ASSERT (SELECT count(*) FROM public.orders WHERE idempotency_key = 'IDEM-SMOKE-014') = 1, 'çift sipariş oluştu';

  -- 3) Tip, ödeme satırı yok, onay sütunları dolu
  SELECT data_type INTO v_date_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_date';
  ASSERT v_date_type = 'date', 'delivery_date tipi: ' || v_date_type;

  SELECT count(*) INTO v_payments FROM public.payments WHERE order_id = r1->>'order_id';
  ASSERT v_payments = 0, 'oluşturmada payments satırı yazılmamalı';

  SELECT terms_version INTO v_terms FROM public.orders WHERE id = r1->>'order_id';
  ASSERT v_terms = 'smoke', 'terms_version kaydedilmedi';

  -- 4) Eski metin tarih reddedilir
  v_failed := false;
  BEGIN
    PERFORM public.create_order_atomic(
      v_order || jsonb_build_object('id', 'ORD-SMOKE016', 'idempotency_key', 'IDEM-SMOKE-016', 'delivery_date', 'tomorrow'),
      v_items, NULL);
  EXCEPTION WHEN others THEN
    v_failed := SQLERRM LIKE '%INVALID_DELIVERY_DATE%';
  END;
  ASSERT v_failed, 'metin tarih ("tomorrow") reddedilmedi';

  -- 5) Başlangıç durumu kısıtı
  v_failed := false;
  BEGIN
    PERFORM public.create_order_atomic(
      v_order || jsonb_build_object('id', 'ORD-SMOKE017', 'idempotency_key', 'IDEM-SMOKE-017', 'status', 'teslim_edildi'),
      v_items, NULL);
  EXCEPTION WHEN others THEN
    v_failed := SQLERRM LIKE '%INVALID_INITIAL_STATUS%';
  END;
  ASSERT v_failed, 'teslim_edildi başlangıç durumu reddedilmedi';

  -- 6) Yetkiler
  ASSERT NOT has_function_privilege('anon', 'public.create_order_atomic(jsonb,jsonb,uuid)', 'EXECUTE'), 'anon RPC çağırabiliyor';
  ASSERT NOT has_function_privilege('authenticated', 'public.create_order_atomic(jsonb,jsonb,uuid)', 'EXECUTE'), 'authenticated RPC çağırabiliyor';

  RAISE NOTICE '014 smoke OK';
END $$;

ROLLBACK;
