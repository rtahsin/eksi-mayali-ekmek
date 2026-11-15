-- ==============================================================================
-- 031_enterprise_admin_rbac_b2b.sql  (Faz 1 — Güvenlik, Granüler RBAC & B2B/Operasyon)
-- ==============================================================================
-- NE ZAMAN: Faz 1 uygulama kodu yayınlanmadan ÖNCE.
--   - Yeni tablolar, kolonlar ve RPC'ler eklemelidir.
--   - order_status_history / payments CHECK kısıtları ve mark_order_delivered
--     'staff' rolünü kabul edecek şekilde genişletilir (eski çağrılarla uyumludur).
--   - payments, customer_locations, couriers üzerindeki geniş tarayıcı erişimleri
--     sıkılaştırılır (admin/superadmin ve kurye kendi satırı).
-- NASIL: Supabase SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile
--   kuru deneme yapın, ardından COMMIT ile çalıştırın.
--   Sonrasında `supabase/tests/031_enterprise_admin_rbac_b2b.sql` testini çalıştırın.
-- ==============================================================================

BEGIN;

-- 1) RLS SERTLEŞTİRME ----------------------------------------------------------

-- 1a) public.payments: courier/staff genel okuma politikasını kaldır, yalnız admin/superadmin
DROP POLICY IF EXISTS "admin_staff_select_payments" ON public.payments;
DROP POLICY IF EXISTS "courier_view_assigned_payments" ON public.payments;
DROP POLICY IF EXISTS "admin_select_payments" ON public.payments;
CREATE POLICY "admin_select_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 1b) public.customer_locations: geniş personel/kurye okumasını kaldır, yalnız admin/superadmin
DROP POLICY IF EXISTS "staff_view_locations" ON public.customer_locations;
DROP POLICY IF EXISTS "admin_select_customer_locations" ON public.customer_locations;
CREATE POLICY "admin_select_customer_locations" ON public.customer_locations
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 1c) public.couriers: tek-yazar modeli (tarayıcıdan yazma yok, yalnız kendi satırı veya admin okur)
REVOKE INSERT, UPDATE, DELETE ON public.couriers FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "courier_update_location" ON public.couriers;
DROP POLICY IF EXISTS "admin_manage_couriers" ON public.couriers;
DROP POLICY IF EXISTS "courier_self_view" ON public.couriers;
DROP POLICY IF EXISTS "admin_select_couriers" ON public.couriers;
CREATE POLICY "courier_self_view" ON public.couriers
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "admin_select_couriers" ON public.couriers
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 1d) 'staff' aktör rolü için CHECK kısıtları ve mark_order_delivered uyumu
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.order_status_history'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%changed_by_role%'
  LOOP
    EXECUTE format('ALTER TABLE public.order_status_history DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_role_check
    CHECK (changed_by_role IN ('system', 'admin', 'staff', 'courier', 'customer'));
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%collected_by%'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_collected_by_check
    CHECK (collected_by IN ('courier', 'staff', 'admin', 'system'));
END $$;

-- 2) YENİ TABLOLAR (RLS açık, tarayıcı yazımı kapalı) --------------------------

-- 2a) audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;
CREATE POLICY "admin_select_audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2b) team_invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.user_role_type NOT NULL CHECK (role IN ('courier', 'staff', 'admin')),
  display_name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'motorcycle',
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_email_lower_uq
  ON public.team_invitations (lower(email));

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

DROP POLICY IF EXISTS "admin_select_team_invitations" ON public.team_invitations;
CREATE POLICY "admin_select_team_invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2c) courier_settlements
CREATE TABLE IF NOT EXISTS public.courier_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE RESTRICT,
  settlement_date DATE NOT NULL,
  cash_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  cari_delivered_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  cash_handed_over NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_slip_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  settled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (courier_id, settlement_date)
);

ALTER TABLE public.courier_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.courier_settlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.courier_settlements TO authenticated;
GRANT ALL ON public.courier_settlements TO service_role;

DROP POLICY IF EXISTS "admin_or_courier_select_settlements" ON public.courier_settlements;
CREATE POLICY "admin_or_courier_select_settlements" ON public.courier_settlements
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR courier_id IN (
      SELECT id FROM public.couriers WHERE profile_id = auth.uid()
    )
  );

-- 2d) production_checks
CREATE TABLE IF NOT EXISTS public.production_checks (
  delivery_date DATE NOT NULL,
  check_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT true,
  checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (delivery_date, check_key)
);

ALTER TABLE public.production_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.production_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.production_checks TO authenticated;
GRANT ALL ON public.production_checks TO service_role;

