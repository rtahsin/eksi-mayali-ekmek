-- ==============================================================================
-- 017_smoke.sql — 017_ledger_hardening sonrası duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- Hata yoksa "017 smoke OK" bildirimi görülür.
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  r JSONB;
  v_yymm TEXT := to_char(now() AT TIME ZONE 'Europe/Istanbul', 'YYMM');
BEGIN
  INSERT INTO public.current_accounts (id, name, balance, status, created_at, updated_at)
  VALUES ('cari_SMOKE017', 'TEST Smoke 017', 0, 'active', now(), now());

  -- 1) Kuruş yuvarlama: delta ile bakiye aynı kalır
  r := public.record_cari_transaction_atomic('cari_SMOKE017', 'satis', 10.004);
  ASSERT (r->>'delta')::numeric = 10.00, 'tutar kuruşa yuvarlanmadı';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE017')
       = (SELECT SUM(delta) FROM public.account_transactions WHERE account_id = 'cari_SMOKE017'), 'bakiye ≠ SUM(delta)';

  -- 2) Hedef bakiye: fark kilit altında hesaplanır; aynı hedef ikinci kez kayıt atmaz
  r := public.record_cari_transaction_atomic('cari_SMOKE017', 'devir', 0, 'TEST hedef', p_target_balance => 3);
  ASSERT (r->>'delta')::numeric = -7, 'hedef farkı yanlış';
  ASSERT (r->>'balance_after')::numeric = 3, 'hedef bakiye yanlış';
  r := public.record_cari_transaction_atomic('cari_SMOKE017', 'devir', 0, 'TEST hedef', p_target_balance => 3);
  ASSERT (r->>'unchanged')::boolean, 'aynı hedef yeni kayıt attı';
  ASSERT (SELECT count(*) FROM public.account_transactions WHERE account_id = 'cari_SMOKE017') = 2, 'fazla kayıt';

  -- 3) Fiş sırası 999'u aşınca kesilmez
  INSERT INTO public.account_transactions (account_id, type, amount, delta, slip_number, legacy_type)
  VALUES ('cari_SMOKE017', 'devir', 0, 0, 'FİŞ-' || v_yymm || '-999', 'smoke');
  r := public.record_cari_transaction_atomic('cari_SMOKE017', 'satis', 1);
  ASSERT r->>'slip_number' = 'FİŞ-' || v_yymm || '-1000', 'fiş numarası kesildi: ' || (r->>'slip_number');

  ASSERT NOT has_function_privilege('authenticated',
    'public.record_cari_transaction_atomic(text, text, numeric, text, text, date, jsonb, text, uuid, uuid, numeric)', 'EXECUTE'),
    'authenticated RPC çağırabiliyor';

  RAISE NOTICE '017 smoke OK';
END $$;

ROLLBACK;
