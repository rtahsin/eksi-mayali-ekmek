import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/category.dart';
import '../services/image_service.dart';
import '../utils/logger.dart';

class CategoryCard extends StatelessWidget {
  final Category category;
  final bool isDark;
  final VoidCallback? onTap;

  const CategoryCard({
    Key? key,
    required this.category,
    required this.isDark,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: CachedNetworkImage(
                    imageUrl: category.imageUrl.isNotEmpty
                        ? category.imageUrl
                        : ImageService.getCategoryImage(category.name),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: Colors.grey[200],
                      child: Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Theme.of(context).primaryColor,
                          ),
                          strokeWidth: 2,
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) {
                      Logger.warning('KategoriCard görsel hata url=$url err=$error');
                      return Container(
                        color: Colors.grey[200],
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                _getCategoryIcon(category.name),
                                size: 40,
                                color: Theme.of(context).primaryColor.withValues(alpha: 0.5),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                category.name,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context).primaryColor.withValues(alpha: 0.5),
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Text(
                  category.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    shadows: [
                      Shadow(
                        offset: Offset(0, 1),
                        blurRadius: 2,
                        color: Colors.black45,
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    final lowerCategory = category.toLowerCase();
    if (lowerCategory.contains('ekmek')) {
      return Icons.bakery_dining;
    } else if (lowerCategory.contains('süt') || lowerCategory.contains('peynir')) {
      return Icons.egg;
    } else if (lowerCategory.contains('tatlı') || lowerCategory.contains('pasta')) {
      return Icons.cake;
    } else if (lowerCategory.contains('şarküteri')) {
      return Icons.restaurant;
    } else if (lowerCategory.contains('içecek') || lowerCategory.contains('kahve')) {
      return Icons.coffee;
    } else if (lowerCategory.contains('kahvaltı')) {
      return Icons.breakfast_dining;
    } else if (lowerCategory.contains('kurabiye')) {
      return Icons.cookie;
    } else if (lowerCategory.contains('poğaça')) {
      return Icons.bakery_dining;
    }
    return Icons.category;
  }
}
