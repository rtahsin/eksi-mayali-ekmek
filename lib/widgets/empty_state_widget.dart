/*
 * Empty State Widget - Boş Liste Durumu için Widget
 * 
 * PURPOSE: Boş liste/veri durumlarında kullanıcı dostu görünüm
 * LAYER: Widget
 * DEPENDS ON: Material
 * 
 * RULES:
 * - Her boş liste durumunda bu widget'ı kullan
 * - Icon + mesaj + optional action button
 * - Kategori bazlı özelleştirme desteği
 * 
 * LAST UPDATED: 30 Aralık 2025
 */

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionButtonText;
  final VoidCallback? onActionPressed;
  final Color? iconColor;
  final double iconSize;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionButtonText,
    this.onActionPressed,
    this.iconColor,
    this.iconSize = 80,
  });

  // Factory constructors for common scenarios

  /// Boş ürün listesi
  factory EmptyStateWidget.products({
    VoidCallback? onAddProduct,
  }) {
    return EmptyStateWidget(
      icon: Icons.inventory_2_outlined,
      title: 'Henüz Ürün Yok',
      message: 'Henüz hiç ürün eklenmemiş.\nİlk ürününüzü ekleyerek başlayın.',
      actionButtonText: onAddProduct != null ? 'İlk Ürünü Ekle' : null,
      onActionPressed: onAddProduct,
      iconColor: Colors.orange,
    );
  }

  /// Boş sipariş listesi
  factory EmptyStateWidget.orders({
    bool isCustomer = false,
  }) {
    return EmptyStateWidget(
      icon: Icons.shopping_bag_outlined,
      title: isCustomer ? 'Henüz Sipariş Yok' : 'Sipariş Bulunamadı',
      message: isCustomer
          ? 'Henüz hiç sipariş vermediniz.\nAlışverişe başlamak için ürünleri inceleyin.'
          : 'Filtrelere uygun sipariş bulunamadı.\nFiltreleri değiştirip tekrar deneyin.',
      iconColor: Colors.blue,
    );
  }

  /// Boş müşteri listesi
  factory EmptyStateWidget.customers() {
    return const EmptyStateWidget(
      icon: Icons.people_outline,
      title: 'Müşteri Bulunamadı',
      message: 'Henüz hiç müşteri kaydı yok.\nİlk kayıt olunduğunda burada görünecek.',
      iconColor: Colors.purple,
    );
  }

  /// Boş kategori listesi
  factory EmptyStateWidget.categories({
    VoidCallback? onAddCategory,
  }) {
    return EmptyStateWidget(
      icon: Icons.category_outlined,
      title: 'Kategori Yok',
      message: 'Henüz hiç kategori eklenmemiş.\nÜrünlerinizi düzenlemek için kategori ekleyin.',
      actionButtonText: onAddCategory != null ? 'Kategori Ekle' : null,
      onActionPressed: onAddCategory,
      iconColor: Colors.green,
    );
  }

  /// Boş favori listesi
  factory EmptyStateWidget.favorites({
    VoidCallback? onBrowseProducts,
  }) {
    return EmptyStateWidget(
      icon: Icons.favorite_border,
      title: 'Favori Ürün Yok',
      message: 'Henüz favori ürününüz yok.\nBeğendiğiniz ürünleri favorilere ekleyin.',
      actionButtonText: onBrowseProducts != null ? 'Ürünleri İncele' : null,
      onActionPressed: onBrowseProducts,
      iconColor: Colors.red,
    );
  }

  /// Boş sepet
  factory EmptyStateWidget.cart({
    VoidCallback? onStartShopping,
  }) {
    return EmptyStateWidget(
      icon: Icons.shopping_cart_outlined,
      title: 'Sepetiniz Boş',
      message: 'Sepetinizde hiç ürün yok.\nAlışverişe başlamak için ürünleri inceleyin.',
      actionButtonText: onStartShopping != null ? 'Alışverişe Başla' : null,
      onActionPressed: onStartShopping,
      iconColor: Colors.teal,
    );
  }

  /// Boş blog listesi
  factory EmptyStateWidget.blogs({
    VoidCallback? onAddBlog,
  }) {
    return EmptyStateWidget(
      icon: Icons.article_outlined,
      title: 'Blog Yazısı Yok',
      message: 'Henüz hiç blog yazısı yok.\nİlk blog yazınızı ekleyerek başlayın.',
      actionButtonText: onAddBlog != null ? 'Blog Yazısı Ekle' : null,
      onActionPressed: onAddBlog,
      iconColor: Colors.deepPurple,
    );
  }

  /// Arama sonucu bulunamadı
  factory EmptyStateWidget.searchResults({
    required String searchQuery,
  }) {
    return EmptyStateWidget(
      icon: Icons.search_off,
      title: 'Sonuç Bulunamadı',
      message: '"$searchQuery" için sonuç bulunamadı.\nFarklı bir arama terimi deneyin.',
      iconColor: Colors.grey,
    );
  }

  /// Genel boş durum
  factory EmptyStateWidget.generic({
    required String title,
    required String message,
    IconData icon = Icons.inbox_outlined,
    String? actionButtonText,
    VoidCallback? onActionPressed,
  }) {
    return EmptyStateWidget(
      icon: icon,
      title: title,
      message: message,
      actionButtonText: actionButtonText,
      onActionPressed: onActionPressed,
      iconColor: Colors.blueGrey,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space3xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Icon(
              icon,
              size: iconSize,
              color: iconColor ?? Theme.of(context).primaryColor.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),

            // Title
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),

            // Message
            Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.black54,
                    height: 1.5,
                  ),
              textAlign: TextAlign.center,
            ),

            // Action button (opsiyonel)
            if (actionButtonText != null && onActionPressed != null) ...[
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: onActionPressed,
                icon: const Icon(Icons.add_rounded),
                label: Text(actionButtonText!),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTheme.space3xl,
                    vertical: AppTheme.spaceLg,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
