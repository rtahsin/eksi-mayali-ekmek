/*
 * Kullanıcı Modeli (User)
 * 
 * Bu dosya, uygulamadaki kullanıcı verilerini temsil eden User sınıfını içerir.
 * Kullanıcı bilgileri, adresleri, favori ürünleri ve diğer kullanıcı ile ilgili
 * verileri saklar ve yönetir.
 * 
 * Özellikler:
 * - Temel kullanıcı bilgileri (id, email, ad-soyad, vb.)
 * - Adres yönetimi
 * - Favori ürünler listesi
 * - Bildirim tercihleri
 * - Sadakat puanları
 * - Ödeme yöntemleri
 * 
 * Kullanılan servisler:
 * - Firestore: Kullanıcı verilerinin saklanması
 * - Authentication: Kullanıcı kimlik doğrulama
 * 
 * Güncelleme Tarihi: Haziran 2023
 */

// ignore_for_file: unnecessary_this

import 'package:cloud_firestore/cloud_firestore.dart';

import '../utils/logger.dart';

class User {
  final String id;
  final String email;
  final String fullName;
  final String phoneNumber;
  final String address;
  final List<String> favoriteProductIds;
  final DateTime createdAt;
  final DateTime? lastLoginAt;
  final bool isAdmin;
  final String role; // user, support, editor, admin, superadmin

  // Yeni eklenen alanlar
  final String? profileImageUrl;
  final DateTime? birthDate;
  final String? gender;
  final NotificationPreferences notificationPreferences;
  final List<PaymentMethod> paymentMethods;
  final int loyaltyPoints;
  final List<Address> addresses;
  final String? bio;
  final UserPreferences preferences;
  final List<String> recentlyViewedProductIds;

  // Görünen isim için getter
  String get displayName => fullName.isNotEmpty ? fullName : email.split('@').first;

  // Yaş hesaplama
  int? get age {
    if (birthDate == null) return null;
    final today = DateTime.now();
    int age = today.year - birthDate!.year;
    if (today.month < birthDate!.month ||
        (today.month == birthDate!.month && today.day < birthDate!.day)) {
      age--;
    }
    return age;
  }

  User({
    required this.id,
    required this.email,
    required this.fullName,
    this.phoneNumber = '',
    this.address = '',
    this.favoriteProductIds = const [],
    required this.createdAt,
    this.lastLoginAt,
    this.isAdmin = false,
    this.role = 'user',
    this.profileImageUrl,
    this.birthDate,
    this.gender,
    this.notificationPreferences = const NotificationPreferences(),
    this.paymentMethods = const [],
    this.loyaltyPoints = 0,
    this.addresses = const [],
    this.bio,
    this.preferences = const UserPreferences(),
    this.recentlyViewedProductIds = const [],
  });

  // Kullanıcı bilgilerini güncelle
  User copyWith({
    String? id,
    String? email,
    String? fullName,
    String? phoneNumber,
    String? address,
    List<String>? favoriteProductIds,
    DateTime? createdAt,
    DateTime? lastLoginAt,
    bool? isAdmin,
    String? role,
    String? profileImageUrl,
    DateTime? birthDate,
    String? gender,
    NotificationPreferences? notificationPreferences,
    List<PaymentMethod>? paymentMethods,
    int? loyaltyPoints,
    List<Address>? addresses,
    String? bio,
    UserPreferences? preferences,
    List<String>? recentlyViewedProductIds,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      address: address ?? this.address,
      favoriteProductIds: favoriteProductIds ?? this.favoriteProductIds,
      createdAt: createdAt ?? this.createdAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      isAdmin: isAdmin ?? this.isAdmin,
      role: role ?? this.role,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      birthDate: birthDate ?? this.birthDate,
      gender: gender ?? this.gender,
      notificationPreferences: notificationPreferences ?? this.notificationPreferences,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      addresses: addresses ?? this.addresses,
      bio: bio ?? this.bio,
      preferences: preferences ?? this.preferences,
      recentlyViewedProductIds: recentlyViewedProductIds ?? this.recentlyViewedProductIds,
    );
  }

  // Favorilere ürün ekle
  User addToFavorites(String productId) {
    if (favoriteProductIds.contains(productId)) {
      return this;
    }

    final updatedFavorites = List<String>.from(favoriteProductIds)..add(productId);
    return copyWith(favoriteProductIds: updatedFavorites);
  }

