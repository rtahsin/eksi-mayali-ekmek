import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/settings/store_settings.dart';
import '../utils/logger.dart';

/// Ayarlar servisi, uygulama genelinde kullanılacak olan ayarları yöneten servistir.
///
/// Bu servis, Firestore veritabanından ayarları çeker ve günceller.
/// Singleton pattern kullanarak tüm uygulama genelinde tek bir örneğinin olmasını sağlar.
class SettingsService {
  // Singleton pattern
  static final SettingsService _instance = SettingsService._internal();
  factory SettingsService() => _instance;
  SettingsService._internal();

  // Firestore referansları
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'settings';
  final String _document = 'store';

  // Mağaza ayarları
  StoreSettings? _storeSettings;

  // Ayarların yüklenip yüklenmediğini kontrol eden değişken
  bool _isLoaded = false;

  /// Mağaza ayarlarını döndürür. Eğer ayarlar henüz yüklenmemişse, varsayılan ayarları döndürür.
  StoreSettings get storeSettings =>
      _storeSettings ?? StoreSettings.getDefaultSettings();

  /// Ayarların yüklenip yüklenmediğini kontrol eder.
  bool get isLoaded => _isLoaded;

  /// Mağaza ayarlarını Firestore'dan yükler
  Future<StoreSettings> loadStoreSettings() async {
    try {
      DocumentSnapshot doc =
          await _firestore.collection(_collection).doc(_document).get();

      if (doc.exists) {
        Logger.info('Mağaza ayarları Firestore\'dan başarıyla yüklendi.');
        _storeSettings = StoreSettings.fromFirestore(doc);
      } else {
        Logger.warning(
            'Mağaza ayarları bulunamadı, varsayılan ayarlar kullanılacak.');
        _storeSettings = StoreSettings.getDefaultSettings();
        // Varsayılan ayarları Firestore'a kaydet
        await saveStoreSettings(_storeSettings!);
      }

      _isLoaded = true;
      return _storeSettings!;
    } catch (e) {
      Logger.error('Mağaza ayarları yüklenirken hata oluştu: $e');
      _isLoaded = false;
      rethrow;
    }
  }

  /// Mağaza ayarlarını Firestore'a kaydeder
  Future<void> saveStoreSettings(StoreSettings settings) async {
    try {
      await _firestore.collection(_collection).doc(_document).set(
            settings.toFirestore(),
            SetOptions(merge: true),
          );

      // Lokal verileri güncelle
      _storeSettings = settings;
      _isLoaded = true;

      Logger.info('Mağaza ayarları başarıyla kaydedildi.');
    } catch (e) {
      Logger.error('Mağaza ayarları kaydedilirken hata oluştu: $e');
      rethrow;
    }
  }

  /// Bakım modunu açar/kapatır
  Future<void> toggleMaintenanceMode(bool value) async {
    try {
      await _firestore.collection(_collection).doc(_document).update({
        'maintenanceMode': value,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Lokal verileri güncelle
      if (_storeSettings != null) {
        _storeSettings!.maintenanceMode = value;
      }

      Logger.info('Bakım modu ${value ? "açıldı" : "kapatıldı"}.');
    } catch (e) {
      Logger.error('Bakım modu değiştirilirken hata oluştu: $e');
      rethrow;
    }
  }

  /// Mağaza ayarlarının değişikliklerini dinler
  Stream<StoreSettings> listenToStoreSettings() {
    return _firestore
        .collection(_collection)
        .doc(_document)
        .snapshots()
        .map((doc) {
      if (doc.exists) {
        _storeSettings = StoreSettings.fromFirestore(doc);
        _isLoaded = true;
        return _storeSettings!;
      } else {
        _storeSettings = StoreSettings.getDefaultSettings();
        _isLoaded = true;
        return _storeSettings!;
      }
    });
  }

  /// Verileri sıfırlar ve varsayılan ayarları kullanır
  void reset() {
    _storeSettings = null;
    _isLoaded = false;
  }
}
