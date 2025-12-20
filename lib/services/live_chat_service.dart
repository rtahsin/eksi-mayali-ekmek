// ignore_for_file: prefer_const_constructors

/*
 * Live Chat Service
 * 
 * PURPOSE: Canlı destek için Ollama LLM entegrasyonu
 * LAYER: Service
 * DEPENDS ON: 
 *   - OllamaService (LLM entegrasyonu)
 *   - FirebaseFirestore (chat geçmişi)
 *   - Logger
 * 
 * RULES:
 *   - ChangeNotifier pattern
 *   - Real-time mesaj yönetimi
 *   - Ollama LLM entegrasyonu
 *   - Try-catch her metotta
 * 
 * FEATURES:
 *   - AI ile canlı sohbet
 *   - Chat geçmişi kaydetme
 *   - Typing indicator
 *   - Context-aware yanıtlar
 * 
 * LAST UPDATED: 2025-12-16
 */

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../models/chat_message.dart';
import '../utils/logger.dart';
import 'ollama_service.dart';

class LiveChatService with ChangeNotifier {
  final OllamaService _ollamaService = OllamaService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  List<ChatMessage> _messages = [];
  bool _isTyping = false;
  bool _isLoading = false;
  String? _sessionId;

  List<ChatMessage> get messages => _messages;
  bool get isTyping => _isTyping;
  bool get isLoading => _isLoading;
  String? get sessionId => _sessionId;

  /// Yeni chat oturumu başlat
  void startNewSession({String? userId}) {
    _sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    _messages = [];

    // Hoş geldin mesajı
    final welcomeMessage = ChatMessage(
      id: '0',
      message: 'Merhaba! 👋 EkmekLab canlı desteğe hoş geldiniz. Size nasıl yardımcı olabilirim?',
      isUser: false,
      timestamp: DateTime.now(),
      sessionId: _sessionId!,
    );

    _messages.add(welcomeMessage);
    notifyListeners();

    Logger.info('🆕 Yeni chat oturumu başlatıldı: $_sessionId');
  }

  /// Mesaj gönder ve AI yanıtı al
  Future<void> sendMessage(String message, {String? userId}) async {
    if (message.trim().isEmpty) return;

    try {
      // Kullanıcı mesajını ekle
      final userMessage = ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        message: message.trim(),
        isUser: true,
        timestamp: DateTime.now(),
        sessionId: _sessionId ?? 'default',
        userId: userId,
      );

      _messages.add(userMessage);
      notifyListeners();

      // Typing indicator göster
      _isTyping = true;
      notifyListeners();

      // Context oluştur (son 5 mesaj)
      final context = _buildContext();

      // Ollama'dan yanıt al
      final aiResponse = await _ollamaService.chat(
        message: message,
        context: context,
        model: 'llama3.2:latest',
      );

      // Typing indicator kapat
      _isTyping = false;

      if (aiResponse != null) {
        // AI yanıtını ekle
        final botMessage = ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          message: aiResponse,
          isUser: false,
          timestamp: DateTime.now(),
          sessionId: _sessionId ?? 'default',
        );

        _messages.add(botMessage);
        notifyListeners();

        // Firestore'a kaydet (opsiyonel - geçmiş için)
        await _saveChatHistory(userMessage, botMessage);

        Logger.info('✅ AI yanıtı alındı ve eklendi');
      } else {
        // Hata mesajı
        final errorMessage = ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          message:
              'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin veya WhatsApp üzerinden bize ulaşın: https://wa.me/905010126653',
          isUser: false,
          timestamp: DateTime.now(),
          sessionId: _sessionId ?? 'default',
        );

        _messages.add(errorMessage);
        notifyListeners();