  // Favorilerden ürün çıkar
  User removeFromFavorites(String productId) {
    if (!favoriteProductIds.contains(productId)) {
      return this;
    }

    final updatedFavorites = List<String>.from(favoriteProductIds)..remove(productId);
    return copyWith(favoriteProductIds: updatedFavorites);
  }

  // Adres ekle
  User addAddress(Address address) {
    final updatedAddresses = List<Address>.from(addresses)..add(address);
    return copyWith(addresses: updatedAddresses);
  }

  // Adres güncelle
  User updateAddress(Address updatedAddress) {
    final addressIndex = addresses.indexWhere((a) => a.id == updatedAddress.id);
    if (addressIndex == -1) return this;

    final updatedAddresses = List<Address>.from(addresses);
    updatedAddresses[addressIndex] = updatedAddress;
    return copyWith(addresses: updatedAddresses);
  }

  // Adres sil
  User removeAddress(String addressId) {
    final updatedAddresses = addresses.where((a) => a.id != addressId).toList();
    return copyWith(addresses: updatedAddresses);
  }

  // Ödeme yöntemi ekle
  User addPaymentMethod(PaymentMethod paymentMethod) {
    final updatedPaymentMethods = List<PaymentMethod>.from(paymentMethods)..add(paymentMethod);
    return copyWith(paymentMethods: updatedPaymentMethods);
  }

  // Ödeme yöntemi sil
  User removePaymentMethod(String paymentMethodId) {
    final updatedPaymentMethods = paymentMethods.where((p) => p.id != paymentMethodId).toList();
    return copyWith(paymentMethods: updatedPaymentMethods);
  }

  // Sadakat puanı ekle
  User addLoyaltyPoints(int points) {
    return copyWith(loyaltyPoints: loyaltyPoints + points);
  }

  // Son görüntülenen ürün ekle
  User addToRecentlyViewed(String productId) {
    // Zaten listede varsa, önce kaldır (en başa taşımak için)
    final updatedRecentlyViewed = List<String>.from(recentlyViewedProductIds)..remove(productId);

    // Listenin başına ekle
    updatedRecentlyViewed.insert(0, productId);

    // Listeyi son 10 ürünle sınırla
    if (updatedRecentlyViewed.length > 10) {
      updatedRecentlyViewed.removeLast();
    }

    return copyWith(recentlyViewedProductIds: updatedRecentlyViewed);
  }

  // Kullanıcı tercihlerini güncelle
  User updatePreferences(UserPreferences newPreferences) {
    return copyWith(preferences: newPreferences);
  }

