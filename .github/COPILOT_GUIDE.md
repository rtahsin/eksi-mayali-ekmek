# 🎯 GitHub Copilot Kılavuzu - EkmekLab

Bu kılavuz, GitHub Copilot'un EkmekLab projesinde en verimli şekilde kullanılması için hazırlanmıştır.

## 📚 Copilot'a Bağlam Verme

### 1. Dosya Referanslama (@workspace)

Copilot'a proje içindeki dosyaları referans göstererek daha akıllı öneri alabilirsiniz:

```
@workspace/lib/services/product_service.dart 
@workspace/lib/models/product.dart

Bu iki dosyadaki mimariyi takip ederek BlogService oluştur
```

### 2. Çoklu Dosya Analizi

Birden fazla dosyayı aynı anda referans gösterin:

```
@workspace/lib/screens/home_screen.dart
@workspace/lib/widgets/custom_app_bar.dart  
@workspace/lib/theme/app_theme.dart

Bu üç dosyadaki pattern'e uygun şekilde yeni bir ProfileScreen oluştur
```

### 3. Katmanlı Yaklaşım

Büyük feature'ları küçük parçalara bölün:

```
Yeni bir "Favoriler" özelliği ekleyeceğiz. Sırasıyla:

1. Önce Favorite modeli oluştur (lib/models/favorite.dart)
2. Sonra FavoriteService yaz (lib/services/favorite_service.dart)
3. FavoriteProvider ekle (lib/providers/favorite_provider.dart)
4. Son olarak FavoritesScreen kodla (lib/screens/favorites_screen.dart)

Her adımı tamamladıktan sonra bir sonrakine geç.
```

## 🔧 Proje Yapısı Hatırlatıcıları

### Mimari Katmanlar

```dart
// Copilot'a her zaman bu yapıyı hatırlatın:

lib/
├── screens/      → UI katmanı (sadece widget'lar)
├── services/     → Business logic + Firestore
├── models/       → Data models (fromJson/toJson)
├── providers/    → State management
├── widgets/      → Reusable components
├── utils/        → Helper functions
└── theme/        → AppTheme, colors
```

### Firestore Collection Adları

Copilot'a Firestore collection adlarını hatırlatın:

```dart
// Türkçe collection isimleri kullanıyoruz:
FirestoreCollections.products   → 'urunler'
FirestoreCollections.blogs      → 'bloglar'
FirestoreCollections.users      → 'users'
FirestoreCollections.orders     → 'orders'
FirestoreCollections.categories → 'kategoriler'
```

## 💡 Copilot Komut Örnekleri

### Yeni Feature Ekleme

```
@workspace/lib/services/product_service.dart

ProductService'e benzer bir BlogService oluştur.
Özellikler:
- Firestore'dan blog listesi çek
- Client-side filtering kullan (index gerektirmez)
- published: true olanları filtrele
- Tarihe göre sırala
- Logger ile hata logla
- Try-catch kullan
```

### Mevcut Kod İyileştirme

```
@workspace/lib/screens/home_screen.dart

Bu dosyayı EkmekLab standartlarına göre incele ve şunları düzelt:
1. print() varsa Logger'a çevir
2. Hardcoded string varsa Translation key kullan
3. setState içinde async varsa düzelt
4. Error handling eksikse ekle
```

### Widget Oluşturma

```
@workspace/lib/widgets/product_card.dart

Buna benzer bir BlogCard widget'ı oluştur:
- Stateless widget
- Blog resmi (CachedNetworkImage)
- Başlık, özet, tarih göster
- Tıklanabilir (onTap callback)
- Responsive (mobile/desktop)
- AppTheme renkleri kullan
```

### Provider/State Management

```
@workspace/lib/providers/cart_provider.dart

CartProvider'a benzer bir FavoriteProvider oluştur:
- ChangeNotifier extend et
- Favori ekleme/çıkarma
- Favori kontrolü (isFavorite)
- notifyListeners kullan
- SharedPreferences ile kaydet
```

## 🎨 Kod Stil Hatırlatıcıları

### Logger Kullanımı

```
// ❌ ASLA YAPMA
print('Hata oluştu: $e');

// ✅ DOĞRU YÖNTEM
Logger.error('Firestore hatası: $e');
Logger.info('Kullanıcı giriş yaptı: ${user.email}');
```

