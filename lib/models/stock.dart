// ignore_for_file: prefer_const_constructors

/*
 * Stok Modeli
 * 
 * PURPOSE: Ürün stok durumu için model
 * LAYER: Model
 * 
 * LAST UPDATED: 2025-12-12
 */

class Stock {
  final String productId;
  final String productName;
  final int quantity; // Mevcut stok adedi
  final int minQuantity; // Minimum stok seviyesi (alarm için)
  final DateTime lastUpdated;

  Stock({
    required this.productId,
    required this.productName,
    required this.quantity,
    this.minQuantity = 5,
    required this.lastUpdated,
  });

  bool get isLowStock => quantity <= minQuantity;

  factory Stock.fromJson(Map<String, dynamic> json) {
    return Stock(
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      quantity: json['quantity'] as int,
      minQuantity: json['minQuantity'] as int? ?? 5,
      lastUpdated: DateTime.parse(json['lastUpdated'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'minQuantity': minQuantity,
      'lastUpdated': lastUpdated.toIso8601String(),
    };
  }
}
