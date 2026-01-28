// ignore_for_file: unused_field, unused_element, unused_local_variable

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                   EKŞİ MAYALI EKMEK - PRODUCT_CARD.DART                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya, ürünleri listelemek için kullanılan kart widget'ını içerir.       │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. ProductCard widget sınıfı                                                │
│    - İndirim hesaplama                                                      │
│    - Stok durumu kontrolü                                                   │
│    - Favori işlemleri                                                       │
│    - Görsel işleme ve filtreleme                                            │
│ 2. Duyarlı tasarım (Responsive design)                                      │
│    - Ekran boyutuna göre kart boyutlandırma                                 │
│    - Mobil ve masaüstü görünümleri                                          │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// ignore_for_file: use_super_parameters, prefer_const_constructors

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/theme_provider.dart';
import '../services/auth_service.dart';
import '../services/image_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';

/// Ürün kartı widget'ı
///
/// Bu widget, ürün listelerinde her bir ürünü temsil eder.
/// Ürün fotoğrafını, adını, fiyatını, indirim durumunu ve
/// favori/sepete ekleme düğmelerini içerir.
///
/// Özellikler:
/// - Karanlık/aydınlık tema desteği
/// - Duyarlı tasarım (ekran boyutuna göre ayarlanır)
/// - İndirim gösterimi
/// - Stok durumu kontrolü
/// - Favori butonları
/// - Görsel filtreleme (parlaklık ayarı)
///
/// Kullanımı:
/// ```dart
/// ProductCard(
///   product: productModel,
///   onTap: () => Navigator.pushNamed(context, '/product-detail', arguments: productModel),
/// )
/// ```
class ProductCard extends StatefulWidget {
  final Product product; // Gösterilecek ürün bilgisi
  final int index; // Animasyon sıralaması için kullanılan indeks
  final bool showAddToCart; // Sepete ekle butonunu gösterip göstermeme durumu
  final bool showFavorite; // Favori butonunu gösterip göstermeme durumu
  final VoidCallback? onAddToCart; // Ürün sepete eklendiğinde çağrılacak fonksiyon
  final bool isDarkMode; // Karanlık mod açık mı?

  const ProductCard({
    Key? key,
    required this.product,
    this.index = 0,
    this.showAddToCart = true,
    this.showFavorite = true,
    this.onAddToCart,
    required this.isDarkMode,
  }) : super(key: key);

  @override
  State<ProductCard> createState() => _ProductCardState();
}

