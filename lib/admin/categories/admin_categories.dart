// ignore_for_file: unused_field, unused_element

import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/product.dart';
import '../../services/image_service.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../../widgets/image_crop_dialog.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

class Category {
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  int productCount;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String slug;
  final int order;
  final String iconName;

  Category({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.productCount,
    required this.isActive,
    required this.createdAt,
    this.updatedAt,
    this.slug = '',
    this.order = 0,
    this.iconName = '',
  });

  // Map'ten kategori oluştur
  factory Category.fromMap(Map<String, dynamic> map) {
    return Category(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      imageUrl: map['imageUrl'],
      productCount: map['productCount'] ?? 0,
      isActive: map['isActive'] ?? true,
      createdAt: map['createdAt'] ?? DateTime.now(),
      updatedAt: map['updatedAt'],
      slug: map['slug'] ?? '',
      order: map['order'] ?? 0,
      iconName: map['iconName'] ?? '',
    );
  }

  // Kategoriyi Map'e dönüştür
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'productCount': productCount,
      'isActive': isActive,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'slug': slug,
      'order': order,
      'iconName': iconName,
    };
  }
}

class AdminCategoriesPage extends StatefulWidget {
  const AdminCategoriesPage({Key? key}) : super(key: key);

  @override
  State<AdminCategoriesPage> createState() => _AdminCategoriesPageState();
}

class _AdminCategoriesPageState extends State<AdminCategoriesPage> {
  final int _selectedIndex = 3;
  bool _isLoading = false;
  bool _isCreating = false;
  bool _isEditing = false;
  Category? _editingCategory;
  bool _uploadingImage = false;

  String _searchQuery = '';
  List<Category> _categories = [];
  List<Category> _filteredCategories = [];
  List<Product> _products = [];

  // Form kontrolleri
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _orderController = TextEditingController();
  final _iconController = TextEditingController();
  bool _isActive = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _imageUrlController.dispose();
    _orderController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // ProductService üzerinden kategorileri al
      final productService = Provider.of<ProductService>(context, listen: false);
      final products = await productService.getProducts();
      _products = products;

      // Firestore'dan kategorileri al
      final categoriesData = await productService.fetchCategories();

      // Kategorileri dönüştür
      _categories = categoriesData.map((data) => Category.fromMap(data)).toList();

      // Ürün sayılarını güncelle
      await _updateProductCounts();

