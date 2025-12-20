// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../services/auth_service.dart';
import '../services/recommendation_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';

class PersonalizedRecommendations extends StatefulWidget {
  final Function(Product) onProductTap;
  final String title;
  final String subtitle;
  final RecommendationType type;

  const PersonalizedRecommendations({
    Key? key,
    required this.onProductTap,
    this.title = 'Sizin İçin Seçtiklerimiz',
    this.subtitle = 'Tercihlerinize göre özel olarak seçilmiş ürünler',
    this.type = RecommendationType.personalized,
  }) : super(key: key);

  @override
  State<PersonalizedRecommendations> createState() => _PersonalizedRecommendationsState();
}

enum RecommendationType {
  personalized,
  recentlyViewed,
  similar,
  popular,
  newProducts,
  discounted,
  purchaseHistory,
}

class _PersonalizedRecommendationsState extends State<PersonalizedRecommendations> {
  bool _isLoading = false;
  List<Product> _products = [];

  @override
  void initState() {
    super.initState();
    // Build sırasında notifyListeners çağrısını önlemek için
    // Future.microtask kullanarak asenkron işlemi sonraya bırakıyoruz
    Future.microtask(() => _loadRecommendations());
  }

  Future<void> _loadRecommendations() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final recommendationService = Provider.of<RecommendationService>(context, listen: false);

      if (!authService.isAuthenticated) {
        // Kullanıcı giriş yapmamışsa popüler ürünleri göster
        final products = await recommendationService.getPopularProducts();
        if (mounted) {
          setState(() {
            _products = products;
            _isLoading = false;
          });
        }
        return;
      }

      final user = authService.currentUser!;

      List<Product> products = [];

      switch (widget.type) {
        case RecommendationType.personalized:
          products = await recommendationService.getPersonalizedRecommendations(user);
          break;
        case RecommendationType.recentlyViewed:
          products = await recommendationService.getRecentlyViewedProducts(user);
          break;
        case RecommendationType.similar:
          // Similar ürünler için ürün ID'si gerekli, bu durumda popüler ürünleri göster
          products = await recommendationService.getPopularProducts();
          break;
        case RecommendationType.popular:
          products = await recommendationService.getPopularProducts();
          break;
        case RecommendationType.newProducts:
          products = await recommendationService.getNewProducts();
          break;
        case RecommendationType.discounted:
          products = await recommendationService.getDiscountedProducts();
          break;
        case RecommendationType.purchaseHistory:
          products = await recommendationService.getRecommendationsBasedOnPurchaseHistory(user.id);
          break;
      }

      if (mounted) {
        setState(() {
          _products = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      Logger.error('Öneriler yüklenirken hata oluştu: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;
    final isMobile = deviceType == DeviceType.mobile;

    final horizontalPadding = isMobile ? 8.0 : 16.0;

    return Container(
      padding: EdgeInsets.symmetric(vertical: 24, horizontal: horizontalPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık ve alt başlık
          Text(
            widget.title,
            style: GoogleFonts.playfairDisplay(
              fontSize: isDesktop ? 32 : 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.textDarkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            widget.subtitle,
            style: GoogleFonts.poppins(
              fontSize: isDesktop ? 16 : 14,
              color: AppTheme.textDarkColor.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 16),

          // Ürün listesi
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            )
          else if (_products.isEmpty)
            _buildEmptyState()
          else
            _buildProductList(isDesktop, isTablet, isMobile),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_basket_outlined,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Henüz öneri bulunmuyor',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: AppTheme.textDarkColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Daha fazla ürün keşfettikçe size özel öneriler burada görünecek',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: AppTheme.textDarkColor.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductList(bool isDesktop, bool isTablet, bool isMobile) {
    // Ekran genişliğine göre sütun sayısını belirle
    final crossAxisCount = isDesktop
        ? 4
        : isTablet
            ? 3
            : 2;

    // Mobil cihazlar için daha az kenar boşluğu
    final rightMargin = isMobile ? 8.0 : 16.0;
    final cardWidth = isMobile ? 200.0 : 220.0;

    return SizedBox(
      height: 320,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _products.length,
        itemBuilder: (context, index) {
          final product = _products[index];
          final delay = (index * 100).ms;
          return Container(
            width: cardWidth,
            margin: EdgeInsets.only(right: rightMargin),
            child: GestureDetector(
              onTap: () => widget.onProductTap(product),
              child: _buildProductCard(product, delay),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductCard(Product product, Duration delay) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ürün resmi
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Stack(
              children: [
                // Ürün resmi
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(
                    imageUrl: product.imageUrl,
                    width: 120,
                    height: 120,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      width: 120,
                      height: 120,
                      color: Colors.grey[300],
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      width: 120,
                      height: 120,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image_not_supported),
                    ),
                  ),
                ),

                // İndirim etiketi
                if (product.discountPercentage > 0)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.accentColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '%${product.discountPercentage.toInt()} İndirim',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),

                // Organik etiketi
                if (product.isOrganic)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Organik',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),

                // Favori butonu
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Consumer<AuthService>(
                      builder: (ctx, authService, _) {
                        final user = authService.currentUser;
                        final isFavorite =
                            user != null && user.favoriteProductIds.contains(product.id);

                        return IconButton(
                          icon: Icon(
                            isFavorite ? Icons.favorite : Icons.favorite_border,
                            color: isFavorite ? Colors.red : Colors.grey,
                            size: 20,
                          ),
                          onPressed: () {
                            if (user == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Favorilere eklemek için giriş yapmalısınız',
                                  ),
                                  duration: const Duration(seconds: 2),
                                  action: SnackBarAction(
                                    label: 'Giriş Yap',
                                    onPressed: () {
                                      Navigator.of(context).pushNamed('/login');
                                    },
                                  ),
                                ),
                              );
                              return;
                            }

                            authService.toggleFavorite(product.id);

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  isFavorite
                                      ? '${product.name} favorilerden çıkarıldı'
                                      : '${product.name} favorilere eklendi',
                                ),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                          padding: const EdgeInsets.all(8),
                          constraints: const BoxConstraints(),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Ürün bilgileri
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textDarkColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 4),

                // Marka
                if (product.brand.isNotEmpty)
                  Text(
                    product.brand,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                const SizedBox(height: 8),

                // Fiyat
                Row(
                  children: [
                    if (product.discountPercentage > 0) ...[
                      Text(
                        Helpers.formatCurrency(product.price),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[600],
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      Helpers.formatCurrency(product.discountedPrice),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: delay).slideY(
          begin: 0.2,
          end: 0,
          curve: Curves.easeOutQuad,
          duration: 400.ms,
          delay: delay,
        );
  }
}
