/*
 * Notification Template Model & Enum
 * 
 * PURPOSE: Push notification şablonları ve veri yapısı
 * LAYER: Model
 * DEPENDS ON: None
 * 
 * RULES:
 * - 6 hazır şablon: orderReceived, processing, ready, outForDelivery, delivered, custom
 * - Her şablonun başlık ve mesaj içeriği var
 * - Custom şablonda admin tam kontrol sahibi
 * - Placeholder'lar: {customerName}, {orderId}, {amount}, {date}
 * 
 * LAST UPDATED: 2026-01-15
 */

/// Push notification şablon tipleri
enum NotificationTemplate {
  orderReceived, // Sipariş alındı
  processing, // Üretim başladı
  ready, // Hazır, teslimat için bekliyor
  outForDelivery, // Yola çıktı
  delivered, // Teslim edildi
  custom, // Özel mesaj
}

/// Push notification veri modeli
class NotificationData {
  final NotificationTemplate template;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final String? targetUserId;
  final String? targetOrderId;
  final bool sendToAll;

  NotificationData({
    required this.template,
    required this.title,
    required this.body,
    this.data,
    this.targetUserId,
    this.targetOrderId,
    this.sendToAll = false,
  });

  /// Şablon tipine göre default başlık ve mesaj döndür
  factory NotificationData.fromTemplate({
    required NotificationTemplate template,
    String? customerName,
    String? orderId,
    double? amount,
    String? date,
    String? customTitle,
    String? customBody,
  }) {
    String title = '';
    String body = '';
    Map<String, dynamic> data = {};

    switch (template) {
      case NotificationTemplate.orderReceived:
        title = 'Siparişiniz Alındı! 🎉';
        body = 'Merhaba ${customerName ?? "Değerli Müşterimiz"}! '
            'Sipariş numaranız: ${orderId ?? "..."}, '
            'Toplam tutar: ${amount != null ? "${amount.toStringAsFixed(2)} ₺" : "..."}. '
            'Siparişiniz başarıyla alınmıştır.';
        data = {'type': 'order_received', 'orderId': orderId ?? ''};
        break;

      case NotificationTemplate.processing:
        title = 'Üretim Başladı! 👨‍🍳';
        body = 'Merhaba ${customerName ?? "Değerli Müşterimiz"}! '
            'Sipariş numaranız: ${orderId ?? "..."}, '
            'Ekşi mayalı ekmeğinizin üretimi başladı. '
            'Tahmini teslimat tarihi: ${date ?? "..."}.';
        data = {'type': 'processing', 'orderId': orderId ?? ''};
        break;

      case NotificationTemplate.ready:
        title = 'Siparişiniz Hazır! ✅';
        body = 'Merhaba ${customerName ?? "Değerli Müşterimiz"}! '
            'Sipariş numaranız: ${orderId ?? "..."}, '
            'Taze ekmeğiniz fırından çıktı ve teslimat için hazır. '
            'Teslimat tarihi: ${date ?? "..."}.';
        data = {'type': 'ready', 'orderId': orderId ?? ''};
        break;

      case NotificationTemplate.outForDelivery:
        title = 'Siparişiniz Yola Çıktı! 🚚';
        body = 'Merhaba ${customerName ?? "Değerli Müşterimiz"}! '
            'Sipariş numaranız: ${orderId ?? "..."}, '
            'Kurye adresinize doğru yola çıktı. '
            'Lütfen telefonunuzun yanında olun.';
        data = {'type': 'out_for_delivery', 'orderId': orderId ?? ''};
        break;

      case NotificationTemplate.delivered:
        title = 'Siparişiniz Teslim Edildi! 🎊';
        body = 'Merhaba ${customerName ?? "Değerli Müşterimiz"}! '
            'Sipariş numaranız: ${orderId ?? "..."}, '
            'Başarıyla teslim edilmiştir. '
            'Afiyet olsun! Bizi tercih ettiğiniz için teşekkürler.';
        data = {'type': 'delivered', 'orderId': orderId ?? ''};
        break;

      case NotificationTemplate.custom:
        title = customTitle ?? 'Bildirim';
        body = customBody ?? '';
        data = {'type': 'custom'};
        break;
    }

    return NotificationData(
      template: template,
      title: title,
      body: body,
      data: data,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'template': template.toString().split('.').last,
      'title': title,
      'body': body,
      'data': data,
      'targetUserId': targetUserId,
      'targetOrderId': targetOrderId,
      'sendToAll': sendToAll,
    };
  }

  factory NotificationData.fromJson(Map<String, dynamic> json) {
    return NotificationData(
      template: NotificationTemplate.values.firstWhere(
        (e) => e.toString().split('.').last == json['template'],
        orElse: () => NotificationTemplate.custom,
      ),
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      data: json['data'] as Map<String, dynamic>?,
      targetUserId: json['targetUserId'] as String?,
      targetOrderId: json['targetOrderId'] as String?,
      sendToAll: json['sendToAll'] as bool? ?? false,
    );
  }

  NotificationData copyWith({
    NotificationTemplate? template,
    String? title,
    String? body,
    Map<String, dynamic>? data,
    String? targetUserId,
    String? targetOrderId,
    bool? sendToAll,
  }) {
    return NotificationData(
      template: template ?? this.template,
      title: title ?? this.title,
      body: body ?? this.body,
      data: data ?? this.data,
      targetUserId: targetUserId ?? this.targetUserId,
      targetOrderId: targetOrderId ?? this.targetOrderId,
      sendToAll: sendToAll ?? this.sendToAll,
    );
  }
}

/// Notification template helper extension
extension NotificationTemplateExtension on NotificationTemplate {
  String get displayName {
    switch (this) {
      case NotificationTemplate.orderReceived:
        return 'Sipariş Alındı';
      case NotificationTemplate.processing:
        return 'Üretim Başladı';
      case NotificationTemplate.ready:
        return 'Hazır';
      case NotificationTemplate.outForDelivery:
        return 'Yola Çıktı';
      case NotificationTemplate.delivered:
        return 'Teslim Edildi';
      case NotificationTemplate.custom:
        return 'Özel Mesaj';
    }
  }

  String get icon {
    switch (this) {
      case NotificationTemplate.orderReceived:
        return '🎉';
      case NotificationTemplate.processing:
        return '👨‍🍳';
      case NotificationTemplate.ready:
        return '✅';
      case NotificationTemplate.outForDelivery:
        return '🚚';
      case NotificationTemplate.delivered:
        return '🎊';
      case NotificationTemplate.custom:
        return '✉️';
    }
  }

  String get description {
    switch (this) {
      case NotificationTemplate.orderReceived:
        return 'Müşteri sipariş verdiğinde otomatik gönderilir';
      case NotificationTemplate.processing:
        return 'Üretim başladığında gönderilir';
      case NotificationTemplate.ready:
        return 'Ürün hazır olduğunda gönderilir';
      case NotificationTemplate.outForDelivery:
        return 'Kurye yola çıktığında gönderilir';
      case NotificationTemplate.delivered:
        return 'Teslimat tamamlandığında gönderilir';
      case NotificationTemplate.custom:
        return 'Dilediğiniz mesajı gönderin';
    }
  }
}
