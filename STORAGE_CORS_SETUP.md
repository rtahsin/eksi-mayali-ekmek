# Firebase Storage CORS Yapılandırması

## Sorun

Admin panelinde yüklenen ürün görselleri kullanıcı arayüzünde görünmüyordu.

## Tespit Edilen Sorunlar

### 1. ✅ DÜZELTILDI: ProductService imageUrl Sorunu

**Dosya:** `lib/services/product_service.dart`

**Sorun:** `getProducts()` metodunda, Firestore'dan gelen `imageUrl` alanı görmezden geliniyordu ve her zaman varsayılan görsel kullanılıyordu.

**Öncesi:**

```dart
imageUrl: ImageService.getDefaultProductImage(data['name'] ?? ''),
```

**Sonrası:**

```dart
imageUrl: (data['imageUrl'] == null || data['imageUrl'].toString().isEmpty)
    ? ImageService.getDefaultProductImage(data['name'] ?? '')
    : data['imageUrl'],
```

### 2. ⚠️ CORS Yapılandırması (Manuel Gerekli)

Firebase Storage'dan web üzerinden görsellerin yüklenmesi için CORS yapılandırması gerekiyor.

**Mevcut CORS Dosyası:** `cors.json`

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin"
    ]
  }
]
```

## CORS Ayarını Uygulama

### Yöntem 1: Google Cloud Console (Önerilen)

1. [Google Cloud Console](https://console.cloud.google.com) açın
2. Projeyi seçin: `eksimayaliekmekweb`
3. **Cloud Storage** > **Buckets** bölümüne gidin
4. `eksimayaliekmekweb.firebasestorage.app` bucket'ını seçin
5. **Configuration** sekmesine gidin
6. **CORS** bölümünde "Edit CORS configuration" tıklayın
7. Aşağıdaki JSON'u yapıştırın:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]
  }
]
```

### Yöntem 2: Google Cloud SDK (Eğer yüklüyse)

```bash
gcloud storage buckets update gs://eksimayaliekmekweb.firebasestorage.app --cors-file=cors.json
```

### Yöntem 3: gsutil (Eski yöntem)

```bash
gsutil cors set cors.json gs://eksimayaliekmekweb.firebasestorage.app
```

## Storage Kuralları

**Dosya:** `storage.rules`

Mevcut kurallar doğru yapılandırılmış:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() { return request.auth != null; }
    function isAdmin() { return isAuthenticated() && request.auth.token.isAdmin == true; }

    // Ürün görselleri
    match /product-images/{allPaths=**} {
      allow read: if true;  // Herkes okuyabilir
      allow write: if isAdmin();  // Sadece admin yazabilir
    }
    
    // Diğer klasörler...
  }
}
```

## Görsel Yükleme Akışı

1. **Admin Paneli** → `product_form.dart`
   - Kullanıcı görsel seçer (FilePicker)
   - Görsel kırpılır (ImageCropDialog)
   - `productService.uploadProductImageToStorage()` çağrılır

2. **Upload** → `product_service.dart`
   - Firebase Storage'a yüklenir: `product-images/{productId}/{timestamp}_{filename}.jpg`
   - Download URL alınır
   - URL Firestore'a kaydedilir

3. **Kullanıcı Arayüzü** → `home_screen.dart`, `product_card.dart`
   - Firestore'dan ürünler çekilir
   - `imageUrl` alanı okunur
   - CachedNetworkImage ile görsel gösterilir

## Test Adımları

1. ✅ Storage kurallarını deploy et: `firebase deploy --only storage`
2. ✅ Kodu düzelt ve build et: `flutter build web --release`
3. ⚠️ CORS yapılandırmasını Google Cloud Console'dan uygula
4. ✅ Uygulamayı deploy et: `firebase deploy --only hosting`
5. ✅ Admin panelinde yeni bir ürün ekle ve görsel yükle
6. ✅ Kullanıcı arayüzünde görselin görünüp görünmediğini kontrol et

## Sorun Giderme

### Görsel Hala Görünmüyorsa

1. **Browser Console'u kontrol et:**
   - F12 → Console
   - CORS hatası var mı?
   - "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

2. **Network Tab'ı kontrol et:**
   - F12 → Network
   - Görsel isteği başarısız mı?
   - Status code 403 veya CORS hatası?

3. **Firestore'u kontrol et:**
   - Firebase Console → Firestore Database
   - `urunler` koleksiyonu → Son eklenen ürün
   - `imageUrl` alanı dolu mu?
   - URL geçerli mi? (Firebase Storage URL formatı: `https://firebasestorage.googleapis.com/...`)

4. **Storage'ı kontrol et:**
   - Firebase Console → Storage
   - `product-images/` klasörü var mı?
   - Görseller yüklenmiş mi?
   - File'ı tıklayınca "Get download URL" görünüyor mu?

## Güvenlik Notları

⚠️ **Dikkat:** CORS yapılandırmasında `"origin": ["*"]` kullanıyoruz, bu tüm origin'lere izin verir.

**Üretim için önerilen:**

```json
{
  "origin": [
    "https://eksimayaliekmekweb.web.app",
    "https://eksimayaliekmekweb.firebaseapp.com",
    "http://localhost:*"
  ],
  ...
}
```

## İlgili Dosyalar

- `lib/services/product_service.dart` - Ürün servisi ve görsel yükleme
- `lib/services/image_service.dart` - Görsel işlemleri
- `lib/admin/products/product_form.dart` - Admin ürün ekleme formu
- `storage.rules` - Firebase Storage güvenlik kuralları
- `cors.json` - CORS yapılandırması

## Son Güncelleme

25 Kasım 2025
