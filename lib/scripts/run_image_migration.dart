// ignore_for_file: avoid_print

/*
 * Standalone Migration Runner
 * 
 * Bu script terminal'den direkt çalıştırılabilir:
 * flutter run -d chrome lib/scripts/run_image_migration.dart
 */

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import '../firebase_options.dart';
import 'migrate_product_images.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase'i başlat
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  print('\n╔══════════════════════════════════════════════════════════════╗');
  print('║        🔧 Ürün Görsel URL Migration Script                  ║');
  print('╚══════════════════════════════════════════════════════════════╝\n');

  final migration = ProductImageMigration();

  // Önce durumu kontrol et
  print('📊 Migration durumu kontrol ediliyor...\n');
  final status = await migration.checkMigrationStatus();

  if (status['needsMigration'] > 0 || status['emptyUrls'] > 0) {
    print('\n⚠️  ${status['needsMigration']} ürün güncellemesi gerekiyor');
    print('⚠️  ${status['emptyUrls']} ürünün URL\'si boş\n');
    print('🚀 Migration başlatılıyor...\n');

    // Migration'ı çalıştır
    final result = await migration.migrateAllProducts();

    if (result['success']) {
      print('\n╔══════════════════════════════════════════════════════════════╗');
      print('║              ✅ MİGRATİON BAŞARILI!                          ║');
      print('╚══════════════════════════════════════════════════════════════╝');
      print('\n📊 Sonuçlar:');
      print('   ✅ Güncellenen Ürün: ${result['updatedProducts']}');
      print('   ❌ Hata: ${result['errorProducts']}');

      if (result['updatedProductNames'].isNotEmpty) {
        print('\n📦 Güncellenen Ürünler:');
        for (var name in result['updatedProductNames']) {
          print('   • $name');
        }
      }
    } else {
      print('\n❌ Migration başarısız: ${result['error']}');
    }
  } else {
    print('✅ Tüm ürünler güncel! Migration gerekmiyor.\n');
  }

  print('\n✨ Script tamamlandı. Çıkış için CTRL+C yapın.\n');
}
