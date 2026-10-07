-- ==============================================================================
-- 026_threshold_bakes_smoke.sql — 026_threshold_bakes duman testi.
-- Hiçbir şey kalıcı olmaz (ROLLBACK). Hata yoksa "026 smoke OK" bildirilir.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_sale_date DATE := v_today + 1;
  v_next_date DATE := v_sale_date + 7;
  v_res JSONB;
  v_order_date DATE;
  v_order_hist_count INTEGER;
BEGIN
  -- 1) Test Ürünleri
  INSERT INTO public.products (
    id, name, slug, price, category, is_active, is_available,
    availability, order_threshold, sale_weekdays, capacity_units
  ) VALUES (
    'TEST-TH-01', 'TEST Eşikli Ekmek', 'test-esikli-ekmek', 120, 'bread', true, true,
    'dates', 10, ARRAY[5]::smallint[], 1
  );

  INSERT INTO public.products (
    id, name, slug, price, category, is_active, is_available,
    availability, order_threshold, sale_weekdays, capacity_units
  ) VALUES (
    'TEST-TH-02', 'TEST Dolacak Ekmek', 'test-dolacak-ekmek', 140, 'bread', true, true,
    'dates', 5, ARRAY[5]::smallint[], 1
  );

  -- 2) Satış Günleri (toplanıyor)
  INSERT INTO public.product_sale_dates (product_id, sale_date, status)
  VALUES ('TEST-TH-01', v_sale_date, 'toplaniyor');

  INSERT INTO public.product_sale_dates (product_id, sale_date, status)
  VALUES ('TEST-TH-02', v_sale_date, 'toplaniyor');

  -- 3) Siparişler
  -- TEST-TH-01 için 7 adet sipariş (eşik 10, YETERSİZ -> KAYACAK)
  INSERT INTO public.orders (
    id, order_number, customer_name, phone, delivery_address,
    delivery_method, payment_method, subtotal, shipping_fee,
    total_amount, delivery_date, status
  ) VALUES (
    'ORD-TEST-TH01', 'SIP-2610-001', 'Test Müşteri 1', '05550000001', 'Test Adres 1',
    'courier', 'cash_on_delivery', 840, 0, 840, v_sale_date, 'bekliyor'
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, total_price
  ) VALUES (
    'ORD-TEST-TH01', 'TEST-TH-01', 'TEST Eşikli Ekmek', 7, 120, 840
  );

  -- İptal edilmiş 5 adet sipariş (eşik hesabına KATILMAMALI)
  INSERT INTO public.orders (
    id, order_number, customer_name, phone, delivery_address,
    delivery_method, payment_method, subtotal, shipping_fee,
    total_amount, delivery_date, status
  ) VALUES (
    'ORD-TEST-TH01-CANCELLED', 'SIP-2610-002', 'Test İptal', '05550000002', 'Test Adres 2',
    'courier', 'cash_on_delivery', 600, 0, 600, v_sale_date, 'iptal'
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, total_price
  ) VALUES (
    'ORD-TEST-TH01-CANCELLED', 'TEST-TH-01', 'TEST Eşikli Ekmek', 5, 120, 600
  );

  -- TEST-TH-02 için 6 adet sipariş (eşik 5, YETERLİ -> KESİNLEŞECEK)
  INSERT INTO public.orders (
    id, order_number, customer_name, phone, delivery_address,
    delivery_method, payment_method, subtotal, shipping_fee,
    total_amount, delivery_date, status
  ) VALUES (
    'ORD-TEST-TH02', 'SIP-2610-003', 'Test Müşteri 2', '05550000003', 'Test Adres 3',
    'courier', 'cash_on_delivery', 840, 0, 840, v_sale_date, 'bekliyor'
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, total_price
  ) VALUES (
    'ORD-TEST-TH02', 'TEST-TH-02', 'TEST Dolacak Ekmek', 6, 140, 840
  );

  -- 4) RPC Çalıştır (Kesim saati geçmiş simülasyonu: v_sale_date gününün akşamı)
  v_res := public.decide_threshold_bakes(
    (v_sale_date::text || ' 21:00:00+03')::timestamptz
  );

  ASSERT (v_res->>'success')::boolean = true, 'decide_threshold_bakes başarısız döndü';
  ASSERT (v_res->>'processed_count')::integer = 2, '2 ürün işlenmedi';

  -- 5) TEST-TH-01 Kontrolleri (KAYDIRILDI)
  ASSERT (
    SELECT status FROM public.product_sale_dates
    WHERE product_id = 'TEST-TH-01' AND sale_date = v_sale_date
  ) = 'kaydirildi', 'TEST-TH-01 eski tarihi kaydirildi olmadı';

  ASSERT EXISTS (
    SELECT 1 FROM public.product_sale_dates
    WHERE product_id = 'TEST-TH-01' AND sale_date = v_next_date AND status = 'toplaniyor'
  ), 'TEST-TH-01 yeni tarihi (+7 gün) toplaniyor olarak açılmadı';

  SELECT delivery_date INTO v_order_date
  FROM public.orders WHERE id = 'ORD-TEST-TH01';
  ASSERT v_order_date = v_next_date, 'Sipariş yeni tarihe (+7 gün) kaydırılmadı';

  SELECT count(*) INTO v_order_hist_count
  FROM public.order_status_history
  WHERE order_id = 'ORD-TEST-TH01';
  ASSERT v_order_hist_count >= 1, 'Sipariş durum geçmişine kaydırma notu yazılmadı';

  -- 6) TEST-TH-02 Kontrolleri (KESİNLEŞTİ)
  ASSERT (
    SELECT status FROM public.product_sale_dates
    WHERE product_id = 'TEST-TH-02' AND sale_date = v_sale_date
  ) = 'kesinlesti', 'TEST-TH-02 kesinlesti olmadı';

  -- 7) İdempotency Kontrolü: İkinci kez çağrıldığında değişiklik olmamalı
  v_res := public.decide_threshold_bakes(
    (v_sale_date::text || ' 22:00:00+03')::timestamptz
  );
  ASSERT (v_res->>'processed_count')::integer = 0, 'İkinci çalıştırmada processed_count 0 değil (idempotent değil)';

  RAISE NOTICE '026 smoke OK';
END $$;

ROLLBACK;
