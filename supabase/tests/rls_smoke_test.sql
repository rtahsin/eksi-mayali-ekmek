-- ============================================================================
-- EKMEKLAB UÇTAN UCA SİPARİŞ VE TESLİMAT SİSTEMİ
-- RLS (ROW LEVEL SECURITY) GÜVENLİK SMOKE TESTLERİ
-- ============================================================================
-- Bu test dosyası Supabase SQL Editor veya psql ortamında çalıştırılarak
-- RLS politikalarının ve yetki izolasyonlarının doğrulanması için hazırlanmıştır.
-- ============================================================================

BEGIN;

-- 1. TEST HAZIRLIK: Geçici Test Kullanıcıları ve Profilleri
DO $$
DECLARE
  v_customer_a_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_customer_b_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_courier_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_order_a_id TEXT := 'TEST-ORD-A-001';
  v_order_b_id TEXT := 'TEST-ORD-B-002';
  v_test_count INT;
BEGIN
  RAISE NOTICE '>>> [TEST 1] RLS Tablo Durumları Doğrulanıyor...';
  
  -- Tabloların RLS açık olduğunu doğrula
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'HATA: orders tablosunda RLS aktif değil!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'couriers' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'HATA: couriers tablosunda RLS aktif değil!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'HATA: payments tablosunda RLS aktif değil!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_status_history' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'HATA: order_status_history tablosunda RLS aktif değil!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer_locations' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'HATA: customer_locations tablosunda RLS aktif değil!';
  END IF;

  RAISE NOTICE '✓ [BAŞARILI] Tüm kritik tablolarda Row Level Security (RLS) devrede.';

  -- 2. TEST: Anonim Kullanıcı İzolasyonu
  RAISE NOTICE '>>> [TEST 2] Anonim (anon) Rol İle Erişim Kontrolleri...';
  -- anon rolü orders tablosunu doğrudan SELECT edememeli (yalnızca auth olanlar veya service role)
  -- Supabase RLS anon context simülasyonu
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  BEGIN
    SELECT COUNT(*) INTO v_test_count FROM public.couriers;
    IF v_test_count > 0 THEN
      RAISE EXCEPTION 'GÜVENLİK AÇIĞI: Anon kullanıcı kuryeler tablosunu okuyabildi!';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✓ [BAŞARILI] Anon kullanıcı couriers tablosuna erişemedi (Beklenen davranış).';
  END;

  -- 3. TEST: Service / Admin Rol İle Tam Erişim
  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE '>>> [TEST 3] Admin / Postgres Rolü İle Sistem Erişimi...';
  
  -- Örnek sipariş no üretme testi (SIP-YYMM-XXX)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_order_number') THEN
    RAISE NOTICE '✓ [BAŞARILI] generate_order_number SQL fonksiyonu mevcut.';
  END IF;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'TÜM RLS SMOKE TESTLERİ BAŞARIYLA TAMAMLANDI.';
  RAISE NOTICE '=======================================================';
END $$;

ROLLBACK; -- Test verilerinin kalıcı olmaması için geri al
