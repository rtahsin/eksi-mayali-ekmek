// ignore_for_file: avoid_unused_constructor_parameters, unused_element

/*
 * Kimlik Doğrulama Servisi (AuthService)
 * 
 * Bu dosya, kullanıcı kimlik doğrulama, oturum yönetimi ve kullanıcı profili
 * işlemlerini yöneten AuthService sınıfını içerir.
 * 
 * Özellikler:
 * - Kullanıcı girişi ve kaydı
 * - Oturum durumu yönetimi
 * - Kullanıcı profili güncelleme
 * - Admin yetki kontrolü
 * - Favori ürünler yönetimi
 * - Kullanıcı verilerinin yerel depolanması
 * 
 * Kullanılan servisler:
 * - Firebase Authentication: Kullanıcı kimlik doğrulama
 * - Firestore: Kullanıcı verilerinin saklanması
 * - SharedPreferences: Yerel veri depolama
 * - ApiService: Uzak API ile iletişim
 * 
 * Güncelleme Tarihi: Haziran 2023
 */

import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:eksi_mayali_ekmek_web/domain/repositories/i_user_repository.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/address.dart' as address_model;
import '../models/user.dart' as app_models;
import '../utils/constants.dart';
import '../utils/logger.dart';
import 'api_service.dart';
import 'rate_limiter_service.dart';
// Conditional import: use package:web on web, stub on other platforms
import 'web_stub.dart' if (dart.library.html) 'package:web/web.dart' as web;

/// Kullanıcı kimlik doğrulama ve profil yönetimi için servis sınıfı
///
/// Bu sınıf, kullanıcı hesap işlemlerini (giriş, kayıt, çıkış) ve
/// profil yönetimini (veri alıp-kaydetme, yetki kontrolü) sağlar.
///
/// Nasıl Çalışır:
/// 1. Firebase Authentication kullanarak kullanıcının giriş/çıkış işlemlerini yapar
/// 2. Firestore'da kullanıcının profilini saklar ve günceller
/// 3. Admin yetkisi için Firestore'da özel bir koleksiyon kontrol eder
/// 4. Kullanıcı bilgilerini SharedPreferences'a kaydederek çevrimdışı erişim sağlar
///
/// Kod yapısı:
/// - Getter metodları: Mevcut kullanıcı, oturum durumu gibi basit bilgileri sağlar
/// - Kimlik doğrulama: login(), register(), logout() metodları
/// - Profil yönetimi: updateProfile(), addAddress() vb.
/// - Admin kontrolleri: checkAdminPermission(), isAdmin getter'ı
/// - Favori ürün yönetimi: addToFavorites(), removeFromFavorites()
class AuthService with ChangeNotifier {
  app_models.User? _currentUser;
  bool _isLoading = false;
  String? _token;
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ApiService _apiService = ApiService();
  final IUserRepository _userRepository;

  // Özel admin e-posta adresi
  // Bu e-posta ile giriş yapan kullanıcı her zaman admin olarak işaretlenir
  static const String superAdminEmail = 'tahsinreyhan@gmail.com';

  // Constructor - kullanıcı repository'si enjekte edilir ve persistence ayarla
  AuthService(this._userRepository) {
    _initializePersistence();
    _listenToAuthStateChanges();
  }
  String? _latestPhoneVerificationId;

  // Firebase Auth state değişikliklerini dinle
  void _listenToAuthStateChanges() {
    _auth.authStateChanges().listen((firebase_auth.User? firebaseUser) async {
      if (firebaseUser != null && _currentUser == null) {
        // Firebase oturum var ama AuthService bilmiyor - oturumu yükle
        Logger.info('Firebase Auth state değişti - oturum yükleniyor: ${firebaseUser.email}');
        await _loadUserFromFirebase(firebaseUser);
      } else if (firebaseUser == null && _currentUser != null) {
        // Firebase oturum yok ama AuthService hala kullanıcı tutuyor - temizle
        Logger.info('Firebase Auth state değişti - oturum sonlandırılıyor');
        _currentUser = null;
        _token = null;
        notifyListeners();
      }
    });
  }

  // Firebase'den kullanıcı bilgilerini yükle
  Future<void> _loadUserFromFirebase(firebase_auth.User firebaseUser) async {
    try {
      _token = await firebaseUser.getIdToken();
      final userDoc =
          await _firestore.collection(FirestoreCollections.users).doc(firebaseUser.uid).get();

      if (userDoc.exists) {
        final userData = userDoc.data() as Map<String, dynamic>;
        final isUserAdmin = await _checkIfUserIsAdmin(firebaseUser.uid, firebaseUser.email ?? '');
        _currentUser = app_models.User.fromJson({...userData, 'isAdmin': isUserAdmin});
        await _saveUserToPrefs();
        notifyListeners();
        Logger.info('Kullanıcı Firebase\'den yüklendi: ${_currentUser!.email}');
      }
    } catch (e) {
      Logger.error('Firebase\'den kullanıcı yükleme hatası: $e');
    }
  }

  // Firebase Auth persistence'ı ayarla
  Future<void> _initializePersistence() async {
    try {
      // Web'de LOCAL persistence kullan (tarayıcı kapansa bile oturum açık kalır)
      if (kIsWeb) {
        await _auth.setPersistence(firebase_auth.Persistence.LOCAL);
        Logger.info('Firebase Auth persistence LOCAL olarak ayarlandı');
      }
      // Mobil'de zaten varsayılan olarak persistence var
    } catch (e) {
      Logger.error('Persistence ayarlama hatası: $e');
    }
  }

  // Pending registration - e-posta doğrulanmadan önce geçici bilgiler
  Map<String, String>? _pendingRegistration;

  // Getter metodları - sınıf dışından mevcut durumu almak için
  app_models.User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null && _token != null;
  String? get token => _token;

  // Kullanıcının giriş yapıp yapmadığını kontrol et
  bool get isLoggedIn => _currentUser != null;

  // Admin yetki kontrolü
  // Bu getter, mevcut kullanıcının admin yetkisine sahip olup olmadığını döndürür
  bool get isAdmin {
    // Kullanıcı giriş yapmamışsa admin değildir
    if (_currentUser == null) return false;

    // Kullanıcının admin yetkisi varsa true döndür
    return _currentUser?.isAdmin ?? false;
  }

  // Rol yardımcıları
  String get currentRole {
    if (_currentUser == null) return 'anonymous';
    // Özel superadmin e-posta
    if (_currentUser!.email.toLowerCase() == superAdminEmail) return 'superadmin';
    return _currentUser!.role;
  }

  bool hasRole(String role) => currentRole == role;
  bool hasAnyRole(List<String> roles) => roles.contains(currentRole);
  int _roleRank(String role) {
    switch (role) {
      case 'superadmin':
        return 5;
      case 'admin':
        return 4;
      case 'editor':
        return 3;
      case 'support':
        return 2;
      case 'user':
        return 1;
      default:
        return 0;
    }
  }

  bool hasAtLeast(String role) => _roleRank(currentRole) >= _roleRank(role);
  bool get canManageContent => hasAtLeast('editor');
  bool get canManageOrders => hasAtLeast('support');
  bool get canManageAdmins => hasAtLeast('superadmin');

  // Kullanıcının admin yetkisini kontrol et
  // Bu metod, Firestore veritabanından admin yetkisini kontrol eder
  Future<bool> checkAdminPermission() async {
    try {
      // Kullanıcı giriş yapmamışsa admin değildir
      if (_currentUser == null || _token == null) {
        Logger.info('checkAdminPermission: Kullanıcı giriş yapmamış');
        return false;
      }

      Logger.info('checkAdminPermission: Admin yetkisi kontrol ediliyor: ${_currentUser!.email}');

      // Özel admin hesabı kontrolü - superAdminEmail her zaman admin olmalı
      if (_currentUser!.email.toLowerCase() == superAdminEmail) {
        Logger.info('checkAdminPermission: Özel admin hesabı tespit edildi');

        // Admin koleksiyonuna ekle veya güncelle
        await _firestore.collection(FirestoreCollections.admins).doc(_currentUser!.id).set({
          'email': _currentUser!.email,
          'isActive': true,
          'role': 'superadmin',
          'createdAt': DateTime.now().toIso8601String(),
          'updatedAt': DateTime.now().toIso8601String(),
        }, SetOptions(merge: true));

        // Kullanıcı bilgilerini güncelle
        _currentUser = _currentUser!.copyWith(isAdmin: true);

        // Kullanıcı koleksiyonunda da admin olarak işaretle
        await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
          'isAdmin': true,
          'role': 'admin',
          'updatedAt': DateTime.now().toIso8601String(),
        });

        await _saveUserToPrefs();

        Logger.info('checkAdminPermission: Admin yetkisi verildi');
        return true;
      }

