// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'dart:convert';
import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/repositories/i_product_repository.dart';
import '../models/product.dart';
import '../utils/logger.dart';
import 'audit_log_service.dart';
import 'connection_service.dart';
import 'image_service.dart';

class ProductService with ChangeNotifier {
  final IProductRepository _repository;
  final FirebaseFirestore _firestore;
  final String _collection = 'urunler';
  final ConnectionService _connectionService = GetIt.I<ConnectionService>();

  List<Product> _products = [];
  List<Product> _featuredProducts = [];
  List<String> _categories = [];
  List<Product> _popularProducts = [];
  List<Product> _newProducts = [];
  Map<String, List<Product>> _categoryProducts = {};
  List<Product> _favoriteProducts = [];
  bool _isLoading = false;
  String? _error;
  DateTime? _lastFetchTime;
  bool _useCache = true;
  bool _notificationPending = false;

  // Verilerin ne kadar süre önbelleğe alınacağı (dakika)
  static const int _cacheDurationMinutes = 15;

  // Kategori modeli ekliyorum
  static const String _categoriesCollection = 'kategoriler';

  ProductService(this._repository) : _firestore = FirebaseFirestore.instance {
    // ConnectionService'i dinle
    _connectionService.addListener(_onConnectionChanged);

    // Ürünleri yükle
    _loadCachedProducts();

    // Real-time Firestore listener başlat
    _startRealtimeListener();
  }

  /// Firestore'daki değişiklikleri gerçek zamanlı dinler
  void _startRealtimeListener() {
    _firestore.collection(_collection).snapshots().listen((snapshot) {
      if (snapshot.docs.isEmpty) return;

      _products = snapshot.docs
          .map((doc) {
            final data = doc.data();
            return Product(
              id: doc.id,
              name: data['name'] ?? '',
              description: data['description'] ?? '',
              price: (data['price'] as num?)?.toDouble() ?? 0.0,
              imageUrl: (data['imageUrl'] == null || data['imageUrl'].toString().isEmpty)
                  ? ImageService.getDefaultProductImage(data['name'] ?? '')
                  : data['imageUrl'],
              category: data['category'] ?? '',
              stock: data['stock'] ?? 0,
              isActive: data['isActive'] ?? true,
              isFeatured: data['isFeatured'] ?? false,
              createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
              updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
              sales: data['sales'] ?? 0,
              ingredients:
                  data['ingredients'] != null ? List<String>.from(data['ingredients']) : [],
              discountPercentage: (data['discountPercentage'] as num?)?.toDouble() ?? 0.0,
              isNew: data['isNew'] ?? false,
              isPopular: data['isPopular'] ?? false,
              tags: data['tags'] != null ? List<String>.from(data['tags']) : [],
              imageUrls: data['imageUrls'] != null ? List<String>.from(data['imageUrls']) : [],
              isDeleted: data['isDeleted'] ?? false,
              deletedAt:
                  data['deletedAt'] is Timestamp ? (data['deletedAt'] as Timestamp).toDate() : null,
              deletedBy: data['deletedBy'],
            );
          })
          .where((p) => !p.isDeleted)
          .toList();

      _updateCategories();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();
      _notifySafely();

      Logger.info('Real-time güncelleme: ${_products.length} ürün yüklendi');
    }, onError: (error) {
      Logger.error('Real-time listener hatası: $error');
    });
  }

  List<Product> get products => _products;
  List<Product> get featuredProducts => _featuredProducts;
  List<String> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<Product> get favoriteProducts => [..._favoriteProducts];
  List<Product> get items => [..._products];
  List<Product> get popularProducts => [..._popularProducts];
  List<Product> get newProducts => [..._newProducts];
  Map<String, List<Product>> get categoryProducts => {..._categoryProducts};
  DateTime? get lastFetchTime => _lastFetchTime;

  void _notifySafely() {
    if (!hasListeners || _notificationPending) return;
    _notificationPending = true;

    SchedulerBinding.instance.addPostFrameCallback((_) {
      _notificationPending = false;
      if (hasListeners) {
        notifyListeners();
      }
    });
  }

  // Önbelleğe alınmış verileri yükle
  Future<void> _loadCachedProducts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedProductsJson = prefs.getString('cached_products');
      final lastFetchTimeString = prefs.getString('last_products_fetch_time');

      if (lastFetchTimeString != null) {
        _lastFetchTime = DateTime.parse(lastFetchTimeString);
      }

      if (cachedProductsJson != null) {
        final decodedData = json.decode(cachedProductsJson);
        final List<dynamic> productsData = decodedData['products'];

        _products = productsData.map((data) => Product.fromJson(data)).toList();
        _categories = List<String>.from(decodedData['categories'] ?? []);

        // Kategori bazlı ürünleri güncelle
        _updateFeaturedProducts();
        _updatePopularProducts();
        _updateNewProducts();

        Logger.info('Önbelleğe alınmış ${_products.length} ürün yüklendi');
        _notifySafely();
      }

      // Önbellek süresi geçmiş veya veriler boşsa yeni veri çek
      final shouldRefresh = _lastFetchTime == null ||
          DateTime.now().difference(_lastFetchTime!).inMinutes > _cacheDurationMinutes ||
          _products.isEmpty;

