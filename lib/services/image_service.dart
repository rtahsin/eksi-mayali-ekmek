import 'dart:convert';
import 'dart:typed_data';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:http/http.dart' as http;

import '../utils/logger.dart';
import 'audit_log_service.dart';

class ImageService {
  static const String apiKey = '9c88c7e566ca072177321b033376e409';

  /// Görsel URL'sini ImgBB'ye yükler
  static Future<String?> uploadImageFromUrl(String imageUrl, {String? name}) async {
    try {
      // URL'den görseli base64'e çevir
      final response = await http.get(Uri.parse(imageUrl));
      if (response.statusCode != 200) return null;

      final base64Image = base64Encode(response.bodyBytes);

      // ImgBB'ye yükle
      final uploadResponse = await http.post(
        Uri.parse('https://api.imgbb.com/1/upload'),
        body: {
          'key': apiKey,
          'image': base64Image,
          if (name != null) 'name': name,
        },
      );

      if (uploadResponse.statusCode != 200) return null;

      final result = json.decode(uploadResponse.body);
      return result['data']['display_url'];
    } catch (e) {
      Logger.error('Görsel yükleme hatası: $e');
      return null;
    }
  }

  // ImgBB'de yüklü olan ürün görsellerinin URL'leri
  static final Map<String, String> productImages = {
    'ekşi mayalı': 'https://i.ibb.co/1fTJ1WYH/photo-1549931319-a545dcf3bc73.jpg',
    'köy ekmeği': 'https://i.ibb.co/1fTJ1WYH/photo-1549931319-a545dcf3bc73.jpg',
    'çavdar': 'https://i.ibb.co/ytx34mb/avdar.jpg',
    'tam buğday': 'https://i.ibb.co/ytx34mb/avdar.jpg',
    'poğaça': 'https://i.ibb.co/bMfC5jdm/zeytinli.jpg',
    'zeytinli': 'https://i.ibb.co/bMfC5jdm/zeytinli.jpg',
    'sucuk': 'https://i.ibb.co/SX6x4hvS/photo-1509785307050-d4066910ec1e.jpg',
    'pastırma': 'https://i.ibb.co/SX6x4hvS/photo-1509785307050-d4066910ec1e.jpg',
    'kaşar': 'https://i.ibb.co/hN9pvcQ/ka-ar.jpg',
    'peynir': 'https://i.ibb.co/NgB7H4Vr/peynir.jpg',
    'kurabiye': 'https://i.ibb.co/C3bhDCWP/kurabiye.jpg',
    'pasta': 'https://i.ibb.co/xtt0dCh3/pasta.jpg',
    'croissant': 'https://i.ibb.co/ksNs9M6h/croissant.jpg',
    'kahve': 'https://i.ibb.co/mrHcnZjM/kahve.jpg',
    'limonata': 'https://i.ibb.co/p6grxynM/limonata.jpg',
    'simit': 'https://i.ibb.co/bMfC5jdm/zeytinli.jpg',
    'tahinli': 'https://i.ibb.co/bMfC5jdm/zeytinli.jpg',
    'cevizli': 'https://i.ibb.co/1fTJ1WYH/photo-1549931319-a545dcf3bc73.jpg',
    'meyveli': 'https://i.ibb.co/xtt0dCh3/pasta.jpg',
    'çikolatalı': 'https://i.ibb.co/C3bhDCWP/kurabiye.jpg',
    'peynirli': 'https://i.ibb.co/NgB7H4Vr/peynir.jpg',
    'sütlaç': 'https://i.ibb.co/xtt0dCh3/pasta.jpg',
    'ekmek': 'https://i.ibb.co/1fTJ1WYH/photo-1549931319-a545dcf3bc73.jpg',
    'bal': 'https://i.ibb.co/wZTDRx1p/bal.jpg',
  };

  // ImgBB'de yüklü olan kategori görsellerinin URL'leri
  static final Map<String, String> categoryImages = {
    'Ekmek Çeşitleri':
        'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=800&q=80',
    'Ekmekler':
        'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=800&q=80',
    'Süt Ürünleri':
        'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80',
    'Tatlılar':
        'https://images.unsplash.com/photo-1488477304112-4944851de03d?auto=format&fit=crop&w=800&q=80',
    'Şarküteri':
        'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=800&q=80',
    'İçecekler':
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    'Kahvaltılık':
        'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
    'Kurabiyeler':
        'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80',
    'Pastalar':
        'https://images.unsplash.com/photo-1488477304112-4944851de03d?auto=format&fit=crop&w=800&q=80',
    'Poğaçalar':
        'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=800&q=80',
  };

  /// Ürün için varsayılan görsel URL'si döndürür
  static String getDefaultProductImage(String productName) {
    final lowerName = productName.toLowerCase();
    String? imageUrl;

    // Önce tam eşleşme ara
    if (productImages.containsKey(lowerName)) {
      return productImages[lowerName]!;
    }

    // Tam eşleşme yoksa, içeren kelimeleri ara
    for (var entry in productImages.entries) {
      if (lowerName.contains(entry.key)) {
        imageUrl = entry.value;
        break;
      }
    }

    // Hiçbir eşleşme bulunamazsa varsayılan ekmek görselini döndür
    return imageUrl ?? productImages['ekmek']!;
  }

  /// Kategori için görsel URL'si döndürür
  static String getCategoryImage(String category) {
    final imageUrl = categoryImages[category];
    if (imageUrl != null) return imageUrl;

    // Eğer tam eşleşme bulunamazsa, benzer kategori adını ara
    final lowerCategory = category.toLowerCase();
    for (var entry in categoryImages.entries) {
      if (lowerCategory.contains(entry.key.toLowerCase()) ||
          entry.key.toLowerCase().contains(lowerCategory)) {
        return entry.value;
      }
    }

    // Hiçbir eşleşme bulunamazsa varsayılan ekmek görselini döndür
    return categoryImages['Ekmek Çeşitleri']!;
  }

  /// Eski Firebase Storage URL'lerini kontrol eder ve gerekirse default image döner
  /// Eski proje: eksi-mayali-ekmek.appspot.com
  /// Yeni proje: eksimayaliekmekweb.firebasestorage.app
  static String sanitizeImageUrl(String? url, String productName) {
    if (url == null || url.isEmpty) {
      return getDefaultProductImage(productName);
    }

    // Eski Firebase projesine ait URL'leri tespit et
    if (url.contains('eksi-mayali-ekmek.appspot.com')) {
      // Eski URL ise default image kullan
      return getDefaultProductImage(productName);
    }

    // Geçerli URL ise olduğu gibi döndür
    return url;
  }

  /// Genel amaçlı Firebase Storage görsel yükleme
  /// pathPrefix ör: 'blog-images/<id>' veya 'category-images/<id>'
  static Future<String> uploadBytesToStorage({
    required String pathPrefix,
    required Uint8List bytes,
    String? originalName,
    String contentType = 'image/jpeg',
    Map<String, dynamic>? audit,
  }) async {
    final storage = FirebaseStorage.instance;
    final safeName = (originalName ?? 'image')
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9._-]'), '_')
        .replaceAll(RegExp(r'_+'), '_');
    final ts = DateTime.now().millisecondsSinceEpoch;
    final path = '$pathPrefix/${ts}_$safeName';
    final ref = storage.ref().child(path);
    final snap = await ref.putData(bytes, SettableMetadata(contentType: contentType));
    final url = await snap.ref.getDownloadURL();
    await AuditLogService.instance.log('storage_image_upload', data: {
      'path': path,
      'size': bytes.length,
      if (audit != null) ...audit,
    });
    return url;
  }
}
