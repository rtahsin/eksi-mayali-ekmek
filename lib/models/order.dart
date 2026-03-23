// ignore_for_file: unused_import, prefer_collection_literals, unreachable_switch_default

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../utils/logger.dart';
import 'order_item.dart';

enum OrderStatus { pending, processing, ready, delivered, cancelled }

extension OrderStatusExtension on OrderStatus {
  String get displayName {
    switch (this) {
      case OrderStatus.pending:
        return 'Sipariş Alındı';
      case OrderStatus.processing:
        return 'Hazırlanıyor';
      case OrderStatus.ready:
        return 'Hazır - Alınabilir';
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

  static OrderStatus fromIndex(int index) {
    if (index >= 0 && index < OrderStatus.values.length) {
      return OrderStatus.values[index];
    }
    return OrderStatus.pending;
  }
}

class OrderReview {
  final double rating;
  final String comment;
  final DateTime date;

  OrderReview({
    required this.rating,
    required this.comment,
    required this.date,
  });

  factory OrderReview.fromJson(Map<String, dynamic> json) {
    return OrderReview(
      rating: json['rating'].toDouble(),
      comment: json['comment'],
      date: DateTime.parse(json['date']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rating': rating,
      'comment': comment,
      'date': date.toIso8601String(),
    };
  }
}

class Order {
  final String id;
  final String userId;
  final List<OrderItem> items;
  final double? amount;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String shippingAddress;
  final OrderStatus orderStatus;
  final DateTime dateTime;
  final DateTime orderDate;
  final String paymentMethod;
  final String notes;
  final OrderReview? review;
  final Map<String, dynamic>? metadata;
  final List<Map<String, dynamic>> statusHistory; // [{status, changedAt, changedByRole, changedBy}]
  final String? createdByUid;
  final DateTime? createdAt;

  // Konum bilgileri (teslimat için)
  final double? latitude;
  final double? longitude;
  final String? locationUrl; // Google Maps link

  // 🆕 Haftalık teslimat sistemi için yeni alanlar
  final String? deliveryDate; // "2026-01-24" (YYYY-MM-DD format)
  final String? estimatedArrivalTime; // "14:00-16:00"
  final int? deliverySequence; // Rota sırası: 1, 2, 3...
  final DateTime? productionStartedAt; // Üretim başlangıç zamanı
  final DateTime? deliveredAt; // Teslim edilme zamanı

  Order({
    required this.id,
    required this.userId,
    required this.items,
    this.amount,
    required this.customerName,
    required this.customerEmail,
    required this.customerPhone,
    required this.shippingAddress,
    required this.orderStatus,
    required this.dateTime,
    DateTime? orderDate,
    required this.paymentMethod,
    required this.notes,
    this.review,
    this.metadata,
    this.statusHistory = const [],
    this.createdByUid,
    this.createdAt,
    this.latitude,
    this.longitude,
    this.locationUrl,
    this.deliveryDate,
    this.estimatedArrivalTime,
    this.deliverySequence,
    this.productionStartedAt,
    this.deliveredAt,
  }) : orderDate = orderDate ?? dateTime;

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      items: (json['items'] as List? ?? [])
          .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      amount: (json['amount'] as num?)?.toDouble(),
      customerName: json['customerName'] as String? ?? '',
      customerEmail: json['customerEmail'] as String? ?? '',
      customerPhone: json['customerPhone'] as String? ?? '',
      shippingAddress: json['shippingAddress'] as String? ?? '',
      orderStatus: OrderStatusExtension.fromString(json['status'] as String? ?? 'pending'),
      dateTime:
          json['dateTime'] != null ? (json['dateTime'] as Timestamp).toDate() : DateTime.now(),
      orderDate:
          json['orderDate'] != null ? (json['orderDate'] as Timestamp).toDate() : DateTime.now(),
      paymentMethod: json['paymentMethod'] as String? ?? 'cash',
      notes: json['notes'] as String? ?? '',
      review: json['review'] != null
          ? OrderReview.fromJson(json['review'] as Map<String, dynamic>)
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
      statusHistory: (json['statusHistory'] is List)
          ? (json['statusHistory'] as List)
              .whereType<Map<String, dynamic>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : const [],
        createdByUid: json['createdByUid'] as String?,
        createdAt:
          json['createdAt'] != null ? (json['createdAt'] as Timestamp).toDate() : null,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      locationUrl: json['locationUrl'] as String?,
      deliveryDate: json['deliveryDate'] as String?,
      estimatedArrivalTime: json['estimatedArrivalTime'] as String?,
      deliverySequence: json['deliverySequence'] as int?,
      productionStartedAt: json['productionStartedAt'] != null
          ? (json['productionStartedAt'] as Timestamp).toDate()
          : null,
      deliveredAt: json['deliveredAt'] != null ? (json['deliveredAt'] as Timestamp).toDate() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'items': items.map((item) => item.toJson()).toList(),
      'amount': amount,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'shippingAddress': shippingAddress,
      'status': orderStatus.value,
      'dateTime': Timestamp.fromDate(dateTime),
      'orderDate': Timestamp.fromDate(orderDate),
      'paymentMethod': paymentMethod,
      'notes': notes,
      if (review != null) 'review': review!.toJson(),
      if (metadata != null) 'metadata': metadata,
      if (statusHistory.isNotEmpty) 'statusHistory': statusHistory,
      if (createdByUid != null) 'createdByUid': createdByUid,
      if (createdAt != null) 'createdAt': Timestamp.fromDate(createdAt!),
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (locationUrl != null) 'locationUrl': locationUrl,
      if (deliveryDate != null) 'deliveryDate': deliveryDate,
      if (estimatedArrivalTime != null) 'estimatedArrivalTime': estimatedArrivalTime,
      if (deliverySequence != null) 'deliverySequence': deliverySequence,
      if (productionStartedAt != null)
        'productionStartedAt': Timestamp.fromDate(productionStartedAt!),
      if (deliveredAt != null) 'deliveredAt': Timestamp.fromDate(deliveredAt!),
    };
  }

  Order copyWith({
    String? id,
    String? userId,
    List<OrderItem>? items,
    double? amount,
    String? customerName,
    String? customerEmail,
    String? customerPhone,
    String? shippingAddress,
    OrderStatus? orderStatus,
    DateTime? dateTime,
    DateTime? orderDate,
    String? paymentMethod,
    String? notes,
    OrderReview? review,
    Map<String, dynamic>? metadata,
    List<Map<String, dynamic>>? statusHistory,
    String? createdByUid,
    DateTime? createdAt,
    double? latitude,
    double? longitude,
    String? locationUrl,
    String? deliveryDate,
    String? estimatedArrivalTime,
    int? deliverySequence,
    DateTime? productionStartedAt,
    DateTime? deliveredAt,
  }) {
    return Order(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      items: items ?? this.items,
      amount: amount ?? this.amount,
      customerName: customerName ?? this.customerName,
      customerEmail: customerEmail ?? this.customerEmail,
      customerPhone: customerPhone ?? this.customerPhone,
      shippingAddress: shippingAddress ?? this.shippingAddress,
      orderStatus: orderStatus ?? this.orderStatus,
      dateTime: dateTime ?? this.dateTime,
      orderDate: orderDate ?? this.orderDate,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      notes: notes ?? this.notes,
      review: review ?? this.review,
      metadata: metadata ?? this.metadata,
      statusHistory: statusHistory ?? this.statusHistory,
      createdByUid: createdByUid ?? this.createdByUid,
      createdAt: createdAt ?? this.createdAt,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      locationUrl: locationUrl ?? this.locationUrl,
      deliveryDate: deliveryDate ?? this.deliveryDate,
      estimatedArrivalTime: estimatedArrivalTime ?? this.estimatedArrivalTime,
      deliverySequence: deliverySequence ?? this.deliverySequence,
      productionStartedAt: productionStartedAt ?? this.productionStartedAt,
      deliveredAt: deliveredAt ?? this.deliveredAt,
    );
  }

  // Model validation metodu
  List<String> validate() {
    final errors = <String>[];

    // Customer name kontrolü
    if (customerName.trim().isEmpty) {
      errors.add('Müşteri adı boş olamaz');
    } else if (customerName.trim().length < 2) {
      errors.add('Müşteri adı en az 2 karakter olmalı');
    }

    // Customer email kontrolü
    if (customerEmail.trim().isNotEmpty) {
      final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
      if (!emailRegex.hasMatch(customerEmail.trim())) {
        errors.add('Geçerli bir e-posta adresi giriniz');
      }
    }

    // Customer phone kontrolü
    if (customerPhone.trim().isEmpty) {
      errors.add('Telefon numarası boş olamaz');
    } else {
      final phoneRegex = RegExp(r'^\d{10,11}$'); // 10-11 rakam
      final cleanPhone = customerPhone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
      if (!phoneRegex.hasMatch(cleanPhone)) {
        errors.add('Geçerli bir telefon numarası giriniz (10-11 rakam)');
      }
    }

    // Shipping address kontrolü
    if (shippingAddress.trim().isEmpty) {
      errors.add('Teslimat adresi boş olamaz');
    } else if (shippingAddress.trim().length < 10) {
      errors.add('Teslimat adresi en az 10 karakter olmalı');
    }

    // Items kontrolü
    if (items.isEmpty) {
      errors.add('Sipariş en az 1 ürün içermeli');
    }

    // Amount kontrolü
    if (amount != null && amount! < 0) {
      errors.add('Sipariş tutarı negatif olamaz');
    }

    // Payment method kontrolü
    if (paymentMethod.trim().isEmpty) {
      errors.add('Ödeme yöntemi seçilmeli');
    }

    return errors;
  }

  // Hızlı validation (bool döndürür)
  bool get isValid => validate().isEmpty;

  // Toplam hesaplama
  double get total {
    if (amount != null && amount! > 0) {
      return amount!;
    }
    return items.fold(0.0, (sum, item) => sum + item.price * item.quantity);
  }

  // Firestore belgesinden Order oluştur
  factory Order.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    // Ürün öğelerini dönüştür
    List<OrderItem> orderItems = [];
    if (data['items'] != null) {
      orderItems = (data['items'] as List).map((item) {
        return OrderItem.fromJson(Map<String, dynamic>.from(item));
      }).toList();
    }

    // Sipariş durumunu belirle
    OrderStatus status = OrderStatus.pending;
    try {
      if (data['orderStatus'] != null) {
        // orderStatus bir string ise
        if (data['orderStatus'] is String) {
          status = OrderStatusExtension.fromString(data['orderStatus']);
        }
        // orderStatus bir sayı ise (index)
        else if (data['orderStatus'] is int) {
          status = OrderStatusExtension.fromIndex(data['orderStatus']);
        }
      }
      // Eski veri yapısı için status alanını kontrol et
      else if (data['status'] != null) {
        if (data['status'] is String) {
          status = OrderStatusExtension.fromString(data['status']);
        } else if (data['status'] is int) {
          status = OrderStatusExtension.fromIndex(data['status']);
        }
      }
    } catch (e) {
      Logger.error('Order status dönüştürme hatası: $e');
      status = OrderStatus.pending; // Hata durumunda varsayılan değer
    }

    // Tarih alanlarını dönüştür
    DateTime dateTime = DateTime.now();
    if (data['dateTime'] != null) {
      dateTime = (data['dateTime'] is Timestamp)
          ? (data['dateTime'] as Timestamp).toDate()
          : DateTime.parse(data['dateTime'].toString());
    }

    DateTime orderDate = dateTime;
    if (data['orderDate'] != null) {
      try {
        orderDate = (data['orderDate'] is Timestamp)
            ? (data['orderDate'] as Timestamp).toDate()
            : DateTime.parse(data['orderDate'].toString());
      } catch (e) {
        Logger.error('orderDate dönüştürme hatası: $e');
        orderDate = dateTime; // Hata durumunda dateTime kullan
      }
    }

    // Değerlendirme alanını dönüştür
    OrderReview? review;
    if (data['review'] != null) {
      try {
        review = OrderReview.fromJson(Map<String, dynamic>.from(data['review']));
      } catch (e) {
        Logger.error('Review dönüştürme hatası: $e');
      }
    }

    // Order nesnesini oluştur
    return Order(
      id: doc.id,
      userId: data['userId'] ?? '',
      items: orderItems,
      amount: (data['amount'] is num) ? (data['amount'] as num).toDouble() : null,
      customerName: data['customerName'] ?? '',
      customerEmail: data['customerEmail'] ?? '',
      customerPhone: data['customerPhone'] ?? '',
      shippingAddress: data['shippingAddress'] ?? '',
      orderStatus: status,
      dateTime: dateTime,
      orderDate: orderDate,
      paymentMethod: data['paymentMethod'] ?? 'Belirtilmedi',
      notes: data['notes'] ?? '',
      review: review,
      metadata: data['metadata'] as Map<String, dynamic>?,
      statusHistory: (data['statusHistory'] is List)
          ? (data['statusHistory'] as List)
              .whereType<Map<String, dynamic>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : const [],
        createdByUid: data['createdByUid'] as String?,
        createdAt:
          data['createdAt'] != null ? (data['createdAt'] as Timestamp).toDate() : null,
    );
  }
}
