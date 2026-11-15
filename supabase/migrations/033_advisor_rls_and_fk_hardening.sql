-- ==============================================================================
-- 033_advisor_rls_and_fk_hardening.sql
-- ==============================================================================
-- NE ZAMAN: 032_zero_friction_dispatch_b2b_cockpit.sql uygulandiktan SONRA
--           calistirilir.
-- AMAC:
--   1) Supabase Performance Advisor'in bildirdigi 10 adet indekslenmemis
--      yabanci anahtara (unindexed_foreign_keys) covering index eklemek.
--   2) RLS politikalarindaki auth.uid() / is_admin() / is_ops_staff() cagrilarini
--      (SELECT ...) initPlan formuna almak (auth_rls_initplan temizligi).
--   3) Ayni rol + komut (ozellikle SELECT) uzerinde ust uste binen coklu
--      permissive politikalari (multiple_permissive_policies) tek bir temiz
--      politikada birlestirmek; TO public yerine acik TO anon / TO authenticated
--      kullanmak.
--   4) is_admin() ve is_ops_staff() fonksiyonlarindan anon erisimini kesmek
--      (anon hicbir politikada bu fonksiyonlari cagirmaz) ve search_path +
--      LANGUAGE sql STABLE SECURITY DEFINER ile korumak.
--   5) Finans/denetim tablolarinda (payments, current_accounts,
--      account_transactions, courier_settlements, audit_logs) staff rolunun
--      ASLA yetkili olmamasini korumak.
-- ==============================================================================

BEGIN;

-- 1) 10 Yabanci Anahtar (Foreign Key) Indeksi ----------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_courier_settlements_settled_by
  ON public.courier_settlements (settled_by);

CREATE INDEX IF NOT EXISTS idx_payments_cari_transaction_id
  ON public.payments (cari_transaction_id);

CREATE INDEX IF NOT EXISTS idx_production_batches_product_id
  ON public.production_batches (product_id);

CREATE INDEX IF NOT EXISTS idx_production_checks_checked_by
  ON public.production_checks (checked_by);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products (category);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id
  ON public.saved_addresses (user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_transactions_supplier_id
  ON public.supplier_transactions (supplier_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_accepted_profile_id
  ON public.team_invitations (accepted_profile_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_invited_by
  ON public.team_invitations (invited_by);

-- 2) Yardimci Fonksiyonlari InitPlan-Dostu ve Sabit search_path Ile Guncelle ----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = (SELECT auth.uid())
       AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ops_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = (SELECT auth.uid())
       AND role IN ('admin', 'superadmin', 'staff')
  );
$$;

-- 3) Operasyon Tablolari (Tek Yazar + Tekillestirilmis SELECT) -----------------

-- 3a) orders
DROP POLICY IF EXISTS "admin_select_orders" ON public.orders;
DROP POLICY IF EXISTS "ops_staff_select_orders" ON public.orders;
DROP POLICY IF EXISTS "courier_view_assigned" ON public.orders;
DROP POLICY IF EXISTS "customers_view_own_orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;

CREATE POLICY "orders_select_authenticated"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_ops_staff())
    OR user_id = (SELECT auth.uid())
    OR courier_id IN (
      SELECT c.id
        FROM public.couriers c
       WHERE c.profile_id = (SELECT auth.uid())
    )
  );

-- 3b) order_items
DROP POLICY IF EXISTS "admin_select_order_items" ON public.order_items;
DROP POLICY IF EXISTS "ops_staff_select_order_items" ON public.order_items;
DROP POLICY IF EXISTS "customers_view_own_items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;

CREATE POLICY "order_items_select_authenticated"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_ops_staff())
    OR EXISTS (
      SELECT 1
        FROM public.orders o
       WHERE o.id = order_items.order_id
         AND o.user_id = (SELECT auth.uid())
    )
  );

-- 3c) order_status_history
DROP POLICY IF EXISTS "admin_select_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "ops_staff_select_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "courier_view_assigned_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "customers_view_own_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_select_authenticated" ON public.order_status_history;

CREATE POLICY "order_status_history_select_authenticated"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_ops_staff())
    OR order_id IN (
      SELECT o.id
        FROM public.orders o
       WHERE o.user_id = (SELECT auth.uid())
    )
    OR order_id IN (
      SELECT o.id
        FROM public.orders o
        JOIN public.couriers c ON o.courier_id = c.id
       WHERE c.profile_id = (SELECT auth.uid())
    )
  );

-- 3d) couriers
DROP POLICY IF EXISTS "admin_select_couriers" ON public.couriers;
DROP POLICY IF EXISTS "ops_staff_select_couriers" ON public.couriers;
DROP POLICY IF EXISTS "courier_self_view" ON public.couriers;
DROP POLICY IF EXISTS "couriers_select_authenticated" ON public.couriers;

