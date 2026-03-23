// ignore_for_file: use_super_parameters, prefer_const_constructors, deprecated_member_use, unused_field, unused_element, unused_local_variable

import 'package:eksi_mayali_ekmek_web/models/cart_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/translations.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/empty_state.dart'; // Modern empty state

/// Sepet ekranı widget'ı.
/// Kullanıcının sepetindeki ürünleri görüntülemesini, miktarını değiştirmesini
/// ve sepetten ürün silmesini sağlar.
class CartScreen extends StatelessWidget {
  static const routeName = '/cart';

  const CartScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    // Ekran genişliğine göre padding değerini ayarla
    final horizontalPadding = isDesktop
      ? AppTheme.pagePaddingDesktop
      : (isTablet ? 40.0 : AppTheme.spaceLg);

    return Scaffold(
      appBar: CustomAppBar(
        title: AppTranslations.getTranslation(context, 'cart'),
        showBackButton: true,
        actions: [
          // Sepeti boşalt butonu
          Consumer<CartProvider>(
            builder: (context, cartProvider, _) {
              if (cartProvider.items.isEmpty) return SizedBox();

              return IconButton(
                icon: Icon(Icons.delete_sweep),
                tooltip: AppTranslations.getTranslation(context, 'delete'),
                onPressed: () {
                  _showClearCartDialog(context);
                },
              );
            },
          ),
        ],
      ),
      body: Consumer<CartProvider>(
        builder: (context, cartProvider, child) {
          final cartItems = cartProvider.items.values.toList();
          final total = cartProvider.totalAmount;

          // Sepet boşsa gösterilecek widget
          if (cartItems.isEmpty) {
            return _buildEmptyCart(context);
          }

          // Sepet doluysa gösterilecek widget
          return Column(
            children: [
              // Sepet özeti
              _buildCartSummary(context, cartItems.length, total),

              // Sepet içeriği
              Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: AppTheme.spaceLg, bottom: AppTheme.space8xl),
                    itemCount: cartItems.length,
                    itemBuilder: (context, index) {
                      final item = cartItems[index];
                      return _buildCartItem(context, item, index);
                    },
                  ),
                ),
              ),

              // Alt bar (toplam tutar ve ödeme butonu)
              _buildBottomBar(context, total),
            ],
          );
        },
      ),
    );
  }

  /// Sepet özeti widget'ı
  Widget _buildCartSummary(BuildContext context, int itemCount, double total) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final deviceType = Helpers.getDeviceType(context);
    final isSmallScreen = deviceType == DeviceType.mobile;

    return Container(
      width: double.infinity,
      margin: EdgeInsets.symmetric(
          horizontal: isSmallScreen ? AppTheme.spaceLg : AppTheme.spaceXl,
          vertical: isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppTheme.spaceLg, AppTheme.spaceLg, AppTheme.spaceLg, AppTheme.spaceXs),
            child: Row(
              children: [
                Icon(
                  Icons.shopping_bag_outlined,
                  color: AppTheme.primaryColor,
                  size: isSmallScreen ? 18 : 20,
                ),
                const SizedBox(width: AppTheme.spaceXs),
                Text(
                  AppTranslations.getTranslation(context, 'orderSummary'),
                  style: TextStyle(
                    fontSize: isSmallScreen ? 16 : 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor,
                  ),
                ),
              ],
            ),
          ),

          // Ayırıcı çizgi
          Divider(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
            thickness: 1,
          ),

          // Sipariş detayları
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceXs),
            child: Column(
              children: [
                // Ürün sayısı satırı
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$itemCount ${AppTranslations.getTranslation(context, 'products')}',
                      style: TextStyle(
                        fontSize: isSmallScreen ? 13 : 14,
                        color: isDark ? AppTheme.darkTextSecondaryColor : Colors.grey[600],
                      ),
                    ),
                    Text(
                      '${total.toStringAsFixed(2)} ₺',
                      style: TextStyle(
                        fontSize: isSmallScreen ? 13 : 14,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor,
                      ),
                    ),
                  ],
                ),

                SizedBox(height: 6),

                // Kargo ücreti satırı
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppTranslations.getTranslation(context, 'delivery'),
                      style: TextStyle(
                        fontSize: isSmallScreen ? 13 : 14,
                        color: isDark ? AppTheme.darkTextSecondaryColor : Colors.grey[600],
                      ),
                    ),
                    Text(
                      total >= 300 ? AppTranslations.getTranslation(context, 'free') : '50.00 ₺',
                      style: TextStyle(
                        fontSize: isSmallScreen ? 13 : 14,
                        fontWeight: FontWeight.w500,
                        color: total >= 300
                            ? Colors.green
                            : (isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor),
                      ),
                    ),
                  ],
                ),

                // 150 TL üzeri kargo bedava bilgisi
                if (total < 300)
                  Padding(
                    padding: const EdgeInsets.only(top: AppTheme.spaceSm),
                    child: Row(
                      children: [
                        Icon(
                          Icons.local_shipping_outlined,
                          size: isSmallScreen ? 14 : 16,
                          color: AppTheme.primaryColor,
                        ),
                        const SizedBox(width: AppTheme.spaceXxs),
                        Expanded(
                          child: Text(
                            '300 ₺ üzeri siparişlerde teslimat bedava! ${(300 - total).toStringAsFixed(2)} ₺ ekleyin',
                            style: TextStyle(
                              fontSize: isSmallScreen ? 12 : 13,
                              color: AppTheme.primaryColor,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Ayırıcı çizgi
          Divider(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
            thickness: 1,
          ),

          // Toplam
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppTheme.spaceLg, AppTheme.spaceXs, AppTheme.spaceLg, AppTheme.spaceLg),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  AppTranslations.getTranslation(context, 'cartTotal'),
                  style: TextStyle(
                    fontSize: isSmallScreen ? 15 : 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor,
                  ),
                ),
                Text(
                  '${(total >= 300 ? total : total + 50).toStringAsFixed(2)} ₺',
                  style: TextStyle(
                    fontSize: isSmallScreen ? 16 : 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0);
  }

  /// Boş sepet durumunda gösterilecek widget
  Widget _buildEmptyCart(BuildContext context) {
    // Modern animasyonlu empty state
    return EmptyCart(
      onShoppingPressed: () {
        Navigator.of(context).pushReplacementNamed('/');
      },
    );
  }

  /// Sepetteki her bir ürün için gösterilecek widget
  Widget _buildCartItem(BuildContext context, CartItem item, int index) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: AppTheme.spaceLg),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ürün görseli
            ClipRRect(
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              child: Image.network(
                item.product.imageUrl,
                width: 100,
                height: 100,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    width: 100,
                    height: 100,
                    color: Colors.grey[300],
                    child: const Icon(Icons.image_not_supported),
                  );
                },
              ),
            ),
            const SizedBox(width: AppTheme.spaceLg),

            // Ürün bilgileri
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ürün adı
                  Text(
                    item.product.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppTheme.spaceXxs),

                  // Ürün açıklaması
                  Text(
                    item.product.description,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppTheme.spaceXs),

                  // Fiyat ve miktar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Birim fiyat
                      Text(
                        '${item.product.price.toStringAsFixed(2)} ₺',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),

                      // Miktar kontrolü
                      Container(
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkSurfaceColor : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                        ),
                        child: Row(
                          children: [
                            // Azalt butonu
                            InkWell(
                              onTap: () {
                                final cartProvider = context.read<CartProvider>();
                                if (item.quantity > 1) {
                                  cartProvider.removeItem(item.product.id);
                                } else {
                                  _showRemoveItemDialog(context, item);
                                }
                              },
                              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              child: Container(
                                padding: const EdgeInsets.all(AppTheme.spaceXs),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.remove,
                                  size: 16,
                                  color: isDark ? AppTheme.darkTextColor : Colors.grey[700],
                                ),
                              ),
                            ),

                            // Miktar
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
                              child: Text(
                                item.quantity.toString(),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor,
                                ),
                              ),
                            ),

                            // Artır butonu
                            InkWell(
                              onTap: () {
                                final cartProvider = context.read<CartProvider>();
                                cartProvider.addItem(item.product);
                              },
                              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              child: Container(
                                padding: const EdgeInsets.all(AppTheme.spaceXs),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.add,
                                  size: 16,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppTheme.spaceXs),

                  // Toplam fiyat ve silme butonu
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Toplam fiyat
                      Text(
                        'Toplam: ${(item.product.price * item.quantity).toStringAsFixed(2)} ₺',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),

                      // Silme butonu
                      TextButton.icon(
                        onPressed: () {
                          _showRemoveItemDialog(context, item);
                        },
                        icon: Icon(
                          Icons.delete_outline,
                          size: 18,
                          color: Colors.red[400],
                        ),
                        label: Text(
                          'Kaldır',
                          style: TextStyle(
                            color: Colors.red[400],
                            fontSize: 14,
                          ),
                        ),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
                          minimumSize: Size(0, 0),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms, delay: (index * 100).ms).slideY(begin: 0.1, end: 0);
  }

  /// Sepet alt kısmında gösterilecek widget
  Widget _buildBottomBar(BuildContext context, double total) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final deviceType = Helpers.getDeviceType(context);
    final isMobile = deviceType == DeviceType.mobile;

    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushNamed('/checkout');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: isMobile ? AppTheme.spaceMd : AppTheme.spaceLg),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                  elevation: 2,
                ),
                child: Text(
                  AppTranslations.getTranslation(context, 'checkout'),
                  style: TextStyle(
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppTheme.spaceXs),
            TextButton.icon(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/');
              },
              icon: Icon(Icons.arrow_back, size: isMobile ? 18 : 20),
              label: Text(
                AppTranslations.getTranslation(context, 'continueShopping'),
                style: TextStyle(fontSize: isMobile ? 13 : 14),
              ),
              style: TextButton.styleFrom(
                foregroundColor: isDark ? AppTheme.darkTextColor : Colors.grey[700],
                padding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(height: AppTheme.spaceXs),
            // Beylikdüzü teslimat uyarısı
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spaceSm),
              margin: const EdgeInsets.only(bottom: AppTheme.spaceSm),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                border: Border.all(color: Colors.amber, width: 1),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.amber[800],
                    size: isMobile ? 18 : 20,
                  ),
                  const SizedBox(width: AppTheme.spaceXs),
                  Expanded(
                    child: Text(
                      'Şu an sadece Beylikdüzü ilçesine teslimat yapabiliyoruz.',
                      style: TextStyle(
                        fontSize: isMobile ? 12 : 13,
                        color: Colors.amber[800],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Ürünü sepetten kaldırma onay dialogu
  void _showRemoveItemDialog(BuildContext context, CartItem item) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppTranslations.getTranslation(context, 'delete')),
        content: Text(AppTranslations.getTranslation(context, 'removeItemConfirmation')
            .replaceAll('{name}', item.product.name)),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: Text(AppTranslations.getTranslation(context, 'cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              final cartProvider = context.read<CartProvider>();
              cartProvider.removeItemCompletely(item.product.id);
              Navigator.of(ctx).pop();
              Helpers.showSnackBar(
                AppTranslations.getTranslation(context, 'itemRemoved')
                    .replaceAll('{name}', item.product.name),
                context: context,
                action: SnackBarAction(
                  label: AppTranslations.getTranslation(context, 'cancel'),
                  onPressed: () {
                    cartProvider.addItem(item.product, quantity: item.quantity);
                  },
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(AppTranslations.getTranslation(context, 'delete')),
          ),
        ],
      ),
    );
  }

  /// Sepeti boşaltma onay dialogu
  void _showClearCartDialog(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(AppTranslations.getTranslation(context, 'clearCart')),
        content: Text(AppTranslations.getTranslation(context, 'clearCartConfirmation')),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: Text(AppTranslations.getTranslation(context, 'cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              final cartProvider = context.read<CartProvider>();
              final oldItems = Map<String, CartItem>.from(cartProvider.items);

              cartProvider.clear();
              Navigator.of(ctx).pop();

              Helpers.showSnackBar(
                AppTranslations.getTranslation(context, 'cartCleared'),
                context: context,
                action: SnackBarAction(
                  label: AppTranslations.getTranslation(context, 'undo'),
                  onPressed: () {
                    for (var item in oldItems.values) {
                      cartProvider.addItem(item.product, quantity: item.quantity);
                    }
                  },
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(AppTranslations.getTranslation(context, 'delete')),
          ),
        ],
      ),
    );
  }
}
