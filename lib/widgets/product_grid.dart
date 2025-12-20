// ignore_for_file: prefer_const_constructors, use_super_parameters, unused_import

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/theme_provider.dart';
import '../screens/product_detail_screen.dart';
import '../services/auth_service.dart';
import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import 'product_card.dart';

/// Ürün kartlarını grid olarak gösteren widget
/// Farklı ekran boyutlarına duyarlı ve otomatik olarak sütun sayısını ayarlar
class ProductGrid extends StatelessWidget {
  final List<Product> products;
  final double? maxCrossAxisExtent; // Bir öğenin maksimum genişliği
  final bool useFixedCount; // Sabit sütun sayısı kullanılsın mı?
  final ScrollPhysics? gridPhysics; // Grid için scroll fiziği

  const ProductGrid({
    Key? key,
    required this.products,
    this.maxCrossAxisExtent,
    this.useFixedCount = false,
    this.gridPhysics,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;
    final isMobile = deviceType == DeviceType.mobile;
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDarkMode = themeProvider.isDarkMode;

    // Ekran genişliğini alalım
    final screenWidth = MediaQuery.of(context).size.width;
    // Kenar boşluğu hesaplama - mobil için daha az boşluk
    final horizontalPadding =
        isMobile ? screenWidth * 0.02 : screenWidth * 0.03;

    // Ekran genişliğine göre sütun sayısını belirle
    final crossAxisCount = isDesktop ? 4 : (isTablet ? 3 : 2);

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      child: useFixedCount
          ? GridView.builder(
              shrinkWrap: true,
              physics: gridPhysics ?? const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.symmetric(vertical: 5),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                childAspectRatio: 0.85, // Ürün kartı oranını düzelttik
                crossAxisSpacing: isMobile ? 4 : 8, // Mobil için daha az boşluk
                mainAxisSpacing: isMobile ? 4 : 8, // Mobil için daha az boşluk
              ),
              itemCount: products.length,
              itemBuilder: (context, index) {
                return ProductCard(
                  product: products[index],
                  index: index,
                  isDarkMode: isDarkMode,
                );
              },
            )
          : GridView.builder(
              shrinkWrap: true,
              physics: gridPhysics ?? const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.symmetric(vertical: 5),
              gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent:
                    maxCrossAxisExtent ?? 200.0, // Varsayılan 200px genişlik
                childAspectRatio: 0.85, // Ürün kartı oranını düzelttik
                crossAxisSpacing: isMobile ? 4 : 8, // Mobil için daha az boşluk
                mainAxisSpacing: isMobile ? 4 : 8, // Mobil için daha az boşluk
              ),
              itemCount: products.length,
              itemBuilder: (context, index) {
                return ProductCard(
                  product: products[index],
                  index: index,
                  isDarkMode: isDarkMode,
                );
              },
            ),
    );
  }
}
