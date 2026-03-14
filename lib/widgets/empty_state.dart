// ignore_for_file: prefer_const_constructors

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';

/// Veri olmadığında gösterilecek boş durum widget'ı (Geliştirilmiş versiyon)
///
/// flutter_animate ile animasyonlu, modern empty state component
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Widget? action;
  final Color? iconColor;
  final double iconSize;

  const EmptyState({
    Key? key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    this.iconColor,
    this.iconSize = 80,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animasyonlu Icon
            Icon(
              icon,
              size: iconSize,
              color: iconColor ?? theme.colorScheme.primary.withValues(alpha: 0.5),
            ).animate().fadeIn(duration: 400.ms, curve: Curves.easeOut).scale(
                  begin: Offset(0.8, 0.8),
                  end: Offset(1.0, 1.0),
                  duration: 400.ms,
                  curve: Curves.elasticOut,
                ),

            const SizedBox(height: 24),

            // Başlık
            Text(
              title,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            )
                .animate(delay: 200.ms)
                .fadeIn(duration: 400.ms)
                .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),

            const SizedBox(height: 12),

            // Mesaj
            Text(
              message,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            )
                .animate(delay: 300.ms)
                .fadeIn(duration: 400.ms)
                .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),

            // Action Button
            if (action != null) ...[
              const SizedBox(height: 32),
              action!.animate(delay: 400.ms).fadeIn(duration: 400.ms).scale(
                    begin: Offset(0.9, 0.9),
                    end: Offset(1.0, 1.0),
                    curve: Curves.easeOut,
                  ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Empty Cart Widget - Boş sepet için özelleştirilmiş
class EmptyCart extends StatelessWidget {
  final VoidCallback? onShoppingPressed;

  const EmptyCart({Key? key, this.onShoppingPressed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.shopping_cart_outlined,
      iconColor: AppTheme.primaryColor.withValues(alpha: 0.6),
      title: 'Sepetiniz Boş',
      message: 'Henüz sepetinize ürün eklemediniz.\nHemen alışverişe başlayın!',
      action: ElevatedButton.icon(
        onPressed: onShoppingPressed ?? () => Navigator.of(context).pushReplacementNamed('/'),
        icon: Icon(Icons.shopping_bag),
        label: Text('Alışverişe Başla'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        ),
      ),
    );
  }
}

/// Empty Orders Widget - Boş sipariş geçmişi için
class EmptyOrders extends StatelessWidget {
  final VoidCallback? onShoppingPressed;

  const EmptyOrders({Key? key, this.onShoppingPressed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.receipt_long_outlined,
      iconColor: Colors.orange[300],
      title: 'Henüz Siparişiniz Yok',
      message: 'İlk siparişinizi verin ve\ntaze ekmeklerimizin tadını çıkarın!',
      action: ElevatedButton(
        onPressed: onShoppingPressed ?? () => Navigator.of(context).pushReplacementNamed('/'),
        child: Text('Sipariş Ver'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        ),
      ),
    );
  }
}

/// Empty Favorites Widget - Boş favoriler için
class EmptyFavorites extends StatelessWidget {
  final VoidCallback? onBrowsePressed;

  const EmptyFavorites({Key? key, this.onBrowsePressed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.favorite_border,
      iconColor: Colors.red[300],
      title: 'Favorileriniz Boş',
      message: 'Beğendiğiniz ürünleri favorilere ekleyin,\nsonra kolayca bulun!',
      action: ElevatedButton(
        onPressed: onBrowsePressed ?? () => Navigator.of(context).pushReplacementNamed('/'),
        child: Text('Ürünleri Keşfet'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        ),
      ),
    );
  }
}

/// No Connection Widget - İnternet bağlantısı yok için
class NoConnection extends StatelessWidget {
  final VoidCallback? onRetryPressed;

  const NoConnection({Key? key, this.onRetryPressed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.wifi_off,
      iconColor: Colors.red[300],
      title: 'Bağlantı Yok',
      message: 'İnternet bağlantınızı kontrol edin\nve tekrar deneyin.',
      action: onRetryPressed != null
          ? ElevatedButton.icon(
              onPressed: onRetryPressed,
              icon: Icon(Icons.refresh),
              label: Text('Tekrar Dene'),
            )
          : null,
    );
  }
}
