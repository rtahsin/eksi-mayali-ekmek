# 🍞 EkmekLab — Sipariş Akışı & Kurye Dağıtım Sistemi Mimarisi

Bu doküman, EkmekLab platformunun **Sipariş Yaşam Döngüsü**, **WhatsApp Sipariş Ayrıştırıcı**, **Beylikdüzü Rota Planlama**, **Kurye Mobil Konsolu**, **Canlı GPS Takibi** ve **Müşteri Takip Ekranı** mimarisini eksiksiz belgeler. Gelecek tüm geliştirici ve yapay zeka ajanları için tek referans noktasıdır.

---

## 1. 🔄 Uçtan Uca Sipariş ve Dağıtım Akışı

```mermaid
graph TD
    A[Sipariş Kaynağı] -->|Online Web| B[Supabase orders Tablosu]
    A -->|WhatsApp Mesajı| C[WhatsApp Parser Modal]
    A -->|Admin Manuel / Cari| D[/admin/siparisler/yeni]
    C --> B
    D --> B

    subgraph "Üretim & Fırın Aşaması"
        B -->|bekliyor| E[Sipariş Listesi /admin/siparisler]
        E -->|hazirlaniyor| F[Üretim /admin/uretim]
        F -->|firinda| G[Taş Fırında Pişirme]
    end

    subgraph "Dağıtım & Rota Planlama"
        G --> H[/admin/siparisler/dagitim]
        H -->|Paket Etiketi Bas| I[BulkLabelsModal]
        H -->|Teslimat Fişi Bas| J[OrderSlipModal]
        H -->|Toplu Yola Çıkar| K[Statü: kuryede]
    end

    subgraph "Kurye Sahası"
        K --> L[/kurye - Kurye Mobil Konsolu]
        L -->|Canlı GPS Yayını| M[Supabase Realtime: courier-live-location]
        L -->|1 Tık Navigasyon| N[Google / Apple / Yandex Maps]
        L -->|Teslim Ettim| O[Statü: teslim_edildi]
        L -->|Kasa Kapat| P[Kurye Z Raporu /admin/finans/kurye]
    end

    subgraph "Müşteri Deneyimi"
        M -.-> Q[/siparis-takip/[id]]
        B -.-> Q
        Q -->|Canlı Harita & ETA| R[Müşteri Takip Ekranı]
    end
```

---

## 2. 📋 Sipariş Statüleri (Order Lifecycle Pipeline)

Tüm siparişler `src/types/admin.ts` ve `useAdminOrders.ts` içerisinde tanımlı normalize statü makinesine bağlıdır:

| Statü Kodu (`status`) | UI Rozet Başlığı | Açıklama & İş Mantığı |
| :--- | :--- | :--- |
| `bekliyor` | 🟡 Bekliyor / Sipariş Alındı | Sipariş sisteme düştü, mutfak onayı bekliyor. |
| `hazirlaniyor` | 🟠 Hazırlanıyor | Ekşi mayalı hamurlar yoğruldu, soğuk fermantasyona/dinlenmeye alındı. |
| `firinda` | 🔥 Taş Fırında Pişiyor | Ekmekler taş tabanlı fırına girdi, pişiriliyor. |
| `kuryede` | 🛵 Kuryede / Dağıtımda | Paketler fırından çıktı, kurye aracına yüklendi ve yola çıktı. |
| `teslim_edildi` | 🟢 Teslim Edildi | Kurye adreste teslimatı gerçekleştirdi, ödeme alındıysa işaretlendi. |
| `iptal` | ⚪ İptal Edildi | Müşteri veya fırıncı tarafından iptal edilen sipariş. |

---

## 3. 📥 Sipariş Giriş Kanalları

### A. Online Mağaza Siparişleri
- Müşteri web sitesinden sepeti onayladığında `/api/orders/create` üzerinden Supabase `orders` ve `order_items` tablolarına otomatik yazılır.

### B. Akıllı WhatsApp Sipariş Ayrıştırıcı (`WhatsAppOrderParserModal.tsx`)
- Müşterinin WhatsApp'tan yazdığı serbest metin (örn: *"Tahsin usta 2 karakılçık 1 cevizli çavdar yarın 3 gibi gelsin Barış mah. Bizimkent A2 Blok D:5"*) panoya yapıştırılır.
- Regex ve sezgisel ayrıştırıcı:
  - Müşteri adı ve telefon numarasını,
  - Mahalle ve açık adres detaylarını,
  - Ürün kataloğundaki isimlerle eşleşen adetleri otomatik doldurur.

### C. Hızlı Manuel & B2B Cari Girişi (`/admin/siparisler/yeni`)
- Telefon numarası yazıldığı anda eski siparişlerden isim, adres ve mahalle otomatik tamamlanır.
- Cari seçildiğinde kurumsal adres ve bilgiler gelir, ödeme yöntemi otomatik `cari` (veresiye defteri) olur.
- **Akıllı Teslimat Saati**: Saat 13:00'dan sonra girilen siparişlerin teslimat tarihi varsayılan olarak **ertesi güne** (`today + 1`) atanır (ekşi mayalı ekmeklerin 24 saatlik mayalanma kuralı gereği).

---