### Translation Keys

```
// ❌ YANLIŞ
Text('Ürünler')

// ✅ DOĞRU
Text(AppTranslations.getTranslation(context, 'products'))
```

### Async State Management

```
// ❌ YANLIŞ
setState(() async {
  await loadData();
});

// ✅ DOĞRU
void loadData() async {
  setState(() => _isLoading = true);
  try {
    final data = await service.getData();
    setState(() {
      _data = data;
      _isLoading = false;
    });
  } catch (e) {
    Logger.error('Hata: $e');
    setState(() => _isLoading = false);
  }
}
```

### Firestore Queries

```
// ❌ YANLIŞ (Index gerektirir)
await FirebaseFirestore.instance
  .collection('bloglar')
  .where('published', isEqualTo: true)
  .orderBy('date', descending: true)
  .get();

// ✅ DOĞRU (Client-side filtering)
final snapshot = await FirebaseFirestore.instance
  .collection('bloglar')
  .get();

final blogs = snapshot.docs
  .map((doc) => BlogPost.fromJson(doc.data()))
  .where((blog) => blog.published)
  .toList();
  
blogs.sort((a, b) => b.date.compareTo(a.date));
```

## 🚀 Hızlı Başlangıç Komutları

### Yeni Screen Oluşturma

```
EkmekLab için yeni bir OrderHistoryScreen oluştur:
- Stateful widget
- CustomAppBar kullan
- AuthService ile kullanıcı kontrolü
- OrderService'den siparişleri çek
- Loading indicator göster
- Responsive design (mobile/desktop)
- Logger ile hata yönetimi
- AppTheme renkleri
```

### Yeni Service Oluşturma

```
OrderService oluştur:
- Singleton pattern
- Firestore 'orders' collection
- getUserOrders(userId) metodu
- createOrder(order) metodu
- Client-side filtering
- Try-catch + Logger
- Future<List<Order>> dönüş tipleri
```

### Yeni Model Oluşturma

```
Order modeli oluştur:
- Immutable (final fields)
- fromJson factory constructor
- toJson metodu
- orderDate (DateTime)
- userId (String)
- items (List<OrderItem>)
- totalPrice (double)
- status (enum: pending/processing/completed/cancelled)
```

## 🔍 Debugging ve İyileştirme

### Kod Analizi

```
@workspace/lib/screens/cart_screen.dart

Bu dosyayı analiz et ve şunları kontrol et:
1. Memory leak var mı? (dispose çağrıları)
2. Gereksiz rebuild var mı?
3. Performance sorunları var mı?
4. Best practice'lere uygun mu?
5. EkmekLab standartlarına uygun mu?
```

### Refactoring

```
@workspace/lib/screens/home_screen.dart

Bu dosya çok büyük (2000+ satır). Şunları yap:
1. Widget'ları ayrı dosyalara taşı
2. Helper metodları utils'e taşı
3. Kod tekrarlarını azalt
4. Okunabilirliği artır
```

## 📖 Önemli Dosyalar

Copilot'a referans verirken bu dosyaları kullanın:

- **Mimari**: `.github/copilot-instructions.md`
- **Sabitler**: `lib/utils/constants.dart`
- **Tema**: `lib/theme/app_theme.dart`
- **Logger**: `lib/utils/logger.dart`
- **Translations**: `lib/utils/translations.dart`
- **Routing**: `lib/routes.dart`

## 🎯 Hedefler

GitHub Copilot'u bu proje için en verimli şekilde kullanmak için:

1. ✅ **Tutarlılık**: Her dosya aynı pattern'i takip etmeli
2. ✅ **Kalite**: Logger, Translation, Error handling zorunlu
3. ✅ **Performance**: Client-side filtering, lazy loading
4. ✅ **Güvenlik**: Firestore rules, auth kontrolü
5. ✅ **Maintainability**: Temiz kod, açıklayıcı isimler, dokümantasyon

---

**Son Güncelleme**: 2025-11-27  
**Proje**: EkmekLab - Ekşi Mayalı Ekmek Web  
**Framework**: Flutter Web + Firebase
