-- ==============================================================================
-- 018_smoke.sql — 018_order_lifecycle sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- Hata yoksa "018 smoke OK" bildirimi görülür.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_base JSONB;
  v_items JSONB := '[{"product_id":"SMOKE-018","product_name":"TEST Ekmek","quantity":2,"unit_price":50,"total_price":100}]';
  r JSONB;
  v_err TEXT;
  v_sale UUID;
BEGIN
  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, capacity_units)
  VALUES ('SMOKE-018', 'TEST Ekmek', 'smoke-018', 50, 'bread', true, true, 'daily', 1);
  INSERT INTO public.current_accounts (id, name, balance, status, created_at, updated_at)
  VALUES ('cari_SMOKE018', 'TEST Smoke 018', 0, 'active', now(), now());

  v_base := jsonb_build_object('customer_name', 'TEST 018', 'phone', '05000000000', 'delivery_address', 'TEST',
    'delivery_method', 'courier', 'payment_method', 'cash_on_delivery', 'subtotal', 100, 'shipping_fee', 0,
    'total_amount', 100, 'delivery_date', to_char(v_day, 'YYYY-MM-DD'), 'bypass_limits', true,
    'status', 'hazirlaniyor', 'source', 'admin', 'cari_id', 'cari_SMOKE018');

  -- 1) Cari sipariş oluşur, defterde henüz borç yok
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S018A"}', v_items, NULL);
  ASSERT NOT EXISTS (SELECT 1 FROM public.account_transactions WHERE order_id = 'ORD-S018A'), 'sipariş anında cari borç yazıldı';
  ASSERT (SELECT cari_id FROM public.orders WHERE id = 'ORD-S018A') = 'cari_SMOKE018', 'cari_id saklanmadı';

  -- 2) Nakit teslim: fiş (+100) + tahsilat (−100) + tek ödeme; bakiye 0
  r := public.mark_order_delivered('ORD-S018A', 'cash', 'courier');
  ASSERT NOT (r->>'already')::boolean, 'ilk teslim "already" döndü';
  ASSERT (SELECT count(*) FROM public.account_transactions WHERE order_id = 'ORD-S018A') = 2, 'fiş + tahsilat yazılmadı';
  ASSERT (SELECT items->0->>'name' FROM public.account_transactions WHERE order_id = 'ORD-S018A' AND type = 'satis') = 'TEST Ekmek',
    'fiş kalemleri yazılmadı';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE018') = 0, 'nakit teslim sonrası bakiye 0 değil';
  ASSERT (SELECT count(*) FROM public.payments WHERE order_id = 'ORD-S018A' AND status = 'completed') = 1, 'tek ödeme satırı yok';
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S018A') = 'paid', 'ödeme durumu paid değil';

  -- 3) Aynı teslim tekrar (çevrimdışı kuyruk): hiçbir şey eklenmez
  r := public.mark_order_delivered('ORD-S018A', 'cash', 'courier');
  ASSERT (r->>'already')::boolean, 'tekrar teslim "already" dönmedi';
  ASSERT (SELECT count(*) FROM public.account_transactions WHERE order_id = 'ORD-S018A') = 2, 'tekrar teslimde defter çiftlendi';
  ASSERT (SELECT count(*) FROM public.payments WHERE order_id = 'ORD-S018A') = 1, 'tekrar teslimde ödeme çiftlendi';

  -- 4) Ödenmedi: yalnız fiş, ödeme satırı yok, durum pending; borç kalır
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S018B"}', v_items, NULL);
  PERFORM public.mark_order_delivered('ORD-S018B', 'unpaid', 'admin');
  ASSERT (SELECT payment_status FROM public.orders WHERE id = 'ORD-S018B') = 'pending', 'ödenmedi → pending değil';
  ASSERT NOT EXISTS (SELECT 1 FROM public.payments WHERE order_id = 'ORD-S018B'), 'ödenmedi için ödeme satırı yazıldı';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE018') = 100, 'ödenmedi sonrası borç 100 değil';

  -- 5) Teslim edilmiş sipariş iptal edilemez (iade = carideki fişi iptal et)
  BEGIN
    PERFORM public.cancel_order_atomic('ORD-S018B', 'TEST', 'admin');
    RAISE EXCEPTION 'teslim edilmiş sipariş iptal edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%ORDER_DELIVERED%', 'beklenmeyen hata: ' || v_err;
  END;

  -- 6) Eski yoldan sipariş anında fiş yazılmış cari sipariş iptal edilince fiş storno edilir
  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S018C"}', v_items, NULL);
  r := public.record_cari_transaction_atomic('cari_SMOKE018', 'satis', 100, 'eski yol', NULL, NULL, NULL, 'ORD-S018C');
  v_sale := (r->>'transaction_id')::uuid;
  r := public.cancel_order_atomic('ORD-S018C', 'TEST iptal', 'admin');
  ASSERT (r->>'reversed')::int = 1, 'iptalde storno atılmadı';
  ASSERT EXISTS (SELECT 1 FROM public.account_transactions WHERE reverses_id = v_sale), 'storno satırı yok';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE018') = 100, 'iptal sonrası bakiye geri dönmedi';
  ASSERT (SELECT status::text FROM public.orders WHERE id = 'ORD-S018C') = 'iptal', 'sipariş iptal olmadı';
  r := public.cancel_order_atomic('ORD-S018C', 'TEST iptal', 'admin');
  ASSERT (r->>'already')::boolean, 'ikinci iptal "already" dönmedi';

  -- 7) Müşteri yalnız beklenen durumdaki siparişi iptal eder
  PERFORM public.create_order_atomic(v_base - 'cari_id' || '{"id":"ORD-S018D"}', v_items, NULL);
  BEGIN
    PERFORM public.cancel_order_atomic('ORD-S018D', 'TEST', 'customer', NULL, 'bekliyor');
    RAISE EXCEPTION 'hazırlanan sipariş müşteri tarafından iptal edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%STATUS_CHANGED%', 'beklenmeyen hata: ' || v_err;
  END;

  -- 8) Defter tutarlılığı ve yetkiler
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE018')
       = (SELECT SUM(delta) FROM public.account_transactions WHERE account_id = 'cari_SMOKE018'), 'bakiye ≠ SUM(delta)';
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('mark_order_delivered', 'cancel_order_atomic', 'create_order_atomic', 'generate_order_number')
      AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))
  ), 'sipariş RPC tarayıcı rolünden çağrılabiliyor';

  RAISE NOTICE '018 smoke OK';
END $$;

ROLLBACK;
