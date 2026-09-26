# 🍞 EkmekLab Uçtan Uca Sipariş ve Teslimat Sistemi Smoke Test Checklist

Bu kontrol listesi, EkmekLab artisan taş fırın platformunda geliştirilen uçtan uca sipariş, kurye dağıtım, canlı konum ve finansal mutabakat modüllerinin canlıya alınmadan önce doğrulanması için hazırlanmıştır.

---

## 1. 🛒 Müşteri Akışı (Storefront & Takip)

- [ ] **Sipariş Verme:**
  - [ ] Sepete ürün ekleme ve miktar artırma/azaltma sorunsuz çalışıyor.
  - [ ] Teslimat ücreti doğru hesaplanıyor (1000 TL ve üzeri kurye ücretsiz, altı 150 TL).
  - [ ] Adres formu (Beylikdüzü mahalleleri, açık adres, zil notu) eksiksiz doğrulanıyor.
- [ ] **KVKK Uyumlu Canlı Konum Paylaşımı:**
  - [ ] Konum izni modalı (`LocationConsentModal`) artisan estetiğinde açılıyor.
  - [ ] "Onayla" tıklandığında tarayıcı GPS izni isteniyor ve koordinatlar `orders` ve `customer_locations` tablolarına kaydediliyor.
  - [ ] "Hayır" tıklandığında sipariş olağan akışında devam ediyor (konum paylaşımı zorlanmıyor).
- [ ] **Canlı Sipariş Takip Ekranı (`/siparis-takip/[id]`):**
  - [ ] Fırın aşamaları (Bekliyor → Hazırlanıyor → Fırında → Kuryede → Teslim Edildi) doğru aktifleşiyor.
  - [ ] Sipariş durumu admin veya kurye tarafından değiştirildiğinde sayfa yenilenmeden Realtime olarak güncelleniyor.
  - [ ] Sipariş zaman çizelgesi (`order_status_history`) denetim iziyle birlikte adım adım görüntüleniyor.
  - [ ] `kuryede` aşamasında kurye canlı GPS radarı ve müşteriye olan mesafe görüntüleniyor.
  - [ ] Canlı konum paylaşımı toggle butonu ile dilediği an durdurulup tekrar açılabiliyor.
  - [ ] Sipariş `bekliyor` durumundayken "Siparişi İptal Et" butonu çıkıyor ve onay sonrası iptal ediliyor.
  - [ ] Sipariş `hazirlaniyor` ve sonrasına geçtiğinde doğrudan iptal butonu gizlenip fırın telefon numarası gösteriliyor.
- [ ] **Geçmiş Siparişlerim (`/hesabim/siparisler`):**
  - [ ] Giriş yapmamış kullanıcıyı login modalına yönlendiriyor.
  - [ ] Müşteri yalnızca kendi verdiği siparişleri görüyor (IDOR koruması).
  - [ ] Durum filtreleri (Tümü, Yoldakiler, Tamamlananlar, İptaller) çalışıyor.
  - [ ] Her karttan tek tıkla `/siparis-takip/[id]` ekranına geçilebiliyor.

---

## 2. ⚡ Admin Paneli Masaları

- [ ] **Sipariş Masası (`/admin/siparisler`):**
  - [ ] Sipariş kartlarında `order_number` (`SIP-YYMM-XXX` formatında) görünüyor.
  - [ ] Atanmış kurye adı rozeti ve ödeme durumu rozeti (Ödendi / Bekliyor / Kapıda) görünüyor.
  - [ ] "Ödemesi Bekleyen" ve "Kuryeye Atanmamış" hızlı filtre butonları listeyi süzüyor.
  - [ ] Üst istatistik şeridinde bekleyen tahsilat tutarı doğru toplanıyor.
- [ ] **Sipariş Detay Ekranı (`/admin/siparisler/[id]`):**
  - [ ] Müşteri bilgileri, tek tıkla telefon arama ve açık adres kopyalama çalışıyor.
  - [ ] Eğer müşteri canlı konum paylaşmışsa "Müşteri Konumunu Haritada Aç" derin linki çalışıyor.
  - [ ] "Kuryeye Ata" dropdown'ı ile sipariş anında kuryeye verilebiliyor.
  - [ ] "Ödeme Kaydet" butonu ile `PaymentRecordModal` açılıyor (tam, kısmi, cari).
  - [ ] Durum geçmişi zaman çizelgesi kimin hangi saatte değiştirdiğini listeliyor.
- [ ] **Kurye Dağıtım & Rota Masası (`/admin/siparisler/dagitim`):**
  - [ ] Beylikdüzü coğrafi güzergahına göre tek tıkla otomatik sıralama (`handleAutoSortBeylikduzu`) çalışıyor.
  - [ ] Durak sırası yukarı/aşağı oklarla düzenlenebiliyor ve `localStorage`'da korunuyor.
  - [ ] Kurye Görev Yükü şeridinde her kuryenin bugünkü toplam paket, teslim edilen ve bekleyen sayısı canlı görünüyor.
  - [ ] Checkbox ile çoklu sipariş seçilip tek tıkla istenen kuryeye atanabiliyor.
  - [ ] "🚀 Hepsini Yola Çıkar" butonu ile toplu kurye seçimi yapılarak siparişler `kuryede` durumuna alınıyor.
