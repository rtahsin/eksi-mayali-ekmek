import 'package:cloud_firestore/cloud_firestore.dart';

/// Mağaza ayarları için model sınıfı
///
/// Bu sınıf, mağaza ile ilgili temel ayarları ve bilgileri içerir.
/// Firestore veritabanından alınan verilerle uyumlu çalışacak şekilde tasarlanmıştır.
class StoreSettings {
  String? id;
  String storeName;
  String address;
  String phone;
  String email;
  String? logoUrl;
  List<String> workingHours;
  bool maintenanceMode;
  String currencySymbol;
  String? seoTitle;
  String? seoDescription;
  String? seoKeywords;
  Map<String, dynamic>? socialMediaLinks;

  StoreSettings({
    this.id,
    required this.storeName,
    required this.address,
    required this.phone,
    required this.email,
    this.logoUrl,
    required this.workingHours,
    required this.maintenanceMode,
    required this.currencySymbol,
    this.seoTitle,
    this.seoDescription,
    this.seoKeywords,
    this.socialMediaLinks,
  });

  /// Firestore dokümanından StoreSettings nesnesi oluşturur
  factory StoreSettings.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return StoreSettings(
      id: doc.id,
      storeName: data['storeName'] ?? 'Ekşi Mayalı Ekmek',
      address: data['address'] ?? '',
      phone: data['phone'] ?? '',
      email: data['email'] ?? '',
      logoUrl: data['logoUrl'],
      workingHours: List<String>.from(data['workingHours'] ?? []),
      maintenanceMode: data['maintenanceMode'] ?? false,
      currencySymbol: data['currencySymbol'] ?? '₺',
      seoTitle: data['seoTitle'],
      seoDescription: data['seoDescription'],
      seoKeywords: data['seoKeywords'],
      socialMediaLinks: data['socialMediaLinks'],
    );
  }

  /// StoreSettings nesnesini Firestore için Map'e dönüştürür
  Map<String, dynamic> toFirestore() {
    return {
      'storeName': storeName,
      'address': address,
      'phone': phone,
      'email': email,
      'logoUrl': logoUrl,
      'workingHours': workingHours,
      'maintenanceMode': maintenanceMode,
      'currencySymbol': currencySymbol,
      'seoTitle': seoTitle,
      'seoDescription': seoDescription,
      'seoKeywords': seoKeywords,
      'socialMediaLinks': socialMediaLinks,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  /// Varsayılan mağaza ayarlarını döndürür
  static StoreSettings getDefaultSettings() {
    return StoreSettings(
        storeName: 'Ekşi Mayalı Ekmek',
        address: 'İstanbul, Türkiye',
        phone: '+90 555 123 4567',
        email: 'info@eksimayaliekmek.com',
        workingHours: [
          'Pazartesi - Cuma: 08:00 - 18:00',
          'Cumartesi: 09:00 - 17:00',
          'Pazar: Kapalı'
        ],
        maintenanceMode: false,
        currencySymbol: '₺',
        socialMediaLinks: {
          'instagram': 'https://instagram.com/eksimayaliekmek',
          'facebook': 'https://facebook.com/eksimayaliekmek',
          'twitter': 'https://twitter.com/eksimayaliekmek'
        });
  }
}
