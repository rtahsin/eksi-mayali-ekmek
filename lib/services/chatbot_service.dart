// ignore_for_file: prefer_const_constructors

/*
 * ChatBot Service
 * 
 * PURPOSE: Firestore'dan chatbot mesajlarını ve ayarlarını yönetir
 * LAYER: Service
 * DEPENDS ON: 
 *   - FirebaseFirestore
 *   - ChatBotMessage model
 *   - Logger
 * 
 * RULES:
 *   - Singleton pattern
 *   - Client-side filtering
 *   - Try-catch her metotta
 *   - Logger ile hata yonetimi
 * 
 * FEATURES:
 *   - ChatBot mesajlarını getir
 *   - Ayarları getir/güncelle
 *   - Admin CRUD işlemleri
 * 
 * LAST UPDATED: 2025-12-08
 */

import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/chatbot_message.dart';
import '../utils/logger.dart';

class ChatBotService {
  static final ChatBotService _instance = ChatBotService._internal();
  factory ChatBotService() => _instance;
  ChatBotService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// ChatBot ayarlarını getir
  Future<ChatBotSettings?> getSettings() async {
    try {
      Logger.info('🔍 ChatBot settings yükleniyor...');
      final doc = await _firestore.collection('chatbot_settings').doc('default').get();

      if (doc.exists) {
        Logger.info('✅ ChatBot settings Firestore\'dan yüklendi');
        final data = doc.data()!;
        data['id'] = doc.id;
        return ChatBotSettings.fromJson(data);
      }

      Logger.warning('⚠️ Firestore\'da settings yok, varsayılan döndürülüyor');

      // Varsayılan ayarlar
      return ChatBotSettings(
        id: 'default',
        welcomeMessage: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
        botName: 'EkmekLab Asistan',
        isEnabled: true,
        primaryColor: '#8B4513',
        position: 'bottom-right',
        updatedAt: DateTime.now(),
      );
    } catch (e) {
      Logger.error('ChatBot ayarları yüklenirken hata: $e');
      return null;
    }
  }

  /// ChatBot ayarlarını güncelle (Admin)
  Future<bool> updateSettings(ChatBotSettings settings) async {
    try {
      await _firestore
          .collection('chatbot_settings')
          .doc('default')
          .set(settings.toJson(), SetOptions(merge: true));

      Logger.info('ChatBot ayarları güncellendi');
      return true;
    } catch (e) {
      Logger.error('ChatBot ayarları güncellenirken hata: $e');
      return false;
    }
  }

  /// Tüm aktif mesajları getir
  Future<List<ChatBotMessage>> getAllMessages() async {
    try {
      final snapshot = await _firestore.collection('chatbot_messages').get();

      final messages = snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return ChatBotMessage.fromJson(data);
      }).toList();

      // Aktif olanları filtrele ve sırala
      final activeMessages = messages.where((m) => m.isActive).toList();
      activeMessages.sort((a, b) => a.order.compareTo(b.order));

      return activeMessages;
    } catch (e) {
      Logger.error('ChatBot mesajları yüklenirken hata: $e');
      return [];
    }
  }

  /// Belirli bir mesajı ID ile getir
  Future<ChatBotMessage?> getMessageById(String id) async {
    try {
      final doc = await _firestore.collection('chatbot_messages').doc(id).get();

      if (doc.exists) {
        final data = doc.data()!;
        data['id'] = doc.id;
        return ChatBotMessage.fromJson(data);
      }
      return null;
    } catch (e) {
      Logger.error('ChatBot mesajı yüklenirken hata: $e');
      return null;
    }
  }

  /// Kategori bazlı mesajları getir
  Future<List<ChatBotMessage>> getMessagesByCategory(String category) async {
    try {
      final snapshot = await _firestore.collection('chatbot_messages').get();

      final messages = snapshot.docs
          .map((doc) {
            final data = doc.data();
            data['id'] = doc.id;
            return ChatBotMessage.fromJson(data);
          })
          .where((m) => m.category == category && m.isActive)
          .toList();

      messages.sort((a, b) => a.order.compareTo(b.order));
      return messages;
    } catch (e) {
      Logger.error('Kategori bazlı mesajlar yüklenirken hata: $e');
      return [];
    }
  }

  /// Başlangıç (greeting) mesajını getir
  Future<ChatBotMessage?> getGreetingMessage() async {
    try {
      final messages = await getMessagesByCategory('greeting');
      return messages.isNotEmpty ? messages.first : null;
    } catch (e) {
      Logger.error('Karşılama mesajı yüklenirken hata: $e');
      return null;
    }
  }

  /// Yeni mesaj ekle (Admin)
  Future<String?> addMessage(ChatBotMessage message) async {
    try {
      Logger.info('➕ Firestore\'a yeni mesaj ekleniyor: ${message.message}');
      final docRef = await _firestore.collection('chatbot_messages').add(message.toJson());

      Logger.info('✅ Yeni ChatBot mesajı eklendi: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      Logger.error('❌ ChatBot mesajı eklenirken hata: $e');
      return null;
    }
  }

  /// Mesajı güncelle (Admin)
  Future<bool> updateMessage(String id, ChatBotMessage message) async {
    try {
      Logger.info('🔄 Firestore\'da mesaj güncelleniyor: $id');
      await _firestore.collection('chatbot_messages').doc(id).update(message.toJson());

      Logger.info('✅ ChatBot mesajı güncellendi: $id');
      return true;
    } catch (e) {
      Logger.error('❌ ChatBot mesajı güncellenirken hata: $e');
      return false;
    }
  }

  /// Mesajı sil (Admin)
  Future<bool> deleteMessage(String id) async {
    try {
      await _firestore.collection('chatbot_messages').doc(id).delete();

      Logger.info('ChatBot mesajı silindi: $id');
      return true;
    } catch (e) {
      Logger.error('ChatBot mesajı silinirken hata: $e');
      return false;
    }
  }

  /// Demo verileri oluştur (İlk kurulum için)
  Future<void> createDemoData() async {
    try {
      // Ayarları oluştur
      final settings = ChatBotSettings(
        id: 'default',
        welcomeMessage: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
        botName: 'EkmekLab Asistan',
        isEnabled: true,
        primaryColor: '#8B4513',
        position: 'bottom-right',
        updatedAt: DateTime.now(),
      );
      await updateSettings(settings);

      // Karşılama mesajı
      final greeting = ChatBotMessage(
        id: 'greeting_1',
        message: 'Merhaba! EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?',
        category: 'greeting',
        isActive: true,
        order: 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        options: [
          ChatBotOption(
            id: 'opt_1',
            text: '🍞 Ürünler hakkında bilgi',
            nextMessageId: 'product_info',
          ),
          ChatBotOption(
            id: 'opt_2',
            text: '📦 Sipariş takibi',
            nextMessageId: 'order_tracking',
          ),
          ChatBotOption(
            id: 'opt_3',
            text: '🚚 Teslimat bilgileri',
            nextMessageId: 'delivery_info',
          ),
          ChatBotOption(
            id: 'opt_4',
            text: '📞 İletişim',
            nextMessageId: 'contact_info',
          ),
        ],
      );

      await _firestore.collection('chatbot_messages').doc('greeting_1').set(greeting.toJson());

      Logger.info('ChatBot demo verileri oluşturuldu');
    } catch (e) {
      Logger.error('Demo veriler oluşturulurken hata: $e');
    }
  }
}
