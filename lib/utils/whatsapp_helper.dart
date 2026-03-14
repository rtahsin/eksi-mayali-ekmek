// ignore_for_file: prefer_const_constructors

/*
 * WhatsApp Helper Utility
 * 
 * PURPOSE: WhatsApp Business entegrasyonu için yardımcı fonksiyonlar
 * LAYER: Utility
 * DEPENDS ON: dart:html (web), url_launcher (mobile)
 * 
 * FEATURES:
 * - Telefon numarası validasyonu ve temizleme (Türkiye formatı)
 * - WhatsApp Web URL oluşturma
 * - Sipariş durumuna göre mesaj şablonları
 * - Emoji destekli profesyonel mesajlar
 * 
 * USAGE:
 * ```dart
 * // Sipariş onaylandı mesajı gönder
 * WhatsAppHelper.sendOrderStatusMessage(
 *   phoneNumber: '05301234567',
 *   order: order,
 *   status: OrderStatus.processing,
 * );
 * ```
 * 
 * LAST UPDATED: 2026-01-08
 */

import 'package:eksi_mayali_ekmek_web/models/order.dart';
import 'package:eksi_mayali_ekmek_web/utils/logger.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:url_launcher/url_launcher.dart';

class WhatsAppHelper {
  // WhatsApp Business telefon numarası (opsiyonel - müşteri desteği için)
  static const String businessPhone = '905010126653';

  /// Telefon numarasını temizle ve formatla
  ///
  /// Girdi formatları:
  /// - 0530 123 45 67
  /// - +90 530 123 45 67
  /// - (0530) 123-45-67
  ///
  /// Çıktı: 905301234567 (uluslararası format, + olmadan)
  static String cleanPhoneNumber(String phone) {
    // Boşluk, tire, parantez gibi karakterleri temizle
    String cleaned = phone.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');

    // Başında 0 varsa, 90 ekle
    if (cleaned.startsWith('0')) {
      cleaned = '90${cleaned.substring(1)}';
    }

    // Başında 90 yoksa ekle (Türkiye kodu)
    if (!cleaned.startsWith('90')) {
      cleaned = '90$cleaned';
    }

    return cleaned;
  }

  /// Telefon numarası validasyonu (Türkiye)
  ///
  /// Türkiye cep telefonu formatı: 05XX XXX XX XX (11 rakam)
  /// Uluslararası: +90 5XX XXX XX XX (10 rakam + 90)
  static bool isValidTurkishPhone(String phone) {
    final cleaned = cleanPhoneNumber(phone);

    // 905XXXXXXXXX formatı (12 rakam)
    final turkishPhoneRegex = RegExp(r'^905\d{9}$');

    return turkishPhoneRegex.hasMatch(cleaned);
  }

  /// WhatsApp mesaj URL'i oluştur
  ///
  /// WhatsApp Web API: https://wa.me/905301234567?text=Merhaba
  static String createWhatsAppUrl({
    required String phoneNumber,
    String? message,
  }) {
    final cleanedPhone = cleanPhoneNumber(phoneNumber);

    // Mesajı URL encode et
    String url = 'https://wa.me/$cleanedPhone';

    if (message != null && message.isNotEmpty) {
      final encodedMessage = Uri.encodeComponent(message);
      url += '?text=$encodedMessage';
    }

    return url;
  }

  /// Sipariş durumuna göre WhatsApp mesajı oluştur
  static String createOrderStatusMessage({
    required Order order,
    required OrderStatus status,
  }) {
    final customerName = order.customerName.split(' ').first; // İlk isim
    final orderNumber = order.id.substring(0, 8).toUpperCase();
    final amount = order.amount?.toStringAsFixed(2) ?? '0.00';

    switch (status) {
      case OrderStatus.pending:
        return '''
Merhaba $customerName! 👋

EkmekLab'tan sipariş onayı 🍞

✅ Sipariş No: #$orderNumber
💰 Tutar: $amount ₺
📅 Tarih: ${_formatDate(order.orderDate)}

Siparişiniz alındı ve en kısa sürede hazırlanmaya başlayacak. Durumu güncellemede size tekrar bilgi vereceğiz.

Sipariş detayları:
${_formatOrderItems(order)}

Teşekkür ederiz! 🙏
EkmekLab Ekibi
''';

      case OrderStatus.processing:
        return '''
Merhaba $customerName! 👨‍🍳

Sipariş Durumu: HAZıRLANıYOR 🔥

📋 Sipariş No: #$orderNumber
💰 Tutar: $amount ₺

Taze ekmeğiniz şu an fırında! 🍞✨
Kısa süre içinde hazır olacak ve teslim için sizi bilgilendireceğiz.

Sipariş içeriği:
${_formatOrderItems(order)}

Afiyet olsun! 😊
EkmekLab
''';

      case OrderStatus.ready:
        return '''
🎉 Harika Haber, $customerName!

SİPARİŞİNİZ HAZIR! ✅

📋 Sipariş No: #$orderNumber
💰 Tutar: $amount ₺

${order.shippingAddress.isNotEmpty ? '📍 Teslimat Adresi:\n${order.shippingAddress}\n\n' : ''}Taze ekmeğiniz sizi bekliyor! 🥖🍞

Sipariş içeriği:
${_formatOrderItems(order)}

${order.paymentMethod.contains('nakit') || order.paymentMethod.contains('cash') ? '💵 Ödeme: Kapıda nakit\n' : order.paymentMethod.contains('kart') ? '💳 Ödeme: Kapıda kart\n' : ''}
Sorularınız için bize yazabilirsiniz.
Teşekkürler! 🙏
EkmekLab
''';

      case OrderStatus.delivered:
        return '''
Merhaba $customerName! 🎊

SİPARİŞ TESLİM EDİLDİ ✅

📋 Sipariş No: #$orderNumber
💰 Tutar: $amount ₺

Siparişinizi teslim ettik. Afiyet olsun! 🍞😋

Ürünlerimizden memnun kaldıysanız:
⭐ Sipariş sayfasından değerlendirme yapabilirsiniz
📢 Bizi arkadaşlarınıza önerebilirsiniz

Bir sonraki siparişinizde görüşmek üzere!
EkmekLab Ekibi 🙏
''';

      case OrderStatus.cancelled:
        return '''
Merhaba $customerName,

Sipariş iptal edildi ❌

📋 Sipariş No: #$orderNumber
💰 Tutar: $amount ₺

Siparişiniz iptal edildi. ${order.notes.isNotEmpty ? '\n\nİptal nedeni: ${order.notes}' : ''}

Herhangi bir sorunuz varsa lütfen bize ulaşın. Size yardımcı olmaktan memnuniyet duyarız.

EkmekLab
''';

      default:
        return '''
Merhaba $customerName!

Sipariş durumu güncellendi 📋

📋 Sipariş No: #$orderNumber
💰 Tutar: $amount ₺
📅 Tarih: ${_formatDate(order.orderDate)}

Sipariş içeriği:
${_formatOrderItems(order)}

Teşekkürler!
EkmekLab
''';
    }
  }