  // JSON'dan model oluştur - DateTime dönüşümü güvenli hale getirildi
  factory User.fromJson(Map<String, dynamic> json) {
    // createdAt alanı için güvenli dönüşüm
    DateTime parsedCreatedAt;
    try {
      if (json['createdAt'] is DateTime) {
        parsedCreatedAt = json['createdAt'] as DateTime;
      } else if (json['createdAt'] is String) {
        parsedCreatedAt = DateTime.parse(json['createdAt'] as String);
      } else if (json['createdAt'] is Timestamp) {
        parsedCreatedAt = (json['createdAt'] as Timestamp).toDate();
      } else {
        // Varsayılan olarak şu anki zaman
        parsedCreatedAt = DateTime.now();
      }
    } catch (e) {
      Logger.warning("User.fromJson createdAt parse hatası: $e");
      parsedCreatedAt = DateTime.now();
    }

    // lastLoginAt alanı için güvenli dönüşüm
    DateTime? lastLoginAt;
    try {
      if (json['lastLoginAt'] is DateTime) {
        lastLoginAt = json['lastLoginAt'] as DateTime;
      } else if (json['lastLoginAt'] is String) {
        lastLoginAt = DateTime.parse(json['lastLoginAt'] as String);
      } else if (json['lastLoginAt'] is Timestamp) {
        lastLoginAt = (json['lastLoginAt'] as Timestamp).toDate();
      }
    } catch (e) {
      Logger.warning("User.fromJson lastLoginAt parse hatası: $e");
      lastLoginAt = null;
    }

    // birthDate alanı için güvenli dönüşüm
    DateTime? birthDate;
    try {
      if (json['birthDate'] != null) {
        if (json['birthDate'] is DateTime) {
          birthDate = json['birthDate'] as DateTime;
        } else if (json['birthDate'] is String) {
          birthDate = DateTime.parse(json['birthDate'] as String);
        } else if (json['birthDate'] is Timestamp) {
          birthDate = (json['birthDate'] as Timestamp).toDate();
        }
      }
    } catch (e) {
      Logger.warning("User.fromJson birthDate parse hatası: $e");
      birthDate = null;
    }

    // Adresler için dönüşüm
    List<Address> addresses = [];
    if (json['addresses'] != null) {
      try {
        addresses = (json['addresses'] as List)
            .map((addr) => Address.fromJson(addr as Map<String, dynamic>))
            .toList();
      } catch (e) {
        Logger.warning("User.fromJson addresses parse hatası: $e");
      }
    }

    // Ödeme yöntemleri için dönüşüm
    List<PaymentMethod> paymentMethods = [];
    if (json['paymentMethods'] != null) {
      try {
        paymentMethods = (json['paymentMethods'] as List)
            .map((method) => PaymentMethod.fromJson(method as Map<String, dynamic>))
            .toList();
      } catch (e) {
        Logger.warning("User.fromJson paymentMethods parse hatası: $e");
      }
    }

    // Bildirim tercihleri için dönüşüm
    NotificationPreferences notificationPreferences = NotificationPreferences();
    if (json['notificationPreferences'] != null) {
      try {
        notificationPreferences = NotificationPreferences.fromJson(
            json['notificationPreferences'] as Map<String, dynamic>);
      } catch (e) {
        Logger.warning("User.fromJson notificationPreferences parse hatası: $e");
      }
    }

    // Kullanıcı tercihleri için dönüşüm
    UserPreferences preferences = const UserPreferences();
    if (json['preferences'] != null) {
      try {
        preferences = UserPreferences.fromJson(json['preferences'] as Map<String, dynamic>);
      } catch (e) {
        Logger.warning("User.fromJson preferences parse hatası: $e");
      }
    }

    // Son görüntülenen ürünler için dönüşüm
    List<String> recentlyViewedProductIds = [];
    if (json['recentlyViewedProductIds'] != null) {
      try {
        recentlyViewedProductIds = List<String>.from(json['recentlyViewedProductIds'] as List);
      } catch (e) {
        Logger.warning("User.fromJson recentlyViewedProductIds parse hatası: $e");
      }
    }

    // Telefon numarası dönüşümü için özel kontrol
    String phoneNumber = '';
    if (json['phoneNumber'] != null) {
      phoneNumber = json['phoneNumber'] as String;
    }

    return User(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      phoneNumber: phoneNumber, // Özel kontrol ile alınıyor
      address: json['address'] as String? ?? '',
      favoriteProductIds: List<String>.from(json['favoriteProductIds'] ?? []),
      createdAt: parsedCreatedAt,
      lastLoginAt: lastLoginAt,
      isAdmin: json['isAdmin'] as bool? ?? false,
      role: (json['role'] as String?) ?? ((json['isAdmin'] == true) ? 'admin' : 'user'),
      profileImageUrl: json['profileImageUrl'] as String?,
      birthDate: birthDate,
      gender: json['gender'] as String?,
      notificationPreferences: notificationPreferences,
      paymentMethods: paymentMethods,
      loyaltyPoints: json['loyaltyPoints'] as int? ?? 0,
      addresses: addresses,
      bio: json['bio'] as String?,
      preferences: preferences,
      recentlyViewedProductIds: recentlyViewedProductIds,
    );
  }

