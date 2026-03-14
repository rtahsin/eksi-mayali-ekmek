import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/saved_address.dart';
import '../utils/logger.dart';

class AddressService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _savedAddressesCollection = 'saved_addresses';

  // Beylikdüzü mahallelerini getiren metod
  Future<List<String>> getNeighborhoods() async {
    try {
      final snapshot = await _firestore.collection('neighborhoods').get();
      return snapshot.docs.map((doc) => doc.id).toList();
    } catch (e) {
      Logger.error('Mahalleler getirilirken hata: $e');
      // Firestore bağlantısında hata olursa varsayılan değerler
      return [
        'Adnan Kahveci Mah.',
        'Barış Mah.',
        'Büyükşehir Mah.',
        'Cumhuriyet Mah.',
        'Dereağzı Mah.',
        'Gürpınar Mah.',
        'Yakuplu Mah.',
        'Marmara Mah.',
      ];
    }
  }

  // Seçilen mahalleye ait sokakları getiren metod
  Future<List<String>> getStreets(String neighborhood) async {
    try {
      final doc = await _firestore.collection('neighborhoods').doc(neighborhood).get();
      if (doc.exists && doc.data()!.containsKey('streets')) {
        return List<String>.from(doc.data()!['streets']);
      }
      // Eğer mahalle veya sokaklar bulunamazsa varsayılan veriler
      return _getDefaultStreets(neighborhood);
    } catch (e) {
      Logger.error('$neighborhood için sokaklar getirilirken hata: $e');
      return _getDefaultStreets(neighborhood);
    }
  }

  // Mahallelere göre varsayılan sokaklar
  List<String> _getDefaultStreets(String neighborhood) {
    final streets = {
      'Adnan Kahveci Mah.': ['Anadolu Caddesi', '1. Sokak', '2. Sokak', 'Gardenya Sokak'],
      'Barış Mah.': ['Barış Caddesi', 'Huzur Sokak', 'Dostluk Sokak', 'Egemenlik Sokak'],
      'Büyükşehir Mah.': ['Büyükşehir Bulvarı', 'Metropol Sokak', 'Şehir Caddesi'],
      'Cumhuriyet Mah.': ['Atatürk Caddesi', 'İnönü Sokak', 'Cumhuriyet Bulvarı'],
      'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
      'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
      'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
      'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
    };

    return streets[neighborhood] ?? ['Sokak bilgisi bulunamadı'];
  }

  // Firestore'a örnek adres verilerini eklemek için kullanılabilecek metod
  Future<void> addSampleAddressData() async {
    try {
      final neighborhoods = {
        'Adnan Kahveci Mah.': ['Anadolu Caddesi', '1. Sokak', '2. Sokak', 'Gardenya Sokak'],
        'Barış Mah.': ['Barış Caddesi', 'Huzur Sokak', 'Dostluk Sokak', 'Egemenlik Sokak'],
        'Büyükşehir Mah.': ['Büyükşehir Bulvarı', 'Metropol Sokak', 'Şehir Caddesi'],
        'Cumhuriyet Mah.': ['Atatürk Caddesi', 'İnönü Sokak', 'Cumhuriyet Bulvarı'],
        'Dereağzı Mah.': ['Dereağzı Caddesi', 'Marmara Sokak', 'Deniz Sokak'],
        'Gürpınar Mah.': ['Gürpınar Caddesi', 'Sahil Yolu', 'Balıkçı Sokak'],
        'Yakuplu Mah.': ['Yakuplu Caddesi', 'Hürriyet Sokak', 'Vatan Caddesi'],
        'Marmara Mah.': ['Marmara Caddesi', 'Deniz Sokak', 'Sahil Sokak'],
      };

      for (var entry in neighborhoods.entries) {
        await _firestore.collection('neighborhoods').doc(entry.key).set({
          'streets': entry.value,
        });
      }

      Logger.info('Örnek adres verileri başarıyla eklendi.');
    } catch (e) {
      Logger.error('Örnek adres verileri eklenirken hata: $e');
      rethrow;
    }
  }

  // ============================================
  // SAVED ADDRESSES (Kayıtlı Adresler)
  // ============================================

  /// Kullanıcının tüm kayıtlı adreslerini getir
  Future<List<SavedAddress>> getUserSavedAddresses(String userId) async {
    try {
      Logger.info('Kullanıcı adresleri getiriliyor: $userId');

      final snapshot = await _firestore
          .collection(_savedAddressesCollection)
          .where('userId', isEqualTo: userId)
          .get();

      // Client-side sorting (default önce, sonra en yeni)
      final addresses =
          snapshot.docs.map((doc) => SavedAddress.fromJson(doc.data(), doc.id)).toList();

      addresses.sort((a, b) {
        if (a.isDefault != b.isDefault) {
          return a.isDefault ? -1 : 1; // Default önce
        }
        return b.createdAt.compareTo(a.createdAt); // Sonra en yeni
      });

      Logger.info('${addresses.length} adres bulundu');
      return addresses;
    } catch (e) {
      Logger.error('Adres getirme hatası: $e');
      rethrow;
    }
  }

  /// Yeni adres ekle
  Future<String> addSavedAddress(SavedAddress address) async {
    try {
      Logger.info('Yeni adres ekleniyor: ${address.title}');

      // Eğer default olarak işaretlendiyse, diğer adreslerin default'unu kaldır
      if (address.isDefault) {
        await _clearDefaultAddress(address.userId);
      }

      final docRef = await _firestore.collection(_savedAddressesCollection).add(address.toJson());

      Logger.info('Adres eklendi: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      Logger.error('Adres ekleme hatası: $e');
      rethrow;
    }
  }

  /// Adresi güncelle
  Future<void> updateSavedAddress(SavedAddress address) async {
    try {
      Logger.info('Adres güncelleniyor: ${address.id}');

      // Eğer default yapılıyorsa, diğer adreslerin default'unu kaldır
      if (address.isDefault) {
        await _clearDefaultAddress(address.userId);
      }

      await _firestore.collection(_savedAddressesCollection).doc(address.id).update({
        ...address.toJson(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      Logger.info('Adres güncellendi: ${address.id}');
    } catch (e) {
      Logger.error('Adres güncelleme hatası: $e');
      rethrow;
    }
  }

  /// Adresi sil
  Future<void> deleteSavedAddress(String addressId) async {
    try {
      Logger.info('Adres siliniyor: $addressId');

      await _firestore.collection(_savedAddressesCollection).doc(addressId).delete();

      Logger.info('Adres silindi: $addressId');
    } catch (e) {
      Logger.error('Adres silme hatası: $e');
      rethrow;
    }
  }

  /// Adresi default yap
  Future<void> setDefaultAddress(String addressId, String userId) async {
    try {
      Logger.info('Default adres ayarlanıyor: $addressId');

      // Önce tüm adreslerin default'unu kaldır
      await _clearDefaultAddress(userId);

      // Seçilen adresi default yap
      await _firestore.collection(_savedAddressesCollection).doc(addressId).update({
        'isDefault': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      Logger.info('Default adres ayarlandı: $addressId');
    } catch (e) {
      Logger.error('Default adres ayarlama hatası: $e');
      rethrow;
    }
  }

  /// Kullanıcının default adresini getir
  Future<SavedAddress?> getDefaultAddress(String userId) async {
    try {
      final snapshot = await _firestore
          .collection(_savedAddressesCollection)
          .where('userId', isEqualTo: userId)
          .where('isDefault', isEqualTo: true)
          .limit(1)
          .get();

      if (snapshot.docs.isEmpty) {
        return null;
      }

      return SavedAddress.fromJson(
        snapshot.docs.first.data(),
        snapshot.docs.first.id,
      );
    } catch (e) {
      Logger.error('Default adres getirme hatası: $e');
      return null;
    }
  }

  /// Tüm adreslerin default flag'ini kaldır (private)
  Future<void> _clearDefaultAddress(String userId) async {
    final snapshot = await _firestore
        .collection(_savedAddressesCollection)
        .where('userId', isEqualTo: userId)
        .where('isDefault', isEqualTo: true)
        .get();

    // Batch update
    final batch = _firestore.batch();
    for (final doc in snapshot.docs) {
      batch.update(doc.reference, {'isDefault': false});
    }

    await batch.commit();
    Logger.info('Default adresler temizlendi');
  }

  /// Adres sayısını getir
  Future<int> getSavedAddressCount(String userId) async {
    try {
      final snapshot = await _firestore
          .collection(_savedAddressesCollection)
          .where('userId', isEqualTo: userId)
          .get();

      return snapshot.docs.length;
    } catch (e) {
      Logger.error('Adres sayısı getirme hatası: $e');
      return 0;
    }
  }
}
