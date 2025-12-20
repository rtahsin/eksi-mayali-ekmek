// ignore_for_file: prefer_const_constructors

/*
 * Envanter Servisi
 * 
 * PURPOSE: Üretim, stok, satış ve gider yönetimi
 * LAYER: Service
 * DEPENDS ON: Firestore, Logger
 * 
 * LAST UPDATED: 2025-12-12
 */

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/expense.dart';
import '../models/production.dart';
import '../models/sale.dart';
import '../models/stock.dart';
import '../utils/logger.dart';

class InventoryService {
  static final InventoryService _instance = InventoryService._internal();
  factory InventoryService() => _instance;
  InventoryService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Collection names
  static const String _productionsCollection = 'uretimler';
  static const String _salesCollection = 'satislar';
  static const String _expensesCollection = 'giderler';
  static const String _stocksCollection = 'stoklar';

  // ==================== ÜRETIM ====================

  /// Yeni üretim kaydı oluştur ve stoğu artır
  Future<void> addProduction(Production production) async {
    try {
      // 1. Üretim kaydı ekle
      await _firestore
          .collection(_productionsCollection)
          .doc(production.id)
          .set(production.toJson());

      // 2. Stoğu artır
      await _updateStock(
        productId: production.productId,
        productName: production.productName,
        quantityChange: production.quantity, // Pozitif (artış)
      );

      Logger.info('✅ Üretim kaydı eklendi: ${production.productName} x${production.quantity}');
    } catch (e) {
      Logger.error('Üretim kaydı eklenirken hata: $e');
      rethrow;
    }
  }