      _filterCategories();
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('Kategoriler yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Veriler yüklenirken bir hata oluştu: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _pickAndUploadCategoryImage() async {
    if (_uploadingImage) return;
    try {
      setState(() => _uploadingImage = true);
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (picked == null || picked.files.isEmpty) {
        setState(() => _uploadingImage = false);
        return;
      }
      final file = picked.files.single;
      var bytes = file.bytes;
      if (bytes == null) {
        setState(() => _uploadingImage = false);
        return;
      }

      // Kırpma dialog'unu göster
      final croppedBytes = await showDialog<Uint8List>(
        context: context,
        barrierDismissible: false,
        builder: (context) => ImageCropDialog(
          imageBytes: bytes,
          aspectRatioLabel: 'Kategori (5:3)',
          initialAspectRatio: 5 / 3,
        ),
      );

      if (croppedBytes == null) {
        setState(() => _uploadingImage = false);
        return;
      }

      final prefix = 'category-images/${_editingCategory?.id ?? 'new'}';
      final url = await ImageService.uploadBytesToStorage(
        pathPrefix: prefix,
        bytes: croppedBytes,
        originalName: file.name,
        audit: {'entity': 'category', 'categoryId': _editingCategory?.id},
      );
      if (!mounted) return;
      setState(() => _imageUrlController.text = url);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Görsel yüklendi')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Yükleme hatası: $e')));
    } finally {
      if (mounted) setState(() => _uploadingImage = false);
    }
  }

  // Kategori başına ürün sayısını güncelle
  Future<void> _updateProductCounts() async {
    try {
      for (var category in _categories) {
        // Null safety için güvenli kullanım
        final count =
            _products.where((p) => p.category.toLowerCase() == category.name.toLowerCase()).length;
        category.productCount = count;
      }
    } catch (e) {
      Logger.error('Ürün sayılarını güncelleme hatası: $e');
    }
  }

  void _filterCategories() {
    setState(() {
      if (_searchQuery.isEmpty) {
        _filteredCategories = _categories;
      } else {
        _filteredCategories = _categories.where((category) {
          final query = _searchQuery.toLowerCase();
          return category.name.toLowerCase().contains(query) ||
              category.description.toLowerCase().contains(query);
        }).toList();
      }
    });
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _nameController.clear();
    _descriptionController.clear();
    _imageUrlController.clear();
    _orderController.clear();
    _iconController.clear();
    setState(() {
      _isActive = true;
      _isCreating = false;
      _isEditing = false;
      _editingCategory = null;
    });
  }

  void _setupEditForm(Category category) {
    _nameController.text = category.name;
    _descriptionController.text = category.description;
    _imageUrlController.text = category.imageUrl ?? '';
    _orderController.text = category.order.toString();
    _iconController.text = category.iconName;
    setState(() {
      _isActive = category.isActive;
      _isEditing = true;
      _editingCategory = category;
    });
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    try {
      setState(() {
        _isLoading = true;
      });

      final productService = Provider.of<ProductService>(context, listen: false);

      final name = _nameController.text.trim();
      final description = _descriptionController.text.trim();
      final imageUrl =
          _imageUrlController.text.trim().isEmpty ? null : _imageUrlController.text.trim();
      final orderText = _orderController.text.trim();
      final int order = int.tryParse(orderText) ?? 0;
      final iconName = _iconController.text.trim().toLowerCase();

      final categoryData = {
        'name': name,
        'description': description,
        'imageUrl': imageUrl,
        'isActive': _isActive,
        'order': order,
        'iconName': iconName,
      };

      if (_isEditing && _editingCategory != null) {
        // Kategori güncelleme
        categoryData['oldName'] = _editingCategory!.name;
        final result = await productService.updateCategory(_editingCategory!.id, categoryData);

        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Kategori başarıyla güncellendi'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          throw Exception(result['message']);
        }
      } else {
        // Yeni kategori ekleme
        final result = await productService.addCategory(categoryData);

        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Kategori başarıyla eklendi'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          throw Exception(result['message']);
        }
      }

      // Formu sıfırla ve verileri yeniden yükle
      _resetForm();
      await _loadData();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      Logger.error('Kategori kaydedilirken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Kategori kaydedilirken bir hata oluştu: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteCategory(Category category) async {
    try {
      setState(() {
        _isLoading = true;
      });

      final productService = Provider.of<ProductService>(context, listen: false);
      final result = await productService.deleteCategory(category.id, category.name);

      if (result['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kategori başarıyla silindi'),
            backgroundColor: Colors.green,
          ),
        );
        await _loadData();
      } else {
        throw Exception(result['message']);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      Logger.error('Kategori silinirken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Kategori silinirken bir hata oluştu: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _confirmDeleteCategory(Category category) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Kategori Sil'),
        content: Text(
          'Bu kategoriyi silmek istediğinizden emin misiniz?\n\n'
          'Kategori: ${category.name}\n'
          'Ürün Sayısı: ${category.productCount}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Sil',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (result == true) {
      await _deleteCategory(category);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 768;

    return Scaffold(
      appBar: AdminAppBar(
        title: 'Kategori Yönetimi',
        showSearchBar: true,
        onSearch: (query) {
          setState(() {
            _searchQuery = query;
            _filterCategories();
          });
        },
      ),
      drawer: AdminDrawer(currentIndex: 2),
      floatingActionButton: (isMobile && !_isCreating && !_isEditing)
          ? FloatingActionButton.extended(
              onPressed: () {
                setState(() {
                  _isCreating = true;
                  _isEditing = false;
                  _editingCategory = null;
                });
              },
              icon: Icon(Icons.add),
              label: Text('Kategori Ekle'),
              backgroundColor: AppTheme.primaryColor,
            )
          : null,
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: AppTheme.primaryColor),
                  SizedBox(height: 16),
                  Text(
                    'Kategoriler yükleniyor...',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : isMobile
              ? _buildMobileLayout()
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sol kenar - kategori listesi
                    Expanded(
                      flex: 3,
                      child: Card(
                        elevation: 2,
                        margin: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Başlık ve Ekle Butonu
                            Padding(
                              padding: EdgeInsets.all(16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Kategori Listesi',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  ElevatedButton.icon(
                                    onPressed: _isCreating
                                        ? null
                                        : () {
                                            setState(() {
                                              _isCreating = true;
                                              _isEditing = false;
                                              _editingCategory = null;
                                            });
                                          },
                                    icon: Icon(Icons.add),
                                    label: Text('Yeni Kategori'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryColor,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Kategorilerin listelendiği tablo
                            Expanded(
                              child: _filteredCategories.isEmpty
                                  ? _buildEmptyState()
                                  : AnimatedSwitcher(
                                      duration: Duration(milliseconds: 300),
                                      child: ReorderableListView.builder(
                                        key: ValueKey(_filteredCategories.length),
                                        itemCount: _filteredCategories.length,
                                        onReorder: (oldIndex, newIndex) async {
                                          setState(() {
                                            if (newIndex > oldIndex) newIndex -= 1;
                                            final item = _filteredCategories.removeAt(oldIndex);
                                            _filteredCategories.insert(newIndex, item);
                                            _categories = _filteredCategories;
                                          });

                                          // Sıralamayı hemen Firestore'a kaydet
                                          try {
                                            final productService =
                                                Provider.of<ProductService>(context, listen: false);
                                            final orderedIds =
                                                _categories.map((e) => e.id).toList();
                                            await productService.reorderCategories(orderedIds);

                                            if (mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(
                                                  content: Text('Sıralama kaydedildi'),
                                                  duration: Duration(seconds: 1),
                                                  backgroundColor: Colors.green,
                                                ),
                                              );
                                            }
                                          } catch (e) {
                                            Logger.error('Reorder kaydetme hatası: $e');
                                            if (mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                SnackBar(
                                                  content: Text('Sıralama kaydedilemedi: $e'),
                                                  backgroundColor: Colors.red,
                                                ),
                                              );
                                            }
                                          }
                                        },
                                        itemBuilder: (context, index) {
                                          final category = _filteredCategories[index];
                                          return Card(
                                            key: ValueKey(category.id),
                                            margin:
                                                EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            elevation: 1,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(8),
                                              side: _editingCategory?.id == category.id
                                                  ? BorderSide(
                                                      color: AppTheme.primaryColor, width: 2)
                                                  : BorderSide.none,
                                            ),
                                            child: ListTile(
                                              contentPadding:
                                                  EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                              leading: category.imageUrl != null &&
                                                      category.imageUrl!.isNotEmpty
                                                  ? CircleAvatar(
                                                      backgroundImage:
                                                          NetworkImage(category.imageUrl!),
                                                      backgroundColor: Colors.grey[200],
                                                      onBackgroundImageError: (e, s) {
                                                        Logger.error('Resim yüklenirken hata: $e');
                                                      },
                                                    )
                                                  : CircleAvatar(
                                                      backgroundColor: Colors.grey[200],
                                                      child: Icon(_resolveIcon(category.iconName),
                                                          color: Colors.grey[800]),
                                                    ),
                                              title: Text(
                                                category.name,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color: category.isActive
                                                      ? Colors.black87
                                                      : Colors.grey,
                                                ),
                                              ),
                                              subtitle: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    category.description,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                  SizedBox(height: 4),
                                                  Text(
                                                    'Ürün Sayısı: ${category.productCount}',
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      color: Colors.blue[700],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              trailing: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  // Durum göstergesi
                                                  Container(
                                                    padding: EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 4,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: category.isActive
                                                          ? Colors.green[100]
                                                          : Colors.grey[300],
                                                      borderRadius: BorderRadius.circular(10),
                                                    ),
                                                    child: Text(
                                                      category.isActive ? 'Aktif' : 'Pasif',
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        color: category.isActive
                                                            ? Colors.green[800]
                                                            : Colors.grey[700],
                                                      ),
                                                    ),
                                                  ),
                                                  SizedBox(width: 8),
                                                  // Düzenle butonu
                                                  IconButton(
                                                    onPressed: () {
                                                      _setupEditForm(category);
                                                    },
                                                    icon: Icon(
                                                      Icons.edit,
                                                      color: Colors.blue,
                                                    ),
                                                    tooltip: 'Düzenle',
                                                  ),
                                                  // Sil butonu
                                                  IconButton(
                                                    onPressed: () {
                                                      _confirmDeleteCategory(category);
                                                    },
                                                    icon: Icon(
                                                      Icons.delete,
                                                      color: Colors.red,
                                                    ),
                                                    tooltip: 'Sil',
                                                  ),
                                                  const Icon(Icons.drag_handle),
                                                ],
                                              ),
                                              onTap: () {
                                                _setupEditForm(category);
                                              },
                                              isThreeLine: true,
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Sağ kenar - form
                    if (_isCreating || _isEditing)
                      Expanded(
                        flex: 2,
                        child: SingleChildScrollView(
                          child: _buildFormCard(),
                        ),
                      ),
                  ],
                ),
    );
  }

  IconData _resolveIcon(String iconName) {
    if (iconName.isEmpty) return Icons.category_outlined;

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

    return mapping[iconName.toLowerCase().trim()] ?? Icons.category_outlined;
  }

  // Empty state widget
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.category_outlined,
            size: 80,
            color: Colors.grey[300],
          ),
          SizedBox(height: 16),
          Text(
            _searchQuery.isEmpty ? 'Henüz kategori bulunmuyor' : 'Arama sonucu bulunamadı',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 8),
          Text(
            _searchQuery.isEmpty
                ? 'Yeni bir kategori ekleyerek başlayın'
                : '"$_searchQuery" için sonuç yok',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
          if (_searchQuery.isEmpty) ...[
            SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _isCreating = true;
                  _isEditing = false;
                  _editingCategory = null;
                });
              },
              icon: Icon(Icons.add),
              label: Text('İlk Kategoriyi Ekle'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                textStyle: TextStyle(fontSize: 16),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // Mobile layout
  Widget _buildMobileLayout() {
    if (_isCreating || _isEditing) {
      return _buildFormCard();
    }

    return Column(
      children: [
        // Header
        Container(
          padding: EdgeInsets.all(16),
          color: Colors.grey[50],
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Kategoriler (${_filteredCategories.length})',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    _isCreating = true;
                    _isEditing = false;
                    _editingCategory = null;
                  });
                },
                icon: Icon(Icons.add_circle),
                color: AppTheme.primaryColor,
                iconSize: 32,
              ),
            ],
          ),
        ),
        // List
        Expanded(
          child: _filteredCategories.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: EdgeInsets.all(8),
                  itemCount: _filteredCategories.length,
                  itemBuilder: (context, index) {
                    final category = _filteredCategories[index];
                    return Card(
                      margin: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: ListTile(
                        leading: category.imageUrl != null && category.imageUrl!.isNotEmpty
                            ? CircleAvatar(
                                backgroundImage: NetworkImage(category.imageUrl!),
                                backgroundColor: Colors.grey[200],
                              )
                            : CircleAvatar(
                                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                child: Icon(
                                  _resolveIcon(category.iconName),
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                        title: Text(
                          category.name,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '${category.productCount} ürün',
                          style: TextStyle(fontSize: 12),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: category.isActive ? Colors.green[100] : Colors.grey[300],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                category.isActive ? 'Aktif' : 'Pasif',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: category.isActive ? Colors.green[800] : Colors.grey[700],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            Icon(Icons.chevron_right),
                          ],
                        ),
                        onTap: () {
                          _setupEditForm(category);
                        },
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // Form card widget (reusable for both desktop and mobile)
  Widget _buildFormCard() {
    return Card(
      elevation: 2,
      margin: EdgeInsets.all(16),
      child: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Başlık ve İptal butonu
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _isEditing ? 'Kategori Düzenle' : 'Yeni Kategori',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: _resetForm,
                      icon: Icon(Icons.close),
                      tooltip: 'İptal',
                    ),
                  ],
                ),
                Divider(),
                SizedBox(height: 16),

                // Görsel önizleme (eğer varsa)
                if (_imageUrlController.text.isNotEmpty) ...[
                  Center(
                    child: Container(
                      width: 200,
                      height: 120,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        image: DecorationImage(
                          image: NetworkImage(_imageUrlController.text),
                          fit: BoxFit.cover,
                        ),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                ],

                // Form alanları - mevcut form içeriği buraya gelecek
                _buildFormFields(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Form fields widget
  Widget _buildFormFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Kategori adı
        TextFormField(
          controller: _nameController,
          decoration: InputDecoration(
            labelText: 'Kategori Adı *',
            hintText: 'Örn: Ekmekler, Pastalar',
            border: OutlineInputBorder(),
            filled: true,
            prefixIcon: Icon(Icons.label),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Kategori adı gerekli';
            }
            if (value.trim().length < 2) {
              return 'Kategori adı en az 2 karakter olmalı';
            }
            if (value.trim().length > 50) {
              return 'Kategori adı en fazla 50 karakter olabilir';
            }
            return null;
          },
        ),
        SizedBox(height: 16),

        // Açıklama
        TextFormField(
          controller: _descriptionController,
          decoration: InputDecoration(
            labelText: 'Açıklama *',
            hintText: 'Kategori hakkında kısa açıklama',
            border: OutlineInputBorder(),
            filled: true,
            prefixIcon: Icon(Icons.description),
            helperText: 'En az 10, en fazla 200 karakter',
          ),
          maxLines: 3,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Açıklama gerekli';
            }
            if (value.trim().length < 10) {
              return 'Açıklama en az 10 karakter olmalı';
            }
            if (value.trim().length > 200) {
              return 'Açıklama en fazla 200 karakter olabilir';
            }
            return null;
          },
        ),
        SizedBox(height: 16),

        // Resim (URL + Yükle)
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _imageUrlController,
                decoration: const InputDecoration(
                  labelText: 'Resim (opsiyonel)',
                  hintText: 'URL veya yükle',
                  border: OutlineInputBorder(),
                  filled: true,
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              onPressed: _uploadingImage ? null : _pickAndUploadCategoryImage,
              icon: _uploadingImage
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.upload_file),
              label: Text(_uploadingImage ? 'Yükleniyor...' : 'Yükle'),
            ),
          ],
        ),
        SizedBox(height: 16),

        // Icon adı
        TextFormField(
          controller: _iconController,
          decoration: InputDecoration(
            labelText: 'Icon Adı (opsiyonel)',
            hintText: 'bakery_dining, cake, coffee, cookie',
            border: OutlineInputBorder(),
            filled: true,
            prefixIcon: Icon(Icons.category),
            helperText: 'Örnek: bakery_dining, local_cafe, cake, cookie, fastfood',
            helperMaxLines: 2,
          ),
        ),
        SizedBox(height: 16),

        // Sıralama
        TextFormField(
          controller: _orderController,
          decoration: InputDecoration(
            labelText: 'Sıralama',
            hintText: 'Görüntülenme sırası (1, 2, 3...)',
            border: OutlineInputBorder(),
            filled: true,
            prefixIcon: Icon(Icons.format_list_numbered),
            helperText: 'Küçük sayı önce gösterilir',
          ),
          keyboardType: TextInputType.number,
          validator: (value) {
            if (value != null && value.isNotEmpty) {
              final number = int.tryParse(value);
              if (number == null) {
                return 'Geçerli bir sayı girin';
              }
              if (number < 0) {
                return 'Sıralama 0 veya daha büyük olmalı';
              }
            }
            return null;
          },
        ),
        SizedBox(height: 16),

        // Durum
        SwitchListTile(
          title: Text('Durum'),
          subtitle: Text(_isActive ? 'Aktif' : 'Pasif'),
          value: _isActive,
          activeColor: AppTheme.primaryColor,
          onChanged: (value) {
            setState(() {
              _isActive = value;
            });
          },
        ),
        SizedBox(height: 24),

        // Butonlar
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            // İptal butonu
            OutlinedButton(
              onPressed: _resetForm,
              child: Text('İptal'),
              style: OutlinedButton.styleFrom(
                padding: EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
              ),
            ),
            SizedBox(width: 16),

            // Kaydet butonu
            ElevatedButton(
              onPressed: _isLoading ? null : _saveCategory,
              child: _isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text('Kaydet'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
