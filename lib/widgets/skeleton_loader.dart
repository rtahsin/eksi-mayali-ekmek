// ignore_for_file: prefer_const_constructors

/*
 * Skeleton Loader - Modern Loading UI Component
 * 
 * PURPOSE: Shimmer efektli skeleton loader widget'ları
 * LAYER: UI Widget
 * DEPENDS ON: shimmer package
 * 
 * RULES:
 * - CircularProgressIndicator yerine modern alternatif
 * - Geriye uyumlu - opsiyonel kullanım
 * - flutter_animate ile animasyon desteği
 * 
 * LAST UPDATED: 16 Ocak 2026
 */

import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../theme/app_theme.dart';

/// Temel Skeleton Loader Widget
///
/// Özelleştirilebilir boyut ve border radius ile shimmer efektli loading gösterimi
class SkeletonLoader extends StatelessWidget {
  final double height;
  final double width;
  final BorderRadius? borderRadius;

  const SkeletonLoader({
    Key? key,
    this.height = 200,
    this.width = double.infinity,
    this.borderRadius,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: borderRadius ?? BorderRadius.circular(8),
        ),
      ),
    );
  }
}

/// Product Card için Skeleton Loader
///
/// Ürün kartı yüklenirken gösterilecek placeholder
class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Görsel alanı
          SkeletonLoader(
            height: 200,
            width: double.infinity,
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          Padding(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Başlık
                SkeletonLoader(
                  height: 20,
                  width: 150,
                  borderRadius: BorderRadius.circular(4),
                ),
                SizedBox(height: 8),
                // Fiyat
                SkeletonLoader(
                  height: 16,
                  width: 100,
                  borderRadius: BorderRadius.circular(4),
                ),
                SizedBox(height: 12),
                // Buton
                SkeletonLoader(
                  height: 36,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(8),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// List Item için Skeleton Loader
///
/// Sipariş, kullanıcı listesi gibi yerlerde kullanılır
class ListItemSkeleton extends StatelessWidget {
  final bool showAvatar;
  final bool showTrailing;

  const ListItemSkeleton({
    Key? key,
    this.showAvatar = true,
    this.showTrailing = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Avatar/Icon
          if (showAvatar) ...[
            SkeletonLoader(
              height: 48,
              width: 48,
              borderRadius: BorderRadius.circular(24),
            ),
            SizedBox(width: 12),
          ],
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLoader(
                  height: 16,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(4),
                ),
                SizedBox(height: 8),
                SkeletonLoader(
                  height: 14,
                  width: 200,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
          // Trailing
          if (showTrailing) ...[
            SizedBox(width: 12),
            SkeletonLoader(
              height: 32,
              width: 60,
              borderRadius: BorderRadius.circular(16),
            ),
          ],
        ],
      ),
    );
  }
}

/// Grid için Skeleton Loader
///
/// Ürün grid'i, blog grid'i için skeleton list
class SkeletonGrid extends StatelessWidget {
  final int itemCount;
  final int crossAxisCount;
  final double childAspectRatio;

  const SkeletonGrid({
    Key? key,
    this.itemCount = 6,
    this.crossAxisCount = 2,
    this.childAspectRatio = 0.75,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: EdgeInsets.all(16),
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) => ProductCardSkeleton(),
    );
  }
}

/// List için Skeleton Loader
///
/// Sipariş listesi, kullanıcı listesi için skeleton
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final bool showAvatar;
  final bool showTrailing;

  const SkeletonList({
    Key? key,
    this.itemCount = 5,
    this.showAvatar = true,
    this.showTrailing = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: (context, index) => ListItemSkeleton(
        showAvatar: showAvatar,
        showTrailing: showTrailing,
      ),
    );
  }
}

/// Blog Card için Skeleton Loader
class BlogCardSkeleton extends StatelessWidget {
  const BlogCardSkeleton({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Görsel
          SkeletonLoader(
            height: 180,
            width: double.infinity,
            borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Başlık
                SkeletonLoader(height: 20, width: double.infinity),
                SizedBox(height: 8),
                // Açıklama satır 1
                SkeletonLoader(height: 14, width: double.infinity),
                SizedBox(height: 4),
                // Açıklama satır 2
                SkeletonLoader(height: 14, width: 250),
                SizedBox(height: 12),
                // Tarih/Yazar
                Row(
                  children: [
                    SkeletonLoader(height: 12, width: 80),
                    SizedBox(width: 16),
                    SkeletonLoader(height: 12, width: 100),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Table Row için Skeleton Loader
///
/// Admin paneli tablolarında kullanılır
class TableRowSkeleton extends StatelessWidget {
  final int columnCount;

  const TableRowSkeleton({
    Key? key,
    this.columnCount = 4,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: Row(
        children: List.generate(
          columnCount,
          (index) => Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: SkeletonLoader(
                height: 16,
                width: double.infinity,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Full Screen Skeleton Loader
///
/// Tüm sayfa yüklenirken kullanılır
class FullScreenSkeleton extends StatelessWidget {
  final String? message;

  const FullScreenSkeleton({
    Key? key,
    this.message,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 60,
            height: 60,
            child: CircularProgressIndicator(
              strokeWidth: 4,
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
          ),
          if (message != null) ...[
            SizedBox(height: 24),
            Text(
              message!,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