  /// Tüm üretim kayıtlarını getir
  Future<List<Production>> getAllProductions({DateTime? startDate, DateTime? endDate}) async {
    try {
      Query query = _firestore.collection(_productionsCollection);

      if (startDate != null) {
        query = query.where('productionDate', isGreaterThanOrEqualTo: startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.where('productionDate', isLessThanOrEqualTo: endDate.toIso8601String());
      }

      final snapshot = await query.orderBy('productionDate', descending: true).get();
      return snapshot.docs.map((doc) => Production.fromJson(doc.data() as Map<String, dynamic>)).toList();
    } catch (e) {
      Logger.error('Üretim kayıtları yüklenirken hata: $e');
      return [];
    }
  }

  /// Üretim kaydını sil (stoğu geri al)
  Future<void> deleteProduction(String productionId, String productId, int quantity) async {
    try {
      // 1. Üretim kaydını sil
      await _firestore.collection(_productionsCollection).doc(productionId).delete();

      // 2. Stoğu azalt
      await _updateStock(
        productId: productId,
        productName: '', // İsim gerekmiyor (mevcut stok varsa güncellenir)
        quantityChange: -quantity, // Negatif (azalış)
      );

      Logger.info('✅ Üretim kaydı silindi ve stok güncellendi');
    } catch (e) {
      Logger.error('Üretim kaydı silinirken hata: $e');
      rethrow;
    }
  }

  // ==================== SATIŞ ====================

  /// Yeni satış kaydı oluştur ve stoğu azalt
  Future<void> addSale(Sale sale) async {
    try {
      // 1. Stok kontrolü
      final stock = await getStock(sale.productId);
      if (stock == null || stock.quantity < sale.quantity) {
        throw Exception('Yetersiz stok! Mevcut: ${stock?.quantity ?? 0}, İstenen: ${sale.quantity}');
      }

      // 2. Satış kaydı ekle
      await _firestore.collection(_salesCollection).doc(sale.id).set(sale.toJson());

      // 3. Stoğu azalt
      await _updateStock(
        productId: sale.productId,
        productName: sale.productName,
        quantityChange: -sale.quantity, // Negatif (azalış)
      );

      Logger.info('✅ Satış kaydı eklendi: ${sale.productName} x${sale.quantity}');
    } catch (e) {
      Logger.error('Satış kaydı eklenirken hata: $e');
      rethrow;
    }
  }

  /// Tüm satış kayıtlarını getir
  Future<List<Sale>> getAllSales({DateTime? startDate, DateTime? endDate}) async {
    try {
      Query query = _firestore.collection(_salesCollection);

      if (startDate != null) {
        query = query.where('saleDate', isGreaterThanOrEqualTo: startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.where('saleDate', isLessThanOrEqualTo: endDate.toIso8601String());
      }

      final snapshot = await query.orderBy('saleDate', descending: true).get();
      return snapshot.docs.map((doc) => Sale.fromJson(doc.data() as Map<String, dynamic>)).toList();
    } catch (e) {
      Logger.error('Satış kayıtları yüklenirken hata: $e');
      return [];
    }
  }

  /// Satış kaydını sil (stoğu geri al)
  Future<void> deleteSale(String saleId, String productId, int quantity) async {
    try {
      // 1. Satış kaydını sil
      await _firestore.collection(_salesCollection).doc(saleId).delete();

      // 2. Stoğu artır (geri al)
      await _updateStock(
        productId: productId,
        productName: '',
        quantityChange: quantity, // Pozitif (artış)
      );

      Logger.info('✅ Satış kaydı silindi ve stok geri alındı');
    } catch (e) {
      Logger.error('Satış kaydı silinirken hata: $e');
      rethrow;
    }
  }

  // ==================== GİDER ====================

  /// Yeni gider kaydı oluştur
  Future<void> addExpense(Expense expense) async {
    try {
      await _firestore.collection(_expensesCollection).doc(expense.id).set(expense.toJson());
      Logger.info('✅ Gider kaydı eklendi: ${expense.name} - ${expense.amount} TL');
    } catch (e) {
      Logger.error('Gider kaydı eklenirken hata: $e');
      rethrow;
    }
  }

  /// Tüm gider kayıtlarını getir
  Future<List<Expense>> getAllExpenses({DateTime? startDate, DateTime? endDate}) async {
    try {
      Query query = _firestore.collection(_expensesCollection);

      if (startDate != null) {
        query = query.where('expenseDate', isGreaterThanOrEqualTo: startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.where('expenseDate', isLessThanOrEqualTo: endDate.toIso8601String());
      }

      final snapshot = await query.orderBy('expenseDate', descending: true).get();
      return snapshot.docs.map((doc) => Expense.fromJson(doc.data() as Map<String, dynamic>)).toList();
    } catch (e) {
      Logger.error('Gider kayıtları yüklenirken hata: $e');
      return [];
    }
  }

  /// Gider kaydını sil
  Future<void> deleteExpense(String expenseId) async {
    try {
      await _firestore.collection(_expensesCollection).doc(expenseId).delete();
      Logger.info('✅ Gider kaydı silindi');
    } catch (e) {
      Logger.error('Gider kaydı silinirken hata: $e');
      rethrow;
    }
  }

  // ==================== STOK ====================

  /// Stoğu güncelle (internal)
  Future<void> _updateStock({
    required String productId,
    required String productName,
    required int quantityChange,
  }) async {
    try {
      final docRef = _firestore.collection(_stocksCollection).doc(productId);
      final doc = await docRef.get();

      if (doc.exists) {
        // Mevcut stok var - güncelle
        final currentStock = Stock.fromJson(doc.data()!);
        final newQuantity = currentStock.quantity + quantityChange;

        await docRef.update({
          'quantity': newQuantity >= 0 ? newQuantity : 0,
          'lastUpdated': DateTime.now().toIso8601String(),
        });
      } else {
        // Yeni stok kaydı oluştur
        final newStock = Stock(
          productId: productId,
          productName: productName,
          quantity: quantityChange >= 0 ? quantityChange : 0,
          lastUpdated: DateTime.now(),
        );
        await docRef.set(newStock.toJson());
      }

      Logger.info('📦 Stok güncellendi: $productName ${quantityChange > 0 ? '+' : ''}$quantityChange');
    } catch (e) {
      Logger.error('Stok güncellenirken hata: $e');
      rethrow;
    }
  }

  /// Belirli bir ürünün stok bilgisini getir
  Future<Stock?> getStock(String productId) async {
    try {
      final doc = await _firestore.collection(_stocksCollection).doc(productId).get();
      if (doc.exists) {
        return Stock.fromJson(doc.data()!);
      }
      return null;
    } catch (e) {
      Logger.error('Stok bilgisi alınırken hata: $e');
      return null;
    }
  }

  /// Tüm stokları getir
  Future<List<Stock>> getAllStocks() async {
    try {
      final snapshot = await _firestore.collection(_stocksCollection).get();
      return snapshot.docs.map((doc) => Stock.fromJson(doc.data())).toList();
    } catch (e) {
      Logger.error('Stok listesi yüklenirken hata: $e');
      return [];
    }
  }

  /// Düşük stoklu ürünleri getir
  Future<List<Stock>> getLowStocks() async {
    try {
      final allStocks = await getAllStocks();
      return allStocks.where((stock) => stock.isLowStock).toList();
    } catch (e) {
      Logger.error('Düşük stok listesi yüklenirken hata: $e');
      return [];
    }
  }

  // ==================== FİNANS RAPORU ====================

  /// Belirli tarih aralığı için finansal rapor
  Future<Map<String, dynamic>> getFinancialReport({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      // Satışları getir
      final sales = await getAllSales(startDate: startDate, endDate: endDate);
      final totalRevenue = sales.fold<double>(0, (sum, sale) => sum + sale.totalPrice);

      // Giderleri getir
      final expenses = await getAllExpenses(startDate: startDate, endDate: endDate);
      final totalExpenses = expenses.fold<double>(0, (sum, expense) => sum + expense.amount);

      // Üretimleri getir (sadece sayı için)
      final productions = await getAllProductions(startDate: startDate, endDate: endDate);
      final totalProductionQuantity = productions.fold<int>(0, (sum, prod) => sum + prod.quantity);

      // Kar/Zarar (Sadece Gelir - Gider)
      final profit = totalRevenue - totalExpenses;

      return {
        'totalRevenue': totalRevenue, // Toplam gelir
        'totalExpenses': totalExpenses, // Hammadde/diğer giderler
        'totalProductionQuantity': totalProductionQuantity, // Toplam üretim adedi
        'profit': profit, // Net kar/zarar (Gelir - Gider)
        'profitMargin': totalRevenue > 0 ? (profit / totalRevenue * 100) : 0, // Kar marjı %
        'salesCount': sales.length,
        'productionsCount': productions.length,
        'expensesCount': expenses.length,
      };
    } catch (e) {
      Logger.error('Finansal rapor oluşturulurken hata: $e');
      return {};
    }
  }
}
