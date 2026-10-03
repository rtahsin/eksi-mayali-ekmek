# EkmekLab Yol Haritası (Denetim Sonucu)

Tarih: 2026-10-03 · Yöntem: statik kod ve doküman incelemesi (uygulama çalıştırılmadı, `npm run build` henüz koşulmadı).

## 1. Hedef (Tahsin ile konuşulan)
- Marka kimliği + sipariş alan site: "zanaat ve bilim" hikâyesi, 8 yıllık maya, özel reçeteler.
- Önce **Beylikdüzü içi teslimat** (şimdilik Tahsin kendi teslim ediyor, ileride kurye olabilir).
- Model: haftanın belirli günü / ön siparişle sınırlı özel reçeteler + gurme eşlikçiler; tek ekmek yerine paket.
- Kargo ve çavdar ürünü sonra; başlangıçta Shopier yeterli.
- Mevcut toptan müşteri: 2 şarküteri, günlük ~30 ekmek (uygulamada hafif takip yeterli).
- Yayın zamanı: "hazır olunca".

## 2. Bulgular

### Acil (yayından önce)
1. **`.env` git'e girmiş.** İçinde `GMAIL_USER`, `GMAIL_PASSWORD`, `ADDRESS_SYNC_TOKEN` var (değerler gerçek görünüyor). `.gitignore`'da olmasına rağmen eski bir commit'te (c847224) eklenmiş. Yapılacak: Gmail uygulama şifresini iptal edip yenile, token'ı yenile, dosyayı git takibinden çıkar. (Geçmişte kaldığı için repo özel kalmalı.)
2. **Gerçek ödeme yok.** `credit_card` sadece bir etiket; iyzico/PayTR entegrasyonu bulunmuyor. Başlangıç için "kapıda ödeme / IBAN-havale / WhatsApp onayı" yeterli olabilir; online kart sonra.
3. **Ruhsat / vergi durumu.** İmalathane ruhsatsız, şirket yok. Reklam ve halka açık satıştan önce İlçe Tarım Müdürlüğü ve mali müşavirle görüşülmeli (bu kod değil, iş).

### Sadeleştirme
4. **Firebase kalıntıları:** `useAdminAuth`, `serverAuth`, `src/lib/firebase/*`, ürün görselleri Firebase Storage'da. Docs hâlâ "Firebase Auth + Storage" diyor. Karar: görselleri Supabase Storage'a taşı, Firebase'i tamamen kaldır (veya bilinçli şekilde tut).
5. **Fazla ağır modüller:** kurye konsolu, cari/finans/kasa/tedarikçi/gider sayfaları. Tek kişilik operasyon için çoğu gereksiz. Önerilen: kurye = basit "bugünün teslimat listesi" (yol tarifi, ara, WhatsApp, teslim edildi); finans = 2 şarküteri için basit bakiye. Geri kalanı gizle/arşivle.
6. **Doküman kirliliği:** ~25 doküman, çoğu eski (Flutter, Mart 2026) ve çelişkili. `OTONOM_DEGERLENDIRME_RAPORU.md` "%100 güvenli" diyor; bu iddia doğrulanmış değil. Tek bir güncel README + bu yol haritası yeter; eskiler `docs/arsiv/` altına.
7. Repoda gereksiz dosyalar izleniyor: `firebase-debug.log`, `playwright-report/`, `test-results/`.
8. Kodda `any` kullanımı var (`useAdminAuth.ts:280`, `useFinans.ts`) ve AGENTS.md bunu yasaklıyor. Düşük öncelik.

### Eksik (hedef için)
9. **Haftalık ön sipariş akışı:** "bu haftanın fırını", kalan adet, sipariş kapanış/teslim günü. Cutoff saati mekanizması hazır, üzerine kurulabilir.
10. **Paket / eşlikçi ürünler:** ekmek + tereyağı/reçel gibi bundle ve minimum sepet tutarı.
11. **Marka sayfaları:** hikâye, süreç, reçete notları (kütüphane bölümü temel olarak var). Görsel iyileştirme ve gerçek fotoğraf/video.
12. **E-posta/WhatsApp liste toplama**, Instagram bağlantısı, basit analitik.
13. Yasal sayfalar var (KVKK, gizlilik, mesafeli satış); ruhsat/vergi bilgisi netleşince içerikleri güncellenmeli.

## 3. Önerilen sıra

**Aşama 0 – Güvenlik ve temizlik (1-2 gün)**
- `.env` temizliği ve şifre yenileme, gereksiz dosyaların takipten çıkarılması.
- `npm install` + `npm run build` ile derleme durumunu doğrula; canlı Supabase bağlantısını kontrol et.
- Eski dokümanları arşivle.

**Aşama 1 – Çekirdek akışı sağlamlaştır (3-5 gün)**
- Ürün → sepet → sipariş → admin'de görme → teslim edildi akışını uçtan uca test et.
- Firebase bağımlılığını kaldır, görselleri Supabase Storage'a taşı.
- Ödeme: kapıda ödeme + IBAN/havale bilgisi; kart ödemesi sonraya.

**Aşama 2 – Hedef modele uyarla (1 hafta)**
- Haftalık ön sipariş ve kalan adet göstergesi.
- Paket/eşlikçi ürünler ve minimum sepet.
- Kurye konsolunu basit teslimat listesine indir.

**Aşama 3 – Marka ve yayın (1-2 hafta)**
- Ana sayfa hikâye ve görsel yenileme (tasarım alternatifleri birlikte denenir).
- Gerçek fotoğraflar, SEO, liste toplama.
- Yayın öncesi kontrol listesi (ruhsat/vergi, yasal metinler, test siparişleri).

**Sonra:** Shopier ile kargo denemesi, çavdar ürünü, online kart ödemesi.

## 4. Açık sorular
- Görsel kimlik: mevcut koyu kahve/altın tema mı, alternatifler mi denensin?
- Hangi ürünler ilk haftalık sürümde olacak, eşlikçiler neler?
- Teslimat günleri ve bölge sınırı (Beylikdüzü'nün hangi mahalleleri)?
