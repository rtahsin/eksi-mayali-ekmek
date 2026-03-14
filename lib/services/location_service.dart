// ignore_for_file: use_build_context_synchronously

/*
 * Location Service
 * 
 * PURPOSE: Konum alma ve yönetimi için merkezi servis
 * LAYER: Service
 * DEPENDS ON: Geolocator, Geocoding, LocationPermissionDialog
 * 
 * RULES:
 * - Permission rationale göster
 * - GPS kontrolü yap
 * - Error handling kapsamlı olmalı
 * - Offline durum desteği
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart' hide LocationServiceDisabledException;

import '../utils/logger.dart';
import '../widgets/location_permission_dialog.dart';

/// Konum servisi
///
/// Kullanıcı konumu alma, adres dönüştürme ve permission yönetimi
class LocationService {
  /// Mevcut konumu al
  ///
  /// [context] verilirse permission rationale dialog gösterilir
  /// [showRationale] false yapılırsa dialog gösterilmez
  static Future<Position?> getCurrentLocation({
    BuildContext? context,
    bool showRationale = true,
  }) async {
    try {
      // Permission kontrolü
      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        // Rationale dialog göster (context varsa ve showRationale true ise)
        if (context != null && showRationale) {
          final shouldRequest = await showDialog<bool>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => LocationPermissionDialog(),
          );

          if (shouldRequest != true) {
            Logger.info('Kullanıcı konum izni vermedi (rationale red)');
            return null;
          }
        }

        // İzin iste
        permission = await Geolocator.requestPermission();

        if (permission == LocationPermission.denied) {
          Logger.warning('Konum izni reddedildi');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        Logger.error('Konum izni kalıcı olarak reddedildi');
        throw Exception(
          'Konum izni kalıcı olarak reddedildi. Lütfen uygulama ayarlarından izin verin.',
        );
      }

      // GPS açık mı kontrol et
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        Logger.warning('GPS kapalı');
        throw GpsDisabledException(
          'GPS kapalı. Lütfen GPS\'i açın.',
        );
      }

      // Konum al
      Logger.info('Konum alınıyor...');
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 10),
      );

      Logger.info(
        'Konum alındı: ${position.latitude}, ${position.longitude} (accuracy: ${position.accuracy}m)',
      );

      return position;
    } on TimeoutException catch (e) {
      Logger.error('Konum alma zaman aşımı: $e');
      throw Exception('Konum alınamadı. Zaman aşımı.');
    } on GpsDisabledException catch (e) {
      Logger.error('GPS kapalı: ${e.message}');
      rethrow;
    } catch (e) {
      Logger.error('Konum alma hatası: $e');
      rethrow;
    }
  }

  /// Son bilinen konumu al (hızlı ama güncel olmayabilir)
  static Future<Position?> getLastKnownLocation() async {
    try {
      final position = await Geolocator.getLastKnownPosition();
      if (position != null) {
        Logger.info('Son bilinen konum: ${position.latitude}, ${position.longitude}');
      } else {
        Logger.warning('Son bilinen konum bulunamadı');
      }
      return position;
    } catch (e) {
      Logger.error('Son konum alma hatası: $e');
      return null;
    }
  }

  /// Koordinatlardan adres al (Reverse Geocoding)
  static Future<String?> getAddressFromCoordinates(
    double latitude,
    double longitude,
  ) async {
    try {
      Logger.info('Adres alınıyor: $latitude, $longitude');

      final placemarks = await placemarkFromCoordinates(latitude, longitude);

      if (placemarks.isEmpty) {
        Logger.warning('Adres bulunamadı');
        return null;
      }

      final place = placemarks.first;

      // Adres parçalarını birleştir
      final addressParts = <String>[];

      if (place.street != null && place.street!.isNotEmpty) {
        addressParts.add(place.street!);
      }

      if (place.subLocality != null && place.subLocality!.isNotEmpty) {
        addressParts.add(place.subLocality!);
      }

      if (place.locality != null && place.locality!.isNotEmpty) {
        addressParts.add(place.locality!);
      }

      if (place.administrativeArea != null && place.administrativeArea!.isNotEmpty) {
        addressParts.add(place.administrativeArea!);
      }

      final address = addressParts.join(', ');
      Logger.info('Adres bulundu: $address');

      return address.isNotEmpty ? address : null;
    } catch (e) {
      Logger.error('Adres alma hatası: $e');
      return null;
    }
  }

  /// Konum accuracy kontrolü
  ///
  /// Dönen değerler:
  /// - 'high': < 50m
  /// - 'medium': 50m - 100m
  /// - 'low': > 100m
  static String getAccuracyLevel(double accuracy) {
    if (accuracy < 50) return 'high';
    if (accuracy < 100) return 'medium';
    return 'low';
  }

  /// GPS ayarlarını aç
  static Future<void> openLocationSettings() async {
    try {
      await Geolocator.openLocationSettings();
      Logger.info('GPS ayarları açıldı');
    } catch (e) {
      Logger.error('GPS ayarları açılamadı: $e');
    }
  }

  /// İki konum arası mesafe hesapla (metre)
  static double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }
}

/// GPS kapalı exception
class GpsDisabledException implements Exception {
  final String message;
  GpsDisabledException(this.message);

  @override
  String toString() => message;
}