      if (shouldRefresh) {
        getProducts();
      }
    } catch (e) {
      Logger.error('Önbellek verileri yüklenirken hata: $e');
    }
  }

  // Verileri önbelleğe al
  Future<void> _cacheProducts() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final data = {
        'products': _products.map((product) => product.toJson()).toList(),
        'categories': _categories,
      };

      final encodedData = json.encode(data);
      await prefs.setString('cached_products', encodedData);

      final now = DateTime.now();
      await prefs.setString('last_products_fetch_time', now.toIso8601String());
      _lastFetchTime = now;

      Logger.info('${_products.length} ürün önbelleğe alındı');
    } catch (e) {
      Logger.error('Ürünler önbelleğe alınırken hata: $e');
    }
  }

  // Bağlantı durumu değiştiğinde yapılacak işlemler
  void _onConnectionChanged() {
    final isOnline = _connectionService.isOnline;
    Logger.info('Bağlantı durumu değişti: ${isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}');

    // Çevrimiçi olunca verileri tazele
    if (isOnline) {
      // Önbellek süresi dolmuşsa verileri yenile
      final isCacheExpired = _lastFetchTime == null ||
          DateTime.now().difference(_lastFetchTime!).inMinutes > _cacheDurationMinutes;

      if (isCacheExpired) {
        Logger.info('Çevrimiçi moda geçildi, veriler yenileniyor');
        getProducts();
      }
    }
  }

  // Tüm ürünleri stream olarak dinle
  Stream<List<Product>> getProductsStream({bool includeDeleted = false}) {
    return _firestore.collection(_collection).snapshots().map((snapshot) {
      try {
        final list = snapshot.docs.map((doc) {
          final data = doc.data();
          return Product(
            id: doc.id,
            name: data['name'] ?? '',
            description: data['description'] ?? '',
            price: (data['price'] as num?)?.toDouble() ?? 0.0,
            imageUrl: ImageService.sanitizeImageUrl(
              data['imageUrl'],
              data['name'] ?? '',
            ),
            category: data['category'] ?? 'Genel',
            stock: data['stock'] ?? 0,
            isActive: data['isActive'] ?? true,
            isFeatured: data['isFeatured'] ?? false,
            createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
            updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
            sales: data['sales'] ?? 0,
            ingredients: data['ingredients'] != null ? List<String>.from(data['ingredients']) : [],
            discountPercentage: (data['discountPercentage'] as num?)?.toDouble() ?? 0.0,
            isNew: data['isNew'] ?? false,
            isPopular: data['isPopular'] ?? false,
            tags: data['tags'] != null ? List<String>.from(data['tags']) : [],
            imageUrls: data['imageUrls'] != null ? List<String>.from(data['imageUrls']) : [],
            isDeleted: data['isDeleted'] ?? false,
            deletedAt:
                data['deletedAt'] is Timestamp ? (data['deletedAt'] as Timestamp).toDate() : null,
            deletedBy: data['deletedBy'],
          );
        }).toList();
        return includeDeleted ? list : list.where((p) => !p.isDeleted).toList();
      } catch (e) {
        Logger.error('Stream ürünleri dönüştürülürken hata: $e');
        return [];
      }
    });
  }

  // Tüm ürünleri getir
  Future<List<Product>> getProducts({bool includeDeleted = false}) async {
    try {
      _isLoading = true;
      _error = null;
      _notifySafely();

      final snapshot = await _firestore.collection(_collection).get();

      _products = snapshot.docs
          .map((doc) {
            final data = doc.data();
            final product = Product(
              id: doc.id,
              name: data['name'] ?? '',
              description: data['description'] ?? '',
              price: (data['price'] as num?)?.toDouble() ?? 0.0,
              imageUrl: ImageService.sanitizeImageUrl(
                data['imageUrl'],
                data['name'] ?? '',
              ),
              category: data['category'] ?? '',
              stock: data['stock'] ?? 0,
              isActive: data['isActive'] ?? true,
              isFeatured: data['isFeatured'] ?? false,
              createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
              updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
              sales: data['sales'] ?? 0,
              ingredients:
                  data['ingredients'] != null ? List<String>.from(data['ingredients']) : [],
              discountPercentage: (data['discountPercentage'] as num?)?.toDouble() ?? 0.0,
              isNew: data['isNew'] ?? false,
              isPopular: data['isPopular'] ?? false,
              tags: data['tags'] != null ? List<String>.from(data['tags']) : [],
              imageUrls: data['imageUrls'] != null ? List<String>.from(data['imageUrls']) : [],
              isDeleted: data['isDeleted'] ?? false,
              deletedAt:
                  data['deletedAt'] is Timestamp ? (data['deletedAt'] as Timestamp).toDate() : null,
              deletedBy: data['deletedBy'],
            );
            return product;
          })
          .where((p) => includeDeleted ? true : !p.isDeleted)
          .toList();

      _updateCategories();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();

      // Verileri önbelleğe al
      _cacheProducts();

      _isLoading = false;
      _notifySafely();
      return _products;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Ürün ekle
  Future<String> addProduct(Product product) async {
    if (!_connectionService.isOnline) {
      throw Exception(
          'Çevrimdışı modda ürün eklenemez. Lütfen internet bağlantınızı kontrol edin.');
    }

    try {
      _isLoading = true;
      _error = null;
      _notifySafely();

      // Eğer imageUrl boşsa veya geçerli bir URL değilse, varsayılan görsel kullan
      String imageUrl = product.imageUrl;
      if (imageUrl.isEmpty || !imageUrl.startsWith('http')) {
        imageUrl = ImageService.getDefaultProductImage(product.name);
      }

      final productData = {
        'name': product.name,
        'description': product.description,
        'price': product.price,
        'imageUrl': imageUrl,
        'category': product.category,
        'stock': product.stock,
        'isActive': product.isActive,
        'isFeatured': product.isFeatured,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'sales': product.sales,
        'ingredients': product.ingredients,
        'discountPercentage': product.discountPercentage,
        'isNew': product.isNew,
        'isPopular': product.isPopular,
        'tags': product.tags,
        'imageUrls': product.imageUrls,
        'isDeleted': false,
        'deletedAt': null,
        'deletedBy': null,
      };

      // Ürünü Firestore'a ekle
      final docRef = await _firestore.collection(_collection).add(productData);

      // Yerel listeye ürünü ekle
      final newProduct = product.copyWith(id: docRef.id, imageUrl: imageUrl);
      _products.add(newProduct);
      _updateCategories();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();

      // Verileri önbelleğe al
      _cacheProducts();

      _isLoading = false;
      _notifySafely();
      return docRef.id;
    } catch (e) {
      Logger.error('Ürün eklenirken hata: $e');
      _error = 'Ürün eklenirken bir hata oluştu: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Ürün güncelle
  Future<void> updateProduct(Product product) async {
    if (!_connectionService.isOnline) {
      throw Exception(
          'Çevrimdışı modda ürün güncellenemez. Lütfen internet bağlantınızı kontrol edin.');
    }

    try {
      _isLoading = true;
      _error = null;
      _notifySafely();

      // Eğer imageUrl boşsa veya geçerli bir URL değilse, varsayılan görsel kullan
      String imageUrl = product.imageUrl;
      if (imageUrl.isEmpty || !imageUrl.startsWith('http')) {
        imageUrl = ImageService.getDefaultProductImage(product.name);
      }

      final productData = {
        'name': product.name,
        'description': product.description,
        'price': product.price,
        'imageUrl': imageUrl,
        'category': product.category,
        'stock': product.stock,
        'isActive': product.isActive,
        'isFeatured': product.isFeatured,
        'updatedAt': FieldValue.serverTimestamp(),
        'sales': product.sales,
        'ingredients': product.ingredients,
        'discountPercentage': product.discountPercentage,
        'isNew': product.isNew,
        'isPopular': product.isPopular,
        'tags': product.tags,
        'imageUrls': product.imageUrls,
      };

      // Firestore'daki ürünü güncelle
      await _firestore.collection(_collection).doc(product.id).update(productData);

      // Yerel listeyi güncelle
      final index = _products.indexWhere((p) => p.id == product.id);
      if (index >= 0) {
        _products[index] = product.copyWith(imageUrl: imageUrl);
        _updateCategories();
        _updateFeaturedProducts();
        _updatePopularProducts();
        _updateNewProducts();
      }

      // Verileri önbelleğe al
      _cacheProducts();

      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Ürün güncellenirken hata: $e');
      _error = 'Ürün güncellenirken bir hata oluştu: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Ürün soft delete
  Future<void> deleteProduct(String productId) async {
    if (!_connectionService.isOnline) {
      throw Exception(
          'Çevrimdışı modda ürün silinemez. Lütfen internet bağlantınızı kontrol edin.');
    }
    try {
      _isLoading = true;
      _error = null;
      _notifySafely();

      await _firestore.collection(_collection).doc(productId).update({
        'isDeleted': true,
        'deletedAt': FieldValue.serverTimestamp(),
        'deletedBy': FirebaseAuth.instance.currentUser?.uid,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        final existing = _products[index];
        _products[index] = existing.copyWith(
          isDeleted: true,
          deletedAt: DateTime.now(),
          deletedBy: FirebaseAuth.instance.currentUser?.uid,
          updatedAt: DateTime.now(),
        );
      }
      _products = _products.where((p) => !p.isDeleted).toList();
      _updateCategories();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();

      await AuditLogService.instance.log('product_soft_delete', data: {
        'productId': productId,
      });

      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Ürün soft delete sırasında hata: $e');
      _error = 'Ürün soft delete edilirken hata oluştu: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Ürünü geri yükle
  Future<void> restoreProduct(String productId) async {
    if (!_connectionService.isOnline) {
      throw Exception(
          'Çevrimdışı modda ürün geri yüklenemez. Lütfen internet bağlantınızı kontrol edin.');
    }
    try {
      _isLoading = true;
      _error = null;
      _notifySafely();

      await _firestore.collection(_collection).doc(productId).update({
        'isDeleted': false,
        'deletedAt': null,
        'deletedBy': null,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        final existing = _products[index];
        _products[index] = existing.copyWith(
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedAt: DateTime.now(),
        );
      } else {
        // Geri yüklenen ürün listede yoksa yeniden çek
        await getProducts();
      }
      _updateCategories();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();

      await AuditLogService.instance.log('product_restore', data: {
        'productId': productId,
      });

      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Ürün restore edilirken hata: $e');
      _error = 'Ürün geri yüklenirken hata oluştu: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Toplu fiyat ayarla (yüzde artış/azalış). percentage: +10 -> %10 artış, -5 -> %5 indirim
  Future<void> bulkAdjustPrice(List<String> productIds, double percentage) async {
    if (productIds.isEmpty) return;
    if (!_connectionService.isOnline) {
      throw Exception('Çevrimdışı modda toplu fiyat güncellenemez.');
    }
    try {
      _isLoading = true;
      _notifySafely();
      final batch = _firestore.batch();
      for (final id in productIds) {
        final index = _products.indexWhere((p) => p.id == id);
        if (index < 0) continue;
        final p = _products[index];
        final newPriceRaw = p.price * (1 + percentage / 100);
        final newPrice = double.parse(newPriceRaw.toStringAsFixed(2));
        batch.update(_firestore.collection(_collection).doc(id), {
          'price': newPrice,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        _products[index] = p.copyWith(price: newPrice, updatedAt: DateTime.now());
      }
      await batch.commit();
      _updateFeaturedProducts();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();
      await AuditLogService.instance.log('product_bulk_price', data: {
        'productIds': productIds,
        'percentage': percentage,
      });
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Toplu fiyat güncelleme hata: $e');
      _error = 'Toplu fiyat güncelleme hata: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Toplu stok set et (mutlak değer)
  Future<void> bulkSetStock(List<String> productIds, int stockValue) async {
    if (productIds.isEmpty) return;
    if (!_connectionService.isOnline) {
      throw Exception('Çevrimdışı modda toplu stok güncellenemez.');
    }
    try {
      _isLoading = true;
      _notifySafely();
      final batch = _firestore.batch();
      for (final id in productIds) {
        final index = _products.indexWhere((p) => p.id == id);
        if (index < 0) continue;
        final p = _products[index];
        batch.update(_firestore.collection(_collection).doc(id), {
          'stock': stockValue,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        _products[index] = p.copyWith(stock: stockValue, updatedAt: DateTime.now());
      }
      await batch.commit();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();
      await AuditLogService.instance.log('product_bulk_stock_set', data: {
        'productIds': productIds,
        'stock': stockValue,
      });
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Toplu stok set hata: $e');
      _error = 'Toplu stok set hata: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Toplu stok artır/azalt (delta)
  Future<void> bulkIncrementStock(List<String> productIds, int delta) async {
    if (productIds.isEmpty) return;
    if (!_connectionService.isOnline) {
      throw Exception('Çevrimdışı modda toplu stok güncellenemez.');
    }
    try {
      _isLoading = true;
      _notifySafely();
      final batch = _firestore.batch();
      for (final id in productIds) {
        final index = _products.indexWhere((p) => p.id == id);
        if (index < 0) continue;
        final p = _products[index];
        final newStock = (p.stock + delta) < 0 ? 0 : p.stock + delta;
        batch.update(_firestore.collection(_collection).doc(id), {
          'stock': newStock,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        _products[index] = p.copyWith(stock: newStock, updatedAt: DateTime.now());
      }
      await batch.commit();
      _updatePopularProducts();
      _updateNewProducts();
      _cacheProducts();
      await AuditLogService.instance.log('product_bulk_stock_increment', data: {
        'productIds': productIds,
        'delta': delta,
      });
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      Logger.error('Toplu stok increment hata: $e');
      _error = 'Toplu stok increment hata: $e';
      _isLoading = false;
      _notifySafely();
      throw Exception(_error);
    }
  }

  @override
  void dispose() {
    _connectionService.removeListener(_onConnectionChanged);
    super.dispose();
  }

  // Kategori listesini güncelle
  void _updateCategories() {
    final Set<String> uniqueCategories = {};
    for (final product in _products) {
      if (product.category.isNotEmpty) {
        uniqueCategories.add(product.category);
      }
    }
    _categories = uniqueCategories.toList()..sort();
  }

  // Öne çıkan ürünleri güncelle
  void _updateFeaturedProducts() {
    _featuredProducts = _products.where((p) => p.isFeatured).toList();
  }

  // Popüler ürünleri güncelle
  void _updatePopularProducts() {
    _popularProducts = _products.where((p) => p.isPopular).toList();
  }

  // Yeni ürünleri güncelle
  void _updateNewProducts() {
    _newProducts = _products.where((p) => p.isNew).toList();
  }

  // Ürün getir
  Product getProductById(String id) {
    return _products.firstWhere(
      (product) => product.id == id,
      orElse: () => _dummyProduct(),
    );
  }

  // Kategori bazlı ürünleri getir
  List<Product> getProductsByCategory(String category) {
    if (category == 'Tümü') {
      return _products;
    }
    return _products.where((product) => product.category == category).toList();
  }

  // Arama sonuçlarını getir
  List<Product> searchProducts(String query) {
    if (query.isEmpty) {
      return _products;
    }
    final queryLower = query.toLowerCase();
    return _products.where((product) {
      return product.name.toLowerCase().contains(queryLower) ||
          product.description.toLowerCase().contains(queryLower) ||
          product.category.toLowerCase().contains(queryLower);
    }).toList();
  }

  // Boş ürün döndür (hata durumu için)
  Product _dummyProduct() {
    return Product(
      id: 'dummy',
      name: 'Ürün Bulunamadı',
      description: '',
      price: 0,
      imageUrl: '',
      category: 'Genel',
      stock: 0,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  // Stok kontrolü
  bool isInStock(String productId, int quantity) {
    final product = getProductById(productId);
    return product.stock >= quantity;
  }

  // Stok güncelleme
  Future<void> updateStock(String productId, int quantity) async {
    try {
      final product = getProductById(productId);
      if (product.id == 'dummy') {
        throw Exception('Ürün bulunamadı');
      }

      // Yeni stok miktarını hesapla
      final newStock = product.stock - quantity;
      if (newStock < 0) {
        throw Exception('Yetersiz stok');
      }

      // Firestore'da stok güncelle
      await _repository.updateStock(productId, newStock);

      // Yerel listeyi güncelle
      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        _products[index] = _products[index].copyWith(
          stock: newStock,
          updatedAt: DateTime.now(),
        );
        _notifySafely();
      }
    } catch (e) {
      Logger.error('Stok güncellenirken hata: $e');
      rethrow;
    }
  }

  // Ürünü yayından kaldır/yayınla
  Future<void> toggleProductStatus(String productId) async {
    try {
      final product = getProductById(productId);
      if (product.id == 'dummy') {
        throw Exception('Ürün bulunamadı');
      }

      final newStatus = !product.isActive;

      // Firestore'da durumu güncelle
      await _repository.toggleProductStatus(productId, newStatus);

      // Yerel listeyi güncelle
      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        _products[index] = _products[index].copyWith(
          isActive: newStatus,
          updatedAt: DateTime.now(),
        );
        _notifySafely();
      }
    } catch (e) {
      Logger.error('Ürün durumu güncellenirken hata: $e');
      rethrow;
    }
  }

  // Öne çıkan ürün olarak işaretle/kaldır
  Future<void> toggleFeaturedStatus(String productId) async {
    try {
      final product = getProductById(productId);
      if (product.id == 'dummy') {
        throw Exception('Ürün bulunamadı');
      }

      final newStatus = !product.isFeatured;

      // Firestore'da durumu güncelle
      await _repository.toggleFeaturedStatus(productId, newStatus);

      // Yerel listeyi güncelle
      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        _products[index] = _products[index].copyWith(
          isFeatured: newStatus,
          updatedAt: DateTime.now(),
        );
        _updateFeaturedProducts();
        _notifySafely();
      }
    } catch (e) {
      Logger.error('Öne çıkan ürün durumu güncellenirken hata: $e');
      rethrow;
    }
  }

  // Toplu ürün durumu güncelleme
  Future<void> bulkUpdateProductStatus(List<String> productIds, bool isActive) async {
    try {
      _isLoading = true;
      _notifySafely();

      // Repository üzerinden batch işlemini gerçekleştir
      final batch = _repository.batch();

      for (final productId in productIds) {
        await _repository.toggleProductStatus(productId, isActive);
      }

      // Yerel listeyi güncelle
      for (final productId in productIds) {
        final index = _products.indexWhere((p) => p.id == productId);
        if (index >= 0) {
          _products[index] = _products[index].copyWith(
            isActive: isActive,
            updatedAt: DateTime.now(),
          );
        }
      }

      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _notifySafely();
      Logger.error('Toplu ürün durumu güncellenirken hata: $e');
      rethrow;
    }
  }

  // Ürün görseli yükle
  Future<String> uploadProductImage(Uint8List imageBytes, String fileName) async {
    try {
      // Base64'e çevir
      final base64Image = base64Encode(imageBytes);

      // ImgBB'ye yükle
      final uploadResponse = await http.post(
        Uri.parse('https://api.imgbb.com/1/upload'),
        body: {
          'key': ImageService.apiKey,
          'image': base64Image,
          'name': fileName,
        },
      );

      if (uploadResponse.statusCode != 200) {
        throw Exception('Görsel yüklenemedi: ${uploadResponse.statusCode}');
      }

      final result = json.decode(uploadResponse.body);
      return result['data']['display_url'];
    } catch (e) {
      Logger.error('Ürün resmi yüklenirken hata: $e');
      rethrow;
    }
  }

  /// Firebase Storage'a ürün görseli yükler ve indirilebilir URL'yi döndürür.
  ///
  /// [productId] henüz Firestore'a eklenmemiş yeni bir ürün için taslak ID olabilir.
  /// [bytes] yüklenilecek dosya içeriği.
  /// [originalName] isteğe bağlı dosya adı (uzantı çıkarılır, güvenli hale getirilir).
  Future<String> uploadProductImageToStorage(String productId, Uint8List bytes,
      {String? originalName}) async {
    try {
      final storage = FirebaseStorage.instance;
      final safeName = (originalName ?? 'image')
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9._-]'), '_')
          .replaceAll(RegExp(r'_+'), '_');
      final ts = DateTime.now().millisecondsSinceEpoch;
      final path = 'product-images/$productId/${ts}_$safeName.jpg';
      final ref = storage.ref().child(path);
      final uploadTask = ref.putData(
        bytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );
      final snap = await uploadTask;
      final url = await snap.ref.getDownloadURL();
      await AuditLogService.instance.log('product_image_upload', data: {
        'productId': productId,
        'path': path,
        'size': bytes.length,
      });
      return url;
    } catch (e) {
      Logger.error('Firebase Storage ürün görseli yükleme hatası: $e');
      rethrow;
    }
  }

  // Ürün istatistiklerini getir
  Map<String, dynamic> getProductStats() {
    if (_products.isEmpty) {
      return {
        'totalProducts': 0,
        'activeProducts': 0,
        'outOfStockProducts': 0,
        'featuredProducts': 0,
        'totalCategories': 0,
        'topSellingProducts': [],
      };
    }

    // Aktif ürün sayısı
    final activeProducts = _products.where((p) => p.isActive).length;

    // Stokta olmayan ürün sayısı
    final outOfStockProducts = _products.where((p) => p.stock <= 0).length;

    // Öne çıkan ürün sayısı
    final featuredProducts = _products.where((p) => p.isFeatured).length;

    // Kategori sayısı
    final totalCategories = _categories.length;

    // En çok satan ürünler (ilk 5)
    final topSellingProducts = List<Product>.from(_products)
      ..sort((a, b) => b.sales.compareTo(a.sales));

    if (topSellingProducts.length > 5) {
      topSellingProducts.removeRange(5, topSellingProducts.length);
    }

    return {
      'totalProducts': _products.length,
      'activeProducts': activeProducts,
      'outOfStockProducts': outOfStockProducts,
      'featuredProducts': featuredProducts,
      'totalCategories': totalCategories,
      'topSellingProducts': topSellingProducts,
    };
  }

  // Kategori bazlı ürün sayılarını getir
  Map<String, int> getCategoryProductCounts() {
    final counts = <String, int>{};

    for (final category in _categories) {
      final count = _products.where((p) => p.category == category).length;
      counts[category] = count;
    }

    return counts;
  }

  // Kategori bazlı ürünleri al
  Future<List<Product>> fetchProductsByCategory(String category) async {
    try {
      _isLoading = true;
      _notifySafely();

      if (category == 'Tümü') {
        await getProducts();
        return _products;
      }

      final result = await _repository.fetchProductsByCategory(category);

      final List<Product> categoryProducts =
          result.map((data) => Product.fromJson({...data, 'id': data['id'] ?? ''})).toList();

      _isLoading = false;
      _notifySafely();
      return categoryProducts;
    } catch (e) {
      Logger.error('Kategori ürünlerini alma hatası: $e');
      _isLoading = false;
      _notifySafely();
      rethrow;
    }
  }

  // En çok satılan ürünleri al
  Future<List<Product>> getTopSellingProducts({int limit = 5}) async {
    try {
      final result = await _repository.getTopSellingProducts(limit: limit);
      return result.map((data) => Product.fromJson({...data, 'id': data['id'] ?? ''})).toList();
    } catch (e) {
      Logger.error('En çok satılan ürünleri alma hatası: $e');
      rethrow;
    }
  }

  // Kullanıcının favori ürünlerini getir
  Future<List<Product>> getFavoriteProducts(String userId) async {
    try {
      _isLoading = true;
      _notifySafely();

      // Repository üzerinden favori ürünleri al
      final result = await _repository.getFavoriteProducts(userId);

      final products = result
          .map((data) => Product.fromJson({
                ...data,
                'id': data['id'] ?? '',
                'createdAt': (data['createdAt'] as Timestamp).toDate(),
                'updatedAt': (data['updatedAt'] as Timestamp).toDate(),
              }))
          .toList();

      _favoriteProducts = products;
      _isLoading = false;
      _notifySafely();

      return products;
    } catch (e) {
      _isLoading = false;
      _notifySafely();
      Logger.error('Favori ürünleri getirirken hata: $e');
      return [];
    }
  }

  // Ürün satış sayısını artır
  Future<void> incrementSales(String productId, [int quantity = 1]) async {
    try {
      await _repository.incrementSales(productId, quantity);

      // Yerel listeyi güncelle
      final index = _products.indexWhere((p) => p.id == productId);
      if (index >= 0) {
        final currentSales = _products[index].sales;
        _products[index] = _products[index].copyWith(
          sales: currentSales + quantity,
        );
        _notifySafely();
      }
    } catch (e) {
      Logger.error('Satış sayısı güncelleme hatası: $e');
      rethrow;
    }
  }

  // Tüm kategorileri getir
  List<String> getCategories() {
    final categories = _products.map((product) => product.category).toSet().toList();
    categories.sort();
    return ['Tümü', ...categories];
  }

  // ID'lere göre ürünleri getir
  Future<List<Product>> getProductsByIds(List<String> productIds) async {
    if (productIds.isEmpty) {
      return [];
    }

    try {
      _isLoading = true;
      _notifySafely();

      final result = await _repository.getProductsByIds(productIds);

      final products =
          result.map((data) => Product.fromJson({...data, 'id': data['id'] ?? ''})).toList();

      _isLoading = false;
      _notifySafely();
      return products;
    } catch (e) {
      Logger.error('Ürünleri ID\'ye göre getirirken hata: $e');
      _isLoading = false;
      _notifySafely();
      return [];
    }
  }

  // Örnek ürünleri ekle (geliştirme için)
  Future<void> addSampleProducts() async {
    try {
      final sampleProducts = [
        {
          'name': 'Ekşi Mayalı Köy Ekmeği',
          'description':
              'Geleneksel yöntemlerle hazırlanan, ekşi maya kullanılarak 24 saat fermente edilen köy ekmeği.',
          'price': 30.00,
          'category': 'Ekmekler',
          'imageUrl': 'https://i.ibb.co/wQhM0Lx/eksi-mayali.jpg',
          'stock': 20,
          'ingredients': ['Un', 'Su', 'Tuz', 'Ekşi Maya'],
          'isPopular': true,
          'isNew': false,
        },
        {
          'name': 'Çavdarlı Tam Buğday Ekmeği',
          'description':
              'Tam buğday unu ve çavdar unu karışımı ile hazırlanan sağlıklı ve lezzetli ekmek.',
          'price': 35.00,
          'category': 'Ekmekler',
          'imageUrl': 'https://i.ibb.co/Jc1kPp9/cavdar.jpg',
          'stock': 15,
          'ingredients': ['Tam Buğday Unu', 'Çavdar Unu', 'Su', 'Tuz', 'Maya'],
          'isPopular': false,
          'isNew': true,
        },
        {
          'name': 'Cevizli Kurabiye',
          'description': 'Tereyağlı hamura ceviz eklenmiş geleneksel kurabiye.',
          'price': 8.00,
          'category': 'Kurabiyeler',
          'imageUrl': 'https://i.ibb.co/Lx2QLZN/kurabiye.jpg',
          'stock': 30,
          'ingredients': ['Un', 'Tereyağı', 'Şeker', 'Ceviz'],
          'isPopular': true,
          'isNew': false,
        },
        {
          'name': 'Ev Yapımı Limonata',
          'description':
              'Taze sıkılmış limon suyu, şeker ve nane ile hazırlanan serinletici içecek.',
          'price': 15.00,
          'category': 'İçecekler',
          'imageUrl': 'https://i.ibb.co/C7Q8Yvx/limonata.jpg',
          'stock': 10,
          'ingredients': ['Limon', 'Su', 'Şeker', 'Nane'],
          'isPopular': true,
          'isNew': false,
        },
        {
          'name': 'Filtre Kahve',
          'description': 'Özenle kavrulmuş özel çekirdeklerden hazırlanan filtre kahve.',
          'price': 20.00,
          'category': 'İçecekler',
          'imageUrl': 'https://i.ibb.co/Kj8RYZs/kahve.jpg',
          'stock': 25,
          'ingredients': ['Kahve Çekirdeği'],
          'isPopular': false,
          'isNew': true,
        },
        {
          'name': 'Pastırma',
          'description': 'Özel baharatlarla marine edilmiş ve kurutulmuş dana eti dilimleri.',
          'price': 50.00,
          'category': 'Şarküteri',
          'imageUrl': 'https://i.ibb.co/Qj0YXLZ/sucuk.jpg',
          'stock': 5,
          'ingredients': ['Dana Eti', 'Çemen', 'Baharat'],
          'isPopular': true,
          'isNew': false,
        },
        {
          'name': 'Sucuk',
          'description': 'Geleneksel yöntemlerle hazırlanan, baharatlı fermente sucuk.',
          'price': 45.00,
          'category': 'Şarküteri',
          'imageUrl': 'https://i.ibb.co/Qj0YXLZ/sucuk.jpg',
          'stock': 8,
          'ingredients': ['Dana Eti', 'Baharat', 'Tuz', 'Sarımsak'],
          'isPopular': false,
          'isNew': false,
        },
        {
          'name': 'Çikolatalı Pasta',
          'description': 'Özel belçika çikolatası ile hazırlanmış, kremalı pasta.',
          'price': 60.00,
          'category': 'Pastalar',
          'imageUrl': 'https://i.ibb.co/9vBFXz4/pasta.jpg',
          'stock': 3,
          'ingredients': ['Un', 'Çikolata', 'Şeker', 'Tereyağı', 'Yumurta', 'Krema'],
          'isPopular': true,
          'isNew': true,
        },
        {
          'name': 'Zeytinli Poğaça',
          'description': 'Yeşil zeytin ile hazırlanmış, yumuşak hamurlu poğaça.',
          'price': 10.00,
          'category': 'Poğaçalar',
          'imageUrl': 'https://i.ibb.co/Qc9DxXy/pogaca.jpg',
          'stock': 20,
          'ingredients': ['Un', 'Tereyağı', 'Su', 'Tuz', 'Maya', 'Yeşil Zeytin'],
          'isPopular': false,
          'isNew': false,
        },
        {
          'name': 'Fırında Sütlaç',
          'description': 'Geleneksel tarif ile hazırlanmış, fırında kızartılmış sütlaç.',
          'price': 25.00,
          'category': 'Tatlılar',
          'imageUrl': 'https://i.ibb.co/9vBFXz4/sutlac.jpg',
          'stock': 12,
          'ingredients': ['Pirinç', 'Süt', 'Şeker', 'Vanilya'],
          'isPopular': true,
          'isNew': false,
        },
      ];

      // Önce tüm ürünleri sil
      await removeAllProducts();

      // Yeni ürünleri ekle
      for (var productData in sampleProducts) {
        await _firestore.collection(_collection).add({
          ...productData,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      Logger.error('Örnek ürünler eklendi.');
    } catch (e) {
      Logger.error('Örnek ürünler eklenirken hata oluştu: $e');
      rethrow;
    }
  }

  // Kategorilerin var olduğundan emin ol
  Future<void> _ensureCategories(List<String> categories) async {
    // Her kategori için Firestore kontrolü yap
    for (String category in categories) {
      final snapshot = await _firestore
          .collection(_categoriesCollection)
          .where('name', isEqualTo: category)
          .get();

      // Kategori yoksa ekle
      if (snapshot.docs.isEmpty) {
        await _firestore.collection(_categoriesCollection).add({
          'name': category,
          'productCount': 0,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        Logger.info('Kategori eklendi: $category');
      }
    }
  }

  // Tüm ürünleri kaldır
  Future<void> removeAllProducts() async {
    if (!_connectionService.isOnline) {
      throw Exception(
          'Çevrimdışı modda ürünler silinemez. Lütfen internet bağlantınızı kontrol edin.');
    }

    try {
      _isLoading = true;
      _notifySafely();

      // Firestore'dan tüm ürünleri al
      final snapshot = await _firestore.collection(_collection).get();

      // Her ürün için silme işlemi yap
      for (var doc in snapshot.docs) {
        await _firestore.collection(_collection).doc(doc.id).delete();
      }

      // Listeleri temizle
      _products = [];
      _featuredProducts = [];
      _popularProducts = [];
      _newProducts = [];
      _categoryProducts = {};

      // Kategorilerin ürün sayısını güncelle
      await _updateCategoryProductCounts();

      // Önbelleği güncelle
      await _cacheProducts();

      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _error = 'Ürünler silinirken bir hata oluştu: $e';
      Logger.error(_error!);
      _notifySafely();
      throw Exception(_error);
    }
  }

  // Kategorilerin ürün sayılarını sıfırla
  Future<void> _updateCategoryProductCounts() async {
    try {
      final categoriesSnapshot = await _firestore.collection(_categoriesCollection).get();

      for (var doc in categoriesSnapshot.docs) {
        await _firestore.collection(_categoriesCollection).doc(doc.id).update({
          'productCount': 0,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      Logger.error('Kategori ürün sayıları güncellenirken hata: $e');
    }
  }

  // Kategorileri getir
  Future<List<Map<String, dynamic>>> fetchCategories() async {
    try {
      _isLoading = true;
      _notifySafely();

      final QuerySnapshot snapshot = await _firestore.collection(_categoriesCollection).get();

      List<Map<String, dynamic>> categories = snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'id': doc.id,
          'name': data['name'] ?? '',
          'description': data['description'] ?? '',
          'imageUrl': data['imageUrl'] ?? '',
          'isActive': data['isActive'] ?? true,
          'createdAt': (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
          'updatedAt': (data['updatedAt'] as Timestamp?)?.toDate(),
          'productCount': data['productCount'] ?? 0,
          'slug': data['slug'] ?? '',
          'order': data['order'] ?? 0,
          'iconName': data['iconName'] ?? '',
        };
      }).toList();

      categories.sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));

      _isLoading = false;
      _notifySafely();
      return categories;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _notifySafely();
      Logger.error('Kategoriler yüklenirken hata: $e');
      return [];
    }
  }

  // Kategori ekle
  Future<Map<String, dynamic>> addCategory(Map<String, dynamic> categoryData) async {
    try {
      _isLoading = true;
      _notifySafely();

      // Kategori adının benzersiz olduğunu kontrol et
      final existingCategories = await fetchCategories();
      final nameExists = existingCategories.any((cat) => cat['name'] == categoryData['name']);

      if (nameExists) {
        throw Exception('Bu kategori adı zaten mevcut');
      }

      final slug = generateSlug(categoryData['name']);
      final now = DateTime.now();
      final int orderValue =
          categoryData['order'] is int ? categoryData['order'] : (existingCategories.length + 1);

      final docRef = await _firestore.collection(_categoriesCollection).add({
        'name': categoryData['name'] ?? '',
        'description': categoryData['description'] ?? '',
        'imageUrl': categoryData['imageUrl'] ?? '',
        'isActive': categoryData['isActive'] ?? true,
        'createdAt': now,
        'updatedAt': now,
        'productCount': 0,
        'slug': slug,
        'order': orderValue,
        'iconName': categoryData['iconName'] ?? '',
      });

      final newCategory = {
        'id': docRef.id,
        'name': categoryData['name'],
        'description': categoryData['description'],
        'imageUrl': categoryData['imageUrl'],
        'isActive': categoryData['isActive'] ?? true,
        'createdAt': now,
        'updatedAt': now,
        'productCount': 0,
        'slug': slug,
        'order': orderValue,
        'iconName': categoryData['iconName'] ?? '',
      };

      _isLoading = false;
      _notifySafely();

      // Kategorileri yeniden yükle
      fetchCategories();

      // Audit log
      await AuditLogService.instance.log('category_create', data: {
        'id': docRef.id,
        'name': categoryData['name'],
        'iconName': categoryData['iconName'] ?? '',
      });

      return {
        'success': true,
        'data': newCategory,
        'message': 'Kategori başarıyla eklendi',
      };
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _notifySafely();
      Logger.error('Kategori eklenirken hata: $e');
      return {
        'success': false,
        'message': 'Kategori eklenirken hata oluştu: ${e.toString()}',
      };
    }
  }

  // Kategori güncelle
  Future<Map<String, dynamic>> updateCategory(
      String categoryId, Map<String, dynamic> categoryData) async {
    try {
      _isLoading = true;
      _notifySafely();

      // Kategori adının benzersiz olduğunu kontrol et (kendi ID'si hariç)
      final existingCategories = await fetchCategories();
      final nameExists = existingCategories
          .any((cat) => cat['name'] == categoryData['name'] && cat['id'] != categoryId);

      if (nameExists) {
        throw Exception('Bu kategori adı zaten mevcut');
      }

      final now = DateTime.now();
      final slug = categoryData['slug'] ?? generateSlug(categoryData['name']);
      final int orderValue = categoryData['order'] is int ? categoryData['order'] : 0;

      await _firestore.collection(_categoriesCollection).doc(categoryId).update({
        'name': categoryData['name'],
        'description': categoryData['description'],
        'imageUrl': categoryData['imageUrl'],
        'isActive': categoryData['isActive'],
        'updatedAt': now,
        'slug': slug,
        'order': orderValue,
        'iconName': categoryData['iconName'] ?? '',
      });

      // Eğer kategori adı değişmişse, o kategoriye ait tüm ürünleri güncelle
      if (categoryData['oldName'] != null && categoryData['oldName'] != categoryData['name']) {
        await _updateProductCategories(categoryData['oldName'], categoryData['name']);
      }

      _isLoading = false;
      _notifySafely();

      // Kategorileri yeniden yükle
      fetchCategories();

      await AuditLogService.instance.log('category_update', data: {
        'id': categoryId,
        'name': categoryData['name'],
        'iconName': categoryData['iconName'] ?? '',
      });

      return {
        'success': true,
        'message': 'Kategori başarıyla güncellendi',
      };
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _notifySafely();
      Logger.error('Kategori güncellenirken hata: $e');
      return {
        'success': false,
        'message': 'Kategori güncellenirken hata oluştu: ${e.toString()}',
      };
    }
  }

  // Kategorileri yeniden sırala (verilen listedeki sıraya göre order güncelle)
  Future<void> reorderCategories(List<String> orderedCategoryIds) async {
    try {
      final batch = _firestore.batch();
      for (int i = 0; i < orderedCategoryIds.length; i++) {
        final id = orderedCategoryIds[i];
        final ref = _firestore.collection(_categoriesCollection).doc(id);
        batch.update(ref, {
          'order': i + 1,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      await AuditLogService.instance.log('category_reorder', data: {
        'orderedIds': orderedCategoryIds,
      });
    } catch (e) {
      Logger.error('Kategori reorder hata: $e');
      rethrow;
    }
  }

  // Kategori sil
  Future<Map<String, dynamic>> deleteCategory(String categoryId, String categoryName) async {
    try {
      _isLoading = true;
      _notifySafely();

      // Kategoriye ait ürün var mı kontrol et
      final productsInCategory =
          await _firestore.collection(_collection).where('category', isEqualTo: categoryName).get();

      if (productsInCategory.docs.isNotEmpty) {
        return {
          'success': false,
          'message':
              'Bu kategoriye ait ${productsInCategory.docs.length} ürün bulunmaktadır. Önce bu ürünleri başka bir kategoriye taşıyın veya silin.',
        };
      }

      await _firestore.collection(_categoriesCollection).doc(categoryId).delete();

      _isLoading = false;
      _notifySafely();

      // Kategorileri yeniden yükle
      fetchCategories();

      await AuditLogService.instance.log('category_delete', data: {
        'id': categoryId,
        'name': categoryName,
      });

      return {
        'success': true,
        'message': 'Kategori başarıyla silindi',
      };
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      _notifySafely();
      Logger.error('Kategori silinirken hata: $e');
      return {
        'success': false,
        'message': 'Kategori silinirken hata oluştu: ${e.toString()}',
      };
    }
  }

  // Kategori detayını getir
  Future<Map<String, dynamic>> getCategoryById(String categoryId) async {
    try {
      final docSnap = await _firestore.collection(_categoriesCollection).doc(categoryId).get();

      if (!docSnap.exists) {
        return {
          'success': false,
          'message': 'Kategori bulunamadı',
        };
      }

      final data = docSnap.data() as Map<String, dynamic>;

      return {
        'success': true,
        'data': {
          'id': docSnap.id,
          'name': data['name'] ?? '',
          'description': data['description'] ?? '',
          'imageUrl': data['imageUrl'] ?? '',
          'isActive': data['isActive'] ?? true,
          'createdAt': (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
          'updatedAt': (data['updatedAt'] as Timestamp?)?.toDate(),
          'productCount': data['productCount'] ?? 0,
          'slug': data['slug'] ?? '',
          'order': data['order'] ?? 0,
          'iconName': data['iconName'] ?? '',
        },
      };
    } catch (e) {
      Logger.error('Kategori detayı alınırken hata: $e');
      return {
        'success': false,
        'message': 'Kategori detayı alınırken hata oluştu: ${e.toString()}',
      };
    }
  }

  // Ürünlerin kategorilerini toplu güncelle
  Future<void> _updateProductCategories(String oldCategory, String newCategory) async {
    try {
      final batch = _firestore.batch();
      final productsToUpdate =
          await _firestore.collection(_collection).where('category', isEqualTo: oldCategory).get();

      for (var doc in productsToUpdate.docs) {
        batch.update(doc.reference, {'category': newCategory});
      }

      await batch.commit();
      Logger.info(
          '${productsToUpdate.docs.length} ürünün kategorisi güncellendi: $oldCategory -> $newCategory');
    } catch (e) {
      Logger.error('Ürün kategorileri güncellenirken hata: $e');
      rethrow;
    }
  }

  // Kategori slug'ı oluştur
  String generateSlug(String name) {
    return name
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-');
  }

  // Kategori filtreleme
  List<Product> filterByCategory(List<Product> products, String category) {
    // Tümü kategorisi veya kategori seçilmemişse tüm ürünleri göster
    if (category.isEmpty) {
      return products;
    }
    // Diğer kategoriler için eşleşenleri filtrele
    return products.where((product) => product.category == category).toList();
  }
}
