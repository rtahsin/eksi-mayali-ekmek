# 🍞 EkmekLab - Proje Master Dokümantasyonu

**Proje Adı**: EkmekLab - Ekşi Mayalı Ekmek E-Ticaret Platformu  
**Platform**: Flutter Web  
**Son Güncelleme**: 30 Aralık 2025  
**Versiyon**: 1.0 Production

---

## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [Teknoloji Stack](#teknoloji-stack)
3. [Mimari Yapı](#mimari-yapı)
4. [Klasör Yapısı](#klasör-yapısı)
5. [Anahtar Servisler](#anahtar-servisler)
6. [Firestore Koleksiyonları](#firestore-koleksiyonları)
7. [Önemli Özellikler](#önemli-özellikler)
8. [Admin Panel](#admin-panel)
9. [Deploy & DevOps](#deploy--devops)
10. [Sorun Giderme](#sorun-giderme)

---

## 🎯 Proje Özeti

### Ne İçin?

Beylikdüzü'nde ekşi mayalı ekmek üreten bir işletmenin:

- **E-ticaret sitesi** (müşteriler için)
- **Admin paneli** (işletme yönetimi için)
- **Mobil-optimize yönetim** (telefon üzerinden hızlı stok/sipariş yönetimi)

### Temel İşlevler

**Müşteri Tarafı:**

- ✅ Ürün görüntüleme & arama
- ✅ Sepet yönetimi
- ✅ Sipariş oluşturma
- ✅ Sipariş takibi
- ✅ Google One Tap login
- ✅ Blog okuma
- ✅ AI ChatBot desteği

**Admin Tarafı:**

- ✅ Dashboard (istatistikler, grafikler)
- ✅ Ürün/Kategori CRUD
- ✅ Stok yönetimi (pagination, toplu işlemler)
- ✅ Sipariş yönetimi (durum güncelleme, pagination)
- ✅ Müşteri yönetimi
- ✅ Blog yönetimi
- ✅ Audit logs (denetim kayıtları)
- ✅ Mobil-optimize erişim (`/admin-mobile`)

---

## 🛠️ Teknoloji Stack

### Frontend

```yaml
Framework: Flutter 3.x (Web)
Language: Dart
UI Library: Material Design 3
State Management: Provider pattern
Dependency Injection: GetIt
```

### Backend & Infrastructure

```yaml
Authentication: Firebase Auth
Database: Cloud Firestore
Storage: Firebase Storage
Functions: Cloud Functions (Node.js)
Hosting: Firebase Hosting
Analytics: Firebase Analytics
```

### Key Packages

```yaml
# Core
firebase_core: ^2.32.0
cloud_firestore: ^4.17.5
firebase_auth: ^4.20.0
provider: ^6.1.2
get_it: ^7.7.0

# UI/UX
flutter_animate: ^4.5.0
cached_network_image: ^3.4.0
google_fonts: ^6.2.1
fl_chart: ^0.70.2
smooth_page_indicator: ^1.2.1

# Features
image_picker: ^1.1.2
file_picker: ^8.0.7
connectivity_plus: ^5.0.2
shared_preferences: ^2.5.2
intl: ^0.19.0
```

---

## 🏗️ Mimari Yapı

### Katmanlı Mimari

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer (UI)                  │
│  screens/ widgets/ admin/                        │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Business Logic Layer                     │
│  services/ providers/                            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Data Layer                               │
│  repositories/ models/                           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         External Services                        │
│  Firebase (Auth, Firestore, Storage, Functions)│
└─────────────────────────────────────────────────┘
```

### SOLID Principles

- **Single Responsibility**: Her servis tek bir sorumluluğa sahip
- **Open/Closed**: Extension'a açık, modification'a kapalı
- **Liskov Substitution**: Interface'ler üzerinden çalışma
- **Interface Segregation**: Repository pattern ile ayrıştırma
- **Dependency Inversion**: GetIt ile dependency injection

---

## 📁 Klasör Yapısı

```
lib/
├── admin/                      # Admin Panel (Ayrı Routing)
│   ├── admin_app.dart          # Admin MaterialApp
│   ├── admin_router.dart       # Admin routing logic
│   ├── auth/
│   │   └── admin_login.dart    # Admin giriş + session yönetimi
│   ├── dashboard/
│   │   └── admin_dashboard.dart # Ana dashboard (stats, charts)
│   ├── products/
│   │   ├── admin_products.dart  # Ürün listesi (pagination, toplu işlem)
│   │   └── product_form.dart    # Ürün ekleme/düzenleme formu
│   ├── orders/
│   │   └── admin_orders.dart    # Sipariş listesi (pagination, filtreleme)
│   ├── customers/
│   │   └── admin_customers.dart # Müşteri yönetimi
│   ├── categories/
│   │   └── admin_categories.dart # Kategori CRUD
│   ├── mobile/
│   │   └── admin_mobile_landing.dart # Mobil hızlı erişim
│   └── widgets/
│       ├── admin_app_bar.dart   # Admin AppBar
│       └── admin_drawer.dart    # Admin Drawer (badge sistemli)
│
├── backend/
│   ├── firebase_config.dart     # Firebase initialization
│   └── firebase_service.dart    # Firebase helper methods
│
├── core/
│   └── di/
│       └── service_locator.dart # GetIt configuration
│
├── data/
│   └── repositories/
│       ├── user_repository.dart
│       └── product_repository.dart
│
├── domain/
│   └── repositories/
│       ├── i_user_repository.dart
│       └── i_product_repository.dart
│
├── models/
│   ├── user.dart                # User, Address, Preferences
│   ├── product.dart             # Product, Variant
│   ├── order.dart               # Order, OrderItem, OrderStatus
│   ├── cart_item.dart           # CartItem
│   ├── category.dart            # Category
│   ├── blog_post.dart           # BlogPost
│   ├── chatbot_message.dart     # ChatBotMessage
│   └── settings/                # App settings models
│
├── providers/
│   ├── cart_provider.dart       # Sepet state management
│   ├── theme_provider.dart      # Tema yönetimi
│   └── notification_position_provider.dart
│
├── screens/                     # Kullanıcı UI ekranları
│   ├── home_screen.dart         # Ana sayfa
│   ├── cart_screen.dart         # Sepet
│   ├── checkout_screen.dart     # Ödeme
│   ├── login_screen.dart        # Giriş
│   ├── register_screen.dart     # Kayıt
│   ├── profile_screen.dart      # Profil
│   ├── order_history_screen.dart
│   ├── blog_list_screen.dart
│   ├── blog_detail_screen.dart
│   └── ai_assistant_screen.dart # ChatBot
│
├── services/                    # Business Logic
│   ├── auth_service.dart        # 🔐 Auth (login, register, session)
│   ├── product_service.dart     # 📦 Product CRUD + cache
│   ├── order_service.dart       # 🛒 Order creation + tracking
│   ├── cart_service.dart        # 🛍️ Cart management
│   ├── payment_service.dart     # 💳 Payment processing
│   ├── delivery_service.dart    # 🚚 Delivery tracking
│   ├── notification_service.dart # 🔔 In-app notifications
│   ├── chatbot_service.dart     # 🤖 AI ChatBot
│   ├── audit_log_service.dart   # 📝 Audit logging
│   ├── settings_service.dart    # ⚙️ App settings
│   ├── image_service.dart       # 🖼️ Image upload/resize
│   ├── connection_service.dart  # 🌐 Network monitoring
│   └── api_service.dart         # 🔌 External API calls
│
├── theme/
│   └── app_theme.dart           # Tema renkleri, typography
│
├── utils/
│   ├── constants.dart           # Sabitler, Firestore collections
│   ├── logger.dart              # Logging utility
│   ├── translations.dart        # Çoklu dil desteği
│   └── page_transitions.dart    # Sayfa geçiş animasyonları
│
├── widgets/                     # Reusable UI components
│   ├── custom_button.dart
│   ├── product_card.dart
│   ├── loading_indicator.dart
│   └── ...
│
├── main.dart                    # 🚀 App entry point
├── routes.dart                  # 🗺️ Route configuration
└── firebase_options.dart        # Firebase config (auto-generated)
```

---

## 🔑 Anahtar Servisler

### 1. AuthService

**Dosya**: `lib/services/auth_service.dart`

**Sorumluluklar:**

- Kullanıcı kayıt (email/password, Google)
- Login/Logout
- Session yönetimi (Firebase Persistence.LOCAL)
- Admin yetki kontrolü
- Profil güncelleme
- Email kaydederek "Beni Hatırla" (güvenli - şifre kaydetmez)

**Önemli Metodlar:**

```dart
Future<bool> login(String email, String password)
Future<bool> signInWithGoogle()
Future<bool> register(String email, String password, String fullName)
Future<void> logout()
bool get isAdmin
User? get currentUser
```

**Session Yönetimi:**

- Web'de `Persistence.LOCAL` kullanılır (30 gün)
- Tarayıcı kapansa bile session açık kalır
- `/admin-mobile` route'u session'ı kontrol eder, varsa direkt açar

---

### 2. ProductService

**Dosya**: `lib/services/product_service.dart`

**Sorumluluklar:**

- Ürün CRUD işlemleri
- Stok yönetimi
- Client-side cache (SharedPreferences)
- Kategori reorder (drag & drop)
- Toplu işlemler (fiyat/stok güncelleme)
- Soft delete (geri yükleme)

**Collection**: `urunler`

**Önemli Özellikler:**

- Pagination desteği (20 ürün/sayfa)
- Real-time stream updates
- Image upload & resize (ImageService entegrasyonu)
- Audit log entegrasyonu

**Toplu İşlemler:**

```dart
Future<void> bulkUpdatePriceByPercentage(List<String> productIds, double percentage)
Future<void> bulkSetStock(List<String> productIds, int stock)
Future<void> bulkIncreaseStock(List<String> productIds, int amount)
```

---

### 3. OrderService

**Dosya**: `lib/services/order_service.dart`

**Sorumluluklar:**

- Sipariş oluşturma
- Sipariş durumu güncelleme
- Sipariş geçmişi
- Notification entegrasyonu
- Payment entegrasyonu

**Collection**: `siparisler`

**Order Status Flow:**

```
pending → processing → ready → completed
    ↓         ↓          ↓
cancelled  cancelled  cancelled
```

**Status History:**
Her durum değişikliği `statusHistory` array'inde saklanır:

```dart
{
  status: "ready",
  timestamp: Timestamp,
  updatedBy: "admin@example.com",
  note: "Sipariş hazır, teslim alınabilir"
}
```

---

### 4. AuditLogService

**Dosya**: `lib/services/audit_log_service.dart`

**Sorumluluklar:**

- Kritik işlemleri kaydetme
- Değişiklik takibi
- Admin panelinde görüntüleme

**Collection**: `admin_logs`

**Log Tipleri:**

```dart
enum AuditAction {
  create, update, delete, restore,
  bulkUpdate, statusChange, roleChange,
  login, logout
}
```

**Örnek Log:**

```json
{
  "action": "bulkUpdate",
  "entityType": "product",
  "entityId": null,
  "userId": "admin123",
  "userName": "Tahsin Reyhan",
  "timestamp": "2025-12-30T10:30:00Z",
  "details": {
    "operation": "bulkPriceUpdate",
    "affectedCount": 15,
    "percentage": 10
  }
}
```

---

### 5. ChatBotService

**Dosya**: `lib/services/chatbot_service.dart`

**Sorumluluklar:**

- Firestore'dan predefined messages çekme
- Ollama LLM entegrasyonu (opsiyonel)
- Mesaj kategorileme
- Admin CRUD

**Collection**: `chatbot_messages`

**Mesaj Yapısı:**

```dart
{
  "id": "msg_001",
  "question": "Teslimat süresi ne kadar?",
  "answer": "Beylikdüzü içi 1-2 saat, dışı 3-4 saat.",
  "category": "delivery",
  "keywords": ["teslimat", "süre", "teslim"],
  "priority": 1
}
```

---

## 🗄️ Firestore Koleksiyonları

### Ana Koleksiyonlar

| Collection | Türkçe | Açıklama | Örnek Doc ID |
|------------|--------|----------|--------------|
| `users` | Kullanıcılar | Müşteri/Admin bilgileri | Firebase UID |
| `urunler` | Ürünler | Ekmek ve diğer ürünler | Auto-generated |
| `kategoriler` | Kategoriler | Ürün kategorileri | Auto-generated |
| `siparisler` | Siparişler | Müşteri siparişleri | Auto-generated |
| `bloglar` | Blog | Blog yazıları | Auto-generated |
| `yorumlar` | Yorumlar | Ürün/blog yorumları | Auto-generated |
| `ayarlar` | Ayarlar | Uygulama ayarları | `store` (singleton) |
| `chatbot_messages` | ChatBot | ChatBot Q&A | Auto-generated |
| `admin_logs` | Audit Logs | Denetim kayıtları | Auto-generated |
| `background_images` | Arka Planlar | Ana sayfa slider görselleri | Auto-generated |

### Firestore Rules Özeti

**Security Rules** (`firestore.rules`):

```javascript
// Kullanıcılar kendi verilerini okuyabilir
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}

// Admin yetkisi kontrolü
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}

// Admin CRUD
match /urunler/{productId} {
  allow read: if true; // Herkes okuyabilir
  allow write: if isAdmin(); // Sadece admin yazabilir
}
```

---

## ✨ Önemli Özellikler

### 1. Pagination System

**Nerede**: Admin Products, Admin Orders

**Nasıl Çalışır:**

```dart
// State
int _currentPage = 1;
int _itemsPerPage = 20;
int _totalItems = 0;

// Filtering + Pagination
void _filterProducts() {
  _totalItems = allProducts.length;
  final startIndex = (_currentPage - 1) * _itemsPerPage;
  final endIndex = min(startIndex + _itemsPerPage, _totalItems);
  _filteredProducts = allProducts.sublist(startIndex, endIndex);
}

// UI
Row(
  children: [
    Text('Toplam $_totalItems ürün - Sayfa $_currentPage / $totalPages'),
    IconButton(Icons.first_page, onPressed: () => _goToPage(1)),
    IconButton(Icons.chevron_left, onPressed: _previousPage),
    Text('$_currentPage'),
    IconButton(Icons.chevron_right, onPressed: _nextPage),
    IconButton(Icons.last_page, onPressed: () => _goToPage(totalPages)),
  ],
)
```

---

### 2. Badge Notification System

**Nerede**: Admin Dashboard, Admin Drawer

**Özellikler:**

- 🔴 Pending siparişler (status = pending/processing)
- 🟠 Düşük stok (stock < 10)

**Implementasyon:**

```dart
// AdminDrawer
int _pendingOrderCount = 0;
int _lowStockCount = 0;

Future<void> _loadBadgeCounts() async {
  // Firestore count queries
  final pendingOrders = await firestore
      .collection('siparisler')
      .where('orderStatus', whereIn: ['pending', 'processing'])
      .count()
      .get();
  
  setState(() => _pendingOrderCount = pendingOrders.count);
}

// Badge widget
if (badge != null && badge > 0)
  Container(
    padding: EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: badgeColor ?? Colors.red,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      badge > 99 ? '99+' : '$badge',
      style: TextStyle(color: Colors.white, fontSize: 10),
    ),
  )
```

---

### 3. Mobil-Optimize Admin

**Route**: `/admin-mobile`  
**Dosya**: `lib/admin/mobile/admin_mobile_landing.dart`

**Özellikler:**

- 📱 Büyük dokunma alanları
- ⚡ 4 hızlı erişim butonu (Stok, Siparişler, Dashboard, Tam Panel)
- 🔐 Otomatik session kontrolü (şifre sormuyor)
- 💡 PWA hatırlatıcısı

**Session Management:**

```dart
Future<void> _checkAuth() async {
  final authService = Provider.of<AuthService>(context, listen: false);
  
  // Firebase session kontrolü
  await Future.delayed(Duration(milliseconds: 500));
  
  if (authService.isLoggedIn && authService.isAdmin) {
    // Session mevcut, direkt göster
    Logger.info('Session OK: ${authService.currentUser?.email}');
    setState(() => _isChecking = false);
  } else {
    // Login'e yönlendir
    Navigator.pushReplacementNamed(context, '/admin/login');
  }
}
```

**PWA Manifest:**

```json
{
  "shortcuts": [
    {
      "name": "Admin Panel",
      "short_name": "Admin",
      "description": "Yönetim Paneli - Stok ve Siparişler",
      "url": "/admin",
      "icons": [{"src": "icons/Icon-192.png", "sizes": "192x192"}]
    }
  ]
}
```

---

### 4. Toplu İşlemler (Bulk Operations)

**Nerede**: Admin Products

**Özellikler:**

- ✅ Çoklu seçim (checkbox)
- 💰 Toplu fiyat güncelleme (yüzde)
- 📦 Toplu stok set etme
- ➕ Toplu stok arttırma
- 🗑️ Toplu silme

**Firestore Batch:**

```dart
Future<void> bulkUpdatePriceByPercentage(
  List<String> productIds, 
  double percentage
) async {
  final batch = _firestore.batch();
  
  for (final id in productIds) {
    final doc = _firestore.collection('urunler').doc(id);
    final product = _products.firstWhere((p) => p.id == id);
    final newPrice = product.price * (1 + percentage / 100);
    
    batch.update(doc, {'price': newPrice});
  }
  
  await batch.commit(); // Tek seferde yazılır
  
  // Audit log
  await AuditLogService().log(
    action: AuditAction.bulkUpdate,
    entityType: 'product',
    details: {
      'operation': 'bulkPriceUpdate',
      'affectedCount': productIds.length,
      'percentage': percentage,
    },
  );
}
```

---

## 👨‍💼 Admin Panel

### Rol Sistemi

| Rol | Yetki Seviyesi | Erişim |
|-----|----------------|--------|
| `user` | 0 | Müşteri (e-ticaret) |
| `support` | 2 | Sipariş durum güncelleme |
| `editor` | 3 | İçerik yönetimi (blog, ürün) |
| `admin` | 4 | Tüm yönetim + rol atama |
| `superadmin` | 5 | Admin + sistem ayarları |

**Yetki Kontrolü:**

```dart
class AuthService {
  bool get isAdmin => _currentUser?.isAdmin ?? false;
  
  String get currentRole {
    if (_currentUser == null) return 'anonymous';
    if (_currentUser!.email.toLowerCase() == 'tahsinreyhan@gmail.com') {
      return 'superadmin'; // Hardcoded superadmin
    }
    return _currentUser!.role;
  }
  
  bool hasAtLeast(String role) => _roleRank(currentRole) >= _roleRank(role);
}
```

### Admin Routes

```dart
'/admin' → AdminRouter() // Yetki kontrolü + routing
'/admin/login' → AdminLoginPage()
'/admin/dashboard' → AdminDashboardPage()
'/admin/products' → AdminProductsPage()
'/admin/orders' → AdminOrdersPage()
'/admin/customers' → AdminCustomersPage()
'/admin/categories' → AdminCategoriesPage()
'/admin/blogs' → AdminBlogs()
'/admin/chatbot' → AdminChatBotScreen()
'/admin-mobile' → AdminMobileLanding()
```

### Admin Drawer Menu Yapısı

```
📊 Dashboard (currentIndex: 0)
📦 STOK YÖNETİMİ (Collapsible)
  ├─ Ürünler (currentIndex: 1)
  ├─ Kategoriler (currentIndex: 2)
  └─ Stok Durumu (currentIndex: 7, badge: lowStockCount)
📋 SATIŞ & SİPARİŞLER (Collapsible)
  ├─ Siparişler (currentIndex: 3, badge: pendingOrderCount)
  ├─ Üretim Kayıtları (currentIndex: 6)
  ├─ Satış Kayıtları (currentIndex: 8)
  └─ Giderler (currentIndex: 9)
📝 İÇERİK YÖNETİMİ
  ├─ Blog (currentIndex: 4)
  └─ ChatBot (currentIndex: 5)
⚙️ DİĞER (Collapsible)
  ├─ Müşteriler (currentIndex: 11)
  ├─ Ayarlar (currentIndex: 12)
  ├─ Arka Plan Görselleri (currentIndex: 13)
  └─ Denetim Kayıtları (currentIndex: 14)
```

---

## 🚀 Deploy & DevOps

### Build Komutu

```powershell
flutter clean
flutter pub get
flutter build web --release
```

**Build Süresi:** ~2-3 dakika  
**Çıktı:** `build/web/` klasörü

### Firebase Deploy

```powershell
firebase deploy --only hosting
```

**Deploy Edilen Dosyalar:**

- `build/web/index.html`
- `build/web/main.dart.js` (+ 27 part dosya)
- `build/web/assets/`
- `build/web/manifest.json` (PWA)

### Ortam Bilgileri

**Production:**

- URL: <https://eksimayaliekmekweb.web.app>
- Firebase Project: `eksimayaliekmekweb`
- Region: europe-west1

**Firebase Services:**

- Authentication ✅
- Firestore ✅
- Storage ✅
- Functions ✅ (Node.js 20)
- Hosting ✅
- Analytics ✅

### Environment Variables

```dart
// .env (functions/)
SENDGRID_API_KEY=SG.xxx
ADMIN_EMAIL=tahsinreyhan@gmail.com
```

### CI/CD (Future)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter build web --release
      - uses: FirebaseExtended/action-hosting-deploy@v0
```

---

## 🔧 Sorun Giderme

### 1. Build Hataları

**Hata:** `Method not found: 'AdminMobileLanding'`  
**Çözüm:** Export ekle

```dart
// lib/admin/admin_router.dart (dosya başı)
export 'mobile/admin_mobile_landing.dart';
```

**Hata:** `Undefined name 'isTablet'`  
**Çözüm:** Kullanılmayan değişken, kaldır veya tanımla

```dart
// Kaldır
final isTablet = MediaQuery.of(context).size.width > 600;

// Veya direkt kullan
crossAxisCount: MediaQuery.of(context).size.width > 600 ? 3 : 2
```

---

### 2. Müşteriler Sayfası Boş

**Sorun:** `/admin/users` route'u var ama `/admin/customers` bekleniyordu

**Çözüm:**

```dart
// lib/admin/widgets/admin_drawer.dart
Navigator.pushReplacementNamed(context, '/admin/customers'); // ✅

// lib/admin/customers/admin_customers.dart
drawer: AdminDrawer(currentIndex: 11), // ✅ Doğru index
```

---

### 3. Session/Login Sorunları

**Sorun:** Her seferinde şifre soruyor

**Kontrol:**

```dart
// lib/services/auth_service.dart
await _auth.setPersistence(firebase_auth.Persistence.LOCAL); // ✅

// lib/admin/mobile/admin_mobile_landing.dart
await Future.delayed(Duration(milliseconds: 500)); // Firebase initialize bekle
if (authService.isLoggedIn && authService.isAdmin) {
  // Session var, direkt göster
}
```

---

### 4. Firestore Index Gerekli

**Hata:** `FAILED_PRECONDITION: The query requires an index`

**Çözüm:**

1. Hata mesajındaki link'i tıkla (otomatik index oluşturur)
2. Veya manuel: Firebase Console → Firestore → Indexes
3. `firestore.indexes.json` dosyasını deploy et:

```powershell
firebase deploy --only firestore:indexes
```

**Örnek Index:**

```json
{
  "collectionGroup": "siparisler",
  "fields": [
    {"fieldPath": "orderStatus", "order": "ASCENDING"},
    {"fieldPath": "createdAt", "order": "DESCENDING"}
  ]
}
```

---

### 5. Image Upload Hataları

**Sorun:** CORS hatası

**Çözüm:**

```powershell
# storage.rules güncelle
gsutil cors set cors.json gs://eksimayaliekmekweb.firebasestorage.app

# cors.json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

---

## 📚 Ek Dokümantasyon

Projede mevcut diğer dokümantasyon dosyaları:

| Dosya | Açıklama |
|-------|----------|
| `README.md` | Kullanıcı rehberi (Türkçe) |
| `lib/README.md` | Teknik mimari özet |
| `docs/proje_kodu_ozeti.txt` | Kod yapısı detayları |
| `docs/proje_akis_semasi.txt` | Uygulama akış şeması |
| `ADMIN_PANEL_STRUCTURE.md` | Admin panel yapısı |
| `ADMIN_MOBIL_ERISIM.md` | Mobil admin rehberi |
| `ADMIN_PANEL_OZELLIKLERI.md` | Admin özellikler analizi |
| `CHATBOT_README.md` | ChatBot entegrasyonu |
| `OLLAMA_INTEGRATION.md` | Local LLM kurulumu |
| `.github/copilot-instructions.md` | **Copilot için proje kuralları** |

---

## 🎯 Gelecek Planları (Roadmap)

### Q1 2026

- [ ] Chart/grafik entegrasyonu (fl_chart)
- [ ] Excel export (ürün/sipariş)
- [ ] Advanced filtering (tarih aralığı, fiyat aralığı)
- [ ] Bulk image upload
- [ ] Email notifications (order status change)

### Q2 2026

- [ ] Mobile app (Flutter native)
- [ ] Push notifications (FCM)
- [ ] Payment integration (Iyzico/PayTR)
- [ ] Invoice generation (PDF)
- [ ] Customer loyalty program

### Q3 2026

- [ ] Multi-store support
- [ ] Advanced analytics dashboard
- [ ] Inventory prediction (AI)
- [ ] WhatsApp Business API
- [ ] QR code menu

---

## 📞 İletişim & Destek

**Geliştirici:** Tahsin Reyhan  
**Email:** <tahsinreyhan@gmail.com>  
**Proje Repository:** [GitHub - Private]  
**Production URL:** <https://eksimayaliekmekweb.web.app>

---

## 📝 Değişiklik Geçmişi

### v1.0 - 30 Aralık 2025

- ✅ Production'a alındı
- ✅ Admin panel pagination eklendi
- ✅ Badge notification sistemi
- ✅ Mobil-optimize admin (`/admin-mobile`)
- ✅ Session yönetimi düzeltmeleri
- ✅ Müşteriler route fix
- ✅ Linter cleanup (ignore_for_file kaldırıldı)

### v0.9 - Aralık 2025

- ✅ ChatBot entegrasyonu
- ✅ Audit logs
- ✅ Toplu işlemler
- ✅ PWA manifest

### v0.8 - Kasım 2025

- ✅ Admin panel v2
- ✅ Firebase entegrasyonu
- ✅ Ürün/Kategori CRUD
- ✅ Sipariş yönetimi

---

**🍞 EkmekLab - Geleneksel Lezzet, Modern Teknoloji**
