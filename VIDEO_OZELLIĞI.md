# 🎥 Ürün Video Özelliği

## ✅ Yapılanlar

### 1. **Video Altyapısı**

- ❌ YouTube player kaldırıldı
- ✅ `video_player` + `chewie` paketleri eklendi
- ✅ Firebase Storage video hosting

### 2. **Admin Panel - Video Upload**

**Dosya:** [lib/admin/products/product_form.dart](lib/admin/products/product_form.dart)

**Özellikler:**

- 📹 **Video Yükle** butonu
- Desteklenen formatlar: MP4, WebM, MOV
- Maksimum boyut: **50MB**
- Otomatik Firebase Storage upload
- Video URL otomatik Product model'e kaydedilir

**Kullanım:**

1. Admin panel → Ürünler → Ürün Ekle/Düzenle
2. "Ürün Tanıtım Videosu" kartında **"Video Yükle"** butonuna tıkla
3. Video dosyasını seç (max 50MB)
4. Yükleme tamamlanınca URL otomatik dolar
5. Ürünü kaydet

### 3. **Müşteri Arayüzü - Video Oynatma**

**Dosya:** [lib/screens/product_detail_screen.dart](lib/screens/product_detail_screen.dart)

**Nasıl Çalışır:**

- Ürün kartında sağ alt köşede kırmızı **play ikonu** görünür
- Ürün detay sayfasında görselin üzerinde büyük **play butonu** görünür
- Görsele tıklayınca tam ekran **video dialog** açılır
- Chewie player ile profesyonel kontroller:
  - ▶️ Play/Pause
  - 🔊 Volume kontrolü
  - ⏩ İleri-geri sarma
  - 🖥️ Fullscreen modu
  - ❌ Close butonu

### 4. **Product Model Güncellemesi**

**Dosya:** [lib/models/product.dart](lib/models/product.dart)

```dart
final String? videoUrl; // Ürün tanıtım videosu
```

**Firestore Alanı:**

```json
{
  "videoUrl": "https://firebasestorage.googleapis.com/.../video.mp4"
}
```

### 5. **ProductService - Video Upload Metodu**

**Dosya:** [lib/services/product_service.dart](lib/services/product_service.dart)

```dart
Future<String> uploadProductVideoToStorage(
  String productId, 
  Uint8List bytes,
  {String? originalName}
)
```

**Storage Yolu:**

```
product-videos/{productId}/{timestamp}_video.mp4
```

---

## 📱 Kullanıcı Deneyimi

### Ürün Kartı (Anasayfa/Kategori)

```
┌─────────────────┐
│                 │
│   Ürün Görseli  │
│                 │
│          [▶️]   │ ← Play ikonu (video varsa)
├─────────────────┤
│   Ürün Adı      │
│   Fiyat         │
└─────────────────┘
```

### Ürün Detay Sayfası

```
Görsele Tıkla
     ↓
┌──────────────────────────────┐
│  ❌                          │ ← Close
│  ┌────────────────────────┐  │
│  │                        │  │
│  │    Video Player        │  │
│  │    (Chewie)            │  │
│  │                        │  │
│  │  ▶️  ⏸  🔊  ⏩  🖥️   │  │ ← Kontroller
│  └────────────────────────┘  │
└──────────────────────────────┘
```

---

## 💾 Firebase Storage Maliyeti

### Ücretsiz Plan (Spark)

- ✅ **5GB storage** (yeterli!)
- ✅ **1GB/gün download** (yeterli!)
- ✅ **50,000 okuma/gün**

### Örnek Hesaplama

- **2-3 ürün** × **10MB video** = **30MB storage**
- **100 izlenme/gün** × **10MB** = **1GB bandwidth/gün**

**Sonuç:** Tamamen ücretsiz! ✅

---

## 🔧 Teknik Detaylar

### Paketler

```yaml
dependencies:
  video_player: ^2.10.1      # Video oynatma altyapısı
  chewie: ^1.11.3            # Video player UI
  file_picker: ^8.0.7        # Video dosya seçimi
```

### Video Formatları

- ✅ MP4 (H.264)
- ✅ WebM (VP8/VP9)
- ✅ MOV (QuickTime)

### Boyut Limiti

- **Admin upload:** 50MB
- **Önerilen:** 5-10MB (kısa videolar için yeterli)

### Video Optimizasyonu Önerileri

1. **Çözünürlük:** 720p (1280x720) yeterli
2. **Frame rate:** 24-30 fps
3. **Codec:** H.264
4. **Süre:** 15-30 saniye (kesim videoları için ideal)

---

## 🎬 Video Hazırlama

### Ücretsiz Araçlar

1. **HandBrake** - Video sıkıştırma
   - <https://handbrake.fr/>
   - Preset: "Web > Gmail Large 3 Minutes 720p30"

2. **FFmpeg** (Komut satırı)

   ```bash
   ffmpeg -i input.mov -vcodec h264 -acodec aac -vf scale=1280:720 output.mp4
   ```

3. **Online Compressor**
   - <https://www.freeconvert.com/video-compressor>
   - Target size: 5-10MB

---

## 📋 Test Checklist

### Admin Panel

- [ ] Video upload butonu çalışıyor
- [ ] 50MB üzeri dosya reddediliyor
- [ ] Loading indicator görünüyor
- [ ] URL otomatik dolarak kaydediliyor
- [ ] Video silinebiliyor

### Müşteri Arayüzü

- [ ] Ürün kartında play ikonu görünüyor (video varsa)
- [ ] Ürün detayda play butonu görünüyor
- [ ] Görsele tıklayınca video açılıyor
- [ ] Video oynatma kontrolleri çalışıyor
- [ ] Fullscreen modu çalışıyor
- [ ] Close butonu çalışıyor
- [ ] Dialog dışına tıklayınca kapanıyor

### Hata Durumları

- [ ] Video yüklenmezse error message gösteriliyor
- [ ] Network hatası durumunda friendly message
- [ ] Video yoksa play ikonu görünmüyor

---

## 🚀 Deploy

```bash
# Paketleri yükle
flutter pub get

# Web build
flutter build web --release

# Firebase deploy
firebase deploy --only hosting
```

---

## 📝 Örnek Video İçerikleri

### Ekşi Mayalı Ekmek İçin

1. **Ekmek Kesim Videosu** ⭐
   - İçi gösterme
   - Gözenekli yapı
   - Süre: 10-15 saniye

2. **Paketleme Videosu**
   - Taze çıkmış ekmek
   - Paketleme süreci
   - Süre: 15-20 saniye

3. **Sunum Videosu**
   - Masada güzel servis
   - Bir dilim kesilmiş hal
   - Süre: 10 saniye

---

## 🎯 Sonuç

✅ **Tamamen ücretsiz** (Firebase Spark plan yeterli)  
✅ **Siteden çıkış yok** (video içeride oynatılır)  
✅ **Kolay admin panel** (tek buton ile yükleme)  
✅ **Profesyonel player** (chewie kontrolleri)  
✅ **Mobil uyumlu** (responsive)  

**Hazır! 🎉 Admin artık ürünlere video ekleyebilir, müşteriler izleyebilir!**
