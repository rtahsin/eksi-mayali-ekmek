// ignore_for_file: deprecated_member_use

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../services/auth_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/translations.dart';

class FeaturedProducts extends StatelessWidget {
  final Function(Product) onProductTap;
  final bool isDarkMode;

  const FeaturedProducts({
    Key? key,
    required this.onProductTap,
    required this.isDarkMode,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;
    final isMobile = deviceType == DeviceType.mobile;
    final productService = Provider.of<ProductService>(context);

    final featuredProducts = productService.featuredProducts;
    final products =
        featuredProducts.isEmpty ? productService.products : featuredProducts;

    if (products.isEmpty) {
      return const SizedBox.shrink();
    }

    final crossAxisCount = isDesktop ? 4 : (isTablet ? 3 : 2);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.space2xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? AppTheme.spaceXs : AppTheme.spaceLg,
            ),
            child: Text(
              AppTranslations.getTranslation(context, 'featuredProducts'),
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: isDarkMode ? AppTheme.darkTextColor : AppTheme.textColor,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? AppTheme.spaceXxs : AppTheme.spaceMd,
            ),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                childAspectRatio: 0.75,
                crossAxisSpacing: isMobile ? AppTheme.spaceXs : AppTheme.spaceLg,
                mainAxisSpacing: isMobile ? AppTheme.spaceXs : AppTheme.spaceLg,
              ),
              itemCount: products.length,
              itemBuilder: (context, index) {
                final product = products[index];
                final delay = (index * 100).ms;
                return GestureDetector(
                  onTap: () => onProductTap(product),
                  child: _buildProductCard(product, context, delay),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(
      Product product, BuildContext context, Duration delay) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
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
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Stack(
              children: [
                Hero(
                  tag: 'featured_product_${product.id}',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
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
                  ),
                ),
                if (product.discountPercentage > 0)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                      decoration: BoxDecoration(
                        color: AppTheme.accentColor,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
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
                if (product.isNew)
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                      decoration: BoxDecoration(
                        color: AppTheme.successColor,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      ),
                      child: const Text(
                        'Yeni',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  bottom: 12,
                  right: 12,
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
                        final isFavorite = user != null &&
                            user.favoriteProductIds.contains(product.id);

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
                                    style: TextStyle(
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                  duration: const Duration(seconds: 2),
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
                                  style: TextStyle(
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                          padding: const EdgeInsets.all(AppTheme.spaceXs),
                          constraints: const BoxConstraints(),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textDarkColor,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(AppTheme.spaceXxs),
                  ),
                  child: Text(
                    product.category,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[800],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  Helpers.truncateText(product.description, 100),
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textDarkColor.withValues(alpha: 0.7),
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.discountPercentage > 0) ...[
                          Text(
                            Helpers.formatCurrency(product.price),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textDarkColor.withValues(alpha: 0.6),
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text(
                          Helpers.formatCurrency(product.discountedPrice),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      child: IconButton(
                        onPressed: () => onProductTap(product),
                        icon: const Icon(
                          Icons.arrow_forward,
                          color: Colors.white,
                        ),
                        tooltip: 'Ürün Detayı',
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
