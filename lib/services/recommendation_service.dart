import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../models/product.dart';
import '../models/user.dart';
import '../utils/logger.dart';
import 'product_service.dart';

/// Kişiselleştirilmiş ürün önerileri sunan servis
class RecommendationService with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ProductService _productService;

  List<Product> _recommendedProducts = [];
  List<Product> _similarProducts = [];
  List<Product> _recentlyViewedProducts = [];
  bool _isLoading = false;

  RecommendationService(this._productService);

  List<Product> get recommendedProducts => _recommendedProducts;
  List<Product> get similarProducts => _similarProducts;
  List<Product> get recentlyViewedProducts => _recentlyViewedProducts;
  bool get isLoading => _isLoading;

  /// Popüler ürünleri getir
  Future<List<Product>> getPopularProducts() async {
    try {
      setLoading(true);

      // En çok satılan ürünleri getir
      final products = await _productService.getTopSellingProducts(limit: 10);

      setLoading(false);
      return products;
    } catch (e) {
      Logger.error('Popüler ürünler getirilirken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Loading durumunu güvenli şekilde güncelle
  void setLoading(bool value) {
    if (_isLoading == value) return;
    _isLoading = value;

    // notifyListeners'ı UI thread'e taşıyoruz
    if (kIsWeb) {
      Future.microtask(() => notifyListeners());
    } else {
      notifyListeners();
    }
  }

  /// Kullanıcı için kişiselleştirilmiş ürün önerileri oluştur
  Future<List<Product>> getPersonalizedRecommendations(User user) async {
    try {
      setLoading(true);

      // Kullanıcının tercihlerine göre ürünleri filtrele
      final allProducts = await _productService.getProducts();

      // Kullanıcının favori kategorileri
      final favoriteCategories = user.preferences.favoriteCategories;

      // Kullanıcının diyet tercihleri
      final dietaryPreferences = user.preferences.dietaryPreferences;

      // Kullanıcının alerji bilgileri
      final allergyInfo = user.preferences.allergyInformation;

      // Filtreleme kriterleri
      final preferLocalProducts = user.preferences.preferLocalProducts;
      final preferOrganicProducts = user.preferences.preferOrganicProducts;

      // Puanlama sistemi ile ürünleri sırala
      final scoredProducts = allProducts.map((product) {
        int score = 0;

        // Favori kategorilerde ise puan ekle
        if (favoriteCategories.contains(product.category)) {
          score += 5;
        }

        // Kullanıcının diyet tercihlerine uygunsa puan ekle
        if (_matchesDietaryPreferences(product, dietaryPreferences)) {
          score += 3;
        }

        // Kullanıcının alerjileri ile çakışmıyorsa puan ekle
        if (!_hasAllergens(product, allergyInfo)) {
          score += 2;
        }

        // Yerel ürün tercihi
        if (preferLocalProducts && product.isLocal) {
          score += 2;
        }

        // Organik ürün tercihi
        if (preferOrganicProducts && product.isOrganic) {
          score += 2;
        }

        // Popüler ürünlere bonus puan
        score += (product.sales / 10).round();

        // İndirimli ürünlere bonus puan
        if (product.discountPercentage > 0) {
          score += 1;
        }

        return MapEntry(product, score);
      }).toList();

      // Puanlara göre sırala
      scoredProducts.sort((a, b) => b.value.compareTo(a.value));

      // En yüksek puanlı ürünleri al
      final recommendations = scoredProducts.take(10).map((entry) => entry.key).toList();

      _recommendedProducts = recommendations;
      setLoading(false);
      return recommendations;
    } catch (e) {
      Logger.error('Kişiselleştirilmiş öneriler oluşturulurken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Belirli bir ürüne benzer ürünleri getir
  Future<List<Product>> getSimilarProducts(Product product) async {
    try {
      setLoading(true);

      // Aynı kategorideki ürünleri al
      final allProducts = await _productService.getProducts();
      final categoryProducts =
          allProducts.where((p) => p.category == product.category && p.id != product.id).toList();

      // Benzerlik puanı hesapla
      final scoredProducts = categoryProducts.map((p) {
        int score = 0;

        // Fiyat benzerliği
        final priceDiff = (p.price - product.price).abs();
        if (priceDiff < 50) {
          score += 3;
        } else if (priceDiff < 100) {
          score += 2;
        } else if (priceDiff < 200) {
          score += 1;
        }

        // Aynı markadan ise
        if (p.brand == product.brand) {
          score += 5;
        }

        // Benzer özellikler
        if (p.isOrganic == product.isOrganic) {
          score += 2;
        }
        if (p.isLocal == product.isLocal) {
          score += 2;
        }

        return MapEntry(p, score);
      }).toList();

      // Puanlara göre sırala
      scoredProducts.sort((a, b) => b.value.compareTo(a.value));

      // En benzer ürünleri al
      final similarProducts = scoredProducts.take(5).map((entry) => entry.key).toList();

      _similarProducts = similarProducts;
      setLoading(false);
      return similarProducts;
    } catch (e) {
      Logger.error('Benzer ürünler getirilirken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Bir ürünün kullanıcının diyet tercihlerine uygun olup olmadığını kontrol eder
  bool _matchesDietaryPreferences(Product product, List<String> dietaryPreferences) {
    if (dietaryPreferences.isEmpty) return true;

    // Ürün etiketlerini kontrol et
    final productTags = product.tags ?? [];

    for (final preference in dietaryPreferences) {
      final lowerPreference = preference.toLowerCase();

      // Diyet tercihlerini kontrol et
      if (!productTags.contains(lowerPreference)) {
        return false;
      }
    }

    return true;
  }

  /// Bir ürünün kullanıcının alerjisi olan içerikleri içerip içermediğini kontrol eder
  bool _hasAllergens(Product product, List<String> allergyInfo) {
    if (allergyInfo.isEmpty) return false;

    for (final allergy in allergyInfo) {
      final lowerAllergy = allergy.toLowerCase();
      if (product.allergens.any((allergen) => allergen.toLowerCase() == lowerAllergy)) {
        return true;
      }
    }

    return false;
  }

  /// Son görüntülenen ürünleri getir
  Future<List<Product>> getRecentlyViewedProducts(User user) async {
    try {
      setLoading(true);

      // Son görüntülenen ürünleri getir (örnek olarak popüler ürünleri döndürüyoruz)
      final products = await getPopularProducts();

      setLoading(false);
      return products;
    } catch (e) {
      Logger.error('Son görüntülenen ürünler getirilirken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Yeni ürünleri getir
  Future<List<Product>> getNewProducts() async {
    try {
      setLoading(true);

      // En yeni ürünleri getir (şimdilik örnek olarak popüler ürünleri döndürüyoruz)
      final products = await getPopularProducts();

      setLoading(false);
      return products;
    } catch (e) {
      Logger.error('Yeni ürünler getirilirken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// İndirimli ürünleri getir
  Future<List<Product>> getDiscountedProducts() async {
    try {
      setLoading(true);

      // İndirimli ürünleri getir (şimdilik örnek olarak popüler ürünleri döndürüyoruz)
      final products = await getPopularProducts();

      setLoading(false);
      return products;
    } catch (e) {
      Logger.error('İndirimli ürünler getirilirken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Satın alma geçmişine göre öneriler oluştur
  Future<List<Product>> getRecommendationsBasedOnPurchaseHistory(String userId) async {
    try {
      setLoading(true);

      // Satın alma geçmişine göre öneriler oluştur (şimdilik örnek olarak popüler ürünleri döndürüyoruz)
      final products = await getPopularProducts();

      setLoading(false);
      return products;
    } catch (e) {
      Logger.error('Satın alma geçmişine göre öneriler oluşturulurken hata: $e');
      setLoading(false);
      return [];
    }
  }

  /// Ürün görüntüleme kaydı
  Future<void> recordProductView(User user, String productId) async {
    try {
      await _firestore
          .collection('users')
          .doc(user.id)
          .collection('viewedProducts')
          .doc(productId)
          .set({
        'viewedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      Logger.error('Ürün görüntüleme kaydedilirken hata: $e');
    }
  }
}
