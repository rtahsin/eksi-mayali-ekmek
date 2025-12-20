// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:intl/intl.dart';

import '../domain/repositories/i_delivery_repository.dart';
import '../models/delivery_zone.dart';
import '../utils/logger.dart';

/// Teslimat ve lojistik işlemlerini yöneten servis
class DeliveryService with ChangeNotifier {
  final IDeliveryRepository _repository;
  final FirebaseFirestore _firestore;
  final String _collection = 'teslimat_bolgeler';

  bool _isLoading = false;
  Map<String, dynamic> _deliveryOptions = {};
  Map<String, dynamic> _deliveryZones = {};
  Map<String, dynamic> _activeDeliveries = {};
  String? _error;

  // Teslimat durumları
  static const String statusPreparing = 'preparing';
  static const String statusReady = 'ready';
  static const String statusInTransit = 'in_transit';
  static const String statusDelivered = 'delivered';
  static const String statusFailed = 'failed';

  DeliveryService(this._repository, this._firestore);

  bool get isLoading => _isLoading;
  Map<String, dynamic> get deliveryOptions => _deliveryOptions;
  Map<String, dynamic> get deliveryZones => _deliveryZones;
  Map<String, dynamic> get activeDeliveries => _activeDeliveries;
  String? get error => _error;

  /// Teslimat seçeneklerini yükle
  Future<Map<String, dynamic>> loadDeliveryOptions() async {
    try {
      _isLoading = true;
      _error = null;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      _deliveryOptions = await _repository.getDeliveryOptions();
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return _deliveryOptions;
    } catch (e) {
      _error = 'Teslimat seçenekleri yüklenirken bir hata oluştu: $e';
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return {
        'error': _error,
      };
    }
  }

  /// Aktif teslimatları yükle
  Future<Map<String, dynamic>> loadActiveDeliveries(String userId) async {
    try {
      _isLoading = true;
      _error = null;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      _activeDeliveries = await _repository.getActiveDeliveries(userId);
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return _activeDeliveries;
    } catch (e) {
      _error = 'Aktif teslimatlar yüklenirken bir hata oluştu: $e';
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return {
        'error': _error,
      };
    }
  }

  /// Sipariş durumunu güncelle
  Future<bool> updateDeliveryStatus(String orderId, String status, {String? description}) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final success =
          await _repository.updateDeliveryStatus(orderId, status, description: description);
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _error = 'Sipariş durumu güncellenirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Kurye konumunu güncelle
  Future<bool> updateCourierLocation(String orderId, double lat, double lng) async {
    try {
      _error = null;
      final success = await _repository.updateCourierLocation(orderId, lat, lng);
      notifyListeners();
      return success;
    } catch (e) {
      _error = 'Kurye konumu güncellenirken bir hata oluştu: $e';
      notifyListeners();
      return false;
    }
  }

  /// Teslimat seçeneği seç
  Future<Map<String, dynamic>> selectDeliveryOption(
      String optionId, String date, String timeSlot) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final result = await _repository.selectDeliveryOption(optionId, date, timeSlot);
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = 'Teslimat seçeneği seçilirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return {
        'success': false,
        'error': _error,
      };
    }
  }

  /// Teslimat bölgesi seç
  Future<bool> selectDeliveryZone(String orderId, String zone) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final success = await _repository.selectDeliveryZone(orderId, zone);
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _error = 'Teslimat bölgesi seçilirken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sipariş takip bilgilerini al
  Future<Map<String, dynamic>> getOrderTracking(String orderId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final trackingData = await _repository.getOrderTracking(orderId);
      _isLoading = false;
      notifyListeners();
      return trackingData;
    } catch (e) {
      _error = 'Sipariş takip bilgileri alınırken bir hata oluştu: $e';
      _isLoading = false;
      notifyListeners();
      return {
        'error': _error,
      };
    }
  }

  /// Teslimat saatlerini oluştur
  List<String> _generateDeliveryHours(DateTime date) {
    final now = DateTime.now();
    final hours = <String>[];

    // Eğer bugünse, şu andan sonraki saatleri göster
    int startHour = date.day == now.day ? now.hour + 1 : 9;

    // Saat 9'dan 21'e kadar, 1 saat aralıklarla teslimat saatleri oluştur
    for (int hour = startHour; hour <= 21; hour++) {
      hours.add('$hour:00');
    }

    return hours;
  }

  /// Tarih formatını düzenle (GG.AA.YYYY)
  String _formatDate(DateTime date) {
    return DateFormat('dd.MM.yyyy').format(date);
  }

  /// Teslimat durumu için varsayılan açıklama
  String _getDefaultStatusDescription(String status) {
    switch (status) {
      case statusPreparing:
        return 'Siparişiniz hazırlanıyor';
      case statusReady:
        return 'Siparişiniz hazır, teslimat için bekleniyor';
      case statusInTransit:
        return 'Siparişiniz yola çıktı';
      case statusDelivered:
        return 'Siparişiniz teslim edildi';
      case statusFailed:
        return 'Teslimat başarısız oldu';
      default:
        return 'Bilinmeyen durum';
    }
  }

  // Aktif teslimat bölgelerini getir
  Future<List<DeliveryZone>> getActiveDeliveryZones() async {
    try {
      _isLoading = true;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      final snapshot =
          await _firestore.collection(_collection).where('isActive', isEqualTo: true).get();

      final zones = snapshot.docs.map((doc) {
        return DeliveryZone.fromJson({
          'id': doc.id,
          ...doc.data(),
        });
      }).toList();

      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return zones;
    } catch (e) {
      Logger.error('Teslimat bölgeleri alınırken hata: $e');
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return [];
    }
  }

  // Tüm teslimat bölgelerini getir
  Future<List<DeliveryZone>> getAllDeliveryZones() async {
    try {
      _isLoading = true;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      final snapshot = await _firestore.collection(_collection).get();

      final zones = snapshot.docs.map((doc) {
        return DeliveryZone.fromJson({
          'id': doc.id,
          ...doc.data(),
        });
      }).toList();

      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return zones;
    } catch (e) {
      Logger.error('Teslimat bölgeleri alınırken hata: $e');
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      return [];
    }
  }

  // Teslimat bölgesi ekle
  Future<bool> addDeliveryZone(DeliveryZone zone) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _firestore.collection(_collection).add(zone.toJson());

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Teslimat bölgesi eklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Teslimat bölgesi güncelle
  Future<bool> updateDeliveryZone(DeliveryZone zone) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _firestore.collection(_collection).doc(zone.id).update(zone.toJson());

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Teslimat bölgesi güncellenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Teslimat bölgesi sil
  Future<bool> deleteDeliveryZone(String zoneId) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _firestore.collection(_collection).doc(zoneId).delete();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Teslimat bölgesi silinirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Teslimat bölgesi durumunu değiştir
  Future<bool> toggleDeliveryZoneStatus(String zoneId, bool isActive) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _firestore.collection(_collection).doc(zoneId).update({
        'isActive': isActive,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Teslimat bölgesi durumu güncellenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
