import 'package:cloud_firestore/cloud_firestore.dart';

class PaymentTransaction {
  final String id;
  final String orderId;
  final String userId;
  final String paymentMethodId;
  final double amount;
  final String currency;
  final String status; // pending, success, failed, refunded
  final String? errorMessage;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  PaymentTransaction({
    required this.id,
    required this.orderId,
    required this.userId,
    required this.paymentMethodId,
    required this.amount,
    this.currency = 'TRY',
    required this.status,
    this.errorMessage,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : metadata = metadata ?? {},
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) {
    return PaymentTransaction(
      id: json['id'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      paymentMethodId: json['paymentMethodId'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'TRY',
      status: json['status'] as String? ?? 'pending',
      errorMessage: json['errorMessage'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
      createdAt: (json['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (json['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'userId': userId,
      'paymentMethodId': paymentMethodId,
      'amount': amount,
      'currency': currency,
      'status': status,
      'errorMessage': errorMessage,
      'metadata': metadata,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  PaymentTransaction copyWith({
    String? id,
    String? orderId,
    String? userId,
    String? paymentMethodId,
    double? amount,
    String? currency,
    String? status,
    String? errorMessage,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PaymentTransaction(
      id: id ?? this.id,
      orderId: orderId ?? this.orderId,
      userId: userId ?? this.userId,
      paymentMethodId: paymentMethodId ?? this.paymentMethodId,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      errorMessage: errorMessage ?? this.errorMessage,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