- [ ] **Kurye Filosu Yönetimi (`/admin/kurye/yonetim`):**
  - [ ] Yeni kurye ekleme, düzenleme, aktif/pasif toggle çalışıyor.
  - [ ] Vardiya aç/kapa toggle'ı realtime olarak kuryeyi aktife alıyor.
- [ ] **Müşteri Detay ve Davranış Geçmişi (`/admin/musteriler/[id]`):**
  - [ ] Müşteri kartında toplam harcama, toplam sipariş sayısı ve ortalama sepet analitiği doğru hesaplanıyor.
  - [ ] Favori ürünler en çok sipariş edilenden azalan sırada listeleniyor.
  - [ ] Tüm sipariş geçmişi ve hızlı sipariş oluşturma butonu çalışıyor.

---

## 3. 🛵 Kurye Mobil Konsolu (`/kurye`)

- [ ] **Kurye Konsolu Girişi & Filtre:**
  - [ ] Üst bardan aktif kurye seçilebiliyor (varsayılan: oturum açan veya ilk aktif kurye).
  - [ ] Yalnızca ilgili kuryeye atanmış ve teslimat tarihi eşleşen siparişler listeleniyor.
- [ ] **Canlı GPS Konum Yayını:**
  - [ ] "GPS Başlat" tıklandığında kurye koordinatları `watchPosition` ile alınıyor.
  - [ ] Supabase Realtime `courier-live-location` kanalına anlık broadcast yapılıyor.
  - [ ] `couriers` tablosundaki `current_lat`, `current_lng` 10 saniyede bir güncelleniyor.
- [ ] **Rota ve Durak Sıralaması:**
  - [ ] Kurye durakları yukarı/aşağı oklarla yeniden sıralayabiliyor. Sıralama cihazda saklanıyor.
  - [ ] Müşteri canlı konum paylaşıyorsa kartta "Canlı Konuma Git" butonu çıkıyor ve tam koordinata harita açıyor.
  - [ ] Tek tıkla telefon arama ve otomatik doldurulmuş WhatsApp mesajı linki çalışıyor.
- [ ] **Teslimat & Hızlı Tahsilat Onayı:**
  - [ ] "Teslim Edildi Olarak Onayla" tıklandığında hızlı tahsilat alt penceresi açılıyor.
  - [ ] "Kapıda Nakit", "Mobil POS", "Ödenmedi / Krediye Kaldı", "Cari / Önceden Ödendi" seçeneklerinden biri seçildiğinde `payments` tablosuna INSERT yapılıyor.
  - [ ] Cihazda haptik titreşim (`navigator.vibrate`) tetikleniyor.
  - [ ] Sipariş `teslim_edildi` olarak güncelleniyor ve otomatik olarak bir sonraki durağa geçiliyor.
- [ ] **Gün Sonu WhatsApp Raporu:**
  - [ ] "Tahsin Usta'ya Gün Sonu Kasa Raporunu Gönder" tıklandığında toplanan nakit, çekilen POS ve teslim edilen paket sayıları hazır WhatsApp metnine dönüştürülüyor.

---

## 4. 💰 Finans, Z Raporu ve Muhasebe Uyumu

- [ ] **Kurye Z Raporu (`/admin/finans/kurye`):**
  - [ ] Rakamlar `payments` tablosu üzerinden çekiliyor.
  - [ ] Nakit tahsilat ve mobil POS toplamları sipariş kalemleriyle kuruşu kuruşuna uyuşuyor.
  - [ ] "Kuryenin Teslim Ettiği Nakit" kutusuna tutar girildiğinde kasa farkı (açık/fazla/tam) hesaplanıyor.
  - [ ] Z Raporu termal fiş formatında yazdırılabiliyor (`CourierSettlementModal`).
  - [ ] Gün sonu kasa mutabakatı WhatsApp ile fırıncıya iletilebiliyor.
- [ ] **B2B Cari Otomatik Borçlandırma:**
  - [ ] Cari müşteriye ait sipariş teslim edildiğinde `account_transactions` tablosuna otomatik `satis` (borç) hareketi yazılıyor.
  - [ ] Simetrik bakiye kuralı korunuyor: Borç bakiyeyi artırıyor, tahsilat bakiyeyi düşürüyor.
  - [ ] Tahsilat alındığında `account_transactions` tablosuna `tahsilat` hareketi yazılıyor ve `payments.cari_transaction_id` ile eşleşiyor.

---

## 5. 🔒 KVKK, Güvenlik ve Cron Temizliği

- [ ] **72 Saatlik Konum Temizleme:**
  - [ ] `/api/cron/cleanup-locations` endpoint'i `CRON_SECRET` ile korunuyor.
  - [ ] 72 saatten eski `customer_locations` kayıtları siliniyor.
  - [ ] 72 saatten önce teslim edilmiş/iptal edilmiş siparişlerin `customer_lat`, `customer_lng` sütunları NULL'a çekiliyor.
- [ ] **Aydınlatma Metni:**
  - [ ] `/kvkk#konum-verisi` doğrudan canlı konum aydınlatma bölümüne atlıyor.
