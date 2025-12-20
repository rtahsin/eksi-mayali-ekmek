// ChatMessage Model for Live Chat

class ChatMessage {
  final String id;
  final String message;
  final bool isUser;
  final DateTime timestamp;
  final String sessionId;
  final String? userId;

  ChatMessage({
    required this.id,
    required this.message,
    required this.isUser,
    required this.timestamp,
    required this.sessionId,
    this.userId,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      message: json['message'] ?? '',
      isUser: json['isUser'] ?? false,
      timestamp: json['timestamp'] is DateTime
          ? json['timestamp']
          : DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      sessionId: json['sessionId'] ?? '',
      userId: json['userId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'message': message,
      'isUser': isUser,
      'timestamp': timestamp.toIso8601String(),
      'sessionId': sessionId,
      'userId': userId,
    };
  }
}