CREATE POLICY "couriers_select_authenticated"
  ON public.couriers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_ops_staff())
    OR profile_id = (SELECT auth.uid())
  );

-- 3e) production_checks
DROP POLICY IF EXISTS "admin_select_production_checks" ON public.production_checks;
DROP POLICY IF EXISTS "ops_staff_select_production_checks" ON public.production_checks;
DROP POLICY IF EXISTS "production_checks_select_authenticated" ON public.production_checks;

CREATE POLICY "production_checks_select_authenticated"
  ON public.production_checks
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_ops_staff()));

-- 4) Finans, Denetim ve Konum Tablolari (Sadece admin/superadmin, staff YOK) ---

-- 4a) payments
DROP POLICY IF EXISTS "admin_select_payments" ON public.payments;
DROP POLICY IF EXISTS "customers_view_own_payments" ON public.payments;
DROP POLICY IF EXISTS "payments_select_authenticated" ON public.payments;

CREATE POLICY "payments_select_authenticated"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_admin())
    OR order_id IN (
      SELECT o.id
        FROM public.orders o
       WHERE o.user_id = (SELECT auth.uid())
    )
  );

-- 4b) courier_settlements
DROP POLICY IF EXISTS "admin_or_courier_select_settlements" ON public.courier_settlements;
DROP POLICY IF EXISTS "courier_settlements_select_authenticated" ON public.courier_settlements;

CREATE POLICY "courier_settlements_select_authenticated"
  ON public.courier_settlements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_admin())
    OR courier_id IN (
      SELECT c.id
        FROM public.couriers c
       WHERE c.profile_id = (SELECT auth.uid())
    )
  );

-- 4c) customer_locations
DROP POLICY IF EXISTS "admin_select_customer_locations" ON public.customer_locations;
DROP POLICY IF EXISTS "customer_share_location" ON public.customer_locations;
DROP POLICY IF EXISTS "customer_locations_select_admin" ON public.customer_locations;
DROP POLICY IF EXISTS "customer_locations_insert_own" ON public.customer_locations;

CREATE POLICY "customer_locations_select_admin"
  ON public.customer_locations
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "customer_locations_insert_own"
  ON public.customer_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id
        FROM public.orders o
       WHERE o.user_id = (SELECT auth.uid())
    )
  );

-- 4d) audit_logs
DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 4e) team_invitations
DROP POLICY IF EXISTS "admin_select_team_invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_select_admin" ON public.team_invitations;

CREATE POLICY "team_invitations_select_admin"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 5) Admin-Only Yonetim Tablolari (TO public kaldirilir -> TO authenticated) ----

-- 5a) account_transactions (cift politika tekillestirilir)
DROP POLICY IF EXISTS "Admin manage account transactions" ON public.account_transactions;
DROP POLICY IF EXISTS "admin_manage_account_transactions" ON public.account_transactions;
DROP POLICY IF EXISTS "account_transactions_admin_all" ON public.account_transactions;

CREATE POLICY "account_transactions_admin_all"
  ON public.account_transactions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5b) current_accounts
DROP POLICY IF EXISTS "Admin manage current accounts" ON public.current_accounts;
DROP POLICY IF EXISTS "current_accounts_admin_all" ON public.current_accounts;

CREATE POLICY "current_accounts_admin_all"
  ON public.current_accounts
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5c) bakery_settings
DROP POLICY IF EXISTS "Admin manage bakery settings" ON public.bakery_settings;
DROP POLICY IF EXISTS "bakery_settings_admin_all" ON public.bakery_settings;

CREATE POLICY "bakery_settings_admin_all"
  ON public.bakery_settings
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5d) capacity_days
DROP POLICY IF EXISTS "Admin manage capacity days" ON public.capacity_days;
DROP POLICY IF EXISTS "capacity_days_admin_all" ON public.capacity_days;

CREATE POLICY "capacity_days_admin_all"
  ON public.capacity_days
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5e) financial_records
DROP POLICY IF EXISTS "Admin manage financial records" ON public.financial_records;
DROP POLICY IF EXISTS "financial_records_admin_all" ON public.financial_records;

CREATE POLICY "financial_records_admin_all"
  ON public.financial_records
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5f) suppliers
DROP POLICY IF EXISTS "Admin manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;

CREATE POLICY "suppliers_admin_all"
  ON public.suppliers
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 5g) supplier_transactions
DROP POLICY IF EXISTS "Admin manage supplier transactions" ON public.supplier_transactions;
DROP POLICY IF EXISTS "supplier_transactions_admin_all" ON public.supplier_transactions;

