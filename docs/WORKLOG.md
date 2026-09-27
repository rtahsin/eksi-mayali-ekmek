# Worklog (Session Journal)

Bu dosya her çalışma oturumunda kısa ve net güncellenir.

Template:

## YYYY-MM-DD
- Scope:
- Yapılan:
- Doğrulama (analyze/test/build):
- Risk/Not:
- Sonraki adım:

---

## 2026-03-14
- Scope: Güvenlik iyileştirmeleri + genel proje/UX incelemesi + context sisteminin kurulumu
- Yapılan:
  - Functions bağımlılıkları güvenlik odaklı güncellendi.
  - Flutter analyze/test temiz doğrulandı.
  - Site kullanıcı gözüyle değerlendirildi (canlı endpoint + kod tabanlı UX inceleme).
  - Yaşayan context dokümantasyon seti oluşturuldu.
- Doğrulama (analyze/test/build):
  - `flutter test` başarılı.
  - Son analyze koşumlarında kritik hata yok.
- Risk/Not:
  - Sitemap endpoint’lerinde XML parse sorunu var.
  - Repo artifact takibi temizlenmeli.
- Sonraki adım:
  - P0-1 (sitemap fix) ve P0-2 (repo hijyeni) uygulaması.

## 2026-03-14 (Devam)
- Scope: P0/P1 kullanıcı deneyimi + SEO + CI hizalama tamamlama
- Yapılan:
  - `web/sitemap.xml` köke eklendi (rewrite fallback kaynaklı XML parse sorununu önlemek için).
  - `web/robots.txt` canonical sitemap referansına indirildi.
  - `lib/screens/home_screen.dart` içinde kategori filtresindeki “sonuç yoksa tüm ürünlere dön” fallback’i kaldırıldı.
  - `web/manifest.json` içinden admin shortcut kaldırıldı (admin için ayrı `admin_manifest.json` kalıyor).
  - `.github/workflows/ci.yml` Node sürümü 20’ye hizalandı.
  - `.gitignore` içine `**/node_modules/` eklendi.
- Doğrulama (analyze/test/build):
  - `flutter test` başarılı (`All tests passed`).
  - Değiştirilen dosyalarda problem kontrolü temiz.
- Risk/Not:
  - Sitemap düzeltmesinin canlı doğrulaması için deploy + Search Console kontrolü gerekli.
  - Daha önce track edilmiş artifactlerin index temizliği ayrı commit adımı gerektirir.
- Sonraki adım:
  - Deploy sonrası `/sitemap.xml` canlı validasyonunu tamamla.
  - Track edilen build/node_modules kalıntıları için repo index cleanup yap.

## 2026-03-14 (Finalizasyon)
- Scope: Sitemap/robots canlı doğrulama ve kapanış
- Yapılan:
  - Hosting deploy gerçekleştirildi (`firebase deploy --only hosting`).
  - `sitemap.xml` ve `robots.txt` canlıdan doğrulandı (cache-busting ile).
  - `firebase.json` içinde sitemap cache politikası `no-cache, must-revalidate` olarak güncellendi ve tekrar deploy edildi.
- Doğrulama (analyze/test/build):
  - Live fetch: `https://ekmeklab.com/sitemap.xml?v=...` valid XML.
  - Live header check: `Content-Type: application/xml`, `Cache-Control: must-revalidate, no-cache`.
- Risk/Not:
  - Search Console tarafında yeniden gönderim/refresh ile indeksleme takibi yapılmalı.
- Sonraki adım:
  - P0-2 (repo index cleanup) için track edilmiş artifact temizleme commit'i.

## 2026-03-14 (Repo Hijyeni)
- Scope: P0-2 artifact tracking temizliği
- Yapılan:
  - `git rm -r --cached -- local_llm_bridge/node_modules` ile dependency artifactleri index’ten çıkarıldı.
  - `.gitignore` içine `.firebase/` eklendi.
  - `git rm --cached -- .firebase/hosting.YnVpbGRcd2Vi.cache` ile local cache artifacti untrack edildi.
- Doğrulama (analyze/test/build):
  - `git ls-files .firebase local_llm_bridge/node_modules` sonucu: `0`.
- Risk/Not:
  - Bu temizlik değişikliklerinin kalıcı olması için commit/push adımı gerekli.
- Sonraki adım:
  - Cleanup değişikliklerini tek bir `chore` commit’inde birleştir.

---