        Logger.error('❌ AI yanıt veremedi');
      }
    } catch (e) {
      _isTyping = false;
      notifyListeners();
      Logger.error('Mesaj gönderme hatası: $e');

      // Fallback mesaj
      final fallbackMessage = ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        message: 'Bir hata oluştu. İletişim için: 📱 WhatsApp: 0501 012 6653',
        isUser: false,
        timestamp: DateTime.now(),
        sessionId: _sessionId ?? 'default',
      );

      _messages.add(fallbackMessage);
      notifyListeners();
    }
  }

  /// Context oluştur (son mesajlardan)
  String _buildContext() {
    // Son 5 mesajı al
    final recentMessages =
        _messages.length > 5 ? _messages.sublist(_messages.length - 5) : _messages;

    final contextBuilder = StringBuffer();
    contextBuilder.writeln('Geçmiş konuşma:');

    for (var msg in recentMessages) {
      final speaker = msg.isUser ? 'Müşteri' : 'Asistan';
      contextBuilder.writeln('$speaker: ${msg.message}');
    }

    contextBuilder.writeln('\nŞirket Bilgileri:');
    contextBuilder.writeln('- İsim: EkmekLab - Ekşi Mayalı Ekmek');
    contextBuilder.writeln('- Ürünler: Ekşi mayalı ekmek, Çavdar ekmeği');
    contextBuilder.writeln('- Fiyatlar: 30 TL - 35 TL');
    contextBuilder.writeln('- Teslimat: Ankara içi ücretsiz (min. 50 TL)');
    contextBuilder.writeln('- WhatsApp: 0501 012 6653');
    contextBuilder.writeln('- Email: info@ekmeklab.tr');

    return contextBuilder.toString();
  }

  /// Chat geçmişini Firestore'a kaydet
  Future<void> _saveChatHistory(ChatMessage userMsg, ChatMessage botMsg) async {
    try {
      final batch = _firestore.batch();

      // Kullanıcı mesajı
      final userRef = _firestore
          .collection('live_chat_history')
          .doc(_sessionId)
          .collection('messages')
          .doc(userMsg.id);
      batch.set(userRef, userMsg.toJson());

      // Bot mesajı
      final botRef = _firestore
          .collection('live_chat_history')
          .doc(_sessionId)
          .collection('messages')
          .doc(botMsg.id);
      batch.set(botRef, botMsg.toJson());

      // Session metadata
      final sessionRef = _firestore.collection('live_chat_history').doc(_sessionId);
      batch.set(
          sessionRef,
          {
            'sessionId': _sessionId,
            'userId': userMsg.userId,
            'lastMessageAt': FieldValue.serverTimestamp(),
            'messageCount': FieldValue.increment(2),
          },
          SetOptions(merge: true));

      await batch.commit();
      Logger.info('💾 Chat geçmişi kaydedildi');
    } catch (e) {
      Logger.error('Chat geçmişi kaydetme hatası: $e');
      // Hata olsa da chat devam etsin
    }
  }

  /// Geçmiş oturumu yükle
  Future<void> loadSession(String sessionId) async {
    try {
      _isLoading = true;
      notifyListeners();

      final snapshot = await _firestore
          .collection('live_chat_history')
          .doc(sessionId)
          .collection('messages')
          .orderBy('timestamp', descending: false)
          .get();

      _messages = snapshot.docs.map((doc) {
        return ChatMessage.fromJson({...doc.data(), 'id': doc.id});
      }).toList();

      _sessionId = sessionId;
      Logger.info('📂 Chat oturumu yüklendi: $sessionId');
    } catch (e) {
      Logger.error('Chat oturumu yükleme hatası: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Mesajları temizle
  void clearMessages() {
    _messages = [];
    _sessionId = null;
    notifyListeners();
    Logger.info('🗑️ Chat mesajları temizlendi');
  }

  /// Ollama servis durumu kontrol
  Future<bool> checkOllamaStatus() async {
    try {
      return await _ollamaService.isHealthy();
    } catch (e) {
      Logger.error('Ollama durum kontrolü hatası: $e');
      return false;
    }
  }
}
