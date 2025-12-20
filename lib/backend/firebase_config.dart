// ignore_for_file: depend_on_referenced_packages, avoid_print

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../utils/logger.dart';

class FirebaseConfig {
  // Firebase başlatma
  static Future<void> initializeFirebase() async {
    try {
      await Firebase.initializeApp(
        options: const FirebaseOptions(
          apiKey: "AIzaSyDC_r1CdLMa3JqtxiqFdsDAF8zAaOE7bH8", // Ekran görüntüsünden tahmini API key
          authDomain: "eksimayaliekmekweb.firebaseapp.com",
          projectId: "eksimayaliekmekweb",
          storageBucket: "eksimayaliekmekweb.firebasestorage.app",
          messagingSenderId: "984417239539",
          appId: "1:984417239539:web:544b34c57488722f6a1286",
        ),
      );
      if (kDebugMode) {
        Logger.error('Firebase başarıyla başlatıldı');
      }
    } catch (e) {
      if (kDebugMode) {
        Logger.error('Firebase başlatma hatası: $e');
      }
      rethrow;
    }
  }

  // Firestore koleksiyon referansları
  static final FirebaseFirestore firestore = FirebaseFirestore.instance;
  static final CollectionReference usersCollection =
      firestore.collection('users'); // Birleştirilmiş kullanıcılar koleksiyonu
  static final CollectionReference productsCollection = firestore.collection('urunler');
  static final CollectionReference ordersCollection = firestore.collection('siparisler');
  static final CollectionReference blogPostsCollection = firestore.collection('blogPostlar');
  static final CollectionReference settingsCollection = firestore.collection('ayarlar');

  // Auth referansı
  static final FirebaseAuth auth = FirebaseAuth.instance;

  // Kullanıcı oturum durumu kontrolü
  static bool isUserLoggedIn() {
    return auth.currentUser != null;
  }

  // Geçerli kullanıcı ID'sini al
  static String? getCurrentUserId() {
    return auth.currentUser?.uid;
  }

  // Admin yetkisi kontrolü
  static Future<bool> isUserAdmin() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        Logger.error('isUserAdmin: Kullanıcı oturum açmamış');
        return false;
      }

      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();

      if (!userDoc.exists) {
        Logger.error('isUserAdmin: Kullanıcı belgesi bulunamadı');
        return false;
      }

      final userData = userDoc.data();
      if (userData == null) {
        Logger.error('isUserAdmin: Kullanıcı verisi boş');
        return false;
      }

      // Admin kontrolü için birden fazla alan kontrol ediliyor
      final bool isAdmin = userData['isAdmin'] == true;
      final bool hasAdminRole = userData['role'] == 'admin';
      final bool isAdminUser = userData['user'] == 'admin';

      print('isUserAdmin: isAdmin=$isAdmin, hasAdminRole=$hasAdminRole, isAdminUser=$isAdminUser');

      // Herhangi biri true ise admin olarak kabul et
      return isAdmin || hasAdminRole || isAdminUser;
    } catch (e) {
      Logger.error('isUserAdmin hata: $e');
      return false;
    }
  }
}