      // Admin koleksiyonundan kullanıcıyı kontrol et
      final adminDoc =
          await _firestore.collection(FirestoreCollections.admins).doc(_currentUser!.id).get();

      // Kullanıcı admin koleksiyonunda varsa ve aktifse admin yetkisi vardır
      if (adminDoc.exists) {
        final adminData = adminDoc.data() as Map<String, dynamic>;
        final isActive = adminData['isActive'] ?? false;
        Logger.info(
            'checkAdminPermission: Admin koleksiyonunda kullanıcı bulundu. isActive: $isActive');

        // Kullanıcı bilgilerini güncelle
        _currentUser = _currentUser!.copyWith(isAdmin: isActive);
        await _saveUserToPrefs();

        return isActive;
      }

      // Kullanıcı admin koleksiyonunda yoksa admin yetkisi yoktur
      Logger.info('checkAdminPermission: Kullanıcı admin koleksiyonunda bulunamadı');
      _currentUser = _currentUser!.copyWith(isAdmin: false);
      await _saveUserToPrefs();

      return false;
    } catch (e) {
      Logger.error('Admin yetki kontrolü hatası: $e');
      return false;
    }
  }

  // Kullanıcı girişi
  Future<bool> login(String email, String password) async {
    try {
      // Rate limiting kontrolü
      final rateLimitCheck = await RateLimiterService.canAttemptLogin();
      if (!(rateLimitCheck['allowed'] as bool)) {
        throw Exception(rateLimitCheck['reason']);
      }

      // Giriş için email ve şifre kontrolü
      if (email.isEmpty || password.isEmpty) {
        throw Exception('E-posta ve şifre gereklidir');
      }

      // Firebase Auth ile giriş yap
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (userCredential.user == null) {
        throw Exception('Giriş başarısız');
      }

      // Token al
      final token = await userCredential.user!.getIdToken();
      _token = token;

      // Firestore'dan kullanıcı bilgilerini al
      final userDoc = await _firestore
          .collection(FirestoreCollections.users)
          .doc(userCredential.user!.uid)
          .get();

      // Kullanıcı bulunamadıysa yeni oluştur
      if (!userDoc.exists) {
        // Admin yetkisini kontrol et
        final isUserAdmin = await _checkIfUserIsAdmin(userCredential.user!.uid, email);

        // Yeni kullanıcı oluştur
        final newUser = app_models.User(
          id: userCredential.user!.uid,
          email: email,
          fullName: userCredential.user!.displayName ?? email.split('@')[0],
          isAdmin: isUserAdmin,
          favoriteProductIds: [],
          createdAt: DateTime.now(),
        );

        // Firestore'a kaydet
        await _firestore.collection(FirestoreCollections.users).doc(userCredential.user!.uid).set({
          ...newUser.toJson(),
          'provider': 'password',
          'emailVerified': userCredential.user!.emailVerified,
          'lastLogin': DateTime.now().toIso8601String(),
        });

        _currentUser = newUser;
      } else {
        // Mevcut kullanıcıyı al
        final userData = userDoc.data() as Map<String, dynamic>;

        // E-posta doğrulaması ve hesap aktifliği zorunlu (Google hariç)
        final isGoogle = (userData['provider'] == 'google');
        final isEmailVerified =
            (userData['emailVerified'] == true) || userCredential.user!.emailVerified;
        final isActive = (userData['isActive'] == true);

        if (!isGoogle && !isEmailVerified) {
          await _auth.signOut();
          throw Exception(
              'E-posta doğrulanmamış. Lütfen e-posta adresinize gelen 6 haneli kodu girin.');
        }

        if (!isGoogle && !isActive) {
          await _auth.signOut();
          throw Exception('Hesabınız henüz aktif değil. Lütfen e-posta doğrulamasını tamamlayın.');
        }

        // Admin yetkisini kontrol et
        final isUserAdmin = await _checkIfUserIsAdmin(userCredential.user!.uid, email);

        // Son giriş zamanını güncelle
        await _firestore
            .collection(FirestoreCollections.users)
            .doc(userCredential.user!.uid)
            .update({
          'lastLogin': DateTime.now().toIso8601String(),
          'isAdmin': isUserAdmin, // Admin yetkisini güncelle
          'emailVerified': isEmailVerified,
        });

        _currentUser = app_models.User.fromJson({...userData, 'isAdmin': isUserAdmin});
      }

      // Kullanıcı bilgilerini locale kaydet
      await _saveUserToPrefs();

      // Başarılı giriş - rate limit sayacını sıfırla
      await RateLimiterService.resetAttempts();

      Logger.info('Giriş başarılı: ${_currentUser!.email}');
      Logger.info('Favori ürünler: ${_currentUser!.favoriteProductIds}');

      // UI'ı güncelle
      notifyListeners();
      return true;
    } on firebase_auth.FirebaseAuthException catch (e) {
      // Başarısız giriş - rate limit sayacını artır
      await RateLimiterService.recordFailedAttempt();

      String errorMessage;

      switch (e.code) {
        case 'user-not-found':
          errorMessage = 'Kullanıcı bulunamadı';
          break;
        case 'wrong-password':
          errorMessage = 'Hatalı şifre';
          break;
        case 'invalid-email':
          errorMessage = 'Geçersiz e-posta formatı';
          break;
        case 'user-disabled':
          errorMessage = 'Kullanıcı hesabı devre dışı bırakılmış';
          break;
        default:
          errorMessage = 'Giriş hatası: ${e.message}';
      }

      throw Exception(errorMessage);
    } catch (e) {
      // Rate limit hatası için sayaç artırma (diğer hatalar için değil)
      if (e.toString().contains('Çok fazla başarısız deneme')) {
        // Zaten kaydedildi
      }
      rethrow;
    }
  }

  /// Web'de redirect sonucunu kontrol et ve işle
  Future<void> handleRedirectResult() async {
    if (!kIsWeb) return;

    try {
      Logger.info('Redirect result kontrolü yapılıyor...');
      final result = await _auth.getRedirectResult();

      if (result.user != null) {
        Logger.info('Redirect sonucu bulundu, kullanıcı giriş yapıyor: ${result.user!.email}');

        // Token al
        _token = await result.user!.getIdToken();

        // Kullanıcı bilgilerini işle
        final userDoc =
            await _firestore.collection(FirestoreCollections.users).doc(result.user!.uid).get();

        final email = result.user!.email ?? '';
        final displayName =
            result.user!.displayName ?? (email.isNotEmpty ? email.split('@')[0] : 'Kullanıcı');

        final isUserAdmin = await _checkIfUserIsAdmin(result.user!.uid, email);

        if (!userDoc.exists) {
          final newUser = app_models.User(
            id: result.user!.uid,
            email: email,
            fullName: displayName,
            isAdmin: isUserAdmin,
            favoriteProductIds: [],
            createdAt: DateTime.now(),
          );

          await _firestore.collection(FirestoreCollections.users).doc(result.user!.uid).set({
            ...newUser.toJson(),
            'isAdmin': isUserAdmin,
            'provider': 'google',
            'lastLogin': DateTime.now().toIso8601String(),
          }, SetOptions(merge: true));

          _currentUser = newUser;
        } else {
          final data = userDoc.data() as Map<String, dynamic>;
          _currentUser = app_models.User.fromJson({
            ...data,
            'isAdmin': isUserAdmin,
          });

          await _firestore.collection(FirestoreCollections.users).doc(result.user!.uid).update({
            'lastLogin': DateTime.now().toIso8601String(),
            'isAdmin': isUserAdmin,
            'provider': 'google',
            'updatedAt': DateTime.now().toIso8601String(),
          });
        }

        await _saveUserToPrefs();
        notifyListeners();
        Logger.info('Redirect ile giriş başarılı');
      } else {
        Logger.info('Redirect sonucu yok');
      }
    } catch (e) {
      Logger.error('Redirect result işleme hatası: $e');
    }
  }

  // Google ile giriş / kayıt (Web ve Mobil destekli)
  Future<bool> signInWithGoogle() async {
    try {
      _isLoading = true;
      notifyListeners();

      firebase_auth.UserCredential userCredential;

      if (kIsWeb) {
        // Web'de hesap seçimini zorlamak için custom parameter ekle
        final provider = firebase_auth.GoogleAuthProvider();
        provider.setCustomParameters({'prompt': 'select_account'});

        // Mobil tarayıcı kontrolü - user agent'ta mobile varsa direkt redirect kullan
        final isMobileBrowser = _isMobileBrowser();

        if (isMobileBrowser) {
          // Mobil tarayıcılarda popup genelde engellenir, direkt redirect kullan
          Logger.info('Mobil tarayıcı tespit edildi, redirect kullanılıyor');
          await _auth.signInWithRedirect(provider);
          _isLoading = false;
          notifyListeners();
          return true;
        } else {
          // Desktop'ta popup dene, engellenirse redirect
          try {
            userCredential = await _auth.signInWithPopup(provider);
          } catch (e) {
            Logger.warning('Popup engellendi, redirect\'e geçiliyor: $e');
            await _auth.signInWithRedirect(provider);
            _isLoading = false;
            notifyListeners();
            return true;
          }
        }
      } else {
        // Mobil için Google Sign-In
        try {
          final googleSignIn = GoogleSignIn(
            scopes: ['email', 'profile'],
          );

          // signOut() çağrılmıyor - session state kaybına neden oluyor
          // Çoklu hesap için kullanıcı doğrudan seçim yapabilir

          final googleUser = await googleSignIn.signIn();
          if (googleUser == null) {
            Logger.info('Google Sign-In: Kullanıcı iptal etti');
            _isLoading = false;
            notifyListeners();
            return false; // Kullanıcı iptal etti
          }

          Logger.info('Google Sign-In: Kullanıcı seçildi: ${googleUser.email}');

          final googleAuth = await googleUser.authentication;

          if (googleAuth.accessToken == null || googleAuth.idToken == null) {
            throw Exception('Google kimlik doğrulama bilgileri alınamadı');
          }

          Logger.info('Google Sign-In: Token alındı');

          final credential = firebase_auth.GoogleAuthProvider.credential(
            accessToken: googleAuth.accessToken,
            idToken: googleAuth.idToken,
          );

          userCredential = await _auth.signInWithCredential(credential);
          Logger.info('Google Sign-In: Firebase auth başarılı');
        } catch (e) {
          Logger.error('Google Sign-In mobil hatası: $e');
          _isLoading = false;
          notifyListeners();

          if (e.toString().contains('DEVELOPER_ERROR') ||
              e.toString().contains('ApiException') ||
              e.toString().contains('10:')) {
            throw Exception('Google giriş yapılandırması eksik.\n\n'
                'Geçici çözüm: E-posta ve şifre ile giriş yapabilirsiniz.');
          } else if (e.toString().contains('network')) {
            throw Exception('İnternet bağlantınızı kontrol edin.');
          } else if (e.toString().contains('sign_in_canceled')) {
            return false; // Kullanıcı iptal etti
          }

          throw Exception('Google ile giriş yapılamadı. Lütfen e-posta/şifre ile deneyin.');
        }
      }

      final user = userCredential.user;
      if (user == null) {
        _isLoading = false;
        notifyListeners();
        throw Exception('Google ile giriş başarısız');
      }

      _token = await user.getIdToken();

      // Firestore'da kullanıcı belgesini kontrol et
      final userDoc = await _firestore.collection(FirestoreCollections.users).doc(user.uid).get();

      final email = user.email ?? '';
      final displayName =
          user.displayName ?? (email.isNotEmpty ? email.split('@')[0] : 'Kullanıcı');

      // Admin kontrolü
      final isUserAdmin = await _checkIfUserIsAdmin(user.uid, email);

      if (!userDoc.exists) {
        // Yeni kullanıcı oluştur
        final newUser = app_models.User(
          id: user.uid,
          email: email,
          fullName: displayName,
          isAdmin: isUserAdmin,
          favoriteProductIds: [],
          createdAt: DateTime.now(),
        );

        await _firestore.collection(FirestoreCollections.users).doc(user.uid).set({
          ...newUser.toJson(),
          'isAdmin': isUserAdmin,
          'provider': 'google',
          'lastLogin': DateTime.now().toIso8601String(),
        }, SetOptions(merge: true));
        _currentUser = newUser;
      } else {
        final data = userDoc.data() as Map<String, dynamic>;
        _currentUser = app_models.User.fromJson({
          ...data,
          'isAdmin': isUserAdmin,
        });
        // Son giriş zamanını güncelle
        await _firestore.collection(FirestoreCollections.users).doc(user.uid).update({
          'lastLogin': DateTime.now().toIso8601String(),
          'isAdmin': isUserAdmin,
          'provider': 'google',
          'updatedAt': DateTime.now().toIso8601String(),
        });
      }

      await _saveUserToPrefs();
      Logger.info('Google Sign-In tamamlandı: ${_currentUser!.email}');
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Google ile giriş hatası: $e');
      _isLoading = false;
      notifyListeners();

      // Hata mesajını kullanıcı dostu yap
      if (e is Exception) {
        rethrow; // Zaten formatlı Exception
      }

      throw Exception(
          'Google ile giriş hatası. Lütfen tekrar deneyin veya e-posta/şifre ile giriş yapın.');
    }
  }

  // One Tap / ID Token üzerinden Google ile giriş (Web)
  Future<bool> signInWithGoogleIdToken(String idToken) async {
    try {
      if (!kIsWeb) return false;
      _isLoading = true;
      notifyListeners();

      final credential = firebase_auth.GoogleAuthProvider.credential(idToken: idToken);
      final userCredential = await _auth.signInWithCredential(credential);
      final user = userCredential.user;
      if (user == null) {
        _isLoading = false;
        notifyListeners();
        throw Exception('Google kimlik bilgisi ile giriş başarısız');
      }

      _token = await user.getIdToken();

      // Firestore kullanıcı dokümanı kontrolü
      final userDoc = await _firestore.collection(FirestoreCollections.users).doc(user.uid).get();
      final email = user.email ?? '';
      final displayName =
          user.displayName ?? (email.isNotEmpty ? email.split('@')[0] : 'Kullanıcı');

      final isUserAdmin = await _checkIfUserIsAdmin(user.uid, email);

      if (!userDoc.exists) {
        final newUser = app_models.User(
          id: user.uid,
          email: email,
          fullName: displayName,
          isAdmin: isUserAdmin,
          favoriteProductIds: [],
          createdAt: DateTime.now(),
        );
        await _firestore.collection(FirestoreCollections.users).doc(user.uid).set({
          ...newUser.toJson(),
          'isAdmin': isUserAdmin,
          'provider': 'google',
          'lastLogin': DateTime.now().toIso8601String(),
        }, SetOptions(merge: true));
        _currentUser = newUser;
      } else {
        final data = userDoc.data() as Map<String, dynamic>;
        _currentUser = app_models.User.fromJson({
          ...data,
          'isAdmin': isUserAdmin,
        });
        await _firestore.collection(FirestoreCollections.users).doc(user.uid).update({
          'lastLogin': DateTime.now().toIso8601String(),
          'isAdmin': isUserAdmin,
          'provider': 'google',
          'updatedAt': DateTime.now().toIso8601String(),
        });
      }

      await _saveUserToPrefs();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('One Tap Google giriş hatası: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Kullanıcının admin olup olmadığını kontrol et
  Future<bool> _checkIfUserIsAdmin(String userId, String email) async {
    try {
      Logger.info('Admin kontrolü yapılıyor: $email (userId: $userId)');

      // Test için özel kontrol - superAdminEmail her zaman admin olmalı
      if (email.toLowerCase() == superAdminEmail) {
        Logger.info('Özel admin hesabı tespit edildi: $email');

        try {
          // Admin koleksiyonuna ekle veya güncelle
          await _firestore.collection(FirestoreCollections.admins).doc(userId).set({
            'email': email,
            'isActive': true,
            'role': 'superadmin',
            'createdAt': DateTime.now().toIso8601String(),
            'updatedAt': DateTime.now().toIso8601String(),
          }, SetOptions(merge: true));
          Logger.info('Admin koleksiyonuna eklendi: $email');

          // Kullanıcı koleksiyonunda da admin olarak işaretle
          try {
            await _firestore.collection(FirestoreCollections.users).doc(userId).update({
              'isAdmin': true,
              'role': 'admin',
              'updatedAt': DateTime.now().toIso8601String(),
            });
            Logger.info('Kullanıcı koleksiyonunda admin olarak işaretlendi: $email');
          } catch (e) {
            Logger.info('Kullanıcı koleksiyonu güncelleme hatası: $e');
            // Kullanıcı belgesi yoksa oluştur
            await _firestore.collection(FirestoreCollections.users).doc(userId).set({
              'email': email,
              'isAdmin': true,
              'role': 'admin',
              'createdAt': DateTime.now().toIso8601String(),
              'updatedAt': DateTime.now().toIso8601String(),
            }, SetOptions(merge: true));
            Logger.info('Kullanıcı koleksiyonunda yeni belge oluşturuldu: $email');
          }

          Logger.info('Admin yetkisi verildi: $email');
          return true;
        } catch (e) {
          Logger.error('Admin yetkisi verme hatası: $e');
          // Hata olsa bile bu kullanıcı için true döndür
          return true;
        }
      }

      // Admin koleksiyonundan kullanıcıyı kontrol et
      final adminDoc = await _firestore.collection(FirestoreCollections.admins).doc(userId).get();

      // Kullanıcı admin koleksiyonunda varsa ve aktifse admin yetkisi vardır
      if (adminDoc.exists) {
        final adminData = adminDoc.data() as Map<String, dynamic>;
        final isActive = adminData['isActive'] ?? false;
        Logger.info('Admin koleksiyonunda kullanıcı bulundu. isActive: $isActive');
        return isActive;
      }

      Logger.info('Kullanıcı admin koleksiyonunda bulunamadı: $email');
      return false;
    } catch (e) {
      Logger.error('Admin kontrolü hatası: $e');
      return false;
    }
  }

  // Kullanıcı çıkışı
  Future<void> logout() async {
    try {
      _isLoading = true;
      notifyListeners();

      // Firebase çıkış yap
      await _auth.signOut();

      // Kullanıcı verilerini sıfırla
      _currentUser = null;
      _token = null;

      // Local storage'dan kullanıcı bilgilerini sil
      final prefs = await SharedPreferences.getInstance();
      prefs.remove(PreferenceKeys.userData);
      prefs.remove(PreferenceKeys.token);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Kullanıcı kaydı
  Future<bool> register(String email, String password, String fullName) async {
    try {
      _isLoading = true;
      notifyListeners();

      Logger.info('Kayıt başlatılıyor (OTP önce): $email, $fullName');

      // ADIM 1: E-posta adresinin kullanımda olup olmadığını kontrol et
      try {
        final userQuery = await _firestore
            .collection(FirestoreCollections.users)
            .where('email', isEqualTo: email)
            .limit(1)
            .get();

        if (userQuery.docs.isNotEmpty) {
          final userData = userQuery.docs.first.data();
          final isVerified = userData['emailVerified'] == true;
          final isActive = userData['isActive'] == true;

          if (isVerified && isActive) {
            throw Exception('Bu e-posta adresi zaten kullanımda ve aktif. Lütfen giriş yapın.');
          } else {
            throw Exception(
                'Bu e-posta ile kayıt var ancak doğrulanmamış. Lütfen giriş yaparak e-posta doğrulamasını tamamlayın.');
          }
        }
      } catch (e) {
        if (e.toString().contains('Bu e-posta')) {
          rethrow;
        }
        // Sorgu hatası - devam et
        Logger.warning('E-posta kontrolü hatası: $e');
      }

      // ADIM 2: OTP gönder (Firebase hesabı OLUŞTURMADAN)
      try {
        await _requestEmailOtpWithoutUid(email, fullName);
        Logger.info('Email doğrulama kodu gönderildi: $email');
      } catch (e) {
        Logger.error('Email doğrulama kodu gönderilemedi: $e');
        _isLoading = false;
        notifyListeners();
        throw Exception(
            'Doğrulama e-postası gönderilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      }

      // ADIM 3: Kayıt bilgilerini geçici olarak sakla
      _pendingRegistration = {
        'email': email,
        'password': password,
        'fullName': fullName,
      };

      Logger.info('Kayıt bilgileri geçici olarak saklandı. E-posta doğrulaması bekleniyor.');

      _isLoading = false;
      notifyListeners();
      return true;
    } on firebase_auth.FirebaseAuthException catch (e) {
      String errorMessage;

      switch (e.code) {
        case 'email-already-in-use':
          // Bu e-posta ile kayıt var - doğrulanmış mı kontrol et
          try {
            final userDoc = await _firestore
                .collection(FirestoreCollections.users)
                .where('email', isEqualTo: email)
                .limit(1)
                .get();

            if (userDoc.docs.isNotEmpty) {
              final userData = userDoc.docs.first.data();
              final isVerified = userData['emailVerified'] == true;
              final isActive = userData['isActive'] == true;

              if (!isVerified || !isActive) {
                errorMessage =
                    'Bu e-posta ile kayıt var ancak doğrulanmamış. Lütfen giriş yaparak e-posta doğrulamasını tamamlayın.';
              } else {
                errorMessage = 'Bu e-posta adresi zaten kullanımda ve aktif. Lütfen giriş yapın.';
              }
            } else {
              errorMessage = 'Bu e-posta adresi zaten kullanımda';
            }
          } catch (_) {
            errorMessage = 'Bu e-posta adresi zaten kullanımda';
          }
          break;
        case 'invalid-email':
          errorMessage = 'Geçersiz e-posta formatı';
          break;
        case 'operation-not-allowed':
          errorMessage = 'E-posta/şifre girişi etkin değil';
          break;
        case 'weak-password':
          errorMessage = 'Şifre çok zayıf, daha güçlü bir şifre seçin';
          break;
        default:
          errorMessage = 'Kayıt hatası: ${e.message}';
      }

      Logger.error('Kayıt hatası: $errorMessage');
      _isLoading = false;
      notifyListeners();
      throw Exception(errorMessage);
    } catch (e) {
      Logger.error('Beklenmeyen kayıt hatası: $e');
      _isLoading = false;
      notifyListeners();
      throw Exception('Kayıt sırasında beklenmeyen bir hata oluştu: $e');
    }
  }

  /// E-posta doğrulamasından sonra kayıt işlemini tamamla
  ///
  /// Bu metod pending registration bilgilerini kullanarak Firebase hesabı oluşturur
  Future<bool> completeRegistration(String email, String verificationCode) async {
    try {
      _isLoading = true;
      notifyListeners();

      Logger.info('Kayıt tamamlanıyor: $email');

      // Pending registration kontrolü
      if (_pendingRegistration == null || _pendingRegistration!['email'] != email) {
        throw Exception('Kayıt bilgileri bulunamadı. Lütfen kayıt işlemini yeniden başlatın.');
      }

      final password = _pendingRegistration!['password']!;
      final fullName = _pendingRegistration!['fullName']!;

      // ADIM 1: OTP kodunu doğrula
      final isVerified = await _verifyEmailOtpForPending(email, verificationCode);
      if (!isVerified) {
        _isLoading = false;
        notifyListeners();
        throw Exception('Doğrulama kodu hatalı veya süresi dolmuş');
      }

      Logger.info('OTP doğrulandı, Firebase hesabı oluşturuluyor...');

      // ADIM 2: Firebase hesabı oluştur
      final userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (userCredential.user == null) {
        throw Exception('Firebase hesabı oluşturulamadı');
      }

      Logger.info('Firebase Auth kaydı başarılı: ${userCredential.user!.uid}');

      // Kullanıcı adını güncelle
      await userCredential.user!.updateDisplayName(fullName);

      // Token al
      _token = await userCredential.user!.getIdToken();

      // ADIM 3: Firestore'a kullanıcı bilgilerini kaydet
      final newUser = app_models.User(
        id: userCredential.user!.uid,
        email: email,
        fullName: fullName,
        favoriteProductIds: [],
        createdAt: DateTime.now(),
      );

      final userJson = newUser.toJson();
      userJson.addAll({
        'emailVerified': true, // OTP ile doğrulandı
        'phoneVerified': false,
        'isActive': true, // E-posta doğrulandı, aktif
        'provider': 'password',
        'createdAt': DateTime.now().toIso8601String(),
      });

      await _firestore
          .collection(FirestoreCollections.users)
          .doc(userCredential.user!.uid)
          .set(userJson);

      Logger.info('Firestore\'a kullanıcı kaydedildi: ${userCredential.user!.uid}');

      // ADIM 4: Pending verification'ı temizle
      try {
        final docId = email.replaceAll(RegExp(r'[.@]'), '_');
        await _firestore.collection('pending_verifications').doc(docId).delete();
        Logger.info('Pending verification temizlendi');
      } catch (e) {
        Logger.warning('Pending verification temizleme hatası (normal): $e');
      }

      // ADIM 5: Current user ve local storage güncelle
      _currentUser = newUser;
      await _saveUserToPrefs();

      // Pending registration'ı temizle
      _pendingRegistration = null;

      Logger.info('Kayıt tamamlandı: $email');

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Kayıt tamamlama hatası: $e');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Send email verification to current user (if any)
  Future<void> sendEmailVerification() async {
    final u = _auth.currentUser;
    if (u == null) throw Exception('Kullanıcı yok');
    if (!u.emailVerified) {
      await u.sendEmailVerification();
    }
  }

  // OTP: Cloud Function üzerinden email doğrulama kodu talep et
  Future<void> _requestEmailOtp(String uid, String email, String fullName) async {
    try {
      const projectId = 'eksimayaliekmekweb';
      final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/requestEmailOtp');
      final resp = await http.post(url,
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'uid': uid,
            'email': email,
            'fullName': fullName,
          }));
      if (resp.statusCode != 200) {
        Logger.error('requestEmailOtp failed: ${resp.statusCode} ${resp.body}');
        throw Exception('Doğrulama kodu gönderilemedi');
      }
    } catch (e) {
      rethrow;
    }
  }

  // OTP: UID olmadan email doğrulama kodu talep et (pending registration için)
  Future<void> _requestEmailOtpWithoutUid(String email, String fullName) async {
    try {
      const projectId = 'eksimayaliekmekweb';
      final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/requestEmailOtp');
      final resp = await http.post(url,
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'email': email,
            'fullName': fullName,
            // uid yok - pending verification için
          }));
      if (resp.statusCode != 200) {
        Logger.error('requestEmailOtpWithoutUid failed: ${resp.statusCode} ${resp.body}');
        throw Exception('Doğrulama kodu gönderilemedi');
      }
      Logger.info('OTP gönderildi (pending): $email');
    } catch (e) {
      rethrow;
    }
  }

  // OTP: Pending registration için kod doğrulama
  Future<bool> _verifyEmailOtpForPending(String email, String code) async {
    try {
      const projectId = 'eksimayaliekmekweb';
      final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/verifyEmailOtp');

      final docId = email.replaceAll(RegExp(r'[.@]'), '_');

      final resp = await http.post(url,
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'email': email,
            'code': code,
            'isPending': true, // Pending verification flag
            'docId': docId,
          }));

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        return data['success'] == true;
      } else {
        Logger.error('verifyEmailOtpForPending failed: ${resp.statusCode} ${resp.body}');
        return false;
      }
    } catch (e) {
      Logger.error('verifyEmailOtpForPending error: $e');
      return false;
    }
  }

  /// Pending registration için OTP yeniden gönder (public)
  Future<void> resendPendingOtp(String email) async {
    try {
      if (_pendingRegistration == null || _pendingRegistration!['email'] != email) {
        throw Exception('Kayıt bilgileri bulunamadı. Lütfen kayıt işlemini yeniden başlatın.');
      }

      final fullName = _pendingRegistration!['fullName']!;
      await _requestEmailOtpWithoutUid(email, fullName);
      Logger.info('Pending OTP yeniden gönderildi: $email');
    } catch (e) {
      Logger.error('Pending OTP yeniden gönderme hatası: $e');
      rethrow;
    }
  }

  /// OTP: Kullanıcı için yeniden gönder (public)
  /// Başarılıysa success=true döner. Cooldown durumunda cooldownSec dolu döner.
  Future<({bool success, int? cooldownSec, String? error})> requestEmailOtp() async {
    try {
      final u = _auth.currentUser;
      if (u == null) {
        return (success: false, cooldownSec: null, error: 'Kullanıcı yok');
      }
      final uid = u.uid;
      final email = _currentUser?.email ?? u.email ?? '';
      final fullName = _currentUser?.fullName ?? (email.split('@').first);

      const projectId = 'eksimayaliekmekweb';
      final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/requestEmailOtp');
      final resp = await http.post(url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'uid': uid, 'email': email, 'fullName': fullName}));

      if (resp.statusCode == 200) {
        return (success: true, cooldownSec: null, error: null);
      }

      // 429: rate limit veya cooldown
      if (resp.statusCode == 429) {
        try {
          final data = jsonDecode(resp.body);
          final remaining = data['cooldownRemainingSec'];
          if (remaining is int) {
            return (success: false, cooldownSec: remaining, error: 'Çok sık istek');
          }
        } catch (_) {}
        return (success: false, cooldownSec: 60, error: 'Çok sık istek');
      }

      return (success: false, cooldownSec: null, error: 'Kod gönderilemedi');
    } catch (e) {
      return (success: false, cooldownSec: null, error: e.toString());
    }
  }

  // OTP: Kullanıcının girdiği kodu doğrula
  Future<bool> verifyEmailOtp(String code) async {
    try {
      if (_auth.currentUser == null) throw Exception('Kullanıcı oturumu yok');
      final uid = _auth.currentUser!.uid;
      const projectId = 'eksimayaliekmekweb';
      final url = Uri.parse('https://us-central1-$projectId.cloudfunctions.net/verifyEmailOtp');
      final resp = await http.post(url,
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'uid': uid,
            'code': code,
          }));
      if (resp.statusCode == 200) {
        // Local state güncellemesi
        _currentUser = _currentUser?.copyWith();
        await _firestore.collection(FirestoreCollections.users).doc(uid).update({
          'emailVerified': true,
          'isActive': true,
          'updatedAt': DateTime.now().toIso8601String(),
        });
        await _saveUserToPrefs();
        notifyListeners();
        return true;
      } else {
        Logger.error('verifyEmailOtp failed: ${resp.statusCode} ${resp.body}');
        return false;
      }
    } catch (e) {
      Logger.error('verifyEmailOtp error: $e');
      return false;
    }
  }

  // Check latest email verification status (reloads user)
  Future<bool> checkEmailVerified() async {
    final u = _auth.currentUser;
    if (u == null) return false;
    await u.reload();
    return _auth.currentUser?.emailVerified ?? false;
  }

  // Trigger phone verification (sends SMS). For mobile platforms uses verifyPhoneNumber callbacks.
  // Pass an onCodeSent callback to receive verificationId for user input.
  Future<void> sendPhoneVerification(String phoneNumber,
      {void Function(String verificationId)? onCodeSent}) async {
    final completer = Completer<void>();

    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        verificationCompleted: (credential) async {
          // Auto-retrieval on some platforms — link credential
          try {
            if (_auth.currentUser != null) {
              await _auth.currentUser!.linkWithCredential(credential);
              // update phoneVerified in firestore
              await _firestore
                  .collection(FirestoreCollections.users)
                  .doc(_auth.currentUser!.uid)
                  .update({
                'phoneNumber': phoneNumber,
                'phoneVerified': true,
                'updatedAt': DateTime.now().toIso8601String(),
              });
            }
          } catch (e) {
            // ignore linking errors
          }
          if (!completer.isCompleted) completer.complete();
        },
        verificationFailed: (e) {
          if (!completer.isCompleted) completer.completeError(e);
        },
        codeSent: (verificationId, resendToken) {
          _latestPhoneVerificationId = verificationId;
          if (onCodeSent != null) onCodeSent(verificationId);
          if (!completer.isCompleted) completer.complete();
        },
        codeAutoRetrievalTimeout: (verificationId) {
          _latestPhoneVerificationId = verificationId;
          if (!completer.isCompleted) completer.complete();
        },
        timeout: const Duration(seconds: 60),
      );
    } catch (e) {
      if (!completer.isCompleted) completer.completeError(e);
    }

    return completer.future;
  }

  // Confirm SMS code and link phone to current user. Returns true on success.
  Future<bool> confirmPhoneVerification(String smsCode) async {
    if (_latestPhoneVerificationId == null) {
      throw Exception('Doğrulama kodu bulunamadı');
    }
    final cred = firebase_auth.PhoneAuthProvider.credential(
      verificationId: _latestPhoneVerificationId!,
      smsCode: smsCode,
    );

    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturumu bulunamadı');

    try {
      await user.linkWithCredential(cred);
      // Update Firestore flag
      await _firestore.collection(FirestoreCollections.users).doc(user.uid).update({
        'phoneVerified': true,
        'phoneNumber': user.phoneNumber ?? '',
        'updatedAt': DateTime.now().toIso8601String(),
      });
      _latestPhoneVerificationId = null;
      return true;
    } catch (e) {
      Logger.error('Phone verify/link failed: $e');
      rethrow;
    }
  }

  // Check both email verification and phoneVerified flag in Firestore
  Future<bool> isFullyVerified() async {
    final u = _auth.currentUser;
    if (u == null) return false;
    final emailVerified = await checkEmailVerified();
    if (!emailVerified) return false;
    final doc = await _firestore.collection(FirestoreCollections.users).doc(u.uid).get();
    if (!doc.exists) return false;
    final data = doc.data() as Map<String, dynamic>;
    return (data['phoneVerified'] ?? false) == true;
  }

  // Kullanıcı bilgilerini güncelle
  Future<void> updateUserProfile({
    String? fullName,
    String? phoneNumber,
    String? address,
    String? bio,
    DateTime? birthDate,
    String? gender,
  }) async {
    if (_currentUser == null || _token == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final userData = {
        'fullName': fullName ?? _currentUser!.fullName,
        'phoneNumber': phoneNumber ?? _currentUser!.phoneNumber,
        'address': address ?? _currentUser!.address,
        'bio': bio ?? _currentUser!.bio,
        'birthDate': birthDate != null
            ? birthDate.toIso8601String()
            : _currentUser!.birthDate?.toIso8601String(),
        'gender': gender ?? _currentUser!.gender,
      };

      // Firestore'da doğrudan güncelleme yap
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'fullName': userData['fullName'],
        'phoneNumber': userData['phoneNumber'],
        'address': userData['address'],
        'bio': userData['bio'],
        'birthDate': userData['birthDate'],
        'gender': userData['gender'],
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // API'den kullanıcı bilgilerini güncelle
      final updatedUser = await _apiService.updateUserProfile(_token!, userData);
      _currentUser = updatedUser;

      // Log ekleyelim
      Logger.info('Kullanıcı profili güncellendi: ${_currentUser!.toJson()}');

      // Güncellenmiş kullanıcı bilgilerini local storage'a kaydet
      await _saveUserToPrefs();
    } catch (e) {
      Logger.error('Profil güncellenirken hata: $e');
      // Hata durumunda tekrar deneyelim
      try {
        // Firestore'dan kullanıcı bilgilerini tekrar yükle
        final userDoc =
            await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).get();
        if (userDoc.exists) {
          _currentUser = app_models.User.fromJson(userDoc.data()!);
          await _saveUserToPrefs();
        }
      } catch (e) {
        Logger.error('Kullanıcı bilgileri yüklenirken hata: $e');
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Kullanıcının adreslerini getir
  List<address_model.Address> getUserAddresses() {
    if (_currentUser == null) return [];

    // User.Address modelini Address modeline dönüştür
    final addresses = _currentUser!.addresses
        .map((userAddress) => address_model.Address(
              id: userAddress.id,
              fullName: userAddress.title,
              // Telefon numarasını doğrudan kullanıcıdan al
              phoneNumber: _currentUser!.phoneNumber.isNotEmpty
                  ? _currentUser!.phoneNumber
                  : '5xx xxx xx xx', // Boşsa varsayılan format göster
              addressLine1: userAddress.fullAddress,
              city: userAddress.city,
              district: userAddress.district,
              postalCode: userAddress.postalCode,
              isDefault: userAddress.isDefault,
            ))
        .toList();

    Logger.info('Kullanıcı adresleri yüklendi: ${addresses.length} adres');
    return addresses;
  }

  // Yeni adres ekle
  Future<void> addUserAddress(address_model.Address address) async {
    try {
      _isLoading = true;

      if (_currentUser == null) {
        throw Exception('Kullanıcı giriş yapmamış');
      }

      // Address modelini User.Address modeline dönüştür
      final userAddress = app_models.Address(
        id: address.id,
        title: address.fullName,
        fullAddress: address.addressLine1 +
            (address.addressLine2 != null ? ", ${address.addressLine2}" : ""),
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        isDefault: address.isDefault,
      );

      // Eğer adres varsayılan olarak işaretlendiyse, diğer adresleri varsayılan değil olarak ayarla
      List<app_models.Address> updatedAddresses = List.from(_currentUser!.addresses);
      if (address.isDefault) {
        updatedAddresses = updatedAddresses
            .map((addr) => app_models.Address(
                  id: addr.id,
                  title: addr.title,
                  fullAddress: addr.fullAddress,
                  city: addr.city,
                  district: addr.district,
                  postalCode: addr.postalCode,
                  isDefault: false,
                ))
            .toList();
      }

      // Yeni adresi ekle
      updatedAddresses.add(userAddress);

      // Kullanıcı bilgilerini güncelle
      _currentUser = _currentUser!.copyWith(addresses: updatedAddresses);

      // Firestore'a adresleri kaydet
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'addresses': updatedAddresses.map((a) => a.toJson()).toList(),
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // Kullanıcı bilgilerini yerel olarak güncelle
      await _saveUserToPrefs();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Adres eklenirken hata: $e');
      throw Exception('Adres eklenirken hata oluştu');
    }
  }

  // Adres güncelle
  Future<void> updateUserAddress(address_model.Address address) async {
    try {
      _isLoading = true;

      if (_currentUser == null) {
        throw Exception('Kullanıcı giriş yapmamış');
      }

      // Address modelini User.Address modeline dönüştür
      final userAddress = app_models.Address(
        id: address.id,
        title: address.fullName,
        fullAddress: address.addressLine1 +
            (address.addressLine2 != null ? ", ${address.addressLine2}" : ""),
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        isDefault: address.isDefault,
      );

      final addresses = List<app_models.Address>.from(_currentUser!.addresses);
      final index = addresses.indexWhere((a) => a.id == userAddress.id);

      if (index == -1) {
        throw Exception('Adres bulunamadı');
      }

      // Eğer adres varsayılan olarak işaretlendiyse, diğer adresleri varsayılan değil olarak ayarla
      if (userAddress.isDefault) {
        for (int i = 0; i < addresses.length; i++) {
          if (i != index) {
            addresses[i] = app_models.Address(
              id: addresses[i].id,
              title: addresses[i].title,
              fullAddress: addresses[i].fullAddress,
              city: addresses[i].city,
              district: addresses[i].district,
              postalCode: addresses[i].postalCode,
              isDefault: false,
            );
          }
        }
      }

      // Adresi güncelle
      addresses[index] = userAddress;

      // Kullanıcı bilgilerini güncelle
      _currentUser = _currentUser!.copyWith(addresses: addresses);

      // Firestore'a adresleri kaydet
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'addresses': addresses.map((a) => a.toJson()).toList(),
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // Kullanıcı bilgilerini yerel olarak güncelle
      await _saveUserToPrefs();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Adres güncellenirken hata: $e');
      throw Exception('Adres güncellenirken hata oluştu');
    }
  }

  // Adres sil
  Future<void> deleteUserAddress(String addressId) async {
    try {
      _isLoading = true;

      if (_currentUser == null) {
        throw Exception('Kullanıcı giriş yapmamış');
      }

      // Adresi bul ve sil
      final updatedAddresses = _currentUser!.addresses.where((a) => a.id != addressId).toList();

      // Eğer silinen adres varsayılan adres ise ve başka adresler varsa, ilk adresi varsayılan yap
      if (_currentUser!.addresses.any((a) => a.id == addressId && a.isDefault) &&
          updatedAddresses.isNotEmpty) {
        updatedAddresses[0] = app_models.Address(
          id: updatedAddresses[0].id,
          title: updatedAddresses[0].title,
          fullAddress: updatedAddresses[0].fullAddress,
          city: updatedAddresses[0].city,
          district: updatedAddresses[0].district,
          postalCode: updatedAddresses[0].postalCode,
          isDefault: true,
        );
      }

      // Kullanıcı bilgilerini güncelle
      _currentUser = _currentUser!.copyWith(addresses: updatedAddresses);

      // Firestore'a adresleri kaydet
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'addresses': updatedAddresses.map((a) => a.toJson()).toList(),
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // Kullanıcı bilgilerini yerel olarak güncelle
      await _saveUserToPrefs();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Adres silinirken hata: $e');
      throw Exception('Adres silinirken hata oluştu');
    }
  }

  // Varsayılan adresi ayarla
  Future<void> setDefaultAddress(String addressId) async {
    try {
      _isLoading = true;

      if (_currentUser == null) {
        throw Exception('Kullanıcı giriş yapmamış');
      }

      // Adresleri güncelle
      final updatedAddresses = _currentUser!.addresses.map((address) {
        return app_models.Address(
          id: address.id,
          title: address.title,
          fullAddress: address.fullAddress,
          city: address.city,
          district: address.district,
          postalCode: address.postalCode,
          isDefault: address.id == addressId,
        );
      }).toList();

      // Kullanıcı bilgilerini güncelle
      _currentUser = _currentUser!.copyWith(addresses: updatedAddresses);

      // Firestore'a adresleri kaydet
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'addresses': updatedAddresses.map((a) => a.toJson()).toList(),
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // Kullanıcı bilgilerini yerel olarak güncelle
      await _saveUserToPrefs();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Varsayılan adres ayarlanırken hata: $e');
      throw Exception('Varsayılan adres ayarlanırken hata oluştu');
    }
  }

  // Siparişten adres kaydetme metodu
  // Kullanıcının ilk siparişi sırasında adresi otomatik olarak kaydet
  Future<bool> saveAddressFromOrder(address_model.Address address) async {
    try {
      // Kullanıcı giriş yapmış mı kontrol et
      if (_currentUser == null) {
        Logger.error('Adres kaydedilemedi: Kullanıcı giriş yapmamış');
        return false;
      }

      // Aynı adres zaten var mı kontrol et
      bool addressExists = _currentUser!.addresses.any((a) =>
          a.fullAddress.toLowerCase() == address.addressLine1.toLowerCase() &&
          a.city.toLowerCase() == address.city.toLowerCase() &&
          a.district.toLowerCase() == address.district.toLowerCase());

      // Aynı adres zaten varsa, kaydetme
      if (addressExists) {
        Logger.info('Bu adres zaten kayıtlı, tekrar kaydedilmedi');
        return true;
      }

      // Kullanıcının hiç adresi yoksa, bu adresi varsayılan olarak işaretle
      bool shouldBeDefault = _currentUser!.addresses.isEmpty;

      // Adresi Address modeline uygun hale getir
      final newAddress = address_model.Address(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        fullName: address.fullName.isEmpty ? "Teslimat Adresi" : address.fullName,
        phoneNumber: address.phoneNumber.isEmpty ? _currentUser!.phoneNumber : address.phoneNumber,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        district: address.district,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: shouldBeDefault,
      );

      // Adresi kaydet
      await addUserAddress(newAddress);
      Logger.info('Sipariş adresi başarıyla kaydedildi');
      return true;
    } catch (e) {
      Logger.error('Sipariş adresi kaydedilirken hata: $e');
      return false;
    }
  }

  // Favorilere ürün ekle/çıkar
  Future<void> toggleFavorite(String productId) async {
    if (_currentUser == null || _token == null) return;

    final isFavorite = _currentUser!.favoriteProductIds.contains(productId);
    Logger.info('Ürün favorilerde mi: $isFavorite'); // Debug için

    // Önce UI'ı güncelle (optimistik güncelleme)
    if (isFavorite) {
      _currentUser = _currentUser!.removeFromFavorites(productId);
    } else {
      _currentUser = _currentUser!.addToFavorites(productId);
    }
    notifyListeners();

    try {
      // Firestore'da kullanıcı belgesini güncelle
      Logger.info(
          'Firestore\'a favorileri güncelleme: ${_currentUser!.favoriteProductIds}'); // Debug için
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).update({
        'favoriteProductIds': _currentUser!.favoriteProductIds,
        'updatedAt': DateTime.now().toIso8601String(),
      });

      // API işlemlerini try-catch içinde yap
      try {
        if (isFavorite) {
          await _apiService.removeFromFavorites(_token!, productId);
        } else {
          await _apiService.addToFavorites(_token!, productId);
        }
      } catch (e) {
        Logger.info('API favori işlemi hatası: $e'); // Debug için
        // API hatası olsa bile devam et, kritik değil
      }

      // Güncellenmiş kullanıcı bilgilerini local storage'a kaydet
      await _saveUserToPrefs();
      Logger.info(
          'Favori işlemi tamamlandı. Güncel favoriler: ${_currentUser!.favoriteProductIds}'); // Debug için
    } catch (e) {
      Logger.error('Favori güncelleme hatası: $e'); // Debug için

      // Hata durumunda eski haline geri döndür
      if (isFavorite) {
        _currentUser = _currentUser!.addToFavorites(productId);
      } else {
        _currentUser = _currentUser!.removeFromFavorites(productId);
      }
      notifyListeners();
    }
  }

  // Favori ürünleri getir
  Future<List<String>> getFavoriteProductIds() async {
    if (_currentUser == null) return [];
    return _currentUser!.favoriteProductIds;
  }

  // Kullanıcı bilgilerini local storage'a kaydet

  // Uygulama başlangıcında kullanıcı oturumunu kontrol et
  Future<void> checkUserSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Önce Firebase Auth'tan mevcut kullanıcıyı kontrol et
      final firebaseUser = _auth.currentUser;

      if (firebaseUser != null) {
        Logger.info('Firebase Auth oturumu bulundu: ${firebaseUser.email}');

        // Token al (force refresh ile yenile)
        _token = await firebaseUser.getIdToken(true);

        // Firestore'dan kullanıcı bilgilerini al
        final userDoc =
            await _firestore.collection(FirestoreCollections.users).doc(firebaseUser.uid).get();

        if (userDoc.exists) {
          final userData = userDoc.data() as Map<String, dynamic>;
          final isUserAdmin = await _checkIfUserIsAdmin(firebaseUser.uid, firebaseUser.email ?? '');

          _currentUser = app_models.User.fromJson({
            ...userData,
            'isAdmin': isUserAdmin,
          });

          Logger.info('Kullanıcı bilgileri Firestore\'dan yüklendi: ${_currentUser!.email}');

          // Local storage'a kaydet
          await _saveUserToPrefs();
        }
      } else {
        // Firebase Auth'ta oturum yok, local storage'dan kontrol et
        final prefs = await SharedPreferences.getInstance();
        final userData = prefs.getString(PreferenceKeys.userData);
        final token = prefs.getString(PreferenceKeys.token);
        final sessionTimestamp = prefs.getInt(PreferenceKeys.sessionTimestamp);

        // 30 günlük oturum süresi kontrolü
        if (sessionTimestamp != null) {
          final sessionDate = DateTime.fromMillisecondsSinceEpoch(sessionTimestamp);
          final daysSinceSession = DateTime.now().difference(sessionDate).inDays;

          if (daysSinceSession > 30) {
            Logger.info('Oturum süresi dolmuş ($daysSinceSession gün) - temizleniyor');
            await prefs.remove(PreferenceKeys.userData);
            await prefs.remove(PreferenceKeys.token);
            await prefs.remove(PreferenceKeys.sessionTimestamp);
            _currentUser = null;
            _token = null;
            _isLoading = false;
            notifyListeners();
            return;
          }
        }

        if (userData != null && token != null) {
          try {
            _token = token;
            final userMap = jsonDecode(userData) as Map<String, dynamic>;
            _currentUser = app_models.User.fromJson(userMap);

            Logger.info('Oturum local storage\'dan yüklendi - ${_currentUser!.email}');

            // Kullanıcı bilgilerini Firestore'dan güncelle
            try {
              final userDoc = await _firestore
                  .collection(FirestoreCollections.users)
                  .doc(_currentUser!.id)
                  .get();

              if (userDoc.exists) {
                final userData = userDoc.data() as Map<String, dynamic>;
                final isUserAdmin =
                    await _checkIfUserIsAdmin(_currentUser!.id, _currentUser!.email);

                _currentUser = app_models.User.fromJson({
                  ...userData,
                  'isAdmin': isUserAdmin,
                });
                await _saveUserToPrefs();
              }
            } catch (e) {
              Logger.info('Firestore\'dan kullanıcı bilgileri güncellenemedi: $e');
              // Hata olsa bile mevcut kullanıcı bilgilerini kullan
            }
          } catch (e) {
            Logger.error('Local storage oturum yükleme hatası: $e');
            // Hata durumunda kullanıcı verisini sil
            await prefs.remove(PreferenceKeys.userData);
            await prefs.remove(PreferenceKeys.token);
            await prefs.remove(PreferenceKeys.sessionTimestamp);
            _currentUser = null;
            _token = null;
          }
        } else {
          Logger.info('Oturum kontrolü: Hiçbir oturum bulunamadı');
        }
      }
    } catch (e) {
      Logger.error('Oturum kontrolü genel hatası: $e');
      _currentUser = null;
      _token = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  // Ürünün favori olup olmadığını kontrol et
  bool isFavorite(String productId) {
    if (_currentUser == null) return false;
    return _currentUser!.favoriteProductIds.contains(productId);
  }

  // Kullanıcı bilgilerini lokale kaydet
  // Internal helper to save user data to SharedPreferences
  Future<void> _saveUserToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_currentUser != null) {
        await prefs.setString(PreferenceKeys.userData, json.encode(_currentUser!.toJson()));
        // Oturum kayıt zamanını sakla (30 gün kontrol için)
        await prefs.setInt(PreferenceKeys.sessionTimestamp, DateTime.now().millisecondsSinceEpoch);
      }
      if (_token != null) {
        await prefs.setString(PreferenceKeys.token, _token!);
      }
      Logger.info('Kullanıcı bilgileri locale kaydedildi');
    } catch (e) {
      Logger.error('Kullanıcı bilgileri locale kaydedilirken hata: $e');
    }
  }

  // Token'ı yenile (1 saatte bir otomatik yenilenir ama manuel de yapılabilir)
  Future<void> refreshToken() async {
    try {
      final firebaseUser = _auth.currentUser;
      if (firebaseUser != null) {
        _token = await firebaseUser.getIdToken(true); // Force refresh
        await _saveUserToPrefs();
        Logger.info('Token yenilendi');
      }
    } catch (e) {
      Logger.error('Token yenileme hatası: $e');
    }
  }

  // E-posta adresini kaydet (Beni Hatırla özelliği için)
  Future<void> saveEmail(String email) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(PreferenceKeys.savedEmail, email);
    } catch (e) {
      Logger.error('E-posta adresini kaydederken hata: $e');
    }
  }

  // Kaydedilmiş e-posta adresini getir
  Future<String?> getSavedEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(PreferenceKeys.savedEmail);
    } catch (e) {
      Logger.error('Kaydedilmiş e-posta adresini getirirken hata: $e');
      return null;
    }
  }

  // Kaydedilmiş e-posta adresini temizle
  Future<void> clearSavedEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(PreferenceKeys.savedEmail);
    } catch (e) {
      Logger.error('Kaydedilmiş e-posta adresini temizlerken hata: $e');
    }
  }

  // Kullanıcının admin olup olmadığını kontrol et
  Future<bool> isUserAdmin() async {
    final currentUser = firebase_auth.FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      return false;
    }

    try {
      final userDoc =
          await _firestore.collection(FirestoreCollections.users).doc(currentUser.uid).get();

      if (!userDoc.exists) {
        return false;
      }

      return userDoc.data()?['isAdmin'] == true;
    } catch (e) {
      Logger.error('Admin kontrolü sırasında hata: $e');
      return false;
    }
  }

  /// Tüm kullanıcıları getirir (Sadece admin kullanıcıları için)
  Future<List<app_models.User>> getAllUsers() async {
    try {
      if (!isAuthenticated || currentUser?.isAdmin != true) {
        throw Exception('Bu işlem için admin yetkisi gereklidir');
      }

      final querySnapshot = await _userRepository.getAllUsers();
      return querySnapshot.map((doc) => app_models.User.fromFirestore(doc)).toList();
    } catch (e) {
      Logger.error('Tüm kullanıcılar getirilirken hata oluştu: $e');
      return [];
    }
  }

  /// Kullanıcı hesabını kalıcı olarak siler
  /// Tüm kullanıcı verileri (profil, siparişler, favoriler) silinir
  Future<bool> deleteAccount(String password) async {
    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null || _currentUser == null) {
        throw Exception('Oturum açılmamış');
      }

      // Önce şifre ile yeniden doğrulama yap
      final credential = firebase_auth.EmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );

      await user.reauthenticateWithCredential(credential);

      // Firestore'dan kullanıcı verilerini sil
      await _firestore.collection(FirestoreCollections.users).doc(_currentUser!.id).delete();

      // Kullanıcının siparişlerini anonymous kullanıcıya dönüştür
      final orders = await _firestore
          .collection('siparisler')
          .where('userId', isEqualTo: _currentUser!.id)
          .get();

      for (var doc in orders.docs) {
        await doc.reference.update({
          'userId': 'deleted_user',
          'customerEmail': 'deleted@user.com',
        });
      }

      // Firebase Authentication'dan hesabı sil
      await user.delete();

      // Local storage'ı temizle
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      // State'i sıfırla
      _currentUser = null;
      _token = null;
      notifyListeners();

      Logger.info('Kullanıcı hesabı başarıyla silindi');
      return true;
    } on firebase_auth.FirebaseAuthException catch (e) {
      if (e.code == 'wrong-password') {
        throw Exception('Yanlış şifre');
      } else if (e.code == 'requires-recent-login') {
        throw Exception('Bu işlem için yeniden giriş yapmalısınız');
      } else {
        throw Exception('Hesap silinemedi: ${e.message}');
      }
    } catch (e) {
      Logger.error('Hesap silinirken hata: $e');
      throw Exception('Hesap silinemedi: $e');
    }
  }

  signOut() {}

  /// Şifre sıfırlama e-postası gönder
  ///
  /// Verilen e-posta adresine Firebase Authentication üzerinden
  /// şifre sıfırlama bağlantısı gönderir.
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      Logger.info('Şifre sıfırlama e-postası gönderiliyor: $email');

      // E-posta formatını kontrol et
      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
        throw Exception('Geçerli bir e-posta adresi girin');
      }

      // Firebase Authentication ile şifre sıfırlama e-postası gönder
      await _auth.sendPasswordResetEmail(email: email);

      Logger.info('Şifre sıfırlama e-postası başarıyla gönderildi: $email');
    } on firebase_auth.FirebaseAuthException catch (e) {
      Logger.error('Firebase şifre sıfırlama hatası: ${e.code} - ${e.message}');

      switch (e.code) {
        case 'invalid-email':
          throw Exception('Geçersiz e-posta adresi');
        case 'user-not-found':
          // Güvenlik: Kayıtlı olmayan e-postaları ifşa etmemek için
          // başarı mesajı göster ama gerçekte e-posta gönderme
          Logger.warning('Şifre sıfırlama denemesi - kayıtsız e-posta: $email');
          // Hata fırlatmak yerine sessizce başarılı gibi davran
          return;
        case 'too-many-requests':
          throw Exception('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin');
        default:
          throw Exception('Şifre sıfırlama e-postası gönderilemedi: ${e.message}');
      }
    } catch (e) {
      Logger.error('Şifre sıfırlama hatası: $e');
      throw Exception('Bir hata oluştu: $e');
    }
  }

  /// Mobil tarayıcı kontrolü
  bool _isMobileBrowser() {
    if (!kIsWeb) return false;

    // Web'de user agent kontrolü
    try {
      final userAgent = web.window.navigator.userAgent.toLowerCase();

      return userAgent.contains('mobile') ||
          userAgent.contains('android') ||
          userAgent.contains('iphone') ||
          userAgent.contains('ipad') ||
          userAgent.contains('ipod');
    } catch (e) {
      Logger.error('User agent kontrolü başarısız: $e');
      return false;
    }
  }
}