/// Ürün kartının durumunu yöneten state sınıfı
class _ProductCardState extends State<ProductCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller; // Tıklama animasyonu kontrolcüsü
  late Animation<double> _scaleAnimation; // Ölçek animasyonu

  /// Widget ilk oluşturulduğunda çağrılır
  /// Animasyon controllerları burada başlatılır
  @override
  void initState() {
    super.initState();
    // Tıklama animasyonu için controller başlatılıyor
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    // Ölçek animasyonu tanımlanıyor (basıldığında küçülme efekti)
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  /// Widget bellekten atılmadan önce çağrılır
  /// Animasyon controllerları temizlenir
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Ürün detaylarını gösteren diyalog penceresi
  /// Bu fonksiyon, ürün kartına tıklandığında çağrılır
  void _showProductDetails(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Ürün detay diyalogu içerik alanı
            Container(
              width: double.infinity,
              constraints: BoxConstraints(
                  maxWidth: 450, maxHeight: MediaQuery.of(context).size.height * 0.8),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ürün görseli - diyalogun üst kısmında yer alan görsel
                  ClipRRect(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                    child: ColorFiltered(
                      colorFilter: ColorFilter.mode(
                        Colors.black.withValues(alpha: 0.1),
                        BlendMode.darken,
                      ),
                      child: CachedNetworkImage(
                        imageUrl: widget.product.imageUrl,
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: Theme.of(context).cardColor,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: AppTheme.primaryColor.withValues(alpha: 0.5),
                            ),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Theme.of(context).cardColor,
                          child: Icon(
                            Icons.error_outline,
                            color: AppTheme.primaryColor.withValues(alpha: 0.5),
                            size: 48,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Ürün detayları - diyalogun alt kısmında yer alan bilgiler
                  Expanded(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Ürün adı
                          Text(
                            widget.product.name,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Ürün fiyatı
                          Text(
                            '${widget.product.price.toStringAsFixed(2)} TL',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Ürün açıklaması
                          Text(
                            widget.product.description,
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                          // İçindekiler listesi (eğer mevcutsa)
                          if (widget.product.ingredients.isNotEmpty) ...[
                            const Text(
                              'İçindekiler:',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              widget.product.ingredients.join(', '),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                          const SizedBox(height: 16),
                          // Sepete ekle butonu - Cart Provider ile entegre çalışır
                          Consumer<CartProvider>(
                            builder: (ctx, cartProvider, _) {
                              final isInCart = cartProvider.isInCart(widget.product.id);
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Stok durumu uyarısı
                                  if (widget.product.stock < 5 && widget.product.stock > 0)
                                    Container(
                                      padding: EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                                      margin: EdgeInsets.only(bottom: 8),
                                      decoration: BoxDecoration(
                                        color: Colors.orange.shade50,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: Colors.orange.shade200),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.info_outline, color: Colors.orange, size: 16),
                                          SizedBox(width: 6),
                                          Text(
                                            'Son ${widget.product.stock} adet!',
                                            style: TextStyle(
                                              color: Colors.orange.shade900,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ElevatedButton.icon(
                                    onPressed: widget.product.stock > 0 &&
                                            widget.product.isAvailable
                                        ? () {
                                            cartProvider.addItem(widget.product);
                                            Navigator.of(context).pop();
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content:
                                                    Text('${widget.product.name} sepete eklendi'),
                                              ),
                                            );
                                          }
                                        : null,
                                    icon: Icon(
                                      widget.product.stock > 0
                                          ? (isInCart
                                              ? Icons.shopping_cart
                                              : Icons.add_shopping_cart)
                                          : Icons.remove_shopping_cart,
                                    ),
                                    label: Text(
                                      widget.product.stock > 0
                                          ? (isInCart
                                              ? 'Sepete Ekle (${cartProvider.getQuantity(widget.product.id)})'
                                              : 'Sepete Ekle')
                                          : 'Stokta Yok',
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: widget.product.stock > 0
                                          ? AppTheme.primaryColor
                                          : Colors.grey,
                                      foregroundColor: Colors.white,
                                      minimumSize: const Size(double.infinity, 40),
                                      disabledBackgroundColor: Colors.grey.shade300,
                                      disabledForegroundColor: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Kapatma butonu - diyaloğun sağ üst köşesinde yer alır
            Positioned(
              top: -10,
              right: -10,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withValues(alpha: 0.7),
                ),
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 18),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Ürün kartının arayüzünü oluşturan build metodu
  @override
  Widget build(BuildContext context) {
    // Provider'lardan gerekli bilgileri al
    final authService = Provider.of<AuthService>(context); // Kullanıcı kimlik bilgileri
    final cartProvider = Provider.of<CartProvider>(context); // Sepet işlemleri
    final themeProvider = Provider.of<ThemeProvider>(context); // Tema ayarları
    final isDark = themeProvider.isDarkMode; // Karanlık mod açık mı?

    // Ürün bilgilerini al
    final user = authService.currentUser; // Mevcut kullanıcı
    final isFavorite =
        user != null && user.favoriteProductIds.contains(widget.product.id); // Favori mi?
    final isInCart = cartProvider.isInCart(widget.product.id); // Sepette mi?
    final quantity = cartProvider.getQuantity(widget.product.id); // Sepetteki miktarı

    // Cihaz boyutlarını alalım
    final screenWidth = MediaQuery.of(context).size.width;
    // Animasyon gecikmesi - her kart sıralı olarak animasyonlu şekilde görünür
    final delay = (widget.index * 100).ms;

    // Animasyonlu kart oluşturma
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        );
      },
      child: GestureDetector(
        // Karta tıklanınca modal popup aç
        onTap: () => _showProductDetails(context, widget.product),
        // Tıklama animasyonu için olay yönetimi
        onTapDown: (_) => _controller.forward(),
        onTapUp: (_) => _controller.reverse(),
        onTapCancel: () => _controller.reverse(),
        // Ürün kartı - ana konteyner
        child: Card(
          clipBehavior: Clip.antiAlias, // Taşan içeriği kırp
          margin: const EdgeInsets.all(2), // Dış kenar boşluğu
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8), // Köşe yuvarlatma
          ),
          elevation: 2, // Gölge seviyesi
          color: isDark ? AppTheme.darkSurfaceColor : Colors.white, // Arka plan rengi
          // LayoutBuilder ile dinamik boyutlu kart oluşturma
          child: LayoutBuilder(builder: (context, constraints) {
            // Kartın kullanılabilir genişliği
            final cardWidth = constraints.maxWidth;
            // Kartın yüksekliği genişliğinin 1.25 katı olsun (yükseklik/genişlik = 1/0.8 = 1.25)
            final cardHeight = cardWidth * 1.25;
            // Görsel yüksekliği kartın %70'i yüksekliğinde
            final imageHeight = cardHeight * 0.7;
            // İçerik alanı yüksekliği
            final contentHeight = cardHeight - imageHeight;

            return SizedBox(
              height: cardHeight,
              width: cardWidth,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, // Soldan hizalama
                mainAxisSize: MainAxisSize.min, // İçerik kadar alan kapla
                children: [
                  // Ürün görseli - Tam genişliğinde ve kartın %70'i yüksekliğinde
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: Stack(
                        children: [
                          CachedNetworkImage(
                            imageUrl: widget.product.imageUrl,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Colors.grey[200],
                              child: const Center(
                                child: CircularProgressIndicator(),
                              ),
                            ),
                            errorWidget: (context, url, error) {
                              Logger.warning(
                                  'ProductCard görsel yükleme hatası url=$url err=$error');

                              // Hata durumunda default image'i dene
                              final fallbackUrl =
                                  ImageService.getDefaultProductImage(widget.product.name);

                              // Eğer fallback URL farklıysa onu kullan
                              if (fallbackUrl != url) {
                                return CachedNetworkImage(
                                  imageUrl: fallbackUrl,
                                  fit: BoxFit.cover,
                                  errorWidget: (context, fallbackUrl, fallbackError) {
                                    // Fallback da başarısız olursa icon göster
                                    return Container(
                                      color: Colors.grey[200],
                                      child: Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              _getCategoryIcon(widget.product.category),
                                              size: 48,
                                              color: Colors.grey[400],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              widget.product.name,
                                              textAlign: TextAlign.center,
                                              style: TextStyle(
                                                color: Colors.grey[600],
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                );
                              }

                              // Fallback URL aynıysa direkt icon göster
                              return Container(
                                color: Colors.grey[200],
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        _getCategoryIcon(widget.product.category),
                                        size: 48,
                                        color: Colors.grey[400],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        widget.product.name,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                            imageBuilder: (context, imageProvider) {
                              return Container(
                                decoration: BoxDecoration(
                                  image: DecorationImage(
                                    image: imageProvider,
                                    fit: BoxFit.cover,
                                    colorFilter: ColorFilter.mode(
                                      Colors.black.withValues(alpha: 0.1),
                                      BlendMode.darken,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                          if (widget.product.isNew)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentColor,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Yeni',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          // Video varsa play ikonu göster
                          if (widget.product.videoUrl != null &&
                              widget.product.videoUrl!.isNotEmpty)
                            Positioned(
                              bottom: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.9),
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.3),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.play_arrow,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  // Ürün bilgileri - Kalan alan
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 4), // İç kenar boşluğu
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center, // Metinleri ortala
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween, // İçeriği dikey olarak dağıt
                        children: [
                          // Ürün adı
                          Text(
                            widget.product.name,
                            style: TextStyle(
                              fontSize: cardWidth * 0.07, // Dinamik yazı boyutu
                              fontWeight: FontWeight.bold, // Kalın yazı
                              color: isDark
                                  ? AppTheme.darkTextColor
                                  : AppTheme.textDarkColor, // Metin rengi
                              letterSpacing: 0.5, // Harfler arası boşluk
                            ),
                            maxLines: 1, // Tek satır
                            overflow: TextOverflow.ellipsis, // Uzun metinlerde kesme
                            textAlign: TextAlign.center, // Metni ortala
                          ),

                          // Fiyat etiketi ve sepete ekle butonunu yan yana düzenleyelim
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center, // İçeriği ortala
                            children: [
                              // Fiyat etiketi
                              Container(
                                padding:
                                    EdgeInsets.symmetric(horizontal: 8, vertical: 4), // İç boşluk
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor, // Arka plan rengi
                                  borderRadius: BorderRadius.circular(6), // Köşe yuvarlatma
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 2,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Text(
                                  '${widget.product.price.toStringAsFixed(2)} TL',
                                  style: TextStyle(
                                    fontSize: cardWidth * 0.06, // Dinamik yazı boyutu
                                    fontWeight: FontWeight.bold, // Kalın yazı
                                    color: Colors.white, // Metin rengi
                                  ),
                                ),
                              ),

                              SizedBox(width: 10), // Boşluk

                              // Sepete ekle butonu - sadece bir ikon olarak
                              if (widget.showAddToCart)
                                InkWell(
                                  onTap: widget.product.stock > 0 && widget.product.isAvailable
                                      ? () {
                                          cartProvider.addItem(widget.product); // Ürünü sepete ekle
                                          if (widget.onAddToCart != null) {
                                            widget.onAddToCart!(); // Callback fonksiyonu çağır
                                          }
                                        }
                                      : null,
                                  child: Container(
                                    height: cardWidth * 0.12, // Dinamik buton yüksekliği
                                    width: cardWidth * 0.12, // Dinamik buton genişliği
                                    decoration: BoxDecoration(
                                      color: widget.product.stock > 0
                                          ? AppTheme.primaryColor
                                          : Colors.grey.shade400, // Stokta yoksa gri
                                      borderRadius: BorderRadius.circular(6), // Köşe yuvarlatma
                                      boxShadow: widget.product.stock > 0
                                          ? [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.2),
                                                blurRadius: 2,
                                                offset: const Offset(0, 1),
                                              ),
                                            ]
                                          : null,
                                    ),
                                    child: Icon(
                                      widget.product.stock > 0
                                          ? (isInCart && quantity > 0
                                              ? Icons
                                                  .shopping_cart // Ürün sepetteyse dolu sepet ikonu
                                              : Icons
                                                  .add_shopping_cart) // Ürün sepette değilse ekleme ikonu
                                          : Icons.remove_shopping_cart, // Stokta yoksa çarpı ikonu
                                      color: Colors.white,
                                      size: cardWidth * 0.07, // Dinamik ikon boyutu
                                    ),
                                  ),
                                ),
                            ],
                          ),

                          // Miktar kontrolleri - eğer sepete eklenmişse gösterilir
                          if (widget.showAddToCart && isInCart && quantity > 0)
                            Padding(
                              padding: const EdgeInsets.only(top: 4), // Üst boşluk
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center, // İçeriği ortala
                                children: [
                                  // Azaltma butonu
                                  InkWell(
                                    onTap: () => cartProvider
                                        .removeItem(widget.product.id), // Ürünü sepetten çıkar
                                    child: Container(
                                      width: cardWidth * 0.1, // Dinamik genişlik
                                      height: cardWidth * 0.1, // Dinamik yükseklik
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: AppTheme.primaryColor, // Çerçeve rengi
                                          width: 1.5, // Çerçeve kalınlığı
                                        ),
                                        borderRadius: BorderRadius.circular(6), // Köşe yuvarlatma
                                      ),
                                      alignment: Alignment.center, // İkonu ortala
                                      child: Icon(
                                        Icons.remove, // Çıkarma ikonu
                                        size: cardWidth * 0.06, // Dinamik ikon boyutu
                                        color: AppTheme.primaryColor, // İkon rengi
                                      ),
                                    ),
                                  ),
                                  // Miktar göstergesi
                                  Container(
                                    width: cardWidth * 0.15, // Dinamik genişlik
                                    height: cardWidth * 0.1, // Dinamik yükseklik
                                    alignment: Alignment.center, // Metni ortala
                                    child: Text(
                                      '$quantity', // Sepetteki ürün miktarı
                                      style: TextStyle(
                                        fontSize: cardWidth * 0.07, // Dinamik yazı boyutu
                                        fontWeight: FontWeight.bold, // Kalın yazı
                                        color: AppTheme.primaryColor, // Metin rengi
                                      ),
                                    ),
                                  ),
                                  // Artırma butonu
                                  InkWell(
                                    onTap: () =>
                                        cartProvider.addItem(widget.product), // Ürünü sepete ekle
                                    child: Container(
                                      width: cardWidth * 0.1, // Dinamik genişlik
                                      height: cardWidth * 0.1, // Dinamik yükseklik
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: AppTheme.primaryColor, // Çerçeve rengi
                                          width: 1.5, // Çerçeve kalınlığı
                                        ),
                                        borderRadius: BorderRadius.circular(6), // Köşe yuvarlatma
                                      ),
                                      alignment: Alignment.center, // İkonu ortala
                                      child: Icon(
                                        Icons.add, // Ekleme ikonu
                                        size: cardWidth * 0.06, // Dinamik ikon boyutu
                                        color: AppTheme.primaryColor, // İkon rengi
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        )
            .animate(delay: delay)
            .fadeIn(duration: 300.ms)
            .slideY(begin: 0.1, end: 0), // Giriş animasyonu
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'ekmek çeşitleri':
        return Icons.bakery_dining;
      case 'kahvaltılık':
        return Icons.breakfast_dining;
      case 'tatlılar':
        return Icons.cake;
      case 'içecekler':
        return Icons.local_cafe;
      case 'şarküteri':
        return Icons.restaurant;
      default:
        return Icons.restaurant_menu;
    }
  }

  /// İndirim yüzdesini hesaplar
  ///
  /// @param originalPrice Eski/orijinal fiyat
  /// @param currentPrice Yeni/indirimli fiyat
  /// @return İndirim yüzdesi (0-100 arası tam sayı)
  int _calculateDiscountPercentage(double originalPrice, double currentPrice) {
    if (originalPrice <= 0 || currentPrice >= originalPrice) {
      return 0; // İndirim yok veya geçersiz fiyatlar
    }

    final discount = ((originalPrice - currentPrice) / originalPrice * 100).round();
    return discount;
  }
}
