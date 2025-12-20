import 'package:cloud_firestore/cloud_firestore.dart';

class Category {
  final String id;
  final String name;
  final String description;
  final String imageUrl;
  final int productCount;
  final bool isActive;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Category({
    required this.id,
    required this.name,
    this.description = '',
    this.imageUrl = '',
    this.productCount = 0,
    this.isActive = true,
    DateTime? createdAt,
    this.updatedAt,
  }) : createdAt = createdAt ?? DateTime.now();

  // Firestore'dan kategori oluştur
  factory Category.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Category(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      imageUrl: data['imageUrl'] ?? '',
      productCount: data['productCount'] ?? 0,
      isActive: data['isActive'] ?? true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  // Firestore için Map oluştur
  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'productCount': productCount,
      'isActive': isActive,
      'createdAt': createdAt,
      'updatedAt': updatedAt ?? FieldValue.serverTimestamp(),
    };
  }

  // Kategoriyi güncelle
  Category copyWith({
    String? id,
    String? name,
    String? description,
    String? imageUrl,
    int? productCount,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Category(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      productCount: productCount ?? this.productCount,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