## 2026-09-24 (Güvenlik, Finans & Mimari Denetim)
- Scope: EkmekLab Uçtan Uca Sipariş/Kurye/Finans Sistemi Bağımsız Güvenlik ve Mantık Denetimi (18 Bulgu)
- Yapılan:
  - RLS Çakışması Giderildi: `schema.sql` dosyasında kalan `WITH CHECK (true)` kurallarını kaldıran ve kalem eklemeyi sipariş sahibine kısıtlayan `supabase/migrations/009_fix_rls_policy_conflicts.sql` yazıldı.
  - API Yetkilendirme & RBAC: `src/lib/security/apiAuth.ts` oluşturuldu; `/api/orders/[id]/status`, `/api/orders/[id]/assign-courier`, `/api/orders/[id]/cancel` rotaları yetkilendirildi.
  - Atomik Cari Finans Motoru: Tüm cari modalleri (`CariCollectionModal`, `CariBalanceAdjustModal`, `QuickSlipModal`, `useCariler`) çift adımlı işlemden tek transaction `record_cari_transaction_atomic` RPC fonksiyonuna taşındı.
  - Takip Güvenliği & Rate Limiting: `/api/orders/[id]` endpoint'ine IP rate limiting (30/dk), telefon deneme limiti (5/5dk), halka açık sorgularda finansal veri gizleme (katı maskeleme) eklendi; `/siparis-takip/[id]` sayfasına misafir RLS fallback'i entegre edildi.
  - Kurye GPS Yayını & Bellek Sızıntısı: `courier-live-location` genel yayını `courier-location-${courierId}` izole kanalına dönüştürüldü; `locationChannelRef` ile unmount/stop anında kanal kapatılması garantiye alındı.
  - İyimser Kilitleme (Optimistic Locking): Durum güncellemelerine `.eq("status", currentStatus)` eklendi; çakışmada 409 Conflict koruması sağlandı.
  - ID ve Numara Standardizasyonu: `crypto.randomUUID()` ve veritabanı `generate_order_number()` RPC entegre edildi.
  - Master Dokümantasyon: `docs/SIPARIS_VE_KURYE_SISTEMI_MASTER.md` dosyasına 12. bölüm olarak tüm mimari kararlar ve bulgular işlendi.
- Doğrulama (analyze/test/build):
  - `npm run build` başarıyla tamamlandı (Exit code 0, 43 App Router rotası 0 hata ile derlendi).
- Risk/Not:
  - Supabase Dashboard üzerinde `supabase/migrations/009_fix_rls_policy_conflicts.sql` SQL dosyasının manuel çalıştırılması gerekmektedir.
- Sonraki adım:
  - Kullanıcı onayına müteakip canlıya alma / production deploy hazırlıkları.

---

