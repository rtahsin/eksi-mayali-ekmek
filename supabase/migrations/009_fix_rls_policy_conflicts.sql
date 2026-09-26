-- ==============================================================================
-- EKMEKLAB: RLS POLİTİKA ÇAKIŞMA DÜZELTMESİ (GÖREV 9)
-- schema.sql'deki aşırı gevşek politikaları kaldırır, 007 migration'ındaki
-- sıkı kuralların geçerli olmasını sağlar.
-- ==============================================================================

-- 1. orders tablosundaki gevşek INSERT politikasını kaldır
-- schema.sql: WITH CHECK (true) — herkes herhangi user_id ile sipariş oluşturabiliyordu
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- 2. orders tablosundaki gevşek SELECT politikasını kaldır (007 ile çakışıyor)
DROP POLICY IF EXISTS "Users read their own orders or admins read all" ON public.orders;

-- 3. orders tablosundaki gevşek UPDATE politikasını kaldır (007 ile çakışıyor)
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;

-- 4. order_items tablosundaki gevşek INSERT politikasını kaldır
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

-- 5. order_items tablosundaki gevşek SELECT politikasını kaldır (007 ile çakışıyor)
DROP POLICY IF EXISTS "Users read their own order items or admins read all" ON public.order_items;

-- 6. order_items için güvenli INSERT politikası oluştur
-- Sadece kendi siparişi için ve sipariş 'bekliyor' durumundaysa kalem eklenebilir
DROP POLICY IF EXISTS "customers_insert_own_items" ON public.order_items;
CREATE POLICY "customers_insert_own_items" ON public.order_items FOR INSERT
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders
    WHERE user_id = auth.uid() AND status = 'bekliyor'
  )
);

-- 7. Service role (API route'ları) için order_items INSERT desteği
-- createAdminClient service_role key kullandığında RLS bypass edilir,
-- bu yüzden admin politikası 007'de zaten mevcut (admin_full_items).

-- 8. Misafir siparişler (user_id NULL) için özel INSERT politikası
-- Web checkout'ta auth olmadan sipariş veriliyor — bu API route'u
-- createAdminClient (service role) kullandığı için RLS'i bypass eder.
-- Doğrudan Supabase client ile misafir sipariş vermek artık mümkün değil.
-- Bu kasıtlıdır: tüm siparişler /api/orders/create üzerinden geçmelidir.
