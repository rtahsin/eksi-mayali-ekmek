-- ==============================================================================
-- 029_deliver_remaining_due_smoke.sql — teslimde yalnız kalan tutar tahsil edilir.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_base JSONB;
  v_items JSONB := '[{"product_id":"SMOKE-029","product_name":"TEST Ekmek 029","quantity":2,"unit_price":50,"total_price":100}]';
  r JSONB;
BEGIN
  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, capacity_units)
  VALUES ('SMOKE-029', 'TEST Ekmek 029', 'smoke-029', 50, 'bread', true, true, 'daily', 1);

  INSERT INTO public.current_accounts (id, name, balance, status, created_at, updated_at)
  VALUES ('cari_SMOKE029', 'TEST Smoke 029', 0, 'active', now(), now());

  v_base := jsonb_build_object(
    'customer_name', 'TEST 029',
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

  -- 1) Cari sipariş, teslimden önce tam ödendi; teslimde "nakit" seçildi -> ikinci tahsilat yok
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029A","cari_id":"cari_SMOKE029"}', v_items, NULL);
  PERFORM public.record_order_payment('ORD-S029A', 100, 'transfer', 'completed', 'admin');
  r := public.mark_order_delivered('ORD-S029A', 'cash', 'admin');
  ASSERT (r->>'collected')::numeric = 0, 'önceden ödenmiş siparişte yeniden tahsil edildi';
  ASSERT (SELECT count(*) FROM public.account_transactions WHERE order_id = 'ORD-S029A' AND type = 'tahsilat') = 1,
    'cariye ikinci tahsilat yazıldı';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE029') = 0,
    'A sonrası cari bakiye 0 değil';
  ASSERT (SELECT count(*) FROM public.payments WHERE order_id = 'ORD-S029A') = 1, 'A: fazladan ödeme satırı';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S029A') = 'paid', 'A: paid değil';

  -- 2) Cari sipariş, 40 önceden; teslimde kalan 60 tahsil edilir
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029B","cari_id":"cari_SMOKE029"}', v_items, NULL);
  PERFORM public.record_order_payment('ORD-S029B', 40, 'cash', 'completed', 'admin');
  r := public.mark_order_delivered('ORD-S029B', 'pos', 'courier');
  ASSERT (r->>'collected')::numeric = 60, 'B: kalan 60 tahsil edilmedi';
  ASSERT (SELECT sum(amount) FROM public.payments WHERE order_id = 'ORD-S029B' AND status = 'completed') = 100,
    'B: ödemeler toplamı 100 değil';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE029') = 0,
    'B sonrası cari bakiye 0 değil';

  -- 3) Normal sipariş tam ödendi, "ödeme alınmadı" ile teslim -> paid kalır
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029C"}', v_items, NULL);
  PERFORM public.record_order_payment('ORD-S029C', 100, 'transfer', 'completed', 'admin');
  PERFORM public.mark_order_delivered('ORD-S029C', 'unpaid', 'admin');
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S029C') = 'paid', 'C: pending''e düştü';

  -- 4) Normal sipariş 30 önceden, "ödeme alınmadı" ile teslim -> partial
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029D"}', v_items, NULL);
  PERFORM public.record_order_payment('ORD-S029D', 30, 'cash', 'completed', 'admin');
  PERFORM public.mark_order_delivered('ORD-S029D', 'unpaid', 'admin');
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S029D') = 'partial', 'D: partial değil';

  -- 5) Eski davranış korunur: ödenmemiş cari sipariş teslimde nakit -> satış + tahsilat, bakiye 0
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029E","cari_id":"cari_SMOKE029"}', v_items, NULL);
  r := public.mark_order_delivered('ORD-S029E', 'cash', 'courier');
  ASSERT (r->>'collected')::numeric = 100, 'E: tam tutar tahsil edilmedi';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE029') = 0,
    'E sonrası cari bakiye 0 değil';

  -- 6) Ödenmemiş cari sipariş "cariye yaz" -> yalnız satış, bakiye +100, pending
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S029F","cari_id":"cari_SMOKE029"}', v_items, NULL);
  PERFORM public.mark_order_delivered('ORD-S029F', 'unpaid', 'admin');
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE029') = 100, 'F: bakiye 100 değil';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S029F') = 'pending', 'F: pending değil';

  -- 7) Tekrar çağrı güvenli
  r := public.mark_order_delivered('ORD-S029E', 'cash', 'courier');
  ASSERT (r->>'already')::boolean, 'tekrar çağrı already dönmedi';

  RAISE NOTICE '029 smoke OK';
END $$;

ROLLBACK;
