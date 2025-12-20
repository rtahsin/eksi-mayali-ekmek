import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../theme/app_theme.dart';

// Sabit çeviri metinleri
class StaticTexts {
  static const String description = 'Açıklama';
  static const String addToCart = 'Sepete Ekle';
  static const String discount = 'İndirim';
}

class QuickViewDialog extends StatelessWidget {
  final Product product;
  final VoidCallback onAddToCart;

  const QuickViewDialog({
    Key? key,
    required this.product,
    required this.onAddToCart,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isSmallScreen = size.width < 600;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      backgroundColor: isDark ? AppTheme.darkCardColor : Colors.white,
      child: Container(
        width: isSmallScreen ? size.width * 0.9 : size.width * 0.7,
        constraints: BoxConstraints(
          maxWidth: 800,
          maxHeight: isSmallScreen ? size.height * 0.8 : size.height * 0.7,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Başlık ve Kapat butonu
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    product.name,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            Divider(),
            // İçerik
            Expanded(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: isSmallScreen
                      ? _buildMobileLayout(context)
                      : _buildDesktopLayout(context),
                ),
              ),
            ),
            // Alt butonlar
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.pushNamed(
                        context,
                        '/product-detail',
                        arguments: product,
                      );
                    },
                    icon: Icon(Icons.info_outline),
                    label: Text(StaticTexts.description),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: BorderSide(color: AppTheme.primaryColor),
                      padding:
                          EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      onAddToCart();
                      Navigator.of(context).pop();
                    },
                    icon: Icon(Icons.shopping_cart),
                    label: Text(StaticTexts.addToCart),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding:
                          EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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

  Widget _buildMobileLayout(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Ürün görseli
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: CachedNetworkImage(
            imageUrl: product.imageUrl,
            height: 200,
            width: double.infinity,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(
              height: 200,
              color: Colors.grey[200],
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
            errorWidget: (context, url, error) => Container(
              height: 200,
              color: Colors.grey[200],
              child: Icon(Icons.image_not_supported, color: Colors.grey),
            ),
          ),
        ),
        SizedBox(height: 16),
        // Fiyat
        Row(
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${product.price.toStringAsFixed(2)} ₺',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
            ),
            SizedBox(width: 8),
            if (product.discountPercentage > 0)
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '%${product.discountPercentage.toInt()} ${StaticTexts.discount}',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
          ],
        ),
        SizedBox(height: 16),
        // Kategori
        Container(
          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.primaryColor.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
          child: Text(
            product.category,
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        SizedBox(height: 16),
        // Açıklama
        Text(
          product.description,
          style: TextStyle(
            fontSize: 14,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildDesktopLayout(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Ürün görseli
        Expanded(
          flex: 4,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CachedNetworkImage(
              imageUrl: product.imageUrl,
              height: 300,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                height: 300,
                color: Colors.grey[200],
                child: Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                height: 300,
                color: Colors.grey[200],
                child: Icon(Icons.image_not_supported, color: Colors.grey),
              ),
            ),
          ),
        ),
        SizedBox(width: 24),
        // Ürün bilgileri
        Expanded(
          flex: 6,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Fiyat
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${product.price.toStringAsFixed(2)} ₺',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  SizedBox(width: 12),
                  if (product.discountPercentage > 0)
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '%${product.discountPercentage.toInt()} ${StaticTexts.discount}',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(height: 16),
              // Kategori
              Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  product.category,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              SizedBox(height: 24),
              // Açıklama
              Text(
                product.description,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
