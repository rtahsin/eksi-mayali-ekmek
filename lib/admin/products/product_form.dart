import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../models/product.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/error_handler.dart';
import '../../utils/toast_helper.dart';
import '../../widgets/image_crop_dialog.dart';
import '../widgets/admin_app_bar.dart';

class ProductForm extends StatefulWidget {
  final Product? product;
  final bool isEditing;

  const ProductForm({
    super.key,
    this.product,
    this.isEditing = false,
  });

  @override
  State<ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<ProductForm> {
  final _formKey = GlobalKey<FormState>();

  // Form alanları için kontrolcüler
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late TextEditingController _priceController;
  late TextEditingController _discountController;
  late TextEditingController _imageUrlController;
  late TextEditingController _videoUrlController;
  late TextEditingController _stockController;
  late String _selectedCategory;
  late List<String> _ingredients;
  late List<String> _tags;
  late List<String> _imageUrls;
  late bool _isPopular;
  late bool _isNew;

  bool _isLoading = false;
  String? _category;
  bool _uploadingImage = false;
  bool _uploadingVideo = false;
  bool _uploadingExtras = false;

  @override
  void initState() {
    super.initState();

    // Eğer düzenleme modundaysa ürün bilgilerini doldur
    if (widget.isEditing && widget.product != null) {
      final product = widget.product!;
      _nameController = TextEditingController(text: product.name);
      _descriptionController = TextEditingController(text: product.description);
      _priceController = TextEditingController(text: product.price.toString());
      _discountController = TextEditingController(text: product.discountPercentage.toString());
      _imageUrlController = TextEditingController(text: product.imageUrl);
      _videoUrlController = TextEditingController(text: product.videoUrl ?? '');
      _stockController = TextEditingController(text: product.stock.toString());
      _selectedCategory = product.category;
      _ingredients = List<String>.from(product.ingredients);
      _tags = List<String>.from(product.tags);
      _imageUrls = List<String>.from(product.imageUrls);
      _isPopular = product.isPopular;
      _isNew = product.isNew;
    } else {
      // Yeni ürün ekleme modu
      _nameController = TextEditingController();
      _descriptionController = TextEditingController();
      _priceController = TextEditingController();
      _discountController = TextEditingController(text: "0");
      _imageUrlController = TextEditingController();
      _videoUrlController = TextEditingController();
      _stockController = TextEditingController(text: "0");
      _selectedCategory = "";
      _ingredients = [];
      _tags = [];
      _imageUrls = [];
      _isPopular = false;
      _isNew = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _discountController.dispose();
    _imageUrlController.dispose();
    _videoUrlController.dispose();
    _stockController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadMainImage() async {
    if (_uploadingImage) return;
    try {
      setState(() {
        _uploadingImage = true;
      });
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (result == null || result.files.isEmpty) {
        setState(() => _uploadingImage = false);
        return;
      }
      final file = result.files.single;
      var bytes = file.bytes;
      if (bytes == null) {
        ToastHelper.showErrorToast(context, 'Dosya okunamadı');
        setState(() => _uploadingImage = false);
        return;
      }

      // Kırpma dialog'unu göster
      final croppedBytes = await showDialog<Uint8List>(
        context: context,
        barrierDismissible: false,
        builder: (context) => ImageCropDialog(
          imageBytes: bytes,
          aspectRatioLabel: 'Ürün Kartı (3:4)',
          initialAspectRatio: 3 / 4,
        ),
      );

      if (croppedBytes == null) {
        setState(() => _uploadingImage = false);
        return;
      }

      final productService = Provider.of<ProductService>(context, listen: false);
      final productId = widget.product?.id ?? 'new';
      final url = await productService.uploadProductImageToStorage(
        productId,
        croppedBytes,
        originalName: file.name,
      );
      if (!mounted) return;
      setState(() {
        _imageUrlController.text = url;
      });
      ToastHelper.showSuccessToast(context, 'Görsel yüklendi');
    } catch (e) {
      if (!mounted) return;
      ErrorHandler.handleError(
        e,
        context: context,
        customMessage: 'Görsel yüklenirken bir hata oluştu',
      );
    } finally {
      if (mounted) {
        setState(() {
          _uploadingImage = false;
        });
      }
    }
  }

  Future<void> _pickAndUploadVideo() async {
    if (_uploadingVideo) return;
    try {
      setState(() {
        _uploadingVideo = true;
      });
      
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
        withData: true,
      );
      
      if (result == null || result.files.isEmpty) {
        setState(() => _uploadingVideo = false);
        return;
      }
      
      final file = result.files.single;
      final bytes = file.bytes;
      
      if (bytes == null) {
        ToastHelper.showErrorToast(context, 'Video dosyası okunamadı');
        setState(() => _uploadingVideo = false);
        return;
      }
      
      // Dosya boyutu kontrolü (max 50MB)
      if (bytes.length > 50 * 1024 * 1024) {
        ToastHelper.showErrorToast(context, 'Video boyutu 50MB\'dan küçük olmalı');
        setState(() => _uploadingVideo = false);
        return;
      }
      
      final productService = Provider.of<ProductService>(context, listen: false);
      final productId = widget.product?.id ?? 'new';
      
      final url = await productService.uploadProductVideoToStorage(
        productId,
        bytes,
        originalName: file.name,
      );
      
      if (!mounted) return;
      setState(() {
        _videoUrlController.text = url;
      });
      
      ToastHelper.showSuccessToast(context, 'Video yüklendi');
    } catch (e) {
      if (!mounted) return;
      ToastHelper.showErrorToast(context, 'Video yükleme hatası: $e');
    } finally {
      if (mounted) {
        setState(() {
          _uploadingVideo = false;
        });
      }
    }
  }

  Future<void> _pickAndUploadExtraImages() async {
    if (_uploadingExtras) return;
    try {
      setState(() {
        _uploadingExtras = true;
      });
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: true,
        withData: true,
      );
      if (result == null || result.files.isEmpty) {
        setState(() => _uploadingExtras = false);
        return;
      }

      final productService = Provider.of<ProductService>(context, listen: false);
      final productId = widget.product?.id ?? 'new';
      int success = 0;

      for (final file in result.files) {
        var bytes = file.bytes;
        if (bytes == null) continue;

        // Her görsel için kırpma dialog'u göster
        final croppedBytes = await showDialog<Uint8List>(
          context: context,
          barrierDismissible: false,
          builder: (context) => ImageCropDialog(
            imageBytes: bytes,
            aspectRatioLabel: 'Ürün Kartı (3:4)',
            initialAspectRatio: 3 / 4,
          ),
        );

        if (croppedBytes == null) continue;

        try {
          final url = await productService.uploadProductImageToStorage(
            productId,
            croppedBytes,
            originalName: file.name,
          );
          if (!mounted) return;
          setState(() {
            _imageUrls.add(url);
          });
          success++;
        } catch (_) {}
      }
      if (!mounted) return;
      ToastHelper.showSuccessToast(context, '$success görsel eklendi');
    } catch (e) {
      if (!mounted) return;
      ToastHelper.showErrorToast(context, 'Yükleme hatası: $e');
    } finally {
      if (mounted) {
        setState(() {
          _uploadingExtras = false;
        });
      }
    }
  }

  Future<void> _replaceExtraImage(int index) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;
      final file = result.files.single;
      final bytes = file.bytes;
      if (bytes == null) return;
      final productService = Provider.of<ProductService>(context, listen: false);
      final productId = widget.product?.id ?? 'new';
      final url = await productService.uploadProductImageToStorage(
        productId,
        bytes,
        originalName: file.name,
      );
      if (!mounted) return;
      setState(() {
        _imageUrls[index] = url;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Görsel değiştirildi')),
      );
    } catch (e) {
      if (!mounted) return;
      ToastHelper.showErrorToast(context, 'Yükleme hatası: $e');
    }
  }

