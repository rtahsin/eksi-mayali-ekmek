# 🍞 EkmekLab - Production-Readiness & Güvenlik/Mimari Sprint Özeti

Bu doküman, **2026-09-26 ve 2026-09-27** tarihlerinde gerçekleştirilen kapsamlı veritabanı sağlamlaştırma, mimari denetim, P2 özellikleri ve 5 adımlı **Production-Readiness** paketinin eksiksiz teknik özetidir.

---

## 1. 📌 Genel Bakış ve Tamamlanan İş Paketleri

| İş Paketi | Kapsam | Durum | Commit / Migration |
|---|---|---|---|
| **Veritabanı Bütünlüğü & RLS** | 002-010 Migration'larının birleştirilmesi, PostgreSQL Enum cast düzeltmesi, 23 RLS politikası & 7 RLS tablosunun doğrulanması | ✅ Tamamlandı & Canlıda Teyit Edildi | `RUN_ALL_002_TO_010.sql`, `UPDATE_CREATE_ORDER_ATOMIC.sql` |
| **Soft-Fail İzolasyonu** | Sipariş oluşturmada soft-fail / non-atomic parçalı insert fallback'lerinin tamamen kaldırılması, hard 500 fırlatma garantisi | ✅ Tamamlandı | `e05fc34` |
| **P2: Playwright Smoke Test** | Eşzamanlı 10 siparişte `SIP-YYMM-XXX` formatında ardışık numara çakışması olmadığını doğrulayan E2E test | ✅ Tamamlandı | `tests/api-orders-create.spec.ts` |
| **P2: Ürün Detay & Schema.org** | `/urun/[slug]` ISR (60sn), Artisan fırın tasarım teması, besin değerleri, sepet çekmecesi, BreadcrumbList, Product ve Bakery JSON-LD | ✅ Tamamlandı | `src/app/urun/[slug]/page.tsx` |
| **P2: Dinamik SEO** | Dinamik `sitemap.xml` ve `robots.txt` rotaları | ✅ Tamamlandı | `src/app/sitemap.ts`, `src/app/robots.ts` |
| **Görev 1: Dağıtık Rate Limiter** | Supabase PostgreSQL tabanlı kalıcı sliding window rate limiter (`rate_limit_buckets` + `check_rate_limit` RPC) | ✅ Tamamlandı | `2ff69ed`, `011_rate_limit_buckets.sql` |
| **Görev 2: Sipariş ➔ Cari Otomasyonu** | B2B/Cari siparişlerde atomik borç kaydı (`account_transactions` satis/debt) ve bakiye artırımı. Rollback koruması | ✅ Tamamlandı | `d1faea3`, `012_order_to_cari_automation.sql` |
| **Görev 3: Cutoff Time (Kesilme Saati)** | `Europe/Istanbul` saat diliminde `order_cutoff_time` (18:00) kontrolü. Sunucu 400 rejection, sepet uyarısı ve admin panel ayarı | ✅ Tamamlandı | `539aae6` |
| **Görev 4: Kurye Çevrimdışı Toleransı** | Offline local retry kuyruğu (`localStorage`), ağ dinleyicisi, offline banner rozeti, otomatik arka plan senkronizasyonu | ✅ Tamamlandı | `a8f6990` |
| **Görev 5: Sentry Entegrasyonu** | Next.js 16 + Turbopack uyumlu Sentry SDK (v11), instrumentation, global/admin/kurye error boundaries, `/api/orders/create` RPC capture | ✅ Tamamlandı & Canlı Test Edildi | `e65e8d8`, Event ID: `13e9917450e846768484475b33463c16` |
| **Google OAuth & Vercel Düzeltmesi** | `src/app/auth/callback/route.ts` içinde `x-forwarded-host`, open-redirect koruması, `profiles` tablosuna otomatik OAuth kullanıcı senkronizasyonu | ✅ Tamamlandı | `9ac5682` |

---

## 2. 🗄️ Veritabanı ve Migration Mimarisi

### 2.1. Uygulanan Migration Dosyaları
1. **`002_create_couriers.sql` - `009_fix_rls_policy_conflicts.sql`**:
   - `RUN_ALL_002_TO_010.sql` konsolide betiği ile Supabase SQL Editor'da çalıştırıldı.
   - `payments`, `order_status_history`, `customer_locations` tablolarında Row Level Security (RLS) `rowsecurity = true` olarak doğrulandı.
2. **`010_atomic_order_and_schema_improvements.sql`**:
   - `create_order_atomic` PostgreSQL transaction fonksiyonu.
   - `generate_order_number()`: `SIP-YYMM-XXX` formatında ardışık numara üreten PostgreSQL advisory lock tabanlı motor.
3. **`011_rate_limit_buckets.sql`**:
   - Dağıtık ve kalıcı sliding window rate limiting.
   - `check_rate_limit(p_key, p_limit, p_window_seconds)` RPC fonksiyonu.
   - 1 saatten eski logları temizleyen `cleanup_old_rate_limits()` fonksiyonu.
4. **`012_order_to_cari_automation.sql`**:
   - `create_order_atomic` fonksiyonunu güncelleyerek `p_cari_id` parametresi ekler.
   - Eğer `p_payment_method = 'cari'` ise veya `p_cari_id` doluysa:
     * İlgili cari hesabı kilitler (`SELECT ... FOR UPDATE`).
     * `account_transactions` tablosuna `satis` (debt) kaydı atar.
     * `current_accounts.balance` değerini atomik olarak sipariş tutarı kadar artırır.
     * Cari hesap bulunamazsa siparişin tamamını `ROLLBACK` eder.

---

## 3. 🛡️ Güvenlik ve Mimari Prensipler (AGENTS.md Kuralları)

