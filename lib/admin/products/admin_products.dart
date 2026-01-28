// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/excel_export_helper.dart';
import '../../utils/logger.dart';
import '../../utils/toast_helper.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';
// Web platformu için conditional import
import 'admin_products_web.dart' if (dart.library.io) 'admin_products_mobile.dart' as platform;
import 'product_form.dart';

class AdminProductsPage extends StatefulWidget {
  final String? productId;
  const AdminProductsPage({super.key, this.productId});

  @override
  State<AdminProductsPage> createState() => _AdminProductsPageState();
}

class _AdminProductsPageState extends State<AdminProductsPage> {
  // ignore: unused_field
  bool _isLoading = false;
  List<Product> _products = [];
  String _searchQuery = '';
  String _selectedCategory = 'Tümü';
  List<String> _categories = ['Tümü'];
  late Stream<List<Product>> _productsStream;
  final Set<String> _selectedIds = <String>{};
  bool _showDeleted = false; // Silinenleri gösterme seçeneği (ileride kullanılabilir)
  // Gelişmiş filtreler
  double? _minPrice;
  double? _maxPrice;
  int? _minStock;
  int? _maxStock;
  bool _onlyLowStock = false; // < 10

  // Pagination
  int _currentPage = 1;
  int _itemsPerPage = 20;
  int _totalItems = 0;

  @override
  void initState() {
    super.initState();
    final productService = Provider.of<ProductService>(context, listen: false);
    // Ürünleri gerçek zamanlı olarak dinle
    _productsStream = productService.getProductsStream(includeDeleted: true);
    // Başlangıç kategorilerini ayarla
    _loadInitialCategories();
  }

  Future<void> _loadInitialCategories() async {
    try {
      final productService = Provider.of<ProductService>(context, listen: false);
      final products = await productService.getProducts(includeDeleted: true);

      // Kategorileri çıkar
      final categories = <String>{'Tümü'};
      for (final product in products) {
        if (product.category != null && product.category.isNotEmpty) {
          categories.add(product.category);
        }
      }

      setState(() {
        _products = products;
        _categories = categories.toList();
      });
    } catch (e) {
      Logger.error("Kategorileri yüklerken hata: $e");
    }
  }

  List<Product> _filterProducts(List<Product> products) {
    final filtered = products.where((product) {
      // Silinen ürünleri gizle (showDeleted ileride true olursa gösterebiliriz)
      if (!_showDeleted && product.isDeleted) {
        return false;
      }
      // Kategori filtresi
      if (_selectedCategory != 'Tümü' && product.category != _selectedCategory) {
        return false;
      }

      // Gelişmiş fiyat/stok filtreleri
      if (_minPrice != null && product.price < _minPrice!) return false;
      if (_maxPrice != null && product.price > _maxPrice!) return false;
      if (_minStock != null && product.stock < _minStock!) return false;
      if (_maxStock != null && product.stock > _maxStock!) return false;
      if (_onlyLowStock && product.stock >= 10) return false;

      // Arama filtresi
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return product.name.toLowerCase().contains(query) ||
            (product.description ?? '').toLowerCase().contains(query);
      }

      return true;
    }).toList();

    // Toplam item sayısını güncelle
    _totalItems = filtered.length;

    // Pagination uygula
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = startIndex + _itemsPerPage;

    if (startIndex >= filtered.length) {
      return [];
    }

