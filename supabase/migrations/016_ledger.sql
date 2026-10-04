-- ==============================================================================
-- 016_ledger.sql  (Faz 3b — docs/YOL_HARITASI.md §6)
-- ==============================================================================
-- NE ZAMAN: Faz 3b uygulama kodu yayınlanmadan ÖNCE (eklemeli + veri dönüşümü;
--   eski admin ekranları yeni sütunları bilmez ama bozulmaz).
-- NASIL: önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme, sonra COMMIT.
--   Ardından supabase/tests/016_smoke.sql.
--
-- Amaç: cari defteri tek ve doğru sözlüğe taşımak.
--   * Her hareketin bakiyeye etkisi `delta` sütununda AÇIKÇA tutulur
--     (satış +, tahsilat −, devir ±, storno = iptal edilen hareketin tersi).
--   * Bakiye = SUM(delta) her zaman (öz-kontrol + mutabakat).
--   * Hareketler silinmez/düzenlenmez; düzeltme = storno + yeni kayıt.
--   * Tüm yazımlar tek RPC: record_cari_transaction_atomic (hesap satırı kilitli,
--     FİŞ-YYMM-NNN numarası ay başına kilit altında, İstanbul ayı).
--
-- İçerik:
--   1) account_transactions: delta, reverses_id, items, created_by, kanonik tür
--   2) eski kayıtların delta'sı: balance_after zincirinden (yoksa türden) hesaplanır
--   3) mutabakat: bakiye ≠ SUM(delta) ise tek "devir" satırı (aşağıdaki onaylı bakiyeler)
--   4) current_accounts.archived_at (silme yerine arşiv)
--   5) record_cari_transaction_atomic (yeni imza), adjust_cari_balance kaldırılır
--   6) tarayıcıdan doğrudan yazma kapatılır (tüm yazımlar sunucu API'si + RPC)
--
-- Not: create_order_atomic (015) içindeki cari dalı eski "debt" türüyle yazar ve 016 sonrası
--   CHECK'e takılır. Bugün hiçbir çağıran cari_id göndermiyor (web siparişi göndermez,
--   manuel sipariş henüz RPC kullanmıyor); 017 (Faz 3b-2) bu dalı teslimata taşıyarak yeniden tanımlar.
-- ==============================================================================

BEGIN;

-- 1) Sütunlar ---------------------------------------------------------------------
ALTER TABLE public.account_transactions
  ADD COLUMN IF NOT EXISTS delta numeric,
  ADD COLUMN IF NOT EXISTS reverses_id uuid REFERENCES public.account_transactions(id),
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS legacy_type text;

ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2) Eski kayıtlar: kanonik tür + delta ------------------------------------------------
--   balance_after varsa delta = balance_after − önceki bakiye (en güvenilir kaynak:
--   o anki gerçek etki); yoksa türden: borç (+) / alacak (−).
DO $$
DECLARE
  acc RECORD;
  tx RECORD;
  v_running numeric;
  v_delta numeric;
  v_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '016_ledger') THEN
    RETURN; -- tekrar çalıştırmada veriye dokunma
  END IF;

  FOR acc IN SELECT id FROM public.current_accounts LOOP
    v_running := 0;
    FOR tx IN
      SELECT id, type, amount, balance_after, description
      FROM public.account_transactions
      WHERE account_id = acc.id
      ORDER BY COALESCE(date, created_at), created_at, id
    LOOP
      IF tx.balance_after IS NOT NULL THEN
        v_delta := tx.balance_after - v_running;
      ELSIF tx.type IN ('credit', 'tahsilat', 'odeme') THEN
        v_delta := -abs(tx.amount);
      ELSIF tx.type = 'storno' THEN
        v_delta := -abs(tx.amount);
      ELSE
        v_delta := abs(tx.amount);
      END IF;

      v_type := CASE
        WHEN tx.type = 'storno' THEN 'storno'
        WHEN v_delta = 0 THEN 'devir'
        WHEN tx.type = 'devir' OR COALESCE(tx.description, '') ~* '(devir|açılış|acilis|düzeltme|duzeltme|mutabakat)' THEN 'devir'
        WHEN v_delta < 0 THEN 'tahsilat'
        ELSE 'satis'
      END;

      UPDATE public.account_transactions
      SET legacy_type = tx.type,
          type = v_type,
          delta = v_delta,
          amount = abs(v_delta),
          balance_after = v_running + v_delta
      WHERE id = tx.id;

      v_running := v_running + v_delta;
    END LOOP;
  END LOOP;
END $$;

-- 3) Mutabakat -------------------------------------------------------------------------
--   Tahsin'in onayladığı GERÇEK bakiyeler. Listede olmayan hesaplar için mevcut
--   current_accounts.balance doğru kabul edilir. Fark varsa tek bir "devir" satırı
--   eklenir (eski kayıtlar silinmez), ardından bakiye = SUM(delta) yapılır.
CREATE TEMP TABLE _confirmed_balances (account_id text PRIMARY KEY, balance numeric NOT NULL) ON COMMIT DROP;
-- ↓↓↓ Tahsin'in onayı (4 Eki 2026) — yayından önce doldurulur ↓↓↓
-- INSERT INTO _confirmed_balances VALUES ('cari_mubs5o74_z8ns', 17870), ('cari_mu93322t_wha0', 13630);
-- ↑↑↑

