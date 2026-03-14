# 📍 Konum Paylaşımı Özelliği

## 🎯 Amaç

Müşteriler sipariş verirken konum paylaşarak teslimat sürecini kolaylaştırabilir. Admin kullanıcılar müşteri konumunu görerek en hızlı şekilde teslimat yapabilir.

---

## ✅ Özellikler

### Müşteri Tarafı (Checkout Ekranı)

- 📱 **Tek Tıkla Konum Paylaşımı**: "Konumumu Paylaş" butonu
- 🔄 **Konum Yenileme**: Konumu güncelleyebilme
- 🗺️ **Haritada Görüntüleme**: Paylaştığı konumu Google Maps'te açabilme
- 🔒 **İsteğe Bağlı**: Zorunlu değil, isteyen kullanır
- ✅ **Otomatik Kayıt**: Sipariş ile birlikte kaydedilir

### Admin Tarafı (Sipariş Yönetimi)

- 📍 **Konum Gösterimi**: Sipariş detayında enlem/boylam
- 🚗 **Yol Tarifi Al**: Google Maps navigasyon
- 📱 **Mobil Uyumlu**: Telefonda Maps uygulaması açılır
- 🎯 **Direkt Yönlendirme**: Tek tıkla teslimat noktasına gitme

---

## 🚀 Kullanım

### 1️⃣ Müşteri - Sipariş Verirken

**Adımlar:**

1. Sepete ürün ekle → Checkout'a git
2. Adres bilgilerini doldur
3. **"Konum Paylaşımı"** bölümünü gör (mavi kutu)
4. **"Konumumu Paylaş"** butonuna tıkla
5. Tarayıcı konum izni iste → **İzin Ver**
6. Konumun kaydedildi mesajı ✓
7. (Opsiyonel) **Harita ikonu**na tıklayarak konumunu kontrol et
8. Siparişi tamamla

**Ne olur:**

- Mevcut konumun (GPS) alınır
- Latitude, Longitude, Google Maps linki kaydedilir
- Sipariş ile birlikte Firestore'a yazılır

**Görünüm:**

```
┌─────────────────────────────────────┐
│ 📍 Konum Paylaşımı (İsteğe Bağlı)  │
│                                     │
│ Teslimat kolaylığı için konumunuzu  │
│ paylaşabilirsiniz                   │
│                                     │
│ [📍 Konumumu Paylaş]  [🗺️]          │
└─────────────────────────────────────┘
```

Konum paylaşıldıktan sonra:

```
┌─────────────────────────────────────┐
│ 📍 Konum Paylaşımı (İsteğe Bağlı)  │
│                                     │
│ ✅ Konumunuz kaydedildi             │
│                                     │
│ [🔄 Konumu Yenile]  [🗺️ Harita]     │
└─────────────────────────────────────┘
```

---

### 2️⃣ Admin - Teslimat Yaparken

**Senaryo A: Masaüstünde**

1. Admin Panel → Siparişler
2. Sipariş kartına tıkla → Detaylar açılır
3. **"Teslimat Konumu"** bölümünü gör (varsa)
   - Enlem/Boylam bilgisi
   - **"Yol Tarifi Al"** butonu
4. Yol Tarifi Al → Google Maps Web açılır
5. Navigation başlat

**Senaryo B: Telefonda (MÜKEMMEL!)**

