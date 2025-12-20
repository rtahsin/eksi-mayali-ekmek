import 'package:cloud_firestore/cloud_firestore.dart';

class PaymentMethod {
  final String id;
  final String userId;
  final String type; // credit_card, bank_transfer, wallet
  final String title;
  final Map<String, dynamic> details;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime updatedAt;

  PaymentMethod({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.details,
    this.isDefault = false,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      type: json['type'] as String? ?? '',
      title: json['title'] as String? ?? '',
      details: json['details'] as Map<String, dynamic>? ?? {},
      isDefault: json['isDefault'] as bool? ?? false,
      createdAt: (json['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (json['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'type': type,
      'title': title,
      'details': details,
      'isDefault': isDefault,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  PaymentMethod copyWith({
    String? id,
    String? userId,
    String? type,
    String? title,
    Map<String, dynamic>? details,
    bool? isDefault,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PaymentMethod(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      title: title ?? this.title,
      details: details ?? this.details,
      isDefault: isDefault ?? this.isDefault,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
