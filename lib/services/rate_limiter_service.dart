import 'package:shared_preferences/shared_preferences.dart';

/// Brute Force saldırılarına karşı rate limiting servisi
class RateLimiterService {
  static const String _loginAttemptsKey = 'login_attempts';
  static const String _lastAttemptTimeKey = 'last_attempt_time';
  static const String _blockedUntilKey = 'blocked_until';

  static const int _maxAttempts = 5; // 5 başarısız deneme
  static const int _lockoutDurationMinutes = 2; // 2 dakika kilitleme
  static const int _attemptWindowMinutes = 5; // 5 dakika içinde 5 deneme

  /// Login denemesi yapılabilir mi kontrol eder
  static Future<Map<String, dynamic>> canAttemptLogin() async {
    final prefs = await SharedPreferences.getInstance();

    // Bloke edilmiş mi kontrol et
    final blockedUntil = prefs.getInt(_blockedUntilKey);
    if (blockedUntil != null) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now < blockedUntil) {
        final remainingMinutes = ((blockedUntil - now) / 60000).ceil();
        return {
          'allowed': false,
          'reason': 'Çok fazla başarısız deneme. $remainingMinutes dakika sonra tekrar deneyin.',
          'remainingMinutes': remainingMinutes,
        };
      } else {
        // Süre dolmuş, temizle
        await prefs.remove(_blockedUntilKey);
        await prefs.remove(_loginAttemptsKey);
        await prefs.remove(_lastAttemptTimeKey);
      }
    }

    // Son denemelerden bu yana geçen süreyi kontrol et
    final lastAttemptTime = prefs.getInt(_lastAttemptTimeKey);
    final now = DateTime.now().millisecondsSinceEpoch;

    if (lastAttemptTime != null) {
      final minutesSinceLastAttempt = ((now - lastAttemptTime) / 60000);

      // 5 dakikadan fazla geçmişse sayacı sıfırla
      if (minutesSinceLastAttempt > _attemptWindowMinutes) {
        await prefs.remove(_loginAttemptsKey);
      }
    }

    return {
      'allowed': true,
      'reason': null,
    };
  }

  /// Başarısız login denemesi kaydet
  static Future<void> recordFailedAttempt() async {
    final prefs = await SharedPreferences.getInstance();

    final attempts = (prefs.getInt(_loginAttemptsKey) ?? 0) + 1;
    final now = DateTime.now().millisecondsSinceEpoch;

    await prefs.setInt(_loginAttemptsKey, attempts);
    await prefs.setInt(_lastAttemptTimeKey, now);

    // Maksimum deneme sayısına ulaşıldıysa bloke et
    if (attempts >= _maxAttempts) {
      final blockedUntil = now + (_lockoutDurationMinutes * 60 * 1000);
      await prefs.setInt(_blockedUntilKey, blockedUntil);
    }
  }

  /// Başarılı login sonrası sayacı sıfırla
  static Future<void> resetAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_loginAttemptsKey);
    await prefs.remove(_lastAttemptTimeKey);
    await prefs.remove(_blockedUntilKey);
  }

  /// Kalan deneme hakkını döndürür
  static Future<int> getRemainingAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    final attempts = prefs.getInt(_loginAttemptsKey) ?? 0;
    return (_maxAttempts - attempts).clamp(0, _maxAttempts);
  }
}
