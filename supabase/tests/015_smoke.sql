-- ==============================================================================
-- 015_smoke.sql — 015_flexible_products sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- Hata yoksa "015 smoke OK" bildirimi görülür.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_base JSONB;
  r JSONB;
  v_err TEXT;
  i INT;
  v_existing_units INT;
BEGIN
  -- Canlı veride o gün için zaten alınmış siparişler olabilir: test kapasitesi "mevcut + 3" olur
  SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.capacity_units, p.capacity_units, 1)), 0) INTO v_existing_units
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE o.delivery_date = v_day AND o.status <> 'iptal';

  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, daily_limit, capacity_units)
  VALUES ('SMOKE-LIMIT', 'TEST Limitli', 'smoke-limitli', 10, 'bread', true, true, 'daily', 2, 1),
         ('SMOKE-DATES', 'TEST Günlü', 'smoke-gunlu', 10, 'bread', true, true, 'dates', NULL, 1),
         ('SMOKE-ESLIK', 'TEST Eşlikçi', 'smoke-eslikci', 10, 'gurme', true, true, 'daily', NULL, 0),
         ('SMOKE-CAP', 'TEST Kapasite', 'smoke-kapasite', 10, 'bread', true, true, 'daily', NULL, 1);
  INSERT INTO public.product_sale_dates (product_id, sale_date, quantity_limit) VALUES ('SMOKE-DATES', v_day + 1, NULL);
  INSERT INTO public.capacity_days (day, bread_capacity) VALUES (v_day, v_existing_units + 3)
  ON CONFLICT (day) DO UPDATE SET bread_capacity = EXCLUDED.bread_capacity;

  v_base := jsonb_build_object('customer_name', 'TEST Smoke', 'phone', '05000000000', 'delivery_address', 'TEST',
    'delivery_method', 'courier', 'payment_method', 'cash_on_delivery', 'subtotal', 10, 'shipping_fee', 0, 'total_amount', 10,
    'delivery_date', to_char(v_day, 'YYYY-MM-DD'));

  -- 1) Ürün limiti 2: iki sipariş geçer, üçüncü reddedilir
  FOR i IN 1..2 LOOP
    r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK0' || i, 'idempotency_key', 'IDEM-SMK-' || i),
      '[{"product_id":"SMOKE-LIMIT","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  END LOOP;
  v_err := NULL;
  BEGIN
    PERFORM public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK03', 'idempotency_key', 'IDEM-SMK-3'),
      '[{"product_id":"SMOKE-LIMIT","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  ASSERT v_err LIKE '%PRODUCT_LIMIT_REACHED%', 'ürün limiti çalışmıyor: ' || COALESCE(v_err, 'hata yok');

  -- 2) Kapasite 3 (2 dolu): limitsiz, her gün satılan ekmekten 2 adet reddedilir; eşlikçi (0 birim) geçer
  v_err := NULL;
  BEGIN
    PERFORM public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK04', 'idempotency_key', 'IDEM-SMK-4'),
      '[{"product_id":"SMOKE-CAP","product_name":"x","quantity":2,"unit_price":10,"total_price":20}]', NULL);
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  ASSERT v_err LIKE '%DAILY_CAPACITY_FULL%', 'kapasite kontrolü çalışmıyor: ' || COALESCE(v_err, 'hata yok');

  r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK4B', 'idempotency_key', 'IDEM-SMK-4B'),
    '[{"product_id":"SMOKE-CAP","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  ASSERT (r->>'success')::boolean, 'kalan 1 birimlik kapasite kullanılamadı';

  r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK05', 'idempotency_key', 'IDEM-SMK-5'),
    '[{"product_id":"SMOKE-ESLIK","product_name":"x","quantity":5,"unit_price":10,"total_price":50}]', NULL);
  ASSERT (r->>'success')::boolean, 'sadece eşlikçi siparişi reddedildi';

  -- 3) Satış günü: SMOKE-DATES yalnız v_day+1'de
  v_err := NULL;
  BEGIN
    PERFORM public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK06', 'idempotency_key', 'IDEM-SMK-6'),
      '[{"product_id":"SMOKE-DATES","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  ASSERT v_err LIKE '%NOT_ON_SALE_THIS_DAY%', 'satış günü kontrolü çalışmıyor: ' || COALESCE(v_err, 'hata yok');

  r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK07', 'idempotency_key', 'IDEM-SMK-7',
      'delivery_date', to_char(v_day + 1, 'YYYY-MM-DD')),
    '[{"product_id":"SMOKE-DATES","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  ASSERT (r->>'success')::boolean, 'satış gününde sipariş reddedildi';

  -- 4) İptal kapasiteyi boşaltır: limitli ürün siparişlerinden birini iptal et → yeni sipariş geçer
  UPDATE public.orders SET status = 'iptal' WHERE id = 'ORD-SMK01';
  r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK08', 'idempotency_key', 'IDEM-SMK-8'),
    '[{"product_id":"SMOKE-LIMIT","product_name":"x","quantity":1,"unit_price":10,"total_price":10}]', NULL);
  ASSERT (r->>'success')::boolean, 'iptal kapasiteyi boşaltmadı';

  -- 5) Admin yolu sınırları atlar
  r := public.create_order_atomic(v_base || jsonb_build_object('id', 'ORD-SMK09', 'idempotency_key', 'IDEM-SMK-9', 'bypass_limits', true),
    '[{"product_id":"SMOKE-LIMIT","product_name":"x","quantity":5,"unit_price":10,"total_price":50}]', NULL);
  ASSERT (r->>'success')::boolean, 'bypass_limits çalışmıyor';

  -- 6) admin_save_product: ürün + satış günleri tek işlemde
  PERFORM public.admin_save_product(
    jsonb_build_object('id', 'SMOKE-SAVE', 'name', 'TEST Kayıt', 'slug', 'smoke-kayit', 'price', 5,
      'category', 'bread', 'availability', 'dates', 'cross_sell', jsonb_build_array('SMOKE-ESLIK')),
    jsonb_build_array(jsonb_build_object('date', to_char(v_day, 'YYYY-MM-DD'), 'limit', 4)),
    v_day);
  ASSERT (SELECT quantity_limit FROM public.product_sale_dates WHERE product_id = 'SMOKE-SAVE' AND sale_date = v_day) = 4,
    'admin_save_product satış gününü yazmadı';
  ASSERT (SELECT cross_sell FROM public.products WHERE id = 'SMOKE-SAVE') = ARRAY['SMOKE-ESLIK'], 'cross_sell yazılmadı';

  -- 7) Kalem anlık kopyası
  ASSERT (SELECT capacity_units FROM public.order_items WHERE order_id = 'ORD-SMK05' LIMIT 1) = 0, 'capacity_units kopyalanmadı';

  RAISE NOTICE '015 smoke OK';
END $$;

ROLLBACK;
