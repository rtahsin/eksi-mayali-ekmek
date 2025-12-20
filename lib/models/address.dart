/// Adres modeli
///
/// Kullanıcının adres bilgilerini tutar
class Address {
  final String id;
  final String fullName;
  final String phoneNumber;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String district;
  final String neighborhood; // Mahalle bilgisi ekledik
  final String postalCode;
  final String country;
  final bool isDefault;

  /// Formatlı adres bilgisi
  String get formattedAddress {
    final addr2 = addressLine2 != null && addressLine2!.isNotEmpty
        ? ' $addressLine2'
        : '';
    return '$addressLine1$addr2, $neighborhood, $district/$city';
  }

  const Address({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.district,
    this.neighborhood = '', // Varsayılan değer boş
    required this.postalCode,
    this.country = 'Türkiye',
    required this.isDefault,
  });

  /// Address modelini JSON'a dönüştürür
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'addressLine1': addressLine1,
      'addressLine2': addressLine2,
      'city': city,
      'district': district,
      'neighborhood': neighborhood,
      'postalCode': postalCode,
      'country': country,
      'isDefault': isDefault,
    };
  }

  /// JSON'dan Address modeli oluşturur
  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phoneNumber: json['phoneNumber'] as String,
      addressLine1: json['addressLine1'] as String,
      addressLine2: json['addressLine2'] as String?,
      city: json['city'] as String,
      district: json['district'] as String,
      neighborhood: json['neighborhood'] as String? ?? '',
      postalCode: json['postalCode'] as String,
      country: json['country'] ?? 'Türkiye',
      isDefault: json['isDefault'] as bool,
    );
  }

  /// Adresin bir kopyasını oluşturur
  Address copyWith({
    String? id,
    String? fullName,
    String? phoneNumber,
    String? addressLine1,
    String? addressLine2,
    String? city,
    String? district,
    String? neighborhood,
    String? postalCode,
    String? country,
    bool? isDefault,
  }) {
    return Address(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      addressLine1: addressLine1 ?? this.addressLine1,
      addressLine2: addressLine2 ?? this.addressLine2,
      city: city ?? this.city,
      district: district ?? this.district,
      neighborhood: neighborhood ?? this.neighborhood,
      postalCode: postalCode ?? this.postalCode,
      country: country ?? this.country,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