## 2026-09-26 (Audit Implementation: P0 & P1 Temel İyileştirmeleri)
- Scope: Onaylanan Audit Raporundaki P0 Güvenlik Açıkları, Veri Bütünlüğü ve P1 Mimari/SEO Dönüşümü (Task 1 - Task 10)
- Yapılan:
  - **P0-1 (Admin Client Anon Key Kaldırma)**: `src/lib/supabase/admin.ts` içindeki `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback zinciri kaldırıldı. Servis rolü anahtarı bulunmadığında API rotalarının sessizce yetkisiz çalışması önlendi.
  - **P0-4 (Middleware Yetki Yükseltme Koruması)**: `src/middleware.ts` güncellendi; oturum açmış herhangi bir kullanıcının admin sayılması engellendi, `profiles.role` ('admin', 'superadmin') kontrolü zorunlu kılındı. `/admin`, `/kurye` ve `/hesabim` rotalarına sunucu seviyesinde oturum yönlendirmesi eklendi.
  - **P0-5 & P1-6 (Hardcoded Ürün & Fiyat Fallback Kaldırma + Stok Doğrulama)**: `src/app/api/orders/create/route.ts` içindeki `INITIAL_PRODUCTS` ve 135 TL fallback'leri tamamen temizlendi. Ürünlerin doğrudan veritabanından doğrulanması sağlandı. `is_available === false` durumunda 400 hatası dönen stok kontrolü eklendi.
  - **P0-2, P0-3 & Task 10 (PostgreSQL Atomik Sipariş Motoru & Şema)**: `supabase/migrations/010_atomic_order_and_schema_improvements.sql` oluşturuldu. Tek transaction'da sipariş, kalemler, geçmiş ve ödemeleri kaydeden `create_order_atomic` RPC'si ve advisory transaction lock kullanan çakışmasız `generate_order_number()` fonksiyonu yazıldı. `orders.order_number` benzersizlik kısıtı ve performans indeksleri eklendi. Sipariş API'si veritabanı hatalarında sessizce başarı dönmek yerine katı 500 hatası dönecek şekilde refactor edildi.
  - **P1-5 (Homepage SSR & ISR Geçişi)**: `src/app/page.tsx` `"use client"` direktifinden arındırılarak React Server Component (RSC) yapısına dönüştürüldü. SEO meta etiketleri ve 60 saniyelik Incremental Static Regeneration (`revalidate = 60`) eklendi. `src/lib/utils/productCategory.ts` ile kategori normalizasyonu sunucu/istemci ortak modüle taşındı; `ProductCatalog` ve `useProducts` sunucudan gelen ürünlerle hydration sağlayacak şekilde güncellendi.
  - **P1-4 (Admin Siparişleri Sayfalama & Sorgu Limiti)**: `src/hooks/useAdminOrders.ts` unconstrained sorgulara karşı 300 kayıtlık güvenli limit ve sayfalama altyapısına kavuşturuldu; `src/app/admin/siparisler/page.tsx` sayfasına 24'lük sayfa blokları ve sayfa navigasyon kontrolleri eklendi.
  - **P1-2 (Kurye Sayfası Dekompozisyonu)**: 1165 satırlık monolit `src/app/kurye/page.tsx` dosyası 5 odaklı, modüler bileşene (`CourierHeader`, `CourierShiftRibbon`, `CourierActiveStopCard`, `CourierQueueList`, `CourierPaymentModal`) ayrılarak satır sayısı 365'e indirildi.
- Doğrulama (analyze/test/build):
  - `npm run build` ile doğrulandı (Exit code 0, 43 App Router rotası, TypeScript 0 hata ile 416ms'de tamamlandı).
  - Ana sayfa (`/`) statik ISR (`○ / 1m`) olarak derlendi.
- Risk/Not:
  - Supabase SQL Editor üzerinden `supabase/migrations/010_atomic_order_and_schema_improvements.sql` çalıştırılmalıdır (mevcut kod RPC bulunamazsa geriye dönük güvenli insert fallback'ini korur).
- Sonraki adım:
  - Production deploy ve son kullanıcı kabul smoke testleri.

---

## 2026-09-27 (Veritabanı Sağlamlaştırma, P2 Özellikleri & Production-Readiness Paketi)
- Scope: Canlı veritabanı migration'larının doğrulanması, P2 kullanıcı/SEO özellikleri ve 5 aşamalı Production-Readiness teslimatı
- Yapılan:
  1. **Veritabanı Migration & RLS Doğrulaması**:
     - `RUN_ALL_002_TO_010.sql` konsolide migration'ı hazırlandı ve enum cast hataları (`::delivery_method_type`, `::order_status_type`, `::payment_method_type`, `profiles.role::text`) giderildi.
     - 23 RLS politikası ve 7 RLS korumalı tablo doğrulanarak `payments`, `order_status_history` ve `customer_locations` tablolarında RLS'nin aktif olduğu teyit edildi.
     - `AGENTS.md` kuralı eklendi: "Veritabanı Migration Bütünlüğü & Ad-hoc Konsolide Script Yasağı".
     - Soft-fail fallback blokları `/api/orders/create` içerisinden tamamen silindi; sessiz veri bozulması riski sonlandırıldı.
  2. **P2 Özellikleri (Test & SEO)**:
     - **Playwright Smoke Test**: `tests/api-orders-create.spec.ts` oluşturuldu; eşzamanlı 10 siparişte `SIP-YYMM-XXX` formatında ardışık, çakışmasız numara üretimi assert edildi.
     - **Ürün Detay Sayfaları (`/urun/[slug]`)**: ISR (`revalidate = 60`) ve `generateStaticParams` ile dinamik sayfalar oluşturuldu; Artisan fırın teması, un oranı, fermantasyon süresi rozetleri, besin değerleri ve Sepete Ekle çekmecesi entegre edildi.
     - **Schema.org Zengin Snippet**: `BreadcrumbList`, `Product` ve `Bakery` yapısal JSON-LD verileri ürün sayfalarına gömüldü.
     - **Dinamik Sitemap & Robots**: `src/app/sitemap.ts` ve `src/app/robots.ts` ile tüm ürün ve içerik sayfaları dinamik indekslemeye açıldı.
  3. **Production-Readiness Görev 1 - Dağıtık Sliding Window Rate Limiter (Commit `2ff69ed`)**:
     - RAM tabanlı limiter yerine Supabase PostgreSQL tabanlı atomik sliding window limiter yazıldı (`supabase/migrations/011_rate_limit_buckets.sql` + `src/lib/security/rateLimiter.ts`).
     - `/api/orders/create` (10/dk), `/api/orders/[id]` (30/dk) ve `/api/admin/orders/parse` (20/dk) rotalarına uygulandı.
  4. **Production-Readiness Görev 2 - Sipariş ➔ Cari Hesaba Atomik İşleme (Commit `d1faea3`)**:
     - `supabase/migrations/012_order_to_cari_automation.sql` yazıldı. B2B / Cari siparişlerde borç kaydı (`account_transactions` - `satis`/`debt`) ve bakiye güncellemesi `create_order_atomic` fonksiyonu içerisinde tek transaction'da atomik yapıldı.
     - `PaymentMethod` tipine `"cari"` eklendi, `Order.cariId` desteği entegre edildi. Rollback testi başarıyla doğrulandı.
  5. **Production-Readiness Görev 3 - Gün İçi Sipariş Kesilme Saati (Cutoff Time) (Commit `539aae6`)**:
     - `bakery_settings` tablosundan dinamik okunan `order_cutoff_time` (varsayılan "18:00") eklendi.
     - `src/lib/settings/cutoff.ts` ile `Europe/Istanbul` saat diliminde aynı gün sipariş kesilme kontrolü yapıldı.
     - `/api/settings` genel dinamik uç noktası sağlandı; saat aşılmışsa `/api/orders/create` sunucu seviyesinde 400 hatası dönüyor.
     - İstemci tarafında `CartDrawer.tsx` kullanıcıyı otomatik olarak yarına yönlendiriyor ve bilgilendiriyor; `/admin/ayarlar` panelinden kesilme saati yönetilebiliyor.
  6. **Production-Readiness Görev 4 - Kurye Konsolu Çevrimdışı (Offline) Toleransı (Commit `a8f6990`)**:
     - Kurye hareket halindeyken bağlantı koptuğunda teslimat veya tahsilatın kaybolmaması için `src/lib/courier/offlineQueue.ts` yerel kuyruğu geliştirildi.
     - `src/hooks/useCourierNetwork.ts` ile ağ durumu izlendi, internet geldiğinde otomatik retry sağlandı.
     - `CourierOfflineBanner.tsx` ve `CourierHeader` durum rozetleri ile kullanıcı arayüzü güçlendirildi.
  7. **Production-Readiness Görev 5 - Sentry Entegrasyonu & Canlı Doğrulama (Commit `e65e8d8`)**:
     - Next.js 16 App Router ve Turbopack uyumlu `@sentry/nextjs` (v11) kuruldu.
     - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts` ve `next.config.ts` (`withSentryConfig`) yapılandırıldı.
     - Global, admin ve kurye sayfalarına Error Boundary bileşenleri eklendi.
     - `/api/orders/create` 500 ve RPC rollback durumları özel etiketlerle Sentry'ye bağlandı.
     - Canlı DSN testi çalıştırıldı; Sentry Event ID `13e9917450e846768484475b33463c16` ile Sentry sunucularına iletildi.
  8. **Google OAuth & Vercel Callback Güçlendirmesi (Commit `9ac5682`)**:
     - `src/app/auth/callback/route.ts` rotasına `x-forwarded-host` desteği, open-redirect koruması ve Google OAuth ile ilk kez gelen kullanıcıların `public.profiles` tablosuna otomatik upsert edilmesi eklendi.
     - Vercel Deployment Protection (Vercel Authentication) kapatma ve Supabase URL Configuration yapılandırma adımları belgelendi.
- Doğrulama (analyze/test/build):
  - `npm run build` ile doğrulandı (Exit code 0, 58 App Router rotası 0 hata ile derlendi).
  - Canlı Sentry flush testi başarılı (Event ID: `13e9917450e846768484475b33463c16`).
  - Tüm değişiklikler `main`, `master` ve `feature/location-ux-improvements` dallarına pushlandı.
- Risk/Not:
  - Vercel Dashboard üzerinde "Deployment Protection -> Vercel Authentication" seçeneği kapalı (Disabled) olmalıdır.
  - Supabase Dashboard üzerinde `supabase/migrations/011_rate_limit_buckets.sql` ve `012_order_to_cari_automation.sql` çalıştırılmış olmalıdır.
- Sonraki adım:
  - Yeni geliştirme oturumunda son kullanıcı kabul testleri ve canlı operasyon izlemesi.