  /// Genel sipariş bilgisi mesajı (durum değişikliği olmadan)
  static String createOrderInfoMessage(Order order) {
    final customerName = order.customerName.split(' ').first;
    final orderNumber = order.id.substring(0, 8).toUpperCase();
    final amount = order.amount?.toStringAsFixed(2) ?? '0.00';
    final statusText = order.orderStatus.displayName;

    return '''
Merhaba $customerName! 👋

Sipariş bilgileriniz 📋

📋 Sipariş No: #$orderNumber
📅 Tarih: ${_formatDate(order.orderDate)}
📊 Durum: $statusText
💰 Toplam: $amount ₺

${order.shippingAddress.isNotEmpty ? '📍 Adres: ${order.shippingAddress}\n\n' : ''}Sipariş içeriği:
${_formatOrderItems(order)}

${order.paymentMethod.isNotEmpty ? '💳 Ödeme: ${order.paymentMethod}\n\n' : ''}Sorularınız için bize yazabilirsiniz.
EkmekLab 🍞
''';
  }

  /// Özel mesaj gönderme (admin manuel mesaj)
  static String createCustomMessage({
    required String customerName,
    required String message,
  }) {
    final firstName = customerName.split(' ').first;
    return '''
Merhaba $firstName! 👋

$message

Teşekkürler,
EkmekLab 🍞
''';
  }

  /// WhatsApp'ı aç (web veya uygulama)
  static Future<void> openWhatsApp({
    required String phoneNumber,
    String? message,
  }) async {
    try {
      // Telefon numarasını doğrula
      if (!isValidTurkishPhone(phoneNumber)) {
        Logger.error('Geçersiz telefon numarası: $phoneNumber');
        throw Exception(
            'Geçersiz telefon numarası formatı. Lütfen 05XX XXX XX XX formatında girin.');
      }

      final url = createWhatsAppUrl(
        phoneNumber: phoneNumber,
        message: message,
      );

      Logger.info('WhatsApp açılıyor: $url');

      final uri = Uri.parse(url);

      // Web için yeni sekmede aç
      if (kIsWeb) {
        if (await canLaunchUrl(uri)) {
          await launchUrl(
            uri,
            mode: LaunchMode.externalApplication, // Yeni sekmede aç
          );
        } else {
          throw Exception('WhatsApp açılamadı');
        }
      } else {
        // Mobile için WhatsApp uygulamasını aç
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        } else {
          throw Exception('WhatsApp yüklü değil');
        }
      }
    } catch (e) {
      Logger.error('WhatsApp açılırken hata: $e');
      rethrow;
    }
  }

  // === HELPER METHODS ===

  /// Tarihi formatla (01 Ocak 2026 14:30)
  static String _formatDate(DateTime date) {
    const months = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık'
    ];

    final day = date.day.toString().padLeft(2, '0');
    final month = months[date.month - 1];
    final year = date.year;
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return '$day $month $year $hour:$minute';
  }

  /// Sipariş ürünlerini formatla
  static String _formatOrderItems(Order order) {
    if (order.items.isEmpty) return '(Ürün bulunamadı)';

    final buffer = StringBuffer();
    for (var i = 0; i < order.items.length; i++) {
      final item = order.items[i];
      buffer.writeln('${i + 1}. ${item.name} x ${item.quantity} adet');
      if (item.price != null) {
        buffer.writeln('   ${(item.price * item.quantity).toStringAsFixed(2)} ₺');
      }
      if (i < order.items.length - 1) buffer.writeln();
    }
    return buffer.toString().trim();
  }

  /// Telefon numarasını güzel formatta göster (görüntüleme için)
  /// Örnek: 905301234567 → +90 530 123 45 67
  static String formatPhoneForDisplay(String phone) {
    final cleaned = cleanPhoneNumber(phone);

    if (cleaned.length == 12 && cleaned.startsWith('90')) {
      // 905301234567 → +90 530 123 45 67
      return '+90 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8, 10)} ${cleaned.substring(10)}';
    }

    return phone; // Geçersizse olduğu gibi döndür
  }

  /// WhatsApp durumunu kontrol et (web'de kullanılabilir)
  static bool isWhatsAppAvailable() {
    // Web'de her zaman kullanılabilir (wa.me açılır)
    // Mobile'da uygulamanın yüklü olup olmadığını kontrol etmek gerekir
    return true; // Şimdilik her zaman true, gerekirse canLaunchUrl ile kontrol edilebilir
  }
}
