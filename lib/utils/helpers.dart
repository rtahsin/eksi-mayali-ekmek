import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

import '../main.dart';
import '../theme/app_theme.dart';
import 'logger.dart';

enum DeviceType {
  mobile,
  tablet,
  desktop,
}

class Helpers {
  static NumberFormat currencyFormat = NumberFormat.currency(
    locale: 'tr_TR',
    symbol: '₺',
    decimalDigits: 2,
  );

  // Para birimini formatla
  static String formatCurrency(double price) {
    return currencyFormat.format(price);
  }

  // Tarihi formatla
  static String formatDate(DateTime date) {
    final formatter = DateFormat('dd.MM.yyyy HH:mm', 'tr_TR');
    return formatter.format(date);
  }

  // Kısa tarih formatı
  static String formatShortDate(DateTime date) {
    final formatter = DateFormat('dd.MM.yyyy', 'tr_TR');
    return formatter.format(date);
  }

  // Yeni global SnackBar gösterme metodu
  static void showSnackBar(String message,
      {bool isError = false, SnackBarAction? action, BuildContext? context}) {
    if (context != null) {
      // Eski kullanım: showSnackBar(context, message, action: action)
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(
                isError ? Icons.error_outline : Icons.check_circle_outline,
                color: Colors.white,
                size: 22,
              ),
              SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: isError ? AppTheme.errorColor : AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMdSoft)),
          margin: EdgeInsets.all(AppTheme.spaceLg),
          action: action,
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    // Yeni kullanım: showSnackBar(message, isError: true/false)
    rootScaffoldMessengerKey.currentState?.hideCurrentSnackBar();
    rootScaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
              size: 22,
            ),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isError ? AppTheme.errorColor : AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMdSoft)),
        margin: EdgeInsets.all(AppTheme.spaceLg),
        action: action,
        duration: Duration(seconds: 3),
      ),
    );
  }

  static void showErrorSnackBar(String message) {
    showSnackBar(message, isError: true);
  }

  static void showSuccessSnackBar(String message) {
    showSnackBar(message, isError: false);
  }

  static void showWarningSnackBar(String message) {
    rootScaffoldMessengerKey.currentState?.hideCurrentSnackBar();
    rootScaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.white, size: 22),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.warningColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMdSoft)),
        margin: EdgeInsets.all(AppTheme.spaceLg),
        duration: Duration(seconds: 3),
      ),
    );
  }

  static void showInfoSnackBar(String message) {
    rootScaffoldMessengerKey.currentState?.hideCurrentSnackBar();
    rootScaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.white, size: 22),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: AppTheme.infoColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMdSoft)),
        margin: EdgeInsets.all(AppTheme.spaceLg),
        duration: Duration(seconds: 3),
      ),
    );
  }

  // Eski showSnackBar metodu (context bazlı) - eski kodu koruyoruz
  static void showSnackBarContext(BuildContext context, String message,
      {bool isError = false, SnackBarAction? action}) {
    showSnackBar(message, isError: isError, action: action, context: context);
  }

  // Responsive genişlik hesaplama
  static double getResponsiveWidth(BuildContext context, double percentage) {
    return MediaQuery.of(context).size.width * (percentage / 100);
  }

  // Responsive yükseklik hesaplama
  static double getResponsiveHeight(BuildContext context, double percentage) {
    return MediaQuery.of(context).size.height * (percentage / 100);
  }

  // Cihaz tipini belirle
  static DeviceType getDeviceType(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width < 600) {
      return DeviceType.mobile;
    } else if (width < 900) {
      return DeviceType.tablet;
    } else {
      return DeviceType.desktop;
    }
  }

  // Yıldız derecelendirme widget'ı
  static Widget buildRatingStars(double rating, {double size = 16}) {
    final int fullStars = rating.floor();
    final bool hasHalfStar = rating - fullStars >= 0.5;
    final int emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(fullStars, (index) => Icon(Icons.star, color: Colors.amber, size: size)),
        if (hasHalfStar) Icon(Icons.star_half, color: Colors.amber, size: size),
        ...List.generate(
          emptyStars,
          (index) => Icon(Icons.star_border, color: Colors.amber, size: size),
        ),
      ],
    );
  }

  // Metni kısalt
  static String truncateText(String text, int maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    return '${text.substring(0, maxLength)}...';
  }

  // İndirim yüzdesi hesapla
  static double calculateDiscountPercentage(double originalPrice, double discountedPrice) {
    if (originalPrice <= 0 || discountedPrice >= originalPrice) {
      return 0;
    }

    return ((originalPrice - discountedPrice) / originalPrice) * 100;
  }

  // Renk tonu oluştur
  static Color darken(Color color, [double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);

    final hsl = HSLColor.fromColor(color);
    final hslDark = hsl.withLightness((hsl.lightness - amount).clamp(0.0, 1.0));

    return hslDark.toColor();
  }

  static Color lighten(Color color, [double amount = 0.1]) {
    assert(amount >= 0 && amount <= 1);

    final hsl = HSLColor.fromColor(color);
    final hslLight = hsl.withLightness((hsl.lightness + amount).clamp(0.0, 1.0));

    return hslLight.toColor();
  }

  // E-posta doğrulama
  static bool isValidEmail(String email) {
    final emailRegExp = RegExp(r'^[a-zA-Z0-9.]+@[a-zA-Z0-9]+\.[a-zA-Z]+');
    return emailRegExp.hasMatch(email);
  }

  // Şifre doğrulama (en az 6 karakter)
  static bool isValidPassword(String password) {
    return password.length >= 6;
  }

  // Telefon numarası doğrulama
  static bool isValidPhone(String phone) {
    final phoneRegExp = RegExp(r'^[0-9]{10}$');
    return phoneRegExp.hasMatch(phone);
  }

  // Sipariş durumunu Türkçe'ye çevir
  static String getOrderStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'processing':
        return 'Hazırlanıyor';
      case 'shipped':
        return 'Kargoda';
      case 'delivered':
        return 'Teslim Edildi';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  }

  // Sipariş durumuna göre renk döndür
  static int getOrderStatusColor(String status) {
    switch (status) {
      case 'pending':
        return 0xFFFFA000; // Turuncu
      case 'processing':
        return 0xFF2196F3; // Mavi
      case 'shipped':
        return 0xFF9C27B0; // Mor
      case 'delivered':
        return 0xFF4CAF50; // Yeşil
      case 'cancelled':
        return 0xFFF44336; // Kırmızı
      default:
        return 0xFF9E9E9E; // Gri
    }
  }

  // Ödeme yöntemini Türkçe'ye çevir
  static String getPaymentMethodText(String method) {
    switch (method) {
      case 'credit_card':
        return 'Kredi Kartı';
      case 'cash_on_delivery':
        return 'Kapıda Ödeme';
      default:
        return 'Bilinmiyor';
    }
  }

  static String formatPrice(double price) {
    return '${price.toStringAsFixed(2)} ₺';
  }

  static String formatRelativeDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays < 1) {
        return 'Bugün';
      } else if (difference.inDays < 2) {
        return 'Dün';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} gün önce';
      } else if (difference.inDays < 30) {
        return '${(difference.inDays / 7).floor()} hafta önce';
      } else if (difference.inDays < 365) {
        return '${(difference.inDays / 30).floor()} ay önce';
      } else {
        return DateFormat('dd MMM yyyy', 'tr_TR').format(date);
      }
    } catch (e) {
      return dateString;
    }
  }

  // URL açmak için
  static Future<void> launchURL(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await url_launcher.canLaunchUrl(uri)) {
        await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
      } else {
        Logger.error('URL açılamadı: $url');
      }
    } catch (e) {
      Logger.error('URL açılırken hata oluştu: $e');
    }
  }

  /// Verilen tarihin ne kadar zaman önce olduğunu hesaplar ve formatlar
  static String timeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()} yıl önce';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()} ay önce';
    } else if (difference.inDays > 7) {
      return '${(difference.inDays / 7).floor()} hafta önce';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} gün önce';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} saat önce';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} dakika önce';
    } else {
      return 'Az önce';
    }
  }
}
