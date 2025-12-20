class AppConstants {
  // Uygulama adı
  static const String appName = 'Ekşi Mayalı Ekmek';

  // Uygulama sloganı
  static const String appSlogan = 'Doğal ve Lezzetli Ekşi Mayalı Ekmekler';

  // Navigasyon yolları
  static const String homeRoute = '/';
  static const String productsRoute = '/products';
  static const String productDetailRoute = '/product/:id';
  static const String cartRoute = '/cart';
  static const String checkoutRoute = '/checkout';
  static const String aboutRoute = '/about';
  static const String contactRoute = '/contact';
  static const String blogRoute = '/blog';
  static const String blogDetailRoute = '/blog/:id';
  static const String accountRoute = '/account';

  // API yolları (backend hazır olduğunda kullanılacak)
  static const String apiBaseUrl = 'https://api.eksimayaliekmek.com';

  // Sosyal medya linkleri
  static const String instagramUrl = 'https://instagram.com/eksimayaliekmek';
  static const String facebookUrl = 'https://facebook.com/eksimayaliekmek';
  static const String twitterUrl = 'https://twitter.com/eksimayaliekmek';

  // İletişim bilgileri
  static const String contactEmail = 'info@eksimayaliekmek.com';
  static const String contactPhone = '+90 555 123 4567';
  static const String contactAddress = 'Ekmek Sokak No:42, İstanbul, Türkiye';

  // Ödeme yöntemleri
  static const List<String> paymentMethods = [
    'Kredi Kartı',
    'Havale/EFT',
    'Kapıda Ödeme',
  ];

  // Teslimat seçenekleri
  static const List<String> deliveryOptions = [
    'Standart Teslimat (1-3 gün)',
    'Hızlı Teslimat (Aynı Gün)',
    'Mağazadan Teslim',
  ];

  // Hakkımızda metni
  static const String aboutUsText = '''
Ekşi Mayalı Ekmek olarak, geleneksel yöntemlerle hazırlanan, doğal ve sağlıklı ekmekler üretiyoruz. 
Ekşi maya kültürümüz, uzun yılların birikimi ve özenle korunan bir mirastır.

Ekmeklerimizde sadece doğal malzemeler kullanıyor, katkı maddesi ve koruyucu eklemiyor, 
uzun fermentasyon süreçleriyle ekmeğin hem lezzetini hem de besin değerini artırıyoruz.

Misyonumuz, unutulmaya yüz tutmuş geleneksel ekmek kültürünü yaşatmak ve 
sağlıklı beslenmeye önem veren herkese ulaştırmaktır.
''';

  // Gizlilik politikası metni (kısa versiyon)
  static const String privacyPolicyShort = '''
Kişisel verileriniz, siparişlerinizi işlemek, size daha iyi hizmet sunmak ve yasal yükümlülüklerimizi yerine getirmek amacıyla kullanılmaktadır. 
Verileriniz üçüncü taraflarla paylaşılmamaktadır.
''';
}