CREATE POLICY "supplier_transactions_admin_all"
  ON public.supplier_transactions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 6) Herkese Acik Okuma + Admin Yazma Tablolari (FOR ALL yerine ayrik I/U/D) ----

-- 6a) categories
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

CREATE POLICY "categories_public_select"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "categories_admin_insert"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "categories_admin_update"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "categories_admin_delete"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 6b) products
DROP POLICY IF EXISTS "Admin manage products" ON public.products;
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "products_public_select" ON public.products;
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

CREATE POLICY "products_public_select"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "products_admin_insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "products_admin_update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "products_admin_delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 6c) product_sale_dates
DROP POLICY IF EXISTS "Admin manage product sale dates" ON public.product_sale_dates;
DROP POLICY IF EXISTS "Public read product sale dates" ON public.product_sale_dates;
DROP POLICY IF EXISTS "product_sale_dates_public_select" ON public.product_sale_dates;
DROP POLICY IF EXISTS "product_sale_dates_admin_insert" ON public.product_sale_dates;
DROP POLICY IF EXISTS "product_sale_dates_admin_update" ON public.product_sale_dates;
DROP POLICY IF EXISTS "product_sale_dates_admin_delete" ON public.product_sale_dates;

CREATE POLICY "product_sale_dates_public_select"
  ON public.product_sale_dates
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "product_sale_dates_admin_insert"
  ON public.product_sale_dates
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "product_sale_dates_admin_update"
  ON public.product_sale_dates
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "product_sale_dates_admin_delete"
  ON public.product_sale_dates
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 6d) production_batches
DROP POLICY IF EXISTS "Admin manage production batches" ON public.production_batches;
DROP POLICY IF EXISTS "Public read production batches, admin manage" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_public_select" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_admin_insert" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_admin_update" ON public.production_batches;
DROP POLICY IF EXISTS "production_batches_admin_delete" ON public.production_batches;

CREATE POLICY "production_batches_public_select"
  ON public.production_batches
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "production_batches_admin_insert"
  ON public.production_batches
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "production_batches_admin_update"
  ON public.production_batches
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "production_batches_admin_delete"
  ON public.production_batches
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 6e) journal_articles (anon asla is_admin() cagirmaz, authenticated tek SELECT)
DROP POLICY IF EXISTS "Admin manage journal articles" ON public.journal_articles;
DROP POLICY IF EXISTS "Public read journal articles" ON public.journal_articles;
DROP POLICY IF EXISTS "journal_articles_anon_select" ON public.journal_articles;
DROP POLICY IF EXISTS "journal_articles_auth_select" ON public.journal_articles;
DROP POLICY IF EXISTS "journal_articles_admin_insert" ON public.journal_articles;
DROP POLICY IF EXISTS "journal_articles_admin_update" ON public.journal_articles;
DROP POLICY IF EXISTS "journal_articles_admin_delete" ON public.journal_articles;

CREATE POLICY "journal_articles_anon_select"
  ON public.journal_articles
  FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "journal_articles_auth_select"
  ON public.journal_articles
  FOR SELECT
  TO authenticated
  USING (published = true OR (SELECT public.is_admin()));

CREATE POLICY "journal_articles_admin_insert"
  ON public.journal_articles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "journal_articles_admin_update"
  ON public.journal_articles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "journal_articles_admin_delete"
  ON public.journal_articles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- 7) Kullanici Profili, Kayitli Adresler ve app_migrations ----------------------

-- 7a) profiles (rol guncellemesi 013 ile sutun seviyesinde zaten kisitli)
DROP POLICY IF EXISTS "Users view their own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users update their own profile or admins update all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "profiles_update_authenticated"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

-- 7b) saved_addresses
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.saved_addresses;
DROP POLICY IF EXISTS "saved_addresses_own_all" ON public.saved_addresses;

CREATE POLICY "saved_addresses_own_all"
  ON public.saved_addresses
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 7c) app_migrations (rls_enabled_no_policy uyarisini kapat)
DROP POLICY IF EXISTS "Service role full access on app_migrations" ON public.app_migrations;
CREATE POLICY "Service role full access on app_migrations"
  ON public.app_migrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8) Fonksiyon Yetki Sıkılaştırması (anon artigi hicbir politika kalmadi) ----
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_ops_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_ops_staff() TO authenticated, service_role;

-- 9) app_migrations kaydi ------------------------------------------------------
INSERT INTO public.app_migrations (id)
VALUES ('033_advisor_rls_and_fk_hardening')
ON CONFLICT (id) DO NOTHING;

COMMIT;