DO $$
DECLARE
  acc RECORD;
  v_sum numeric;
  v_target numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '016_ledger') THEN
    RETURN;
  END IF;

  FOR acc IN SELECT id, balance FROM public.current_accounts LOOP
    SELECT COALESCE(SUM(delta), 0) INTO v_sum FROM public.account_transactions WHERE account_id = acc.id;
    SELECT balance INTO v_target FROM _confirmed_balances WHERE account_id = acc.id;
    v_target := COALESCE(v_target, acc.balance, 0);

    IF v_target <> v_sum THEN
      INSERT INTO public.account_transactions (account_id, type, amount, delta, description, date, created_at, balance_after)
      VALUES (acc.id, 'devir', abs(v_target - v_sum), v_target - v_sum,
              'Geçiş mutabakatı (yeni defter, 016) — onaylı bakiye ' || v_target::text || ' ₺',
              (now() AT TIME ZONE 'Europe/Istanbul')::date, now(), v_target);
    END IF;

    UPDATE public.current_accounts SET balance = v_target, updated_at = now() WHERE id = acc.id;
  END LOOP;
END $$;

-- Kanonik kısıtlar (veri dönüştürüldükten sonra)
ALTER TABLE public.account_transactions ALTER COLUMN delta SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_transactions_type_check') THEN
    ALTER TABLE public.account_transactions
      ADD CONSTRAINT account_transactions_type_check CHECK (type IN ('satis', 'tahsilat', 'devir', 'storno'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_transactions_sign_check') THEN
    ALTER TABLE public.account_transactions
      ADD CONSTRAINT account_transactions_sign_check CHECK (
        (type = 'satis' AND delta > 0) OR (type = 'tahsilat' AND delta < 0) OR type IN ('devir', 'storno')
      );
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_transactions_slip ON public.account_transactions (slip_number)
  WHERE slip_number IS NOT NULL AND slip_number LIKE 'FİŞ-%' AND legacy_type IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_transactions_reverses ON public.account_transactions (reverses_id)
  WHERE reverses_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_date ON public.account_transactions (account_id, date, created_at);

-- 5) Tek yazım yolu ----------------------------------------------------------------------
DO $$ DECLARE r record; BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('adjust_cari_balance', 'record_cari_transaction_atomic')
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

-- p_type: 'satis' | 'tahsilat' | 'devir' | 'storno'
--   satis/tahsilat: p_amount > 0 (işaret türden gelir)
--   devir: p_amount işaretli (+ borç ekler, − düşer) — açılış/düzeltme
--   storno: p_reverses_id zorunlu; delta = −(iptal edilen hareketin delta'sı), aynı hareket iki kez iptal edilemez
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
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance NUMERIC;
  v_archived TIMESTAMPTZ;
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

  IF p_type = 'satis' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := p_amount;
  ELSIF p_type = 'tahsilat' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := -p_amount;
  ELSIF p_type = 'devir' THEN
    IF p_amount IS NULL OR p_amount = 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
    v_delta := p_amount;
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
  v_slip := 'FİŞ-' || v_yymm || '-' || lpad(v_seq::text, 3, '0');

  INSERT INTO public.account_transactions (
    account_id, type, amount, delta, description, payment_method, date, created_at,
    items, order_id, reverses_id, created_by, slip_number, balance_after
  ) VALUES (
    p_account_id, p_type, abs(v_delta), v_delta, NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_payment_method, COALESCE(p_date, (now() AT TIME ZONE 'Europe/Istanbul')::date), now(),
    p_items, p_order_id, p_reverses_id, p_created_by, v_slip, COALESCE(v_balance, 0) + v_delta
  ) RETURNING id INTO v_id;

  UPDATE public.current_accounts
  SET balance = COALESCE(v_balance, 0) + v_delta, updated_at = now()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_id,
    'slip_number', v_slip,
    'delta', v_delta,
    'balance_after', COALESCE(v_balance, 0) + v_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_cari_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, JSONB, TEXT, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_cari_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, DATE, JSONB, TEXT, UUID, UUID)
  TO service_role;

-- 6) Doğrudan yazma yok: admin ekranları okur (RLS), yazımlar service_role üzerinden
REVOKE INSERT, UPDATE, DELETE ON public.account_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.current_accounts FROM anon, authenticated;

-- Öz-kontrol: her hesapta bakiye = SUM(delta)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.current_accounts a
    WHERE COALESCE(a.balance, 0) <> COALESCE((SELECT SUM(delta) FROM public.account_transactions t WHERE t.account_id = a.id), 0)
  ) THEN
    RAISE EXCEPTION '016 öz-kontrol: bakiye ≠ SUM(delta) olan hesap var';
  END IF;
END $$;

INSERT INTO public.app_migrations (id) VALUES ('016_ledger') ON CONFLICT DO NOTHING;

COMMIT;
