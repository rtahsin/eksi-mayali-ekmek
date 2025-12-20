# EkmekLab - Ekşi Mayalı Ekmek Web Projesi
## Copilot Context & Instructions

## 📋 Proje Genel Bakış

**Proje Adı**: EkmekLab - Ekşi Mayalı Ekmek E-Ticaret Platformu  
**Framework**: Flutter Web (Dart)  
**Deployment**: Firebase Hosting + Firestore + Firebase Storage  
**Mimari**: Katmanlı mimari (Screens → Services → Models → Widgets)

---

## 🏗️ Mimari Kurallar

### Katman Yapısı
```
lib/
├── screens/          # UI Ekranları (Pages)
├── widgets/          # Tekrar kullanılabilir UI bileşenleri
├── services/         # Business logic ve API çağrıları
├── models/           # Data models (Firestore mapping)
├── providers/        # State management (Provider pattern)
├── utils/            # Helper functions, constants, logger
├── theme/            # App theme, colors, typography
├── admin/            # Admin panel (ayrı routing)
└── core/             # Dependency injection, service locator
```

### Katman Sorumlulukları
- **Screens**: Sadece UI rendering ve user interaction
- **Services**: Firestore CRUD, authentication, business logic
- **Models**: Data serialization/deserialization, immutable objects
- **Providers**: State management, ChangeNotifier pattern
- **Widgets**: Reusable UI components, no business logic

---

## 📝 Kod Standartları

### Naming Conventions
```dart
// Classes: PascalCase
class ProductService {}
class BlogPost {}

// Files: snake_case
product_service.dart
blog_post.dart

// Variables & Functions: camelCase
final userName = 'Ahmet';
void loadProducts() {}

// Constants: camelCase with const
const primaryColor = Color(0xFF8B4513);

// Private members: _prefix
String _privateField;
void _privateMethod() {}
```

### Import Order
```dart
// 1. Dart core
import 'dart:async';

// 2. Flutter
import 'package:flutter/material.dart';

// 3. External packages (alphabetically)
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';

// 4. Internal imports (relative paths)
import '../models/product.dart';
import '../services/auth_service.dart';
```

### Dosya Başlık Formatı
```dart
// ignore_for_file: prefer_const_constructors

/*
 * [Dosya Adı ve Amacı]
 * 
 * PURPOSE: [Kısa açıklama]
 * LAYER: [UI/Service/Model/Provider]
 * DEPENDS ON: [Bağımlılıklar listesi]
 * 
 * RULES:
 * - [Özel kurallar]
 * 
 * LAST UPDATED: [Tarih]
 */
```

---

## 🎨 UI/UX Kuralları

