<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🍞 EkmekLab - Geliştirici & Agent Çalışma Kuralları

Bu kurallar, EkmekLab projesinde kod yazarken, hata ayıklarken ve yeni modül eklerken uyulması zorunlu teknik ve mimari standartları belirler.

---

## 1. 🏗️ Teknoloji Yığını ve İzolasyon Kuralları
- **Çekirdek**: Next.js 16 (App Router, Turbopack, React 19, Node.js).
- **Stil & Tasarım**: Tailwind CSS + Vanilla CSS.
- **Backend & Veritabanı**:
  - **Supabase**: PostgreSQL ilişkisel tabloları (`orders`, `current_accounts`, `cari_hareketler`), Supabase Realtime (`postgres_changes`, `courier-live-location` broadcast).
  - **Firebase**: Firestore, Cloud Functions (Node.js 22), Firebase Storage, Firebase Auth.
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
- **Foreign Key Bütünlüğü & Cari Silme**: `current_accounts` tablosundan bir cari silinmeden önce mutlaka ilişkili `account_transactions` (`account_id = id`) kayıtları silinmelidir.
- **Storno (Ters Kayıt)**: Muhasebe hareketleri doğrudan silinmez; iptal edilen veya düzeltilen işlemler ters kayıt oluşturularak muhasebeleştirilir.
- **Ardışık Fiş Numaralandırması**: Finansal tahsilat/ödeme hareketleri `FİŞ-YYMM-XXX` formatında ardışık üretilir.
- **Kağıt & Baskı CSS Koruma Kuralı**: Fiş ve ekstrelerin PNG/PDF çıktılarında yazıların ve rakamların yarısının kesilmesini önlemek için:
  - Taşma yapan kartlar için `overflow-hidden` yerine `overflow-visible`,
  - Rakamlar ve metinler için yeterli alt padding (`pb-1` / `leading-normal`),
  - `html2canvas` render işleminde `scale: 2` veya `window.devicePixelRatio` ayarları korunmalıdır.

---

## 5. 🧪 Derleme & Doğrulama Zorunluluğu
- Her kod değişikliği sonrasında **`npm run build`** çalıştırılarak tüm rotaların (App Router) ve TypeScript türlerinin 0 hata ile derlendiği doğrulanmalıdır.

---

## 6. 🔐 Güvenlik, API Yetkilendirme & Eşzamanlılık (Concurrency) Kuralları
- **Service Role'e Doğrudan Güvenilemez**: `createAdminClient()` kullanan tüm API rotalarında token ve rol doğrulaması [`src/lib/security/apiAuth.ts`](file:///f:/ekmeklab_app/src/lib/security/apiAuth.ts) üzerinden `verifyApiAuth(req)` ile yapılmalıdır. İstemci body'sinde gelen `isAdmin`, `cancelledBy: "admin"` vb. alanlara asla güvenilmez.
- **Atomik Cari Finans Yönetimi**: Cari bakiye ve hareket işlemleri için eski `adjust_cari_balance` DEĞİL, PostgreSQL tarafında tek transaction'da çalışan atomik `record_cari_transaction_atomic` RPC fonksiyonu kullanılmalıdır.
- **Optimistic Locking (İyimser Kilitleme)**: Sipariş durumu güncellemelerinde TOCTOU (Time-of-check to time-of-use) ve yarış durumlarını önlemek için UPDATE sorgusuna `.eq("status", currentStatus)` koşulu eklenmeli ve 0 satır güncellendiğinde 409 Conflict dönülmelidir.
- **Kurye Canlı Konum İzolasyonu**: Realtime broadcast kanalları global olarak değil, kurye bazında izole (`courier-location-${courierId}`) açılmalı ve unmount/stop anında `supabase.removeChannel(channel)` ile kapatılmalıdır.
- **Halka Açık Takip ve Veri Minimizasyonu**: Misafir ve halka açık sipariş takibinde (`/api/orders/[id]`), yetkisiz sorgularda finansal toplamlar (`total_amount`, `subtotal`, `shipping_fee`) `null` olarak maskelenmeli, ürün fiyatları yanıttan soyulmalı ve IP/telefon rate limiting uygulanmalıdır.
- **Ardışık Sipariş Numaralandırma**: Manuel ve otomatik siparişlerde `Date.now()` veya `Math.random()` kullanılmaz; ID için `crypto.randomUUID()`, sipariş numarası için veritabanı `generate_order_number()` RPC fonksiyonu kullanılır (`SIP-YYMM-XXX`).

