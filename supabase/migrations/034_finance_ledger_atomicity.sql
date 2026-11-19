-- ==============================================================================
-- 034_finance_ledger_atomicity.sql  (Faz 2A — Finans & Tedarikçi Defteri Atomikliği)
-- ==============================================================================
-- NE ZAMAN: Faz 2B uygulama kodu yayınlanmadan ÖNCE çalıştırılır (eklemeli şema +
--   yeni atomik RPC'ler; mevcut okuma sorgularıyla tam geriye uyumludur).
-- NASIL: Supabase SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile
--   kuru deneme yapın, ardından COMMIT ile uygulayın.
--   Sonrasında `supabase/tests/034_finance_ledger_atomicity_smoke.sql` duman
--   testini çalıştırın.
--
-- İçerik:
--   1) financial_records & supplier_transactions şema güçlendirmeleri
--      (reverses_id FK + tekil kısmi indeks, balance_after, bağlı gider FK,
--      created_by, CHECK kısıtları ve performans indeksleri) + payments indeksi.
--   2) 4 atomik RPC (SECURITY DEFINER, SET search_path = public, pg_temp,
--      yalnız service_role):
--      - record_financial_record_atomic
--      - storno_financial_record_atomic
--      - record_supplier_transaction_atomic
--      - storno_supplier_transaction_atomic
--   3) Tek-yazar sertleştirmesi (tarayıcı rollerinden INSERT/UPDATE/DELETE
--      kaldırılır, RLS politikaları yalnız admin SELECT'e daraltılır).
--   4) app_migrations kaydı ('034_finance_ledger_atomicity').
-- ==============================================================================

BEGIN;

-- 1) ŞEMA GÜÇLENDİRMELERİ ------------------------------------------------------

-- 1a) public.financial_records
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS reverses_id UUID REFERENCES public.financial_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Mevcut [STORNO:<uuid>] açıklamalı kayıtları güvenli biçimde reverses_id ile eşle
DO $$
DECLARE
  v_rec RECORD;
  v_target_text TEXT;
  v_target_id UUID;
