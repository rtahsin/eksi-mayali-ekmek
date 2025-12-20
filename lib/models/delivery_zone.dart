class DeliveryZone {
  final String id;
  final String name;
  final double fee;
  final double minOrderAmount;
  final double maxDistance;
  final bool isActive;

  DeliveryZone({
    required this.id,
    required this.name,
    required this.fee,
    required this.minOrderAmount,
    required this.maxDistance,
    required this.isActive,
  });

  factory DeliveryZone.fromJson(Map<String, dynamic> json) {
    return DeliveryZone(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      fee: (json['fee'] as num?)?.toDouble() ?? 0.0,
      minOrderAmount: (json['minOrderAmount'] as num?)?.toDouble() ?? 0.0,
      maxDistance: (json['maxDistance'] as num?)?.toDouble() ?? 0.0,
      isActive: json['isActive'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'fee': fee,
      'minOrderAmount': minOrderAmount,
      'maxDistance': maxDistance,
      'isActive': isActive,
    };
  }
}
