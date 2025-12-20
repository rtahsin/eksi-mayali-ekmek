// ignore_for_file: prefer_const_constructors

/*
 * Üretim Modeli
 * 
 * PURPOSE: Ekmek üretim kayıtları için model
 * LAYER: Model
 * 
 * LAST UPDATED: 2025-12-12
 */

class Production {
  final String id;
  final String productId; // Hangi ürün üretildi
  final String productName;
  final int quantity; // Adet
  final DateTime productionDate;
  final String? notes;
  final DateTime createdAt;

  Production({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.productionDate,
    this.notes,
    required this.createdAt,
  });

  factory Production.fromJson(Map<String, dynamic> json) {
    return Production(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      quantity: json['quantity'] as int,
      productionDate: DateTime.parse(json['productionDate'] as String),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'productionDate': productionDate.toIso8601String(),
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
