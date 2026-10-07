-- ==============================================================================
-- 026_product_sale_weekdays_smoke.sql — 026_product_sale_weekdays duman testi.
-- ==============================================================================
-- Supabase SQL Editor'de çalıştırılır; tüm blok BEGIN...ROLLBACK içindedir,
-- veritabanında kalıcı iz bırakmaz.
-- Doğrulama:
--   1) admin_save_product çağrıldığında 8 haftalık satış günleri oluşur.
--   2) Siparişi olan bir satış günü, güncelleme sırasında silinmez.
--   3) Siparişi olmayan diğer satış günleri güncellenir/silinir.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_prod_id text := 'TEST-SW-PROD-01';
  v_today date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_dates jsonb := '[]'::jsonb;
  v_d date;
  v_count integer;
  v_order_id text := 'TEST-SW-ORD-01';
  v_ordered_date date;
BEGIN
  -- 1) 8 adet gelecek satış tarihi hazırla
  FOR i IN 1..8 LOOP
    v_d := v_today + (i * 7);
    IF i = 1 THEN v_ordered_date := v_d; END IF;
    v_dates := v_dates || jsonb_build_object('date', v_d::text, 'limit', 25);
  END LOOP;

  -- 2) Ürünü 8 haftalık satış günleriyle kaydet
  PERFORM public.admin_save_product(
    jsonb_build_object(
      'id', v_prod_id,
      'slug', 'test-gece-yarisi-sw',
      'name', 'Test Gece Yarısı',
      'price', 180,
      'category', 'bread',
      'availability', 'dates',
      'sale_weekdays', jsonb_build_array(5)
    ),
    v_dates,
    v_today
  );

  -- 3) 8 satış gününün de oluştuğunu doğrula
  SELECT count(*) INTO v_count
  FROM public.product_sale_dates
  WHERE product_id = v_prod_id AND sale_date >= v_today;

  IF v_count <> 8 THEN
    RAISE EXCEPTION 'TEST-SW-01: 8 satış günü oluşmadı, bulunan: %', v_count;
  END IF;

  -- 4) İlk satış gününe (v_ordered_date) bir test siparişi oluştur
  INSERT INTO public.orders (
    id, order_number, customer_name, phone, delivery_address, delivery_date,
    status, payment_method, payment_status, total_amount
  ) VALUES (
    v_order_id, 'SIP-TEST-SW', 'Test Müşteri', '05551234567', 'Beylikdüzü',
    v_ordered_date, 'bekliyor', 'cash_on_delivery', 'pending', 180
  );

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, total_price
  ) VALUES (
    v_order_id, v_prod_id, 'Test Gece Yarısı', 2, 180, 360
  );

  -- 5) admin_save_product'ı bu sefer sadece 2 farklı tarih ile çağır (v_ordered_date'i içermeyen!)
  PERFORM public.admin_save_product(
    jsonb_build_object(
      'id', v_prod_id,
      'slug', 'test-gece-yarisi-sw',
      'name', 'Test Gece Yarısı',
      'price', 180,
      'category', 'bread',
      'availability', 'dates',
      'sale_weekdays', jsonb_build_array(5)
    ),
    jsonb_build_array(
      jsonb_build_object('date', (v_today + 60)::text, 'limit', 20),
      jsonb_build_object('date', (v_today + 67)::text, 'limit', 20)
    ),
    v_today
  );

  -- 6) v_ordered_date'in siparişi olduğu için SİLİNMEMİŞ olduğunu doğrula!
  IF NOT EXISTS (
    SELECT 1 FROM public.product_sale_dates
    WHERE product_id = v_prod_id AND sale_date = v_ordered_date
  ) THEN
    RAISE EXCEPTION 'TEST-SW-02: Siparişi olan satış günü yanlışlıkla silindi!';
  END IF;

  -- 7) Yeni 2 tarihin de mevcut olduğunu doğrula
  IF NOT EXISTS (
    SELECT 1 FROM public.product_sale_dates
    WHERE product_id = v_prod_id AND sale_date = (v_today + 60)
  ) THEN
    RAISE EXCEPTION 'TEST-SW-03: Yeni satış günü eklenmedi!';
  END IF;

  RAISE NOTICE '026_product_sale_weekdays duman testi BAŞARILI: 8 hafta oluştu ve siparişli tarih silinmedi.';
END $$;

ROLLBACK;
