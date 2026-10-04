-- ==============================================================================
-- 017_ledger_hardening.sql  (Faz 3b-1 — PR #8 incelemesi)
-- ==============================================================================
-- NE ZAMAN: uygulamadan ÖNCE ya da SONRA fark etmez (geriye uyumlu: yeni parametre
--   varsayılanlı, eski çağrılar aynen çalışır). Önce sonu ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/017_smoke.sql.
--
-- record_cari_transaction_atomic düzeltmeleri:
--   1) Tutar kuruşa yuvarlanır (bakiye sütunu NUMERIC(12,2); delta ile bakiye ayrışmasın).
--   2) Fiş sırası 999'u aşınca kesilmez (lpad sabit genişlik değil, en az 3 hane).
--   3) p_target_balance: "bakiyeyi X'e getir" farkı hesap KİLİDİ ALTINDA hesaplanır
--      (eşzamanlı tahsilatla yarış ve çift düzeltme olmaz). Fark 0 ise kayıt atılmaz.
-- ==============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.record_cari_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, JSONB, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.record_cari_transaction_atomic(
  p_account_id TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_items JSONB DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_reverses_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_target_balance NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance NUMERIC;
  v_archived TIMESTAMPTZ;
  v_amount NUMERIC := round(p_amount, 2);
  v_delta NUMERIC;
  v_orig RECORD;
  v_yymm TEXT := to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYMM');
  v_seq INTEGER;
  v_slip TEXT;
  v_id UUID;
BEGIN
  SELECT balance, archived_at INTO v_balance, v_archived
  FROM public.current_accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CARI_NOT_FOUND: %', p_account_id;
  END IF;
  IF v_archived IS NOT NULL AND p_type <> 'storno' THEN
    RAISE EXCEPTION 'CARI_ARCHIVED: %', p_account_id;
  END IF;
  v_balance := COALESCE(v_balance, 0);

  IF p_type = 'satis' THEN
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := v_amount;
  ELSIF p_type = 'tahsilat' THEN
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := -v_amount;
  ELSIF p_type = 'devir' AND p_target_balance IS NOT NULL THEN
    -- Fark kilit altında: bu arada gelen tahsilat/fiş hesaba katılır
    v_delta := round(p_target_balance, 2) - v_balance;
    IF v_delta = 0 THEN
      RETURN jsonb_build_object('success', true, 'unchanged', true, 'delta', 0, 'balance_after', v_balance);
    END IF;
  ELSIF p_type = 'devir' THEN
    IF v_amount IS NULL OR v_amount = 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := v_amount;
  ELSIF p_type = 'storno' THEN
    IF p_reverses_id IS NULL THEN RAISE EXCEPTION 'STORNO_TARGET_REQUIRED'; END IF;
    SELECT id, account_id, delta, type, slip_number INTO v_orig
    FROM public.account_transactions WHERE id = p_reverses_id FOR UPDATE;
    IF NOT FOUND OR v_orig.account_id <> p_account_id THEN RAISE EXCEPTION 'STORNO_TARGET_NOT_FOUND'; END IF;
    IF v_orig.type = 'storno' THEN RAISE EXCEPTION 'CANNOT_STORNO_A_STORNO'; END IF;
    IF EXISTS (SELECT 1 FROM public.account_transactions WHERE reverses_id = p_reverses_id) THEN
      RAISE EXCEPTION 'ALREADY_REVERSED';
    END IF;
    v_delta := -v_orig.delta;
  ELSE
    RAISE EXCEPTION 'INVALID_TYPE: %', p_type;
  END IF;

  -- Ay başına tek sıra: aynı ay içinde eşzamanlı iki fiş aynı numarayı alamaz
  PERFORM pg_advisory_xact_lock(hashtext('ekmeklab:slip:' || v_yymm));
  SELECT COALESCE(MAX(substring(slip_number FROM '^FİŞ-\d{4}-(\d+)$')::integer), 0) + 1 INTO v_seq
  FROM public.account_transactions WHERE slip_number LIKE 'FİŞ-' || v_yymm || '-%';
  -- En az 3 hane (lpad uzun değeri keserdi: 1000 → "100")
  v_slip := 'FİŞ-' || v_yymm || '-' || CASE WHEN v_seq < 1000 THEN lpad(v_seq::text, 3, '0') ELSE v_seq::text END;

  INSERT INTO public.account_transactions (
    account_id, type, amount, delta, description, payment_method, date, created_at,
    items, order_id, reverses_id, created_by, slip_number, balance_after
  ) VALUES (
    p_account_id, p_type, abs(v_delta), v_delta, NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_payment_method, COALESCE(p_date, (now() AT TIME ZONE 'Europe/Istanbul')::date), now(),
    p_items, p_order_id, p_reverses_id, p_created_by, v_slip, v_balance + v_delta
  ) RETURNING id INTO v_id;

  UPDATE public.current_accounts
  SET balance = v_balance + v_delta, updated_at = now()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_id,
    'slip_number', v_slip,
    'delta', v_delta,
    'balance_after', v_balance + v_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_cari_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, JSONB, TEXT, UUID, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_cari_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, JSONB, TEXT, UUID, UUID, NUMERIC)
  TO service_role;

INSERT INTO public.app_migrations (id) VALUES ('017_ledger_hardening') ON CONFLICT DO NOTHING;

COMMIT;
