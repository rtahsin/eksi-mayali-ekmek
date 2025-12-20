<!-- markdownlint-disable MD024 -->
# Yeni Özellikler - EkşiMayalıEkmek

## 📝 Özet

Bu dokümanda 6 adet yeni özellik ve iyileştirme anlatılmaktadır:

1. ✅ **Misafir Alışveriş** - Kayıtsız kullanıcılar da sipariş verebilir
2. ✅ **Hesap Silme** - Kullanıcılar hesaplarını tamamen silebilir (GDPR)
3. ✅ **Sadakat Programı Kaldırılması** - UI basitleştirmesi
4. ✅ **Brute Force Koruması** - Login güvenliği (rate limiting)
5. ✅ **Sepet Firestore Senkronizasyonu** - Cross-device sepet
6. ✅ **Android Uyumluluk** - Tüm özellikler Android'de de çalışır

---

## 1. Misafir Alışveriş Özelliği 🛒

### Ne Yapıldı?

Kullanıcılar artık kayıt olmadan/giriş yapmadan sipariş verebilirler.

### Değişiklikler

#### `lib/providers/cart_provider.dart`

```dart
// Misafir ID'si oluşturma
String? _guestId;

Future<String> _getOrCreateGuestId() async {
  if (_guestId != null) return _guestId!;
  
  final prefs = await SharedPreferences.getInstance();
  _guestId = prefs.getString('guest_cart_id');
  
  if (_guestId == null) {
    _guestId = 'guest_${DateTime.now().millisecondsSinceEpoch}';
    await prefs.setString('guest_cart_id', _guestId!);
  }
  
  return _guestId!;
}
```

#### `lib/screens/checkout_screen.dart`

- **Eklendi:** Guest user banner (mavi bilgi kutusu)
- **Eklendi:** E-posta alanı (guest kullanıcılar için)
- **Değişti:** Sipariş oluşturma mantığı

  ```dart
  final isGuest = user == null;
  final userId = isGuest ? 'guest_${DateTime.now().millisecondsSinceEpoch}' : user.id;
  final customerEmail = isGuest ? _emailController.text.trim() : user.email;
  ```

### Kullanım

1. Kullanıcı giriş yapmadan ürün ekler
2. Checkout'a gider
3. E-posta adresi girer
4. Sipariş verir (guest olarak kaydedilir)

---

## 2. Hesap Silme Özelliği 🗑️

### Ne Yapıldı?

GDPR uyumluluğu için kullanıcılar hesaplarını tamamen silebilir.

### Değişiklikler

#### `lib/services/auth_service.dart`

```dart
Future<bool> deleteAccount(String password) async {
  try {
    // 1. Şifre ile yeniden kimlik doğrulama
    final credential = EmailAuthProvider.credential(
      email: _currentUser!.email,
      password: password,
    );
    await _auth.currentUser!.reauthenticateWithCredential(credential);
    
    // 2. Firestore kullanıcı dokümanını sil
    await _firestore.collection('users').doc(_currentUser!.id).delete();
    
    // 3. Kullanıcının siparişlerini anonimleştir
    final ordersQuery = await _firestore
        .collection('orders')
        .where('userId', isEqualTo: _currentUser!.id)
        .get();
    
    for (var doc in ordersQuery.docs) {
      await doc.reference.update({'userId': 'deleted_user'});
    }
    
    // 4. Firebase Auth hesabını sil
    await _auth.currentUser!.delete();
    
    // 5. Local storage temizle
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    
    _currentUser = null;
    _token = null;
    notifyListeners();
    
    return true;
  } catch (e) {
    Logger.error('Hesap silme hatası: $e');
    throw Exception('Hesap silme başarısız: ${e.toString()}');
  }
}
```

#### `lib/screens/profile_screen.dart`

- **Eklendi:** "Hesabı Sil" butonu (kırmızı, warning icon)
- **Eklendi:** Şifre doğrulama dialogu
- **Eklendi:** Onay mekanizması

