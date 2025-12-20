import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

import '../../domain/repositories/i_delivery_repository.dart';

class DeliveryRepository implements IDeliveryRepository {
  final FirebaseFirestore _firestore;

  DeliveryRepository(this._firestore);

  @override
  Future<Map<String, dynamic>> getDeliveryOptions() async {
    try {
      final now = DateTime.now();
      final todayHours = _generateDeliveryHours(now);
      final tomorrow = now.add(const Duration(days: 1));
      final tomorrowHours = _generateDeliveryHours(tomorrow);
      final dayAfterTomorrow = now.add(const Duration(days: 2));
      final dayAfterTomorrowHours = _generateDeliveryHours(dayAfterTomorrow);

      return {
        'standardDelivery': {
          'name': 'Standart Teslimat',
          'description': 'Siparişiniz 1-2 gün içinde teslim edilir',
          'price': 15.0,
          'availableDates': {
            _formatDate(tomorrow): tomorrowHours,
            _formatDate(dayAfterTomorrow): dayAfterTomorrowHours,
          },
        },
        'sameDay': {
          'name': 'Aynı Gün Teslimat',
          'description': 'Siparişiniz bugün içinde teslim edilir',
          'price': 30.0,
          'availableDates': {
            _formatDate(now): todayHours,
          },
        },
        'expressDelivery': {
          'name': 'Ekspres Teslimat',
          'description': 'Siparişiniz 2 saat içinde teslim edilir',
          'price': 45.0,
          'availableDates': {
            _formatDate(now): todayHours.where((hour) {
              final hourValue = int.parse(hour.split(':')[0]);
              return hourValue >= now.hour + 2;
            }).toList(),
          },
        },
        'scheduledDelivery': {
          'name': 'Planlı Teslimat',
          'description': 'Siparişiniz seçtiğiniz tarih ve saatte teslim edilir',
          'price': 20.0,
          'availableDates': {
            _formatDate(now): todayHours,
            _formatDate(tomorrow): tomorrowHours,
            _formatDate(dayAfterTomorrow): dayAfterTomorrowHours,
            _formatDate(now.add(const Duration(days: 3))):
                _generateDeliveryHours(now.add(const Duration(days: 3))),
            _formatDate(now.add(const Duration(days: 4))):
                _generateDeliveryHours(now.add(const Duration(days: 4))),
          },
        },
      };
    } catch (e) {
      throw Exception('Teslimat seçenekleri alınırken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getDeliveryZones() async {
    try {
      return {
        'zone1': {
          'name': 'Bölge 1',
          'description': 'Merkez ve yakın çevresi',
          'estimatedTime': '20-30 dakika',
          'additionalFee': 0.0,
        },
        'zone2': {
          'name': 'Bölge 2',
          'description': '5-10 km mesafe',
          'estimatedTime': '30-45 dakika',
          'additionalFee': 10.0,
        },
        'zone3': {
          'name': 'Bölge 3',
          'description': '10-15 km mesafe',
          'estimatedTime': '45-60 dakika',
          'additionalFee': 20.0,
        },
      };
    } catch (e) {
      throw Exception('Teslimat bölgeleri alınırken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getActiveDeliveries(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('deliveries')
          .where('userId', isEqualTo: userId)
          .where('status', whereIn: ['preparing', 'ready', 'in_transit']).get();

      final deliveries = <String, dynamic>{};
      for (var doc in snapshot.docs) {
        deliveries[doc.id] = doc.data();
      }

      return deliveries;
    } catch (e) {
      throw Exception('Aktif teslimatlar alınırken hata oluştu: $e');
    }
  }

  @override
  Future<bool> updateDeliveryStatus(String orderId, String status,
      {String? description}) async {
    try {
      final now = DateTime.now();
      final data = {
        'status': status,
        'updatedAt': now,
        if (description != null) 'description': description,
      };

      await _firestore.collection('deliveries').doc(orderId).update(data);
      return true;
    } catch (e) {
      throw Exception('Teslimat durumu güncellenirken hata oluştu: $e');
    }
  }

  @override
  Future<bool> updateCourierLocation(
      String orderId, double lat, double lng) async {
    try {
      final now = DateTime.now();
      final data = {
        'courierLocation': {
          'lat': lat,
          'lng': lng,
          'lastUpdated': now,
        },
      };

      await _firestore.collection('deliveries').doc(orderId).update(data);
      return true;
    } catch (e) {
      throw Exception('Kurye konumu güncellenirken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> selectDeliveryOption(
      String optionId, String date, String timeSlot) async {
    try {
      final options = await getDeliveryOptions();
      if (!options.containsKey(optionId)) {
        throw Exception('Geçersiz teslimat seçeneği');
      }

      final option = options[optionId];
      final availableDates = option['availableDates'] as Map<String, dynamic>;

      if (!availableDates.containsKey(date)) {
        throw Exception('Seçilen tarih için teslimat yapılamıyor');
      }

      final availableTimes = availableDates[date] as List;
      if (!availableTimes.contains(timeSlot)) {
        throw Exception('Seçilen saat dilimi için teslimat yapılamıyor');
      }

      return {
        'success': true,
        'option': option,
        'selectedDate': date,
        'selectedTime': timeSlot,
      };
    } catch (e) {
      throw Exception('Teslimat seçeneği seçilirken hata oluştu: $e');
    }
  }

  @override
  Future<bool> selectDeliveryZone(String orderId, String zone) async {
    try {
      final zones = await getDeliveryZones();
      if (!zones.containsKey(zone)) {
        throw Exception('Geçersiz teslimat bölgesi');
      }

      final zoneData = zones[zone];
      final data = {
        'deliveryZone': zone,
        'additionalFee': zoneData['additionalFee'],
        'estimatedTime': zoneData['estimatedTime'],
      };

      await _firestore.collection('deliveries').doc(orderId).update(data);
      return true;
    } catch (e) {
      throw Exception('Teslimat bölgesi seçilirken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getOrderTracking(String orderId) async {
    try {
      final doc = await _firestore.collection('deliveries').doc(orderId).get();
      if (!doc.exists) {
        throw Exception('Teslimat bulunamadı');
      }

      return doc.data()!;
    } catch (e) {
      throw Exception('Teslimat takip bilgileri alınırken hata oluştu: $e');
    }
  }

  @override
  Stream<DocumentSnapshot> getDeliveryStream(String orderId) {
    return _firestore.collection('deliveries').doc(orderId).snapshots();
  }

  List<String> _generateDeliveryHours(DateTime date) {
    final hours = <String>[];
    final now = DateTime.now();
    final isToday =
        date.year == now.year && date.month == now.month && date.day == now.day;
    final startHour = isToday ? now.hour : 9;
    const endHour = 22;

    for (var hour = startHour; hour < endHour; hour++) {
      hours.add('${hour.toString().padLeft(2, '0')}:00');
    }

    return hours;
  }

  String _formatDate(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }
}
