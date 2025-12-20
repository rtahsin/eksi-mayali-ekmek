import 'package:intl/intl.dart';

/// Tarih formatlamak için yardımcı sınıf
class DateFormatter {
  /// Bir tarihi "10 Oca 2023" formatında döndürür
  static String formatDate(DateTime date) {
    return DateFormat.yMMMd('tr_TR').format(date);
  }

  /// Bir tarihi şu an ile karşılaştırıp göreceli zaman olarak döndürür
  /// Örneğin: "3 saat önce", "Dün", "2 gün önce", "12 Oca 2023"
  static String formatRelativeTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        if (difference.inMinutes == 0) {
          return 'Az önce';
        } else {
          return '${difference.inMinutes} dakika önce';
        }
      } else {
        return '${difference.inHours} saat önce';
      }
    } else if (difference.inDays == 1) {
      return 'Dün';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} gün önce';
    } else {
      return formatDate(date);
    }
  }

  /// Bir DateTime nesnesini saat:dakika formatında döndürür (14:30)
  static String formatTime(DateTime date) {
    return DateFormat.Hm('tr_TR').format(date);
  }

  /// Bir DateTime nesnesini "12 Oca 2023, 14:30" formatında döndürür
  static String formatDateAndTime(DateTime date) {
    return '${formatDate(date)}, ${formatTime(date)}';
  }
}
