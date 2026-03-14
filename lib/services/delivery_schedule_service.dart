import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../models/delivery_day.dart';
import '../utils/logger.dart';

/// Teslimat Takvimi Yönetim Servisi
///
/// Haftalık teslimat sisteminin yönetiminden sorumludur:
/// - Aktif teslimat günü yönetimi
/// - Üretim başlatma (sipariş kapama)
/// - Gelecek teslimat günleri planlama
/// - Teslimat istatistikleri
class DeliveryScheduleService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  DeliveryDay? _activeDeliveryDay;
  DeliveryDay? get activeDeliveryDay => _activeDeliveryDay;

  List<DeliveryDay> _upcomingDeliveries = [];
  List<DeliveryDay> get upcomingDeliveries => _upcomingDeliveries;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  static const String collection = 'ayarlar';
  static const String docId = 'teslimat_takvimi';

  /// Servisi başlat ve aktif teslimat gününü yükle
  Future<void> init() async {
    Logger.info('DeliveryScheduleService başlatılıyor...');
    await loadActiveDeliveryDay();
    await loadUpcomingDeliveries();
  }

  /// Aktif teslimat gününü yükle
  Future<DeliveryDay?> loadActiveDeliveryDay() async {
    try {
      _isLoading = true;
      notifyListeners();

      final doc = await _firestore.collection(collection).doc(docId).get();

      if (!doc.exists) {
        Logger.warning('Teslimat takvimi bulunamadı, oluşturuluyor...');
        await _createInitialDeliverySchedule();
        return await loadActiveDeliveryDay();
      }

      final data = doc.data()!;
      _activeDeliveryDay = DeliveryDay.fromFirestore(data);

      Logger.info('Aktif teslimat günü yüklendi: ${_activeDeliveryDay!.date}');

      _isLoading = false;
      notifyListeners();

      return _activeDeliveryDay;
    } catch (e) {
      Logger.error('Aktif teslimat günü yüklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// İlk teslimat takvimini oluştur (Cuma teslimat - varsayılan)
  Future<void> _createInitialDeliverySchedule() async {
    try {
      // Bir sonraki Cuma gününü bul
      final now = DateTime.now();
      final daysUntilFriday = (5 - now.weekday + 7) % 7;
      final nextFriday = now.add(Duration(days: daysUntilFriday == 0 ? 7 : daysUntilFriday));

      final deliveryDay = DeliveryDay(
        date: DateTime(nextFriday.year, nextFriday.month, nextFriday.day),
        weekDay: 5, // Cuma
        productionStartTime: '08:00',
        deliveryStartTime: '09:00',
        deliveryEndTime: '18:00',
        ordersClosed: false,
        orderCount: 0,
        totalRevenue: 0.0,
      );

      await _firestore.collection(collection).doc(docId).set(
            deliveryDay.toFirestore(),
          );

      Logger.info('İlk teslimat takvimi oluşturuldu: ${deliveryDay.date}');
    } catch (e) {
      Logger.error('İlk teslimat takvimi oluşturulurken hata: $e');
      rethrow;
    }
  }

  /// Gelecek teslimat günlerini yükle (önümüzdeki 4 hafta)
  Future<void> loadUpcomingDeliveries() async {
    try {
      if (_activeDeliveryDay == null) {
        await loadActiveDeliveryDay();
      }

      if (_activeDeliveryDay == null) return;

      _upcomingDeliveries = [];

      // Önümüzdeki 4 hafta için teslimat günleri oluştur
      for (int i = 1; i <= 4; i++) {
        final futureDate = _activeDeliveryDay!.date.add(Duration(days: 7 * i));

        // Bu tarih için sipariş sayısını kontrol et
        final ordersSnapshot = await _firestore
            .collection('siparisler')
            .where('deliveryDate', isEqualTo: _formatDate(futureDate))
            .get();

        final deliveryDay = DeliveryDay(
          date: futureDate,
          weekDay: _activeDeliveryDay!.weekDay,
          productionStartTime: _activeDeliveryDay!.productionStartTime,
          deliveryStartTime: _activeDeliveryDay!.deliveryStartTime,
          deliveryEndTime: _activeDeliveryDay!.deliveryEndTime,
          ordersClosed: false,
          orderCount: ordersSnapshot.size,
          totalRevenue: 0.0, // Hesaplanacak
        );

        _upcomingDeliveries.add(deliveryDay);
      }

      Logger.info('${_upcomingDeliveries.length} gelecek teslimat günü yüklendi');
      notifyListeners();
    } catch (e) {
      Logger.error('Gelecek teslimat günleri yüklenirken hata: $e');
    }
  }

  /// Üretimi başlat (sipariş kapama)
  Future<bool> startProduction() async {
    try {
      if (_activeDeliveryDay == null) {
        throw Exception('Aktif teslimat günü yok');
      }

      if (_activeDeliveryDay!.ordersClosed) {
        throw Exception('Üretim zaten başlamış');
      }

      Logger.info('Üretim başlatılıyor: ${_activeDeliveryDay!.date}');

      // Sipariş sayısını ve toplam geliri hesapla
      final ordersSnapshot = await _firestore
          .collection('siparisler')
          .where('deliveryDate', isEqualTo: _formatDate(_activeDeliveryDay!.date))
          .where('orderStatus', whereIn: ['pending', 'processing']).get();

      double totalRevenue = 0.0;
      for (var doc in ordersSnapshot.docs) {
        final data = doc.data();
        totalRevenue += (data['amount'] as num?)?.toDouble() ?? 0.0;
      }

      // Firestore'u güncelle
      await _firestore.collection(collection).doc(docId).update({
        'ordersClosed': true,
        'productionStartedAt': FieldValue.serverTimestamp(),
        'orderCount': ordersSnapshot.size,
        'totalRevenue': totalRevenue,
      });

      // Siparişleri "processing" durumuna al
      final batch = _firestore.batch();
      for (var doc in ordersSnapshot.docs) {
        if (doc.data()['orderStatus'] == 'pending') {
          batch.update(doc.reference, {
            'orderStatus': 'processing',
            'updatedAt': FieldValue.serverTimestamp(),
          });
        }
      }
      await batch.commit();

      Logger.info('Üretim başlatıldı: ${ordersSnapshot.size} sipariş, $totalRevenue TL gelir');

      // Local state'i güncelle
      _activeDeliveryDay = _activeDeliveryDay!.copyWith(
        ordersClosed: true,
        productionStartedAt: DateTime.now(),
        orderCount: ordersSnapshot.size,
        totalRevenue: totalRevenue,
      );

      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Üretim başlatılırken hata: $e');
      return false;
    }
  }

  /// Bir sonraki haftaya geç (yeni teslimat günü aktif et)
  Future<bool> moveToNextWeek() async {
    try {
      if (_activeDeliveryDay == null) {
        throw Exception('Aktif teslimat günü yok');
      }

      // Yeni teslimat günü = mevcut + 7 gün
      final nextDeliveryDate = _activeDeliveryDay!.date.add(Duration(days: 7));

      final newDeliveryDay = DeliveryDay(
        date: nextDeliveryDate,
        weekDay: _activeDeliveryDay!.weekDay,
        productionStartTime: _activeDeliveryDay!.productionStartTime,
        deliveryStartTime: _activeDeliveryDay!.deliveryStartTime,
        deliveryEndTime: _activeDeliveryDay!.deliveryEndTime,
        ordersClosed: false,
        orderCount: 0,
        totalRevenue: 0.0,
      );

      // Eski günü geçmiş haftalar koleksiyonuna taşı
      await _firestore
          .collection(collection)
          .doc('gecmis_teslimatlar')
          .collection('haftalar')
          .doc(_formatDate(_activeDeliveryDay!.date))
          .set(_activeDeliveryDay!.toFirestore());

      // Yeni günü aktif yap
      await _firestore.collection(collection).doc(docId).set(newDeliveryDay.toFirestore());

      Logger.info('Yeni haftaya geçildi: $nextDeliveryDate');

      _activeDeliveryDay = newDeliveryDay;
      notifyListeners();

      return true;
    } catch (e) {
      Logger.error('Yeni haftaya geçilirken hata: $e');
      return false;
    }
  }

  /// Teslimat gününü güncelle (admin değiştirmesi)
  Future<bool> updateDeliveryDay({
    DateTime? date,
    int? weekDay,
    String? productionStartTime,
    String? deliveryStartTime,
    String? deliveryEndTime,
  }) async {
    try {
      if (_activeDeliveryDay == null) {
        throw Exception('Aktif teslimat günü yok');
      }

      final updatedData = <String, dynamic>{};

      if (date != null) {
        updatedData['date'] = Timestamp.fromDate(date);
      }
      if (weekDay != null) {
        updatedData['weekDay'] = weekDay;
      }
      if (productionStartTime != null) {
        updatedData['productionStartTime'] = productionStartTime;
      }
      if (deliveryStartTime != null) {
        updatedData['deliveryStartTime'] = deliveryStartTime;
      }
      if (deliveryEndTime != null) {
        updatedData['deliveryEndTime'] = deliveryEndTime;
      }

      updatedData['updatedAt'] = FieldValue.serverTimestamp();

      await _firestore.collection(collection).doc(docId).update(updatedData);

      Logger.info('Teslimat günü güncellendi');

      await loadActiveDeliveryDay();
      return true;
    } catch (e) {
      Logger.error('Teslimat günü güncellenirken hata: $e');
      return false;
    }
  }

  /// Sipariş verebilir mi kontrolü
  bool canPlaceOrder() {
    if (_activeDeliveryDay == null) return false;

    // Sipariş kapalı mı?
    if (_activeDeliveryDay!.ordersClosed) return false;

    // Üretim başlama zamanı geçmiş mi?
    if (_activeDeliveryDay!.hasProductionStartTimePassed) return false;

    return true;
  }

  /// Müşterinin sipariş verebileceği teslimat günü
  DeliveryDay? getAvailableDeliveryDay() {
    if (_activeDeliveryDay == null) return null;

    // Aktif gün açıksa onu döndür
    if (canPlaceOrder()) {
      return _activeDeliveryDay;
    }

    // Kapalıysa bir sonraki haftayı döndür
    if (_upcomingDeliveries.isNotEmpty) {
      return _upcomingDeliveries.first;
    }

    // Upcoming'de yoksa manual oluştur
    final nextWeekDate = _activeDeliveryDay!.date.add(Duration(days: 7));
    return DeliveryDay(
      date: nextWeekDate,
      weekDay: _activeDeliveryDay!.weekDay,
      productionStartTime: _activeDeliveryDay!.productionStartTime,
      deliveryStartTime: _activeDeliveryDay!.deliveryStartTime,
      deliveryEndTime: _activeDeliveryDay!.deliveryEndTime,
      ordersClosed: false,
    );
  }

  /// Tarih formatla (YYYY-MM-DD)
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  /// Aktif teslimat günü stream'i
  Stream<DeliveryDay?> watchActiveDeliveryDay() {
    return _firestore.collection(collection).doc(docId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return DeliveryDay.fromFirestore(doc.data()!);
    });
  }
}
