/*
 * Saved Address Model
 * 
 * PURPOSE: Kullanıcının kayıtlı teslimat adresleri
 * LAYER: Model
 * COLLECTION: saved_addresses
 * 
 * RULES:
 * - Her kullanıcının birden fazla adresi olabilir
 * - Bir adres default olarak işaretlenebilir
 * - Firestore mapping ile serialization
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'package:cloud_firestore/cloud_firestore.dart';

/// Kayıtlı adres modeli
class SavedAddress {
  final String id;
  final String userId;
  final String title; // Örn: "Ev", "İş", "Annem"
  final String fullAddress;
  final double latitude;
  final double longitude;
  final bool isDefault;
  final String? category; // 'home', 'work', 'family', 'friend', 'other'
  final String? icon; // Emoji: '🏠', '🏢', '❤️', '👥', '📍'
  final String? color; // Hex color: '#4CAF50', '#2196F3', etc.
  final DateTime? lastUsed; // Son kullanım tarihi
  final DateTime createdAt;
  final DateTime? updatedAt;

  SavedAddress({
    required this.id,
    required this.userId,
    required this.title,
    required this.fullAddress,
    required this.latitude,
    required this.longitude,
    this.isDefault = false,
    this.category,
    this.icon,
    this.color,
    this.lastUsed,
    required this.createdAt,
    this.updatedAt,
  });

  /// Firestore'dan model oluştur
  factory SavedAddress.fromJson(Map<String, dynamic> json, String id) {
    return SavedAddress(
      id: id,
      userId: json['userId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      fullAddress: json['fullAddress'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      isDefault: json['isDefault'] as bool? ?? false,
      category: json['category'] as String?,
      icon: json['icon'] as String?,
      color: json['color'] as String?,
      lastUsed: (json['lastUsed'] as Timestamp?)?.toDate(),
      createdAt: (json['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (json['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  /// Model'den Firestore'a map
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'title': title,
      'fullAddress': fullAddress,
      'latitude': latitude,
      'longitude': longitude,
      'isDefault': isDefault,
      'category': category,
      'icon': icon,
      'color': color,
      'lastUsed': lastUsed != null ? Timestamp.fromDate(lastUsed!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    };
  }

  /// Model kopyala
  SavedAddress copyWith({
    String? id,
    String? userId,
    String? title,
    String? fullAddress,
    double? latitude,
    double? longitude,
    bool? isDefault,
    String? category,
    String? icon,
    String? color,
    DateTime? lastUsed,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SavedAddress(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      fullAddress: fullAddress ?? this.fullAddress,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isDefault: isDefault ?? this.isDefault,
      category: category ?? this.category,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      lastUsed: lastUsed ?? this.lastUsed,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'SavedAddress(id: $id, title: $title, address: $fullAddress, isDefault: $isDefault)';
  }
}
