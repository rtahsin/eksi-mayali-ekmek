// Ollama LLM Service
// Yerel LLM ile iletişim için servis

import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;

import '../models/product.dart';
import '../utils/logger.dart';

class OllamaService {
  static final OllamaService _instance = OllamaService._internal();
  factory OllamaService() => _instance;
  OllamaService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Backend URL (local development)
  static const String _backendUrl = 'http://localhost:3000';

  // Production'da farklı URL kullanılabilir
  // static const String _backendUrl = 'https://your-backend.com';

  // Development mode detection (kIsWeb için)
  // TRUE: localhost backend kullan (flutter run -d chrome)
  // FALSE: mock AI responses kullan (production deploy)
  static const bool _isLocalhost = false; // PRODUCTION: false, DEVELOPMENT: true

  /// LLM ile sohbet et
  Future<String?> chat({
    required String message,
    String? context,
    String model = 'llama3.2:latest',
  }) async {
    // Production'da localhost çalışmadığı için mock response dön
    if (!_isLocalhost) {
      Logger.warning('⚠️ Production mode - Mock AI yanıtı kullanılıyor');
      await Future.delayed(Duration(seconds: 2)); // Simüle et
      return await _getMockResponse(message);
    }

    try {
      Logger.info('🤖 Ollama\'ya mesaj gönderiliyor: $message');

      final response = await http
          .post(
            Uri.parse('$_backendUrl/api/chat'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'message': message,
              'context': context,
              'model': model,
            }),
          )
          .timeout(Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final aiResponse = data['message'] as String;
          Logger.info('✅ LLM yanıtı alındı: ${aiResponse.substring(0, 50)}...');
          return aiResponse;
        } else {
          Logger.error('❌ LLM yanıt vermedi: ${data['error']}');
          return null;
        }
      } else {
        Logger.error('❌ Backend hatası: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      Logger.error('❌ Ollama servis hatası: $e');
      // Fallback: Demo yanıtlar (production için)
      return await _getDemoResponse(message);
    }
  }

  /// Demo yanıtları (Backend erişilemediğinde)
  Future<String> _getDemoResponse(String message) async {
    final lowerMessage = message.toLowerCase();

    if (lowerMessage.contains('merhaba') ||
        lowerMessage.contains('selam') ||
        lowerMessage.contains('hi')) {
      return 'Merhaba! 🍞 EkmekLab\'a hoş geldiniz. Size nasıl yardımcı olabilirim?\n\n'
          '• Ürünlerimiz hakkında bilgi\n'
          '• Fiyat ve teslimat\n'
          '• İletişim bilgileri';
    }

    if (lowerMessage.contains('ürün') ||
        lowerMessage.contains('ekmek') ||
        lowerMessage.contains('urun')) {
      return await _getMockResponse(message);
    }

    if (lowerMessage.contains('fiyat') ||
        lowerMessage.contains('kaç') ||
        lowerMessage.contains('ne kadar')) {
      return await _getMockResponse(message);
    }

    if (lowerMessage.contains('teslimat') ||
        lowerMessage.contains('kargo') ||
        lowerMessage.contains('gönder')) {
      return 'Teslimat bilgileri:\n\n'
          '📦 Beylikdüzü içi: Ücretsiz (min. 50 TL)\n'
          '🚚 Teslimat süresi: 1-2 iş günü\n'
          '⏰ Sipariş saatleri: 09:00 - 18:00\n\n'
          'Sipariş için WhatsApp\'tan yazın:\nhttps://wa.me/905010126653';
    }

    if (lowerMessage.contains('iletişim') ||
        lowerMessage.contains('telefon') ||
        lowerMessage.contains('whatsapp')) {
      return 'İletişim bilgileri:\n\n'
          '📱 WhatsApp: https://wa.me/905010126653\n'
          '📞 Telefon: 0312 123 4567\n'
          '📧 Email: ekmeklab@gmail.com\n\n'
          'Mesai saatleri: Hafta içi 09:00 - 18:00';
    }

    if (lowerMessage.contains('sipariş') ||
        lowerMessage.contains('siparis') ||
        lowerMessage.contains('nasıl')) {
      return 'Sipariş vermek için:\n\n'
          '1️⃣ WhatsApp: https://wa.me/905010126653\n'
          '2️⃣ Telefon: 0312 123 4567\n'
          '3️⃣ Web sitesi üzerinden sepete ekleyin\n\n'
          'Minimum sipariş: 50 TL\n'
          'Ödeme: Kapıda nakit/kart veya online';
    }

    // Genel yanıt
    return 'EkmekLab hakkında daha fazla bilgi için:\n\n'
        '• Ürünlerimizi inceleyebilirsiniz\n'
        '• WhatsApp: https://wa.me/905010126653\n'
        '• Email: ekmeklab@gmail.com\n\n'
        'Size nasıl yardımcı olabilirim? 🍞';
  }

  /// Mevcut modelleri getir
  Future<List<String>> getModels() async {
    try {
      final response = await http
          .get(
            Uri.parse('$_backendUrl/api/models'),
          )
          .timeout(Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final models = (data['models'] as List).map((m) => m['name'] as String).toList();
        Logger.info('📋 Mevcut modeller: $models');
        return models;
      }
      return [];
    } catch (e) {
      Logger.error('Model listesi alınamadı: $e');
      return [];
    }
  }

