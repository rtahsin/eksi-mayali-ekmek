<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🍞 EkmekLab - Geliştirici & Agent Çalışma Kuralları

> **Tek Canlı Giriş Noktası (3 Şerit):** [`MERKEZ.md`](MERKEZ.md) (Şerit 1: Bilim/Kitap · Şerit 2: Medya/Ses/Video · Şerit 3: Web/Pazarlama/Satış).
> **Aktif Özet Plan:** [`docs/YOL_HARITASI.md`](docs/YOL_HARITASI.md) · **Kitap/Video Omurgası:** [`docs/ICERIK_PLANI.md`](docs/ICERIK_PLANI.md).
> **Mimari & Sözleşmeler:** [`docs/MIMARI.md`](docs/MIMARI.md) · **İş Emri Şablonu:** [`docs/IS_PAKETLERI.md`](docs/IS_PAKETLERI.md) · **Kararlar:** [`docs/adr/`](docs/adr/).

---

## 0. 🎯 Komuta Merkezi ve İşçi Ajan Rol Ayrımı
- **Komuta Merkezi (Ana Sohbet):** Strateji, pazarlama/operasyon kurgusu, önceliklendirme, iş emri üretimi ve kalite/`git diff` denetimi merkezidir. Tahsin'e proaktif olarak en kârlı, en hızlı ve en yalın seçenekleri sunar; nihai karar ve onay Tahsin'dedir.
- **İşçi Ajanlar (Diğer Sohbetler / Alt-Ajanlar):** Yalnızca kendilerine verilen **İş Emri** kapsamındaki dosyalara (`Yazma kapsamı`) dokunur. Kapsam dışına çıkmaz; kendi başına menü, tema, ürün stratejisi veya şema kararı vermez; belirsizlikte durup sorar.

---

## 1. 🏗️ Teknoloji Yığını ve İzolasyon Kuralları
- **Çekirdek**: Next.js 16 (App Router, Turbopack, React 19, Node.js).
- **Stil & Tasarım**: Tailwind CSS + Vanilla CSS.
- **Backend & Veritabanı**: **Supabase** (PostgreSQL, Auth, Realtime). Giriş: admin ve müşteri için Google OAuth (Supabase Auth); admin PIN'i yoktur. Ana tablolar: `orders`, `order_items`, `payments`, `order_status_history`, `products`, `current_accounts`, `account_transactions`. İstemci fabrikaları `src/lib/supabase/` altında (env yoksa `null` döner: her zaman null kontrolü yap).
- **Firebase**: Kaldırıldı. Yeni kodda Firebase kullanma.
- **Bildirim**: Yeni sipariş bildirimi Telegram ile (`src/lib/notify/telegram.ts`), `after()` içinde gönderilir; mesajda kişisel veri (ad/telefon/adres) olmaz (KVKK). Hata siparişi asla bozmaz.
- **Yasaklı Teknolojiler**: Bu repo içinde kesinlikle **Dart / Flutter** kodu yazılamaz, çalıştırılamaz veya önerilemez. Proje %100 Web/Next.js + yerel Python medya/bilim hattı tabanlıdır.

---

## 2. 💻 TypeScript & Kod Kalitesi İlkeleri
- **Strict Type Safety**: `tsconfig.json` katı moddadır.
- **Kesinlikle `any` Tipi Kullanılamaz**: Harici veya belirsiz veriler için `unknown` + type guard fonksiyonları veya `zod` şemaları kullanılmalıdır.
- **Merkezi Tip Tanımları**: Tüm veri yapıları [`src/types/`](file:///f:/ekmeklab_app/src/types) altında toplanmalıdır (`AdminOrder`, `CariAccount`, `Transaction`, `Product` vb.).
- **Realtime Temizliği**: Açılan tüm Supabase Realtime kanalları (`supabase.channel(...)`) bileşen unmount edildiğinde `supabase.removeChannel(channel)` ile kapatılmalıdır. Hafıza sızıntısı (memory leak) yasaktır.

---

## 3. 🎨 Tasarım Sistemi & Artisan Bakery Estetiği
- **Renk Paleti**: Canlı yön **"Atölye Kremi"** ([`docs/MARKA.md`](docs/MARKA.md) §8: zemin `#F6EEDF`, kâğıt `#FBF6EC`, mürekkep `#3B1E1A`, ikincil `#6E5148`, çizgi `#E2D3BD`, vurgu terakota `#B4532A`; gece teması token tabanlı; Fraunces + Inter).
  - `#B4532A` krem zemin üzerinde gövde metni için yeterli kontrastı vermez (~4,3:1); yalnız büyük metin ve arayüz öğelerinde kullan.
  - Jenerik düz parlak renkler (varsayılan mavi, kırmızı) yerine her zaman fırın kimliğiyle uyumlu sıcak taş tonları kullanılmalıdır.
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

## 5. 🧪 Şerit Bazlı Derleme & Doğrulama Zorunluluğu
- **Şerit 3 — Canlı Web Uygulaması (`src/`, `content/`, `public/`, `supabase/`):** Her kod veya içerik değişikliği sonrasında sırasıyla **`npm run typecheck`**, **`npm test`** (vitest, `src/**/*.test.ts`) ve **`npm run build`** çalıştırılarak 0 hata doğrulanmalıdır. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) aynı üçünü her PR'da Supabase env'siz çalıştırır; kırmızı CI birleştirilmez. Saf mantık için yanına `*.test.ts` yazılır.
- **Şerit 1 & 2 — Bilim, Kitap, Ses ve Medya Mutfağı (`arastirma/`):** `.gitignore` altındadır; web derlemesi (`npm run build`) çalıştırılmaz. Doğrulama kapısı deterministik doğrulayıcı `python -X utf8 arastirma/bilgi_sentezi_v2/araclar/paket_dogrula.py` (`--konu KONU-XX` veya `--hepsi`) ve ilgili medya/ses/Remotion betiğinin hatasız çıktısıdır.