## 4. 🗺️ Beylikdüzü Rota & Dağıtım Planlama (`/admin/siparisler/dagitim`)

Fırının bulunduğu Beylikdüzü ilçesinde lojistik verimliliği artırmak için optimize edilmiş mahalle rotası kullanılır:
```typescript
const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu", "Marmara", "Barış", "Cumhuriyet", "Büyükşehir",
  "Adnan Kahveci", "Gürpınar", "Dereağzı", "Kavaklı", "Sahil", "Beylikdüzü OSB"
];
```
- **Özel Sıralama (`customSequence`)**: Fırıncı durakları yukarı/aşağı taşıyarak rotayı özelleştirebilir. Sıralama `localStorage: ekmeklab_route_seq_[Tarih]` anahtarında saklanır.
- **Toplu Paket Etiketleri (`BulkLabelsModal.tsx`)**: Termal yazıcılar için her paketin üstüne yapıştırılacak müşteri adı, adres, telefon, ürün içerikleri ve karekod etiketleri üretilir.
- **Toplu Fiş Basımı (`OrderSlipModal.tsx`)**: Tüm siparişlerin teslimat fişleri tek tıkla arka arkaya yazdırılır.
- **"Hepsini Yola Çıkar"**: Seçili tüm siparişler tek tuşla `kuryede` statüsüne geçirilir.

---

## 5. 🛵 Kurye Mobil Konsolu (`/kurye`)

Kuryenin motosiklet veya araç üzerinde tek elle rahatça kullanabilmesi için tasarlanmıştır:
1. **Adres ve GPS Tespiti**:
   - Adres metni içindeki `[📍 GPS: lat, lon]` koordinatları regex ile ayıklanır.
   - Tek tıkla **Google Maps**, **Apple Maps** veya **Yandex Navigasyon** doğrudan rotayı açar.
2. **Hızlı İletişim**:
   - `tel:` protokolüyle tek tıkla müşteriyi arama.
   - `wa.me/` bağlantısıyla hazır teslimat şablon mesajı açma.
3. **Canlı GPS Konum Yayını**:
   - `toggleGps()` başlatıldığında `navigator.geolocation.watchPosition` (`highAccuracy: true`) çalışır.
   - Konum `courier-live-location` Supabase Realtime broadcast kanalına saniyede bir iletilir.
4. **Haptik Geri Bildirim**:
   - "Teslim Ettim" butonuna basıldığında cihaz `[100, 50, 100]` ms ritmiyle titreyerek fiziksel onay verir.
5. **Kurye Gün Sonu Kasa Raporu**:
   - Tahsil edilen Kapıda Nakit ve Mobil POS tutarları toplanır.
   - Tek tıkla Tahsin Usta'ya WhatsApp üzerinden gün sonu mutabakat metni gönderilir.

---

## 6. 📍 Müşteri Canlı Sipariş & Kurye Takip Ekranı (`/siparis-takip/[id]`)

Müşteriye SMS veya WhatsApp ile iletilen canlı takip sayfasıdır:
- **6 Kademeli Canlı Çubuk**: Sipariş Alındı → Hamur Hazırlanıyor → Taş Fırında Pişiyor → Kurye Dağıtımda → Afiyet Olsun!
- **Supabase Realtime Aboneliği**:
  - `order-track-[orderId]`: Fırıncı veya kurye statüyü değiştirdiği anda müşteri ekranı sayfa yenilenmeden güncellenir.
  - `courier-live-location`: Kurye yoldayken kuryenin anlık harita konumu akar.
- **Dinamik Mesafe ve ETA**: Haversine formülü (`calculateDistanceKm`) ile kurye ile teslimat adresi arasındaki kuş uçuşu mesafe ve ortalama şehir içi hızına göre (~25 km/s) dakikalar içinde tahmini varış süresi (ETA) hesaplanır.

---

## 7. 💰 Kurye Finansmanı & Z Raporu (`/admin/finans/kurye`)

- Tarih seçicisi ile seçilen güne ait kurye teslimatları listelenir.
- **Kasa Ayrımı**:
  - Kapıda Nakit (Kuryenin cebindeki nakit para).
  - Kapıda POS (Kuryenin slip kestiği banka cirosu).
  - Online Kredi Kartı / Havale (Fırının doğrudan banka hesabına gelen, kuryeyi bağlamayan tutarlar).
- Gün sonu kasa teslimatı ile kurye hesabı kapatılır.

---

## 8. 🛡️ Geliştirici & AI Ajanı Güvenlik Hatırlatmaları

1. **Koordinat Formatı**: Sipariş adreslerinde koordinat saklanırken mutlaka `[📍 GPS: 41.0082, 28.6521]` veya `Konum: lat, lon` biçimi korunmalıdır. Regex ayıklayıcı bu formata bağlıdır.
2. **Kurye Realtime Kanalı**: Kuryenin canlı konumu veritabanını şişirmemek için `postgres_changes` ile değil, hafif Supabase **Realtime Broadcast** (`courier-live-location`) ile aktarılır.
3. **Mobil Uyumluluk**: `/kurye` ve `/siparis-takip/[id]` sayfalarında buton yükseklikleri minimum `48px` (dokunma hedefi) olmalı ve masaüstü tabloları yerine mobil kart düzenleri kullanılmalıdır.
