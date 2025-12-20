/*
 * Ürün Görsel URL Migration Script
 * 
 * Bu script Firestore'daki ürünlerin imageUrl alanlarını kontrol eder
 * ve eski Firebase projesine (eksi-mayali-ekmek.appspot.com) ait URL'leri
 * temizler veya default image URL'leri ile değiştirir.
 * 
 * Kullanım:
 * 1. Firebase'e bağlı olduğunuzdan emin olun
 * 2. Admin panelinden bu scripti çalıştırın
 * 3. Script otomatik olarak tüm ürünleri tarayıp güncelleyecek
 */

import 'package:cloud_firestore/cloud_firestore.dart';

import '../services/image_service.dart';
import '../utils/logger.dart';

class ProductImageMigration {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Tüm ürünlerin imageUrl'lerini kontrol et ve gerekirse güncelle
  Future<Map<String, dynamic>> migrateAllProducts() async {
    int totalProducts = 0;
    int updatedProducts = 0;
    int errorProducts = 0;
    List<String> updatedProductNames = [];

    try {
      Logger.info('🔄 Ürün görsel migration başlıyor...');

      // Tüm ürünleri getir
      final snapshot = await _firestore.collection('urunler').get();
      totalProducts = snapshot.docs.length;

      Logger.info('📦 Toplam $totalProducts ürün bulundu');

      for (var doc in snapshot.docs) {
        try {
          final data = doc.data();
          final currentImageUrl = data['imageUrl'] as String?;
          final productName = data['name'] as String? ?? 'Bilinmeyen Ürün';

          // Eski Firebase projesine ait URL'leri tespit et
          if (currentImageUrl != null &&
              currentImageUrl.contains('eksi-mayali-ekmek.appspot.com')) {
            // Default image URL'ini al
            final newImageUrl = ImageService.getDefaultProductImage(productName);

            // Firestore'u güncelle
            await _firestore.collection('urunler').doc(doc.id).update({
              'imageUrl': newImageUrl,
              'imageUrlMigrated': true,
              'oldImageUrl': currentImageUrl, // Yedek olarak sakla
              'migratedAt': FieldValue.serverTimestamp(),
            });

            updatedProducts++;
            updatedProductNames.add(productName);
            Logger.info('✅ Güncellendi: $productName');
            Logger.info('   Eski: $currentImageUrl');
            Logger.info('   Yeni: $newImageUrl');
          } else if (currentImageUrl == null || currentImageUrl.isEmpty) {
            // imageUrl boş olanları da düzelt
            final newImageUrl = ImageService.getDefaultProductImage(productName);

            await _firestore.collection('urunler').doc(doc.id).update({
              'imageUrl': newImageUrl,
              'imageUrlMigrated': true,
              'migratedAt': FieldValue.serverTimestamp(),
            });

            updatedProducts++;
            updatedProductNames.add(productName);
            Logger.info('✅ Boş URL düzeltildi: $productName');
          }
        } catch (e) {
          errorProducts++;
          Logger.error('❌ Ürün güncellenemedi: ${doc.id} - Hata: $e');
        }
      }

      Logger.info('');
      Logger.info('🎉 Migration tamamlandı!');
      Logger.info('📊 İstatistikler:');
      Logger.info('   Toplam Ürün: $totalProducts');
      Logger.info('   Güncellenen: $updatedProducts');
      Logger.info('   Hata: $errorProducts');
      Logger.info('   Değişmeyen: ${totalProducts - updatedProducts - errorProducts}');

      return {
        'success': true,
        'totalProducts': totalProducts,
        'updatedProducts': updatedProducts,
        'errorProducts': errorProducts,
        'updatedProductNames': updatedProductNames,
      };
    } catch (e) {
      Logger.error('❌ Migration hatası: $e');
      return {
        'success': false,
        'error': e.toString(),
        'totalProducts': totalProducts,
        'updatedProducts': updatedProducts,
        'errorProducts': errorProducts,
      };
    }
  }

  /// Tek bir ürünün imageUrl'ini kontrol et ve güncelle
  Future<bool> migrateProduct(String productId) async {
    try {
      final doc = await _firestore.collection('urunler').doc(productId).get();

      if (!doc.exists) {
        Logger.error('❌ Ürün bulunamadı: $productId');
        return false;
      }

      final data = doc.data()!;
      final currentImageUrl = data['imageUrl'] as String?;
      final productName = data['name'] as String? ?? 'Bilinmeyen Ürün';

      if (currentImageUrl != null && currentImageUrl.contains('eksi-mayali-ekmek.appspot.com')) {
        final newImageUrl = ImageService.getDefaultProductImage(productName);

        await _firestore.collection('urunler').doc(productId).update({
          'imageUrl': newImageUrl,
          'imageUrlMigrated': true,
          'oldImageUrl': currentImageUrl,
          'migratedAt': FieldValue.serverTimestamp(),
        });

        Logger.info('✅ Ürün güncellendi: $productName');
        return true;
      }

      Logger.info('ℹ️ Ürün güncellemesi gerekmiyor: $productName');
      return false;
    } catch (e) {
      Logger.error('❌ Ürün güncellenemedi: $productId - Hata: $e');
      return false;
    }
  }

  /// Migration durumunu kontrol et (kaç ürün eski URL kullanıyor)
  Future<Map<String, dynamic>> checkMigrationStatus() async {
    try {
      final snapshot = await _firestore.collection('urunler').get();

      int totalProducts = snapshot.docs.length;
      int needsMigration = 0;
      int emptyUrls = 0;
      int validUrls = 0;

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final imageUrl = data['imageUrl'] as String?;

        if (imageUrl == null || imageUrl.isEmpty) {
          emptyUrls++;
        } else if (imageUrl.contains('eksi-mayali-ekmek.appspot.com')) {
          needsMigration++;
        } else {
          validUrls++;
        }
      }

      Logger.info('📊 Migration Durumu:');
      Logger.info('   Toplam Ürün: $totalProducts');
      Logger.info('   Güncellemesi Gereken: $needsMigration');
      Logger.info('   Boş URL: $emptyUrls');
      Logger.info('   Geçerli URL: $validUrls');

      return {
        'totalProducts': totalProducts,
        'needsMigration': needsMigration,
        'emptyUrls': emptyUrls,
        'validUrls': validUrls,
      };
    } catch (e) {
      Logger.error('❌ Durum kontrolü hatası: $e');
      return {
        'error': e.toString(),
      };
    }
  }
}