---

## 6. 🔐 Güvenlik, API Yetkilendirme & Eşzamanlılık (Concurrency) Kuralları
- **Service Role'e Doğrudan Güvenilemez**: `createAdminClient()` kullanan tüm API rotalarında kimlik/rol doğrulaması [`src/lib/security/apiAuth.ts`](src/lib/security/apiAuth.ts) üzerinden yapılmalıdır. `verifyApiAuth(req)` önce çerez oturumunu, sonra Bearer token'ı okur. İstemci body'sinde gelen `isAdmin`, `cancelledBy: "admin"`, `userId`, `cariId` vb. alanlara asla güvenilmez.
- **Admin Rotaları**: `src/app/api/admin/**` altındaki her handler şu iki satırla başlar (PIN yoktur; `proxy.ts`'e ek savunma):
  ```ts
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  ```
- **Atomik Cari Finans Yönetimi**: Tüm cari yazımları `POST /api/admin/cari/transactions` → `record_cari_transaction_atomic` (kanonik türler `satis/tahsilat/devir/storno`, açık `delta`, hesap kilidi, kilit altında `FİŞ-YYMM-NNN`, `p_target_balance` ile kilit altında bakiye düzeltme). Bakiye her zaman `SUM(delta)`'ya eşittir. Tarayıcı rolleri `account_transactions` ve `current_accounts` tablolarına yazamaz; müşteri ekstre/fiş linkleri imzalıdır (`src/lib/security/linkToken.ts`, `/api/admin/cari/share`).
- **Sipariş Yaşam Döngüsü & Tek Yazar**: `orders`, `payments`, `order_status_history` yalnız sunucu (RPC / API rotası) tarafından yazılır (`024_single_writer.sql` canlıda aktiftir; tarayıcıdan doğrudan yazım yasaktır). Ara durumlar `PATCH /api/orders/[id]/status`; teslim yalnız `POST /api/orders/[id]/deliver` → `mark_order_delivered` (idempotent); ek ödeme `POST /api/admin/orders/[id]/payments` → `record_order_payment`; iptal `PATCH /api/orders/[id]/cancel` → `cancel_order_atomic` (cari hareketlerine storno). Manuel sipariş `POST /api/admin/orders` → `create_order_atomic`. Cari borcu sipariş anında değil teslimde yazılır.
- **Zaman = İstanbul**: Tarih/saat için daima [`src/lib/time/istanbul.ts`](src/lib/time/istanbul.ts) (`istanbulToday`, `addDays`, `isPastCutoff`, `formatTrDate`…); istemci bileşenlerinde `useIstanbulToday()` hook'u. `new Date().toISOString().split("T")[0]` (UTC) kullanılmaz; `delivery_date` daima `YYYY-MM-DD`.
- **Ayarlar & Sabitler**: Ayarlar [`src/lib/settings/schema.ts`](src/lib/settings/schema.ts) (zod) + sunucuda `getStoreSettings()` ile okunur; sipariş oluşturma ve admin yazımlarında `getStoreSettings(client, { failClosed: true })` (okunamazsa hata, sessiz varsayılan yok). Site sabitleri `src/lib/site.ts` içindedir (`SITE_URL`, `CONTACT`, `whatsappLink`); telefon numarası veya alan adı koda gömülmez.
- **Sipariş & Katalog**: Siparişler yalnızca `POST /api/orders/create` → `create_order_atomic` ile oluşur. Tarih/uygunluk/kapasite tek kaynağı `src/lib/ordering/availability.ts` + `getCartAvailability` (`loadAvailability.ts`); katalog `src/lib/products/server.ts` içindeki `getCatalog()` ile okunur.
- **Optimistic Locking (İyimser Kilitleme)**: Sipariş durumu güncellemelerinde TOCTOU ve yarış durumlarını önlemek için UPDATE sorgusuna `.eq("status", currentStatus)` koşulu eklenmeli ve 0 satır güncellendiğinde 409 Conflict dönülmelidir.
- **Teslimat Ekranı (`/kurye`)**: Kurye GPS izleme/yayını yoktur; kurye kadrosu yönetimi `src/lib/features.ts` bayrağıyla kapalıdır. Rota sırası `src/lib/delivery/maps.ts` (`sortStops`). Teslim yalnız `deliverOrder()` → `/api/orders/[id]/deliver`; bağlantı yoksa çevrimdışı kuyruk. `/kurye` yalnızca `courier`, `staff`, `admin` veya `superadmin` rollerine açıktır.
- **Halka Açık Takip ve Veri Minimizasyonu**: Misafir ve halka açık sipariş takibinde (`/api/orders/[id]`), yetkisiz sorgularda finansal toplamlar (`total_amount`, `subtotal`, `shipping_fee`) `null` olarak maskelenmeli, ürün fiyatları yanıttan soyulmalı ve IP/telefon rate limiting uygulanmalıdır.
- **Ardışık Sipariş Numaralandırma**: Manuel ve otomatik siparişlerde `Date.now()` veya `Math.random()` kullanılmaz; ID için `crypto.randomUUID()`, sipariş numarası için veritabanı `generate_order_number()` RPC fonksiyonu kullanılır (`SIP-YYMM-XXX`).
- **Atomik RPC ve Asla Soft-Fail / Non-Atomic Fallback Kuralı**: `create_order_atomic`, `record_cari_transaction_atomic`, `mark_order_delivered` veya benzeri finans/sipariş RPC fonksiyonları başarısız olduğunda ASLA sıralı insert'lerden oluşan parçalı bir fallback'e düşülemez; sistem derhal açıkça `500` (Hard Fail) dönmelidir.
- **Migration Kuralları (`001`–`030` mevcut; yeni numara `031+`)**: Ad-hoc konsolide şema script'i yazılmaz. Yeni migration'a numara birleşme anında sıradaki boş numara olarak verilir; kendini `app_migrations` tablosuna yazar ve `supabase/tests/NNN_*.sql` (BEGIN…ROLLBACK) duman testi içerir. Her yeni/değişen fonksiyon `SET search_path = public, pg_temp` ve açık `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role` taşır. SQL dosyalarını JS ile düzenlerken `String.replace`'e düz `$$` verme (fonksiyonlu `replace` veya doğrudan düzenleme kullan). Tahsin SQL'i Supabase SQL Editor'de önce `ROLLBACK`, sonra `COMMIT` ile çalıştırır; uygulama ↔ migration sırası (ÖNCE / SONRA) her iş emrinde açıkça belirtilir.
- **Önizleme = Canlı Veritabanı**: Staging yok (ADR-0005). Ajanlar service-role anahtarıyla script çalıştırmaz ve canlı veritabanına bağlanmaz; canlı veri silen script/test `ALLOW_PROD_WRITES=1` + `TEST` öneki olmadan çalışmamalıdır.

---

## 7. 📚 İçerik, Bilim ve Pazarlama Kuralları
- **Canlı Web İçeriği (`content/`):** Sitedeki canlı bilim anlatıları `/bilim` rotasında (`content/bilim/` altında 26 an ve `content/video/` senaryoları), kavram/kaynak grafiği ise `content/{sources,claims,concepts}/` altında git'te tutulur (ADR-0002). Admin'de yazı editörü yoktur. Onaylı bir iddiada (`content/claims`) metin değişirse `claimHash` onayı geçersiz olur (K011); `review` alanı yalnız Tahsin'in açık onayından sonra yazılır.
- **Bilim, Kitap ve Medya Stüdyosu (`arastirma/`):** `.gitignore` altındadır. Birincil tam metin arama ve doğrulama motoru `arastirma/bilgi_sentezi_v2/` (`bilgi_sentezi.sqlite` FTS5 — 2.541 tam metin kaydı + `paket_dogrula.py`), dergi/gazete hattı `arastirma/medya_hatti/`, gerçek ses kurgusu `arastirma/ses/` ve 60fps video stüdyosu `arastirma/video_studyosu/` dizinindedir. Detaylı akış [`MERKEZ.md`](MERKEZ.md) içindedir.
- **Sağlık Beyanı Yok (`K006` — MARKA §3):** Web sitesinde, kitapta, videolarda, Instagram dergisinde ve kese kâğıdı gazetesinde *"sağlıklı, şifa, önler, iyileştirir, sindirimi kolay, bağırsak dostu…"* gibi fizyolojik/tıbbi fayda iddiaları **kesinlikle yazılmaz**. Bilim her zaman *"hamurda, fırında ve sofrada fizikokimyasal olarak ne olur?"* diliyle anlatılır. Ürün sayfalarında (`/urun`, `/e`, paket ve eşlikçi açıklamaları) sağlık terimi hiç geçmez.
