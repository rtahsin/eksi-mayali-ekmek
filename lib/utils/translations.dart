import 'package:flutter/material.dart';

// Basit çeviri sınıfı
class AppTranslations {
  static final Map<String, String> _translations = {
    // Genel
    'appName': 'EkmekLab',
    'loading': 'Yükleniyor...',
    'error': 'Hata',
    'success': 'Başarılı',
    'cancel': 'İptal',
    'save': 'Kaydet',
    'delete': 'Sil',
    'edit': 'Düzenle',
    'search': 'Ara...',
    'seeAll': 'Tümünü Gör',
    'featuredProducts': 'Öne Çıkan Ürünler',
    'about': 'Hakkımızda',

    // Ana Sayfa
    'home': 'Ana Sayfa',
    'products': 'Ürünlerimiz',
    'blog': 'Blog',
    'youtube': 'YouTube',
    'myOrders': 'Siparişlerim',
    'aiAssistant': 'AI Asistan',
    'analytics': 'Analitik',
    'broadcastManagement': 'Yayın Yönetimi',
    'heroTitle': 'Eski Tatları Yeniden\nKeşfetmek İsteyenler...',
    'heroSubtitle': 'Hemşinliden katkısız, doğal ve Artisan ekmekleri\nkapınıza kadar geliyor.',
    'browseProducts': 'ÜRÜNLERİMİZE GÖZ ATIN',

    // Ürün Kategorileri
    'breadTypes': 'Ekmek Çeşitlerimiz',
    'breadDescription': 'Ekşi mayalı, glutensiz ve tam tahıllı ekmeklerimiz',
    'delicatessen': 'Şarküteri Ürünlerimiz',
    'delicatessenDescription': 'Doğal ve katkısız şarküteri ürünlerimiz',
    'specialProducts': 'Özel Ürünlerimiz',
    'specialProductsDescription': 'Özel günler için hazırladığımız lezzetler',

    // Kategori Etiketleri
    'sourDough': 'Ekşi Mayalı',
    'glutenFree': 'Glutensiz',
    'wholeMeal': 'Tam Tahıl',
    'classic': 'Klasik',
    'cheese': 'Peynir',
    'olive': 'Zeytin',
    'butter': 'Tereyağı',
    'jam': 'Reçel',
    'special': 'Özel',
    'gift': 'Hediyelik',
    'celebration': 'Kutlama',
    'all': 'Tümü',

    // Kullanıcı Menüsü
    'login': 'Giriş Yap',
    'register': 'Kayıt Ol',
    'profile': 'Profilim',
    'logout': 'Çıkış Yap',
    'cart': 'Sepet',
    'favorites': 'Favorilerim',
    'settings': 'Ayarlar',

    // Tema
    'darkTheme': 'Karanlık Tema',
    'lightTheme': 'Aydınlık Tema',
    'darkThemeApplied': 'Karanlık tema uygulandı',
    'lightThemeApplied': 'Aydınlık tema uygulandı',

    // Ürün Detayları
    'addToCart': 'Sepete Ekle',
    'addedToCart': 'Sepete eklendi',
    'goToCart': 'SEPETE GİT',
    'price': 'Fiyat',
    'quantity': 'Miktar',
    'description': 'Açıklama',
    'ingredients': 'İçindekiler',
    'nutritionalValues': 'Besin Değerleri',
    'reviews': 'Yorumlar',
    'relatedProducts': 'Benzer Ürünler',

    // Sepet
    'cartEmpty': 'Sepetiniz boş',
    'cartTotal': 'Toplam',
    'checkout': 'Ödemeye Geç',
    'continueShopping': 'Alışverişe Devam Et',
    'clearCart': 'Sepeti Boşalt',
    'clearCartConfirmation': 'Sepetinizdeki tüm ürünleri kaldırmak istediğinize emin misiniz?',
    'itemRemoved': '{name} sepetten kaldırıldı',
    'removeItemConfirmation': '{name} ürününü sepetten kaldırmak istediğinize emin misiniz?',
    'cartCleared': 'Sepet temizlendi',
    'free': 'Bedava',
    'freeShippingMessage': 'Ücretsiz teslimat için {amount} ₺ daha ürün ekleyin',

    // Sipariş
    'orderSummary': 'Sipariş Özeti',
    'shippingAddress': 'Teslimat Adresi',
    'paymentMethod': 'Ödeme Yöntemi',
    'placeOrder': 'Siparişi Tamamla',
    'orderPlaced': 'Siparişiniz alındı',
    'orderDetails': 'Sipariş Detayları',
    'orderHistory': 'Sipariş Geçmişim',
    'orderStatus': 'Sipariş Durumu',
    'orderDate': 'Sipariş Tarihi',
    'orderNumber': 'Sipariş Numarası',

    // Sipariş Durumları
    'pending': 'Beklemede',
    'processing': 'Hazırlanıyor',
    'shipped': 'Teslimata Verildi',
    'delivered': 'Teslim Edildi',
    'cancelled': 'İptal Edildi',

    // Ödeme Yöntemleri
    'creditCard': 'Kredi Kartı',
    'cashOnDelivery': 'Kapıda Ödeme',

    // Hata Mesajları
    'networkError': 'İnternet bağlantınızı kontrol edin',
    'authError': 'Giriş yapmanız gerekiyor',
    'genericError': 'Bir hata oluştu. Lütfen tekrar deneyin',

    // Ürün Ekleme
    'sampleProductsAdded': 'Örnek ürünler eklendi',
    'sampleProductsError': 'Örnek ürünler eklenirken hata oluştu',
    'noProductsFound': 'Ürün bulunamadı',

    // Yeni eklenen özellikler
    'quickView': 'Hızlı Görüntüle',
    'recentlyViewed': 'Son Görüntülenen Ürünler',
    'sortBy': 'Sırala',
    'sortByPrice': 'Fiyata Göre Sırala',
    'sortByName': 'İsme Göre Sırala',
    'sortByPopularity': 'Popülerliğe Göre Sırala',
    'ascending': 'Artan',
    'descending': 'Azalan',
    'discount': 'İndirim',

    // Ürün etiketleri
    'new': 'Yeni',
    'bestSeller': 'Çok Satan',
    'limitedStock': 'Sınırlı Stok',
  };

  // Statik çeviri metodu
  static String translate(String key) {
    return _translations[key] ?? key;
  }

  static String getTranslation(BuildContext context, String key) {
    return _translations[key] ?? key;
  }
}

class AppLocalization {
  final String languageCode;

  AppLocalization(this.languageCode);

  String get(String key) {
    return AppTranslations._translations[key] ?? key;
  }

  static AppLocalization of(BuildContext context) {
    return AppLocalization(Localizations.localeOf(context).languageCode);
  }
}