  // Model'den JSON oluştur - DateTime'ı her zaman string'e dönüştür
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'address': address,
      'favoriteProductIds': favoriteProductIds,
      'createdAt': createdAt.toIso8601String(), // Her zaman ISO string formatına dönüştür
      'lastLoginAt': lastLoginAt?.toIso8601String(),
      'isAdmin': isAdmin,
      'role': role,
      'user': isAdmin ? 'admin' : 'user', // legacy alan korunuyor
      'profileImageUrl': profileImageUrl,
      'birthDate': birthDate?.toIso8601String(),
      'gender': gender,
      'notificationPreferences': notificationPreferences.toJson(),
      'paymentMethods': paymentMethods.map((method) => method.toJson()).toList(),
      'loyaltyPoints': loyaltyPoints,
      'addresses': addresses.map((address) => address.toJson()).toList(),
      'bio': bio,
      'preferences': preferences.toJson(),
      'recentlyViewedProductIds': recentlyViewedProductIds,
    };
  }

  /// Firestore'dan User nesnesi oluşturur
  factory User.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return User(
      id: doc.id,
      email: data['email'] ?? '',
      fullName: data['fullName'] ?? '',
      phoneNumber: data['phoneNumber'] ?? '',
      address: data['address'] ?? '',
      favoriteProductIds: List<String>.from(data['favoriteProductIds'] ?? []),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastLoginAt: (data['lastLoginAt'] as Timestamp?)?.toDate(),
      isAdmin: data['isAdmin'] ?? false,
      role: (data['role'] ?? (data['isAdmin'] == true ? 'admin' : 'user')),
      profileImageUrl: data['profileImageUrl'],
      birthDate: (data['birthDate'] as Timestamp?)?.toDate(),
      gender: data['gender'],
      notificationPreferences: NotificationPreferences(),
      paymentMethods: [],
      loyaltyPoints: data['loyaltyPoints'] ?? 0,
      addresses: [],
      bio: data['bio'],
      preferences: UserPreferences(),
      recentlyViewedProductIds: List<String>.from(data['recentlyViewedProductIds'] ?? []),
    );
  }
}

class Address {
  final String id;
  final String title;
  final String fullAddress;
  final String city;
  final String district;
  final String postalCode;
  final bool isDefault;

  Address({
    required this.id,
    required this.title,
    required this.fullAddress,
    required this.city,
    required this.district,
    required this.postalCode,
    this.isDefault = false,
  });

  Address copyWith({
    String? id,
    String? title,
    String? fullAddress,
    String? city,
    String? district,
    String? postalCode,
    bool? isDefault,
  }) {
    return Address(
      id: id ?? this.id,
      title: title ?? this.title,
      fullAddress: fullAddress ?? this.fullAddress,
      city: city ?? this.city,
      district: district ?? this.district,
      postalCode: postalCode ?? this.postalCode,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      fullAddress: json['fullAddress'] as String? ?? '',
      city: json['city'] as String? ?? '',
      district: json['district'] as String? ?? '',
      postalCode: json['postalCode'] as String? ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'fullAddress': fullAddress,
      'city': city,
      'district': district,
      'postalCode': postalCode,
      'isDefault': isDefault,
    };
  }
}

class PaymentMethod {
  final String id;
  final String title;
  final String type; // 'credit_card', 'bank_account', etc.
  final String lastFourDigits;
  final bool isDefault;
  final Map<String, dynamic> additionalData;

  PaymentMethod({
    required this.id,
    required this.title,
    required this.type,
    required this.lastFourDigits,
    this.isDefault = false,
    this.additionalData = const {},
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? '',
      lastFourDigits: json['lastFourDigits'] as String? ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
      additionalData: json['additionalData'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'lastFourDigits': lastFourDigits,
      'isDefault': isDefault,
      'additionalData': additionalData,
    };
  }
}

class NotificationPreferences {
  final bool emailNotifications;
  final bool pushNotifications;
  final bool smsNotifications;
  final bool orderUpdates;
  final bool promotions;
  final bool newsletter;

  const NotificationPreferences({
    this.emailNotifications = true,
    this.pushNotifications = true,
    this.smsNotifications = false,
    this.orderUpdates = true,
    this.promotions = true,
    this.newsletter = false,
  });

  NotificationPreferences copyWith({
    bool? emailNotifications,
    bool? pushNotifications,
    bool? smsNotifications,
    bool? orderUpdates,
    bool? promotions,
    bool? newsletter,
  }) {
    return NotificationPreferences(
      emailNotifications: emailNotifications ?? this.emailNotifications,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      smsNotifications: smsNotifications ?? this.smsNotifications,
      orderUpdates: orderUpdates ?? this.orderUpdates,
      promotions: promotions ?? this.promotions,
      newsletter: newsletter ?? this.newsletter,
    );
  }

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      emailNotifications: json['emailNotifications'] as bool? ?? true,
      pushNotifications: json['pushNotifications'] as bool? ?? true,
      smsNotifications: json['smsNotifications'] as bool? ?? false,
      orderUpdates: json['orderUpdates'] as bool? ?? true,
      promotions: json['promotions'] as bool? ?? true,
      newsletter: json['newsletter'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emailNotifications': emailNotifications,
      'pushNotifications': pushNotifications,
      'smsNotifications': smsNotifications,
      'orderUpdates': orderUpdates,
      'promotions': promotions,
      'newsletter': newsletter,
    };
  }
}

