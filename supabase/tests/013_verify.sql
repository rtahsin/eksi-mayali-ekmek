-- ==============================================================================
-- 013_verify.sql — 013_security_hardening öncesi ve sonrası doğrulama (V1–V8)
-- ==============================================================================
-- Salt okunur. Supabase SQL Editor'de her sorguyu ayrı çalıştırıp çıktıyı yerel
-- oturuma yapıştırın. Editor çoklu sonuçta yalnız sonuncuyu gösterebilir; o yüzden
-- bloklar tek tek seçilip çalıştırılmalı.
-- ==============================================================================

BEGIN READ ONLY;

-- V1) Fonksiyon yetkileri: SECURITY DEFINER / hassas fonksiyonlarda anon_exec ve
--     auth_exec FALSE olmalı (istisnalar: is_admin → açık; generate_order_number →
--     sadece authenticated). proconfig içinde search_path görünmeli.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec,
       p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
ORDER BY p.prosecdef DESC, p.proname;

-- V2) Tüm RLS politikaları (orders/order_items/payments/bakery_settings özellikle)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- V3) RLS'i KAPALI tablolar — boş olmalı
SELECT c.relname AS table_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;

-- V4) profiles yetkileri (has_*_privilege; information_schema yetkisiz kullanıcıya gizler):
--     tbl_update/tbl_insert/role_col_update FALSE olmalı; authenticated için name_col_update TRUE.
SELECT r AS role,
       has_table_privilege(r, 'public.profiles', 'UPDATE') AS tbl_update,
       has_table_privilege(r, 'public.profiles', 'INSERT') AS tbl_insert,
       has_table_privilege(r, 'public.profiles', 'DELETE') AS tbl_delete,
       has_column_privilege(r, 'public.profiles', 'role', 'UPDATE') AS role_col_update,
       has_column_privilege(r, 'public.profiles', 'full_name', 'UPDATE') AS name_col_update
FROM unnest(ARRAY['anon', 'authenticated']) AS r;

-- V5) Kullanıcılar, rolleri ve giriş sağlayıcıları. Tahsin superadmin olmalı.
--     Değilse yayından ÖNCE (ayrı çalıştırın):
--     UPDATE public.profiles SET role = 'superadmin' WHERE lower(email) = 'tahsinreyhan@gmail.com';
--     `email` sağlayıcılı admin yoksa admin girişindeki şifre sekmesi gereksizdir (kaldırıldı).
SELECT u.email,
       p.role,
       u.raw_app_meta_data->'providers' AS providers,
       u.created_at,
       u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY (p.role IN ('admin', 'superadmin')) DESC NULLS LAST, u.created_at;

-- V6a) auth.users tetikleyicileri
SELECT tgname, tgfoid::regproc AS function_name, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- V6b) handle_new_user hâlâ e-postaya göre rol veriyor mu? (013 sonrası FALSE olmalı)
SELECT pg_get_functiondef('public.handle_new_user'::regproc) ~* '(tahsinreyhan|ekmeklab@|superadmin)' AS email_role_logic_present;

-- V6c) bakery_settings anahtarları (013 sonrası security_settings ve trusted_devices YOK)
SELECT key, updated_at FROM public.bakery_settings ORDER BY key;

-- V7) Kritik fonksiyonlar canlıda var mı? (4 Eki: record_cari_transaction_atomic YOK)
SELECT fn AS function_name, count(p.oid) AS overloads
FROM unnest(ARRAY['record_cari_transaction_atomic', 'adjust_cari_balance', 'generate_slip_number',
                  'create_order_atomic', 'generate_order_number', 'check_rate_limit', 'is_admin']) AS fn
LEFT JOIN pg_proc p ON p.proname = fn AND p.pronamespace = 'public'::regnamespace
GROUP BY fn
ORDER BY fn;

-- V8) is_admin() / auth.*() dışında fonksiyon çağıran politikalar (varsa 013'ü uyarla)
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND regexp_replace(coalesce(qual, '') || ' ' || coalesce(with_check, ''),
                     '(public\.)?is_admin\(\)|auth\.[a-z_]+\(\)', '', 'g') ~ '[a-z_]+\s*\(';

-- Sonrası: migration kaydı (013 öncesi tablo yoksa bu sorgu hata verir — normal)
SELECT * FROM public.app_migrations ORDER BY applied_at;

ROLLBACK;
