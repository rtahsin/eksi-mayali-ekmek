# 📋 EkmekLab Doğrulama & İş Günlüğü (WORKLOG)

> **Tarih**: 27 Eylül 2026  
> **Durum**: 🚀 **P2 GÖREVLERİ İŞLENİYOR**

---

## 1. 🎯 Canlı Doğrulama ve Test Siparişi Sonuçları

`verify_after_migration.mjs` test paketi canlı ortamda ardışık iki test siparişi ile çalıştırıldı ve tüm adımlar başarıyla geçti:

### A. Birinci Test Siparişi
* **HTTP Durumu**: `200 OK`
* **Sipariş ID**: `ORD-CC0D36F8`
* **Üretilen Sipariş Numarası**: **`SIP-2609-001`** (Beklenen format: `SIP-YYMM-XXX`)
* **İlişkili Kayıtlar**:
  - ✅ `order_items`: 1 adet kalem kaydı oluşturuldu (2x Taş Fırın Ekşi Mayalı Köy Ekmeği).
  - ✅ `payments`: 1 adet bekleyen kapıda nakit tahsilat kaydı oluşturuldu (450 ₺).
  - ✅ `order_status_history`: 1 adet başlangıç durum kaydı oluşturuldu (`bekliyor`).
  - ✅ `customer_locations`: 1 adet GPS koordinat kaydı oluşturuldu (`41.0025, 28.6412`).

### B. İkinci Test Siparişi (Ardışık Numara Kontrolü)
* **HTTP Durumu**: `200 OK`
* **Sipariş ID**: `ORD-BE05436A`
* **Üretilen Sipariş Numarası**: **`SIP-2609-002`**
* **Sonuç**: `pg_advisory_xact_lock` transaction kilidi sayesinde eşzamanlı çakışmasız ardışık numara üretimi ve tek transaction'da atomik kayıt çalıştığı %100 doğrulandı.
* **Temizlik**: Her iki test siparişi de üretim kuyruğunu kirletmemesi adına canlı veritabanından güvenle silindi.

---

## 2. 🛡️ Tablo ve RLS Güvenlik Doğrulaması

Supabase PostgreSQL üzerinde yapılan güvenlik kontrolleri:

| Tablo | Varlık Durumu | RLS Durumu | Anonim Erişim Koruması |
|-------|---------------|------------|------------------------|
| `public.orders` | ✅ Mevcut | ✅ `rowsecurity = true` | Koruma altında |
| `public.order_items` | ✅ Mevcut | ✅ `rowsecurity = true` | Koruma altında |
| `public.couriers` | ✅ Mevcut | ✅ `rowsecurity = true` | Koruma altında |
| `public.payments` | ✅ Mevcut | ✅ `rowsecurity = true` | ✅ Anonim okuma 0 satır (erişim engelli) |
| `public.order_status_history` | ✅ Mevcut | ✅ `rowsecurity = true` | ✅ Anonim okuma 0 satır (erişim engelli) |
| `public.customer_locations` | ✅ Mevcut | ✅ `rowsecurity = true` | ✅ Anonim okuma 0 satır (erişim engelli) |

---

## 3. 🧪 P2-1: Playwright Smoke Test & Concurrency Suite (Tamamlandı)
* `tests/e2e/order-flow.spec.ts` dosyasına storefront yükleme, tekil atomik sipariş ve 5 eşzamanlı sipariş (concurrency) senaryoları eklendi.
* `Promise.all` ile atılan eşzamanlı isteklerde dönen tüm sipariş numaralarının `SIP-YYMM-XXX` formatında ve **çakışmasız (unique Set size === 5)** olduğu doğrulandı.
* Üretilen E2E test siparişlerinin test sonunda `afterAll` hook'u ile DB'den otomatik temizlenmesi sağlandı.
* `package.json`'a `verify:orders` ve `test:e2e` betikleri eklendi. Derleme `npm run build` ile 0 hata ile doğrulandı.

---

