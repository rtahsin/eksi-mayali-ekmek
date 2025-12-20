import 'package:flutter/foundation.dart';

/// Log seviyeleri
///
/// Logların önem derecesini belirleyen enum.
/// - debug: Geliştirme sırasında yardımcı olan en detaylı loglar
/// - info: Normal işlem bildirimleri
/// - warning: Potansiyel sorunları belirten uyarılar
/// - error: Uygulama hatalarını belirten hatalar
enum LogLevel {
  debug,
  info,
  warning,
  error,
}

/// Uygulama genelinde kullanılacak loglama sınıfı
///
/// Bu sınıf, uygulamanın farklı yerlerinden kolay loglama yapmayı sağlar.
/// Kullanımı: `Logger.info('Mesajınız')` şeklindedir.
///
/// Özellikleri:
/// - Farklı log seviyeleri destekler (debug, info, warning, error)
/// - Otomatik zaman damgası ekler
/// - Release modunda debug logları göstermez
///
/// Örnek kullanım:
/// ```dart
/// Logger.info('Kullanıcı giriş yaptı: $userId');
/// Logger.error('Bağlantı hatası: $errorMessage');
/// ```
class Logger {
  /// Geçerli log seviyesi
  /// Debug modda tüm loglar gösterilir
  /// Release modda sadece info ve üstü loglar gösterilir
  static LogLevel _currentLevel = kDebugMode ? LogLevel.debug : LogLevel.info;

  /// Log seviyesini ayarla
  ///
  /// Bu metod ile uygulamanın loglama seviyesi değiştirilebilir.
  /// Örneğin, özel bir test durumu için: `Logger.setLevel(LogLevel.debug)`
  static void setLevel(LogLevel level) {
    _currentLevel = level;
  }

  /// Debug seviyesinde log
  ///
  /// Genellikle sadece geliştirme sırasında kullanılan detaylı loglar için.
  /// Bu loglar release modunda gösterilmez.
  static void debug(String message) {
    if (_currentLevel.index <= LogLevel.debug.index) {
      _log('DEBUG', message);
    }
  }

  /// Info seviyesinde log
  ///
  /// Normal uygulama akışını izlemek için kullanılan standart log seviyesi.
  /// Örnek: "Kullanıcı giriş yaptı", "Kategoriler yüklendi" vb.
  static void info(String message) {
    if (_currentLevel.index <= LogLevel.info.index) {
      _log('INFO', message);
    }
  }

  /// Uyarı seviyesinde log
  ///
  /// Potansiyel sorunları belirten, ama uygulamanın çalışmasını engellemayan durumlar için.
  /// Örnek: "Sunucu yanıt vermiyor, yerel veriler kullanılıyor"
  static void warning(String message) {
    if (_currentLevel.index <= LogLevel.warning.index) {
      _log('WARNING', message);
    }
  }

  /// Hata seviyesinde log
  ///
  /// Uygulama hataları ve istisnalar için kullanılır.
  /// Bu loglar her zaman gösterilir ve ciddi sorunları belirtir.
  static void error(String message) {
    if (_currentLevel.index <= LogLevel.error.index) {
      _log('ERROR', message);
    }
  }

  /// Log mesajını yazdır
  ///
  /// Bu private metod, zaman damgası ekleyerek ve formatı standartlaştırarak
  /// logları konsola yazdırır.
  static void _log(String level, String message) {
    if (kDebugMode) {
      final timestamp = DateTime.now().toIso8601String();
      print('[$timestamp] $level: $message');
    }
  }
}
