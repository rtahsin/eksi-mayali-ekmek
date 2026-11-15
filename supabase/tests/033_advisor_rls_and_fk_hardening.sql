-- ==============================================================================
-- 033_advisor_rls_and_fk_hardening.sql — Duman Testi (ROLLBACK)
-- ==============================================================================
-- Tek basina veya 033 uygulandiktan sonra calistirilabilir (degisiklik yapmaz).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_missing_idx text[];
  v_multi_cnt int;
  v_bad_finance int;
  v_cnt bigint;
BEGIN
  -- 1) app_migrations kaydi
  IF NOT EXISTS (
    SELECT 1 FROM public.app_migrations WHERE id = '033_advisor_rls_and_fk_hardening'
  ) THEN
    RAISE EXCEPTION 'app_migrations icinde 033_advisor_rls_and_fk_hardening bulunamadi';
  END IF;

  -- 2) is_admin() & is_ops_staff() anon izolasyonu
  IF has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon hala public.is_admin() calistirabiliyor';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated public.is_admin() calistiramiyor';
  END IF;

  IF has_function_privilege('anon', 'public.is_ops_staff()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon hala public.is_ops_staff() calistirabiliyor';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_ops_staff()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated public.is_ops_staff() calistiramiyor';
  END IF;

  -- 3) 10 FK indeksi kontrolu
  SELECT array_agg(expected_idx)
    INTO v_missing_idx
    FROM unnest(ARRAY[
      'idx_audit_logs_actor_id',
      'idx_courier_settlements_settled_by',
      'idx_payments_cari_transaction_id',
      'idx_production_batches_product_id',
      'idx_production_checks_checked_by',
      'idx_products_category',
      'idx_saved_addresses_user_id',
      'idx_supplier_transactions_supplier_id',
      'idx_team_invitations_accepted_profile_id',
      'idx_team_invitations_invited_by'
    ]) AS expected_idx
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = expected_idx
   );

  IF v_missing_idx IS NOT NULL AND array_length(v_missing_idx, 1) > 0 THEN
    RAISE EXCEPTION 'Eksik FK indeksleri: %', array_to_string(v_missing_idx, ', ');
  END IF;

  -- 4) Kritik tablolarda rol bazinda coklu permissive SELECT politikasi olmamali
  SELECT count(*)
    INTO v_multi_cnt
    FROM (
      SELECT tablename, role_name
        FROM pg_policies p,
             unnest(p.roles) AS role_name
       WHERE p.schemaname = 'public'
         AND p.permissive = 'PERMISSIVE'
         AND p.cmd IN ('SELECT', 'ALL')
         AND p.tablename IN (
           'orders',
           'order_items',
           'order_status_history',
           'couriers',
           'production_checks',
           'products',
           'categories',
           'journal_articles',
           'account_transactions'
         )
       GROUP BY tablename, role_name
      HAVING count(*) > 1
    ) dup;

  IF v_multi_cnt > 0 THEN
    RAISE EXCEPTION 'Coklu permissive SELECT politikasi tespit edildi (adet: %)', v_multi_cnt;
  END IF;

  -- 5) Finans ve denetim tablolarinda staff yetkisi ASLA olmamali
  SELECT count(*)
    INTO v_bad_finance
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN (
       'current_accounts',
       'account_transactions',
       'payments',
       'courier_settlements',
       'audit_logs'
     )
     AND (
       COALESCE(qual, '') ILIKE '%is_ops_staff%'
       OR COALESCE(with_check, '') ILIKE '%is_ops_staff%'
       OR COALESCE(qual, '') ILIKE '%staff%'
       OR COALESCE(with_check, '') ILIKE '%staff%'
     );

  IF v_bad_finance > 0 THEN
    RAISE EXCEPTION 'Finans veya denetim tablosunda staff referansi tespit edildi';
  END IF;

  -- 6) Anon vitrin sorgulari is_admin() yetki hatasi vermeden calismali
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_cnt FROM public.products;
  SELECT count(*) INTO v_cnt FROM public.categories;
  SELECT count(*) INTO v_cnt FROM public.production_batches;
  SELECT count(*) INTO v_cnt FROM public.product_sale_dates;
  SELECT count(*) INTO v_cnt FROM public.journal_articles WHERE published = true;
  RESET ROLE;

  RAISE NOTICE '033_advisor_rls_and_fk_hardening smoke test BASARILI';
END $$;

ROLLBACK;