BEGIN
  FOR v_rec IN
    SELECT id, description
      FROM public.financial_records
     WHERE reverses_id IS NULL
       AND type IN ('storno_gider', 'storno_gelir')
       AND COALESCE(description, '') ~* '^\[STORNO:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]'
  LOOP
    v_target_text := substring(
      v_rec.description
      FROM '(?i)^\[STORNO:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]'
    );
    IF v_target_text IS NOT NULL THEN
      v_target_id := v_target_text::uuid;
      IF v_target_id <> v_rec.id
         AND EXISTS (SELECT 1 FROM public.financial_records t WHERE t.id = v_target_id)
         AND NOT EXISTS (SELECT 1 FROM public.financial_records s WHERE s.reverses_id = v_target_id) THEN
        UPDATE public.financial_records
           SET reverses_id = v_target_id
         WHERE id = v_rec.id;
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'financial_records_type_check'
       AND conrelid = 'public.financial_records'::regclass
  ) THEN
    ALTER TABLE public.financial_records
      ADD CONSTRAINT financial_records_type_check
      CHECK (type IN ('gider', 'gelir', 'storno_gider', 'storno_gelir'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'financial_records_amount_check'
       AND conrelid = 'public.financial_records'::regclass
  ) THEN
    ALTER TABLE public.financial_records
      ADD CONSTRAINT financial_records_amount_check
      CHECK (amount > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_records_reverses
  ON public.financial_records (reverses_id)
  WHERE reverses_id IS NOT NULL;

-- 1b) public.supplier_transactions
ALTER TABLE public.supplier_transactions
  ADD COLUMN IF NOT EXISTS reverses_id UUID REFERENCES public.supplier_transactions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS expense_category TEXT,
  ADD COLUMN IF NOT EXISTS linked_financial_record_id UUID REFERENCES public.financial_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Mevcut STORNO:<uuid> invoice_no kayıtlarını güvenli biçimde reverses_id ile eşle
DO $$
DECLARE
  v_rec RECORD;
  v_target_text TEXT;
  v_target_id UUID;
BEGIN
  FOR v_rec IN
    SELECT id, supplier_id, invoice_no
      FROM public.supplier_transactions
     WHERE reverses_id IS NULL
       AND type IN ('storno_alis', 'storno_odeme')
       AND COALESCE(invoice_no, '') ~* '^STORNO:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    v_target_text := substring(
      v_rec.invoice_no
      FROM '(?i)^STORNO:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
    );
    IF v_target_text IS NOT NULL THEN
      v_target_id := v_target_text::uuid;
      IF v_target_id <> v_rec.id
         AND EXISTS (
           SELECT 1 FROM public.supplier_transactions t
            WHERE t.id = v_target_id AND t.supplier_id = v_rec.supplier_id
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.supplier_transactions s WHERE s.reverses_id = v_target_id
         ) THEN
        UPDATE public.supplier_transactions
           SET reverses_id = v_target_id
         WHERE id = v_rec.id;
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'supplier_transactions_type_check'
       AND conrelid = 'public.supplier_transactions'::regclass
  ) THEN
    ALTER TABLE public.supplier_transactions
      ADD CONSTRAINT supplier_transactions_type_check
      CHECK (type IN ('alis', 'odeme', 'storno_alis', 'storno_odeme'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'supplier_transactions_amount_check'
       AND conrelid = 'public.supplier_transactions'::regclass
  ) THEN
    ALTER TABLE public.supplier_transactions
      ADD CONSTRAINT supplier_transactions_amount_check
      CHECK (amount > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_transactions_reverses
  ON public.supplier_transactions (reverses_id)
  WHERE reverses_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier_date
  ON public.supplier_transactions (supplier_id, date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_date
  ON public.supplier_transactions (date DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_linked_fin
  ON public.supplier_transactions (linked_financial_record_id)
  WHERE linked_financial_record_id IS NOT NULL;

-- 1c) public.payments (perakende tahsilat dönem sorgusu için kısmi indeks)
CREATE INDEX IF NOT EXISTS idx_payments_retail_completed_date
  ON public.payments (paid_at, created_at)
  WHERE status = 'completed' AND cari_transaction_id IS NULL;

-- 2) ATOMİK RPC FONKSİYONLARI --------------------------------------------------

-- 2a) record_financial_record_atomic
CREATE OR REPLACE FUNCTION public.record_financial_record_atomic(
  p_type TEXT,
  p_category TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_payment_method TEXT,
  p_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount NUMERIC;
  v_category TEXT;
  v_payment_method TEXT;
  v_description TEXT;
  v_date TIMESTAMPTZ;
  v_row RECORD;
BEGIN
  IF p_type IS NULL OR p_type NOT IN ('gider', 'gelir') THEN
    RAISE EXCEPTION 'INVALID_TYPE: %', COALESCE(p_type, 'NULL');
  END IF;

  v_amount := round(p_amount, 2);
  IF p_amount IS NULL OR p_amount <= 0 OR v_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  v_category := COALESCE(NULLIF(TRIM(COALESCE(p_category, '')), ''), 'diger');
  v_payment_method := COALESCE(NULLIF(TRIM(COALESCE(p_payment_method, '')), ''), 'nakit');
  v_description := NULLIF(TRIM(COALESCE(p_description, '')), '');
  v_date := COALESCE(p_date, timezone('utc'::text, now()));

  INSERT INTO public.financial_records (
    type,
    category,
    amount,
    description,
    payment_method,
    date,
    reverses_id,
    created_by
  ) VALUES (
    p_type,
    v_category,
    v_amount,
    v_description,
    v_payment_method,
    v_date,
    NULL,
    p_created_by
  )
  RETURNING id, type, category, amount, description, payment_method, date, created_at, reverses_id
  INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'type', v_row.type,
    'category', v_row.category,
    'amount', v_row.amount,
    'description', v_row.description,
    'payment_method', v_row.payment_method,
    'date', v_row.date,
    'created_at', v_row.created_at,
    'reverses_id', v_row.reverses_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_financial_record_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_financial_record_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, UUID)
  TO service_role;

-- 2b) storno_financial_record_atomic
CREATE OR REPLACE FUNCTION public.storno_financial_record_atomic(
  p_record_id UUID,
  p_reason TEXT,
  p_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target RECORD;
  v_storno_type TEXT;
  v_amount NUMERIC;
  v_reason TEXT;
  v_date TIMESTAMPTZ;
  v_row RECORD;
BEGIN
  IF p_record_id IS NULL THEN
    RAISE EXCEPTION 'RECORD_NOT_FOUND';
  END IF;

  SELECT id, type, category, amount, description, payment_method
    INTO v_target
    FROM public.financial_records
   WHERE id = p_record_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECORD_NOT_FOUND: %', p_record_id;
  END IF;

  IF v_target.type IN ('storno_gider', 'storno_gelir') THEN
    RAISE EXCEPTION 'CANNOT_STORNO_A_STORNO';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.financial_records
     WHERE reverses_id = p_record_id
        OR description LIKE '[STORNO:' || p_record_id::text || ']%'
  ) THEN
    RAISE EXCEPTION 'ALREADY_REVERSED';
  END IF;

  v_storno_type := CASE WHEN v_target.type = 'gider' THEN 'storno_gider' ELSE 'storno_gelir' END;
  v_amount := round(abs(v_target.amount), 2);
  v_reason := COALESCE(NULLIF(TRIM(COALESCE(p_reason, '')), ''), 'Kayıt iptali');
  v_date := COALESCE(p_date, timezone('utc'::text, now()));

  INSERT INTO public.financial_records (
    type,
    category,
    amount,
    description,
    payment_method,
    date,
    reverses_id,
    created_by
  ) VALUES (
    v_storno_type,
    COALESCE(NULLIF(TRIM(COALESCE(v_target.category, '')), ''), 'diger'),
    v_amount,
    '[STORNO:' || p_record_id::text || '] ' || v_reason,
    COALESCE(NULLIF(TRIM(COALESCE(v_target.payment_method, '')), ''), 'nakit'),
    v_date,
    p_record_id,
    p_created_by
  )
  RETURNING id, type, category, amount, description, payment_method, date, created_at, reverses_id
  INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'type', v_row.type,
    'category', v_row.category,
    'amount', v_row.amount,
    'description', v_row.description,
    'payment_method', v_row.payment_method,
    'date', v_row.date,
    'created_at', v_row.created_at,
    'reverses_id', v_row.reverses_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storno_financial_record_atomic(UUID, TEXT, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storno_financial_record_atomic(UUID, TEXT, TIMESTAMPTZ, UUID)
  TO service_role;

-- 2c) record_supplier_transaction_atomic
CREATE OR REPLACE FUNCTION public.record_supplier_transaction_atomic(
  p_supplier_id TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_invoice_no TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  p_payment_method TEXT DEFAULT NULL,
  p_expense_category TEXT DEFAULT NULL,
  p_also_record_expense BOOLEAN DEFAULT FALSE,
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_supplier RECORD;
  v_amount NUMERIC;
  v_delta NUMERIC;
  v_new_balance NUMERIC;
  v_date TIMESTAMPTZ;
  v_invoice_no TEXT;
  v_raw_desc TEXT;
  v_description TEXT;
  v_payment_method TEXT;
  v_expense_category TEXT;
  v_linked_expense_id UUID := NULL;
  v_tx RECORD;
BEGIN
  SELECT id, name, balance
    INTO v_supplier
    FROM public.suppliers
   WHERE id = p_supplier_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPPLIER_NOT_FOUND: %', COALESCE(p_supplier_id, 'NULL');
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('alis', 'odeme') THEN
    RAISE EXCEPTION 'INVALID_TYPE: %', COALESCE(p_type, 'NULL');
  END IF;

  v_amount := round(p_amount, 2);
  IF p_amount IS NULL OR p_amount <= 0 OR v_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  v_delta := CASE WHEN p_type = 'alis' THEN v_amount ELSE -v_amount END;
  v_new_balance := round(COALESCE(v_supplier.balance, 0) + v_delta, 2);
  v_date := COALESCE(p_date, timezone('utc'::text, now()));
  v_invoice_no := NULLIF(TRIM(COALESCE(p_invoice_no, '')), '');
  v_raw_desc := NULLIF(TRIM(COALESCE(p_description, '')), '');
  v_description := COALESCE(
    v_raw_desc,
    CASE WHEN p_type = 'alis' THEN 'Mal alım faturası' ELSE 'Tedarikçi ödemesi' END
  );
  v_payment_method := NULLIF(TRIM(COALESCE(p_payment_method, '')), '');
  v_expense_category := NULLIF(TRIM(COALESCE(p_expense_category, '')), '');

  IF p_type = 'odeme' AND COALESCE(p_also_record_expense, FALSE) THEN
    v_payment_method := COALESCE(v_payment_method, 'havale');
    v_expense_category := COALESCE(v_expense_category, 'diger');

    INSERT INTO public.financial_records (
      type,
      category,
      amount,
      description,
      payment_method,
      date,
      reverses_id,
      created_by
    ) VALUES (
      'gider',
      v_expense_category,
      v_amount,
      '[Tedarikçi Ödemesi: ' || v_supplier.name || '] ' || COALESCE(v_raw_desc, v_invoice_no, 'Ödeme çıkışı'),
      v_payment_method,
      v_date,
      NULL,
      p_created_by
    )
    RETURNING id INTO v_linked_expense_id;
  END IF;

  INSERT INTO public.supplier_transactions (
    supplier_id,
    type,
    amount,
    invoice_no,
    description,
    date,
    reverses_id,
    balance_after,
    payment_method,
    expense_category,
    linked_financial_record_id,
    created_by
  ) VALUES (
    p_supplier_id,
    p_type,
    v_amount,
    v_invoice_no,
    v_description,
    v_date,
    NULL,
    v_new_balance,
    v_payment_method,
    v_expense_category,
    v_linked_expense_id,
    p_created_by
  )
  RETURNING id, supplier_id, type, amount, invoice_no, description, date, created_at,
            reverses_id, balance_after, payment_method, expense_category, linked_financial_record_id
  INTO v_tx;

  UPDATE public.suppliers
     SET balance = v_new_balance,
         updated_at = now()
   WHERE id = p_supplier_id;

  RETURN jsonb_build_object(
    'transaction', jsonb_build_object(
      'id', v_tx.id,
      'supplier_id', v_tx.supplier_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'invoice_no', v_tx.invoice_no,
      'description', v_tx.description,
      'date', v_tx.date,
      'created_at', v_tx.created_at,
      'reverses_id', v_tx.reverses_id,
      'balance_after', v_tx.balance_after,
      'payment_method', v_tx.payment_method,
      'expense_category', v_tx.expense_category,
      'linked_financial_record_id', v_tx.linked_financial_record_id
    ),
    'new_balance', v_new_balance,
    'recorded_expense_id', v_linked_expense_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_transaction_atomic(TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, UUID)
  TO service_role;

-- 2d) storno_supplier_transaction_atomic
CREATE OR REPLACE FUNCTION public.storno_supplier_transaction_atomic(
  p_supplier_id TEXT,
  p_transaction_id UUID,
  p_reason TEXT,
  p_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_supplier RECORD;
  v_target RECORD;
  v_linked_fin RECORD;
  v_storno_type TEXT;
  v_amount NUMERIC;
  v_delta NUMERIC;
  v_new_balance NUMERIC;
  v_reason TEXT;
  v_date TIMESTAMPTZ;
  v_reversed_expense_id UUID := NULL;
  v_tx RECORD;
BEGIN
  -- Deadlock önlemi: her zaman önce suppliers, sonra supplier_transactions kilidi
  SELECT id, name, balance
    INTO v_supplier
    FROM public.suppliers
   WHERE id = p_supplier_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPPLIER_NOT_FOUND: %', COALESCE(p_supplier_id, 'NULL');
  END IF;

  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'TX_NOT_FOUND';
  END IF;

  SELECT id, supplier_id, type, amount, invoice_no, description,
         payment_method, expense_category, linked_financial_record_id
    INTO v_target
    FROM public.supplier_transactions
   WHERE id = p_transaction_id
     AND supplier_id = p_supplier_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TX_NOT_FOUND: %', p_transaction_id;
  END IF;

  IF v_target.type IN ('storno_alis', 'storno_odeme') THEN
    RAISE EXCEPTION 'CANNOT_STORNO_A_STORNO';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.supplier_transactions
     WHERE reverses_id = p_transaction_id
        OR (supplier_id = p_supplier_id AND invoice_no = 'STORNO:' || p_transaction_id::text)
  ) THEN
    RAISE EXCEPTION 'ALREADY_REVERSED';
  END IF;

  v_reason := COALESCE(NULLIF(TRIM(COALESCE(p_reason, '')), ''), 'Hareket iptali');
  v_date := COALESCE(p_date, timezone('utc'::text, now()));

  -- Bağlı gider kaydı varsa ve henüz storno edilmemişse AYNI işlemde tersle
  IF v_target.linked_financial_record_id IS NOT NULL THEN
    SELECT id, type, category, amount, payment_method
      INTO v_linked_fin
      FROM public.financial_records
     WHERE id = v_target.linked_financial_record_id
       FOR UPDATE;

    IF FOUND
       AND v_linked_fin.type = 'gider'
       AND NOT EXISTS (
         SELECT 1
           FROM public.financial_records
          WHERE reverses_id = v_linked_fin.id
             OR description LIKE '[STORNO:' || v_linked_fin.id::text || ']%'
       ) THEN
      INSERT INTO public.financial_records (
        type,
        category,
        amount,
        description,
        payment_method,
        date,
        reverses_id,
        created_by
      ) VALUES (
        'storno_gider',
        COALESCE(NULLIF(TRIM(COALESCE(v_linked_fin.category, '')), ''), COALESCE(v_target.expense_category, 'diger')),
        round(abs(v_linked_fin.amount), 2),
        '[STORNO:' || v_linked_fin.id::text || '] Tedarikçi ödeme iptali (' || v_supplier.name || '): ' || v_reason,
        COALESCE(NULLIF(TRIM(COALESCE(v_linked_fin.payment_method, '')), ''), COALESCE(v_target.payment_method, 'havale')),
        v_date,
        v_linked_fin.id,
        p_created_by
      )
      RETURNING id INTO v_reversed_expense_id;
    END IF;
  END IF;

  v_storno_type := CASE WHEN v_target.type = 'alis' THEN 'storno_alis' ELSE 'storno_odeme' END;
  v_amount := round(abs(v_target.amount), 2);
  v_delta := CASE WHEN v_storno_type = 'storno_alis' THEN -v_amount ELSE v_amount END;
  v_new_balance := round(COALESCE(v_supplier.balance, 0) + v_delta, 2);

  INSERT INTO public.supplier_transactions (
    supplier_id,
    type,
    amount,
    invoice_no,
    description,
    date,
    reverses_id,
    balance_after,
    payment_method,
    expense_category,
    linked_financial_record_id,
    created_by
  ) VALUES (
    p_supplier_id,
    v_storno_type,
    v_amount,
    'STORNO:' || p_transaction_id::text,
    '[STORNO] ' || v_reason,
    v_date,
    p_transaction_id,
    v_new_balance,
    v_target.payment_method,
    v_target.expense_category,
    v_reversed_expense_id,
    p_created_by
  )
  RETURNING id, supplier_id, type, amount, invoice_no, description, date, created_at,
            reverses_id, balance_after, payment_method, expense_category, linked_financial_record_id
  INTO v_tx;

  UPDATE public.suppliers
     SET balance = v_new_balance,
         updated_at = now()
   WHERE id = p_supplier_id;

  RETURN jsonb_build_object(
    'transaction', jsonb_build_object(
      'id', v_tx.id,
      'supplier_id', v_tx.supplier_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'invoice_no', v_tx.invoice_no,
      'description', v_tx.description,
      'date', v_tx.date,
      'created_at', v_tx.created_at,
      'reverses_id', v_tx.reverses_id,
      'balance_after', v_tx.balance_after,
      'payment_method', v_tx.payment_method,
      'expense_category', v_tx.expense_category,
      'linked_financial_record_id', v_tx.linked_financial_record_id
    ),
    'new_balance', v_new_balance,
    'reversed_expense_id', v_reversed_expense_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storno_supplier_transaction_atomic(TEXT, UUID, TEXT, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storno_supplier_transaction_atomic(TEXT, UUID, TEXT, TIMESTAMPTZ, UUID)
  TO service_role;

-- 3) TEK-YAZAR SERTLEŞTİRMESİ & RLS --------------------------------------------

REVOKE INSERT, UPDATE, DELETE ON public.financial_records, public.supplier_transactions, public.suppliers
  FROM PUBLIC, anon, authenticated;

-- 033 politikalarını yalnız SELECT'e daralt (InitPlan uyumlu, tek permissive politika)
DROP POLICY IF EXISTS "financial_records_admin_all" ON public.financial_records;
DROP POLICY IF EXISTS "financial_records_select_admin" ON public.financial_records;
CREATE POLICY "financial_records_select_admin"
  ON public.financial_records
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_select_admin" ON public.suppliers;
CREATE POLICY "suppliers_select_admin"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "supplier_transactions_admin_all" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_transactions_select_admin" ON public.supplier_transactions;
CREATE POLICY "supplier_transactions_select_admin"
  ON public.supplier_transactions
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 4) app_migrations KAYDI ------------------------------------------------------

INSERT INTO public.app_migrations (id)
VALUES ('034_finance_ledger_atomicity')
ON CONFLICT (id) DO NOTHING;

COMMIT;
