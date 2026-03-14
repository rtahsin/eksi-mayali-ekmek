import 'package:cloud_firestore/cloud_firestore.dart';

/// Teslimat günü modeli
///
/// Haftalık teslimat sisteminde kullanılan teslimat günü bilgilerini tutar
class DeliveryDay {
  final DateTime date; // Teslimat tarihi (ISO 8601)
  final int weekDay; // 1=Pazartesi, 5=Cuma
  final String productionStartTime; // "08:00"
  final String deliveryStartTime; // "09:00"
  final String deliveryEndTime; // "18:00"
  final bool ordersClosed; // Üretim başladı mı? (sipariş kapandı mı?)
  final DateTime? productionStartedAt; // Üretim başlangıç zamanı
  final int orderCount; // Bu güne ait sipariş sayısı
  final double totalRevenue; // Toplam gelir

  DeliveryDay({
    required this.date,
    required this.weekDay,
    this.productionStartTime = '08:00',
    this.deliveryStartTime = '09:00',
    this.deliveryEndTime = '18:00',
    this.ordersClosed = false,
    this.productionStartedAt,
    this.orderCount = 0,
    this.totalRevenue = 0.0,
  });

  /// Teslimat günü açık mı? (sipariş alınabiliyor mu?)
  bool get isOpen => !ordersClosed;

  /// Teslimat günü tarihi geçmiş mi?
  bool get isPast => date.isBefore(DateTime.now());

  /// Teslimat günü bugün mü?
  bool get isToday {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  /// Teslimat günü gelecek mi?
  bool get isFuture => date.isAfter(DateTime.now());

  /// Üretim başlangıç zamanı (tam DateTime)
  DateTime get productionStartDateTime {
    final parts = productionStartTime.split(':');
    final hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);

    // Üretim teslimat gününden 1 gün önce başlar
    final productionDate = date.subtract(Duration(days: 1));
    return DateTime(
      productionDate.year,
      productionDate.month,
      productionDate.day,
      hour,
      minute,
    );
  }

  /// Üretim başlama zamanı geçti mi?
  bool get hasProductionStartTimePassed {
    return DateTime.now().isAfter(productionStartDateTime);
  }

  /// Firestore'dan DeliveryDay oluştur
  factory DeliveryDay.fromFirestore(Map<String, dynamic> data) {
    return DeliveryDay(
      date: (data['date'] as Timestamp).toDate(),
      weekDay: data['weekDay'] as int,
      productionStartTime: data['productionStartTime'] as String? ?? '08:00',
      deliveryStartTime: data['deliveryStartTime'] as String? ?? '09:00',
      deliveryEndTime: data['deliveryEndTime'] as String? ?? '18:00',
      ordersClosed: data['ordersClosed'] as bool? ?? false,
      productionStartedAt: data['productionStartedAt'] != null
          ? (data['productionStartedAt'] as Timestamp).toDate()
          : null,
      orderCount: data['orderCount'] as int? ?? 0,
      totalRevenue: (data['totalRevenue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  /// DeliveryDay'i Firestore'a kaydet
  Map<String, dynamic> toFirestore() {
    return {
      'date': Timestamp.fromDate(date),
      'weekDay': weekDay,
      'productionStartTime': productionStartTime,
      'deliveryStartTime': deliveryStartTime,
      'deliveryEndTime': deliveryEndTime,
      'ordersClosed': ordersClosed,
      'productionStartedAt':
          productionStartedAt != null ? Timestamp.fromDate(productionStartedAt!) : null,
      'orderCount': orderCount,
      'totalRevenue': totalRevenue,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  /// DeliveryDay kopyasını oluştur
  DeliveryDay copyWith({
    DateTime? date,
    int? weekDay,
    String? productionStartTime,
    String? deliveryStartTime,
    String? deliveryEndTime,
    bool? ordersClosed,
    DateTime? productionStartedAt,
    int? orderCount,
    double? totalRevenue,
  }) {
    return DeliveryDay(
      date: date ?? this.date,
      weekDay: weekDay ?? this.weekDay,
      productionStartTime: productionStartTime ?? this.productionStartTime,
      deliveryStartTime: deliveryStartTime ?? this.deliveryStartTime,
      deliveryEndTime: deliveryEndTime ?? this.deliveryEndTime,
      ordersClosed: ordersClosed ?? this.ordersClosed,
      productionStartedAt: productionStartedAt ?? this.productionStartedAt,
      orderCount: orderCount ?? this.orderCount,
      totalRevenue: totalRevenue ?? this.totalRevenue,
    );
  }

  @override
  String toString() {
    return 'DeliveryDay{date: $date, weekDay: $weekDay, ordersClosed: $ordersClosed, orderCount: $orderCount}';
  }
}

/// Teslimat saati dilimi
class DeliveryTimeSlot {
  final String startTime; // "09:00"
  final String endTime; // "11:00"
  final List<String> orderIds; // Bu saat dilimindeki sipariş ID'leri
  final int capacity; // Maksimum sipariş kapasitesi

  DeliveryTimeSlot({
    required this.startTime,
    required this.endTime,
    this.orderIds = const [],
    this.capacity = 10,
  });

  /// Slot dolu mu?
  bool get isFull => orderIds.length >= capacity;

  /// Kalan kapasite
  int get remainingCapacity => capacity - orderIds.length;

  /// Slot string formatı (09:00-11:00)
  String get timeRange => '$startTime-$endTime';

  factory DeliveryTimeSlot.fromMap(Map<String, dynamic> data) {
    return DeliveryTimeSlot(
      startTime: data['startTime'] as String,
      endTime: data['endTime'] as String,
      orderIds: (data['orderIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      capacity: data['capacity'] as int? ?? 10,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'startTime': startTime,
      'endTime': endTime,
      'orderIds': orderIds,
      'capacity': capacity,
    };
  }
}
