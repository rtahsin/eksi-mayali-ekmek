// ignore_for_file: prefer_const_constructors

/*
 * Satış Modeli
 * 
 * PURPOSE: Ürün satış kayıtları için model
 * LAYER: Model
 * 
 * LAST UPDATED: 2025-12-12
 */

class Sale {
  final String id;
  final String productId;
  final String productName;
  final int quantity; // Satılan adet
  final double unitPrice; // Birim fiyat
  final double totalPrice; // Toplam satış tutarı
  final String paymentMethod; // nakit, kart, havale
  final String? customerName;
  final String? customerPhone;
  final DateTime saleDate;
  final String? notes;
  final DateTime createdAt;

  Sale({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.paymentMethod,
    this.customerName,
    this.customerPhone,
    required this.saleDate,
    this.notes,
    required this.createdAt,
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    return Sale(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      quantity: json['quantity'] as int,
      unitPrice: (json['unitPrice'] as num).toDouble(),
      totalPrice: (json['totalPrice'] as num).toDouble(),
      paymentMethod: json['paymentMethod'] as String,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      saleDate: DateTime.parse(json['saleDate'] as String),
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
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
      'paymentMethod': paymentMethod,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'saleDate': saleDate.toIso8601String(),
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