    return filtered.sublist(
      startIndex,
      endIndex > filtered.length ? filtered.length : endIndex,
    );
  }

  Future<void> _deleteProduct(Product product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Ürünü Sil'),
        content: Text('${product.name} ürününü silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: Text('Sil'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() {
        _isLoading = true;
      });

      try {
        final productService = Provider.of<ProductService>(context, listen: false);
        await productService.deleteProduct(product.id);

        ToastHelper.showSuccessToast(context, '${product.name} ürünü başarıyla silindi');

        _loadInitialCategories();
      } catch (e) {
        setState(() {
          _isLoading = false;
        });
        ToastHelper.showErrorToast(context, 'Ürün silinirken bir hata oluştu: $e');
      }
    }
  }

  /// Excel'e aktarma işlemi
  ///
  /// Tüm ürünleri Excel dosyasına dönüştürür ve indirir
  Future<void> _exportToExcel() async {
    try {
      Logger.info('Ürünler Excel export başlatılıyor');

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Excel dosyası hazırlanıyor...'),
                ],
              ),
            ),
          ),
        ),
      );

      // Get all products (not filtered)
      final excelBytes = await ExcelExportHelper.instance.exportProductsToExcel(_products);

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }

      if (excelBytes != null) {
        // Download file
        final filename = 'urunler_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.xlsx';

        if (kIsWeb) {
          // Web platform - trigger browser download
          platform.downloadFile(excelBytes, filename);

          Logger.info('Excel dosyası indirildi: $filename');

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Excel dosyası indirildi: $filename'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          // Mobile/Desktop
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Excel dosyası kaydedildi: $filename'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      } else {
        throw Exception('Excel dosyası oluşturulamadı');
      }
    } catch (e) {
      Logger.error('Excel export hatası: $e');

      // Close loading dialog if still open
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Excel dosyası oluşturulurken hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ignore: unused_element
  void _showProductForm({Product? product}) {
    showDialog(
      context: context,
      builder: (ctx) => ProductFormDialog(
        product: product,
        onSave: (editedProduct) async {
          Navigator.of(ctx).pop();
          setState(() {
            _isLoading = true;
          });

          try {
            final productService = Provider.of<ProductService>(context, listen: false);

            if (product == null) {
              // Yeni ürün ekleme
              await productService.addProduct(editedProduct);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${editedProduct.name} ürünü başarıyla eklendi.'),
                  backgroundColor: Colors.green,
                ),
              );
            } else {
              // Mevcut ürünü güncelleme
              await productService.updateProduct(editedProduct);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${editedProduct.name} ürünü başarıyla güncellendi.'),
                  backgroundColor: Colors.green,
                ),
              );
            }

            _loadInitialCategories();
          } catch (e) {
            setState(() {
              _isLoading = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Ürün kaydedilirken bir hata oluştu: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width > 900;
    final isMobile = MediaQuery.of(context).size.width <= 600;

    return Scaffold(
      appBar: AdminAppBar(title: 'Ürün Yönetimi'),
      drawer: AdminDrawer(currentIndex: 1),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context)
              .push(
            MaterialPageRoute(
              builder: (ctx) => ProductForm(isEditing: false),
            ),
          )
              .then((updated) {
            if (updated == true) {
              _loadInitialCategories();
            }
          });
        },
        icon: Icon(Icons.add),
        label: Text('Yeni Ürün'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: Padding(
        padding: EdgeInsets.all(isMobile ? 8.0 : 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Desktop-only: Başlık ve Yönetim Butonları
            if (isDesktop) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Ürün Yönetimi',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      // Excel export butonu
                      OutlinedButton.icon(
                        onPressed: () => _exportToExcel(),
                        icon: Icon(Icons.download),
                        label: Text('Excel\'e Aktar'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.green,
                        ),
                      ),
                      SizedBox(width: 8),
                      // Örnek ürünleri ekle butonu
                      OutlinedButton.icon(
                        onPressed: () => _addSampleProducts(),
                        icon: Icon(Icons.add_box),
                        label: Text('Örnek Ürünleri Ekle'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                        ),
                      ),
                      SizedBox(width: 8),
                      // Tüm ürünleri kaldır butonu
                      OutlinedButton.icon(
                        onPressed: () => _confirmRemoveAllProducts(),
                        icon: Icon(Icons.delete_forever, color: Colors.red),
                        label: Text('Tüm Ürünleri Kaldır'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              SizedBox(height: 16),
            ],
            // Üst kısım - Arama ve filtreler (Responsive)
            Container(
              padding: EdgeInsets.all(isMobile ? 8 : 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(isMobile ? 8 : 16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: isMobile
                  ? Column(
                      children: [
                        // Arama (Mobil)
                        TextField(
                          decoration: InputDecoration(
                            hintText: 'Ürün ara...',
                            hintStyle: TextStyle(fontSize: 14),
                            prefixIcon: Icon(Icons.search, color: AppTheme.primaryColor, size: 20),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: EdgeInsets.symmetric(vertical: 8),
                            isDense: true,
                          ),
                          onChanged: (value) {
                            setState(() {
                              _searchQuery = value;
                            });
                          },
                        ),
                        SizedBox(height: 8),
                        // Kategori dropdown (Mobil)
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey[300]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedCategory,
                              isExpanded: true,
                              isDense: true,
                              icon: Icon(Icons.keyboard_arrow_down, size: 20),
                              items: _categories.map((category) {
                                return DropdownMenuItem<String>(
                                  value: category,
                                  child: Text(category, style: TextStyle(fontSize: 14)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _selectedCategory = value;
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextField(
                            decoration: InputDecoration(
                              hintText: 'Ürün ara...',
                              prefixIcon: Icon(Icons.search, color: AppTheme.primaryColor),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onChanged: (value) {
                              setState(() {
                                _searchQuery = value;
                              });
                            },
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          flex: 2,
                          child: DropdownButtonFormField<String>(
                            value: _selectedCategory,
                            decoration: InputDecoration(
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            items: _categories.map((category) {
                              return DropdownMenuItem<String>(
                                value: category,
                                child: Text(category),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) {
                                setState(() {
                                  _selectedCategory = value;
                                });
                              }
                            },
                          ),
                        ),
                        if (isDesktop) ...[
                          SizedBox(width: 16),
                          Row(
                            children: [
                              Checkbox(
                                value: _showDeleted,
                                onChanged: (val) {
                                  setState(() {
                                    _showDeleted = val ?? false;
                                  });
                                },
                              ),
                              Text('Silinenleri Göster'),
                            ],
                          ),
                          SizedBox(width: 16),
                          OutlinedButton.icon(
                            onPressed: _openAdvancedFilters,
                            icon: Icon(Icons.tune),
                            label: Text('Filtreler'),
                          ),
                        ],
                      ],
                    ),
            ),
            SizedBox(height: isMobile ? 8 : 16),

            // Kullanım ipuçları - Sadece Desktop
            if (isDesktop) ...[
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Ürün eklemek için "Yeni Ürün" butonuna tıklayın. Mevcut ürünleri düzenlemek için kartlardaki düzenleme butonunu kullanın.',
                        style: TextStyle(fontSize: 14, color: Colors.blue[800]),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 16),
            ],

            // İstatistikler - Sadece Desktop ve Tablet
            if (!isMobile) ...[
              Row(
                children: [
                  Expanded(
                    child: Card(
                      elevation: 2,
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor.withValues(alpha: 0.8),
                              AppTheme.primaryColor.withValues(alpha: 0.6),
                            ],
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.inventory_2_rounded, color: Colors.white, size: 24),
                            SizedBox(height: 8),
                            Text(
                              '${_products.length}',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Toplam Ürün',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Card(
                      elevation: 2,
                      child: Container(
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: LinearGradient(
                            colors: [
                              Colors.red.withValues(alpha: 0.8),
                              Colors.redAccent.withValues(alpha: 0.6),
                            ],
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.warning_rounded, color: Colors.white, size: 24),
                            SizedBox(height: 8),
                            Text(
                              '${_products.where((p) => p.stock == 0).length}',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Stokta Yok',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (isDesktop) ...[
                    SizedBox(width: 8),
                    Expanded(
                      child: Card(
                        elevation: 2,
                        child: Container(
                          padding: const EdgeInsets.all(16.0),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            gradient: LinearGradient(
                              colors: [
                                Colors.green.withValues(alpha: 0.8),
                                Colors.green.withValues(alpha: 0.6),
                              ],
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.category_rounded, color: Colors.white, size: 24),
                              SizedBox(height: 8),
                              Text(
                                '${_categories.length - 1}',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Kategori',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              SizedBox(height: 16),
            ],

            // "Ürünler" başlığı ve işlemler
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Ürünler',
                  style: TextStyle(
                    fontSize: isMobile ? 18 : 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[800],
                  ),
                ),
                // Desktop/Tablet: Toplu işlem butonları
                if (!isMobile && _selectedIds.isEmpty && isDesktop)
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () async {
                          try {
                            setState(() {
                              _isLoading = true;
                            });

                            final productService =
                                Provider.of<ProductService>(context, listen: false);
                            await productService.addSampleProducts();

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Örnek ürünler başarıyla eklendi'),
                                backgroundColor: Colors.green,
                              ),
                            );

                            setState(() {
                              _isLoading = false;
                            });
                          } catch (e) {
                            setState(() {
                              _isLoading = false;
                            });

                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Örnek ürünler eklenirken hata: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        },
                        icon: Icon(Icons.add_shopping_cart),
                        label: Text('Örnek Ürünleri Ekle'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: BorderSide(color: AppTheme.primaryColor),
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      SizedBox(width: 12),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context)
                              .push(
                            MaterialPageRoute(
                              builder: (ctx) => ProductForm(isEditing: false),
                            ),
                          )
                              .then((updated) {
                            if (updated == true) {
                              _loadInitialCategories();
                            }
                          });
                        },
                        icon: Icon(Icons.add),
                        label: Text('Yeni Ürün'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            SizedBox(height: 16),

            // Ürünlerin listelendiği kısım
            Expanded(
              child: StreamBuilder<List<Product>>(
                stream: _productsStream,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                    return Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Text(
                        'Hata: ${snapshot.error}',
                        style: TextStyle(color: Colors.red),
                      ),
                    );
                  }

                  if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.inventory_2_outlined,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Henüz ürün bulunmuyor',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey[600],
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Yeni bir ürün eklemek için "Yeni Ürün" butonuna tıklayın.',
                            style: TextStyle(
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  // Snapshot verilerini güncelle
                  _products = snapshot.data!;

                  // Filtreleme uygula
                  final filteredProducts = _filterProducts(_products);
                  final totalPages = (_totalItems / _itemsPerPage).ceil();

                  return Column(
                    children: [
                      // Ürün listesi
                      Expanded(
                        child: filteredProducts.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                                    SizedBox(height: 16),
                                    Text(
                                      'Ürün bulunamadı',
                                      style: TextStyle(fontSize: 18, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                itemCount: filteredProducts.length,
                                itemBuilder: (ctx, index) {
                                  final product = filteredProducts[index];
                                  return Card(
                                    margin: EdgeInsets.only(bottom: isMobile ? 8 : 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(isMobile ? 8 : 12),
                                    ),
                                    elevation: 2,
                                    child: Padding(
                                      padding: EdgeInsets.all(isMobile ? 8.0 : 16.0),
                                      child: isMobile
                                          ? _buildMobileProductCard(product)
                                          : _buildDesktopProductCard(product),
                                    ),
                                  );
                                },
                              ),
                      ),

                      // Pagination kontrolleri
                      if (_totalItems > _itemsPerPage)
                        Container(
                          padding: EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border(top: BorderSide(color: Colors.grey.shade300)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Sayfa bilgisi
                              Text(
                                'Toplam $_totalItems ürün - Sayfa $_currentPage / $totalPages',
                                style: TextStyle(color: Colors.grey[700]),
                              ),

                              // Sayfa butonları
                              Row(
                                children: [
                                  IconButton(
                                    icon: Icon(Icons.first_page),
                                    onPressed: _currentPage > 1
                                        ? () => setState(() => _currentPage = 1)
                                        : null,
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.chevron_left),
                                    onPressed: _currentPage > 1
                                        ? () => setState(() => _currentPage--)
                                        : null,
                                  ),
                                  Container(
                                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '$_currentPage',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.chevron_right),
                                    onPressed: _currentPage < totalPages
                                        ? () => setState(() => _currentPage++)
                                        : null,
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.last_page),
                                    onPressed: _currentPage < totalPages
                                        ? () => setState(() => _currentPage = totalPages)
                                        : null,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Mobil ürün kartı (kompakt)
  Widget _buildMobileProductCard(Product product) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ürün resmi (küçük)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: product.imageUrl.isNotEmpty
                  ? Image.network(
                      product.imageUrl,
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, error, _) => Container(
                        width: 60,
                        height: 60,
                        color: Colors.grey[200],
                        child: Icon(Icons.image_not_supported, size: 24, color: Colors.grey),
                      ),
                    )
                  : Container(
                      width: 60,
                      height: 60,
                      color: Colors.grey[200],
                      child: Icon(Icons.image, size: 24, color: Colors.grey),
                    ),
            ),
            SizedBox(width: 12),

            // Ürün bilgileri
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ürün adı
                  Text(
                    product.name,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 4),

                  // Fiyat
                  Text(
                    '${product.price.toStringAsFixed(2)} TL',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ),

            // İşlem butonları (kompakt)
            Column(
              children: [
                IconButton(
                  icon: Icon(Icons.edit, size: 20),
                  color: Colors.blue,
                  padding: EdgeInsets.all(4),
                  constraints: BoxConstraints(),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (ctx) => ProductForm(
                          product: product,
                          isEditing: true,
                        ),
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: Icon(Icons.delete, size: 20),
                  color: Colors.red,
                  padding: EdgeInsets.all(4),
                  constraints: BoxConstraints(),
                  onPressed: () => _deleteProduct(product),
                ),
              ],
            ),
          ],
        ),
        SizedBox(height: 8),

        // Durum etiketleri (küçük)
        Wrap(
          spacing: 4,
          runSpacing: 4,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: product.isActive
                    ? Colors.green.withValues(alpha: 0.1)
                    : Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                product.isActive ? 'Aktif' : 'Pasif',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: product.isActive ? Colors.green : Colors.red,
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: product.stock > 0
                    ? Colors.blue.withValues(alpha: 0.1)
                    : Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                product.stock > 0 ? 'Stok: ${product.stock}' : 'Stok Yok',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: product.stock > 0 ? Colors.blue : Colors.orange,
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                product.category,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[700],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // Desktop ürün kartı (geniş)
  Widget _buildDesktopProductCard(Product product) {
    return Row(
      children: [
        // Seçim kutusu
        Checkbox(
          value: _selectedIds.contains(product.id),
          onChanged: (val) {
            setState(() {
              if (val == true) {
                _selectedIds.add(product.id);
              } else {
                _selectedIds.remove(product.id);
              }
            });
          },
        ),
        // Ürün resmi
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: product.imageUrl.isNotEmpty
              ? Image.network(
                  product.imageUrl,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, error, _) => Container(
                    width: 80,
                    height: 80,
                    color: Colors.grey[200],
                    child: Icon(Icons.image_not_supported, color: Colors.grey),
                  ),
                )
              : Container(
                  width: 80,
                  height: 80,
                  color: Colors.grey[200],
                  child: Icon(Icons.image, color: Colors.grey),
                ),
        ),
        SizedBox(width: 16),

        // Ürün bilgileri
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Ürün durumu
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.isActive
                          ? Colors.green.withValues(alpha: 0.1)
                          : Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      product.isActive ? 'Aktif' : 'Pasif',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: product.isActive ? Colors.green : Colors.red,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),

                  // Stok durumu
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.stock > 0
                          ? Colors.blue.withValues(alpha: 0.1)
                          : Colors.orange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      product.stock > 0 ? 'Stokta: ${product.stock}' : 'Stok Yok',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: product.stock > 0 ? Colors.blue : Colors.orange,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8),

              // Ürün adı
              Text(
                product.name,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 4),

              // Ürün açıklaması (kısa)
              Text(
                product.description.length > 80
                    ? '${product.description.substring(0, 80)}...'
                    : product.description,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
              SizedBox(height: 8),

              // Fiyat ve kategori
              Row(
                children: [
                  Icon(Icons.attach_money, size: 16, color: Colors.grey[600]),
                  Text(
                    '${product.price.toStringAsFixed(2)} TL',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  SizedBox(width: 16),
                  Icon(Icons.category_outlined, size: 16, color: Colors.grey[600]),
                  Text(
                    product.category,
                    style: TextStyle(
                      color: Colors.grey[700],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // İşlem butonları
        Column(
          children: [
            IconButton(
              icon: Icon(Icons.edit),
              color: Colors.blue,
              tooltip: 'Düzenle',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (ctx) => ProductForm(
                      product: product,
                      isEditing: true,
                    ),
                  ),
                );
              },
            ),
            IconButton(
              icon: Icon(Icons.delete),
              color: Colors.red,
              tooltip: 'Sil',
              onPressed: () => _deleteProduct(product),
            ),
            if (product.isDeleted)
              Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Icon(Icons.delete_forever, color: Colors.redAccent, size: 20),
              ),
          ],
        ),
      ],
    );
  }

  void _openAdvancedFilters() {
    final priceControllerMin =
        TextEditingController(text: _minPrice != null ? _minPrice!.toStringAsFixed(2) : '');
    final priceControllerMax =
        TextEditingController(text: _maxPrice != null ? _maxPrice!.toStringAsFixed(2) : '');
    final stockControllerMin = TextEditingController(text: _minStock?.toString() ?? '');
    final stockControllerMax = TextEditingController(text: _maxStock?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Gelişmiş Filtreler',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    icon: Icon(Icons.close),
                  )
                ],
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: priceControllerMin,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Min Fiyat',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: priceControllerMax,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Max Fiyat',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: stockControllerMin,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Min Stok',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: stockControllerMax,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Max Stok',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 8),
              Row(
                children: [
                  Checkbox(
                    value: _onlyLowStock,
                    onChanged: (v) {
                      setState(() {
                        _onlyLowStock = v ?? false;
                      });
                    },
                  ),
                  Text('Sadece Düşük Stok (< 10)')
                ],
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _minPrice = null;
                        _maxPrice = null;
                        _minStock = null;
                        _maxStock = null;
                        _onlyLowStock = false;
                      });
                      Navigator.of(ctx).pop();
                    },
                    child: Text('Temizle'),
                  ),
                  SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        final pmin = double.tryParse(priceControllerMin.text.replaceAll(',', '.'));
                        final pmax = double.tryParse(priceControllerMax.text.replaceAll(',', '.'));
                        final smin = int.tryParse(stockControllerMin.text);
                        final smax = int.tryParse(stockControllerMax.text);
                        _minPrice = pmin;
                        _maxPrice = pmax;
                        _minStock = smin;
                        _maxStock = smax;
                      });
                      Navigator.of(ctx).pop();
                    },
                    child: Text('Uygula'),
                  )
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // Örnek ürünleri ekle
  Future<void> _addSampleProducts() async {
    // Kullanıcıya onay sor
    final shouldAdd = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('Örnek Ürünleri Ekle'),
            content: Text('Firestore\'a örnek ürünler eklemek istediğinize emin misiniz?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text('İptal'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text('Ekle'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ) ??
        false;

    if (!shouldAdd) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final productService = Provider.of<ProductService>(context, listen: false);

      // Örnek ürünleri ekle
      await productService.addSampleProducts();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Örnek ürünler başarıyla eklendi.'),
          backgroundColor: Colors.green,
        ),
      );

      // Ürünleri yeniden yükle
      _loadInitialCategories();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Tüm ürünleri kaldır
  Future<void> _removeAllProducts() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final productService = Provider.of<ProductService>(context, listen: false);

      // Tüm ürünleri kaldır
      await productService.removeAllProducts();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Tüm ürünler başarıyla kaldırıldı.'),
          backgroundColor: Colors.green,
        ),
      );

      // Ürünleri yeniden yükle
      _loadInitialCategories();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Tüm ürünleri kaldırma onayı
  Future<void> _confirmRemoveAllProducts() async {
    final shouldRemove = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('Tüm Ürünleri Kaldır'),
            content:
                Text('DİKKAT: Bu işlem, veritabanındaki TÜM ürünleri kalıcı olarak silecektir. '
                    'Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text('İptal'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text('Tümünü Kaldır'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ) ??
        false;

    if (shouldRemove) {
      await _removeAllProducts();
    }
  }

  // ignore: unused_element
  Future<num?> _showNumberInputDialog(String title, String hint, {required bool isDouble}) async {
    final controller = TextEditingController();
    return showDialog<num>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.numberWithOptions(decimal: true, signed: true),
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('İptal')),
          ElevatedButton(
            onPressed: () {
              final raw = controller.text.trim();
              if (raw.isEmpty) {
                Navigator.pop(ctx);
                return;
              }
              try {
                if (isDouble) {
                  final val = double.parse(raw.replaceAll(',', '.'));
                  Navigator.pop(ctx, val);
                } else {
                  final val = int.parse(raw);
                  Navigator.pop(ctx, val);
                }
              } catch (_) {
                Navigator.pop(ctx);
              }
            },
            child: Text('Uygula'),
          ),
        ],
      ),
    );
  }
}

class ProductFormDialog extends StatefulWidget {
  final Product? product;
  final Function(Product) onSave;

  const ProductFormDialog({
    Key? key,
    this.product,
    required this.onSave,
  }) : super(key: key);

  @override
  State<ProductFormDialog> createState() => _ProductFormDialogState();
}

class _ProductFormDialogState extends State<ProductFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _categoryController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _titleController.text = widget.product!.name;
      _descriptionController.text = widget.product!.description ?? '';
      _priceController.text = widget.product!.price.toString();
      _stockController.text = widget.product!.stock.toString();
      _imageUrlController.text = widget.product!.imageUrl ?? '';
      _categoryController.text = widget.product!.category ?? '';
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _imageUrlController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  void _saveForm() {
    if (_formKey.currentState!.validate()) {
      final product = Product(
        id: widget.product?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
        name: _titleController.text,
        description: _descriptionController.text.isEmpty ? '' : _descriptionController.text,
        price: double.parse(_priceController.text),
        imageUrl: _imageUrlController.text.isEmpty ? '' : _imageUrlController.text,
        category: _categoryController.text.isEmpty ? 'Genel' : _categoryController.text,
        stock: int.parse(_stockController.text),
      );

      widget.onSave(product);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      elevation: 8,
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Başlık
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    widget.product == null ? Icons.add_circle : Icons.edit,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  widget.product == null ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.grey[100],
                    foregroundColor: Colors.grey[700],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Form
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.6,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Ürün adı
                      const Text(
                        'Ürün Adı',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _titleController,
                        decoration: InputDecoration(
                          hintText: 'Ürün adını girin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.shopping_bag_outlined),
                          filled: true,
                          fillColor: Colors.grey[50],
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Lütfen ürün adı girin';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Açıklama
                      const Text(
                        'Açıklama',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _descriptionController,
                        decoration: InputDecoration(
                          hintText: 'Ürün açıklamasını girin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          filled: true,
                          fillColor: Colors.grey[50],
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),

                      // Fiyat ve Stok
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Fiyat (₺)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextFormField(
                                  controller: _priceController,
                                  decoration: InputDecoration(
                                    hintText: '0.00',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    prefixIcon: const Icon(Icons.attach_money),
                                    filled: true,
                                    fillColor: Colors.grey[50],
                                  ),
                                  keyboardType: TextInputType.number,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Fiyat girin';
                                    }
                                    if (double.tryParse(value) == null) {
                                      return 'Geçerli bir sayı girin';
                                    }
                                    return null;
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Stok Adedi',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextFormField(
                                  controller: _stockController,
                                  decoration: InputDecoration(
                                    hintText: '0',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    prefixIcon: const Icon(Icons.inventory_2_outlined),
                                    filled: true,
                                    fillColor: Colors.grey[50],
                                  ),
                                  keyboardType: TextInputType.number,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Stok girin';
                                    }
                                    if (int.tryParse(value) == null) {
                                      return 'Tam sayı girin';
                                    }
                                    return null;
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Kategori
                      const Text(
                        'Kategori',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _categoryController,
                        decoration: InputDecoration(
                          hintText: 'Kategori girin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.category_outlined),
                          filled: true,
                          fillColor: Colors.grey[50],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Resim URL
                      const Text(
                        'Resim URL',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _imageUrlController,
                        decoration: InputDecoration(
                          hintText: 'Ürün resmi için URL girin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.image_outlined),
                          filled: true,
                          fillColor: Colors.grey[50],
                          helperText: 'Ürün resmi için URL girin (isteğe bağlı)',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Butonlar
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.cancel),
                  label: const Text('İptal'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    side: BorderSide(color: Colors.grey[400]!),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _saveForm,
                  icon: Icon(widget.product == null ? Icons.add_circle : Icons.save),
                  label: Text(widget.product == null ? 'Ekle' : 'Güncelle'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