// Kullanıcı Tercihleri sınıfı
class UserPreferences {
  final List<String> favoriteCategories;
  final List<String> dietaryPreferences; // Vejetaryen, vegan, glutensiz vb.
  final bool showRecentlyViewed;
  final bool enablePersonalizedRecommendations;
  final String preferredLanguage;
  final String preferredCurrency;
  final int maxPriceFilter;
  final List<String> allergyInformation; // Gluten, fındık, süt ürünleri vb.
  final bool preferLocalProducts;
  final bool preferOrganicProducts;

  const UserPreferences({
    this.favoriteCategories = const [],
    this.dietaryPreferences = const [],
    this.showRecentlyViewed = true,
    this.enablePersonalizedRecommendations = true,
    this.preferredLanguage = 'tr',
    this.preferredCurrency = 'TRY',
    this.maxPriceFilter = 0,
    this.allergyInformation = const [],
    this.preferLocalProducts = false,
    this.preferOrganicProducts = false,
  });

  // Kullanıcı tercihlerini güncelle
  UserPreferences copyWith({
    List<String>? favoriteCategories,
    List<String>? dietaryPreferences,
    bool? showRecentlyViewed,
    bool? enablePersonalizedRecommendations,
    String? preferredLanguage,
    String? preferredCurrency,
    int? maxPriceFilter,
    List<String>? allergyInformation,
    bool? preferLocalProducts,
    bool? preferOrganicProducts,
  }) {
    return UserPreferences(
      favoriteCategories: favoriteCategories ?? this.favoriteCategories,
      dietaryPreferences: dietaryPreferences ?? this.dietaryPreferences,
      showRecentlyViewed: showRecentlyViewed ?? this.showRecentlyViewed,
      enablePersonalizedRecommendations:
          enablePersonalizedRecommendations ?? this.enablePersonalizedRecommendations,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      preferredCurrency: preferredCurrency ?? this.preferredCurrency,
      maxPriceFilter: maxPriceFilter ?? this.maxPriceFilter,
      allergyInformation: allergyInformation ?? this.allergyInformation,
      preferLocalProducts: preferLocalProducts ?? this.preferLocalProducts,
      preferOrganicProducts: preferOrganicProducts ?? this.preferOrganicProducts,
    );
  }

  // JSON'a dönüştür
  Map<String, dynamic> toJson() {
    return {
      'favoriteCategories': favoriteCategories,
      'dietaryPreferences': dietaryPreferences,
      'showRecentlyViewed': showRecentlyViewed,
      'enablePersonalizedRecommendations': enablePersonalizedRecommendations,
      'preferredLanguage': preferredLanguage,
      'preferredCurrency': preferredCurrency,
      'maxPriceFilter': maxPriceFilter,
      'allergyInformation': allergyInformation,
      'preferLocalProducts': preferLocalProducts,
      'preferOrganicProducts': preferOrganicProducts,
    };
  }

  // JSON'dan model oluştur
  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      favoriteCategories: json['favoriteCategories'] != null
          ? List<String>.from(json['favoriteCategories'])
          : const [],
      dietaryPreferences: json['dietaryPreferences'] != null
          ? List<String>.from(json['dietaryPreferences'])
          : const [],
      showRecentlyViewed: json['showRecentlyViewed'] ?? true,
      enablePersonalizedRecommendations: json['enablePersonalizedRecommendations'] ?? true,
      preferredLanguage: json['preferredLanguage'] ?? 'tr',
      preferredCurrency: json['preferredCurrency'] ?? 'TRY',
      maxPriceFilter: json['maxPriceFilter'] ?? 0,
      allergyInformation: json['allergyInformation'] != null
          ? List<String>.from(json['allergyInformation'])
          : const [],
      preferLocalProducts: json['preferLocalProducts'] ?? false,
      preferOrganicProducts: json['preferOrganicProducts'] ?? false,
    );
  }
}
