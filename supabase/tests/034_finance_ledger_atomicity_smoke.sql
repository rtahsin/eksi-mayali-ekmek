-- ==============================================================================
-- 034_finance_ledger_atomicity_smoke.sql — Duman Testi (ROLLBACK)
-- ==============================================================================
-- 034_finance_ledger_atomicity.sql uygulandıktan sonra çalıştırılır.
-- Hiçbir değişiklik kalıcı olmaz (son satır ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_missing_idx TEXT[];
  v_res JSONB;
  v_storno_res JSONB;
  v_fin_id UUID;
  v_fin_storno_id UUID;
  v_sup_id TEXT := 'sup_SMOKE034';
  v_alis_id UUID;
  v_odeme_id UUID;
  v_odeme_storno_id UUID;
  v_linked_exp_id UUID;
  v_reversed_exp_id UUID;
  v_err TEXT;
BEGIN
  -- 1) app_migrations kaydı
  ASSERT EXISTS (
    SELECT 1 FROM public.app_migrations WHERE id = '034_finance_ledger_atomicity'
  ), 'app_migrations içinde 034_finance_ledger_atomicity bulunamadı';

  -- 2) İndeksler mevcut mu?
  SELECT array_agg(expected_idx)
    INTO v_missing_idx
    FROM unnest(ARRAY[
      'uq_financial_records_reverses',
      'uq_supplier_transactions_reverses',
      'idx_supplier_transactions_supplier_date',
      'idx_supplier_transactions_date',
      'idx_supplier_transactions_linked_fin',
      'idx_payments_retail_completed_date'
    ]) AS expected_idx
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = expected_idx
   );

  IF v_missing_idx IS NOT NULL AND array_length(v_missing_idx, 1) > 0 THEN
    RAISE EXCEPTION 'Eksik indeksler: %', array_to_string(v_missing_idx, ', ');
  END IF;

  -- 3) Yetki & Tek-Yazar Kontrolleri
  -- 3a) Yeni 4 RPC: anon ve authenticated çağıramaz, service_role çağırabilir
  ASSERT NOT has_function_privilege(
    'anon',
    'public.record_financial_record_atomic(text, text, numeric, text, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'anon record_financial_record_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege(
    'authenticated',
    'public.record_financial_record_atomic(text, text, numeric, text, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'authenticated record_financial_record_atomic çağırabiliyor';
  ASSERT has_function_privilege(
    'service_role',
    'public.record_financial_record_atomic(text, text, numeric, text, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'service_role record_financial_record_atomic çağıramıyor';

  ASSERT NOT has_function_privilege(
    'anon',
    'public.storno_financial_record_atomic(uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'anon storno_financial_record_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege(
    'authenticated',
    'public.storno_financial_record_atomic(uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'authenticated storno_financial_record_atomic çağırabiliyor';
  ASSERT has_function_privilege(
    'service_role',
    'public.storno_financial_record_atomic(uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'service_role storno_financial_record_atomic çağıramıyor';

  ASSERT NOT has_function_privilege(
    'anon',
    'public.record_supplier_transaction_atomic(text, text, numeric, text, text, timestamptz, text, text, boolean, uuid)',
    'EXECUTE'
  ), 'anon record_supplier_transaction_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege(
    'authenticated',
    'public.record_supplier_transaction_atomic(text, text, numeric, text, text, timestamptz, text, text, boolean, uuid)',
    'EXECUTE'
  ), 'authenticated record_supplier_transaction_atomic çağırabiliyor';
  ASSERT has_function_privilege(
    'service_role',
    'public.record_supplier_transaction_atomic(text, text, numeric, text, text, timestamptz, text, text, boolean, uuid)',
    'EXECUTE'
  ), 'service_role record_supplier_transaction_atomic çağıramıyor';

  ASSERT NOT has_function_privilege(
    'anon',
    'public.storno_supplier_transaction_atomic(text, uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'anon storno_supplier_transaction_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege(
    'authenticated',
    'public.storno_supplier_transaction_atomic(text, uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'authenticated storno_supplier_transaction_atomic çağırabiliyor';
  ASSERT has_function_privilege(
    'service_role',
    'public.storno_supplier_transaction_atomic(text, uuid, text, timestamptz, uuid)',
    'EXECUTE'
  ), 'service_role storno_supplier_transaction_atomic çağıramıyor';

  -- 3b) Tarayıcı rolleri financial_records / supplier_transactions / suppliers tablolarına yazamaz
  ASSERT NOT has_table_privilege('authenticated', 'public.financial_records', 'INSERT'), 'authenticated financial_records INSERT yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.financial_records', 'UPDATE'), 'authenticated financial_records UPDATE yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.financial_records', 'DELETE'), 'authenticated financial_records DELETE yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.supplier_transactions', 'INSERT'), 'authenticated supplier_transactions INSERT yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.supplier_transactions', 'UPDATE'), 'authenticated supplier_transactions UPDATE yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.supplier_transactions', 'DELETE'), 'authenticated supplier_transactions DELETE yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.suppliers', 'INSERT'), 'authenticated suppliers INSERT yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.suppliers', 'UPDATE'), 'authenticated suppliers UPDATE yetkili';
  ASSERT NOT has_table_privilege('authenticated', 'public.suppliers', 'DELETE'), 'authenticated suppliers DELETE yetkili';
  ASSERT NOT has_table_privilege('anon', 'public.financial_records', 'INSERT'), 'anon financial_records INSERT yetkili';
  ASSERT NOT has_table_privilege('anon', 'public.supplier_transactions', 'INSERT'), 'anon supplier_transactions INSERT yetkili';
  ASSERT NOT has_table_privilege('anon', 'public.suppliers', 'INSERT'), 'anon suppliers INSERT yetkili';

  -- 3c) RLS politikaları yalnız SELECT'e daraltılmış olmalı (FOR ALL kalmamalı)
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('financial_records', 'suppliers', 'supplier_transactions')
       AND cmd <> 'SELECT'
  ), 'Finans/tedarikçi tablolarında SELECT dışı RLS politikası kaldı';

  -- 4) Finans Kaydı (record_financial_record_atomic + storno_financial_record_atomic)
  -- 4a) Geçersiz tür ve tutar reddi
  BEGIN
    PERFORM public.record_financial_record_atomic('storno_gider', 'diger', 100, 'TEST', 'nakit');
    RAISE EXCEPTION 'Geçersiz tür kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%INVALID_TYPE%', 'Beklenen INVALID_TYPE değil: ' || v_err;
  END;

  BEGIN
    PERFORM public.record_financial_record_atomic('gider', 'diger', 0, 'TEST', 'nakit');
    RAISE EXCEPTION 'Sıfır tutar kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%INVALID_AMOUNT%', 'Beklenen INVALID_AMOUNT değil: ' || v_err;
  END;

  -- 4b) Gider kaydı
  v_res := public.record_financial_record_atomic(
    'gider',
    'enerji_firin',
    350.50,
    'TEST elektrik faturası',
    'havale'
  );
  v_fin_id := (v_res->>'id')::uuid;
  ASSERT v_fin_id IS NOT NULL, 'Gider ID dönmedi';
  ASSERT v_res->>'type' = 'gider', 'Gider türü yanlış';
  ASSERT (v_res->>'amount')::numeric = 350.50, 'Gider tutarı yanlış';
  ASSERT v_res->>'reverses_id' IS NULL, 'Yeni giderde reverses_id null olmalı';

  -- 4c) Gider storno
  v_storno_res := public.storno_financial_record_atomic(v_fin_id, 'TEST hatalı tutar');
  v_fin_storno_id := (v_storno_res->>'id')::uuid;
  ASSERT v_storno_res->>'type' = 'storno_gider', 'Storno türü storno_gider değil';
  ASSERT (v_storno_res->>'amount')::numeric = 350.50, 'Storno tutarı yanlış';
  ASSERT (v_storno_res->>'reverses_id')::uuid = v_fin_id, 'reverses_id eşleşmedi';
  ASSERT v_storno_res->>'description' LIKE '[STORNO:' || v_fin_id::text || ']%', 'Storno açıklama etiketi eksik';

  -- 4d) Çift storno => ALREADY_REVERSED
  BEGIN
    PERFORM public.storno_financial_record_atomic(v_fin_id, 'TEST ikinci storno');
    RAISE EXCEPTION 'Çift storno kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%ALREADY_REVERSED%', 'Beklenen ALREADY_REVERSED değil: ' || v_err;
  END;

  -- 4e) Stornoya storno => CANNOT_STORNO_A_STORNO
  BEGIN
    PERFORM public.storno_financial_record_atomic(v_fin_storno_id, 'TEST stornoya storno');
    RAISE EXCEPTION 'Stornoya storno kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CANNOT_STORNO_A_STORNO%', 'Beklenen CANNOT_STORNO_A_STORNO değil: ' || v_err;
  END;

  -- 4f) CHECK kısıtı tablo seviyesinde de korumalı
  BEGIN
    INSERT INTO public.financial_records (type, category, amount, description)
    VALUES ('gider', 'diger', -5, 'TEST negatif');
    RAISE EXCEPTION 'CHECK (amount > 0) çalışmadı';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 5) Tedarikçi Hareketi + Bağlı Gider + Atomik Storno
  INSERT INTO public.suppliers (id, name, category, balance, created_at, updated_at)
  VALUES (v_sup_id, 'TEST Değirmen 034', 'Un & Tahıl', 0, now(), now());

  -- 5a) Alış: +1000 TL (bakiye 0 -> 1000)
  v_res := public.record_supplier_transaction_atomic(
    v_sup_id,
    'alis',
    1000,
    'FAT-034-1',
    'TEST 20 çuval taş değirmen unu'
  );
  v_alis_id := (v_res->'transaction'->>'id')::uuid;
  ASSERT (v_res->>'new_balance')::numeric = 1000, 'Alış sonrası new_balance 1000 değil';
  ASSERT (v_res->'transaction'->>'balance_after')::numeric = 1000, 'Alış balance_after 1000 değil';
  ASSERT v_res->>'recorded_expense_id' IS NULL, 'Alışta gider kaydı oluşmamalı';
  ASSERT (SELECT balance FROM public.suppliers WHERE id = v_sup_id) = 1000, 'suppliers.balance 1000 değil';

  -- 5b) Ödeme: -400 TL + also_record_expense = true (bakiye 1000 -> 600 + bağlı gider)
  v_res := public.record_supplier_transaction_atomic(
    v_sup_id,
    'odeme',
    400,
    'DEK-034-1',
    'TEST havale ödemesi',
    timezone('utc'::text, now()),
    'havale',
    'hammadde_un',
    true
  );
  v_odeme_id := (v_res->'transaction'->>'id')::uuid;
  v_linked_exp_id := (v_res->>'recorded_expense_id')::uuid;
  ASSERT (v_res->>'new_balance')::numeric = 600, 'Ödeme sonrası new_balance 600 değil';
  ASSERT (v_res->'transaction'->>'balance_after')::numeric = 600, 'Ödeme balance_after 600 değil';
  ASSERT v_linked_exp_id IS NOT NULL, 'Bağlı gider kaydı oluşmadı';
  ASSERT (v_res->'transaction'->>'linked_financial_record_id')::uuid = v_linked_exp_id,
    'linked_financial_record_id eşleşmedi';
  ASSERT EXISTS (
    SELECT 1 FROM public.financial_records
     WHERE id = v_linked_exp_id
       AND type = 'gider'
       AND category = 'hammadde_un'
       AND payment_method = 'havale'
       AND amount = 400
  ), 'Bağlı gider satırı financial_records içinde doğrulanamadı';
  ASSERT (SELECT balance FROM public.suppliers WHERE id = v_sup_id) = 600, 'suppliers.balance 600 değil';

  -- 5c) Ödeme storno: tedarikçi bakiyesi 600 -> 1000 VE bağlı gider aynı transaction içinde storno_gider olur
  v_storno_res := public.storno_supplier_transaction_atomic(
    v_sup_id,
    v_odeme_id,
    'TEST hatalı ödeme girişi'
  );
  v_odeme_storno_id := (v_storno_res->'transaction'->>'id')::uuid;
  v_reversed_exp_id := (v_storno_res->>'reversed_expense_id')::uuid;
  ASSERT (v_storno_res->>'new_balance')::numeric = 1000, 'Ödeme storno sonrası new_balance 1000 değil';
  ASSERT v_storno_res->'transaction'->>'type' = 'storno_odeme', 'Storno türü storno_odeme değil';
  ASSERT (v_storno_res->'transaction'->>'reverses_id')::uuid = v_odeme_id, 'Tedarikçi storno reverses_id yanlış';
  ASSERT (v_storno_res->'transaction'->>'balance_after')::numeric = 1000, 'Storno balance_after 1000 değil';
  ASSERT v_storno_res->'transaction'->>'invoice_no' = 'STORNO:' || v_odeme_id::text, 'Storno invoice_no etiketi yanlış';
  ASSERT v_reversed_exp_id IS NOT NULL, 'Bağlı gider kaydı otomatik storno edilmedi';
  ASSERT (v_storno_res->'transaction'->>'linked_financial_record_id')::uuid = v_reversed_exp_id,
    'Storno hareketi reversed_expense_id bağlantısını taşımıyor';
  ASSERT EXISTS (
    SELECT 1 FROM public.financial_records
     WHERE id = v_reversed_exp_id
       AND type = 'storno_gider'
       AND reverses_id = v_linked_exp_id
       AND amount = 400
  ), 'Bağlı storno_gider satırı financial_records içinde doğrulanamadı';
  ASSERT (SELECT balance FROM public.suppliers WHERE id = v_sup_id) = 1000, 'suppliers.balance 1000 e dönmedi';

  -- 5d) Çift tedarikçi storno => ALREADY_REVERSED
  BEGIN
    PERFORM public.storno_supplier_transaction_atomic(v_sup_id, v_odeme_id, 'TEST ikinci storno');
    RAISE EXCEPTION 'Çift tedarikçi storno kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%ALREADY_REVERSED%', 'Beklenen ALREADY_REVERSED değil: ' || v_err;
  END;

  -- 5e) Tedarikçi stornoya storno => CANNOT_STORNO_A_STORNO
  BEGIN
    PERFORM public.storno_supplier_transaction_atomic(v_sup_id, v_odeme_storno_id, 'TEST stornoya storno');
    RAISE EXCEPTION 'Tedarikçi stornoya storno kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CANNOT_STORNO_A_STORNO%', 'Beklenen CANNOT_STORNO_A_STORNO değil: ' || v_err;
  END;

  -- 5f) Alış storno: 1000 -> 0, bağlı gider olmadığı için reversed_expense_id null
  v_storno_res := public.storno_supplier_transaction_atomic(v_sup_id, v_alis_id, 'TEST fatura iptali');
  ASSERT (v_storno_res->>'new_balance')::numeric = 0, 'Alış storno sonrası bakiye 0 değil';
  ASSERT v_storno_res->'transaction'->>'type' = 'storno_alis', 'Alış storno türü storno_alis değil';
  ASSERT v_storno_res->>'reversed_expense_id' IS NULL, 'Alış stornoda reversed_expense_id null olmalı';
  ASSERT (SELECT balance FROM public.suppliers WHERE id = v_sup_id) = 0, 'suppliers.balance 0 değil';

  RAISE NOTICE '034_finance_ledger_atomicity smoke OK';
END $$;

ROLLBACK;
