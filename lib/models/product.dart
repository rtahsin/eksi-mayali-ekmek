// ignore_for_file: unnecessary_this

import 'package:cloud_firestore/cloud_firestore.dart';

import '../services/image_service.dart';

class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final double discountPercentage;
  final String imageUrl;
  final String? videoUrl; // Ürün tanıtım videosu (YouTube, Vimeo vb.)
  final String category;
  final List<String> ingredients;
  final bool isPopular;
  final bool isNew;
  final bool isFavorite;
  final int sales; // Satış sayısı
  final int stock; // Stok miktarı
  final DateTime createdAt; // Oluşturulma tarihi
  final DateTime? updatedAt; // Güncellenme tarihi
  final List<String> tags; // Etiketler
  final List<String> imageUrls; // Ek görseller
  final Map<String, dynamic>? nutritionInfo; // Besin değerleri
  final bool isAvailable;
  final bool isActive;
  final bool isFeatured;
  // Soft delete alanları
  final bool isDeleted; // Silinmiş mi?
  final DateTime? deletedAt; // Silinme zamanı
  final String? deletedBy; // Sile eden admin kullanıcı ID

  // Yeni eklenen alanlar
  final String brand; // Marka
  final bool isOrganic; // Organik mi?
  final bool isLocal; // Yerel üretim mi?
  final List<String> allergens; // Alerjenler
  final String origin; // Menşei
  final Map<String, dynamic>? sustainabilityInfo; // Sürdürülebilirlik bilgileri
  final double weight; // Ağırlık (gram)
  final String weightUnit; // Ağırlık birimi (g, kg, ml, L)
  final int preparationTime; // Hazırlama süresi (dakika)
  final int cookingTime; // Pişirme süresi (dakika)
  final int servingSize; // Porsiyon miktarı
  final String storageInstructions; // Saklama talimatları
  final DateTime? expiryDate; // Son kullanma tarihi
  final double carbonFootprint; // Karbon ayak izi

  // İndirimli fiyat hesaplaması için
  double get originalPrice =>
      discountPercentage > 0 ? price / (1 - (discountPercentage / 100)) : price;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.discountPercentage = 0,
    required this.imageUrl,
    this.videoUrl,
    required this.category,
    this.ingredients = const [],
    this.isPopular = false,
    this.isNew = false,
    this.isFavorite = false,
    this.sales = 0, // Varsayılan olarak 0
    this.stock = 0, // Varsayılan olarak 0
    DateTime? createdAt,
    this.updatedAt,
    this.tags = const [],
    this.imageUrls = const [],
    this.nutritionInfo,
    this.isAvailable = true,
    this.isActive = true,
    this.isFeatured = false,
    this.brand = '',
    this.isOrganic = false,
    this.isLocal = false,
    this.allergens = const [],
    this.origin = '',
    this.sustainabilityInfo,
    this.weight = 0,
    this.weightUnit = 'g',
    this.preparationTime = 0,
    this.cookingTime = 0,
    this.servingSize = 1,
    this.storageInstructions = '',
    this.expiryDate,
    this.carbonFootprint = 0,
    this.isDeleted = false,
    this.deletedAt,
    this.deletedBy,
  }) : createdAt = createdAt ?? DateTime.now();

  // İndirimli fiyatı hesapla
  double get discountedPrice {
    if (discountPercentage <= 0) return price;
    return price * (1 - discountPercentage / 100);
  }

  // İndirimli fiyatı hesapla (metod olarak)
  double getDiscountedPrice() {
    return discountedPrice;
  }

  // Stok durumunu kontrol et
  bool get isInStock => stock > 0;

  // Yeni bir ürün mü? (son 30 gün içinde eklenmiş)
  bool get isRecentlyAdded {
    final now = DateTime.now();
    final difference = now.difference(createdAt).inDays;
    return difference <= 30;
  }

  // Model validation metodu
  List<String> validate() {
    final errors = <String>[];

    // Name kontrolü
    if (name.trim().isEmpty) {
      errors.add('Ürün adı boş olamaz');
    } else if (name.trim().length < 3) {
      errors.add('Ürün adı en az 3 karakter olmalı');
    } else if (name.trim().length > 100) {
      errors.add('Ürün adı en fazla 100 karakter olabilir');
    }

    // Description kontrolü
    if (description.trim().isEmpty) {
      errors.add('Ürün açıklaması boş olamaz');
    } else if (description.trim().length < 10) {
      errors.add('Ürün açıklaması en az 10 karakter olmalı');
    }

    // Price kontrolü
    if (price < 0) {
      errors.add('Fiyat negatif olamaz');
    } else if (price == 0) {
      errors.add('Fiyat sıfır olamaz');
    } else if (price > 999999) {
      errors.add('Fiyat çok yüksek (maksimum 999,999)');
    }

    // Discount percentage kontrolü
    if (discountPercentage < 0) {
      errors.add('İndirim yüzdesi negatif olamaz');
    } else if (discountPercentage > 100) {
      errors.add('İndirim yüzdesi 100\'den büyük olamaz');
    }

    // Stock kontrolü
    if (stock < 0) {
      errors.add('Stok negatif olamaz');
    }

    // Category kontrolü
    if (category.trim().isEmpty) {
      errors.add('Kategori seçilmeli');
    }

    // Image URL kontrolü
    if (imageUrl.trim().isEmpty) {
      errors.add('Ürün görseli eklenme li');
    }

    // Weight kontrolü (eğer belirtilmişse)
    if (weight < 0) {
      errors.add('Ağırlık negatif olamaz');
    }

    // Preparation time kontrolü
    if (preparationTime < 0) {
      errors.add('Hazırlama süresi negatif olamaz');
    }

    // Cooking time kontrolü
    if (cookingTime < 0) {
      errors.add('Pişirme süresi negatif olamaz');
    }

    // Serving size kontrolü
    if (servingSize <= 0) {
      errors.add('Porsiyon miktarı 0\'dan büyük olmalı');
    }

    // Expiry date kontrolü (eğer varsa geçmişte olmamalı)
    if (expiryDate != null && expiryDate!.isBefore(DateTime.now())) {
      errors.add('Son kullanma tarihi geçmiş olamaz');
    }

    return errors;
  }

  // Hızlı validation (bool döndürür)
  bool get isValid => validate().isEmpty;

  // Güncelleme yapmak için kopyalama
  Product copyWith({
    String? id,
    String? name,
    String? description,
    double? price,
    double? discountPercentage,
    String? imageUrl,
    String? videoUrl,
    String? category,
    List<String>? ingredients,
    bool? isPopular,
    bool? isNew,
    bool? isFavorite,
    int? sales,
    int? stock,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<String>? tags,
    List<String>? imageUrls,
    Map<String, dynamic>? nutritionInfo,
    bool? isAvailable,
    bool? isActive,
    bool? isFeatured,
    String? brand,
    bool? isOrganic,
    bool? isLocal,
    List<String>? allergens,
    String? origin,
    Map<String, dynamic>? sustainabilityInfo,
    double? weight,
    String? weightUnit,
    int? preparationTime,
    int? cookingTime,
    int? servingSize,
    String? storageInstructions,
    DateTime? expiryDate,
    double? carbonFootprint,
    bool? isDeleted,
    DateTime? deletedAt,
    String? deletedBy,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      discountPercentage: discountPercentage ?? this.discountPercentage,
      imageUrl: imageUrl ?? this.imageUrl,
      videoUrl: videoUrl ?? this.videoUrl,
      category: category ?? this.category,
      ingredients: ingredients ?? this.ingredients,
      isPopular: isPopular ?? this.isPopular,
      isNew: isNew ?? this.isNew,
      isFavorite: isFavorite ?? this.isFavorite,
      sales: sales ?? this.sales,
      stock: stock ?? this.stock,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      tags: tags ?? this.tags,
      imageUrls: imageUrls ?? this.imageUrls,
      nutritionInfo: nutritionInfo ?? this.nutritionInfo,
      isAvailable: isAvailable ?? this.isAvailable,
      isActive: isActive ?? this.isActive,
      isFeatured: isFeatured ?? this.isFeatured,
      brand: brand ?? this.brand,
      isOrganic: isOrganic ?? this.isOrganic,
      isLocal: isLocal ?? this.isLocal,
      allergens: allergens ?? this.allergens,
      origin: origin ?? this.origin,
      sustainabilityInfo: sustainabilityInfo ?? this.sustainabilityInfo,
      weight: weight ?? this.weight,
      weightUnit: weightUnit ?? this.weightUnit,
      preparationTime: preparationTime ?? this.preparationTime,
      cookingTime: cookingTime ?? this.cookingTime,
      servingSize: servingSize ?? this.servingSize,
      storageInstructions: storageInstructions ?? this.storageInstructions,
      expiryDate: expiryDate ?? this.expiryDate,
      carbonFootprint: carbonFootprint ?? this.carbonFootprint,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedAt: deletedAt ?? this.deletedAt,
      deletedBy: deletedBy ?? this.deletedBy,
    );
  }

  // Ürünü stok durumuna göre güncelle
  Product updateStock(int newStock) {
    return copyWith(
      stock: newStock,
      updatedAt: DateTime.now(),
    );
  }

  // Satış yapıldığında ürünü güncelle
  Product incrementSales({int quantity = 1}) {
    return copyWith(
      sales: sales + quantity,
      stock: stock > 0 ? stock - quantity : 0,
      updatedAt: DateTime.now(),
    );
  }

  // JSON'dan model oluştur
  factory Product.fromJson(Map<String, dynamic> json) {
    DateTime? createdAtDateTime;
    DateTime? updatedAtDateTime;
    DateTime? expiryDateTime;

    // createdAt dönüşümü
    if (json['createdAt'] is Timestamp) {
      createdAtDateTime = (json['createdAt'] as Timestamp).toDate();
    } else if (json['createdAt'] is String) {
      try {
        createdAtDateTime = DateTime.parse(json['createdAt']);
      } catch (e) {
        createdAtDateTime = DateTime.now();
      }
    } else {
      createdAtDateTime = DateTime.now();
    }

    // updatedAt dönüşümü
    if (json['updatedAt'] is Timestamp) {
      updatedAtDateTime = (json['updatedAt'] as Timestamp).toDate();
    } else if (json['updatedAt'] is String) {
      try {
        updatedAtDateTime = DateTime.parse(json['updatedAt']);
      } catch (e) {
        updatedAtDateTime = null;
      }
    }

    // expiryDate dönüşümü
    if (json['expiryDate'] is Timestamp) {
      expiryDateTime = (json['expiryDate'] as Timestamp).toDate();
    } else if (json['expiryDate'] is String) {
      try {
        expiryDateTime = DateTime.parse(json['expiryDate']);
      } catch (e) {
        expiryDateTime = null;
      }
    }

    // imageUrl kontrolü ve varsayılan görsel ataması
    String imageUrl = json['imageUrl'] ?? '';
    if (imageUrl.isEmpty) {
      imageUrl = ImageService.getDefaultProductImage(json['name'] ?? '');
    }

    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      discountPercentage: (json['discountPercentage'] as num?)?.toDouble() ?? 0.0,
      imageUrl: imageUrl,
      videoUrl: json['videoUrl'],
      category: json['category'] ?? '',
      ingredients: List<String>.from(json['ingredients'] ?? []),
      isPopular: json['isPopular'] ?? false,
      isNew: json['isNew'] ?? false,
      isFavorite: json['isFavorite'] ?? false,
      sales: json['sales'] ?? 0,
      stock: json['stock'] ?? 0,
      createdAt: createdAtDateTime,
      updatedAt: updatedAtDateTime,
      tags: List<String>.from(json['tags'] ?? []),
      imageUrls: List<String>.from(json['imageUrls'] ?? []),
      nutritionInfo: json['nutritionInfo'],
      isAvailable: json['isAvailable'] ?? true,
      isActive: json['isActive'] ?? true,
      isFeatured: json['isFeatured'] ?? false,
      brand: json['brand'] ?? '',
      isOrganic: json['isOrganic'] ?? false,
      isLocal: json['isLocal'] ?? false,
      allergens: List<String>.from(json['allergens'] ?? []),
      origin: json['origin'] ?? '',
      sustainabilityInfo: json['sustainabilityInfo'],
      weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      weightUnit: json['weightUnit'] ?? 'g',
      preparationTime: json['preparationTime'] ?? 0,
      cookingTime: json['cookingTime'] ?? 0,
      servingSize: json['servingSize'] ?? 1,
      storageInstructions: json['storageInstructions'] ?? '',
      expiryDate: expiryDateTime,
      carbonFootprint: (json['carbonFootprint'] as num?)?.toDouble() ?? 0.0,
      isDeleted: json['isDeleted'] ?? false,
      deletedAt: json['deletedAt'] is Timestamp
          ? (json['deletedAt'] as Timestamp).toDate()
          : (json['deletedAt'] is String && (json['deletedAt'] as String).isNotEmpty)
              ? DateTime.tryParse(json['deletedAt'])
              : null,
      deletedBy: json['deletedBy'],
    );
  }

  // Model'den JSON oluştur
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'discountPercentage': discountPercentage,
      'category': category,
      'imageUrl': imageUrl,
      'videoUrl': videoUrl,
      'ingredients': ingredients,
      'isPopular': isPopular,
      'isNew': isNew,
      'isFavorite': isFavorite,
      'sales': sales,
      'stock': stock,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'tags': tags,
      'imageUrls': imageUrls,
      'nutritionInfo': nutritionInfo,
      'isAvailable': isAvailable,
      'isActive': isActive,
      'isFeatured': isFeatured,
      'brand': brand,
      'isOrganic': isOrganic,
      'isLocal': isLocal,
      'allergens': allergens,
      'origin': origin,
      'sustainabilityInfo': sustainabilityInfo,
      'weight': weight,
      'weightUnit': weightUnit,
      'preparationTime': preparationTime,
      'cookingTime': cookingTime,
      'servingSize': servingSize,
      'storageInstructions': storageInstructions,
      'expiryDate': expiryDate?.toIso8601String(),
      'carbonFootprint': carbonFootprint,
      'isDeleted': isDeleted,
      'deletedAt': deletedAt?.toIso8601String(),
      'deletedBy': deletedBy,
    };
  }

  String get displayImageUrl {
    if (imageUrl.isEmpty || !imageUrl.startsWith('http')) {
      return ImageService.getDefaultProductImage(name);
    }
    return imageUrl;
  }
}
