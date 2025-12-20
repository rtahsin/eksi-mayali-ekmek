// ignore_for_file: unused_field, unused_element, unused_local_variable

import '../utils/logger.dart';

import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/order.dart' as app_order;
import '../models/product.dart';
import '../models/user.dart';
import 'product_service.dart';
import 'recommendation_service.dart';

/// Yapay zeka destekli alışveriş asistanı ve otomatik sipariş önerileri sunan servis
class AIService with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ProductService _productService;
  final RecommendationService _recommendationService;

  bool _isLoading = false;
  List<Map<String, dynamic>> _shoppingAssistantSuggestions = [];
  List<Map<String, dynamic>> _autoOrderSuggestions = [];
  List<String> _recentSearchQueries = [];
  Map<String, dynamic> _userInsights = {};
  String? _error;

  AIService(this._productService, this._recommendationService);

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get shoppingAssistantSuggestions =>
      _shoppingAssistantSuggestions;
  List<Map<String, dynamic>> get autoOrderSuggestions => _autoOrderSuggestions;
  List<String> get recentSearchQueries => _recentSearchQueries;
  Map<String, dynamic> get userInsights => _userInsights;
  String? get error => _error;

  /// Kullanıcı için alışveriş asistanı önerilerini yükle
  Future<void> loadShoppingAssistantSuggestions(User user) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Kullanıcının tercihlerine göre öneriler oluştur
      final preferences = user.preferences;
      final favoriteCategories = preferences.favoriteCategories;
      final dietaryPreferences = preferences.dietaryPreferences;
      final allergyInfo = preferences.allergyInformation;

      // Kullanıcının son siparişlerini al
      final orderSnapshot = await _firestore
          .collection('siparisler')
          .where('userId', isEqualTo: user.id)
          .orderBy('dateTime', descending: true)
          .limit(5)
          .get();

      // Son sipariş edilen ürünleri topla
      final recentlyOrderedProductIds = <String>{};
      for (final doc in orderSnapshot.docs) {
        final data = doc.data();
        final order = app_order.Order.fromJson(data);

        for (final item in order.items) {
          recentlyOrderedProductIds.add(item.productId);
        }
      }

      // Kullanıcının son görüntülediği ürünleri al
      final recentlyViewedProductIds = user.recentlyViewedProductIds;

      // Tüm ürünleri al
      final allProducts = await _productService.getProducts();

      // Önerileri oluştur
      List<Map<String, dynamic>> suggestions = [];

      // 1. Tamamlayıcı ürün önerisi
      if (recentlyOrderedProductIds.isNotEmpty) {
        final orderedProducts = await _productService
            .getProductsByIds(recentlyOrderedProductIds.toList());

        for (final product in orderedProducts) {
          // Tamamlayıcı ürünleri bul (aynı kategoride veya ilişkili kategorilerde)
          final complementaryProducts = allProducts
              .where((p) =>
                  p.id != product.id &&
                  (p.category == product.category ||
                      _isComplementaryCategory(product.category, p.category)) &&
                  !recentlyOrderedProductIds.contains(p.id))
              .toList();

          if (complementaryProducts.isNotEmpty) {
            // En uygun tamamlayıcı ürünü seç
            complementaryProducts.sort((a, b) => b.sales.compareTo(a.sales));
            final complementaryProduct = complementaryProducts.first;

            suggestions.add({
              'type': 'complementary',
              'title': 'Bununla Birlikte Harika',
              'description':
                  '${product.name} ile ${complementaryProduct.name} birlikte harika bir kombinasyon oluşturur.',
              'mainProduct': product,
              'suggestedProduct': complementaryProduct,
              'priority': 'high',
            });

            // Her ürün için en fazla bir öneri ekle
            if (suggestions.length >= 3) break;
          }
        }
      }

      // 2. Tekrar sipariş önerisi
      if (recentlyOrderedProductIds.isNotEmpty) {
        final orderedProducts = await _productService
            .getProductsByIds(recentlyOrderedProductIds.toList());

        // En çok sipariş edilen ürünü bul
        final mostOrderedProduct = orderedProducts.first;

        suggestions.add({
          'type': 'reorder',
          'title': 'Tekrar Sipariş Etmek İster misiniz?',
          'description':
              '${mostOrderedProduct.name} ürününü tekrar sipariş etmek ister misiniz?',
          'product': mostOrderedProduct,
          'priority': 'medium',
        });
      }

      // 3. Mevsimsel ürün önerisi
      final currentMonth = DateTime.now().month;
      String season;

      if (currentMonth >= 3 && currentMonth <= 5) {
        season = 'İlkbahar';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        season = 'Yaz';
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        season = 'Sonbahar';
      } else {
        season = 'Kış';
      }

      // Mevsime uygun ürünleri filtrele
      final seasonalProducts = allProducts
          .where((p) =>
              p.tags.contains(season.toLowerCase()) ||
              _isSeasonalProduct(p, season))
          .toList();

      if (seasonalProducts.isNotEmpty) {
        // Kullanıcının tercihlerine en uygun mevsimsel ürünü seç
        seasonalProducts.sort((a, b) {
          int scoreA = _calculatePreferenceScore(
              a, favoriteCategories, dietaryPreferences, allergyInfo);
          int scoreB = _calculatePreferenceScore(
              b, favoriteCategories, dietaryPreferences, allergyInfo);
          return scoreB.compareTo(scoreA);
        });

        final seasonalProduct = seasonalProducts.first;

        suggestions.add({
          'type': 'seasonal',
          'title': '$season Mevsimi Önerisi',
          'description':
              '${seasonalProduct.name} şu anda tam mevsiminde ve taze!',
          'product': seasonalProduct,
          'priority': 'medium',
        });
      }

      // 4. Diyet tercihlerine göre özel öneri
      if (dietaryPreferences.isNotEmpty) {
        final dietaryPref = dietaryPreferences.first;

        // Diyet tercihine uygun ürünleri filtrele
        final dietaryProducts = allProducts
            .where((p) => p.tags.contains(dietaryPref.toLowerCase()))
            .toList();

        if (dietaryProducts.isNotEmpty) {
          // En popüler diyet ürününü seç
          dietaryProducts.sort((a, b) => b.sales.compareTo(a.sales));
          final dietaryProduct = dietaryProducts.first;

          suggestions.add({
            'type': 'dietary',
            'title': '$dietaryPref Tercihinize Uygun',
            'description':
                '${dietaryProduct.name} $dietaryPref beslenme tercihinize uygun bir ürün.',
            'product': dietaryProduct,
            'priority': 'high',
          });
        }
      }

      // Önerileri önceliğe göre sırala
      suggestions.sort((a, b) {
        final priorityOrder = {'high': 0, 'medium': 1, 'low': 2};
        return priorityOrder[a['priority']]!
            .compareTo(priorityOrder[b['priority']]!);
      });

      _shoppingAssistantSuggestions = suggestions;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      Logger.error('Alışveriş asistanı önerileri yüklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Kullanıcı için otomatik sipariş önerilerini yükle
  Future<void> loadAutoOrderSuggestions(User user) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Kullanıcının sipariş geçmişini al
      final orderSnapshot = await _firestore
          .collection('siparisler')
          .where('userId', isEqualTo: user.id)
          .orderBy('dateTime', descending: true)
          .get();

      // Sipariş yoksa boş liste döndür
      if (orderSnapshot.docs.isEmpty) {
        _autoOrderSuggestions = [];
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Ürünlerin sipariş sıklığını hesapla
      Map<String, List<DateTime>> productOrderDates = {};

      for (final doc in orderSnapshot.docs) {
        final data = doc.data();
        final order = app_order.Order.fromJson(data);

        for (final item in order.items) {
          if (!productOrderDates.containsKey(item.productId)) {
            productOrderDates[item.productId] = [];
          }
          productOrderDates[item.productId]!.add(order.dateTime);
        }
      }

      // Düzenli sipariş edilen ürünleri belirle
      List<Map<String, dynamic>> regularOrders = [];

      for (final entry in productOrderDates.entries) {
        final productId = entry.key;
        final orderDates = entry.value;

        // En az 2 kez sipariş edilmiş ürünleri kontrol et
        if (orderDates.length >= 2) {
          // Sipariş tarihleri arasındaki ortalama süreyi hesapla
          int totalDays = 0;
          for (int i = 0; i < orderDates.length - 1; i++) {
            totalDays += orderDates[i].difference(orderDates[i + 1]).inDays;
          }
          final averageDays = totalDays / (orderDates.length - 1);

          // Son sipariş tarihinden bu yana geçen gün sayısı
          final daysSinceLastOrder =
              DateTime.now().difference(orderDates.first).inDays;

          // Yeniden sipariş zamanı yaklaştıysa öneri oluştur
          if (daysSinceLastOrder >= (averageDays * 0.8)) {
            final product = _productService.getProductById(productId);

            if (product.id != 'dummy') {
              final daysUntilNextOrder =
                  (averageDays - daysSinceLastOrder).round();

              regularOrders.add({
                'product': product,
                'averageOrderInterval': averageDays.round(),
                'daysSinceLastOrder': daysSinceLastOrder,
                'daysUntilNextOrder':
                    daysUntilNextOrder > 0 ? daysUntilNextOrder : 0,
                'isRecommendedNow': daysUntilNextOrder <= 0,
              });
            }
          }
        }
      }

      // Önerileri sırala (önce sipariş zamanı gelenler)
      regularOrders.sort(
          (a, b) => a['daysUntilNextOrder'].compareTo(b['daysUntilNextOrder']));

      _autoOrderSuggestions = regularOrders;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      Logger.error('Otomatik sipariş önerileri yüklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Kullanıcının arama sorgularını kaydet ve analiz et
  Future<void> saveSearchQuery(String userId, String query) async {
    try {
      if (query.trim().isEmpty) return;

      // Arama sorgusunu Firestore'a kaydet
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('aramalar')
          .add({
        'query': query,
        'timestamp': DateTime.now().toIso8601String(),
      });

      // Yerel listeyi güncelle
      if (!_recentSearchQueries.contains(query)) {
        _recentSearchQueries.insert(0, query);

        // Listeyi en fazla 10 sorgu ile sınırla
        if (_recentSearchQueries.length > 10) {
          _recentSearchQueries.removeLast();
        }

        notifyListeners();
      }
    } catch (e) {
      Logger.error('Arama sorgusu kaydedilirken hata: $e');
    }
  }

  /// Kullanıcının son arama sorgularını yükle
  Future<void> loadRecentSearchQueries(String userId) async {
    try {
      _isLoading = true;
      notifyListeners();

      final querySnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('aramalar')
          .orderBy('timestamp', descending: true)
          .limit(10)
          .get();

      final queries = querySnapshot.docs
          .map((doc) => doc.data()['query'] as String)
          .toList();
      _recentSearchQueries = queries;

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      Logger.error('Son arama sorguları yüklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Kullanıcı davranışlarına göre içgörüler oluştur
  Future<void> generateUserInsights(User user) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Kullanıcının sipariş geçmişini al
      final orderSnapshot = await _firestore
          .collection('siparisler')
          .where('userId', isEqualTo: user.id)
          .orderBy('dateTime', descending: true)
          .get();

      // Sipariş yoksa boş içgörüler döndür
      if (orderSnapshot.docs.isEmpty) {
        _userInsights = {
          'hasOrders': false,
          'message': 'Henüz sipariş geçmişiniz bulunmuyor.',
        };
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Sipariş saatleri analizi
      Map<int, int> orderHours = {};
      // Sipariş günleri analizi
      Map<int, int> orderDays = {};
      // Kategori tercihleri
      Map<String, int> categoryPreferences = {};
      // Toplam harcama
      double totalSpent = 0;

      for (final doc in orderSnapshot.docs) {
        final data = doc.data();
        final order = app_order.Order.fromJson(data);

        // Sipariş saati
        final hour = order.dateTime.hour;
        orderHours[hour] = (orderHours[hour] ?? 0) + 1;

        // Sipariş günü (1 = Pazartesi, 7 = Pazar)
        final day = order.dateTime.weekday;
        orderDays[day] = (orderDays[day] ?? 0) + 1;

        // Toplam harcama
        totalSpent += order.total;

        // Kategori tercihleri
        for (final item in order.items) {
          final product = _productService.getProductById(item.productId);
          if (product.id != 'dummy') {
            categoryPreferences[product.category] =
                (categoryPreferences[product.category] ?? 0) + 1;
          }
        }
      }

      // En sık sipariş verilen saat
      int? favoriteHour;
      int maxHourCount = 0;
      orderHours.forEach((hour, count) {
        if (count > maxHourCount) {
          maxHourCount = count;
          favoriteHour = hour;
        }
      });

      // En sık sipariş verilen gün
      int? favoriteDay;
      int maxDayCount = 0;
      orderDays.forEach((day, count) {
        if (count > maxDayCount) {
          maxDayCount = count;
          favoriteDay = day;
        }
      });

      // En çok tercih edilen kategori
      String? favoriteCategory;
      int maxCategoryCount = 0;
      categoryPreferences.forEach((category, count) {
        if (count > maxCategoryCount) {
          maxCategoryCount = count;
          favoriteCategory = category;
        }
      });

      // Ortalama sipariş tutarı
      final averageOrderValue = totalSpent / orderSnapshot.docs.length;

      // Gün adını al
      String getDayName(int day) {
        switch (day) {
          case 1:
            return 'Pazartesi';
          case 2:
            return 'Salı';
          case 3:
            return 'Çarşamba';
          case 4:
            return 'Perşembe';
          case 5:
            return 'Cuma';
          case 6:
            return 'Cumartesi';
          case 7:
            return 'Pazar';
          default:
            return '';
        }
      }

      // İçgörüleri oluştur
      _userInsights = {
        'hasOrders': true,
        'orderCount': orderSnapshot.docs.length,
        'totalSpent': totalSpent,
        'averageOrderValue': averageOrderValue,
        'favoriteHour': favoriteHour,
        'favoriteDay': favoriteDay,
        'favoriteDayName':
            favoriteDay != null ? getDayName(favoriteDay!) : null,
        'favoriteCategory': favoriteCategory,
        'insights': [
          if (favoriteHour != null)
            'Genellikle saat $favoriteHour:00 civarında sipariş veriyorsunuz.',
          if (favoriteDay != null)
            '${getDayName(favoriteDay!)} günleri en çok sipariş verdiğiniz gün.',
          if (favoriteCategory != null)
            'En çok tercih ettiğiniz kategori: $favoriteCategory',
          'Ortalama sipariş tutarınız: ${averageOrderValue.toStringAsFixed(2)} TL',
        ],
      };

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      Logger.error('Kullanıcı içgörüleri oluşturulurken hata: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// İki kategori arasında tamamlayıcı bir ilişki olup olmadığını kontrol et
  bool _isComplementaryCategory(String category1, String category2) {
    // Tamamlayıcı kategori çiftleri
    final complementaryPairs = {
      'Ekmek': ['Kahvaltılık', 'İçecek'],
      'Simit': ['İçecek', 'Kahvaltılık'],
      'Poğaça': ['İçecek'],
      'Börek': ['İçecek', 'Tatlı'],
      'Kurabiye': ['İçecek', 'Tatlı'],
      'Pasta': ['İçecek'],
      'Tatlı': ['İçecek'],
      'İçecek': [
        'Ekmek',
        'Simit',
        'Poğaça',
        'Börek',
        'Kurabiye',
        'Pasta',
        'Tatlı'
      ],
      'Kahvaltılık': ['Ekmek', 'Simit'],
    };

    if (complementaryPairs.containsKey(category1)) {
      return complementaryPairs[category1]!.contains(category2);
    }

    return false;
  }

  /// Ürünün mevsimsel olup olmadığını kontrol et
  bool _isSeasonalProduct(Product product, String season) {
    // Mevsimsel ürün kategorileri
    final seasonalCategories = {
      'İlkbahar': ['Çilek', 'Kiraz', 'Bahar', 'Çiçek'],
      'Yaz': ['Karpuz', 'Dondurma', 'Yaz', 'Serinletici'],
      'Sonbahar': ['Kabak', 'Tarçın', 'Sonbahar', 'Balkabağı'],
      'Kış': ['Salep', 'Sıcak', 'Kış', 'Tarçın'],
    };

    if (seasonalCategories.containsKey(season)) {
      final keywords = seasonalCategories[season]!;

      // Ürün adında veya açıklamasında mevsimsel anahtar kelime var mı?
      for (final keyword in keywords) {
        if (product.name.toLowerCase().contains(keyword.toLowerCase()) ||
            product.description.toLowerCase().contains(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /// Ürünün kullanıcı tercihlerine uygunluk puanını hesapla
  int _calculatePreferenceScore(
      Product product,
      List<String> favoriteCategories,
      List<String> dietaryPreferences,
      List<String> allergyInfo) {
    int score = 0;

    // Favori kategori kontrolü
    if (favoriteCategories.contains(product.category)) {
      score += 5;
    }

    // Diyet tercihi kontrolü
    for (final pref in dietaryPreferences) {
      if (product.tags.contains(pref.toLowerCase())) {
        score += 3;
      }
    }

    // Alerji kontrolü (negatif puan)
    for (final allergy in allergyInfo) {
      if (product.allergens.contains(allergy)) {
        score -= 10; // Alerjisi olduğu ürünleri önerme
      }
    }

    // Organik ürün tercihi
    if (product.isOrganic) {
      score += 2;
    }

    // Yerel ürün tercihi
    if (product.isLocal) {
      score += 2;
    }

    return score;
  }

  // Kullanıcı için alışveriş önerileri oluştur
  Future<List<Map<String, dynamic>>> generateShoppingSuggestions(
      User user) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Kullanıcının geçmiş siparişlerine ve tercihlerine göre öneriler oluştur
      final userPreferences = await _getUserPreferences(user.id);
      final allProducts = await _getAllProducts();

      // Önerilen ürünleri filtrele
      final suggestedProducts = allProducts.where((product) {
        // Kullanıcının tercihlerine göre ürünleri filtrele
        return userPreferences['categories'].contains(product.category) ||
            userPreferences['tags'].any((tag) => product.tags.contains(tag));
      }).toList();

      // Rastgele 5 ürün seç (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
      suggestedProducts.shuffle();
      final selectedProducts =
          suggestedProducts.take(min(5, suggestedProducts.length)).toList();

      // Önerileri oluştur
      _shoppingAssistantSuggestions = selectedProducts.map((product) {
        return {
          'product': product,
          'reason': _generateRecommendationReason(product, userPreferences),
          'confidence': _calculateConfidence(product, userPreferences),
        };
      }).toList();

      _isLoading = false;
      notifyListeners();
      return _shoppingAssistantSuggestions;
    } catch (e) {
      _error = 'Alışveriş önerileri yüklenirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  // Otomatik sipariş önerileri oluştur
  Future<List<Map<String, dynamic>>> generateAutoOrderSuggestions(
      User user) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Kullanıcının düzenli olarak satın aldığı ürünleri analiz et
      final orderHistory = await _getUserOrderHistory(user.id);
      final frequentlyBoughtProducts =
          await _getFrequentlyBoughtProducts(user.id);

      // Son siparişten bu yana geçen süreyi kontrol et
      _autoOrderSuggestions = frequentlyBoughtProducts.map((product) {
        // Ürünün son sipariş tarihini bul
        final lastOrderDate = orderHistory
            .where((order) =>
                order.products.any((item) => item.product.id == product.id))
            .map((order) => order.orderDate)
            .reduce((a, b) => a.isAfter(b) ? a : b);

        // Son siparişten bu yana geçen gün sayısı
        final daysSinceLastOrder =
            DateTime.now().difference(lastOrderDate).inDays;

        // Ürünün tipik sipariş sıklığını hesapla (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
        final typicalOrderFrequency =
            _calculateTypicalOrderFrequency(product, orderHistory);

        // Yeniden sipariş zamanı geldi mi?
        final shouldReorder = daysSinceLastOrder >= typicalOrderFrequency;

        return {
          'product': product,
          'lastOrderDate': lastOrderDate,
          'daysSinceLastOrder': daysSinceLastOrder,
          'typicalOrderFrequency': typicalOrderFrequency,
          'shouldReorder': shouldReorder,
          'confidence': _calculateReorderConfidence(
              daysSinceLastOrder, typicalOrderFrequency),
        };
      }).toList();

      // Sadece yeniden sipariş edilmesi gereken ürünleri filtrele
      _autoOrderSuggestions = _autoOrderSuggestions
          .where((suggestion) => suggestion['shouldReorder'] == true)
          .toList();

      _isLoading = false;
      notifyListeners();
      return _autoOrderSuggestions;
    } catch (e) {
      _error = 'Otomatik sipariş önerileri yüklenirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  // Kullanıcı tercihlerini al (RecommendationService'i kullanmak yerine)
  Future<Map<String, dynamic>> _getUserPreferences(String userId) async {
    // Gerçek uygulamada bu veriler RecommendationService'den gelecek
    // Şimdilik örnek veriler döndürüyoruz
    return {
      'categories': ['Ekmek', 'Tatlı', 'Unlu Mamül'],
      'tags': ['glutensiz', 'organik', 'tam buğday'],
      'favoriteProducts': ['product1', 'product2', 'product3'],
    };
  }

  // Tüm ürünleri al (ProductService'i kullanmak yerine)
  Future<List<Product>> _getAllProducts() async {
    // Gerçek uygulamada bu veriler ProductService'den gelecek
    // Şimdilik örnek veriler döndürüyoruz
    return _productService.products;
  }

  // Kullanıcının sipariş geçmişini al
  Future<List<dynamic>> _getUserOrderHistory(String userId) async {
    // Gerçek uygulamada bu veriler RecommendationService'den gelecek
    // Şimdilik örnek veriler döndürüyoruz
    final now = DateTime.now();
    return [
      {
        'id': 'order1',
        'orderDate': now.subtract(const Duration(days: 10)),
        'products': [
          {
            'product': {'id': 'product1', 'category': 'Ekmek'}
          }
        ]
      },
      {
        'id': 'order2',
        'orderDate': now.subtract(const Duration(days: 20)),
        'products': [
          {
            'product': {'id': 'product2', 'category': 'Tatlı'}
          }
        ]
      },
    ];
  }

  // Sık satın alınan ürünleri al
  Future<List<Product>> _getFrequentlyBoughtProducts(String userId) async {
    // Gerçek uygulamada bu veriler RecommendationService'den gelecek
    // Şimdilik örnek veriler döndürüyoruz
    return _productService.products.take(3).toList();
  }

  // Ürün için öneri sebebi oluştur
  String _generateRecommendationReason(
      Product product, Map<String, dynamic> userPreferences) {
    final reasons = [
      'Bu ürün tercih ettiğiniz "${product.category}" kategorisinde',
      'Daha önce benzer ürünler satın aldınız',
      'Bu ürün sizin ilgi alanlarınıza uygun',
      'Bu ürün şu anda çok popüler',
      'Bu ürün önceki alışverişlerinize benziyor',
    ];

    // Rastgele bir sebep seç (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
    return reasons[Random().nextInt(reasons.length)];
  }

  // Öneri güven skorunu hesapla (0-100 arası)
  int _calculateConfidence(
      Product product, Map<String, dynamic> userPreferences) {
    // Basit bir güven skoru hesaplama (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
    int baseScore = 70; // Temel skor

    // Kullanıcının kategorisi ile eşleşiyorsa skoru artır
    if (userPreferences['categories'].contains(product.category)) {
      baseScore += 15;
    }

    // Kullanıcının etiketleri ile eşleşiyorsa skoru artır
    final matchingTags = (userPreferences['tags'] as List)
        .where((tag) => product.tags.contains(tag))
        .length;
    baseScore += matchingTags * 5;

    // Skoru 0-100 arasında sınırla
    return min(100, max(0, baseScore));
  }

  // Tipik sipariş sıklığını hesapla (gün cinsinden)
  int _calculateTypicalOrderFrequency(
      Product product, List<dynamic> orderHistory) {
    // Basit bir sipariş sıklığı hesaplama (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
    // Ürün kategorisine göre varsayılan değerler
    final Map<String, int> defaultFrequencies = {
      'Ekmek': 3,
      'Tatlı': 14,
      'Unlu Mamül': 7,
      'Özel Ürün': 30,
      'Diğer': 21,
    };

    return defaultFrequencies[product.category] ?? 14; // Varsayılan 14 gün
  }

  // Yeniden sipariş güven skorunu hesapla (0-100 arası)
  int _calculateReorderConfidence(
      int daysSinceLastOrder, int typicalOrderFrequency) {
    // Basit bir güven skoru hesaplama (gerçek bir AI sisteminde daha karmaşık bir algoritma kullanılır)
    if (daysSinceLastOrder < typicalOrderFrequency * 0.8) {
      // Henüz tipik sipariş süresinin %80'ine ulaşmadıysa düşük güven
      return 30;
    } else if (daysSinceLastOrder < typicalOrderFrequency) {
      // Tipik sipariş süresine yaklaştıysa orta güven
      return 70;
    } else if (daysSinceLastOrder < typicalOrderFrequency * 1.5) {
      // Tipik sipariş süresini geçtiyse yüksek güven
      return 90;
    } else {
      // Tipik sipariş süresinin çok üzerindeyse çok yüksek güven
      return 100;
    }
  }
}