## 4. 🍞 P2-2 & P2-3: Ürün Detay Sayfaları (/urun/[slug]), Sitemap, Robots & Schema.org JSON-LD (Tamamlandı)
* `src/app/urun/[slug]/page.tsx` dinamik artisan ürün detay sayfası oluşturuldu (RSC, 60s ISR, `generateStaticParams` ile 13 ürünün tamamı SSG olarak derlendi).
* Ürün sayfası; dinamik metadata/OpenGraph, ekmek anatomisi/DNA tablosu (% hidrasyon, 36s fermantasyon, un cinsleri, katkısızlık), Ustanın Notu (Masterclass) rehberi, sepet Zustand entegrasyonlu interaktif sipariş bileşeni ve ilgili ürünler seçkisi içerir.
* `src/app/sitemap.ts` ile tüm ürünler, bülten yazıları ve statik sayfaları içeren dinamik `sitemap.xml` ve `src/app/robots.ts` ile arama motoru direktifleri oluşturuldu.
* Schema.org `Bakery` / `LocalBusiness` JSON-LD yapılandırılmış verisi kök layout'a, `Product` + `Offer` JSON-LD ise ürün sayfalarına gömüldü.
* `npm run build` çalıştırıldı ve 58/58 sayfa (tüm `/urun/[slug]`, `/sitemap.xml`, `/robots.txt`) 0 hata ile başarıyla derlendi.

---

## 5. 🧹 P2-4: Firebase/Firestore Legacy Temizliği (Tamamlandı)
* Eski ve kullanılmayan `functions/` dizini, `firestore.rules` ve `firestore.indexes.json` dosyaları depodan tamamen temizlendi.
* `firebase.json` dosyası gereksiz firestore/functions hedeflerinden arındırılarak yalnızca mevcut medya depolama (`storage.rules`) ile sınırlandırıldı.
* `README.md` baştan sona yeniden yazılarak tüm tarihi Flutter/Dart ve Cloud Functions referansları kaldırıldı; mimari %100 Next.js 16 + Supabase PostgreSQL atomik yapısına kavuşturuldu.
* `instructions.md` ve `settings.json` dosyalarındaki legacy referanslar temizlendi.
* `npm run build` çalıştırıldı ve 58/58 rotanın 0 hata ile derlendiği doğrulandı.

---

## 6. 🛡️ GÖREV 1: Dağıtık Kalıcı Rate Limiter (Tamamlandı)
* **Yapılan İşlem**: Sunucusuz (Vercel serverless) ortamlarda instance'lar arası paylaşılamayan in-memory Map yerine, Supabase PostgreSQL üzerinde çalışan atomik sliding window rate limiter kuruldu.
* **Değiştirilen Dosyalar**:
  - `supabase/migrations/011_rate_limit_buckets.sql`: `rate_limit_buckets` tablosu, RLS politikası ve atomik satır kilitlemeli (`FOR UPDATE`) `check_rate_limit` PL/pgSQL fonksiyonu.
  - `src/lib/security/rateLimiter.ts`: `checkRateLimit` fonksiyonu veritabanı RPC katmanına bağlandı; IP ve telefon bazlı sliding window korundu.
  - `src/app/api/orders/create/route.ts`: IP rate limiter (10 istek / 10 dk) ve telefon rate limiter (5 istek / 10 dk) `await checkRateLimit` ile bağlandı.
  - `src/app/api/orders/[id]/route.ts` & `src/app/api/admin/orders/parse/route.ts`: `checkRateLimit` çağrıları `await` ile asenkron kalıcı yapıya uyarlandı.
* **Test Yöntemi**: Canlı veritabanı üzerinde 11 ardışık istek atılarak test edildi. 1-10 arası istekler `allowed: true` ile azalan bakiye verdi; 11. istek `allowed: false` ve `retryAfterSeconds: 59` ile 429 engeli üretti. Test sonrası geçici bucket temizlendi. `npm run build` ile 58/58 rota 0 hata ile doğrulandı.
