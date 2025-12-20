import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/logger.dart';

class PrivacyService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Kullanıcının KVKK izinlerini günceller
  Future<void> updateUserConsent(
      String userId, Map<String, bool> consents) async {
    try {
      await _firestore.collection('users').doc(userId).update({
        'privacyConsents': consents,
        'privacyConsentUpdatedAt': FieldValue.serverTimestamp(),
      });

      // Yerel olarak da saklayalım
      final prefs = await SharedPreferences.getInstance();
      for (var entry in consents.entries) {
        await prefs.setBool('consent_${entry.key}', entry.value);
      }

      Logger.info('Kullanıcı $userId için KVKK izinleri güncellendi');
    } catch (e) {
      Logger.error('KVKK izinleri güncellenirken hata: $e');
      rethrow;
    }
  }

  /// Kullanıcının KVKK izinlerini getirir
  Future<Map<String, bool>> getUserConsents(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (doc.exists && doc.data()!.containsKey('privacyConsents')) {
        return Map<String, bool>.from(doc.data()!['privacyConsents']);
      }
      return {
        'marketing': false,
        'analytics': false,
        'functionalities': true,
        'thirdParty': false
      };
    } catch (e) {
      Logger.error('KVKK izinleri alınırken hata: $e');

      // Hata durumunda yerel depolamadan kontrol et
      final prefs = await SharedPreferences.getInstance();
      return {
        'marketing': prefs.getBool('consent_marketing') ?? false,
        'analytics': prefs.getBool('consent_analytics') ?? false,
        'functionalities': prefs.getBool('consent_functionalities') ?? true,
        'thirdParty': prefs.getBool('consent_thirdParty') ?? false,
      };
    }
  }

  /// Veri Silme Talebi İşleme
  Future<String> createDataDeletionRequest(String userId, String reason) async {
    try {
      final ref = await _firestore.collection('dataDeletionRequests').add({
        'userId': userId,
        'reason': reason,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
      });
      Logger.info('Veri silme talebi oluşturuldu: ${ref.id}');
      return ref.id;
    } catch (e) {
      Logger.error('Veri silme talebi oluşturulurken hata: $e');
      rethrow;
    }
  }

  /// Kullanıcının verilerini talep etme
  Future<Map<String, dynamic>> requestUserData(String userId) async {
    try {
      // Kullanıcıya ait tüm verileri topla
      final userData = await _firestore.collection('users').doc(userId).get();
      final userOrders = await _firestore
          .collection('orders')
          .where('userId', isEqualTo: userId)
          .get();

      // GDPR formatında veri paketi oluştur
      final dataExport = {
        'userData': userData.data(),
        'orders': userOrders.docs.map((doc) => doc.data()).toList(),
        'exportDate': DateTime.now().toIso8601String(),
      };

      // Talep kaydı oluştur
      await _firestore.collection('dataExportRequests').add({
        'userId': userId,
        'status': 'completed',
        'createdAt': FieldValue.serverTimestamp(),
        'completedAt': FieldValue.serverTimestamp(),
      });

      return dataExport;
    } catch (e) {
      Logger.error('Kullanıcı verileri talep edilirken hata: $e');
      rethrow;
    }
  }

  /// Çerez kabul durumunu kaydet
  Future<void> saveCookieConsent(bool accepted,
      {Map<String, bool>? details}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('cookieConsent', accepted);

      if (details != null) {
        for (var entry in details.entries) {
          await prefs.setBool('cookieConsent_${entry.key}', entry.value);
        }
      }
    } catch (e) {
      Logger.error('Çerez izni kaydedilirken hata: $e');
    }
  }

  /// Çerez kabul durumunu kontrol et
  Future<bool> getCookieConsent() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool('cookieConsent') ?? false;
    } catch (e) {
      Logger.error('Çerez izni kontrol edilirken hata: $e');
      return false;
    }
  }
}