  void _setCoverImage(String url) {
    setState(() {
      _imageUrlController.text = url;
    });
    ToastHelper.showInfoToast(context, 'Kapak görseli ayarlandı');
  }

  // İçerik ekleme fonksiyonu
  void _addIngredient(TextEditingController controller, List<String> list) {
    final value = controller.text.trim();
    if (value.isNotEmpty && !list.contains(value)) {
      setState(() {
        list.add(value);
        controller.clear();
      });
    }
  }

  // İçerik silme fonksiyonu
  void _removeItem(List<String> list, int index) {
    setState(() {
      list.removeAt(index);
    });
  }

  // Ürünü kaydetme fonksiyonu
  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final productService = Provider.of<ProductService>(context, listen: false);

      // Form verilerini al
      final name = _nameController.text.trim();
      final description = _descriptionController.text.trim();
      final price = double.tryParse(_priceController.text) ?? 0;
      final discount = double.tryParse(_discountController.text) ?? 0;
      final imageUrl = _imageUrlController.text.trim();
      final videoUrl = _videoUrlController.text.trim();
      final stock = int.tryParse(_stockController.text) ?? 0;

      // Ana görsel boşsa, ek görsellerden ilkini kullan
      final mainImage = imageUrl.isEmpty && _imageUrls.isNotEmpty ? _imageUrls.first : imageUrl;

