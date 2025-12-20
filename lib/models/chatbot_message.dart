// ignore_for_file: prefer_const_constructors

/*
 * ChatBot Message Model
 * 
 * PURPOSE: ChatBot mesajları ve seçeneklerinin veri modeli
 * LAYER: Model
 * DEPENDS ON: Firestore document structure
 * 
 * RULES:
 * - Immutable sınıf (final fields)
 * - fromJson ve toJson metodları zorunlu
 * - Null safety kullan
 * 
 * FEATURES:
 * - Soru-cevap yapısı
 * - Seçenekli navigasyon
 * - Kategori bazlı organizasyon
 * 
 * LAST UPDATED: 2025-12-08
 */

/// ChatBot mesaj seçeneği
class ChatBotOption {
  final String id;
  final String text;
  final String nextMessageId; // Bir sonraki mesajın ID'si
  final String? action; // 'link', 'call', 'email' gibi özel aksiyonlar
  final String? actionValue; // Action için değer (URL, telefon, email)

  ChatBotOption({
    required this.id,
    required this.text,
    required this.nextMessageId,
    this.action,
    this.actionValue,
  });

  factory ChatBotOption.fromJson(Map<String, dynamic> json) {
    return ChatBotOption(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      nextMessageId: json['nextMessageId'] ?? '',
      action: json['action'],
      actionValue: json['actionValue'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'nextMessageId': nextMessageId,
      'action': action,
      'actionValue': actionValue,
    };
  }
}

/// ChatBot mesajı
class ChatBotMessage {
  final String id;
  final String message;
  final List<ChatBotOption> options;
  final String category; // 'greeting', 'product', 'order', 'delivery', 'general'
  final bool isActive;
  final int order; // Gösterim sırası
  final DateTime createdAt;
  final DateTime updatedAt;

  ChatBotMessage({
    required this.id,
    required this.message,
    required this.options,
    required this.category,
    this.isActive = true,
    this.order = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ChatBotMessage.fromJson(Map<String, dynamic> json) {
    return ChatBotMessage(
      id: json['id'] ?? '',
      message: json['message'] ?? '',
      options: (json['options'] as List<dynamic>?)
              ?.map((option) => ChatBotOption.fromJson(option as Map<String, dynamic>))
              .toList() ??
          [],
      category: json['category'] ?? 'general',
      isActive: json['isActive'] ?? true,
      order: json['order'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'message': message,
      'options': options.map((option) => option.toJson()).toList(),
      'category': category,
      'isActive': isActive,
      'order': order,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

/// ChatBot ayarları
class ChatBotSettings {
  final String id;
  final String welcomeMessage;
  final String botName;
  final String botAvatar; // URL
  final bool isEnabled;
  final String primaryColor;
  final String position; // 'bottom-right', 'bottom-left'
  final DateTime updatedAt;

  ChatBotSettings({
    required this.id,
    required this.welcomeMessage,
    this.botName = 'EkmekLab Asistan',
    this.botAvatar = '',
    this.isEnabled = true,
    this.primaryColor = '#8B4513',
    this.position = 'bottom-right',
    required this.updatedAt,
  });

  factory ChatBotSettings.fromJson(Map<String, dynamic> json) {
    return ChatBotSettings(
      id: json['id'] ?? 'default',
      welcomeMessage: json['welcomeMessage'] ?? 'Merhaba! Size nasıl yardımcı olabilirim?',
      botName: json['botName'] ?? 'EkmekLab Asistan',
      botAvatar: json['botAvatar'] ?? '',
      isEnabled: json['isEnabled'] ?? true,
      primaryColor: json['primaryColor'] ?? '#8B4513',
      position: json['position'] ?? 'bottom-right',
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'welcomeMessage': welcomeMessage,
      'botName': botName,
      'botAvatar': botAvatar,
      'isEnabled': isEnabled,
      'primaryColor': primaryColor,
      'position': position,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
