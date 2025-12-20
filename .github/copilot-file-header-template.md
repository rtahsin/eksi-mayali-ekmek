# Dosya Başlık Şablonu

## EkmekLab Proje Standartları

Her yeni dosya oluştururken bu formatı kullanın:

```dart
// ignore_for_file: prefer_const_constructors

/*
 * [Dosya Adı] - [Kısa Tanım]
 * 
 * PURPOSE: [Bu dosyanın amacı nedir?]
 * LAYER: [UI/Service/Model/Provider/Widget/Utils]
 * DEPENDS ON: 
 *   - [Bağımlılık 1]
 *   - [Bağımlılık 2]
 * 
 * RULES:
 *   - [Özel kural 1]
 *   - [Özel kural 2]
 * 
 * FEATURES:
 *   - [Özellik 1]
 *   - [Özellik 2]
 * 
 * LAST UPDATED: [YYYY-MM-DD]
 */
```

## Katman Bazlı Örnekler

### UI Layer (Screens)

```dart
/*
 * Product Detail Screen
 * 
 * PURPOSE: Ürün detaylarını gösterir, sepete ekleme imkanı sağlar
 * LAYER: UI -> Screens
 * DEPENDS ON: 
 *   - ProductService (lib/services/product_service.dart)
 *   - CartProvider (lib/providers/cart_provider.dart)
 *   - ProductCard widget (lib/widgets/product_card.dart)
 * 
 * RULES:
 *   - AppTheme kullan, hardcoded color yok
 *   - Loading state göster
 *   - Error handling ile ScaffoldMessenger kullan
 *   - Logger ile debug/error logla
 * 
 * FEATURES:
 *   - Ürün resim galerisi
 *   - Fiyat ve stok bilgisi
 *   - Sepete ekle butonu
 *   - Benzer ürünler önerisi
 * 
 * LAST UPDATED: 2025-11-27
 */
```

### Service Layer

```dart
/*
 * Product Service
 * 
 * PURPOSE: Firestore'dan ürün CRUD işlemleri
 * LAYER: Service
 * DEPENDS ON: 
 *   - FirebaseFirestore
 *   - Product model (lib/models/product.dart)
 *   - Logger (lib/utils/logger.dart)
 * 
 * RULES:
 *   - Client-side filtering tercih et (index gerektirmez)
 *   - Try-catch her metotta olmalı
 *   - Logger.error ile hata logla
 *   - Asenkron metodlar Future döndürmeli
 * 
 * FEATURES:
 *   - Ürün listesi getirme
 *   - Kategori bazlı filtreleme
 *   - Ürün arama
 *   - Popüler ürünler
 * 
 * LAST UPDATED: 2025-11-27
 */
```

### Model Layer

```dart
/*
 * Product Model
 * 
 * PURPOSE: Ürün veri modeli, Firestore mapping
 * LAYER: Model
 * DEPENDS ON: 
 *   - Firestore document structure
 * 
 * RULES:
 *   - Immutable sınıf (final fields)
 *   - fromJson ve toJson metodları zorunlu
 *   - Null safety kullan
 *   - Default değerler belirt
 * 
 * FEATURES:
 *   - JSON serialization
 *   - Type-safe field access
 *   - Factory constructors
 * 
 * LAST UPDATED: 2025-11-27
 */
```

### Widget Layer

```dart
/*
 * Product Card Widget
 * 
 * PURPOSE: Ürün kartı UI bileşeni, tekrar kullanılabilir
 * LAYER: Widget
 * DEPENDS ON: 
 *   - Product model (lib/models/product.dart)
 *   - AppTheme (lib/theme/app_theme.dart)
 * 
 * RULES:
 *   - Stateless widget tercih et
 *   - Business logic içermemeli
 *   - Callback fonksiyonlar kullan
 *   - Responsive design (mobile/tablet/desktop)
 * 
 * FEATURES:
 *   - Ürün resmi (CachedNetworkImage)
 *   - Ürün adı ve fiyatı
 *   - Sepete ekle butonu
 *   - Hover efekti (desktop)
 * 
 * LAST UPDATED: 2025-11-27
 */
```

### Provider Layer

```dart
/*
 * Cart Provider
 * 
 * PURPOSE: Sepet state management
 * LAYER: Provider (State Management)
 * DEPENDS ON: 
 *   - Product model (lib/models/product.dart)
 *   - ChangeNotifier (Flutter)
 * 
 * RULES:
 *   - notifyListeners() her state değişiminde çağrılmalı
 *   - Private state (_items), public getters
 *   - Business logic burada olabilir
 * 
 * FEATURES:
 *   - Ürün ekleme/çıkarma
 *   - Toplam fiyat hesaplama
 *   - Sepet temizleme
 *   - Ürün adedi güncelleme
 * 
 * LAST UPDATED: 2025-11-27
 */
```

## Copilot Kullanım İpuçları

### 1. Dosya Referanslama

```
@workspace/lib/services/product_service.dart
@workspace/lib/models/product.dart

Bu iki dosyadaki pattern'e uygun CartService oluştur
```

### 2. Katmanlı Geliştirme

```
Yeni bir Blog feature ekleyeceğiz. Sırasıyla:
1. BlogPost modelini oluştur
2. BlogService'i yaz (Firestore CRUD)
3. BlogProvider ekle (gerekirse)
4. BlogListScreen ve BlogDetailScreen'i kodla
```

### 3. Bağlam Verme

```
// Bu dosya EkmekLab e-ticaret projesi için.
// Flutter Web + Firebase kullanıyoruz.
// Firestore collection: 'urunler'
// Client-side filtering tercih ediyoruz (index gerektirmez)

[Kod buraya...]
```

### 4. Kod Kalitesi Kontrolü

```
Bu kodu incele ve EkmekLab standartlarına göre düzelt:
- Logger kullanılıyor mu?
- Translation key'leri hardcoded değil mi?
- Error handling var mı?
- Loading state gösteriliyor mu?
```
