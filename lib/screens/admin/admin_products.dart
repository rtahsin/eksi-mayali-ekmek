// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';

class AdminProducts extends StatefulWidget {
  const AdminProducts({Key? key}) : super(key: key);

  @override
  State<AdminProducts> createState() => _AdminProductsState();
}

class _AdminProductsState extends State<AdminProducts> {
  String _filterCategory = 'Tümü';
  final List<String> _categories = ['Tümü', 'Ekşi Mayalı', 'Çavdarlı', 'Tam Buğday', 'Özel'];
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.grey.shade100,
              Colors.white,
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Ürünler',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          _showAddProductDialog();
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Yeni Ürün'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 600.ms).slideY(
                        begin: 0.2,
                        end: 0,
                        curve: Curves.easeOutQuad,
                        duration: 600.ms,
                      ),

                  const SizedBox(height: 16),

                  // Filtre ve arama
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Ürün ara...',
                            prefixIcon: const Icon(Icons.search),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                            filled: true,
                            fillColor: Colors.white,
                          ),
                          onChanged: (value) {
                            setState(() {});
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: DropdownButton<String>(
                          value: _filterCategory,
                          onChanged: (String? newValue) {
                            if (newValue != null) {
                              setState(() {
                                _filterCategory = newValue;
                              });
                            }
                          },
                          items: _categories.map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value),
                            );
                          }).toList(),
                          hint: const Text('Kategori'),
                          underline: Container(),
                          icon: const Icon(Icons.arrow_drop_down),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Ürün listesi
            Expanded(
              child: FutureBuilder<List<Product>>(
                future: Provider.of<ProductService>(context, listen: false).getProducts(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Text(
                        'Ürünler yüklenirken bir hata oluştu: ${snapshot.error}',
                        textAlign: TextAlign.center,
                      ),
                    );
                  }

                  if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(
                      child: Text(
                        'Henüz ürün bulunmamaktadır.',
                        style: TextStyle(fontSize: 16),
                      ),
                    );
                  }

                  final products = snapshot.data!;

                  // Filtreleme
                  var filteredProducts = products;

                  // Kategori filtresi
                  if (_filterCategory != 'Tümü') {
                    filteredProducts = filteredProducts
                        .where((product) => product.category == _filterCategory)
                        .toList();
                  }

                  // Arama filtresi
                  if (_searchController.text.isNotEmpty) {
                    final searchQuery = _searchController.text.toLowerCase();
                    filteredProducts = filteredProducts
                        .where((product) =>
                            product.name.toLowerCase().contains(searchQuery) ||
                            product.description.toLowerCase().contains(searchQuery))
                        .toList();
                  }

                  return LayoutBuilder(
                    builder: (context, constraints) {
                      final isMobile = constraints.maxWidth < 600;
                      final isTablet = constraints.maxWidth >= 600 && constraints.maxWidth < 1024;

                      int crossAxisCount;
                      double childAspectRatio;

                      if (isMobile) {
                        crossAxisCount = 1;
                        childAspectRatio = 1.2;
                      } else if (isTablet) {
                        crossAxisCount = 2;
                        childAspectRatio = 0.9;
                      } else {
                        crossAxisCount = 3;
                        childAspectRatio = 0.75;
                      }

                      return GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: crossAxisCount,
                          childAspectRatio: childAspectRatio,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                        itemCount: filteredProducts.length,
                        itemBuilder: (context, index) {
                          final product = filteredProducts[index];
                          return _buildProductCard(product);
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () {
          _showEditProductDialog(product);
        },
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ürün resmi
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(
                children: [
                  Container(
                    height: 140,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTheme.primaryColor.withValues(alpha: 0.05),
                          Colors.grey.shade200,
                        ],
                      ),
                    ),
                    child: Image.network(
                      product.imageUrl,
                      height: 140,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 140,
                          width: double.infinity,
                          color: Colors.grey.shade200,
                          child: const Icon(
                            Icons.image_not_supported,
                            size: 40,
                            color: Colors.grey,
                          ),
                        );
                      },
                    ),
                  ),
                  if (product.discountPercentage > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.red.withValues(alpha: 0.3),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          '%${product.discountPercentage.toInt()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                      child: Text(
                        product.category,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
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
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isDarkMode ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${product.price.toStringAsFixed(2)} ₺',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.edit,
                          size: 16,
                          color: Colors.grey.shade700,
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
    );
  }

  void _showAddProductDialog() {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final discountController = TextEditingController();
    final imageUrlController = TextEditingController();
    final ingredientsController = TextEditingController();
    final stockController = TextEditingController(text: '0');
    final tagsController = TextEditingController();
    final extraImagesController = TextEditingController();
    String selectedCategory = _categories.length > 1
        ? _categories[1]
        : (_categories.isNotEmpty ? _categories.first : 'Genel');
    bool isPopular = false;
    bool isNew = true;
    bool isActive = true;
    bool isFeatured = false;

    // Mobil kontrolü
    final isMobile = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Yeni Ürün Ekle',
          style: TextStyle(fontSize: isMobile ? 16 : 20, fontWeight: FontWeight.bold),
        ),
        titlePadding: EdgeInsets.only(
          left: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          top: isMobile ? 12 : 16,
          bottom: isMobile ? 8 : 12,
        ),
        contentPadding: EdgeInsets.symmetric(
          horizontal: isMobile ? 16 : 24,
          vertical: 0,
        ),
        insetPadding: EdgeInsets.symmetric(
          horizontal: isMobile ? 16 : 40,
          vertical: isMobile ? 24 : 60,
        ),
        content: SizedBox(
          width: isMobile ? double.maxFinite : 500,
          height: isMobile ? MediaQuery.of(context).size.height * 0.7 : null,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: isMobile ? 8 : 16),
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: 'Ürün Adı *',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                SizedBox(height: isMobile ? 10 : 16),
                TextField(
                  controller: descriptionController,
                  decoration: InputDecoration(
                    labelText: 'Açıklama',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  maxLines: isMobile ? 2 : 3,
                ),
                SizedBox(height: isMobile ? 10 : 16),
                // Fiyat ve İndirim - Mobilde tek sütun
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: priceController,
                        decoration: InputDecoration(
                          labelText: 'Fiyat (₺) *',
                          labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: isMobile ? 10 : 14,
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    SizedBox(width: isMobile ? 8 : 16),
                    Expanded(
                      child: TextField(
                        controller: discountController,
                        decoration: InputDecoration(
                          labelText: 'İndirim (%)',
                          labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: isMobile ? 10 : 14,
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 10 : 16),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: stockController,
                        decoration: InputDecoration(
                          labelText: 'Stok',
                          labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: isMobile ? 10 : 14,
                          ),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    if (!isMobile) ...[
                      const SizedBox(width: 16),
                      Expanded(flex: 3, child: SizedBox()),
                    ],
                  ],
                ),
                SizedBox(height: isMobile ? 10 : 16),
                TextField(
                  controller: imageUrlController,
                  decoration: InputDecoration(
                    labelText: 'Resim URL *',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                SizedBox(height: isMobile ? 10 : 16),
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  decoration: InputDecoration(
                    labelText: 'Kategori *',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: _categories.where((c) => c != 'Tümü').map((String category) {
                    return DropdownMenuItem<String>(
                      value: category,
                      child: Text(category, style: TextStyle(fontSize: isMobile ? 13 : 16)),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      selectedCategory = newValue;
                    }
                  },
                ),
                SizedBox(height: isMobile ? 10 : 16),
                // Opsiyonel alanlar - Mobilde accordiona alabiliriz
                if (!isMobile) ...[
                  TextField(
                    controller: extraImagesController,
                    decoration: const InputDecoration(
                      labelText: 'Ek Görseller (virgülle ayırın)',
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: ingredientsController,
                    decoration: const InputDecoration(
                      labelText: 'İçindekiler (virgülle ayırın)',
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: tagsController,
                    decoration: const InputDecoration(
                      labelText: 'Etiketler (virgülle ayırın)',
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                // Checkbox'lar - Mobilde chip olarak
                Text(
                  'Durum',
                  style: TextStyle(
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey[700],
                  ),
                ),
                SizedBox(height: isMobile ? 6 : 8),
                Wrap(
                  spacing: isMobile ? 6 : 8,
                  runSpacing: isMobile ? 6 : 8,
                  children: [
                    FilterChip(
                      label: Text('Popüler', style: TextStyle(fontSize: isMobile ? 11 : 13)),
                      selected: isPopular,
                      onSelected: (selected) {
                        setState(() {
                          isPopular = selected;
                        });
                      },
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppTheme.primaryColor,
                    ),
                    FilterChip(
                      label: Text('Yeni', style: TextStyle(fontSize: isMobile ? 11 : 13)),
                      selected: isNew,
                      onSelected: (selected) {
                        setState(() {
                          isNew = selected;
                        });
                      },
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppTheme.primaryColor,
                    ),
                    FilterChip(
                      label: Text('Aktif', style: TextStyle(fontSize: isMobile ? 11 : 13)),
                      selected: isActive,
                      onSelected: (selected) {
                        setState(() {
                          isActive = selected;
                        });
                      },
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppTheme.primaryColor,
                    ),
                    FilterChip(
                      label: Text('Öne Çıkan', style: TextStyle(fontSize: isMobile ? 11 : 13)),
                      selected: isFeatured,
                      onSelected: (selected) {
                        setState(() {
                          isFeatured = selected;
                        });
                      },
                      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
                      checkmarkColor: AppTheme.primaryColor,
                    ),
                  ],
                ),
                SizedBox(height: isMobile ? 12 : 16),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final tags = tagsController.text
                    .split(',')
                    .map((e) => e.trim())
                    .where((e) => e.isNotEmpty)
                    .toList();
                final images = extraImagesController.text
                    .split(',')
                    .map((e) => e.trim())
                    .where((e) => e.isNotEmpty)
                    .toList();

                final newProduct = Product(
                  id: '',
                  name: nameController.text.trim(),
                  description: descriptionController.text.trim(),
                  price: double.tryParse(priceController.text) ?? 0,
                  discountPercentage: double.tryParse(discountController.text) ?? 0,
                  imageUrl: imageUrlController.text.trim(),
                  category: selectedCategory,
                  ingredients: ingredientsController.text
                      .split(',')
                      .map((e) => e.trim())
                      .where((e) => e.isNotEmpty)
                      .toList(),
                  isPopular: isPopular,
                  isNew: isNew,
                  isFavorite: false,
                  stock: int.tryParse(stockController.text) ?? 0,
                  isActive: isActive,
                  isFeatured: isFeatured,
                  tags: tags,
                  imageUrls: images,
                );

                await Provider.of<ProductService>(context, listen: false).addProduct(newProduct);

                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Yeni ürün başarıyla eklendi.'),
                    backgroundColor: Colors.green,
                  ),
                );

                setState(() {});
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Hata: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('Ekle'),
          ),
        ],
      ),
    );
  }

  void _showEditProductDialog(Product product) {
    final nameController = TextEditingController(text: product.name);
    final descriptionController = TextEditingController(text: product.description);
    final priceController = TextEditingController(text: product.price.toString());
    final discountController = TextEditingController(text: product.discountPercentage.toString());
    final imageUrlController = TextEditingController(text: product.imageUrl);
    final ingredientsController = TextEditingController(text: product.ingredients.join(', '));
    final stockController = TextEditingController(text: product.stock.toString());
    final tagsController = TextEditingController(text: product.tags.join(', '));
    final extraImagesController = TextEditingController(text: product.imageUrls.join(', '));
    String selectedCategory = product.category;
    bool isPopular = product.isPopular;
    bool isNew = product.isNew;
    bool isActive = product.isActive;
    bool isFeatured = product.isFeatured;

    // Mobil kontrolü
    final isMobile = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Düzenle: ${product.name}',
          style: TextStyle(fontSize: isMobile ? 16 : 19, fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        titlePadding: EdgeInsets.only(
          left: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          top: isMobile ? 12 : 16,
          bottom: isMobile ? 8 : 12,
        ),
        contentPadding: EdgeInsets.symmetric(
          horizontal: isMobile ? 16 : 24,
          vertical: 0,
        ),
        insetPadding: EdgeInsets.symmetric(
          horizontal: isMobile ? 16 : 40,
          vertical: isMobile ? 24 : 60,
        ),
        content: SizedBox(
          width: isMobile ? double.maxFinite : 500,
          height: isMobile ? MediaQuery.of(context).size.height * 0.7 : null,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: isMobile ? 8 : 16),
                // Sadece temel alanlar mobilde
                TextField(
                  controller: nameController,
                  decoration: InputDecoration(
                    labelText: 'Ürün Adı *',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                SizedBox(height: isMobile ? 10 : 16),
                TextField(
                  controller: descriptionController,
                  decoration: InputDecoration(
                    labelText: 'Açıklama',
                    labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: isMobile ? 10 : 14,
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  maxLines: isMobile ? 2 : 3,
                ),
                SizedBox(height: isMobile ? 10 : 16),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: priceController,
                        decoration: const InputDecoration(
                          labelText: 'Fiyat (₺)',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        controller: discountController,
                        decoration: const InputDecoration(
                          labelText: 'İndirim (%)',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: stockController,
                        decoration: const InputDecoration(
                          labelText: 'Stok',
                        ),
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: imageUrlController,
                  decoration: const InputDecoration(
                    labelText: 'Resim URL',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: extraImagesController,
                  decoration: const InputDecoration(
                    labelText: 'Ek Görseller (virgülle ayırın)',
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  decoration: const InputDecoration(
                    labelText: 'Kategori',
                  ),
                  items: _categories.where((c) => c != 'Tümü').map((String category) {
                    return DropdownMenuItem<String>(
                      value: category,
                      child: Text(category),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      selectedCategory = newValue;
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: ingredientsController,
                  decoration: const InputDecoration(
                    labelText: 'İçindekiler (virgülle ayırın)',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: tagsController,
                  decoration: const InputDecoration(
                    labelText: 'Etiketler (virgülle ayırın)',
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: CheckboxListTile(
                        title: const Text('Popüler'),
                        value: isPopular,
                        onChanged: (bool? value) {
                          if (value != null) {
                            setState(() {
                              isPopular = value;
                            });
                          }
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    Expanded(
                      child: CheckboxListTile(
                        title: const Text('Yeni'),
                        value: isNew,
                        onChanged: (bool? value) {
                          if (value != null) {
                            setState(() {
                              isNew = value;
                            });
                          }
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: CheckboxListTile(
                        title: const Text('Aktif'),
                        value: isActive,
                        onChanged: (bool? value) {
                          if (value != null) {
                            setState(() {
                              isActive = value;
                            });
                          }
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    Expanded(
                      child: CheckboxListTile(
                        title: const Text('Öne Çıkan'),
                        value: isFeatured,
                        onChanged: (bool? value) {
                          if (value != null) {
                            setState(() {
                              isFeatured = value;
                            });
                          }
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                final tags = tagsController.text
                    .split(',')
                    .map((e) => e.trim())
                    .where((e) => e.isNotEmpty)
                    .toList();
                final images = extraImagesController.text
                    .split(',')
                    .map((e) => e.trim())
                    .where((e) => e.isNotEmpty)
                    .toList();

                final updatedProduct = Product(
                  id: product.id,
                  name: nameController.text.trim(),
                  description: descriptionController.text.trim(),
                  price: double.tryParse(priceController.text) ?? 0,
                  discountPercentage: double.tryParse(discountController.text) ?? 0,
                  imageUrl: imageUrlController.text.trim(),
                  category: selectedCategory,
                  ingredients: ingredientsController.text
                      .split(',')
                      .map((e) => e.trim())
                      .where((e) => e.isNotEmpty)
                      .toList(),
                  isPopular: isPopular,
                  isNew: isNew,
                  isFavorite: product.isFavorite,
                  stock: int.tryParse(stockController.text) ?? product.stock,
                  isActive: isActive,
                  isFeatured: isFeatured,
                  tags: tags,
                  imageUrls: images,
                );

                await Provider.of<ProductService>(context, listen: false)
                    .updateProduct(updatedProduct);

                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Ürün başarıyla güncellendi.'),
                    backgroundColor: Colors.green,
                  ),
                );

                setState(() {});
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Hata: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('Güncelle'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(Product product) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ürünü Sil'),
        content: Text('${product.name} ürününü silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                await Provider.of<ProductService>(context, listen: false).deleteProduct(product.id);

                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('${product.name} ürünü silindi.'),
                    backgroundColor: Colors.red,
                  ),
                );

                setState(() {});
              } catch (e) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Hata: $e')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
  }
}