### Theme System
- **Ana Renk**: `AppTheme.primaryColor` (#8B4513 - Kahverengi)
- **İkincil Renk**: `AppTheme.secondaryColor` (#D2691E - Açık kahverengi)
- **Arka Plan**: Beyaz (#FFFFFF)
- **Text**: Koyu gri (#333333)

### Responsive Design
```dart
// Breakpoints
bool isMobile = width < 600;
bool isTablet = width >= 600 && width < 1024;
bool isDesktop = width >= 1024;

// Padding/Spacing
double padding = isDesktop ? 40.0 : 16.0;
```

### Widget Kuralları
- Her widget için loading state göster (`AppLoadingIndicator`)
- Hata durumlarında user-friendly mesaj (`ScaffoldMessenger`)
- Animasyonlar için `flutter_animate` kullan
- Görseller için `CachedNetworkImage` kullan

---

## 🔥 Firebase & Firestore Kuralları

### Collection İsimleri (Türkçe)
```dart
class FirestoreCollections {
  static const String users = 'users';
  static const String products = 'urunler';
  static const String orders = 'orders';
  static const String categories = 'kategoriler';
  static const String blogs = 'bloglar';
  static const String comments = 'yorumlar';
  static const String settings = 'ayarlar';
}
```

### Firestore Query Pattern
```dart
// ❌ YANLIŞ: Index gerektiren complex query
final snapshot = await FirebaseFirestore.instance
    .collection('bloglar')
    .where('published', isEqualTo: true)
    .orderBy('date', descending: true)
    .get();

// ✅ DOĞRU: Client-side filtering
final snapshot = await FirebaseFirestore.instance
    .collection('bloglar')
    .get();
    
final blogs = snapshot.docs
    .map((doc) => BlogPost.fromJson(doc.data()))
    .where((blog) => blog.published)
    .toList();
blogs.sort((a, b) => b.date.compareTo(a.date));
```

### Error Handling
```dart
try {
  // Firestore operation
} catch (e) {
  Logger.error('Hata mesajı: $e'); // Logger kullan
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Kullanıcıya gösterilecek mesaj')),
  );
}
```

---

## 🔐 Authentication & Authorization

### User Roles
```dart
enum UserRole {
  customer,    // Normal kullanıcı
  admin,       // Tam yetki
  editor,      // Blog/içerik yönetimi
  support,     // Müşteri destek
  superadmin,  // Sistem yöneticisi
}
```

### Admin Panel Access
- Route: `/admin/*`
- Auth check: `AuthService.currentUser.isAdmin`
- Firestore rules: `isAdmin()` function kontrolü

---

## 🚀 State Management

### Provider Pattern
```dart
// ✅ Provider kullanımı
class CartProvider extends ChangeNotifier {
  List<Product> _items = [];
  
  void addItem(Product product) {
    _items.add(product);
    notifyListeners(); // UI'ı güncelle
  }
}

// Widget'ta kullanım
final cart = Provider.of<CartProvider>(context);
// veya
final cart = context.read<CartProvider>(); // Build trigger'lamaz
```

### State Updates
- Async operations için `setState(() async { ... })` kullanma
- Loading states için boolean flag kullan
- Error states için string message kullan

---

## 🌐 Çoklu Dil Desteği

### Translation Pattern
```dart
// ✅ Translation kullanımı
Text(AppTranslations.getTranslation(context, 'keyName'))

// Constants'ta key tanımlama
class TranslationKeys {
  static const String welcome = 'welcome';
  static const String products = 'products';
}
```

---

## 📊 Logging & Debugging

### Logger Kullanımı
```dart
import '../utils/logger.dart';

// ❌ print() kullanma
print('Hata oluştu'); 

// ✅ Logger kullan
Logger.info('Kullanıcı giriş yaptı: ${user.email}');
Logger.error('Firestore hatası: $e');
Logger.warning('Cache eski, yenileniyor...');
```

---

## 🧪 Testing Kuralları

### Test Dosya Yapısı
```
test/
├── screens/          # Screen testleri
├── services/         # Service testleri
├── widgets/          # Widget testleri
└── models/           # Model testleri
```

### Test Naming
```dart
// test/services/auth_service_test.dart
void main() {
  group('AuthService', () {
    test('login ile geçerli kullanıcı giriş yapabilmeli', () {
      // Arrange, Act, Assert
    });
  });
}
```

---

## 📦 Dependency Injection

### Service Locator Pattern
```dart
// core/di/service_locator.dart
class ServiceLocator {
  static final getIt = GetIt.instance;
  
  static void setup() {
    getIt.registerSingleton<AuthService>(AuthService());
    getIt.registerLazySingleton<ProductService>(() => ProductService());
  }
}

// Kullanım
final authService = ServiceLocator.getIt<AuthService>();
```

---

## 🔍 SEO & Web Optimization

### Meta Tags (web/index.html)
```html
<meta name="description" content="Ekşi mayalı ekmek, doğal mayalı ekmek">
<meta name="keywords" content="ekşi maya, ekmek, organik">
<meta property="og:title" content="EkmekLab">
<meta property="og:image" content="/assets/logo/logo.png">
```

### Performance
- `CachedNetworkImage` ile resim önbellekleme
- Lazy loading: `ListView.builder()` kullan
- Pagination: 20 item per page

---

## ⚠️ YAPILAMAYACAKLAR (Anti-Patterns)

```dart
// ❌ ASLA print() kullanma
print('Debug mesajı');

// ❌ Hardcoded strings kullanma
Text('Ürünler');

// ❌ setState içinde async kullanma
setState(() async { await loadData(); });

// ❌ BuildContext'i async sonrası kullanma
await Future.delayed(Duration(seconds: 1));
Navigator.pop(context); // ❌ Mounted check yok

// ❌ Firebase index gerektiren karmaşık sorgular
.where('field1', isEqualTo: x).orderBy('field2') // Index gerekir
```

---

## ✅ İYİ PRATİKLER (Best Practices)

```dart
// ✅ Logger kullan
Logger.info('Debug mesajı');

// ✅ Translation kullan
Text(AppTranslations.getTranslation(context, 'products'))

// ✅ Async'i doğru yönet
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

// ✅ Mounted check yap
if (!mounted) return;
Navigator.pop(context);

// ✅ Client-side filtering tercih et
final filtered = items.where((item) => item.active).toList();
```

---

## 🎯 Özel Talimatlar

### Copilot'a Özel Notlar
1. **Her zaman Logger kullan** - print() önerme
2. **Translation key'leri constants'tan al** - Hardcoded string önerme
3. **Firebase query'lerde index'e dikkat et** - Client-side filtering tercih et
4. **setState içinde async kullanma** - Ayrı metod oluştur
5. **Her widget için loading/error state ekle** - Kullanıcı deneyimi önemli
6. **Admin panel için yetki kontrolü ekle** - Güvenlik öncelikli

### Kod Üretim Sırası
1. Model tanımla
2. Service katmanı yaz (Firestore CRUD)
3. Provider oluştur (gerekirse)
4. Widget/Screen kodla
5. Error handling ekle
6. Logger ekle
7. Translation ekle
8. Test yaz

---

## 📚 Önemli Dosyalar

### Mutlaka Kontrol Et
- `lib/utils/constants.dart` - Tüm sabitler burada
- `lib/theme/app_theme.dart` - Tema tanımları
- `lib/utils/logger.dart` - Logging utility
- `lib/utils/translations.dart` - Çeviri sistemi
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes

### Admin Panel
- `lib/admin/admin_router.dart` - Admin routing
- `lib/admin/widgets/admin_drawer.dart` - Admin menü
- Tüm admin ekranları: `lib/screens/admin/*.dart`

---

## 🔄 Git Workflow

### Commit Message Format
```
feat: Yeni özellik ekle
fix: Bug düzeltmesi
refactor: Kod yapısı iyileştirmesi
style: UI/UX değişikliği
docs: Dokümantasyon güncellemesi
test: Test ekleme/düzeltme
chore: Bağımlılık güncelleme
```

---

## 🚀 Deployment

### Build Commands
```bash
# Web build
flutter build web --release

# Firebase deploy
firebase deploy --only hosting

# Firestore rules deploy
firebase deploy --only firestore:rules

# Firestore indexes deploy
firebase deploy --only firestore:indexes
```

### Environment
- **Production URL**: https://eksimayaliekmekweb.web.app
- **Firebase Project**: eksimayaliekmekweb
- **Firebase Region**: europe-west1

---

**SON GÜNCELLEME**: 2025-11-27  
**PROJE DURUMU**: Production Ready  
**COPILOT VERSİYONU**: GitHub Copilot Pro
