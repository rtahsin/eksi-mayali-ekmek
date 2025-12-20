// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'order_service.dart';
import 'product_service.dart';

/// Kullanıcı davranışlarını analiz eden ve satışları artıracak öneriler sunan servis
class AnalyticsService with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ProductService _productService;
  final OrderService _orderService;

  bool _isLoading = false;
  Map<String, Object> _salesAnalytics = {};
  Map<String, Object> _userAnalytics = {};
  Map<String, Object> _productAnalytics = {};
  List<Map<String, Object>> _salesRecommendations = [];
  String? _error;

  AnalyticsService(this._productService, this._orderService);

  bool get isLoading => _isLoading;
  Map<String, Object> get salesAnalytics => _salesAnalytics;
  Map<String, Object> get userAnalytics => _userAnalytics;
  Map<String, Object> get productAnalytics => _productAnalytics;
  List<Map<String, Object>> get salesRecommendations => _salesRecommendations;
  String? get error => _error;

  /// Tüm analitik verilerini yükle
  Future<void> loadAllAnalytics() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await Future.wait([
        loadSalesAnalytics(),
        loadUserAnalytics(),
        loadProductAnalytics(),
        generateSalesRecommendations(),
      ]);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Analitik verileri yüklenirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Satış analitiği verilerini yükle
  Future<Map<String, Object>> loadSalesAnalytics() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Gerçek uygulamada bu veriler Firestore'dan gelecek
      // Şimdilik örnek veriler oluşturuyoruz
      final now = DateTime.now();
      final lastMonth = now.subtract(const Duration(days: 30));

      // Tüm siparişleri al
      final orders = await _orderService.getAllOrders();

      // Son 30 günlük siparişleri filtrele
      final recentOrders = orders
          .where((order) =>
              order.dateTime.isAfter(lastMonth) && order.dateTime.isBefore(now))
          .toList();

      // Toplam satış tutarı
      final totalSales =
          recentOrders.fold(0.0, (sum, order) => sum + (order.amount ?? 0));

      // Toplam sipariş sayısı
      final totalOrders = recentOrders.length;
      final averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Günlük satışları hesapla
      final dailySales = <String, double>{};
      for (final order in recentOrders) {
        final dateStr = DateFormat('yyyy-MM-dd').format(order.dateTime);
        dailySales[dateStr] = (dailySales[dateStr] ?? 0) + (order.amount ?? 0);
      }

      // Ürün kategorilerine göre satışları hesapla
      final categorySales = <String, double>{};
      for (final order in recentOrders) {
        for (final item in order.items) {
          // Ürün kategorisini doğrudan kullanamıyoruz, bu yüzden basit bir kategori atıyoruz
          const category = "Ekmek"; // Varsayılan kategori
          categorySales[category] =
              (categorySales[category] ?? 0) + (item.price * item.quantity);
        }
      }

      // Saatlik satışları hesapla
      final Map<String, Object> hourlySales = {};
      for (var order in recentOrders) {
        final hour = order.dateTime.hour;
        final hourKey = hour.toString();
        hourlySales[hourKey] =
            (hourlySales[hourKey] as double? ?? 0.0) + (order.amount ?? 0.0);
      }

      // Analitik verilerini oluştur
      final Map<String, Object> analytics = {
        'totalSales': totalSales,
        'totalOrders': totalOrders,
        'averageOrderValue': averageOrderValue,
        'dailySales': dailySales,
        'categorySales': categorySales,
        'hourlySales': hourlySales,
      };

      _salesAnalytics = analytics;
      notifyListeners();
      return analytics;
    } catch (e) {
      _error = 'Satış analitiği verileri yüklenirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return {};
    }
  }

  /// Kullanıcı analitiği verilerini yükle
  Future<Map<String, Object>> loadUserAnalytics() async {
    try {
      // Kullanıcı analitiği verilerini yükle
      // Şimdilik örnek veriler oluşturuyoruz
      final Map<String, Object> analytics = {
        'totalUsers': 250,
        'activeUsers': 120,
        'newUsers': 45,
        'returningUsers': 75,
        'conversionRate': 0.35,
        'usersByRegion': {
          'İstanbul': 85,
          'Ankara': 45,
          'İzmir': 30,
          'Diğer': 90,
        },
        'usersByDevice': {
          'Mobil': 150,
          'Masaüstü': 80,
          'Tablet': 20,
        },
      };

      _userAnalytics = analytics;
      notifyListeners();
      return analytics;
    } catch (e) {
      _error = 'Kullanıcı analitiği verileri yüklenirken bir hata oluştu: $e';
      return {};
    }
  }

  /// Ürün analitiği verilerini yükle
  Future<Map<String, Object>> loadProductAnalytics() async {
    try {
      // Ürün analitiği verilerini yükle
      // Şimdilik örnek veriler oluşturuyoruz
      final Map<String, Object> analytics = {
        'totalProducts': 48,
        'topSellingProducts': [
          {
            'id': '1',
            'name': 'Ekşi Mayalı Tam Buğday Ekmeği',
            'sales': 120,
            'revenue': 2400.0,
          },
          {
            'id': '2',
            'name': 'Çavdarlı Ekşi Maya Ekmek',
            'sales': 85,
            'revenue': 1700.0,
          },
          {
            'id': '3',
            'name': 'Zeytinli Ekşi Maya Ekmek',
            'sales': 65,
            'revenue': 1300.0,
          },
        ],
        'productsByCategory': {
          'Ekşi Mayalı': 18,
          'Çavdarlı': 12,
          'Tam Buğday': 10,
          'Özel': 8,
        },
        'outOfStockProducts': 3,
        'lowStockProducts': 7,
      };

      _productAnalytics = analytics;
      notifyListeners();
      return analytics;
    } catch (e) {
      _error = 'Ürün analitiği verileri yüklenirken bir hata oluştu: $e';
      return {};
    }
  }

  /// Satış önerilerini oluştur
  Future<List<Map<String, Object>>> generateSalesRecommendations() async {
    try {
      // Satış önerilerini oluştur
      // Şimdilik örnek veriler oluşturuyoruz
      final List<Map<String, Object>> recommendations = [
        {
          'title': 'Ekşi Mayalı Tam Buğday Ekmeği için indirim kampanyası',
          'description':
              'En çok satan ürününüz için %10 indirim yaparak satışları artırabilirsiniz.',
          'impact': 'Tahmini etki: +15% satış artışı',
          'priority': 'Yüksek',
        },
        {
          'title': 'Çavdarlı ürünler için paket teklifi',
          'description':
              'Çavdarlı ürünleri bir araya getirerek paket halinde satabilirsiniz.',
          'impact': 'Tahmini etki: +8% satış artışı',
          'priority': 'Orta',
        },
        {
          'title': 'Sabah 8-10 arası promosyon',
          'description':
              'En yoğun satış saatlerinizde özel promosyonlar sunabilirsiniz.',
          'impact': 'Tahmini etki: +12% satış artışı',
          'priority': 'Yüksek',
        },
        {
          'title': 'Düşük stoklu ürünleri tamamlayın',
          'description':
              '7 ürününüzün stok seviyesi düşük, stokları yenilemeniz önerilir.',
          'impact': 'Tahmini etki: Kayıp satışların önlenmesi',
          'priority': 'Acil',
        },
      ];

      _salesRecommendations = recommendations;
      notifyListeners();
      return recommendations;
    } catch (e) {
      _error = 'Satış önerileri oluşturulurken bir hata oluştu: $e';
      return [];
    }
  }

  /// Tarih formatını düzenle (YYYY-MM-DD)
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
