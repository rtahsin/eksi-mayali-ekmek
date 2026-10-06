# 🍞 EkmekLab — Uçtan Uca Sipariş, Kurye Dağıtım & Canlı Takip Sistemi Master Rehberi

Bu belge; EkmekLab artisan taş fırın e-ticaret platformunda geliştirilen **Sipariş Yaşam Döngüsü**, **WhatsApp Entegrasyonu**, **Beylikdüzü Kurye Rota Planlama**, **Kurye Mobil Konsolu**, **Canlı GPS Takibi**, **Kurye Kasa & Z Raporu Mutabakatı** ve **Smoke Test Kontrol Listesi**ni tek bir çatı altında birleştiren ana sistem kılavuzudur.

---

## 📑 İÇİNDEKİLER

1. [Sistem Özeti & Chat Sürecinde Yapılanlar](#1-sistem-özeti--chat-sürecinde-yapılanlar)
2. [Sipariş Sürecinin Çift Taraflı Yolculuğu (Müşteri & Fırıncı)](#2-sipariş-sürecinin-çift-taraflı-yolculuğu-müşteri--fırıncı)
3. [Uçtan Uca Mimari Akış Şeması](#3-uçtan-uca-mimari-akış-şeması)
4. [Sipariş Statü Makinesi (Order Lifecycle Pipeline)](#4-sipariş-statü-makinesi-order-lifecycle-pipeline)
5. [Sipariş Giriş Kanalları & Sipariş Masası](#5-sipariş-giriş-kanalları--sipariş-masası)
6. [Beylikdüzü Lojistik Güzergahı & Dağıtım Masası](#6-beylikdüzü-lojistik-güzergahı--dağıtım-masası)
7. [Kurye Mobil Konsolu (`/kurye`)](#7-kurye-mobil-konsolu-kurye)
8. [Müşteri Canlı Takip Ekranı & Konum Paylaşımı (`/siparis-takip/[id]`)](#8-müşteri-canlı-takip-ekranı--konum-paylaşımı-siparis-takipid)
9. [Kurye Finansı, Z Raporu & Cari Mutabakat](#9-kurye-finansı-z-raporu--cari-mutabakat)
10. [Veritabanı Şeması, Realtime & KVKK Güvenliği](#10-veritabanı-şeması-realtime--kvkk-güvenliği)
11. [Uçtan Uca Sipariş Sistemi Smoke Test Checklist](#11-uçtan-uca-sipariş-sistemi-smoke-test-checklist)
12. [Sistem Güvenliği, RLS, Finansal Tutarlılık ve Mimari Denetim](#12-sistem-güvenliği-rls-finansal-tutarlılık-ve-mimari-denetim)

---

## 1. Sistem Özeti & Chat Sürecinde Yapılanlar

Bu geliştirme oturumunda EkmekLab platformunun eksiksiz ve üretim standartlarında çalışan sipariş ve teslimat altyapısı inşa edilmiştir:

### A. Uçtan Uca 35 Görevlik Geliştirme Planı Tamamlandı
1. **Veritabanı & Altyapı**: Supabase üzerinde `couriers`, `courier_locations`, `customer_locations`, `payments`, `order_status_history` tabloları kuruldu. `orders` ve `order_items` şemaları dağıtım ve ödeme alanlarıyla genişletildi.
2. **Müşteri Deneyimi**:
   - KVKK uyumlu konum izin modalı (`LocationConsentModal.tsx`) geliştirildi.
   - Canlı sipariş ve radar takip sayfası ([`/siparis-takip/[id]`](file:///f:/ekmeklab_app/src/app/siparis-takip/%5Bid%5D/page.tsx)) kuruldu.
   - Giriş yapmış müşterilerin siparişlerini görebileceği `Geçmiş Siparişlerim` ([`/hesabim/siparisler`](file:///f:/ekmeklab_app/src/app/hesabim/siparisler/page.tsx)) sayfası bağlandı.
3. **Admin Masaları**:
   - Sipariş ana masası ([`/admin/siparisler`](file:///f:/ekmeklab_app/src/app/admin/siparisler/page.tsx)), detay sayfası ([`/admin/siparisler/[id]`](file:///f:/ekmeklab_app/src/app/admin/siparisler/%5Bid%5D/page.tsx)) ve tahsilat modalı (`PaymentRecordModal.tsx`) oluşturuldu.
   - Beylikdüzü mahalle rotasına göre otomatik sıralama yapan **Dağıtım Masası** ([`/admin/siparisler/dagitim`](file:///f:/ekmeklab_app/src/app/admin/siparisler/dagitim/page.tsx)) ve **Termal Toplu Paket Etiketi / Fiş Basım** modülleri (`BulkLabelsModal.tsx`, `OrderSlipModal.tsx`) kodlandı.
   - Serbest metinleri algılayan **Akıllı WhatsApp Sipariş Ayrıştırıcı** (`WhatsAppOrderParserModal.tsx`) ve hızlı sipariş girişi ([`/admin/siparisler/yeni`](file:///f:/ekmeklab_app/src/app/admin/siparisler/yeni/page.tsx)) devreye alındı.
   - Kurye filosu yönetim masası ([`/admin/kurye/yonetim`](file:///f:/ekmeklab_app/src/app/admin/kurye/yonetim/page.tsx)) ve Müşteri Detay / CRM ekranı ([`/admin/musteriler/[id]`](file:///f:/ekmeklab_app/src/app/admin/musteriler/%5Bid%5D/page.tsx)) hayata geçirildi.
4. **Kurye Mobil Konsolu & Saha Dağıtımı**:
   - Kurye için tek elle kullanıma uygun PWA konsolu ([`/kurye`](file:///f:/ekmeklab_app/src/app/kurye/page.tsx)), canlı GPS yayını (`courier-live-location` kanalı), tek tıkla Google/Apple/Yandex navigasyon yönlendirmesi, haptik titreşimli teslimat onayı ve Tahsin Usta'ya gün sonu WhatsApp kasa raporu aktarımı yapıldı.
5. **Kurye Finansı & Muhasebe Entegrasyonu**:
   - Gün sonu kasa mutabakat masası ([`/admin/finans/kurye`](file:///f:/ekmeklab_app/src/app/admin/finans/kurye/page.tsx)), Z Raporu termal çıktısı (`CourierSettlementModal.tsx`), otomatik B2B cari borçlandırma ve 72 saatlik KVKK konum temizleme cron servisi ([`/api/cron/cleanup-locations`](file:///f:/ekmeklab_app/src/app/api/cron/cleanup-locations/route.ts)) yazıldı.

### B. "Atölyeden Gel-Al" Seçeneğinin Tamamen Kaldırılması
Kullanıcı direktifi doğrultusunda fırının yalnızca kapıya teslimat modeliyle çalıştığı netleştirilmiş; "Atölyeden Gel-Al" / "pickup" seçeneği sistemin tüm bileşenlerinden arındırılmıştır:
- Sepet çekmecesinde (`CartDrawer.tsx`) "Gel-Al" butonu kaldırılmış, yerine sabit artisan rozeti konulmuştur: `🛵 Beylikdüzü Fırın Kuryesi - KAPINIZA TESLİM`.
- Kargo kuralı standartlaştırılmıştır: **1.000 TL ve üzeri siparişlerde kurye ücretsiz**, **1.000 TL altı siparişlerde 150 TL kurye ücreti** uygulanır.
- Admin sipariş giriş formu ve sipariş API'si tüm siparişleri koşulsuz olarak `"courier"` teslimat tipinde işlemektedir.
- Mesafeli Satış Sözleşmesi ve Gizlilik Politikası yasal metinleri güncellenmiştir.
- `npm run build` doğrulaması yapılmış ve 43 rotanın tamamı 0 TypeScript hatasıyla derlenmiştir.

---

## 2. Sipariş Sürecinin Çift Taraflı Yolculuğu (Müşteri & Fırıncı)

EkmekLab'da ekşi mayalı ekmeklerin 24-36 saatlik fermantasyon gereksinimine uygun olarak tasarlanan operasyonel yolculuk:

```
[Müşteri Siparişi Verir] ──> [Üretim Planlama & Soğuk Fermantasyon] ──> [Taş Fırında Pişirme]
         │                                                                   │
         ▼                                                                   ▼
[SMS/WhatsApp Canlı Link]                                           [Paketleme & Rota Sıralama]
         │                                                                   │
         ▼                                                                   ▼
[Kurye Canlı Radar Takibi] <── [Kurye Mobil Konsolu (GPS Aktif)] <── [Toplu Yola Çıkar (kuryede)]
         │                                     │
         ▼                                     ▼
[Kapıda Sıcak Teslimat] <───────────── [Kapıda Tahsilat (Nakit/POS)]
         │                                     │
         ▼                                     ▼
[Afiyet Olsun! Deneyimi]               [Gün Sonu Kurye Z Raporu & Kasa Kapatma]
```

### 1. Aşama: Siparişin Verilmesi ve Sisteme Düşmesi
* **Müşteri Açısından**:
  - Müşteri siteye girer, sepetine ekşi mayalı artisan ekmeklerini ekler.
  - Sepette kargo baremini görür (1.000 TL üzeri kurye bedava, altı 150 TL).
  - Adres bilgilerini girerken KVKK aydınlatmalı artisan modal açılır: *"Kuryemizin sizi kapıda bekletmemesi için canlı konumunuzu fırınımızla paylaşmak ister misiniz?"*. İzin verirse GPS koordinatı siparişe eklenir, vermezse standart adresle devam eder.
  - Sipariş onaylandığında müşteriye özel bir takip linki üretilir: `ekmeklab.tr/siparis-takip/[id]`.
* **Fırıncı Açısından**:
  - Sipariş admin paneline ([`/admin/siparisler`](file:///f:/ekmeklab_app/src/app/admin/siparisler/page.tsx)) `SIP-2609-XXX` numarasıyla düşer.
  - Eğer sipariş WhatsApp'tan serbest metin olarak gelmişse, fırıncı metni kopyalayıp **WhatsApp Sipariş Ayrıştırıcı**'ya yapıştırır; sistem adresi, mahalleyi ve ekmek adetlerini saniyeler içinde ayrıştırıp rotaya ekler.

### 2. Aşama: Üretim ve Fırınlama (Gece / Sabah Vardiyası)
* **Fırıncı Açısından**:
  - Fırıncı [`/admin/uretim`](file:///f:/ekmeklab_app/src/app/admin/uretim/page.tsx) ekranını açar. Sistem o gün teslim edilecek tüm siparişleri un ve tahıl türlerine göre toplar (örn: 24 adet Karakılçık, 12 adet Siyez, 8 adet Baget).
  - Statü `hazirlaniyor`'a çekildiğinde hamurlar yoğrulur ve sepette soğuk fermantasyona alınır.
  - Sabah taş tabanlı fırın yakıldığında fırıncı tek tuşla siparişleri `firinda` statüsüne alır.
* **Müşteri Açısından**:
  - Takip ekranındaki dairesel fırın göstergesi aydınlanır: *"Ekşi mayalı ekmekleriniz taş fırında meşe odunu ateşinde pişiriliyor."*

### 3. Aşama: Rota Planlama ve Paketleme
* **Fırıncı Açısından**:
  - Ekmekler fırından çıkıp soğumaya alındığında [`/admin/siparisler/dagitim`](file:///f:/ekmeklab_app/src/app/admin/siparisler/dagitim/page.tsx) masası açılır.
  - Fırıncı **"Beylikdüzü Rota Sırasına Göre Diz"** butonuna basar. Sistem coğrafi sıraya göre durakları dizer (Yakuplu → Marmara → Barış → Cumhuriyet → Büyükşehir → Adnan Kahveci → Gürpınar → Dereağzı → Kavaklı → Sahil).
  - **"Toplu Paket Etiketi Bas"** butonuyla termal rulo etiketler (müşteri adı, içerik, adres, QR) saniyeler içinde çıkartılır ve kraft keselere yapıştırılır.
  - Siparişler seçilip aktif kuryeye zimmetlenir ve **"🚀 Hepsini Yola Çıkar"** butonuna basılarak topluca `kuryede` statüsüne alınır.

### 4. Aşama: Kurye Dağıtımı ve Canlı Takip
* **Kurye Açısından**:
  - Kurye telefonundan [`/kurye`](file:///f:/ekmeklab_app/src/app/kurye/page.tsx) konsolunu açar.
  - **"GPS Başlat"** butonuna basar. Cihaz arka planda koordinatlarını şifreli realtime yayınıyla göndermeye başlar.
  - Sıradaki sipariş kartına bakar; tek tıkla müşterinin canlı konumuna Google Maps, Apple Maps veya Yandex Navigasyon rotası başlatır.
  - Binaya vardığında gerekiyorsa konsoldan tek tıkla arama yapar veya otomatik WhatsApp mesajı gönderir.
* **Müşteri Açısından**:
  - Takip ekranında kurye radarı devreye girer: *"Kuryeniz yola çıktı, ortalama 12 dakika içinde kapınızda!"*.
  - Harita üzerinde fırın kuryesinin canlı yaklaşımını izler.

### 5. Aşama: Teslimat ve Tahsilat
* **Kurye Açısından**:
  - Kurye paketi teslim ettiğinde konsoldaki büyük yeşil **"Teslim Ettim"** butonuna basar.
  - Hızlı ödeme penceresi açılır: *"Nakit alındı"*, *"Mobil POS çekildi"*, *"Online ödendi"* veya *"Cari hesaba yaz"*.
  - Ödeme tipi seçildiğinde cihaz haptik olarak onay titreşimi (`vibrate`) verir, kayıt sisteme işlenir ve konsol bir sonraki adrese odaklanır.
* **Müşteri Açısından**:
  - Ekranda konfeti/kutlama kartı belirir: *"Afiyet Olsun! Taş fırından taptaze çıkan ekmekleriniz kapınıza teslim edildi."*

### 6. Aşama: Gün Sonu Kasa Kapatma ve Z Raporu
* **Kurye Açısından**:
  - Dağıtım bitince kurye konsolun altındaki **"Tahsin Usta'ya Gün Sonu Raporu Gönder"** butonuna tıklar. WhatsApp açılır ve toplanan nakit, çekilen POS ve teslim edilen paket sayısı hazır formatta fırıncıya iletilir.
* **Fırıncı Açısından**:
  - Fırıncı [`/admin/finans/kurye`](file:///f:/ekmeklab_app/src/app/admin/finans/kurye/page.tsx) ekranını açar. Kuryenin teslim ettiği nakdi sayarak sisteme girer; kasa farkı (tam/eksik/fazla) denetlenir ve tek tıkla termal **Kurye Z Raporu** bastırılarak kasa kapatılır. Cari siparişlerin borcu müşteri ekstrelerine otomatik yansır.

---

## 3. Uçtan Uca Mimari Akış Şeması

```mermaid
flowchart TD
    subgraph MUSTERI_KANALI [1. Müşteri & Giriş Kanalları]
        A1[Online Sepet / EkmekLab Web]
        A2[WhatsApp Serbest Metin Siparişi]
        A3[Telefon / B2B Cari Siparişi]
    end

    subgraph SISTEM_GIRIS [2. API & Sipariş Kabul]
        B1[/api/orders/create]
        B2[WhatsAppOrderParserModal]
        B3[/admin/siparisler/yeni]
        DB[(Supabase DB: orders, order_items)]
    end

    MUSTERI_KANALI --> SISTEM_GIRIS
    A1 --> B1 --> DB
    A2 --> B2 --> DB
    A3 --> B3 --> DB

    subgraph FIRIN_OPERASYON [3. Üretim & Dağıtım Masası]
        C1[/admin/siparisler - Sipariş Masası]
        C2[/admin/uretim - Hamur & Fırınlama]
        C3[/admin/siparisler/dagitim - Beylikdüzü Rota Masası]
        C4[BulkLabelsModal - Termal Etiket Basımı]
        C5[OrderSlipModal - Teslimat Fişi Basımı]
    end

    DB --> C1 --> C2 --> C3
    C3 --> C4
    C3 --> C5

    subgraph KURYE_SAHA [4. Kurye Mobil Konsolu /kurye]
        D1[GPS Canlı Takip: watchPosition]
        D2[Harita Navigasyonu: Google / Apple / Yandex]
        D3[Hızlı Tahsilat Onayı: Nakit / POS / Cari]
        D4[Haptik Titreşim: navigator.vibrate]
    end

    C3 -->|Toplu Yola Çıkar / kuryede| D1
    D1 --> D2 --> D3 --> D4

    subgraph REALTIME_YAYIN [5. Realtime İletişim Hattı]
        RT1[courier-live-location Broadcast]
        RT2[order-track-ID Postgres Changes]
    end

    D1 -.-> RT1
    D3 -.-> RT2

    subgraph MUSTERI_TAKIP [6. Canlı Müşteri Deneyimi]
        E1[/siparis-takip/id - Canlı Radar & ETA]
        E2[/hesabim/siparisler - Sipariş Geçmişi]
    end

    RT1 -.-> E1
    RT2 -.-> E1
    DB -.-> E2

    subgraph FINANS_KASA [7. Finans & Kasa Mutabakatı]
        F1[/admin/finans/kurye - Kurye Kasa Masası]
        F2[CourierSettlementModal - Termal Z Raporu]
        F3[account_transactions - Otomatik Cari Borçlandırma]
        F4[/api/cron/cleanup-locations - 72 Saatlik KVKK Temizliği]
    end

    D3 --> F1
    F1 --> F2
    F1 --> F3
    DB --> F4
```

---

## 4. Sipariş Statü Makinesi (Order Lifecycle Pipeline)

Sistemdeki tüm sipariş durumları `src/types/admin.ts` ve `useAdminOrders.ts` kancasında normalize edilmiştir:

| Statü Kodu (`status`) | UI Rozet Başlığı | Açıklama & İş Mantığı | Değiştirebilen Roller |
| :--- | :--- | :--- | :--- |
| `bekliyor` | 🟡 Sipariş Alındı | Sipariş sisteme ulaştı, onay bekliyor. Müşteri bu aşamada tek tıkla iptal edebilir. | Müşteri, Admin |
| `hazirlaniyor` | 🟠 Hazırlanıyor | Hamur yoğruldu, soğuk fermantasyona alındı. Müşteri doğrudan iptal edemez, fırını aramalıdır. | Admin (Fırıncı) |
| `firinda` | 🔥 Taş Fırında Pişiyor | Ekmekler taş tabanlı fırına verildi. | Admin (Fırıncı) |
| `kuryede` | 🛵 Kuryede / Dağıtımda | Paketler kurye aracına yüklendi, kurye canlı GPS yayını başladı. | Admin, Kurye |
| `teslim_edildi` | 🟢 Teslim Edildi | Kurye adreste paketi teslim etti, tahsilat kaydedildi. | Kurye, Admin |
| `iptal` | ⚪ İptal Edildi | Gerekçesi `cancel_reason` sütununda tutularak sonlandırılan sipariş. | Müşteri (ilk aşama), Admin |

---

## 5. Sipariş Giriş Kanalları & Sipariş Masası

### A. Online Web Siparişleri
- Sepet çekmecesi ([`CartDrawer.tsx`](file:///f:/ekmeklab_app/src/components/cart/CartDrawer.tsx)) üzerinden müşteri ad, telefon, Beylikdüzü mahallesi, açık adres ve zil notu bilgilerini girer.
- Kargo baremi kuralı: 1.000 TL ve üzerine ücretsiz teslimat, 1.000 TL altına 150 TL kurye teslimat ücreti uygulanır.
- `/api/orders/create` uç noktası `orders` ve `order_items` tablolarına atomik kayıt atar.

### B. Akıllı WhatsApp Sipariş Ayrıştırıcı (`WhatsAppOrderParserModal.tsx`)
- WhatsApp Web'den gelen serbest müşteri mesajı yapıştırıldığında çalışan yapay zeka/sezgisel ayrıştırıcıdır.
- Örnek: *"Selam Tahsin Bey 2 tane karakılçık 1 siyez ekmeği yarın öğleden sonra Adnan Kahveci Ihlamur cad No 12 Daire 4 e gelsin lütfen 0532 111 22 33"*
- Otomatik ayıklanan alanlar:
  - Müşteri Adı & Telefon Numarası
  - Mahalle ve bina/daire adresi
  - Ürün kataloğundaki isim ve gramajlarla eşleştirilen adetler
  - Teslimat notları

### C. Hızlı Manuel & B2B Cari Masası ([`/admin/siparisler/yeni`](file:///f:/ekmeklab_app/src/app/admin/siparisler/yeni/page.tsx))
- Telefon yazıldığında geçmiş müşteri profili anında çekilir.
- Kurumsal Cari seçildiğinde toptan anlaşmalı özel birim fiyatlar (`customPrices`) otomatik uygulanır.
- **24 Saat Fermantasyon Kuralı**: Saat 13:00'dan sonra girilen siparişlerin teslim tarihi otomatik olarak **ertesi güne** (`today + 1`) atanır.

---

## 6. Beylikdüzü Lojistik Güzergahı & Dağıtım Masası

[`/admin/siparisler/dagitim`](file:///f:/ekmeklab_app/src/app/admin/siparisler/dagitim/page.tsx) ekranı, kuryenin trafikte en az vakit kaybetmesi için optimize edilmiştir:

```typescript
// Beylikdüzü Coğrafi Dağıtım Zinciri
export const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu",
  "Marmara",
  "Barış",
  "Cumhuriyet",
  "Büyükşehir",
  "Adnan Kahveci",
  "Gürpınar",
  "Dereağzı",
  "Kavaklı",
  "Sahil",
  "Beylikdüzü OSB"
];
```

* **Özel Durak Sıralama**: Fırıncı durakları yukarı/aşağı oklarla manuel olarak kaydırabilir. Sıralama tarayıcıda `ekmeklab_route_seq_[Tarih]` anahtarıyla kalıcı tutulur.
* **Kurye Yük Çizelgesi**: Ekranın üst şeridinde hangi kuryenin üzerinde kaç paket olduğu, kaçının teslim edildiği ve kalan teslimat sayısı anlık özetlenir.
* **Toplu Paket Etiketleri (`BulkLabelsModal.tsx`)**: Termal yazıcıdan her paket için müşteri adı, sipariş numarası, ürün kalemleri ve takip karekodunu içeren kraft paket etiketi basılır.
* **Toplu Teslimat Fişi (`OrderSlipModal.tsx`)**: Tüm siparişlerin yasal teslimat fişleri tek tuşla art arda yazdırılır.
* **Toplu Yola Çıkar**: Seçili tüm paketler tek tıkla kuryeye atanır ve `kuryede` statüsüne geçirilir.

---

## 7. Kurye Mobil Konsolu (`/kurye`)

Kuryenin motosiklet veya dağıtım aracı üzerinde tek elle kullanabilmesi için tasarlanan PWA arayüzüdür:

1. **Giriş ve Vardiya Seçimi**:
   - Üst bardan aktif kurye seçilir.
   - Sadece o kuryeye atanmış ve o günkü teslimat tarihine sahip siparişler sıralanır.
2. **Canlı GPS Konum Yayını**:
   - "GPS Başlat" butonuna tıklandığında `navigator.geolocation.watchPosition` (`enableHighAccuracy: true`) devreye girer.
   - Konum, veritabanını yormamak için saniyede 1 kez Supabase Realtime broadcast kanalı üzerinden `courier-live-location` olarak yayınlanır.
   - Veritabanındaki `couriers.current_lat`, `current_lng` alanları ise 10 saniyede bir güncellenir.
3. **Tek Tıkla Harita ve Navigasyon**:
   - Müşteri adresi içindeki koordinatlar ayıklanır.
   - Kurye tek tuşla **Google Maps**, **Apple Maps** veya **Yandex Navigasyon** seçeneklerinden birini açarak adrese rota çizer.
4. **Hızlı Arama & WhatsApp**:
   - `tel:` protokolüyle tek tıkla müşteriyi arama.
   - `wa.me/` ile hazır şablonlu WhatsApp mesajı gönderme (*"Merhaba EkmekLab fırın kuryeniz binanızın önüne geldi"*).
5. **Haptik Geri Bildirimli Teslimat Onayı**:
   - Yeşil "Teslim Ettim" butonuna basıldığında açılan tahsilat kartından ödeme tipi (Kapıda Nakit, Mobil POS, Cari) seçilir.
   - Cihaz `navigator.vibrate([100, 50, 100])` ritmiyle titreyerek teslimatı fiziksel olarak teyit eder.
6. **Tahsin Usta Gün Sonu Kasa Mesajı**:
   - "Tahsin Usta'ya Rapor Gönder" butonu gün boyu toplanan nakit, çekilen POS ve teslim edilen sipariş sayısını tek metinde WhatsApp'a döker.

---

## 8. Müşteri Canlı Takip Ekranı & Konum Paylaşımı (`/siparis-takip/[id]`)

Müşterinin siparişinin durumunu anlık olarak izlediği zengin takip arayüzüdür:

* **5 Kademeli İlerleme Çubuğu**: Sipariş Alındı → Hamur Hazırlanıyor → Taş Fırında Pişiyor → Kurye Yolda → Teslim Edildi.
* **Supabase Realtime Aboneliği**:
  - `order-track-[orderId]` kanalı ile admin veya kurye durumu değiştirdiği anda sayfa yenilenmeden güncellenir.
  - `courier-live-location` kanalı ile kurye yaklaştıkça haritadaki konumu hareket eder.
* **Kuş Uçuşu Mesafe & Varış Süresi (ETA)**:
  - Haversine formülü (`calculateDistanceKm`) ile kurye ile müşteri adresi arasındaki mesafe ve tahmini varış süresi (şehir içi ~25 km/s) canlı hesaplanır.
* **KVKK Uyumlu Konum Paylaşımı**:
  - Müşteri takip ekranından dilediği zaman canlı konum paylaşımını durdurabilir veya tekrar başlatabilir.
* **İptal Güvenliği**:
  - Sipariş yalnızca `bekliyor` statüsündeyken müşteri tarafından iptal edilebilir. `hazirlaniyor` ve sonrasında iptal butonu gizlenir ve fırının iletişim numarası gösterilir.

---

## 9. Kurye Finansı, Z Raporu & Cari Mutabakat

[`/admin/finans/kurye`](file:///f:/ekmeklab_app/src/app/admin/finans/kurye/page.tsx) ekranı fırın ile kurye arasındaki nakit ve POS mutabakatını sağlar:

1. **Ödeme Akışı**:
   - Teslimat anında kaydedilen tüm ödemeler `payments` tablosunda toplanır.
2. **Kasa Dağılımı**:
   - **Kapıda Nakit**: Kuryenin fırına fiziksel teslim etmesi gereken tutar.
   - **Kapıda POS**: Kuryenin taşınabilir banka POS'undan çektiği tutar.
   - **Online / Havale**: Fırının doğrudan hesabına geçen tutarlar (kurye sorumluluğunda değildir).
3. **Kasa Farkı Hesabı**:
   - Fırıncının kuryeden teslim aldığı nakit tutar girildiğinde:
     $$\text{Kasa Farkı} = \text{Teslim Alınan Nakit} - \text{Sistemdeki Nakit Toplamı}$$
   - Sistem yeşil ("Kasa Tam"), kırmızı ("Kasa Eksiği") veya sarı ("Kasa Fazlası") uyarısı verir.
4. **Termal Kurye Z Raporu (`CourierSettlementModal.tsx`)**:
   - 80mm termal rulo formatında kurye Z raporu basılır; hem kurye hem fırıncı imzalayarak kasayı kapatır.
5. **Otomatik B2B Cari Borçlandırma**:
   - Cari bir müşteriye sipariş teslim edildiğinde `account_transactions` tablosuna anında `satis` (borç) hareketi yazılır.
   - Tahsilat yapıldığında `tahsilat` (alacak) hareketiyle simetrik bakiye kuralı işletilir.

---

## 10. Veritabanı Şeması, Realtime & KVKK Güvenliği

### A. Veritabanı Tablo Mimarisi
```
┌─────────────────┐       ┌─────────────────┐       ┌───────────────────────┐
│     orders      │──────<│   order_items   │       │ order_status_history  │
└─────────────────┘       └─────────────────┘       └───────────────────────┘
         │                         │                                    │
         │                         └─────────────┬──────────────────────┘
         ▼                                       ▼
┌─────────────────┐       ┌─────────────────┐  ┌───────────────────────┐
│    couriers     │──────<│    payments     │  │  customer_locations   │
└─────────────────┘       └─────────────────┘  └───────────────────────┘
```

* **`orders`**: `id`, `order_number`, `customer_name`, `phone`, `delivery_address`, `neighborhood`, `delivery_method` (courier), `delivery_date`, `subtotal`, `shipping_fee`, `total_amount`, `status`, `payment_method`, `payment_status`, `courier_id`, `cari_id`, `customer_lat`, `customer_lng`.
* **`order_items`**: `id`, `order_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total_price`.
* **`couriers`**: `id`, `name`, `phone`, `vehicle_type`, `is_active`, `on_shift`, `current_lat`, `current_lng`, `last_ping`.
* **`payments`**: `id`, `order_id`, `courier_id`, `amount`, `payment_method`, `collected_at`, `status`.
* **`order_status_history`**: `id`, `order_id`, `from_status`, `to_status`, `changed_by`, `user_id`, `reason`, `created_at`.
* **`customer_locations`**: `id`, `order_id`, `latitude`, `longitude`, `accuracy`, `consent_given_at`, `created_at`.

### B. Realtime Kanalları
1. **`courier-live-location` (Broadcast)**:
   - Payload: `{ courierId, lat, lng, speed, heading, timestamp }`
   - Kuryeden dinleyici müşteri ekranlarına sıfır veritabanı yüküyle akar.
2. **`order-track-[orderId]` (Postgres Changes)**:
   - `orders` tablosundaki durum güncellemelerini dinler; unmount anında `supabase.removeChannel()` ile bellek sızıntısı olmadan kapatılır.

### C. KVKK & 72 Saatlik Konum Temizleme
- Konum verileri yalnızca sipariş teslimatını kolaylaştırmak amacıyla açık rıza ile alınır.
- [`/api/cron/cleanup-locations`](file:///f:/ekmeklab_app/src/app/api/cron/cleanup-locations/route.ts) API'si `CRON_SECRET` korumasıyla periyodik olarak çalışır:
  - 72 saatten eski `customer_locations` koordinat loglarını siler.
  - 72 saat önce teslim edilmiş veya iptal edilmiş siparişlerin `customer_lat` ve `customer_lng` sütunlarını `NULL` yapar.

---

## 11. Uçtan Uca Sipariş Sistemi Smoke Test Checklist

Canlıya geçiş öncesinde veya her büyük sürümde uygulanması gereken doğrulama listesidir:

### 1. 🛒 Müşteri Akışı (Storefront & Takip)
- [ ] **Sipariş Verme:**
  - [ ] Sepete ürün ekleme ve miktar artırma/azaltma sorunsuz çalışıyor.
  - [ ] Teslimat ücreti doğru hesaplanıyor (1.000 TL ve üzeri kurye ücretsiz, altı 150 TL).
  - [ ] Gel-Al seçeneği sepetten tamamen kaldırılmış; kurye bilgilendirme rozeti görünüyor.
  - [ ] Adres formu (Beylikdüzü mahalleleri, açık adres, zil notu) eksiksiz doğrulanıyor.
- [ ] **KVKK Uyumlu Canlı Konum Paylaşımı:**
  - [ ] Konum izni modalı (`LocationConsentModal`) artisan estetiğinde açılıyor.
  - [ ] "Onayla" tıklandığında tarayıcı GPS izni isteniyor ve koordinatlar kaydediliyor.
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

### 2. ⚡ Admin Paneli Masaları
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
- [ ] **Termal Etiket ve Fiş Basımı:**
  - [ ] `BulkLabelsModal` tüm paketler için termal etiketleri hatasız render ediyor.
  - [ ] `OrderSlipModal` teslimat fişlerini sıralı olarak baskı önizlemesine gönderiyor.
- [ ] **Hızlı Sipariş Girişi & WhatsApp Parser (`/admin/siparisler/yeni`):**
  - [ ] WhatsApp serbest sipariş metni yapıştırıldığında müşteri, adres ve ürün adetleri otomatik algılanıyor.
  - [ ] Saat 13:00'dan sonra teslim tarihi otomatik olarak yarına erteleniyor.
  - [ ] Gel-Al seçeneği kaldırılmış, tüm siparişler kurye olarak kaydediliyor.
- [ ] **Kurye Filosu Yönetimi (`/admin/kurye/yonetim`):**
  - [ ] Yeni kurye ekleme, düzenleme, aktif/pasif toggle çalışıyor.
  - [ ] Vardiya aç/kapa toggle'ı realtime olarak kuryeyi aktife alıyor.
- [ ] **Müşteri Detay ve Davranış Geçmişi (`/admin/musteriler/[id]`):**
  - [ ] Müşteri kartında toplam harcama, toplam sipariş sayısı ve ortalama sepet analitiği doğru hesaplanıyor.
  - [ ] Favori ürünler en çok sipariş edilenden azalan sırada listeleniyor.
  - [ ] Tüm sipariş geçmişi ve hızlı sipariş oluşturma butonu çalışıyor.

### 3. 🛵 Kurye Mobil Konsolu (`/kurye`)
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

### 4. 💰 Finans, Z Raporu ve Muhasebe Uyumu
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

### 5. 🔒 KVKK, Güvenlik ve Cron Temizliği
- [ ] **72 Saatlik Konum Temizleme:**
  - [ ] `/api/cron/cleanup-locations` endpoint'i `CRON_SECRET` ile korunuyor.
  - [ ] 72 saatten eski `customer_locations` kayıtları siliniyor.
  - [ ] 72 saatten önce teslim edilmiş/iptal edilmiş siparişlerin `customer_lat`, `customer_lng` sütunları NULL'a çekiliyor.
- [ ] **Aydınlatma Metni:**
  - [ ] `/kvkk#konum-verisi` doğrudan canlı konum aydınlatma bölümüne atlıyor.

---

## 12. Sistem Güvenliği, RLS, Finansal Tutarlılık ve Mimari Denetim

Bu bölüm, EkmekLab sipariş/kurye/finans sisteminde gerçekleştirilen bağımsız güvenlik, veri tutarlılığı, durum makinesi ve kod kalitesi denetiminin bulgularını, mimari kararlarını ve geliştiriciler/agent'lar için zorunlu standartları belgeler.

### 12.1. 🛡️ RLS Politikaları ve Çakışma Yönetimi
* **Sorun (Bulgu 1.1 & 1.2):** `schema.sql` dosyasında kalan `Anyone can create orders` ve `Anyone can create order items` adındaki `WITH CHECK (true)` politikaları, migration 007'de yazılan kısıtlayıcı politikalarla (`customers_create_orders`) PostgreSQL'de `OR` mantığıyla birleştiği için anonim kullanıcıların sınırsız ve kontrolsüz veri yazmasına yol açıyordu.
* **Uygulanan Çözüm:** [`supabase/migrations/009_fix_rls_policy_conflicts.sql`](file:///f:/ekmeklab_app/supabase/migrations/009_fix_rls_policy_conflicts.sql) migration'ı oluşturuldu:
  - `orders` üzerindeki `Anyone can create orders` kuralı düşürüldü.
  - `order_items` üzerindeki `WITH CHECK (true)` kuralı düşürüldü; yerine sipariş sahibinin yalnızca kendi siparişine ait kalemleri ekleyebilmesini şart koşan `customers_insert_own_items` politikası getirildi.
* **Geliştirici Kuralı:** Supabase PostgreSQL'de aynı işlem (INSERT/SELECT vb.) için birden fazla politika varsa, PostgreSQL bunlardan **en az biri TRUE dönerse** işleme izin verir (permissive OR). Bu nedenle eski genel politikalar kesinlikle `DROP POLICY IF EXISTS` ile silinmelidir.

### 12.2. 🔑 Merkezi API Yetkilendirme & Rol Doğrulama (`apiAuth.ts`)
* **Sorun (Bulgu 1.5 & 1.6):** `status`, `assign-courier` ve `cancel` API rotaları `createAdminClient()` (service role key) kullanıyor, ancak gelen isteğin kimliğini doğrulamıyordu. İstemci body'de `cancelledBy: "admin"` gönderdiğinde tüm kontroller atlanabiliyordu.
* **Uygulanan Çözüm:** [`src/lib/security/apiAuth.ts`](file:///f:/ekmeklab_app/src/lib/security/apiAuth.ts) merkezi yardımcı modülü yazıldı.
  - `verifyApiAuth(req)` fonksiyonu Bearer token'ı çözümler, `supabase.auth.getUser(token)` ile kullanıcıyı teyit eder ve `profiles` tablosundan rolü (`admin`, `superadmin`, `courier`, `customer`) doğrular.
  - Kurye ise `couriers` tablosundaki `id` ile eşleştirir (`courierDbId`).
  - `/api/orders/[id]/status`, `/api/orders/[id]/assign-courier`, `/api/orders/[id]/cancel` ve `/api/orders/[id]` rotaları bu merkezi yardımcıya bağlandı.

### 12.3. 💰 Atomik Cari Finans Yönetimi (`record_cari_transaction_atomic`)
* **Sorun (Bulgu 2.1 & 2.2):**
  - Eski `adjust_cari_balance` SQL fonksiyonu yalnızca 2 parametre (`p_account_id`, `p_delta`) alıyordu ve `account_transactions` tablosuna hareket kaydetmiyordu. İstemciler ise 5-6 parametre gönderiyordu.
  - Cari hareket ekleme ve bakiye güncellemesi 2 ayrı HTTP çağrısıyla yapılıyordu. İkinci adım çökerse bakiye ile hareket dökümü asimetrik hale geliyordu.
* **Uygulanan Çözüm:** Migration 008'de tanımlanan `record_cari_transaction_atomic` veritabanı fonksiyonu tüm istemci modüllerine bağlandı:
  - [`CariCollectionModal.tsx`](file:///f:/ekmeklab_app/src/components/admin/cariler/CariCollectionModal.tsx)
  - [`CariBalanceAdjustModal.tsx`](file:///f:/ekmeklab_app/src/components/admin/cariler/CariBalanceAdjustModal.tsx)
  - [`QuickSlipModal.tsx`](file:///f:/ekmeklab_app/src/components/admin/cariler/QuickSlipModal.tsx)
  - [`useCariler.ts`](file:///f:/ekmeklab_app/src/hooks/useCariler.ts) (storno / ters kayıt akışı)
* **Geliştirici Kuralı:** Cari bakiye ve hareket güncellemesi kesinlikle client tarafında iki parçalı yapılmamalıdır. Her işlem `FOR UPDATE` kilitlemesi içeren atomik `record_cari_transaction_atomic` RPC fonksiyonu üzerinden tek transaction'da yürütülmelidir.

### 12.4. 🔒 Sipariş Takip Güvenliği, Rate Limiting & Misafir Müşteri Erişimi
* **Sorun (Bulgu 1.8):**
  - GET `/api/orders/[id]` rotasında rate limiting yoktu; son 4 hane telefon doğrulaması kaba kuvvete açıktı.
  - Yetkisiz sorgularda ürün birim fiyatları, ara toplam ve toplam tutar açık dönüyordu.
  - RLS devreye girdiğinde giriş yapmamış misafir müşteriler doğrudan Supabase SELECT attıklarında siparişlerini göremiyorlardı ("Sipariş Bulunamadı").
* **Uygulanan Çözüm:**
  - [`src/app/api/orders/[id]/route.ts`](file:///f:/ekmeklab_app/src/app/api/orders/%5Bid%5D/route.ts) içine IP rate limit (30 istek/dk) ve telefon deneme limiti (5 dk'da en fazla 5 hatalı deneme) eklendi (`checkRateLimit`).
  - Yetkisiz sorgularda finansal rakamlar (`subtotal`, `shipping_fee`, `total_amount`) `null` yapıldı; ürün kalemlerinden fiyatlar soyularak sadece ürün adı ve adedi bırakıldı.
  - [`src/app/siparis-takip/[id]/page.tsx`](file:///f:/ekmeklab_app/src/app/siparis-takip/%5Bid%5D/page.tsx) içine RLS fallback mekanizması eklendi: İstemci doğrudan okuma yapamadığında güvenli sunucu API'sine (`/api/orders/${rawId}`) başvurarak misafire sipariş durumunu gösterir.

### 12.5. 📡 Realtime Kurye GPS Yayını & Bellek Sızıntısı Koruması
* **Sorun (Bulgu 1.4):**
  - Tüm kuryeler tek bir genel `courier-live-location` kanalına konum basıyordu; kanalı dinleyen biri şehirdeki tüm kuryeleri izleyebiliyordu.
  - Her GPS koordinat değişiminde yeni bir `supabase.channel()` üretiliyor, eski kanallar kapatılmadığı için bellek sızıntısına (memory leak) yol açıyordu.
* **Uygulanan Çözüm:**
  - Kurye konumu genel kanaldan kurye-özel izole kanala (`courier-location-${selectedCourierId}`) taşındı.
  - [`src/app/kurye/page.tsx`](file:///f:/ekmeklab_app/src/app/kurye/page.tsx) içinde `locationChannelRef` kullanılarak tekil kanal yönetimi sağlandı; GPS durdurulduğunda ve bileşen unmount edildiğinde `supabase.removeChannel(...)` ile kanal kapatılması garanti altına alındı.
  - [`src/app/siparis-takip/[id]/page.tsx`](file:///f:/ekmeklab_app/src/app/siparis-takip/%5Bid%5D/page.tsx) yalnızca siparişe atanmış kuryenin kanalına abone olacak şekilde güncellendi.

### 12.6. ⚡ Durum Makinesi Bütünlüğü & İyimser Kilitleme (Optimistic Locking)
* **Sorun (Bulgu 3.2 & 3.3):**
  - `assign-courier` ve `status` güncellemelerinde TOCTOU (Time-of-check to time-of-use) riski vardı: Durum okunduktan sonra başka bir admin veya kurye durumu değiştirirse, önceki işlem körü körüne son durumu ezebilirdi.
* **Uygulanan Çözüm:**
  - [`src/app/api/orders/[id]/status/route.ts`](file:///f:/ekmeklab_app/src/app/api/orders/%5Bid%5D/status/route.ts) ve [`src/app/api/orders/[id]/assign-courier/route.ts`](file:///f:/ekmeklab_app/src/app/api/orders/%5Bid%5D/assign-courier/route.ts) rotalarında UPDATE sorgusuna `.eq("status", currentStatus)` eklendi.
  - Eğer etkilenen satır sayısı 0 ise, durumun araya giren başka bir işlemle değiştiği anlaşılır ve istemciye `409 Conflict` dönülür.
  - Veritabanı seviyesinde `trg_prevent_status_reversal` trigger'ı `teslim_edildi` veya `iptal` durumundaki siparişlerin geriye çevrilmesini engeller.

### 12.7. 🔢 Sipariş Numarası ve ID Standartları
* **Sorun (Bulgu 4.3 & 4.4):**
  - Sipariş ID'leri `ORD-${Date.now().toString().slice(-6)}` gibi tahmin edilebilir ve aynı saniyede çakışabilecek bir format kullanıyordu.
  - Manuel siparişlerde sipariş numarası `Math.random()` ile üretiliyordu.
* **Uygulanan Çözüm:**
  - Tüm yeni sipariş ID'leri standart `crypto.randomUUID()` ile üretilmektedir.
  - Sipariş numaraları doğrudan PostgreSQL'deki `generate_order_number()` RPC fonksiyonu çağrılarak `SIP-YYMM-XXX` formatında ardışık ve çakışmasız üretilmektedir.

### 12.8. 📊 18 Maddelik Denetim Özeti

| # | Kategori | Bulgu | Risk | Durum |
|---|----------|-------|------|-------|
| 1.1 | Güvenlik | `orders` INSERT — `WITH CHECK (true)` çakışması | 🔴 KRİTİK | ✅ Düzeltildi (`009_fix_rls_policy_conflicts.sql`) |
| 1.2 | Güvenlik | `order_items` INSERT — `WITH CHECK (true)` | 🔴 KRİTİK | ✅ Düzeltildi (`009_fix_rls_policy_conflicts.sql`) |
| 1.3 | Güvenlik | `payments` kurye yetkisi | 🟡 ORTA | ✅ Düzeltildi (008 migration kurye profili filtresi) |
| 1.4 | Güvenlik | Broadcast kanalı izolasyonu & memory leak | 🟡 ORTA | ✅ Düzeltildi (Kurye özel kanal + ref cleanup) |
| 1.5 | Güvenlik | `status` & `assign-courier` yetki kontrolü | 🔴 KRİTİK | ✅ Düzeltildi (`verifyApiAuth` RBAC) |
| 1.6 | Güvenlik | `cancel` route admin doğrulaması | 🟡 ORTA | ✅ Düzeltildi (JWT token doğrulaması) |
| 1.7 | Güvenlik | CRON_SECRET timing-safe doğrulama | ✅ SAĞLAM | ✅ Doğrulandı (`crypto.timingSafeEqual`) |
| 1.8 | Güvenlik | GET order rate limiting & katı maskeleme | 🟡 ORTA | ✅ Düzeltildi (IP/phone limit + fiyat maskeleme + guest fallback) |
| 2.1 | Finans | `adjust_cari_balance` atomik olmama | 🔴 KRİTİK | ✅ Düzeltildi (Tüm modallar `record_cari_transaction_atomic`'e bağlandı) |
| 2.2 | Finans | Storno işlemi 2-adımlı tutarsızlık riski | 🟡 ORTA | ✅ Düzeltildi (`useCariler` tek transaction RPC'ye bağlandı) |
| 2.3 | Finans | Kasa farkı formülü (`handoverCash - cashCollected`) | ✅ DOĞRU | ✅ Doğrulandı |
| 2.4 | Finans | Sunucu tarafı sepet & kargo fiyat kontrolü | ✅ SAĞLAM | ✅ Doğrulandı (Client fiyatı reddedilir) |
| 3.1 | Race | Terminal durum DB trigger koruması | ✅ SAĞLAM | ✅ Doğrulandı (`trg_prevent_status_reversal`) |
| 3.2 | Race | Kurye atamada hedef durum esnekliği | 🟡 ORTA | ✅ Düzeltildi (İyimser kilit ve dinamik hedef statü) |
| 3.3 | Race | Eşzamanlı güncellemede optimistic locking | 🟠 DÜŞÜK | ✅ Düzeltildi (`.eq("status", currentStatus)` + 409 Conflict) |
| 4.1 | Kalite | `as any` tip ihlalleri | 🟡 ORTA | ✅ İyileştirildi (`catch (err: unknown)`, sıkı tipler) |
| 4.2 | Kalite | Hardcoded fallback fiyat (`|| 135`) | 🟡 ORTA | ✅ Düzeltildi (`?? 0` ve ürün varlık teyidi) |
| 4.3 | Kalite | Tahmin edilebilir sipariş ID formatı | 🟡 ORTA | ✅ Düzeltildi (`crypto.randomUUID()`) |
| 4.4 | Kalite | Manuel sipariş numarası çakışma riski | 🟠 DÜŞÜK | ✅ Düzeltildi (`generate_order_number()` RPC entegrasyonu) |

*Tüm değişiklikler `npm run build` ile 43 App Router rotasında **0 TypeScript / derleme hatası** ile doğrulanmıştır.*

