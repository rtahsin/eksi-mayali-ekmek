// ignore_for_file: prefer_const_constructors, use_super_parameters

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/product_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';

class CategoryList extends StatefulWidget {
  final Function(String) onCategorySelected;
  final bool isHorizontal;

  const CategoryList({
    Key? key,
    required this.onCategorySelected,
    this.isHorizontal = true,
  }) : super(key: key);

  @override
  State<CategoryList> createState() => _CategoryListState();
}

class _CategoryListState extends State<CategoryList> {
  String _selectedCategory = '';
  List<Map<String, dynamic>> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  void _loadCategories() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final productService = Provider.of<ProductService>(context, listen: false);

      // Firestore'dan kategorileri çek
      final categories = await productService.fetchCategories();

      // Sadece aktif kategorileri filtrele ve order'a göre sırala
      final activeCategories = categories.where((cat) => cat['isActive'] == true).toList();

      activeCategories.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));

      if (mounted) {
        setState(() {
          _categories = activeCategories;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger.error('Kategoriler yüklenirken hata: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.isHorizontal ? _buildHorizontalList() : _buildVerticalList();
  }

  Widget _buildHorizontalList() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final cardSize = isMobile ? 100.0 : 150.0;

    if (_categories.isEmpty && !_isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Text(
            'Henüz kategori bulunmuyor',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ),
      );
    }

    return Container(
      height: isMobile ? 130 : 180,
      padding: EdgeInsets.symmetric(
        vertical: isMobile ? AppTheme.spaceXs : AppTheme.spaceMd,
      ),
      child: Center(
        child: _isLoading
            ? CircularProgressIndicator(color: AppTheme.primaryColor)
            : ListView.builder(
                scrollDirection: Axis.horizontal,
                shrinkWrap: true,
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final category = _categories[index];
                  final categoryName = category['name'] ?? '';
                  final isSelected = categoryName == _selectedCategory;

                  return Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: isMobile ? AppTheme.spaceXs : AppTheme.spaceLg,
                    ),
                    child: _buildCategoryCard(category, isSelected, cardSize),
                  );
                },
              ),
      ),
    );
  }

  Widget _buildVerticalList() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final cardSize = isMobile ? 100.0 : 150.0;

    if (_categories.isEmpty && !_isLoading) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Text(
            'Henüz kategori bulunmuyor',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ),
      );
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? AppTheme.spaceXs : AppTheme.spaceLg,
        vertical: isMobile ? AppTheme.spaceXxs : AppTheme.spaceXs,
      ),
      child: _isLoading
          ? Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : Wrap(
              spacing: isMobile ? 8 : 16,
              runSpacing: isMobile ? 8 : 16,
              alignment: WrapAlignment.center,
              children: _categories.map((category) {
                final categoryName = category['name'] ?? '';
                final isSelected = categoryName == _selectedCategory;
                return _buildCategoryCard(category, isSelected, cardSize);
              }).toList(),
            ),
    );
  }

  Widget _buildCategoryCard(Map<String, dynamic> category, bool isSelected, double size) {
    final categoryName = category['name'] ?? '';
    final imageUrl = category['imageUrl'] ?? '';
    final iconName = category['iconName'] ?? '';

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCategory = isSelected ? '' : categoryName;
        });
        widget.onCategorySelected(_selectedCategory);
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              border: Border.all(
                color: isSelected ? AppTheme.primaryColor : Colors.transparent,
                width: 3,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ClipOval(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (imageUrl.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Colors.grey[200],
                        child: Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppTheme.primaryColor,
                            ),
                            strokeWidth: 2,
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) {
                        Logger.warning('KategoriList görsel hata url=$url err=$error');
                        return _buildFallbackIcon(categoryName, iconName, size);
                      },
                    )
                  else
                    _buildFallbackIcon(categoryName, iconName, size),
                  Container(
                    decoration: BoxDecoration(
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
                    bottom: size * 0.13,
                    left: 0,
                    right: 0,
                    child: Text(
                      categoryName,
                      style: TextStyle(
                        fontSize: size * 0.12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        shadows: const [
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
            ),
          ),
        ],
      ),
    );
  }

  // Görsel olmadığında fallback icon göster
  Widget _buildFallbackIcon(String categoryName, String iconName, double size) {
    return Container(
      color: Colors.grey[200],
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _resolveIcon(iconName, categoryName),
              size: size * 0.3,
              color: AppTheme.primaryColor.withValues(alpha: 0.7),
            ),
            SizedBox(height: size * 0.05),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: size * 0.1),
              child: Text(
                categoryName,
                style: TextStyle(
                  fontSize: size * 0.09,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.primaryColor.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Icon resolver (admin paneldekiyle aynı)
  IconData _resolveIcon(String iconName, String categoryName) {
    if (iconName.isNotEmpty) {
      const mapping = <String, IconData>{
        'category': Icons.category,
        'bakery_dining': Icons.bakery_dining,
        'local_cafe': Icons.local_cafe,
        'coffee': Icons.coffee,
        'cake': Icons.cake,
        'star': Icons.star,
        'shopping_basket': Icons.shopping_basket,
        'local_dining': Icons.local_dining,
        'restaurant': Icons.restaurant,
        'cookie': Icons.cookie,
        'breakfast_dining': Icons.breakfast_dining,
        'lunch_dining': Icons.lunch_dining,
        'dinner_dining': Icons.dinner_dining,
        'food_bank': Icons.food_bank,
        'fastfood': Icons.fastfood,
        'icecream': Icons.icecream,
        'local_pizza': Icons.local_pizza,
        'emoji_food_beverage': Icons.emoji_food_beverage,
        'favorite': Icons.favorite,
        'new_releases': Icons.new_releases,
      };

      final icon = mapping[iconName.toLowerCase().trim()];
      if (icon != null) return icon;
    }

    // Fallback: kategori adından tahmin et
    return _getCategoryIcon(categoryName);
  }

  // Kategori için uygun ikon seçimi
  IconData _getCategoryIcon(String category) {
    if (category.contains('Ekmek')) return Icons.bakery_dining;
    if (category.contains('Süt')) return Icons.breakfast_dining;
    if (category.contains('Tatlı')) return Icons.cake;
    if (category.contains('Şarkuteri')) return Icons.restaurant;
    if (category.contains('İçecek')) return Icons.local_drink;
    if (category.contains('Kahvaltı')) return Icons.egg;
    return Icons.category;
  }
}
