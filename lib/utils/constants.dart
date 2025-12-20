// ignore_for_file: prefer_const_declarations

/// Uygulama genelinde kullanılan sabit değerleri içeren sınıf
///
/// Bu sınıf, uygulama boyunca kullanılan metin, renk ve diğer sabit değerleri içerir.
/// Sabitler tematik olarak organize edilmiştir (API, temalar, hatalar, başlıklar vb.)
class Constants {
  // API URL
  static const String apiUrl = 'https://api.eksimayal.com/api/v1';

  // Uygulama Ayarları
  static const String appName = 'EkmekLab';
  static const String appVersion = '1.0.0';

  // Tema Renkleri
  static const int primaryColorValue = 0xFF8B5E3C;
  static const int accentColorValue = 0xFFD2B48C;

  // Hata Mesajları
  static const String genericErrorMessage = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
  static const String networkErrorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
  static const String authErrorMessage = 'Giriş yapmanız gerekiyor.';

  // Ekran Başlıkları
  static const String homeScreenTitle = 'Ana Sayfa';
  static const String productsScreenTitle = 'Ürünler';
  static const String cartScreenTitle = 'Sepetim';
  static const String favoritesScreenTitle = 'Favorilerim';
  static const String orderScreenTitle = 'Sipariş Ver';
  static const String orderHistoryScreenTitle = 'Sipariş Geçmişi';
  static const String profileScreenTitle = 'Profilim';
  static const String loginScreenTitle = 'Giriş Yap';
  static const String registerScreenTitle = 'Kayıt Ol';
  static const String checkoutScreenTitle = 'Ödeme';
  static const String orderDetailScreenTitle = 'Sipariş Detayı';
  static const String blogListScreenTitle = 'Blog';
  static const String blogDetailScreenTitle = 'Blog Detayı';

  // Buton Metinleri
  static const String buttonLogin = 'Giriş Yap';
  static const String buttonRegister = 'Kayıt Ol';
  static const String buttonAddToCart = 'Sepete Ekle';
  static const String buttonBuyNow = 'Hemen Al';
  static const String buttonCheckout = 'Ödemeye Geç';
  static const String buttonSave = 'Kaydet';
  static const String buttonCancel = 'İptal';
  static const String buttonDelete = 'Sil';
  static const String buttonEdit = 'Düzenle';
  static const String buttonContinue = 'Devam Et';
  static const String buttonLogout = 'Çıkış Yap';

  // Placeholder Metinleri
  static const String placeholderSearch = 'Ara...';
  static const String placeholderEmail = 'E-posta adresiniz';
  static const String placeholderPassword = 'Şifreniz';
  static const String placeholderName = 'Adınız Soyadınız';
  static const String placeholderAddress = 'Adresiniz';
  static const String placeholderPhone = 'Telefon Numaranız';

  // Sipariş Durumları
  static const String orderStatusPending = 'pending';
  static const String orderStatusProcessing = 'processing';
  static const String orderStatusShipped = 'shipped';
  static const String orderStatusDelivered = 'delivered';
  static const String orderStatusCancelled = 'cancelled';

  // Ödeme Yöntemleri
  static const String paymentMethodCreditCard = 'credit_card';
  static const String paymentMethodCashOnDelivery = 'cash_on_delivery';

  // Dosya Yolları
  static const String imagePath = 'assets/images/';
  static const String logoPath = 'assets/images/logo.png';
  static const String placeholderImagePath = 'assets/images/placeholder.png';
  static const String noImagePath = 'assets/images/no_image.png';

  // Diğer Sabitler
  static const int pageSize = 10;
  static const double defaultPadding = 16.0;
  static const double borderRadius = 12.0;

  // Admin Panel Başlıkları
  static const String adminDashboardTitle = 'Yönetim Paneli';
  static const String adminProductsTitle = 'Ürün Yönetimi';
  static const String adminOrdersTitle = 'Sipariş Yönetimi';
  static const String adminUsersTitle = 'Kullanıcı Yönetimi';
  static const String adminBlogsTitle = 'Blog Yönetimi';
  static const String adminAnalyticsTitle = 'Analitik';
  static const String adminMarketingTitle = 'Pazarlama';
  static const String adminSettingsTitle = 'Ayarlar';

  // Başarı Mesajları
  static const String successLogin = 'Başarıyla giriş yapıldı.';
  static const String successRegister = 'Hesabınız başarıyla oluşturuldu.';
  static const String successAddToCart = 'Ürün sepete eklendi.';
  static const String successOrder = 'Siparişiniz başarıyla oluşturuldu.';
  static const String successUpdate = 'Bilgileriniz güncellendi.';

  // API Endpoint'leri
  static const String apiBaseUrl = 'https://api.eksimayaliekmek.com';
  static const String apiProducts = '/products';
  static const String apiOrders = '/orders';
  static const String apiUsers = '/users';
  static const String apiAuth = '/auth';

  // Animasyon süreleri
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);
  static const Duration mediumAnimationDuration = Duration(milliseconds: 300);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);

  // Önbellek boyutları
  static const int maxCacheItems = 100;
  static const int maxCacheSizeBytes = 50 * 1024 * 1024; // 50 MB

  // Liste yükleme limitleri
  static const int initialLoadLimit = 10;
  static const int paginationLoadLimit = 10;

  // Resim boyutları
  static const double thumbnailSize = 100.0;
  static const double mediumImageSize = 300.0;
  static const double largeImageSize = 600.0;

  // Ağ zaman aşımı süreleri
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Widget yeniden oluşturma önleme
  static const Duration debounceTime = Duration(milliseconds: 500);
  static const Duration throttleTime = Duration(milliseconds: 500);
}

/// Firestore Koleksiyon Adları
///
/// Bu sınıf, Firebase Firestore veritabanındaki koleksiyon adlarını içerir.
/// Koleksiyon adları burada sabitler olarak tanımlanmıştır, böylece kodda
/// hardcoded string kullanmak yerine bu sabitler kullanılarak tutarlılık sağlanır.
class FirestoreCollections {
  // Birleştirilmiş kullanıcı koleksiyonu (eski: 'kullanicilar') artık 'users'
  static const String users = 'users';
  static const String admins = 'adminler';
  static const String products = 'urunler';
  static const String orders = 'orders';
  static const String categories = 'kategoriler';
  static const String blogs = 'bloglar';
  static const String comments = 'yorumlar';
  static const String ratings = 'puanlar';
  static const String notifications = 'bildirimler';
  static const String promotions = 'promosyonlar';
  static const String paymentMethods = 'odeme_yontemleri';
  static const String paymentTransactions = 'odeme_islemleri';
  static const String settings = 'ayarlar';
}

/// SharedPreferences Anahtar Adları
///
/// Bu sınıf, yerel depolama (SharedPreferences) için kullanılan anahtar adlarını içerir.
/// Bu anahtarlar kullanılarak kullanıcı tercihleri ve uygulama durumu cihazda saklanır.
class PreferenceKeys {
  static const String userData = 'userData';
  static const String token = 'token';
  static const String theme = 'theme';
  static const String locale = 'locale';
  static const String cart = 'cart';
  static const String savedEmail = 'savedEmail';
  static const String savedPassword = 'savedPassword'; // Encrypted password
  static const String autoLoginEnabled = 'autoLoginEnabled';
  static const String onboardingCompleted = 'onboardingCompleted';
  static const String notificationsEnabled = 'notificationsEnabled';
}