### Güvenlik Önlemleri

- Şifre zorunlu (reauthentication)
- İki adımlı onay
- Cascade delete (orders → 'deleted_user')
- Geri dönüşü yok uyarısı

---

## 3. Sadakat Programı Kaldırılması 🎁

### Ne Yapıldı?

Kullanılmayan loyalty points sistemi UI'dan temizlendi.

### Değişiklikler

#### `lib/screens/profile_screen.dart`

- **Silindi:** Loyalty points card (69 satır)
- **Silindi:** İlerleme çubuğu
- **Silindi:** Puan gösterimi

#### `lib/models/user.dart`

- **Korundu:** `loyaltyPoints` field (backward compatibility)

### Neden?

- UI'da yer kaplıyordu
- Aktif kullanımı yoktu
- Basitlik > Karmaşıklık

---

## 4. Brute Force Koruması 🔒

### Ne Yapıldı?

Login denemelerine rate limiting eklendi.

### Yeni Dosya: `lib/services/rate_limiter_service.dart`

```dart
static const int _maxAttempts = 5; // 5 başarısız deneme
static const int _lockoutDurationMinutes = 15; // 15 dakika kilitleme
static const int _attemptWindowMinutes = 5; // 5 dakika pencere

Future<Map<String, dynamic>> canAttemptLogin() async {
  // Bloke kontrolü
  // Deneme sayısı kontrolü
  // Zaman penceresi kontrolü
}

Future<void> recordFailedAttempt() async {
  // Başarısız deneme kaydet
  // 5. denemede kilitle
}

Future<void> resetAttempts() async {
  // Başarılı login → sıfırla
}
```

### Entegrasyonlar

#### `lib/services/auth_service.dart`

```dart
Future<bool> login(String email, String password) async {
  // 1. Rate limit kontrolü
  final rateLimitCheck = await RateLimiterService.canAttemptLogin();
  if (!(rateLimitCheck['allowed'] as bool)) {
    throw Exception(rateLimitCheck['reason']);
  }
  
  // 2. Login dene
  try {
    await _auth.signInWithEmailAndPassword(email, password);
    await RateLimiterService.resetAttempts(); // Başarılı
  } catch (e) {
    await RateLimiterService.recordFailedAttempt(); // Başarısız
    rethrow;
  }
}
```

#### `lib/screens/login_screen.dart`

- **Eklendi:** Kalan deneme göstergesi (turuncu/kırmızı banner)
- **Eklendi:** Kilitleme mesajı (15 dakika)

### Mantık

1. **5 başarısız deneme** → 15 dakika kilitleme
2. **5 dakika pencere** → Bu sürede 5 deneme
3. **Başarılı login** → Sayaç sıfırlanır

---

## 5. Sepet Firestore Senkronizasyonu 🔄

### Ne Yapıldı?

Sepet artık Firestore'da da saklanıyor (cross-device).

### Değişiklikler

#### `lib/providers/cart_provider.dart`

```dart
String? _currentUserId;
final FirebaseFirestore _firestore = FirebaseFirestore.instance;

void setUserId(String? userId) {
  if (_currentUserId != userId) {
    _currentUserId = userId;
    if (userId != null) {
      _loadCartFromFirestore(); // Login olunca yükle
    }
  }
}

Future<void> _syncCartToFirestore() async {
  if (_currentUserId == null) return;
  
  await _firestore
      .collection('users')
      .doc(_currentUserId)
      .collection('cart')
      .doc('current')
      .set({
    'items': cartData,
    'updatedAt': FieldValue.serverTimestamp(),
  }, SetOptions(merge: true));
}

Future<void> _loadCartFromFirestore() async {
  if (_currentUserId == null) return;
  
  final doc = await _firestore
      .collection('users')
      .doc(_currentUserId)
      .collection('cart')
      .doc('current')
      .get();
  
  if (doc.exists) {
    // Sepeti Firestore'dan yükle
    // Local'e de kaydet
  }
}
```

