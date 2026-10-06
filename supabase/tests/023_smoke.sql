-- ==============================================================================
-- 023_smoke.sql — 023_record_order_payment duman testi.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_base JSONB;
  v_items JSONB := '[{"product_id":"SMOKE-023","product_name":"TEST Ekmek 023","quantity":2,"unit_price":50,"total_price":100}]';
  r JSONB;
  v_err TEXT;
  v_balance NUMERIC;
BEGIN
  -- Test ürün ve cari oluştur
  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, capacity_units)
  VALUES ('SMOKE-023', 'TEST Ekmek 023', 'smoke-023', 50, 'bread', true, true, 'daily', 1);

  INSERT INTO public.current_accounts (id, name, balance, status, created_at, updated_at)
  VALUES ('cari_SMOKE023', 'TEST Smoke 023', 0, 'active', now(), now());

  v_base := jsonb_build_object(
    'customer_name', 'TEST 023',
    'phone', '05000000000',
    'delivery_address', 'TEST Adres',
    'delivery_method', 'courier',
    'payment_method', 'cash_on_delivery',
    'subtotal', 100,
    'shipping_fee', 0,
    'total_amount', 100,
    'delivery_date', to_char(v_day, 'YYYY-MM-DD'),
    'bypass_limits', true,
    'status', 'hazirlaniyor',
    'source', 'admin'
  );

  -- 1) Normal sipariş: Parçalı ödeme (40 TL) -> payment_status 'partial'
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S023A"}', v_items, NULL);

  r := public.record_order_payment('ORD-S023A', 40, 'cash', 'completed', 'admin');
  ASSERT (r->>'success')::boolean, 'ilk ödeme başarısız';
  ASSERT (r->>'payment_status') = 'partial', '40 TL ödeme sonrası partial olmadı';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S023A') = 'partial', 'sipariş payment_status güncellenmedi';

  -- 2) Kalan ödeme (60 TL) -> payment_status 'paid'
  r := public.record_order_payment('ORD-S023A', 60, 'pos', 'completed', 'admin');
  ASSERT (r->>'payment_status') = 'paid', '60 TL tamamlama sonrası paid olmadı';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S023A') = 'paid', 'sipariş payment_status paid olmadı';
  ASSERT (SELECT count(*) FROM public.payments WHERE order_id = 'ORD-S023A') = 2, 'toplam 2 ödeme satırı oluşmadı';

  -- 3) Cari siparişe ödeme: Tahsilat cariye yazılmalı
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S023B", "cari_id":"cari_SMOKE023"}', v_items, NULL);

  r := public.record_order_payment('ORD-S023B', 100, 'transfer', 'completed', 'admin', NULL, 'REF-123', 'Havale tahsilatı');
  ASSERT (r->>'payment_status') = 'paid', 'cari sipariş ödeme sonrası paid olmadı';
  ASSERT (r->>'cari_transaction_id') IS NOT NULL, 'cari tahsilat tx id üretilmedi';

  SELECT balance INTO v_balance FROM public.current_accounts WHERE id = 'cari_SMOKE023';
  -- Başlangıç 0, tahsilat -100 delta getirdiği için bakiye -100 olmalı
  ASSERT v_balance = -100, 'cari bakiye tahsilat sonrası -100 olmadı (bulunan: ' || v_balance || ')';

  -- 4) İptal edilmiş siparişe ödeme yapılamaz
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S023C"}', v_items, NULL);
  PERFORM public.cancel_order_atomic('ORD-S023C', 'Müşteri vazgeçti', 'admin');

  BEGIN
    PERFORM public.record_order_payment('ORD-S023C', 100, 'cash', 'completed', 'admin');
    RAISE EXCEPTION 'iptal edilmiş siparişe ödeme kabul edildi!';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CANNOT_PAY_CANCELLED_ORDER%', 'beklenmeyen hata: ' || v_err;
  END;

  RAISE NOTICE '023 smoke OK';
END $$;

ROLLBACK;