  /// Mock AI yanıtları (production için)
  Future<String> _getMockResponse(String message) async {
    final lowerMessage = message.toLowerCase();

    // Ürün soruları - Firestore'dan gerçek ürünleri çek
    if (lowerMessage.contains('ürün') ||
        lowerMessage.contains('ekmek') ||
        lowerMessage.contains('çeşit')) {
      try {
        final snapshot = await _firestore
            .collection('urunler')
            .where('deleted', isEqualTo: false)
            .where('inStock', isEqualTo: true)
            .limit(5)
            .get();

        if (snapshot.docs.isNotEmpty) {
          final products = snapshot.docs.map((doc) {
            final data = doc.data();
            return Product.fromJson({...data, 'id': doc.id});
          }).toList();

          final productList = products
              .map((p) => '🍞 ${p.name} (${p.weight}g): ${p.price.toStringAsFixed(0)} TL')
              .join('\n');

          return 'Merhaba! 🍞 Ürünlerimiz:\n\n$productList\n\nHangi ürünümüz hakkında detaylı bilgi istersiniz?';
        }
      } catch (e) {
        Logger.error('Ürünler çekilemedi: $e');
      }

      return 'Merhaba! 🍞 Elimizde ekşi mayalı ekmek ve çavdar ekmeği bulunuyor. Her ikisi de organik buğdaydan, doğal fermentasyon ile hazırlanıyor. Fiyatlarımız 30 TL ve 35 TL. Hangi ürünümüz hakkında detaylı bilgi istersiniz?';
    }

    // Fiyat soruları - Firestore'dan gerçek fiyatları çek
    if (lowerMessage.contains('fiyat') ||
        lowerMessage.contains('kaç') ||
        lowerMessage.contains('tl')) {
      try {
        final snapshot = await _firestore
            .collection('urunler')
            .where('deleted', isEqualTo: false)
            .where('inStock', isEqualTo: true)
            .limit(10)
            .get();

        if (snapshot.docs.isNotEmpty) {
          final products = snapshot.docs.map((doc) {
            final data = doc.data();
            return Product.fromJson({...data, 'id': doc.id});
          }).toList();

          final priceList = products
              .map((p) => '🍞 ${p.name} (${p.weight}g): ${p.price.toStringAsFixed(0)} TL')
              .join('\n');

          return 'Ürün fiyatlarımız:\n\n$priceList\n\nToplu siparişlerde indirim yapıyoruz. Sipariş vermek için:\nhttps://wa.me/905010126653';
        }
      } catch (e) {
        Logger.error('Fiyatlar çekilemedi: $e');
      }

      return 'Ürün fiyatlarımız:\n🍞 Ekşi Mayalı Ekmek (500g): 30 TL\n🍞 Çavdar Ekmeği (500g): 35 TL\n\nToplu siparişlerde indirim yapıyoruz. Sipariş vermek için:\nhttps://wa.me/905010126653';
    }

    // Teslimat soruları
    if (lowerMessage.contains('teslimat') ||
        lowerMessage.contains('kargo') ||
        lowerMessage.contains('gönder')) {
      return 'Beylikdüzü içi ücretsiz teslimat yapıyoruz! 📦 Minimum sipariş tutarı 50 TL. Sipariş vermek için:\n📱 WhatsApp: https://wa.me/905010126653\n☎️ Telefon: 0312 345 6789\n✉️ Email: ekmeklab@gmail.com';
    }

    // İletişim soruları
    if (lowerMessage.contains('iletişim') ||
        lowerMessage.contains('telefon') ||
        lowerMessage.contains('whatsapp') ||
        lowerMessage.contains('ulaş')) {
      return 'Bize ulaşmak için:\n📱 WhatsApp: https://wa.me/905010126653\n☎️ Telefon: 0312 345 6789\n✉️ Email: ekmeklab@gmail.com\n📍 Adres: Beylikdüzü, İstanbul\n\nMesai saatleri: 09:00 - 18:00 (Hafta içi)';
    }

    // Sipariş soruları
    if (lowerMessage.contains('sipariş') ||
        lowerMessage.contains('al') ||
        lowerMessage.contains('satın')) {
      return 'Sipariş vermek çok kolay! 🛒\n\n1️⃣ WhatsApp\'tan yazın: https://wa.me/905010126653\n2️⃣ Ürünlerinizi seçin\n3️⃣ Adres bilgilerinizi verin\n4️⃣ Ödeme yapın (Kapıda nakit veya kartla)\n\nBeylikdüzü içi aynı gün teslimat! 🚚';
    }

    // Genel selamlaşma
    if (lowerMessage.contains('merhaba') ||
        lowerMessage.contains('selam') ||
        lowerMessage.contains('hey')) {
      return 'Merhaba! 🍞 EkmekLab\'a hoş geldiniz. Ben size yardımcı olabilirim. Ekşi mayalı ekmeklerimiz hakkında bilgi almak, sipariş vermek veya iletişime geçmek ister misiniz?';
    }

    // Varsayılan yanıt
    return 'Size yardımcı olmak isterim! 🍞 Ekşi mayalı ekmeklerimiz hakkında bilgi alabilir, fiyatları öğrenebilir veya sipariş verebilirsiniz. Daha spesifik bir soru sorabilir misiniz?\n\n💡 İpucu: "ürünler", "fiyatlar", "sipariş", "teslimat" veya "iletişim" hakkında sorabilirsiniz.';
  }

  /// Backend sağlık kontrolü
  Future<bool> isHealthy() async {
    if (!_isLocalhost) return false; // Production'da localhost olmaz

    try {
      final response = await http
          .get(
            Uri.parse('$_backendUrl/health'),
          )
          .timeout(Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