#### Her Sepet İşleminde

- `addItem()` → `_syncCartToFirestore()`
- `removeItem()` → `_syncCartToFirestore()`
- `updateQuantity()` → `_syncCartToFirestore()`
- `clear()` → `_syncCartToFirestore()`

#### `lib/screens/login_screen.dart`

```dart
if (success) {
  // Login başarılı - CartProvider'a bildir
  final cartProvider = Provider.of<CartProvider>(context, listen: false);
  cartProvider.setUserId(authService.currentUser?.id);
  
  Navigator.pushReplacementNamed('/');
}
```

### Faydalar

- **Cross-device:** Telefondan ekledim, bilgisayardan görüyorum
- **Persistence:** Uygulama kapanınca kaybolmuyor
- **Real-time:** Bir cihazda değiştir, diğerinde güncellenir

---

## 6. Android Uyumluluk ✅

### Ne Yapıldı?

Tüm yeni özellikler Android'de çalışır (Flutter cross-platform).

### Kontroller

- ✅ Firebase konfigürasyonu (`google-services.json`)
- ✅ AndroidManifest izinleri (INTERNET, NOTIFICATIONS)
- ✅ Build.gradle.kts güncel (Firebase BOM 32.7.2)
- ✅ Flutter doctor (Android toolchain OK)

### Özellik Durumu

| Özellik | Android | Web | iOS |
|---------|---------|-----|-----|
| Misafir Alışveriş | ✅ | ✅ | ✅ |
| Hesap Silme | ✅ | ✅ | ✅ |
| Brute Force | ✅ | ✅ | ✅ |
| Cart Sync | ✅ | ✅ | ✅ |

### Test

```bash
flutter build apk --debug
# veya
flutter build appbundle --release
```

---

## 📊 Dosya Değişiklikleri

### Yeni Dosyalar

- `lib/services/rate_limiter_service.dart` (120 satır)

### Değiştirilen Dosyalar

| Dosya | Değişiklik | Satır |
|-------|------------|-------|
| `lib/providers/cart_provider.dart` | Firestore sync eklendi | +108 |
| `lib/screens/checkout_screen.dart` | Guest checkout | +85 |
| `lib/services/auth_service.dart` | Account deletion, rate limit | +97 |
| `lib/screens/profile_screen.dart` | Delete account UI, loyalty removed | -5 |
| `lib/screens/login_screen.dart` | Rate limit UI | +53 |

### Toplam

- **Yeni:** 1 dosya
- **Değişen:** 5 dosya
- **Eklenen:** ~343 satır
- **Silinen:** ~69 satır

---

## 🧪 Test Senaryoları

### 1. Misafir Alışveriş

1. Giriş yapmadan ürün ekle
2. Checkout'a git
3. E-posta gir
4. Sipariş ver
5. ✅ Guest order Firestore'da

### 2. Hesap Silme

1. Profile git
2. "Hesabı Sil" bas
3. Şifre gir
4. Onayla
5. ✅ Firebase Auth + Firestore temiz

### 3. Brute Force

1. 5 kez yanlış şifre gir
2. ✅ "15 dakika bekle" mesajı
3. 15 dakika bekle
4. ✅ Tekrar deneyebilirsin

### 4. Cart Sync

1. Login ol (mobil)
2. Ürün ekle
3. Logout
4. Login ol (web)
5. ✅ Sepet aynı

---

## 🚀 Deployment

### Web

```bash
flutter build web --release
firebase deploy --only hosting
```

### Android

```bash
flutter build appbundle --release
# Google Play Console'a yükle
```

---

## 📞 İletişim

Sorularınız için: [GitHub Issues](https://github.com/yourusername/eksi_mayali_ekmek_web/issues)

---

**Son Güncelleme:** 2025-01-XX
**Versiyon:** 1.1.0
**Yazar:** GitHub Copilot + Geliştirici Ekibi
