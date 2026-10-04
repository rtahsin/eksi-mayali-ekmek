<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🍞 EkmekLab - Geliştirici & Agent Çalışma Kuralları

> **Aktif plan:** [`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md). Her oturum başında oku; faz durumunu orada güncelle. Çelişki olursa yol haritası geçerlidir; çelişkiyi Tahsin'e bildir.

Bu kurallar, EkmekLab projesinde kod yazarken, hata ayıklarken ve yeni modül eklerken uyulması zorunlu teknik ve mimari standartları belirler.

---

## 1. 🏗️ Teknoloji Yığını ve İzolasyon Kuralları
- **Çekirdek**: Next.js 16 (App Router, Turbopack, React 19, Node.js).
- **Stil & Tasarım**: Tailwind CSS + Vanilla CSS.
- **Backend & Veritabanı**: **Supabase** (PostgreSQL, Auth, Realtime). Giriş: admin ve müşteri için Google OAuth (Supabase Auth); admin PIN'i yoktur. Tablolar: `orders`, `order_items`, `products`, `current_accounts` ve cari defteri `account_transactions`. İstemci fabrikaları `src/lib/supabase/` altında (env yoksa `null` döner: her zaman null kontrolü yap).
- **Firebase**: Artık backend değildir. `src/lib/firebase/*` ve `firebase`/`firebase-admin` paketleri yalnızca eski kalıntıdır (src içinde onları import eden yok; Faz 5'te silinecek). Yeni kodda Firebase kullanma.
- **Bildirim**: Yeni sipariş bildirimi Telegram ile (`src/lib/notify/telegram.ts`), `after()` içinde gönderilir; mesajda kişisel veri (ad/telefon/adres) olmaz (KVKK). Hata siparişi asla bozmaz.
- **Yasaklı Teknolojiler**: Bu repo içinde kesinlikle **Dart / Flutter** kodu yazılamaz, çalıştırılamaz veya önerilemez. Proje %100 Web/Next.js tabanlıdır.

---

## 2. 💻 TypeScript & Kod Kalitesi İlkeleri
- **Strict Type Safety**: `tsconfig.json` katı moddadır.
- **Kesinlikle `any` Tipi Kullanılamaz**: Harici veya belirsiz veriler için `unknown` + type guard fonksiyonları veya `zod` şemaları kullanılmalıdır.
- **Merkezi Tip Tanımları**: Tüm veri yapıları [`src/types/`](file:///f:/ekmeklab_app/src/types) altında toplanmalıdır (`AdminOrder`, `CariAccount`, `Transaction`, `Product` vb.).
- **Realtime Temizliği**: Açılan tüm Supabase Realtime kanalları (`supabase.channel(...)`) bileşen unmount edildiğinde `supabase.removeChannel(channel)` ile kapatılmalıdır. Hafıza sızıntısı (memory leak) yasaktır.

---

## 3. 🎨 Tasarım Sistemi & Artisan Bakery Estetiği
- **Renk Paleti**:
  - Koyu Zemin: `#120E0B`
  - Kart / Yüzey: `#18130F`
  - Kenarlıklar: `#261E17`
  - Vurgu Altın: `#F59E0B` (`artisan-gold`)
  - Vurgu Terakota: `#C85A32` (`artisan-terracotta`)
  - Hamur / Un Tonu: `#F7EBD3` (`artisan-cream`)
  - Jenerik düz parlak renkler (varsayılan mavi, kırmızı) yerine her zaman fırın kimliğiyle uyumlu HSL / sıcak taş tonları kullanılmalıdır.
- **Tipografi**: Marka kimliği ve başlıklar için `font-serif`, metinler ve veri tabloları için modern sans-serif ve `font-mono`.
- **Mobil Ergonomi**: Kurye konsolu (`/kurye`) ve müşteri takip (`/siparis-takip/[id]`) ekranlarında tek elle kullanıma uygun büyük butonlar, yüksek kontrast ve tek tıkla arama / WhatsApp / navigasyon desteği şarttır.

---

## 4. 💼 Finans & Ön Muhasebe Kuralları
- **Simetrik Bakiye İlkesi**: `Bakiye = Toplam Borç (Satışlar) - Toplam Alacak (Tahsilatlar)`. Borç (+) bakiyeyi artırır, tahsilat (-) bakiyeyi düşürür. Asimetrik bakiye hesaplaması kesinlikle yasaktır.
- **Yürüyen Bakiye & Tarihsel Doğruluk**: Her işlem fişinde (`/fis/[id]`) ve makbuz modalında, cari hesabın o anki genel bakiyesi değil; o işlemin gerçekleştiği andaki `balance_after` değeri "Kalan Bakiye" olarak gösterilmelidir.
- **Belge Türü Ayrımı & Makbuz Standartları**:
  - `satis` (debt): "TESLİMAT FİŞİ" (Turuncu/Terakota rozet). Sipariş ürün kalemleri tablosu içerir.
  - `tahsilat` (credit): "TAHSİLAT MAKBUZU" (Yeşil rozet). Ürün tablosu yerine makbuz özet kartı (Tahsil Edilen Tutar, Ödeme Şekli, Açıklama, Tahsilat Toplamı) gösterilir; bakiye kutusu "Tahsil Edilen Tutar (-)" ve "Kalan Güncel Borç" olarak adlandırılır.
  - `devir`: "DEVİR / DÜZELTME MAKBUZU" (Mavi rozet).
- **Müşteri Linki Gizliliği & Buton Kuralı**: Müşteri-yüzlü sayfalarda ([`/fis/[id]`](file:///f:/ekmeklab_app/src/app/fis/%5Bid%5D/page.tsx) ve [`/ekstre/[id]`](file:///f:/ekmeklab_app/src/app/ekstre/%5Bid%5D/page.tsx)) ASLA yeşil "WhatsApp ile Paylaş" butonu yer almamalıdır. WhatsApp paylaşımı sadece fırıncının admin panelindeki makbuz modalında bulunabilir. Müşteri linklerinde yüksek çözünürlüklü PNG indirme ve Excel/CSV dışa aktarım özellikleri kullanılır.
- **Excel / CSV Dışa Aktarım Formatı**: Türkçe karakterlerin (ğ, ş, ı, ö, ç, İ) Windows Excel'de bozulmadan açılabilmesi için CSV dosyası daima `\uFEFF` (UTF-8 BOM) ile başlatılmalı ve alan ayracı olarak noktalı virgül (`;`) kullanılmalıdır.
- **Cari Silme = Arşiv; Deneme Carisi İstisna**: Gerçek geçmişi olan cari silinmez; bakiyesi 0 ise arşivlenir ve kayıtları korunur. Tek istisna deneme carisidir: hiç hareketi yoksa ya da tüm hareketleri storno ile iptal edilmişse `delete_cari_account` RPC'si (`DELETE /api/admin/cari/accounts/[id]`) onu kayıtlarıyla birlikte kalıcı siler. Bunun dışında `account_transactions` kayıtları asla silinmez.
- **Storno (Ters Kayıt)**: Muhasebe hareketleri doğrudan silinmez veya düzenlenmez; iptal edilen veya düzeltilen işlemler ters kayıt (storno) ile muhasebeleştirilir, ardından doğru kayıt girilir.
- **Ardışık Fiş Numaralandırması**: Finansal tahsilat/ödeme hareketleri `FİŞ-YYMM-XXX` formatında ardışık üretilir.
- **Kağıt & Baskı CSS Koruma Kuralı**: Fiş ve ekstrelerin PNG/PDF çıktılarında yazıların ve rakamların yarısının kesilmesini önlemek için:
  - Taşma yapan kartlar için `overflow-hidden` yerine `overflow-visible`,
  - Rakamlar ve metinler için yeterli alt padding (`pb-1` / `leading-normal`),
  - `html2canvas` render işleminde `scale: 2` veya `window.devicePixelRatio` ayarları korunmalıdır.

---

## 5. 🧪 Derleme & Doğrulama Zorunluluğu
- Her kod değişikliği sonrasında sırasıyla **`npm run typecheck`**, **`npm test`** (vitest, `src/**/*.test.ts`) ve **`npm run build`** çalıştırılarak 0 hata doğrulanmalıdır. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) aynı üçünü her PR'da Supabase env'siz çalıştırır; kırmızı CI birleştirilmez.
- Saf mantık (tarih, ayar şeması, uygunluk/kapasite vb.) için yanına `*.test.ts` yaz.

---

## 6. 🔐 Güvenlik, API Yetkilendirme & Eşzamanlılık (Concurrency) Kuralları
- **Service Role'e Doğrudan Güvenilemez**: `createAdminClient()` kullanan tüm API rotalarında kimlik/rol doğrulaması [`src/lib/security/apiAuth.ts`](src/lib/security/apiAuth.ts) üzerinden yapılmalıdır. `verifyApiAuth(req)` önce çerez oturumunu, sonra Bearer token'ı okur. İstemci body'sinde gelen `isAdmin`, `cancelledBy: "admin"`, `userId`, `cariId` vb. alanlara asla güvenilmez.
- **Admin Rotaları**: `src/app/api/admin/**` altındaki her handler şu iki satırla başlar (PIN yoktur; middleware'e ek savunma):
  ```ts
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  ```
- **Atomik Cari Finans Yönetimi**: Cari bakiye ve hareket işlemleri tek transaction'da çalışan atomik RPC ile yapılmalıdır; eski `adjust_cari_balance` kullanılmaz. Not: `record_cari_transaction_atomic` repoda yalnızca `008` içinde tanımlıdır, canlı veritabanında **yok**; kanonik sürümü Faz 3'te `016` migration'ı ile (yeniden) oluşturulacak (`delta`, storno, kilit altında `FİŞ-YYMM-NNN`). O zamana kadar cari yazımlarını parçalı insert'lerle uydurma; Faz 3'ü bekle veya Tahsin'e sor.
- **Zaman = İstanbul**: Tarih/saat için daima [`src/lib/time/istanbul.ts`](src/lib/time/istanbul.ts) (`istanbulToday`, `addDays`, `isPastCutoff`, `formatTrDate`…); istemci bileşenlerinde `useIstanbulToday()` hook'u. `new Date().toISOString().split("T")[0]` (UTC) kullanılmaz; `delivery_date` daima `YYYY-MM-DD`.
- **Ayarlar & Sabitler**: Ayarlar [`src/lib/settings/schema.ts`](src/lib/settings/schema.ts) (zod) + sunucuda `getStoreSettings()` ile okunur; sipariş oluşturma ve admin yazımlarında `getStoreSettings(client, { failClosed: true })` (okunamazsa hata, sessiz varsayılan yok). Site sabitleri `src/lib/site.ts` içindedir (`SITE_URL`, `CONTACT`, `whatsappLink`); telefon numarası veya alan adı koda gömülmez.
- **Sipariş & Katalog**: Siparişler yalnızca `POST /api/orders/create` → `create_order_atomic` (v4, migration 015) ile oluşur. Tarih/uygunluk/kapasite tek kaynağı `src/lib/ordering/availability.ts` (saf, testli) + `getCartAvailability` (`loadAvailability.ts`); katalog `src/lib/products/server.ts` içindeki `getCatalog()` ile okunur (statik katalog yedeği veya `stock || 25` gibi hileler yok).
- **Optimistic Locking (İyimser Kilitleme)**: Sipariş durumu güncellemelerinde TOCTOU (Time-of-check to time-of-use) ve yarış durumlarını önlemek için UPDATE sorgusuna `.eq("status", currentStatus)` koşulu eklenmeli ve 0 satır güncellendiğinde 409 Conflict dönülmelidir.
- **Kurye Canlı Konum İzolasyonu**: Realtime broadcast kanalları global olarak değil, kurye bazında izole (`courier-location-${courierId}`) açılmalı ve unmount/stop anında `supabase.removeChannel(channel)` ile kapatılmalıdır.
- **Halka Açık Takip ve Veri Minimizasyonu**: Misafir ve halka açık sipariş takibinde (`/api/orders/[id]`), yetkisiz sorgularda finansal toplamlar (`total_amount`, `subtotal`, `shipping_fee`) `null` olarak maskelenmeli, ürün fiyatları yanıttan soyulmalı ve IP/telefon rate limiting uygulanmalıdır.
- **Ardışık Sipariş Numaralandırma**: Manuel ve otomatik siparişlerde `Date.now()` veya `Math.random()` kullanılmaz; ID için `crypto.randomUUID()`, sipariş numarası için veritabanı `generate_order_number()` RPC fonksiyonu kullanılır (`SIP-YYMM-XXX`).
- **Atomik RPC ve Asla Soft-Fail / Non-Atomic Fallback Kuralı**: `create_order_atomic`, `record_cari_transaction_atomic` veya benzeri finans/sipariş RPC fonksiyonları başarısız olduğunda ASLA sıralı insert'lerden oluşan sahte veya parçalı bir fallback'e (soft-fail) düşülemez; sistem derhal açıkça `500` (Hard Fail) dönmelidir. Finansal ve operasyonel bütünlükte sessiz veri bozulmasındansa (silent corruption/phantom records) açık hata fırlatmak mecburidir.
- **Kurye Konsolu Rol İzolasyonu**: `/kurye` rotası ve kurye API'leri yalnızca `courier`, `staff`, `admin` veya `superadmin` rollerine açıktır. Giriş yapmış olsa dahi standart müşteri oturumları (`customer`) kurye konsoluna asla erişemez.
- **Veritabanı Migration Bütünlüğü & Ad-hoc Konsolide Script Yasağı**: Eksik tablo veya kolon tespit edildiğinde, ASLA elle yeni bir "ad-hoc konsolide" şema script'i yazılmaz (RLS politikalarının, kısıtların ve trigger'ların atlanmaması için). Öncelikle repodaki numaralı migration dosyalarının (`supabase/migrations/NNN_...`) sırasıyla çalıştırılıp çalıştırılmadığı (`app_migrations` tablosu) kontrol edilir ve eksik migration'lar numara sırasına göre uygulanır.
- **Migration Kuralları**: Her migration kendini `app_migrations` tablosuna yazar ve `supabase/tests/NNN_*.sql` (BEGIN…ROLLBACK) duman testi içerir. Her yeni/değişen fonksiyon `SET search_path = public, pg_temp` taşır ve açık `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role` içerir (`CREATE OR REPLACE` yetkileri sıfırlar; her seferinde yeniden yaz).
- **Migration ↔ Yayın Sırası**: Tahsin SQL'i kendisi Supabase SQL Editor'de çalıştırır (önce sonu `ROLLBACK` olan kuru deneme, sonra `COMMIT`). Sıra önemlidir: eklemeli migration'lar (yeni sütun/tablo, geriye uyumlu RPC) uygulamadan ÖNCE; tip değiştiren veya eski kodu bozan migration'lar uygulamadan SONRA. Her PR açıklamasında sırayı açıkça yaz (bkz. `docs/YOL_HARITASI.md` §7).
- **SQL'i Script ile Düzenleme**: SQL dosyalarını JS/Node script'iyle değiştirirken `String.replace`'e `$$` içeren değiştirme dizesi verme; `$$` tek `$`'a çöker ve dolar-tırnaklı fonksiyon gövdelerini bozar (015'te yaşandı). Fonksiyonlu değiştirme (`replace(x, () => yeni)`) veya doğrudan dosya düzenleme kullan.

