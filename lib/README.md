# Ekşi Mayalı Ekmek - Web Uygulaması

Bu proje, Ekşi Mayalı Ekmek işletmesinin web uygulamasını içermektedir. Flutter ile geliştirilmiş bu web uygulaması, hem son kullanıcılar için mağaza arayüzü hem de işletme sahipleri için yönetim paneli içerir.

## Proje Yapısı

Projenin klasör yapısı aşağıdaki gibidir:

```
lib/
├── admin/                  # Admin panel bileşenleri
│   ├── auth/               # Admin girişi
│   ├── dashboard/          # Gösterge paneli
│   ├── orders/             # Sipariş yönetimi
│   ├── products/           # Ürün yönetimi
│   └── widgets/            # Admin paneli özel widget'ları
├── backend/                # Backend konfigürasyonu
├── core/                   # Çekirdek dosyalar, bağımlılık enjeksiyonu vb.
│   └── di/                 # Bağımlılık enjeksiyonu (Service Locator)
├── data/                   # Veri erişim katmanı
│   └── repositories/       # Repository sınıfları
├── domain/                 # Domain katmanı
│   └── repositories/       # Repository interface'leri
├── models/                 # Veri modelleri
├── providers/              # Provider'lar (State yönetimi)
├── screens/                # Uygulama ekranları
├── services/               # Servis sınıfları
├── theme/                  # UI tema tanımlamaları
└── utils/                  # Yardımcı sınıflar ve fonksiyonlar
```

## Teknolojiler ve Mimari

Bu projede aşağıdaki teknolojiler ve mimari yaklaşımlar kullanılmıştır:

### Teknolojiler

1. **Flutter Web**: Uygulama arayüzü
2. **Firebase**:
   - Authentication: Kullanıcı kimlik doğrulama
   - Firestore: Veritabanı
   - Storage: Dosya depolama
3. **Provider**: Durum yönetimi
4. **GetIt**: Bağımlılık enjeksiyonu

### Mimari Yapı

Proje, katmanlı mimari prensipleriyle tasarlanmıştır:

1. **Sunum Katmanı (UI)**: `screens`, `widgets` ve `admin` klasörleri
2. **İş Mantığı Katmanı**: `services` ve `providers` klasörleri
3. **Veri Katmanı**: `repositories` ve `models` klasörleri

## Kod Açıklamaları

Projede, kodun anlaşılabilirliğini artırmak için önemli sınıflar ve metodlar açıklayıcı yorumlarla belgelenmiştir. Örneğin:

- `main.dart`: Uygulama başlangıç noktası ve ana yapılandırma
- `service_locator.dart`: Bağımlılık enjeksiyonu yapılandırması
- `admin_router.dart`: Admin panel yönlendirme mantığı
- `auth_service.dart`: Kimlik doğrulama ve yetkilendirme işlemleri

## Geliştirme Kılavuzu

Uygulamayı geliştirirken dikkat edilmesi gereken noktalar:

### 1. Mevcut Yapıyı Koruma

Yeni özellikler eklerken mevcut mimari yapıyı koruyunuz:

- Yeni servisler için `services/` klasörüne eklemeler yapın
- Yeni modeller için `models/` klasörüne eklemeler yapın
- Yeni ekranlar için `screens/` klasörüne eklemeler yapın

### 2. Bağımlılık Enjeksiyonu

Yeni servisler eklediğinizde, bunları `lib/core/di/service_locator.dart` dosyasına kaydetmeyi unutmayın:

```dart
// Yeni servisinizi şu şekilde kaydedin
getIt.registerLazySingleton<YeniServis>(() => YeniServis());
```

### 3. Tema ve Stil Tutarlılığı

UI geliştirirken mevcut tema yapısını kullanın:

- Renkler için `theme/app_theme.dart` dosyasındaki tanımları kullanın
- Özel widget'lar için mevcut stil kılavuzlarını takip edin

### 4. Hata Yönetimi ve Loglama

Hata durumlarını her zaman düzgün şekilde yönetin ve loglayın:

```dart
try {
  // İşlemler
} catch (e) {
  Logger.error('İşlem sırasında hata: $e');
  // Hata gösterimi veya işlemi
}
```

### 5. Admin Panel Geliştirmeleri

Admin paneline yeni özellikler eklerken:

- Mevcut drawer yapısını güncelleyin
- Yeni rotaları `main.dart` dosyasındaki rotalar bölümüne ekleyin
- Admin yetkisi kontrollerini doğru uygulayın

## Dağıtım (Deployment)

Uygulamayı Firebase Hosting'e deploy etmek için:

1. Web uygulamasını derleyin:

```
flutter build web
```

2. Firebase'e deploy edin:

```
firebase deploy
```

## İletişim ve Destek

Uygulama geliştirme ile ilgili sorularınız için lütfen iletişime geçin.

---

Bu doküman, Ekşi Mayalı Ekmek web uygulamasının geliştirilmesi ve bakımı için hazırlanmıştır.