1. Admin Panel'i telefondan aç
2. Sipariş detaylarına git
3. **"Yol Tarifi Al"** butonuna tıkla
4. **Google Maps uygulaması açılır** (iOS'ta Apple Maps)
5. Navigasyon otomatik başlar
6. Teslimat noktasına git! 🚗

**Görünüm (Admin Panel):**

```
Sipariş Detayları
─────────────────
📋 Sipariş ID: ABC12345
📅 Tarih: 08 Ocak 2026 14:30
👤 Müşteri: Ahmet Yılmaz
📞 Telefon: 0530 123 45 67
📍 Adres: Cumhuriyet Cad. No:15...

🗺️ Teslimat Konumu
┌─────────────────────────────┐
│ Enlem: 41.012345            │
│ Boylam: 28.987654           │
│                             │
│ [🚗 Yol Tarifi Al]          │
└─────────────────────────────┘
```

---

## 🔧 Teknik Detaylar

### Order Model Değişiklikleri

```dart
class Order {
  // ... mevcut alanlar
  
  // YENİ: Konum alanları
  final double? latitude;       // Enlem
  final double? longitude;      // Boylam
  final String? locationUrl;    // Google Maps link
}
```

### Firestore Schema

```json
{
  "orders/ORDER_ID": {
    "customerName": "Ahmet Yılmaz",
    "shippingAddress": "Cumhuriyet Cad. No:15...",
    "latitude": 41.012345,       // Yeni
    "longitude": 28.987654,      // Yeni
    "locationUrl": "https://..."  // Yeni
  }
}
```

### Konum İzinleri (Web)

**Chrome/Edge:**

- İlk tıklamada izin penceresi açılır
- "İzin Ver" seçilmeli
- Kalıcı olarak kaydedilir (site ayarları)

**Firefox:**

- Adres çubuğunda konum ikonu
- İzin ver/reddet

**Safari:**

- Ayarlar → Gizlilik → Konum Hizmetleri
- Safari → ekmeklab.com → İzin Ver

### Google Maps URL Formatları

**Haritada Göster:**

```
https://www.google.com/maps?q=41.012345,28.987654
```

**Navigasyon (Yol Tarifi):**

```
https://www.google.com/maps/dir/?api=1&destination=41.012345,28.987654
```

**Mobile'da Otomatik Uygulama Açma:**

- Android: Google Maps uygulaması
- iOS: Apple Maps (varsayılan) veya Google Maps

---

## 📱 Mobil Davranışlar

### Android

```
Yol Tarifi Al butonuna tıkla
        ↓
Google Maps uygulaması aç
        ↓
"Başlat" (navigation)
        ↓
Sesli yönlendirme başlar
```

### iOS

```
Yol Tarifi Al butonuna tıkla
        ↓
Apple Maps uygulaması aç
        ↓
"Git" (navigation)
        ↓
Sesli yönlendirme başlar
```

---

## ✅ Konum Doğruluğu

**GPS Accuracy Seviyeleri:**

- 🟢 **High (0-20m)**: Açık alanda, ideal
- 🟡 **Medium (20-100m)**: Kapalı alanlarda
- 🔴 **Low (100m+)**: Zayıf sinyal

**Kullanılan Ayar:**

```dart
LocationAccuracy.high // En yüksek doğruluk
```

**Doğruluğu Etkileyen Faktörler:**

- ✅ Açık havada → Daha doğru
- ⚠️ Bina içinde → Daha az doğru
- ❌ Kapalı otopark → Sinyal yok

---

## 🔒 Gizlilik & Güvenlik

### Müşteri Kontrolü

- ✅ **İsteğe bağlı**: Zorunlu değil
- ✅ **Tek kullanımlık**: Sadece sipariş için
- ✅ **Şeffaf**: Neden istendiği açık ("Teslimat kolaylığı")
- ✅ **Görünür**: Paylaştığı konumu görebilir

### Data Saklama

- 📦 Firestore'da saklanır (order document)
- 🔒 Admin panelinden görülebilir
- 🚫 Üçüncü taraflarla paylaşılmaz
- ♻️ Sipariş tamamlandıktan sonra pasif arşiv

### Güvenlik

- ✅ HTTPS üzerinden iletim
- ✅ Firebase Security Rules koruması
- ✅ Admin yetki kontrolü
- ✅ SSL sertifikası zorunlu

---

## 🐞 Sorun Giderme

### Müşteri: "Konum izni alamıyorum"

**Çözüm 1: Tarayıcı Ayarları**

```
Chrome:
1. Adres çubuğu → kilit ikonu
2. İzinler → Konum → İzin Ver
3. Sayfayı yenile
```

**Çözüm 2: Sistem Ayarları**

```
Windows:
Ayarlar → Gizlilik → Konum → Chrome için Aç

macOS:
Sistem Tercihleri → Güvenlik ve Gizlilik → Konum → Chrome ✓
```

---

### Admin: "Yol Tarifi Al butonu çalışmıyor"

**Durum A: Masaüstü**

- Popup engelleyicisi kapalı mı kontrol et
- Farklı tarayıcı dene

**Durum B: Mobil**

- Google Maps/Apple Maps yüklü mü kontrol et
- Uygulama güncel mi kontrol et

---

### "Konum doğru değil"

**Sebep 1: GPS Sinyali**

- Açık havaya çık
- Birkaç saniye bekle
- Tekrar dene

**Sebep 2: Cache**

- Tarayıcı önbelleğini temizle
- Sayfayı yenile

---

## 📊 Kullanım İstatistikleri (Tahmin)

**Konum Paylaşma Oranı (Beklenen):**

- 🏙️ Şehir içi: %70-80
- 🏘️ Mahalle içi: %60-70
- 🏞️ Kırsal alan: %40-50

**Teslimat Süresi İyileştirmesi:**

- 📍 Konumlu sipariş: Ortalama 15 dakika daha hızlı
- 📝 Sadece adres: Konum bulma + teslimat

---

## 🎓 İyi Pratikler

### Müşteri İçin

1. ✅ **Açık havada paylaş**: Daha doğru konum
2. ✅ **Kapı önünde ol**: Teslimat zamanı
3. ✅ **Kontrol et**: Harita ikonu ile doğrula
4. ⚠️ **Yanlış yerse**: Notta belirt ("3. kat, sol daire")

### Admin İçin

1. ✅ **Haritaya güven**: GPS doğru ama tam binayı göstermeyebilir
2. ✅ **Telefonla aç**: Navigation için mobil tercih et
3. ✅ **Varınca ara**: Telefon numarasıyla iletişim kur
4. ⚠️ **Plan B**: Konum yoksa text adres kullan

---

## 🔄 Gelecek İyileştirmeler

### Planlanan Özellikler

- [ ] 🗺️ Harita önizlemesi (checkout ekranında mini map)
- [ ] 📏 Mesafe hesaplama (mağaza → müşteri arası)
- [ ] ⏱️ Tahmini teslimat süresi (mesafeye göre)
- [ ] 🚴 Kurye konumu tracking (gerçek zamanlı)
- [ ] 🔔 "Kurye yaklaştı" bildirimi
- [ ] 📍 Favori konum kaydetme
- [ ] 🏢 İş/Ev adres etiketleri

---

## 📝 Changelog

### v1.0.0 (08 Ocak 2026)

- ✅ Order model'e latitude, longitude, locationUrl eklendi
- ✅ Checkout ekranına "Konumumu Paylaş" butonu
- ✅ Geolocator entegrasyonu (GPS konum alma)
- ✅ Admin sipariş detayında konum gösterimi
- ✅ "Yol Tarifi Al" butonu (Google Maps navigasyon)
- ✅ Mobil uyumluluk (Maps uygulaması açma)
- ✅ Web ve mobil konum izni yönetimi

---

**Son Güncelleme:** 08 Ocak 2026  
**Versiyon:** 1.0.0  
**Yazar:** EkmekLab Development Team

🍞 **Teslimatlarınız artık daha hızlı!**
