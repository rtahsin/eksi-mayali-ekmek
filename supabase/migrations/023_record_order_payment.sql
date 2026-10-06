-- ==============================================================================
-- 023_record_order_payment.sql  (Faz P1-09 — docs/IS_PAKETLERI.md)
-- ==============================================================================
-- NE ZAMAN: Kod yayınından ÖNCE çalıştırılır (eklemeli yeni fonksiyon).
--   Önce sonu ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/023_smoke.sql.
--
-- İçerik:
--   1) record_order_payment: sipariş ödemesi + payment_status + cari tahsilatı
--      tek atomik işlemde gerçekleştirir.
--        - p_method <> 'cari' ve completed ise ve cari_id varsa: cariye tahsilat yazar
--        - orders.payment_status alanını toplam ödemeye göre (paid/partial) günceller
--        - payments tablosuna ödeme satırı ekler
--   2) Güvenlik: Yalnızca service_role çalıştırabilir.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.record_order_payment(
  p_order_id TEXT,
  p_amount NUMERIC,
  p_method TEXT,
  p_status TEXT DEFAULT 'completed',
  p_collected_by TEXT DEFAULT 'admin',
  p_courier_id UUID DEFAULT NULL,
  p_transaction_ref TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_paid_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_cari_tx UUID := NULL;
  v_ledger_method TEXT;
  v_total_paid NUMERIC := 0;
  v_new_payment_status TEXT;
  v_paid_at TIMESTAMPTZ;
  r JSONB;
BEGIN
  -- 1. Parametre doğrulamaları
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
  END IF;

  IF p_method NOT IN ('cash', 'pos', 'online_card', 'transfer', 'cari') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: %', p_method;
  END IF;

  IF p_status NOT IN ('pending', 'completed', 'failed', 'refunded', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: %', p_status;
  END IF;

  IF p_collected_by IS NOT NULL AND p_collected_by NOT IN ('courier', 'admin', 'system') THEN
    RAISE EXCEPTION 'INVALID_COLLECTED_BY: %', p_collected_by;
  END IF;

  -- 2. Siparişi kilitle ve kontrol et
  SELECT id, order_number, status::text AS status, cari_id, total_amount, payment_status
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;

  IF v_order.status = 'iptal' THEN
    RAISE EXCEPTION 'CANNOT_PAY_CANCELLED_ORDER: %', p_order_id;
  END IF;

  -- 3. Cari hesap entegrasyonu (Tahsilat kaydı)
  -- Cari siparişte alınan nakit/POS/havale ödeme cari defterine TAHSİLAT olarak girer.
  -- "Cariye yaz" (method: cari) ise zaten satış fişiyle borç kaydedildiği için yeni bir tahsilat yapılmaz.
  IF v_order.cari_id IS NOT NULL AND p_status = 'completed' AND p_method <> 'cari' THEN
    v_ledger_method := CASE p_method
      WHEN 'cash' THEN 'nakit'
      WHEN 'pos' THEN 'pos'
      WHEN 'online_card' THEN 'pos'
      ELSE 'banka_havale'
    END;

    r := public.record_cari_transaction_atomic(
      v_order.cari_id::text,
      'tahsilat',
      p_amount,
      COALESCE(NULLIF(TRIM(p_note), ''), 'Sipariş tahsilatı · ' || COALESCE(v_order.order_number, p_order_id)),
      v_ledger_method,
      NULL,
      NULL,
      p_order_id
    );

    v_cari_tx := (r->>'transaction_id')::uuid;
  END IF;

  v_paid_at := COALESCE(p_paid_at, CASE WHEN p_status = 'completed' THEN now() ELSE NULL END);

  -- 4. Payments tablosuna ödeme satırı ekle
  INSERT INTO public.payments (
    order_id,
    amount,
    method,
    status,
    paid_at,
    collected_by,
    courier_id,
    transaction_ref,
    cari_transaction_id,
    note
  ) VALUES (
    p_order_id,
    round(p_amount, 2),
    p_method,
    p_status,
    v_paid_at,
    COALESCE(p_collected_by, 'admin'),
    p_courier_id,
    p_transaction_ref,
    v_cari_tx,
    p_note
  ) RETURNING id INTO v_payment_id;

  -- 5. Sipariş payment_status belirleme ve güncelleme
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payments
   WHERE order_id = p_order_id
     AND status = 'completed';

  IF p_method = 'cari' THEN
    -- Cari hesaba aktarılan sipariş kapatılmış sayılır
    v_new_payment_status := 'paid';
  ELSIF v_total_paid >= COALESCE(v_order.total_amount, 0) AND COALESCE(v_order.total_amount, 0) > 0 THEN
    v_new_payment_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_payment_status := 'partial';
  ELSE
    v_new_payment_status := CASE WHEN p_status = 'completed' THEN 'paid' ELSE COALESCE(v_order.payment_status, 'pending') END;
  END IF;

  UPDATE public.orders
     SET payment_status = v_new_payment_status,
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'payment_status', v_new_payment_status,
    'total_paid', v_total_paid,
    'cari_transaction_id', v_cari_tx
  );
END;
$$;

-- Yetkilendirme kuralı: Yalnızca service_role çalıştırabilir
REVOKE ALL ON FUNCTION public.record_order_payment(TEXT, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment(TEXT, NUMERIC, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- app_migrations kaydı
INSERT INTO public.app_migrations (id) VALUES ('023_record_order_payment') ON CONFLICT DO NOTHING;

COMMIT;