* **Ad-hoc Konsolide Script Yasağı**: Eksik tablo/kolon tespit edildiğinde, var olan numaralı migration dosyaları sırasıyla uygulanmalıdır; RLS'yi veya trigger'ları atlayan elle yazılmış sahte şemalar yasaklanmıştır.
* **Asla Soft-Fail Yok**: Finansal veya operasyonel RPC fonksiyonları başarısız olduğunda parçalı/sahte insert fallback'ine düşülmez, sistem anında açıkça `500` döner.
* **Optimistic Locking**: Sipariş durum güncellemelerinde TOCTOU yarış durumlarını önlemek için `.eq("status", currentStatus)` filtresi şarttır.
* **Kurye Konum İzolasyonu**: Kurye Realtime broadcast kanalları global değil, `courier-location-${courierId}` bazında izoledir.
* **Veri Minimizasyonu**: Misafir sipariş takibinde maliyet ve toplam tutarlar maskelenir (`null`).

---

## 4. 🚀 5 Adımlı Production-Readiness Özeti

### Görev 1: Kalıcı Sliding Window Rate Limiter
- **Dosyalar**: `supabase/migrations/011_rate_limit_buckets.sql`, `src/lib/security/rateLimiter.ts`
- **Uygulanan Limitler**:
  * `/api/orders/create`: 10 istek / 60 saniye (IP bazlı).
  * `/api/orders/[id]`: 30 istek / 60 saniye (IP bazlı).
  * `/api/admin/orders/parse`: 20 istek / 60 saniye (IP bazlı).
- **Avantajı**: Bellek sızıntısı (RAM leak) riski sıfırlanmış, Vercel Serverless çoklu container yapısında paylaşılan atomik PostgreSQL koruması sağlanmıştır.

### Görev 2: Sipariş ➔ Cari Hesaba Atomik Entegrasyon
- **Dosyalar**: `supabase/migrations/012_order_to_cari_automation.sql`, `src/app/api/orders/create/route.ts`, `src/types/index.ts`
- **İşleyiş**: B2B müşterisi sipariş verdiğinde sepet ekranında ödeme yöntemi "Cari Hesap" seçilebilir. Sipariş kaydedildiği anda müşterinin cari borcu artar ve hareket dökümüne teslimat fişi olarak yansır.
- **Doğrulama**: Gerçek cari hesap `cari_muehgurb_ij2h` ile test edildi; hatalı cari ID verildiğinde atomik rollback olduğu doğrulandı.

### Görev 3: Sipariş Kesilme Saati (Cutoff Time)
- **Dosyalar**: `src/lib/settings/cutoff.ts`, `src/app/api/settings/route.ts`, `src/app/api/orders/create/route.ts`, `src/components/cart/CartDrawer.tsx`, `src/app/admin/ayarlar/page.tsx`
- **İşleyiş**: `Europe/Istanbul` saat diliminde aynı gün teslimat istenen siparişlerde saat `18:00` (veya panelden belirlenen saat) geçilmişse sunucu `400` hatası döner (`isPastCutoff`). İstemci tarafında sepet çekmecesi teslimat gününü otomatik yarına kaydırır ve kullanıcıyı uyarır.

### Görev 4: Kurye Çevrimdışı (Offline) Toleransı
- **Dosyalar**: `src/lib/courier/offlineQueue.ts`, `src/hooks/useCourierNetwork.ts`, `src/components/courier/CourierOfflineBanner.tsx`, `src/components/courier/CourierHeader.tsx`, `src/app/kurye/page.tsx`
- **İşleyiş**: Kurye asansörde, bodrum katta veya internetin çekmediği bir noktada teslimat veya nakit/kredi kartı tahsilatı yaptığında sistem işlemi kaybetmez. Yerel kuyruğa kaydeder (`localStorage`), ekranda kırmızı offline uyarı bandı açılır ve bağlantı geri geldiğinde arka planda otomatik olarak Supabase'e gönderir.

### Görev 5: Sentry Entegrasyonu
- **Dosyalar**: `@sentry/nextjs`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`, `next.config.ts`, `src/app/global-error.tsx`, `src/app/admin/error.tsx`, `src/app/kurye/error.tsx`
- **İşleyiş**: App Router hataları yakalanır. Sipariş oluşturma 500 hataları ve RPC kesintileri özel `module: "orders-and-courier"` etiketleriyle anında Sentry dashboard'una iletilir.
- **Canlı Test**: `.env.local` dosyasına DSN eklendikten sonra test hatası gönderildi ve Sentry sunucularından Event ID `13e9917450e846768484475b33463c16` ile teyit alındı.

---

## 5. 🌐 Vercel & Google OAuth Uyarı Notu

Canlı ortamda test yaparken Google ile girişte Vercel login ekranının çıkmaması için:
1. **Vercel Dashboard**: Proje ➔ **Settings** ➔ **Deployment Protection** ➔ **Vercel Authentication** seçeneği **Disabled** yapılmalıdır.
2. **Supabase Dashboard**: **Authentication** ➔ **URL Configuration** ➔ **Redirect URLs** listesine `https://*.vercel.app/**`, canlı domain ve `http://localhost:3000/**` eklenmelidir.
3. **Google Cloud Console**: Authorized Redirect URIs yalnızca `https://yayxobdugadqjskddixj.supabase.co/auth/v1/callback` olmalıdır.

---

## 6. 🧪 Doğrulama ve Derleme Durumu
- `npm run build`: **0 Hata** (58 App Router rotasının tamamı başarıyla derlenmektedir).
- Git Durumu: Çalışma ağacı tertemiz (`working tree clean`), tüm commit'ler `main`, `master` ve `feature/location-ux-improvements` dallarına pushlanmıştır.
