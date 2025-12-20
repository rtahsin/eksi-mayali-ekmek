// ignore_for_file: avoid_print

// Basit migration script'i: 'kullanicilar' koleksiyonundaki belgeleri 'users' koleksiyonuna kopyalar.
// Çalıştırmadan önce: firebase_options.dart doğru yapılandırılmış olmalı.
// Komut:
// flutter run -d chrome -t scripts/migrate_kullanicilar_to_users.dart (veya uygun platform)

import 'package:cloud_firestore/cloud_firestore.dart';
// Doğru import: package üzerinden Firebase options
import 'package:eksi_mayali_ekmek_web/firebase_options.dart';
import 'package:firebase_core/firebase_core.dart';

Future<void> main() async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  final firestore = FirebaseFirestore.instance;

  final oldSnap = await firestore.collection('kullanicilar').get();
  print('Toplam eski kullanıcı belgesi: ${oldSnap.size}');

  for (final doc in oldSnap.docs) {
    final data = doc.data();
    // Var olan 'users' belgesini kontrol et
    final target = await firestore.collection('users').doc(doc.id).get();
    if (target.exists) {
      print('Atlandı (zaten var): ${doc.id}');
      // İsterseniz merge yapabilirsiniz
      await firestore.collection('users').doc(doc.id).set(data, SetOptions(merge: true));
    } else {
      await firestore.collection('users').doc(doc.id).set(data);
      print('Kopyalandı: ${doc.id}');
    }
  }

  print('Migration tamamlandı. Gerekirse manuel olarak "kullanicilar" belgelerini silebilirsiniz.');
}
