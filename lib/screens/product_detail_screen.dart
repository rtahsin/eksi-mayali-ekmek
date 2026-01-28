// ignore_for_file: prefer_const_constructors, use_super_parameters, unused_local_variable, deprecated_member_use, unnecessary_to_list_in_spreads, unused_field, unused_element

import 'package:cached_network_image/cached_network_image.dart';
import 'package:chewie/chewie.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/theme_provider.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;

  const ProductDetailScreen({
    Key? key,
    required this.product,
  }) : super(key: key);

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _quantity = 1;
  bool _showCartOptions = false;
  bool _isFullScreen = false;
  TransformationController _transformationController = TransformationController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);

    // Ürünü son görüntülenen ürünlere ekle
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _addToRecentlyViewed();
    });
  }

  // Ürünü son görüntülenen ürünlere ekle
  void _addToRecentlyViewed() {
    final authService = Provider.of<AuthService>(context, listen: false);
    if (authService.isAuthenticated) {
      final user = authService.currentUser;
      if (user != null) {
        // Kullanıcı modelini güncelle
        final updatedUser = user.addToRecentlyViewed(widget.product.id);

        // Firestore'da kullanıcı belgesini güncelle
        try {
          // AuthService'de bir metod oluşturmak yerine doğrudan burada güncelleme yapıyoruz
          // Gerçek uygulamada bu işlem AuthService içinde yapılmalıdır
          FirebaseFirestore.instance.collection('users').doc(user.id).update({
            'recentlyViewedProductIds': updatedUser.recentlyViewedProductIds,
            'updatedAt': DateTime.now().toIso8601String(),
          });
        } catch (e) {
          Logger.error('Son görüntülenen ürünler güncellenirken hata: $e');
        }
      }
    }
  }

  // Video oynatma dialog'unu aç
  void _playVideo() {
    final videoUrl = widget.product.videoUrl;
    if (videoUrl == null || videoUrl.isEmpty) return;

    // Video player controller oluştur
    final videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(videoUrl));
    final chewieController = ChewieController(
      videoPlayerController: videoPlayerController,
      autoPlay: true,
      looping: false,
      aspectRatio: 16 / 9,
      autoInitialize: true,
      errorBuilder: (context, errorMessage) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, color: Colors.red, size: 60),
              const SizedBox(height: 16),
              Text(
                'Video yüklenemedi',
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                errorMessage,
                style: const TextStyle(color: Colors.white70, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      },
    );

    // Dialog ile video göster
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Close button
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () {
                  chewieController.dispose();
                  videoPlayerController.dispose();
                  Navigator.of(context).pop();
                },
              ),
            ),
            // Video player
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Chewie(controller: chewieController),
            ),
          ],
        ),
      ),
    ).then((_) {
      // Dialog kapandığında controller'ları temizle
      chewieController.dispose();
      videoPlayerController.dispose();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _transformationController.dispose();
    super.dispose();
  }

  // Tam ekran görüntüleme (artık kullanılmıyor)
  void _toggleFullScreen() {
    // Bu özelliği kaldırdık
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    final isInCart = cartProvider.isInCart(widget.product.id);
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final authService = Provider.of<AuthService>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;

    // Tam ekran görüntüleme kaldırıldı
    return Scaffold(
      appBar: CustomAppBar(
        title: widget.product.name,
        showBackButton: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ürün görseli - Video varsa play butonu ile
            Stack(
              children: [
                GestureDetector(
                  onTap: widget.product.videoUrl != null ? _playVideo : null,
                  child: AspectRatio(
                    aspectRatio: 1.0,
                    child: CachedNetworkImage(
                      imageUrl: widget.product.imageUrl,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        child: Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: isDark ? Colors.grey[800] : Colors.grey[200],
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.image_not_supported,
                                color: isDark ? Colors.grey[600] : Colors.grey[400],
                                size: 50,
                              ),
                              SizedBox(height: 16),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 24),
                                child: Text(
                                  widget.product.name,
                                  style: TextStyle(
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // Video varsa ortada play butonu göster
                if (widget.product.videoUrl != null)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0),
                            Colors.black.withOpacity(0.3),
                          ],
                        ),
                      ),
                      child: Center(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.7),
                            shape: BoxShape.circle,
                          ),
                          padding: const EdgeInsets.all(20),
                          child: Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 60,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ürün adı ve fiyatı
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.product.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(
                        '${widget.product.discountedPrice.toStringAsFixed(2)} ₺',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Ürün açıklaması
                  Text(
                    widget.product.description,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Miktar seçimi
                  Row(
                    children: [
                      const Text(
                        'Miktar:',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: () {
                          if (_quantity > 1) {
                            setState(() {
                              _quantity--;
                            });
                          }
                        },
                      ),
                      Text(
                        _quantity.toString(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () {
                          setState(() {
                            _quantity++;
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Tab bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      labelColor: AppTheme.primaryColor,
                      unselectedLabelColor: Colors.grey.shade700,
                      indicatorColor: AppTheme.primaryColor,
                      indicatorSize: TabBarIndicatorSize.label,
                      tabs: const [
                        Tab(text: 'Açıklama'),
                        Tab(text: 'İçindekiler'),
                        Tab(text: 'Üretim'),
                        Tab(text: 'Besin Değerleri'),
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms, delay: 400.ms),

                  const SizedBox(height: 24),

                  // Tab içerikleri - kaydırılabilir
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.5,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // Açıklama tab'ı
                        SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.product.description,
                                style: const TextStyle(
                                  fontSize: 16,
                                  height: 1.6,
                                  color: AppTheme.textDarkColor,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Ekşi mayalı ekmeklerimiz, geleneksel yöntemlerle hazırlanır ve uzun fermentasyon süreci sayesinde daha kolay sindirilebilir ve lezzetli olur. Doğal malzemeler ve sabır ile üretilen ekmeklerimiz, endüstriyel ekmeklere göre daha sağlıklı bir alternatiftir.',
                                style: const TextStyle(
                                  fontSize: 16,
                                  height: 1.6,
                                  color: AppTheme.textDarkColor,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // İçindekiler tab'ı
                        SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (widget.product.ingredients.isNotEmpty)
                                ...widget.product.ingredients.map((ingredient) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Row(
                                      children: [
                                        Icon(Icons.check_circle,
                                            color: AppTheme.successColor, size: 20),
                                        const SizedBox(width: 12),
                                        Text(
                                          ingredient,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            height: 1.6,
                                            color: AppTheme.textDarkColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList()
                              else
                                Text(
                                  'Organik un, su, deniz tuzu, ekşi maya kültürü',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    height: 1.6,
                                    color: AppTheme.textDarkColor,
                                  ),
                                ),
                              const SizedBox(height: 16),
                              Container(
                                padding: EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.info_outline, color: AppTheme.secondaryColor),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        'Tüm ürünlerimiz gluten içerir. Çapraz bulaşma riski nedeniyle fındık, badem gibi alerjenler içerebilir.',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey.shade700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Üretim tab'ı
                        SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildProductionStep(
                                  1,
                                  'Ekşi Maya Hazırlama',
                                  'Ekşi mayamız, organik un ve su karışımının doğal fermentasyonu ile hazırlanır. Bu süreç 3-5 gün sürer ve düzenli besleme gerektirir.',
                                  Icons.bubble_chart),
                              _buildProductionStep(
                                  2,
                                  'Hamur Yoğurma',
                                  'Ekşi maya, un, su ve deniz tuzu ile hamur hazırlanır. Minimum yoğurma tekniği ile gluten gelişimi sağlanır.',
                                  Icons.bakery_dining),
                              _buildProductionStep(
                                  3,
                                  'Fermentasyon',
                                  'Hamur, 12-24 saat boyunca kontrollü sıcaklıkta fermente edilir. Bu süreçte lezzet gelişir ve ekmek daha sindirilebilir hale gelir.',
                                  Icons.access_time),
                              _buildProductionStep(
                                  4,
                                  'Şekillendirme',
                                  'Fermente olan hamur nazikçe şekillendirilir ve son fermentasyon için sepetlere alınır.',
                                  Icons.design_services),
                              _buildProductionStep(
                                  5,
                                  'Pişirme',
                                  'Ekmekler, taş tabanlı fırınlarda yüksek sıcaklıkta buhar verilerek pişirilir. Bu sayede çıtır kabuk ve yumuşak iç elde edilir.',
                                  Icons.local_fire_department),
                            ],
                          ),
                        ),

                        // Besin Değerleri tab'ı
                        SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildNutritionItem('Enerji', '250 kcal', '100g için'),
                              _buildNutritionItem('Karbonhidrat', '48g', '100g için'),
                              _buildNutritionItem('Protein', '9g', '100g için'),
                              _buildNutritionItem('Yağ', '1.5g', '100g için'),
                              _buildNutritionItem('Lif', '3.5g', '100g için'),
                              _buildNutritionItem('Sodyum', '560mg', '100g için'),
                              const SizedBox(height: 16),
                              Container(
                                padding: EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Sağlık Faydaları:',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.secondaryColor,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    _buildBenefitItem('Daha kolay sindirilebilir'),
                                    _buildBenefitItem('Düşük glisemik indeks'),
                                    _buildBenefitItem('Prebiyotik özellikler'),
                                    _buildBenefitItem('Daha yüksek mineral emilimi'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms, delay: 500.ms),

                  const SizedBox(height: 40),

                  // Sepete Ekle veya Sepete Git Butonları
                  if (_showCartOptions && isInCart)
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: Icon(Icons.shopping_cart),
                            label: Text('Sepete Git'),
                            onPressed: () {
                              Navigator.of(context).pushNamed('/cart');
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              padding: EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: Icon(Icons.shopping_bag_outlined),
                            label: Text('Alışverişe Devam Et'),
                            onPressed: () {
                              Navigator.of(context).pushReplacementNamed('/');
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.primaryColor,
                              side: BorderSide(color: AppTheme.primaryColor),
                              padding: EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Stok durumu uyarısı
                        if (widget.product.stock < 5 && widget.product.stock > 0)
                          Container(
                            padding: EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                            margin: EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline, color: Colors.orange, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Son ${widget.product.stock} adet kaldı!',
                                    style: TextStyle(
                                      color: Colors.orange.shade900,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ElevatedButton.icon(
                          icon: Icon(
                            widget.product.stock > 0
                                ? (isInCart ? Icons.shopping_cart : Icons.add_shopping_cart)
                                : Icons.remove_shopping_cart,
                          ),
                          label: Text(
                            widget.product.stock > 0
                                ? (isInCart ? 'Sepete Ekle ($_quantity)' : 'Sepete Ekle')
                                : 'Stokta Yok',
                          ),
                          onPressed: widget.product.stock > 0 && widget.product.isAvailable
                              ? () {
                                  cartProvider.addItem(widget.product);
                                  setState(() {
                                    _showCartOptions = true;
                                  });
                                  Helpers.showSnackBar(
                                    '${widget.product.name} sepete eklendi',
                                    context: context,
                                    isError: false,
                                  );
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                widget.product.stock > 0 ? AppTheme.primaryColor : Colors.grey,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 16),
                            minimumSize: Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            disabledBackgroundColor: Colors.grey.shade300,
                            disabledForegroundColor: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),

            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }

  Widget _buildProductionStep(int step, String title, String description, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$step',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, color: AppTheme.secondaryColor, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade700,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNutritionItem(String name, String value, String unit) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              name,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              unit,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBenefitItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(Icons.check, color: AppTheme.successColor, size: 18),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