      if (widget.isEditing && widget.product != null) {
        // Mevcut ürünü güncelle
        final updatedProduct = widget.product!.copyWith(
          name: name,
          description: description,
          price: price,
          discountPercentage: discount,
          imageUrl: mainImage,
          videoUrl: videoUrl.isEmpty ? null : videoUrl,
          category: _selectedCategory,
          ingredients: _ingredients,
          stock: stock,
          isPopular: _isPopular,
          isNew: _isNew,
          tags: _tags,
          imageUrls: _imageUrls,
          updatedAt: DateTime.now(),
        );

        await productService.updateProduct(updatedProduct);
        if (mounted) {
          ToastHelper.showSuccessToast(context, 'Ürün başarıyla güncellendi');
          Navigator.pop(context, true); // Başarı durumunu döndür
        }
      } else {
        // Yeni ürün oluştur
        const uuid = Uuid();
        final newProduct = Product(
          id: uuid.v4(),
          name: name,
          description: description,
          price: price,
          discountPercentage: discount,
          imageUrl: mainImage,
          videoUrl: videoUrl.isEmpty ? null : videoUrl,
          category: _selectedCategory,
          ingredients: _ingredients,
          stock: stock,
          isPopular: _isPopular,
          isNew: _isNew,
          tags: _tags,
          imageUrls: _imageUrls,
          createdAt: DateTime.now(),
        );

        await productService.addProduct(newProduct);
        if (mounted) {
          ToastHelper.showSuccessToast(context, 'Ürün başarıyla eklendi');
          Navigator.pop(context, true); // Başarı durumunu döndür
        }
      }
    } catch (e) {
      ToastHelper.showErrorToast(context, 'Hata: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildCategoryField() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: Provider.of<ProductService>(context, listen: false).fetchCategories(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return DropdownButtonFormField<String>(
            decoration: InputDecoration(
              labelText: 'Kategori *',
              border: OutlineInputBorder(),
              filled: true,
            ),
            value: _category,
            items: [
              DropdownMenuItem(
                value: "",
                child: Text('Yükleniyor...'),
              ),
            ],
            onChanged: null,
          );
        }

        if (snapshot.hasError) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                decoration: InputDecoration(
                  labelText: 'Kategori *',
                  border: OutlineInputBorder(),
                  filled: true,
                ),
                value: _category,
                items: [
                  DropdownMenuItem(
                    value: "Genel",
                    child: Text('Genel'),
                  ),
                ],
                onChanged: (value) {
                  setState(() {
                    _category = value!;
                  });
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen bir kategori seçin';
                  }
                  return null;
                },
              ),
              SizedBox(height: 4),
              Text('Kategoriler yüklenirken hata: ${snapshot.error}',
                  style: TextStyle(color: Colors.red, fontSize: 12)),
            ],
          );
        }

        // Kategorileri al ve aktif olanları filtrele
        final categories = snapshot.data ?? [];
        final activeCategories = categories.where((cat) => cat['isActive'] == true).toList();

        // Sıralama düzenine göre sırala
        activeCategories.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));

        // Eğer seçili kategori yoksa ve kategoriler varsa ilk kategoriyi seç
        if ((_category == null || _category!.isEmpty) && activeCategories.isNotEmpty) {
          _category = activeCategories.first['name'];
        }

        // Eğer düzenlenen ürünün kategorisi artık aktif değilse, özel kategori olarak ekle
        bool hasSelectedCategory = activeCategories.any((cat) => cat['name'] == _category);
        if (_category != null && _category!.isNotEmpty && !hasSelectedCategory) {
          activeCategories.add({
            'id': 'special',
            'name': _category!,
            'isActive': true,
          });
        }

        return DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: 'Kategori *',
            border: OutlineInputBorder(),
            filled: true,
            helperText: 'Ürünün hangi kategoride listelendiği',
            suffixIcon: IconButton(
              icon: Icon(Icons.refresh),
              onPressed: () {
                setState(() {
                  // Kategorileri yeniden yüklemek için state'i güncelle
                });
              },
              tooltip: 'Kategorileri yenile',
            ),
          ),
          value: _category,
          items: [
            ...activeCategories.map((category) {
              return DropdownMenuItem<String>(
                value: category['name'] as String,
                child: Text(category['name'] as String),
              );
            }).toList(),
          ],
          onChanged: (value) {
            setState(() {
              _category = value!;
            });
          },
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Lütfen bir kategori seçin';
            }
            return null;
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final ingredientController = TextEditingController();
    final tagController = TextEditingController();
    final imageUrlController = TextEditingController();

    return Scaffold(
      appBar: AdminAppBar(
        title: widget.isEditing ? 'Ürün Düzenle' : 'Yeni Ürün Ekle',
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _isLoading ? null : _saveProduct,
            tooltip: 'Kaydet',
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Temel Bilgiler
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Temel Bilgiler',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            // Ürün Adı
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'Ürün Adı *',
                                hintText: 'Örn: Ekşi Mayalı Ekmek',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Lütfen ürün adı girin';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            // Ürün Açıklaması
                            TextFormField(
                              controller: _descriptionController,
                              decoration: const InputDecoration(
                                labelText: 'Ürün Açıklaması *',
                                hintText: 'Ürün hakkında detaylı bilgi...',
                                border: OutlineInputBorder(),
                                alignLabelWithHint: true,
                              ),
                              maxLines: 5,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Lütfen ürün açıklaması girin';
                                }
                                return null;
                              },
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Fiyat Bilgileri
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Fiyat ve Stok Bilgileri',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            // Fiyat ve İndirim Satırı
                            Row(
                              children: [
                                // Fiyat
                                Expanded(
                                  flex: 2,
                                  child: TextFormField(
                                    controller: _priceController,
                                    decoration: const InputDecoration(
                                      labelText: 'Fiyat (₺) *',
                                      hintText: 'Örn: 24.99',
                                      border: OutlineInputBorder(),
                                      prefixIcon: Icon(Icons.attach_money),
                                    ),
                                    keyboardType: TextInputType.number,
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Fiyat gerekli';
                                      }
                                      if (double.tryParse(value) == null) {
                                        return 'Geçerli bir fiyat girin';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                                const SizedBox(width: 16),
                                // İndirim Oranı
                                Expanded(
                                  child: TextFormField(
                                    controller: _discountController,
                                    decoration: const InputDecoration(
                                      labelText: 'İndirim (%)',
                                      hintText: 'Örn: 10',
                                      border: OutlineInputBorder(),
                                      prefixIcon: Icon(Icons.discount),
                                    ),
                                    keyboardType: TextInputType.number,
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return null;
                                      }
                                      final discount = double.tryParse(value);
                                      if (discount == null) {
                                        return 'Geçerli sayı girin';
                                      }
                                      if (discount < 0 || discount > 100) {
                                        return '0-100 arası girin';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Stok ve Kategori Satırı
                            Row(
                              children: [
                                // Stok Miktarı
                                Expanded(
                                  child: TextFormField(
                                    controller: _stockController,
                                    decoration: const InputDecoration(
                                      labelText: 'Stok Miktarı',
                                      hintText: 'Örn: 100',
                                      border: OutlineInputBorder(),
                                      prefixIcon: Icon(Icons.inventory),
                                    ),
                                    keyboardType: TextInputType.number,
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return null;
                                      }
                                      final stock = int.tryParse(value);
                                      if (stock == null) {
                                        return 'Geçerli sayı girin';
                                      }
                                      if (stock < 0) {
                                        return 'Pozitif sayı girin';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                                const SizedBox(width: 16),
                                // Kategori
                                Expanded(
                                  flex: 2,
                                  child: _buildCategoryField(),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Görseller
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Ürün Görselleri',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Ana Görsel URL
                            TextFormField(
                              controller: _imageUrlController,
                              decoration: const InputDecoration(
                                labelText: 'Ana Görsel URL *',
                                hintText: 'https://ornek.com/gorsel.jpg',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.image),
                              ),
                              validator: (value) {
                                if ((value == null || value.trim().isEmpty) && _imageUrls.isEmpty) {
                                  return 'Ana görsel veya ek görseller gerekli';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 12),
                            Row(
                              children: [
                                ElevatedButton.icon(
                                  onPressed: _uploadingImage ? null : _pickAndUploadMainImage,
                                  icon: const Icon(Icons.upload_file),
                                  label: Text(_uploadingImage ? 'Yükleniyor...' : 'Yükle'),
                                ),
                                const SizedBox(width: 12),
                                if (_imageUrlController.text.isNotEmpty)
                                  Expanded(
                                    child: Text(
                                      'Yüklü: ${_imageUrlController.text}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 12, color: Colors.green),
                                    ),
                                  ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Ek Görseller
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: imageUrlController,
                                    decoration: const InputDecoration(
                                      labelText: 'Ek Görsel URL Ekle',
                                      hintText: 'https://ornek.com/gorsel.jpg',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    _addIngredient(imageUrlController, _imageUrls);
                                  },
                                  icon: const Icon(Icons.add),
                                  label: const Text('Ekle'),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: _uploadingExtras ? null : _pickAndUploadExtraImages,
                                  icon: const Icon(Icons.upload),
                                  label: Text(_uploadingExtras ? 'Yükleniyor...' : 'Yükle'),
                                ),
                              ],
                            ),

                            const SizedBox(height: 8),

                            // Ek Görseller Listesi (Sürükle-Bırak)
                            if (_imageUrls.isNotEmpty)
                              Container(
                                margin: const EdgeInsets.only(top: 8),
                                height: 120,
                                child: ReorderableListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  buildDefaultDragHandles: false,
                                  onReorder: (oldIndex, newIndex) {
                                    setState(() {
                                      if (newIndex > oldIndex) newIndex -= 1;
                                      final item = _imageUrls.removeAt(oldIndex);
                                      _imageUrls.insert(newIndex, item);
                                    });
                                  },
                                  itemCount: _imageUrls.length,
                                  itemBuilder: (context, index) {
                                    final url = _imageUrls[index];
                                    final isCover = _imageUrlController.text.trim() == url;
                                    return ReorderableDelayedDragStartListener(
                                      key: ValueKey(url),
                                      index: index,
                                      child: Stack(
                                        children: [
                                          Container(
                                            margin: const EdgeInsets.only(right: 8),
                                            width: 120,
                                            height: 120,
                                            decoration: BoxDecoration(
                                              border: Border.all(
                                                color: isCover ? Colors.orange : Colors.grey,
                                                width: isCover ? 2 : 1,
                                              ),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.circular(8),
                                              child: Image.network(
                                                url,
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, error, stackTrace) {
                                                  return const Center(
                                                    child: Icon(Icons.error, color: Colors.red),
                                                  );
                                                },
                                              ),
                                            ),
                                          ),
                                          // Replace image button
                                          Positioned(
                                            bottom: 4,
                                            right: 36,
                                            child: Material(
                                              color: Colors.transparent,
                                              child: InkWell(
                                                onTap: () => _replaceExtraImage(index),
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    color: Colors.blue.shade600,
                                                    shape: BoxShape.circle,
                                                  ),
                                                  padding: const EdgeInsets.all(6),
                                                  child: const Icon(Icons.upload,
                                                      color: Colors.white, size: 16),
                                                ),
                                              ),
                                            ),
                                          ),
                                          // Set as cover
                                          Positioned(
                                            bottom: 4,
                                            right: 8,
                                            child: Material(
                                              color: Colors.transparent,
                                              child: InkWell(
                                                onTap: () => _setCoverImage(url),
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    color: isCover
                                                        ? Colors.orange
                                                        : Colors.black.withValues(alpha: 0.5),
                                                    shape: BoxShape.circle,
                                                  ),
                                                  padding: const EdgeInsets.all(6),
                                                  child: Icon(
                                                    isCover ? Icons.star : Icons.star_border,
                                                    color: Colors.white,
                                                    size: 16,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                          Positioned(
                                            top: 0,
                                            right: 8,
                                            child: GestureDetector(
                                              onTap: () => _removeItem(_imageUrls, index),
                                              child: Container(
                                                decoration: const BoxDecoration(
                                                  color: Colors.red,
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Padding(
                                                  padding: EdgeInsets.all(4),
                                                  child: Icon(
                                                    Icons.close,
                                                    color: Colors.white,
                                                    size: 16,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Video URL
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.play_circle_outline, color: Colors.red),
                                const SizedBox(width: 8),
                                const Text(
                                  'Ürün Tanıtım Videosu',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _videoUrlController,
                                    decoration: const InputDecoration(
                                      labelText: 'Video URL',
                                      hintText: 'Firebase Storage URL otomatik oluşacak',
                                      border: OutlineInputBorder(),
                                      prefixIcon: Icon(Icons.videocam),
                                    ),
                                    enabled: false,
                                    maxLines: 2,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Column(
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: _uploadingVideo ? null : _pickAndUploadVideo,
                                      icon: _uploadingVideo 
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Icon(Icons.upload_file),
                                      label: Text(_uploadingVideo ? 'Yükleniyor...' : 'Video Yükle'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.red.shade600,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                    if (_videoUrlController.text.isNotEmpty)
                                      TextButton.icon(
                                        onPressed: () {
                                          setState(() {
                                            _videoUrlController.clear();
                                          });
                                        },
                                        icon: const Icon(Icons.delete, size: 16),
                                        label: const Text('Sil', style: TextStyle(fontSize: 12)),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.blue.shade200),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.info_outline, color: Colors.blue.shade700, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '📹 Kısa video yükleyin (max 50MB). MP4, WebM, MOV formatları desteklenir. Müşteriler ürün görsellerine tıklayınca videoyu izleyebilecek!',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.blue.shade900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // İçerikler ve Etiketler
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'İçerikler ve Etiketler',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // İçerikler Ekleme
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: ingredientController,
                                    decoration: const InputDecoration(
                                      labelText: 'İçerik Ekle',
                                      hintText: 'Örn: Un, Su, Tuz',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    _addIngredient(ingredientController, _ingredients);
                                  },
                                  icon: const Icon(Icons.add),
                                  label: const Text('Ekle'),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // İçerikler Listesi
                            if (_ingredients.isNotEmpty)
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: _ingredients.asMap().entries.map((entry) {
                                  final index = entry.key;
                                  final ingredient = entry.value;
                                  return Chip(
                                    label: Text(ingredient),
                                    deleteIcon: const Icon(Icons.close, size: 18),
                                    onDeleted: () => _removeItem(_ingredients, index),
                                  );
                                }).toList(),
                              ),

                            const SizedBox(height: 24),

                            // Etiketler Ekleme
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: tagController,
                                    decoration: const InputDecoration(
                                      labelText: 'Etiket Ekle',
                                      hintText: 'Örn: Glutensiz, Vegan',
                                      border: OutlineInputBorder(),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    _addIngredient(tagController, _tags);
                                  },
                                  icon: const Icon(Icons.add),
                                  label: const Text('Ekle'),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Etiketler Listesi
                            if (_tags.isNotEmpty)
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: _tags.asMap().entries.map((entry) {
                                  final index = entry.key;
                                  final tag = entry.value;
                                  return Chip(
                                    label: Text(tag),
                                    deleteIcon: const Icon(Icons.close, size: 18),
                                    onDeleted: () => _removeItem(_tags, index),
                                    backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Ek Seçenekler
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Ek Seçenekler',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Popüler mi?
                            SwitchListTile(
                              title: const Text('Popüler Ürün'),
                              subtitle: const Text('Ana sayfada öne çıkar'),
                              value: _isPopular,
                              onChanged: (bool value) {
                                setState(() {
                                  _isPopular = value;
                                });
                              },
                              secondary: const Icon(Icons.star),
                            ),

                            // Yeni mi?
                            SwitchListTile(
                              title: const Text('Yeni Ürün'),
                              subtitle: const Text('Yeni ürün olarak işaretle'),
                              value: _isNew,
                              onChanged: (bool value) {
                                setState(() {
                                  _isNew = value;
                                });
                              },
                              secondary: const Icon(Icons.new_releases),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Kaydet Buton
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _saveProduct,
                        icon: const Icon(Icons.save),
                        label: Text(widget.isEditing ? 'Ürünü Güncelle' : 'Ürünü Ekle'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
