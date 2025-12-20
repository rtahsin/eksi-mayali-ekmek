enum OrderStatus { pending, processing, shipped, delivered, cancelled }

extension OrderStatusExtension on OrderStatus {
  String get displayName {
    switch (this) {
      case OrderStatus.pending:
        return 'Beklemede';
      case OrderStatus.processing:
        return 'İşleniyor';
      case OrderStatus.shipped:
        return 'Kargoya Verildi';
      case OrderStatus.delivered:
        return 'Teslim Edildi';
      case OrderStatus.cancelled:
        return 'İptal Edildi';
    }
  }

  String get value {
    return toString().split('.').last;
  }

  static OrderStatus fromString(String status) {
    return OrderStatus.values.firstWhere(
      (e) => e.toString().split('.').last == status,
      orElse: () => OrderStatus.pending,
    );
  }
}
