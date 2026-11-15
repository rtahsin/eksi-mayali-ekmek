-- ==============================================================================
-- 031_enterprise_admin_rbac_b2b.sql duman testi. Hiçbir şey kalıcı olmaz (ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_res JSONB;
  v_err TEXT;
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_cust_res JSONB;
BEGIN
  -- 1) Migration kaydı
  ASSERT EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '031_enterprise_admin_rbac_b2b'),
    '031_enterprise_admin_rbac_b2b app_migrations kaydı yok';

  -- 2) Yeni tablolar + RLS + tarayıcı yazma yasağı
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_logs'::regclass), 'audit_logs RLS kapalı';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.team_invitations'::regclass), 'team_invitations RLS kapalı';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.courier_settlements'::regclass), 'courier_settlements RLS kapalı';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.production_checks'::regclass), 'production_checks RLS kapalı';

  ASSERT NOT has_table_privilege('authenticated', 'public.audit_logs', 'INSERT'), 'authenticated audit_logs INSERT yapabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.team_invitations', 'INSERT'), 'authenticated team_invitations INSERT yapabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.courier_settlements', 'INSERT'), 'authenticated courier_settlements INSERT yapabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.production_checks', 'UPDATE'), 'authenticated production_checks UPDATE yapabiliyor';
  ASSERT NOT has_table_privilege('authenticated', 'public.couriers', 'UPDATE'), 'authenticated couriers UPDATE yapabiliyor';
  ASSERT NOT has_table_privilege('anon', 'public.audit_logs', 'SELECT'), 'anon audit_logs SELECT yapabiliyor';

  -- 3) RLS politika sertleştirme doğrulaması
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'admin_staff_select_payments'
  ), 'admin_staff_select_payments hâlâ mevcut';
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'customer_locations' AND policyname = 'staff_view_locations'
  ), 'staff_view_locations hâlâ mevcut';
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'couriers' AND policyname IN ('courier_update_location', 'admin_manage_couriers')
  ), 'couriers yazma politikaları hâlâ mevcut';

  -- 4) Fonksiyon yetkileri ve search_path
  ASSERT NOT has_function_privilege('authenticated',
    'public.record_b2b_hot_sale_atomic(text, jsonb, numeric, numeric, text, text, date, uuid, boolean)', 'EXECUTE'),
    'authenticated record_b2b_hot_sale_atomic çağırabiliyor';
  ASSERT NOT has_function_privilege('authenticated',
    'public.list_admin_customers_paginated(text, text, integer, integer)', 'EXECUTE'),
    'authenticated list_admin_customers_paginated çağırabiliyor';
  ASSERT has_function_privilege('service_role',
    'public.record_b2b_hot_sale_atomic(text, jsonb, numeric, numeric, text, text, date, uuid, boolean)', 'EXECUTE'),
    'service_role record_b2b_hot_sale_atomic çağıramıyor';
  ASSERT pg_get_functiondef('public.handle_new_user'::regproc) ~* 'team_invitations',
    'handle_new_user team_invitations içermiyor';

  -- 5) record_b2b_hot_sale_atomic: simetrik bakiye + limit kontrolü + atomik çift kayıt
  INSERT INTO public.current_accounts (id, name, balance, credit_limit, status, created_at, updated_at)
  VALUES ('cari_SMOKE031', 'TEST B2B 031', 0, 500, 'active', now(), now());

  -- 5a) 300 TL satış + 0 tahsilat => bakiye 300
  v_res := public.record_b2b_hot_sale_atomic(
    'cari_SMOKE031',
    '[{"name":"TEST Köy Ekmeği","quantity":3,"unitPrice":100}]'::jsonb,
    300,
    0,
    NULL,
    'TEST sıcak satış 1',
    v_day
  );
  ASSERT (v_res->>'balance_after')::numeric = 300, '5a bakiye 300 değil';
  ASSERT (v_res->'payment_transaction') = 'null'::jsonb, '5a payment_transaction null olmalıydı';

  -- 5b) +300 TL satış + 0 tahsilat (300 + 300 = 600 > 500 limit) => CREDIT_LIMIT_EXCEEDED
  BEGIN
    PERFORM public.record_b2b_hot_sale_atomic(
      'cari_SMOKE031',
      '[{"name":"TEST Köy Ekmeği","quantity":3,"unitPrice":100}]'::jsonb,
      300,
      0,
      NULL,
      'TEST limit aşımı',
      v_day,
      NULL,
      false
    );
    RAISE EXCEPTION 'Kredi limiti aşımı engellenmedi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%CREDIT_LIMIT_EXCEEDED%', 'Beklenen CREDIT_LIMIT_EXCEEDED hatası değil: ' || v_err;
  END;

  -- 5c) +300 TL satış + 150 TL tahsilat (300 + 300 - 150 = 450 <= 500) => tek işlemde satış + tahsilat
  v_res := public.record_b2b_hot_sale_atomic(
    'cari_SMOKE031',
    '[{"name":"TEST Siyez","quantity":3,"unitPrice":100}]'::jsonb,
    300,
    150,
    'nakit',
    'TEST karma teslimat',
    v_day
  );
  ASSERT (v_res->>'balance_after')::numeric = 450, '5c bakiye 450 değil';
  ASSERT v_res->'payment_transaction'->>'slip_number' LIKE 'FİŞ-%', '5c tahsilat fiş no yok';
  ASSERT (SELECT balance FROM public.current_accounts WHERE id = 'cari_SMOKE031')
       = (SELECT SUM(delta) FROM public.account_transactions WHERE account_id = 'cari_SMOKE031'),
    '5c simetrik bakiye ≠ SUM(delta)';

  -- 5d) Arşivli hesap => ARCHIVED_ACCOUNT
  UPDATE public.current_accounts SET archived_at = now() WHERE id = 'cari_SMOKE031';
  BEGIN
    PERFORM public.record_b2b_hot_sale_atomic('cari_SMOKE031', '[]'::jsonb, 100);
    RAISE EXCEPTION 'Arşivli hesaba satış engellenmedi';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%ARCHIVED_ACCOUNT%', 'Beklenen ARCHIVED_ACCOUNT hatası değil: ' || v_err;
  END;

  -- 6) list_admin_customers_paginated çağrı kontrolü
  INSERT INTO public.orders (
    id, order_number, customer_name, phone, delivery_method, delivery_address,
    delivery_date, status, payment_method, total_amount, created_at
  ) VALUES (
    'ORD-SMOKE031-1', 'SIP-TEST-031', 'TEST Müşteri 031', '05559990031', 'pickup', 'Fırın',
    v_day - 20, 'teslim_edildi', 'cash_on_delivery', 120, now() - interval '20 days'
  );

  v_cust_res := public.list_admin_customers_paginated('05559990031', 'inactive_14d', 10, 0);
  ASSERT (v_cust_res->>'total')::int >= 1, 'list_admin_customers_paginated inactive_14d sonucu boş';
  ASSERT jsonb_typeof(v_cust_res->'items') = 'array', 'items dizi değil';

  RAISE NOTICE '031 smoke OK';
END $$;

ROLLBACK;
