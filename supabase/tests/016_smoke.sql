-- ==============================================================================
-- 016_smoke.sql — 016_ledger sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- Hata yoksa "016 smoke OK" bildirimi görülür.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  r JSONB;
  v_sale UUID;
  v_pay UUID;
  v_err TEXT;
  v_yymm TEXT := to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYMM');
  v_slip1 TEXT;
  v_slip2 TEXT;
BEGIN
  INSERT INTO public.current_accounts (id, name, balance, status, created_at, updated_at)
  VALUES ('cari_SMOKE016', 'TEST Smoke Cari', 0, 'active', now(), now());

  -- 1) Satış: +250, kalemler saklanır, FİŞ-YYMM-NNN
  r := public.record_cari_transaction_atomic('cari_SMOKE016', 'satis', 250, 'TEST', NULL, NULL,
    '[{"name":"Köy Ekmeği","quantity":5,"unitPrice":50}]'::jsonb);
  v_sale := (r->>'transaction_id')::uuid;
  v_slip1 := r->>'slip_number';
  ASSERT (r->>'balance_after')::numeric = 250, 'satış bakiyesi yanlış';
  ASSERT v_slip1 ~ ('^FİŞ-' || v_yymm || '-\d{3,}$'), 'fiş numarası biçimi yanlış: ' || v_slip1;
  ASSERT (SELECT items->0->>'name' FROM public.account_transactions WHERE id = v_sale) = 'Köy Ekmeği', 'kalemler yazılmadı';

  -- 2) Tahsilat: −100, numara ardışık
  r := public.record_cari_transaction_atomic('cari_SMOKE016', 'tahsilat', 100, NULL, 'nakit');
  v_pay := (r->>'transaction_id')::uuid;
  v_slip2 := r->>'slip_number';
  ASSERT (r->>'delta')::numeric = -100, 'tahsilat delta negatif değil';
  ASSERT (r->>'balance_after')::numeric = 150, 'tahsilat sonrası bakiye yanlış';
  ASSERT substring(v_slip2 FROM '(\d+)$')::int = substring(v_slip1 FROM '(\d+)$')::int + 1, 'fiş numarası ardışık değil';

  -- 3) Devir (düzeltme): işaretli tutar
  r := public.record_cari_transaction_atomic('cari_SMOKE016', 'devir', -20, 'TEST düzeltme');
  ASSERT (r->>'balance_after')::numeric = 130, 'devir sonrası bakiye yanlış';

  -- 4) Storno: satışın tersi; ikinci kez iptal edilemez; storno iptal edilemez
  r := public.record_cari_transaction_atomic('cari_SMOKE016', 'storno', 0, NULL, NULL, NULL, NULL, NULL, v_sale);
  ASSERT (r->>'delta')::numeric = -250, 'storno delta yanlış';
  ASSERT (r->>'balance_after')::numeric = -120, 'storno sonrası bakiye yanlış';
  BEGIN
    PERFORM public.record_cari_transaction_atomic('cari_SMOKE016', 'storno', 0, NULL, NULL, NULL, NULL, NULL, v_sale);
    RAISE EXCEPTION 'ikinci storno kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%ALREADY_REVERSED%', 'beklenmeyen hata: ' || v_err;
  END;
  BEGIN
    PERFORM public.record_cari_transaction_atomic('cari_SMOKE016', 'storno', 0, NULL, NULL, NULL, NULL, NULL,
      (r->>'transaction_id')::uuid);
    RAISE EXCEPTION 'storno iptal edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CANNOT_STORNO_A_STORNO%', 'beklenmeyen hata: ' || v_err;
  END;

  -- 5) Geçersiz tutar ve tür reddedilir; işaret kısıtı tabloda da var
  BEGIN
    PERFORM public.record_cari_transaction_atomic('cari_SMOKE016', 'tahsilat', -5);
    RAISE EXCEPTION 'negatif tahsilat kabul edildi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%INVALID_AMOUNT%', 'beklenmeyen hata: ' || v_err;
  END;
  BEGIN
    INSERT INTO public.account_transactions (account_id, type, amount, delta) VALUES ('cari_SMOKE016', 'satis', 5, -5);
    RAISE EXCEPTION 'işaret kısıtı çalışmadı';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 6) Bakiye = SUM(delta)
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE016')
       = (SELECT SUM(delta) FROM public.account_transactions WHERE account_id = 'cari_SMOKE016'), 'bakiye ≠ SUM(delta)';

  -- 7) Arşivli hesaba yeni hareket yazılamaz (storno hariç)
  UPDATE public.current_accounts SET archived_at = now() WHERE id = 'cari_SMOKE016';
  BEGIN
    PERFORM public.record_cari_transaction_atomic('cari_SMOKE016', 'satis', 10);
    RAISE EXCEPTION 'arşivli hesaba satış yazıldı';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CARI_ARCHIVED%', 'beklenmeyen hata: ' || v_err;
  END;
  r := public.record_cari_transaction_atomic('cari_SMOKE016', 'storno', 0, NULL, NULL, NULL, NULL, NULL, v_pay);
  ASSERT (r->>'balance_after')::numeric = -20, 'arşivde storno çalışmadı';

  -- 8) Tarayıcı rolleri doğrudan yazamaz, RPC'yi çağıramaz
  ASSERT NOT has_table_privilege('authenticated', 'public.account_transactions', 'INSERT'), 'authenticated deftere yazabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.current_accounts', 'UPDATE'), 'authenticated bakiyeyi değiştirebiliyor';
  ASSERT NOT has_function_privilege('authenticated',
    'public.record_cari_transaction_atomic(text, text, numeric, text, text, date, jsonb, text, uuid, uuid)', 'EXECUTE'),
    'authenticated RPC çağırabiliyor';

  -- 9) Canlı veri: tüm hesaplarda bakiye = SUM(delta)
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.current_accounts a
    WHERE COALESCE(a.balance, 0) <> COALESCE((SELECT SUM(delta) FROM public.account_transactions t WHERE t.account_id = a.id), 0)
  ), 'bakiye ≠ SUM(delta) olan canlı hesap var';

  RAISE NOTICE '016 smoke OK';
END $$;

ROLLBACK;