DROP POLICY IF EXISTS "admin_select_production_checks" ON public.production_checks;
CREATE POLICY "admin_select_production_checks" ON public.production_checks
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 3) MEVCUT TABLO GENİŞLETMELERİ -----------------------------------------------

ALTER TABLE public.current_accounts
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT 'Beylikdüzü',
  ADD COLUMN IF NOT EXISTS company_title TEXT,
  ADD COLUMN IF NOT EXISTS share_token_version INT NOT NULL DEFAULT 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stop_sequence INT;

-- 4) FONKSİYONLAR VE ATOMİK RPC'LER -------------------------------------------

-- 4a) handle_new_user: 013 davranışını korur + aktif ekip davetine göre rol atar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv RECORD;
  v_vehicle TEXT;
  v_display TEXT;
BEGIN
  IF NEW.email IS NOT NULL THEN
    SELECT id, role, display_name, phone, vehicle_type
      INTO v_inv
      FROM public.team_invitations
     WHERE lower(email) = lower(NEW.email)
       AND is_active = true
       AND accepted_at IS NULL
     FOR UPDATE;
  END IF;

  INSERT INTO public.profiles AS p (id, email, full_name, phone, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULLIF(TRIM(v_inv.display_name), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'phone', v_inv.phone),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(v_inv.role, 'customer'::public.user_role_type)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(p.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, p.avatar_url),
    role = CASE
      WHEN v_inv.id IS NOT NULL AND p.role = 'customer'::public.user_role_type THEN v_inv.role
      ELSE p.role
    END,
    updated_at = now();

  IF v_inv.id IS NOT NULL THEN
    IF v_inv.role = 'courier'::public.user_role_type THEN
      v_vehicle := CASE
        WHEN v_inv.vehicle_type IN ('motorcycle', 'car', 'bicycle', 'on_foot') THEN v_inv.vehicle_type
        ELSE 'motorcycle'
      END;
      v_display := COALESCE(
        NULLIF(TRIM(v_inv.display_name), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
        'Kurye'
      );

      IF NOT EXISTS (SELECT 1 FROM public.couriers WHERE profile_id = NEW.id) THEN
        INSERT INTO public.couriers (profile_id, display_name, phone, vehicle_type, is_active, is_on_shift)
        VALUES (NEW.id, v_display, COALESCE(NULLIF(TRIM(v_inv.phone), ''), ''), v_vehicle, true, false);
      END IF;
    END IF;

    UPDATE public.team_invitations
       SET accepted_at = now(),
           accepted_profile_id = NEW.id,
           updated_at = now()
     WHERE id = v_inv.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user(%): %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 4b) mark_order_delivered: 029 davranışını korur + 'staff' aktör rolünü kabul eder
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
  IF p_actor_role NOT IN ('courier', 'staff', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE: %', p_actor_role;
  END IF;

  SELECT id, order_number, status::text AS status, cari_id, total_amount, delivery_date
    INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;
  IF v_order.status = 'teslim_edildi' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;
  IF v_order.status = 'iptal' THEN
    RAISE EXCEPTION 'ORDER_CANCELLED: %', p_order_id;
  END IF;

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

-- 4c) record_b2b_hot_sale_atomic: tek transaction içinde B2B teslimat fişi + varsa tahsilat makbuzu
CREATE OR REPLACE FUNCTION public.record_b2b_hot_sale_atomic(
  p_account_id TEXT,
  p_items JSONB,
  p_amount NUMERIC,
  p_collected_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_allow_over_limit BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance NUMERIC;
  v_archived TIMESTAMPTZ;
  v_credit_limit NUMERIC;
  v_amount NUMERIC := round(p_amount, 2);
  v_collected NUMERIC := round(COALESCE(p_collected_amount, 0), 2);
  v_sale_tx JSONB;
  v_pay_tx JSONB := NULL;
  v_balance_after NUMERIC;
  v_pay_desc TEXT;
BEGIN
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF v_collected < 0 THEN
    RAISE EXCEPTION 'INVALID_COLLECTED_AMOUNT';
  END IF;

  SELECT balance, archived_at, credit_limit
    INTO v_balance, v_archived, v_credit_limit
    FROM public.current_accounts
   WHERE id = p_account_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CARI_NOT_FOUND: %', p_account_id;
  END IF;
  IF v_archived IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_ACCOUNT';
  END IF;

  v_balance := COALESCE(v_balance, 0);
  v_credit_limit := COALESCE(v_credit_limit, 0);

  IF v_credit_limit > 0
     AND NOT COALESCE(p_allow_over_limit, FALSE)
     AND (v_balance + v_amount - v_collected) > v_credit_limit THEN
    RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED';
  END IF;

  v_sale_tx := public.record_cari_transaction_atomic(
    p_account_id => p_account_id,
    p_type => 'satis',
    p_amount => v_amount,
    p_description => p_description,
    p_payment_method => NULL,
    p_date => p_date,
    p_items => p_items,
    p_order_id => NULL,
    p_reverses_id => NULL,
    p_created_by => p_created_by
  );
  v_balance_after := (v_sale_tx->>'balance_after')::numeric;

  IF v_collected > 0 THEN
    v_pay_desc := CASE
      WHEN NULLIF(TRIM(COALESCE(p_description, '')), '') IS NOT NULL
        THEN 'Sıcak satış tahsilatı · ' || TRIM(p_description)
      ELSE 'Sıcak satış tahsilatı'
    END;

    v_pay_tx := public.record_cari_transaction_atomic(
      p_account_id => p_account_id,
      p_type => 'tahsilat',
      p_amount => v_collected,
      p_description => v_pay_desc,
      p_payment_method => COALESCE(NULLIF(TRIM(COALESCE(p_payment_method, '')), ''), 'nakit'),
      p_date => p_date,
      p_items => NULL,
      p_order_id => NULL,
      p_reverses_id => NULL,
      p_created_by => p_created_by
    );
    v_balance_after := (v_pay_tx->>'balance_after')::numeric;
  END IF;

  RETURN jsonb_build_object(
    'sale_transaction', v_sale_tx,
    'payment_transaction', v_pay_tx,
    'balance_after', v_balance_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_b2b_hot_sale_atomic(TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, DATE, UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_b2b_hot_sale_atomic(TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, DATE, UUID, BOOLEAN)
  TO service_role;

-- 4d) list_admin_customers_paginated: sunucu tarafı müşteri gruplama, arama, segmentasyon ve sayfalama
CREATE OR REPLACE FUNCTION public.list_admin_customers_paginated(
  p_search TEXT DEFAULT '',
  p_segment TEXT DEFAULT 'all',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_search TEXT := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_segment TEXT := COALESCE(NULLIF(TRIM(COALESCE(p_segment, '')), ''), 'all');
  v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset INT := GREATEST(COALESCE(p_offset, 0), 0);
  v_today DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_total INT := 0;
  v_items JSONB := '[]'::jsonb;
BEGIN
  WITH raw_orders AS (
    SELECT
      o.id,
      o.user_id,
      o.customer_name,
      o.phone,
      CASE
        WHEN regexp_replace(COALESCE(o.phone, ''), '\D', '', 'g') ~ '^(0090|90)?0?5\d{9}$'
          THEN '0' || right(regexp_replace(COALESCE(o.phone, ''), '\D', '', 'g'), 10)
        ELSE NULLIF(regexp_replace(COALESCE(o.phone, ''), '\D', '', 'g'), '')
      END AS norm_phone,
      o.delivery_method::text AS delivery_method,
      o.neighborhood,
      o.delivery_address,
      COALESCE(o.total_amount, 0)::numeric AS total_amount,
      o.delivery_date,
      o.created_at
    FROM public.orders o
    WHERE o.status <> 'iptal'
  ),
  keyed_orders AS (
    SELECT
      *,
      COALESCE(user_id::text, norm_phone, id) AS customer_key
    FROM raw_orders
  ),
  order_groups AS (
    SELECT
      ko.customer_key,
      (array_agg(ko.user_id ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE ko.user_id IS NOT NULL))[1] AS user_id,
      (array_agg(ko.norm_phone ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE ko.norm_phone IS NOT NULL))[1] AS norm_phone,
      (array_agg(ko.phone ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE NULLIF(TRIM(COALESCE(ko.phone, '')), '') IS NOT NULL))[1] AS phone,
      (array_agg(ko.customer_name ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE NULLIF(TRIM(COALESCE(ko.customer_name, '')), '') IS NOT NULL))[1] AS customer_name,
      (array_agg(ko.neighborhood ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE ko.delivery_method <> 'pickup' AND NULLIF(TRIM(COALESCE(ko.neighborhood, '')), '') IS NOT NULL))[1] AS neighborhood,
      (array_agg(ko.delivery_address ORDER BY ko.created_at DESC NULLS LAST) FILTER (WHERE ko.delivery_method <> 'pickup' AND NULLIF(TRIM(COALESCE(ko.delivery_address, '')), '') IS NOT NULL))[1] AS address,
      COUNT(*)::int AS order_count,
      COALESCE(SUM(ko.total_amount), 0)::numeric AS total_spent,
      MAX(ko.delivery_date) AS last_order_date,
      MAX(ko.created_at) AS last_order_at
    FROM keyed_orders ko
    GROUP BY ko.customer_key
  ),
  enriched_orders AS (
    SELECT
      og.customer_key,
      COALESCE(og.user_id, p_by_id.id, p_by_phone.id) AS user_id,
      COALESCE(NULLIF(TRIM(og.customer_name), ''), p_by_id.full_name, p_by_phone.full_name, 'İsimsiz') AS name,
      COALESCE(NULLIF(TRIM(og.phone), ''), p_by_id.phone, p_by_phone.phone, '') AS phone,
      COALESCE(p_by_id.email, p_by_phone.email) AS email,
      COALESCE(og.neighborhood, '') AS neighborhood,
      COALESCE(og.address, '') AS address,
      (COALESCE(og.user_id, p_by_id.id, p_by_phone.id) IS NOT NULL) AS has_account,
      og.order_count,
      og.total_spent,
      og.last_order_date,
      og.last_order_at
    FROM order_groups og
    LEFT JOIN public.profiles p_by_id ON p_by_id.id = og.user_id
    LEFT JOIN LATERAL (
      SELECT p.id, p.full_name, p.phone, p.email
        FROM public.profiles p
       WHERE og.user_id IS NULL
         AND og.norm_phone IS NOT NULL
         AND (
           CASE
             WHEN regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') ~ '^(0090|90)?0?5\d{9}$'
               THEN '0' || right(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), 10)
             ELSE NULLIF(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), '')
           END
         ) = og.norm_phone
       ORDER BY p.created_at DESC
       LIMIT 1
    ) p_by_phone ON true
  ),
  profile_only AS (
    SELECT
      p.id::text AS customer_key,
      p.id AS user_id,
      COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(split_part(COALESCE(p.email, ''), '@', 1), ''), 'Kayıtlı Müşteri') AS name,
      COALESCE(p.phone, '') AS phone,
      p.email,
      ''::text AS neighborhood,
      ''::text AS address,
      true AS has_account,
      0::int AS order_count,
      0::numeric AS total_spent,
      NULL::date AS last_order_date,
      NULL::timestamptz AS last_order_at
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM enriched_orders eo WHERE eo.user_id = p.id
    )
  ),
  combined AS (
    SELECT * FROM enriched_orders
    UNION ALL
    SELECT * FROM profile_only
  ),
  segmented AS (
    SELECT
      c.*,
      CASE
        WHEN c.order_count >= 3 THEN 'vip'
        WHEN c.order_count = 1 THEN 'new'
        WHEN c.order_count > 0 AND c.last_order_date IS NOT NULL AND c.last_order_date < (v_today - 14) THEN 'inactive_14d'
        WHEN c.order_count = 0 THEN 'lead'
        ELSE 'regular'
      END AS segment_label
    FROM combined c
  ),
  filtered AS (
    SELECT *
      FROM segmented s
     WHERE (
       v_search IS NULL
       OR s.name ILIKE '%' || v_search || '%'
       OR s.phone ILIKE '%' || v_search || '%'
       OR COALESCE(s.email, '') ILIKE '%' || v_search || '%'
       OR COALESCE(s.neighborhood, '') ILIKE '%' || v_search || '%'
     )
       AND (
         v_segment = 'all'
         OR (v_segment = 'vip' AND s.order_count >= 3)
         OR (v_segment = 'new' AND s.order_count = 1)
         OR (v_segment = 'inactive_14d' AND s.order_count > 0 AND s.last_order_date IS NOT NULL AND s.last_order_date < (v_today - 14))
       )
  ),
  counted AS (
    SELECT COUNT(*)::int AS cnt FROM filtered
  ),
  paged AS (
    SELECT *
      FROM filtered
     ORDER BY last_order_date DESC NULLS LAST, order_count DESC, total_spent DESC, name ASC
     LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT cnt FROM counted),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'customer_key', p.customer_key,
        'user_id', p.user_id,
        'name', p.name,
        'phone', p.phone,
        'email', p.email,
        'neighborhood', p.neighborhood,
        'address', p.address,
        'has_account', p.has_account,
        'order_count', p.order_count,
        'total_spent', p.total_spent,
        'last_order_date', p.last_order_date,
        'last_order_at', p.last_order_at,
        'segment', p.segment_label
      )) FROM paged p),
      '[]'::jsonb
    )
  INTO v_total, v_items;

  RETURN jsonb_build_object('total', v_total, 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.list_admin_customers_paginated(TEXT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_customers_paginated(TEXT, TEXT, INT, INT)
  TO service_role;

INSERT INTO public.app_migrations (id) VALUES ('031_enterprise_admin_rbac_b2b') ON CONFLICT DO NOTHING;

COMMIT;
