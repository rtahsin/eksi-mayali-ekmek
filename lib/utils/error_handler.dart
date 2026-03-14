/*
 * Error Handler - Centralized Error Handling Middleware
 * 
 * PURPOSE: Tüm hataları merkezi bir yerden yönetmek
 * LAYER: Utility
 * DEPENDS ON: ToastHelper, Logger
 * 
 * RULES:
 * - Tüm try-catch bloklarında bu handler'ı kullan
 * - handleError() metodu ile otomatik hata tiplendirme
 * - Kullanıcıya user-friendly mesajlar göster
 * - Backend'e detailed log gönder
 * 
 * LAST UPDATED: 30 Aralık 2025
 */

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/material.dart';

import 'logger.dart';
import 'toast_helper.dart';

class ErrorHandler {
  // Ana error handling metodu
  static void handleError(
    dynamic error, {
    required BuildContext context,
    String? customMessage,
    bool showToast = true,
    StackTrace? stackTrace,
  }) {
    // Detaylı log (backend için)
    Logger.error('Error: $error');
    if (stackTrace != null) {
      Logger.error('StackTrace: $stackTrace');
    }

    // Hata tipine göre user-friendly mesaj oluştur
    final userMessage = _getUserFriendlyMessage(error, customMessage);

    // Toast göster (opsiyonel)
    if (showToast && context.mounted) {
      ToastHelper.showErrorToast(context, userMessage);
    }

    // TODO: Crashlytics/Sentry entegrasyonu için
    // _sendToMonitoringService(error, stackTrace);
  }

  // Hata tipine göre user-friendly mesaj döndür
  static String _getUserFriendlyMessage(dynamic error, String? customMessage) {
    // Custom mesaj varsa öncelikli
    if (customMessage != null && customMessage.isNotEmpty) {
      return customMessage;
    }

    // Firebase Auth hataları
    if (error is firebase_auth.FirebaseAuthException) {
      return _getAuthErrorMessage(error);
    }

    // Firestore hataları
    if (error is FirebaseException) {
      return _getFirestoreErrorMessage(error);
    }

    // Network hataları
    if (error.toString().contains('SocketException') ||
        error.toString().contains('NetworkError') ||
        error.toString().contains('Failed host lookup')) {
      return 'İnternet bağlantınızı kontrol edin';
    }

    // Timeout hataları
    if (error.toString().contains('TimeoutException') || error.toString().contains('Timed out')) {
      return 'İşlem zaman aşımına uğradı, lütfen tekrar deneyin';
    }

    // Format hataları
    if (error is FormatException) {
      return 'Geçersiz veri formatı';
    }

    // Generic hata mesajı
    return 'Bir hata oluştu, lütfen tekrar deneyin';
  }

  // Firebase Auth hatalarını yorumla
  static String _getAuthErrorMessage(firebase_auth.FirebaseAuthException error) {
    switch (error.code) {
      case 'user-not-found':
        return 'Kullanıcı bulunamadı';
      case 'wrong-password':
        return 'Yanlış şifre';
      case 'email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda';
      case 'invalid-email':
        return 'Geçersiz e-posta adresi';
      case 'weak-password':
        return 'Şifre çok zayıf (en az 6 karakter)';
      case 'operation-not-allowed':
        return 'Bu işlem şu anda yapılamıyor';
      case 'user-disabled':
        return 'Bu hesap devre dışı bırakılmış';
      case 'too-many-requests':
        return 'Çok fazla deneme yapıldı, lütfen daha sonra tekrar deneyin';
      case 'requires-recent-login':
        return 'Bu işlem için tekrar giriş yapmanız gerekiyor';
      case 'invalid-credential':
        return 'Geçersiz kimlik bilgileri';
      case 'account-exists-with-different-credential':
        return 'Bu e-posta başka bir yöntemle kayıtlı';
      default:
        Logger.warning('Bilinmeyen Auth hatası: ${error.code}');
        return 'Kimlik doğrulama hatası: ${error.message ?? "Bilinmeyen hata"}';
    }
  }

  // Firestore hatalarını yorumla
  static String _getFirestoreErrorMessage(FirebaseException error) {
    switch (error.code) {
      case 'permission-denied':
        return 'Bu işlem için yetkiniz yok';
      case 'unavailable':
        return 'Sunucu şu anda kullanılamıyor, lütfen tekrar deneyin';
      case 'not-found':
        return 'İstenen veri bulunamadı';
      case 'already-exists':
        return 'Bu veri zaten mevcut';
      case 'resource-exhausted':
        return 'Kaynak kotası aşıldı, lütfen daha sonra tekrar deneyin';
      case 'failed-precondition':
        return 'İşlem için gerekli koşullar sağlanmadı';
      case 'aborted':
        return 'İşlem iptal edildi, lütfen tekrar deneyin';
      case 'out-of-range':
        return 'Geçersiz değer aralığı';
      case 'unimplemented':
        return 'Bu özellik henüz kullanılabilir değil';
      case 'internal':
        return 'Sunucu hatası, lütfen tekrar deneyin';
      case 'deadline-exceeded':
        return 'İşlem zaman aşımına uğradı';
      default:
        Logger.warning('Bilinmeyen Firestore hatası: ${error.code}');
        return 'Veritabanı hatası: ${error.message ?? "Bilinmeyen hata"}';
    }
  }

  // Success handler (opsiyonel)
  static void handleSuccess(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    if (context.mounted) {
      ToastHelper.showSuccessToast(context, message, duration: duration);
    }
    Logger.info('Success: $message');
  }

  // Warning handler
  static void handleWarning(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
  }) {
    if (context.mounted) {
      ToastHelper.showWarningToast(context, message, duration: duration);
    }
    Logger.warning('Warning: $message');
  }

  // Info handler
  static void handleInfo(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    if (context.mounted) {
      ToastHelper.showInfoToast(context, message, duration: duration);
    }
    Logger.info('Info: $message');
  }

  // Future için try-catch wrapper
  static Future<T?> tryAsync<T>(
    Future<T> Function() operation, {
    required BuildContext context,
    String? errorMessage,
    bool showToast = true,
  }) async {
    try {
      return await operation();
    } catch (error, stackTrace) {
      handleError(
        error,
        context: context,
        customMessage: errorMessage,
        showToast: showToast,
        stackTrace: stackTrace,
      );
      return null;
    }
  }

  // Sync operation için try-catch wrapper
  static T? trySync<T>(
    T Function() operation, {
    required BuildContext context,
    String? errorMessage,
    bool showToast = true,
  }) {
    try {
      return operation();
    } catch (error, stackTrace) {
      handleError(
        error,
        context: context,
        customMessage: errorMessage,
        showToast: showToast,
        stackTrace: stackTrace,
      );
      return null;
    }
  }

  // Validation error handler
  static void handleValidationErrors(
    BuildContext context,
    List<String> errors,
  ) {
    if (errors.isEmpty) return;

    final message = errors.length == 1
        ? errors.first
        : 'Lütfen aşağıdaki hataları düzeltin:\n${errors.take(3).join("\n")}';

    if (context.mounted) {
      ToastHelper.showWarningToast(context, message, duration: const Duration(seconds: 5));
    }

    Logger.warning('Validation errors: ${errors.join(", ")}');
  }

  // TODO: Crashlytics/Sentry entegrasyonu
  // static void _sendToMonitoringService(dynamic error, StackTrace? stackTrace) {
  //   // Crashlytics.instance.recordError(error, stackTrace);
  // }
}
