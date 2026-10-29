-- ==============================================================================
-- 029_deliver_remaining_due.sql — Teslimde yalnız kalan tutar tahsil edilir.
-- ==============================================================================
-- NE ZAMAN: Kod yayınından bağımsız (imza aynı, geriye uyumlu). Birleştirmeden önce
--   ya da sonra çalıştırılabilir.
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/029_deliver_remaining_due_smoke.sql.
--
-- Sorun (018'deki mark_order_delivered):
--   1) Cari siparişin ödemesi teslimden önce alındıysa (record_order_payment, 023) cariye
--      tahsilat zaten yazılmıştı; teslimde ödeme seçilince ikinci tahsilat yazılıyordu.
--      Sonuç: cari bakiyesi sipariş tutarı kadar eksik (müşteri iki kez ödemiş görünür).
--   2) Kısmi ödenmiş siparişte teslimde kalan tutar hiç kaydedilmiyordu (ödeme satırı
--      "tamamlanmış ödeme varsa yazma" koşuluna takılıyordu).
--   3) Önceden ödenmiş sipariş "ödeme alınmadı" ile teslim edilince payment_status
--      'pending'e düşüyordu.
--
-- Düzeltme: teslimde kalan = toplam − tamamlanmış ödemeler ('cari' yöntemi hariç: o ödeme
--   değil, borcun cariye aktarılmasıdır). Tahsilat ve ödeme satırı yalnız kalan için yazılır;
--   payment_status ödenen toplama göre belirlenir.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.mark_order_delivered(
  p_order_id TEXT,
  p_payment TEXT,
  p_actor_role TEXT DEFAULT 'admin',
  p_actor_id TEXT DEFAULT NULL,
  p_courier_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_payment_id UUID;
  v_cari_tx UUID;
  v_ledger_method TEXT;
  v_total NUMERIC;
  v_paid NUMERIC;
  v_has_cari_pay BOOLEAN;
  v_collect NUMERIC := 0;
  v_payment_status TEXT;
  r JSONB;
BEGIN
  IF p_payment NOT IN ('cash', 'pos', 'transfer', 'unpaid') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT: %', p_payment;
  END IF;
  IF p_actor_role NOT IN ('courier', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE: %', p_actor_role;
  END IF;

  SELECT id, order_number, status::text AS status, cari_id, total_amount, delivery_date
    INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;
  IF v_order.status = 'teslim_edildi' THEN
    -- Çevrimdışı kuyruk tekrarı ya da çift tıklama: ikinci kayıt yok
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;
  IF v_order.status = 'iptal' THEN
    RAISE EXCEPTION 'ORDER_CANCELLED: %', p_order_id;
  END IF;

  -- Teslimden önce alınmış ödemeler (sipariş satırı kilitli; yeni ödeme araya giremez)
  v_total := COALESCE(v_order.total_amount, 0);
  SELECT COALESCE(SUM(amount) FILTER (WHERE method <> 'cari'), 0),
         COALESCE(bool_or(method = 'cari'), false)
    INTO v_paid, v_has_cari_pay
    FROM public.payments
   WHERE order_id = p_order_id AND status = 'completed';

  IF p_payment <> 'unpaid' THEN
    v_collect := GREATEST(v_total - v_paid, 0);
  END IF;

  v_payment_status := CASE
    WHEN p_payment <> 'unpaid' OR v_has_cari_pay THEN 'paid'
    WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.orders
  SET status = 'teslim_edildi'::order_status_type,
      delivered_at = now(),
      payment_status = v_payment_status,
      courier_id = COALESCE(p_courier_id, courier_id),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by_role, changed_by_id, note)
  VALUES (p_order_id, v_order.status, 'teslim_edildi', p_actor_role, p_actor_id,
          COALESCE(NULLIF(TRIM(p_note), ''), 'Teslim edildi') || ' · ödeme: ' || p_payment
          || CASE WHEN p_payment <> 'unpaid' AND v_paid > 0 THEN ' · kalan ' || v_collect::text ELSE '' END);

  -- Cari sipariş: teslimat fişi (yoksa) + teslimde alınan kalan tutar cariye tahsilat
  IF v_order.cari_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.account_transactions t
      WHERE t.order_id = p_order_id AND t.type = 'satis'
        AND NOT EXISTS (SELECT 1 FROM public.account_transactions s WHERE s.reverses_id = t.id)
    ) AND v_total > 0 THEN
      SELECT jsonb_agg(jsonb_build_object('name', oi.product_name, 'quantity', oi.quantity,
                                          'unitPrice', oi.unit_price, 'productId', oi.product_id))
        INTO v_items FROM public.order_items oi WHERE oi.order_id = p_order_id;
      PERFORM public.record_cari_transaction_atomic(
        v_order.cari_id, 'satis', v_order.total_amount,
        'Sipariş ' || COALESCE(v_order.order_number, p_order_id), NULL, v_order.delivery_date,
        v_items, p_order_id);
    END IF;

    IF v_collect > 0 THEN
      v_ledger_method := CASE p_payment WHEN 'cash' THEN 'nakit' WHEN 'pos' THEN 'pos' ELSE 'banka_havale' END;
      r := public.record_cari_transaction_atomic(
        v_order.cari_id, 'tahsilat', v_collect,
        'Teslimatta tahsilat · ' || COALESCE(v_order.order_number, p_order_id), v_ledger_method, NULL, NULL, p_order_id);
      v_cari_tx := (r->>'transaction_id')::uuid;
    END IF;
  END IF;

  -- Ödeme satırı yalnız teslimde alınan kalan için
  IF v_collect > 0 THEN
    INSERT INTO public.payments (order_id, amount, method, status, paid_at, collected_by, courier_id, cari_transaction_id, note)
    VALUES (p_order_id, v_collect, p_payment, 'completed', now(), p_actor_role, p_courier_id, v_cari_tx, p_note)
    RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'already', false, 'payment_id', v_payment_id,
                            'cari_transaction_id', v_cari_tx, 'collected', v_collect);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_delivered(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_delivered(TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

INSERT INTO public.app_migrations (id) VALUES ('029_deliver_remaining_due') ON CONFLICT DO NOTHING;

COMMIT;
