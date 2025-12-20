import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:rxdart/rxdart.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../core/di/service_locator.dart';
import '../services/auth_service.dart';
import '../utils/logger.dart';

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                EKŞİ MAYALI EKMEK - NOTIFICATION_SERVICE.DART                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya, uygulamanın bildirim sistemini yöneten servisi içerir.            │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. Bildirim tipleri (NotificationType enum)                                 │
│ 2. Bildirim modeli (NotificationModel sınıfı)                               │
│ 3. NotificationService sınıfı                                               │
│    - init(): Bildirim servisini başlatır                                    │
│    - sendNotification(): Yeni bildirim gönderir                             │
│    - markAsRead(): Bildirimi okundu olarak işaretler                        │
│    - getNotifications(): Tüm bildirimleri getirir                           │
│    - getUnreadCount(): Okunmamış bildirim sayısını getirir                  │
│    - deleteNotification(): Bildirimi siler                                  │
│    - clearAll(): Tüm bildirimleri temizler                                  │
│ 4. Firebase entegrasyonu                                                    │
│    - Firestore koleksiyonları                                               │
│    - Bildirim dinleme ve durum güncellemeleri                               │
└─────────────────────────────────────────────────────────────────────────────┘
*/

/// Bildirim tiplerini tanımlayan enum
///
/// Uygulama içinde kullanılan farklı bildirim tiplerini belirtir.
/// Her tip için farklı görsel stil ve davranış tanımlanabilir.
enum NotificationType {
  /// Sipariş bildirimleri (sipariş durumu, teslimat vb.)
  order,

  /// Promosyon bildirimleri (indirimler, kampanyalar vb.)
  promotion,

  /// Genel bildirimler (sistem mesajları, güncellemeler vb.)
  general,
}

/// Bildirim verilerini tutan model sınıf
///
/// Bir bildirimin tüm verilerini içerir: başlık, içerik, zaman,
/// okunma durumu ve ilgili veriler (ör. sipariş ID'si).
///
/// Firestore'dan gelen verileri modele dönüştürmek ve
/// modelden Firestore'a veri göndermek için metodlar içerir.
class NotificationModel {
  final String id;
  final String title;
  final String body;
  final String? imageUrl;
  final NotificationType type;
  final Map<String, dynamic>? data;
  final DateTime timestamp;
  final bool isRead;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    this.imageUrl,
    required this.type,
    this.data,
    required this.timestamp,
    this.isRead = false,
  });

  /// RemoteMessage'dan NotificationModel oluşturur
  factory NotificationModel.fromRemoteMessage(RemoteMessage message) {
    final Map<String, dynamic> data = message.data;
    final type = _parseNotificationType(data['type'] ?? 'general');

    return NotificationModel(
      id: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: message.notification?.title ?? 'Bildirim',
      body: message.notification?.body ?? '',
      imageUrl: message.notification?.android?.imageUrl ??
          message.notification?.apple?.imageUrl,
      type: type,
      data: data,
      timestamp: message.sentTime ?? DateTime.now(),
    );
  }

  /// Firestore'dan NotificationModel oluşturur
  factory NotificationModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return NotificationModel(
      id: doc.id,
      title: data['title'] ?? 'Bildirim',
      body: data['body'] ?? '',
      imageUrl: data['imageUrl'],
      type: _parseNotificationType(data['type'] ?? 'general'),
      data: data['data'],
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      isRead: data['isRead'] ?? false,
    );
  }

  /// NotificationType'ı metin olarak parse eder
  static NotificationType _parseNotificationType(String type) {
    switch (type.toLowerCase()) {
      case 'order':
        return NotificationType.order;
      case 'promotion':
        return NotificationType.promotion;
      case 'general':
      default:
        return NotificationType.general;
    }
  }

  /// NotificationModel'i Firestore için Map'e dönüştürür
  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'body': body,
      'imageUrl': imageUrl,
      'type': type.toString().split('.').last,
      'data': data,
      'timestamp': timestamp,
      'isRead': isRead,
    };
  }

  /// NotificationModel'in okundu işaretlenmesi için kopyasını oluşturur
  NotificationModel copyWithRead({bool? isRead}) {
    return NotificationModel(
      id: id,
      title: title,
      body: body,
      imageUrl: imageUrl,
      type: type,
      data: data,
      timestamp: timestamp,
      isRead: isRead ?? this.isRead,
    );
  }
}

/// Bildirim yönetim servisi
///
/// Bu servis, uygulama içi bildirimlerin yönetiminden sorumludur:
/// - Yeni bildirim oluşturma ve gönderme
/// - Bildirimleri listeleme ve filtreleme
/// - Okunma durumlarını yönetme
/// - Bildirim silme ve temizleme
///
/// Firebase Firestore ile entegre çalışır ve kullanıcıya özel
/// bildirim verilerini gerçek zamanlı olarak senkronize eder.
class NotificationService extends ChangeNotifier {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final BehaviorSubject<NotificationModel> _notificationSubject =
      BehaviorSubject<NotificationModel>();

  // Bildirim akışı
  Stream<NotificationModel> get notificationStream =>
      _notificationSubject.stream;

  // Bildirim izinleri
  bool _notificationsEnabled = false;
  bool get notificationsEnabled => _notificationsEnabled;

  // Bildirim ayarları
  bool _orderNotificationsEnabled = true;
  bool _promotionNotificationsEnabled = true;
  bool _generalNotificationsEnabled = true;

  bool get orderNotificationsEnabled => _orderNotificationsEnabled;
  bool get promotionNotificationsEnabled => _promotionNotificationsEnabled;
  bool get generalNotificationsEnabled => _generalNotificationsEnabled;

  /// Servisi başlatır ve bildirim kanallarını oluşturur
  Future<void> init() async {
    Logger.info('Bildirim servisi başlatılıyor...');

    // Bildirim ayarlarını yükle
    await _loadNotificationSettings();

    // Bildirim izinlerini kontrol et
    await checkNotificationPermissions();

    // Android için bildirim kanalı oluştur
    await _setupLocalNotifications();

    // Bildirim dinleyicilerini başlat
    _setupNotificationListeners();

    Logger.info('Bildirim servisi başarıyla başlatıldı.');
  }

  /// Bildirim izinlerini kontrol eder ve gerekiyorsa izin ister
  Future<bool> checkNotificationPermissions() async {
    Logger.info('Bildirim izinleri kontrol ediliyor...');

    // Web platformunda izin kontrolü yapmaya gerek yok
    if (kIsWeb) {
      _notificationsEnabled = true;
      notifyListeners();
      return true;
    }

    // İzin durumunu kontrol et
    final settings = await _firebaseMessaging.getNotificationSettings();
    _notificationsEnabled =
        settings.authorizationStatus == AuthorizationStatus.authorized;
    notifyListeners();

    // İzin yoksa izin iste
    if (!_notificationsEnabled) {
      final result = await requestNotificationPermissions();
      return result;
    }

    return _notificationsEnabled;
  }

  /// Bildirim izinlerini ister
  Future<bool> requestNotificationPermissions() async {
    Logger.info('Bildirim izinleri isteniyor...');

    // Web platformunda izin istemek için ekstra işlem gerekmez
    if (kIsWeb) {
      _notificationsEnabled = true;
      notifyListeners();
      return true;
    }

    // Bildirim izinlerini iste
    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    _notificationsEnabled =
        settings.authorizationStatus == AuthorizationStatus.authorized ||
            settings.authorizationStatus == AuthorizationStatus.provisional;
    notifyListeners();

    Logger.info(
        'Bildirim izinleri ${_notificationsEnabled ? "verildi" : "reddedildi"}');
    return _notificationsEnabled;
  }

  /// FCM Token'ı alır ve Firestore'a kaydeder
  Future<String?> getFcmToken({required String userId}) async {
    try {
      if (!_notificationsEnabled) return null;

      final token = await _firebaseMessaging.getToken();
      Logger.info('FCM Token alındı: ${token?.substring(0, 10)}...');

      if (token != null && userId.isNotEmpty) {
        // Token'ı Firestore'a kaydet
        await _saveTokenToFirestore(userId, token);
      }

      return token;
    } catch (e) {
      Logger.error('FCM Token alınırken hata oluştu: $e');
      return null;
    }
  }

  /// FCM Token'ı Firestore'a kaydeder
  Future<void> _saveTokenToFirestore(String userId, String token) async {
    try {
      final tokenData = {
        'token': token,
        'platform': kIsWeb ? 'web' : Platform.operatingSystem,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'active': true,
      };

      // Token'ı kullanıcının devices koleksiyonuna kaydet
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('devices')
          .doc(token)
          .set(tokenData, SetOptions(merge: true));

      Logger.info('FCM Token Firestore\'a kaydedildi');
    } catch (e) {
      Logger.error('FCM Token Firestore\'a kaydedilirken hata oluştu: $e');
    }
  }

  /// Kullanıcının bildirimlerini Firestore'dan yükler
  Future<List<NotificationModel>> loadUserNotifications(String userId,
      {int limit = 20}) async {
    try {
      final querySnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .orderBy('timestamp', descending: true)
          .limit(limit)
          .get();

      final notifications = querySnapshot.docs
          .map((doc) => NotificationModel.fromFirestore(doc))
          .toList();

      return notifications;
    } catch (e) {
      Logger.error('Kullanıcı bildirimleri yüklenirken hata oluştu: $e');
      return [];
    }
  }

  /// Bildirimi okundu olarak işaretler
  Future<void> markNotificationAsRead(
      String userId, String notificationId) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .doc(notificationId)
          .update({'isRead': true});

      Logger.info('Bildirim okundu olarak işaretlendi: $notificationId');
    } catch (e) {
      Logger.error('Bildirim okundu olarak işaretlenirken hata oluştu: $e');
    }
  }

  /// Kullanıcının tüm bildirimlerini okundu olarak işaretler
  Future<void> markAllNotificationsAsRead(String userId) async {
    try {
      final batch = _firestore.batch();

      final querySnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .where('isRead', isEqualTo: false)
          .get();

      for (var doc in querySnapshot.docs) {
        final ref = _firestore
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .doc(doc.id);
        batch.update(ref, {'isRead': true});
      }

      await batch.commit();
      Logger.info('Tüm bildirimler okundu olarak işaretlendi');
    } catch (e) {
      Logger.error(
          'Tüm bildirimler okundu olarak işaretlenirken hata oluştu: $e');
    }
  }

  /// Bildirimi siler
  Future<void> deleteNotification(String userId, String notificationId) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .doc(notificationId)
          .delete();

      Logger.info('Bildirim silindi: $notificationId');
    } catch (e) {
      Logger.error('Bildirim silinirken hata oluştu: $e');
    }
  }

  /// Kullanıcının tüm bildirimlerini siler
  Future<void> deleteAllNotifications(String userId) async {
    try {
      final batch = _firestore.batch();

      final querySnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .get();

      for (var doc in querySnapshot.docs) {
        final ref = _firestore
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .doc(doc.id);
        batch.delete(ref);
      }

      await batch.commit();
      Logger.info('Tüm bildirimler silindi');
    } catch (e) {
      Logger.error('Tüm bildirimler silinirken hata oluştu: $e');
    }
  }

  /// Okunmamış bildirim sayısını alır
  Future<int> getUnreadNotificationCount(String userId) async {
    try {
      final querySnapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .where('isRead', isEqualTo: false)
          .count()
          .get();

      // AggregateQuerySnapshot dönüş değerini int'e dönüştürelim
      return querySnapshot.count ?? 0;
    } catch (e) {
      Logger.error('Okunmamış bildirim sayısı alınırken hata oluştu: $e');
      return 0;
    }
  }

  /// Kullanıcının bildirim akışını dinler
  Stream<List<NotificationModel>> listenToUserNotifications(String userId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => NotificationModel.fromFirestore(doc))
          .toList();
    });
  }

  /// Tüm kullanıcılara bildirim gönderir (Admin Panel tarafından)
  Future<void> sendNotificationToAllUsers({
    required String title,
    required String body,
    String? imageUrl,
    NotificationType type = NotificationType.general,
    Map<String, dynamic>? data,
  }) async {
    try {
      // Bildirim verilerini oluştur
      final notification = {
        'title': title,
        'body': body,
        'imageUrl': imageUrl,
        'type': type.toString().split('.').last,
        'data': data,
        'timestamp': FieldValue.serverTimestamp(),
        'isRead': false,
        'sentByAdmin': true,
      };

      // Cloud Function'ı çağır
      // Gerçek uygulamada, bu Cloud Function önceden yapılandırılmış olacak
      // ve tüm kullanıcılara FCM mesajı gönderecektir
      await _firestore.collection('notifications').add({
        ...notification,
        'targetAll': true,
      });

      Logger.info('Tüm kullanıcılara bildirim gönderildi');
    } catch (e) {
      Logger.error('Tüm kullanıcılara bildirim gönderilirken hata oluştu: $e');
      rethrow;
    }
  }

  /// Belirli kullanıcılara bildirim gönderir (Admin Panel tarafından)
  Future<void> sendNotificationToUsers({
    required List<String> userIds,
    required String title,
    required String body,
    String? imageUrl,
    NotificationType type = NotificationType.general,
    Map<String, dynamic>? data,
  }) async {
    try {
      if (userIds.isEmpty) return;

      // Bildirim verilerini oluştur
      final notification = {
        'title': title,
        'body': body,
        'imageUrl': imageUrl,
        'type': type.toString().split('.').last,
        'data': data,
        'timestamp': FieldValue.serverTimestamp(),
        'isRead': false,
        'sentByAdmin': true,
      };

      // Cloud Function'ı çağır
      await _firestore.collection('notifications').add({
        ...notification,
        'targetUsers': userIds,
      });

      Logger.info('${userIds.length} kullanıcıya bildirim gönderildi');
    } catch (e) {
      Logger.error(
          'Belirli kullanıcılara bildirim gönderilirken hata oluştu: $e');
      rethrow;
    }
  }

  /// FCM Token'ı siler (kullanıcı oturumu kapattığında)
  Future<void> deleteToken(String userId) async {
    try {
      final token = await _firebaseMessaging.getToken();
      if (token == null) return;

      // Token'ı Firestore'dan kaldır
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('devices')
          .doc(token)
          .update({'active': false});

      // FCM token'ı sil
      await _firebaseMessaging.deleteToken();

      Logger.info('FCM Token silindi');
    } catch (e) {
      Logger.error('FCM Token silinirken hata oluştu: $e');
    }
  }

  /// Bildirim ayarlarını yükler
  Future<void> _loadNotificationSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _orderNotificationsEnabled = prefs.getBool('orderNotifications') ?? true;
    _promotionNotificationsEnabled =
        prefs.getBool('promotionNotifications') ?? true;
    _generalNotificationsEnabled =
        prefs.getBool('generalNotifications') ?? true;
    notifyListeners();
  }

  /// Bildirim ayarlarını kaydeder
  Future<void> _saveNotificationSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('orderNotifications', _orderNotificationsEnabled);
    await prefs.setBool(
        'promotionNotifications', _promotionNotificationsEnabled);
    await prefs.setBool('generalNotifications', _generalNotificationsEnabled);
  }

  /// Sipariş bildirimlerini etkinleştirir/devre dışı bırakır
  Future<void> setOrderNotifications(bool enabled) async {
    _orderNotificationsEnabled = enabled;
    await _saveNotificationSettings();
    notifyListeners();
  }

  /// Promosyon bildirimlerini etkinleştirir/devre dışı bırakır
  Future<void> setPromotionNotifications(bool enabled) async {
    _promotionNotificationsEnabled = enabled;
    await _saveNotificationSettings();
    notifyListeners();
  }

  /// Genel bildirimleri etkinleştirir/devre dışı bırakır
  Future<void> setGeneralNotifications(bool enabled) async {
    _generalNotificationsEnabled = enabled;
    await _saveNotificationSettings();
    notifyListeners();
  }

  /// Android için bildirim kanalı oluştur
  Future<void> _setupLocalNotifications() async {
    if (kIsWeb) return;

    if (Platform.isAndroid) {
      final AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel', // id
        'Sipariş Bildirimleri', // title
        description: 'Sipariş durumu ve önemli bildirimler', // description
        importance: Importance.high,
        enableVibration: true,
        enableLights: true,
        ledColor: Colors.amber,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }

    // iOS için bildirim izinleri
    if (Platform.isIOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    }

    // Bildirim ayarları
    const InitializationSettings initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@drawable/ic_notification'),
      iOS: DarwinInitializationSettings(),
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );
  }

  /// Sipariş durumu bildirimlerini göster
  Future<void> showOrderStatusNotification({
    required String orderId,
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    if (kIsWeb) return;

    final androidDetails = AndroidNotificationDetails(
      'high_importance_channel',
      'Sipariş Bildirimleri',
      channelDescription: 'Sipariş durumu ve önemli bildirimler',
      importance: Importance.high,
      priority: Priority.high,
      ticker: 'ticker',
      styleInformation: BigTextStyleInformation(body),
      color: Colors.amber,
    );

    final iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      int.parse(orderId.hashCode.toString().substring(0, 8)),
      title,
      body,
      platformDetails,
      payload: jsonEncode({
        'type': 'order',
        'orderId': orderId,
        'data': data,
      }),
    );

    // Gönderilen bildirimi veritabanına kaydet
    final notificationId = const Uuid().v4();
    final notificationModel = NotificationModel(
      id: notificationId,
      title: title,
      body: body,
      type: NotificationType.order,
      data: data ?? {'orderId': orderId},
      timestamp: DateTime.now(),
    );

    _notificationSubject.add(notificationModel);
    saveNotificationToFirestore(notificationModel);
  }

  /// Bildirime tıklandığında çalışacak fonksiyon
  void _onNotificationTap(NotificationResponse response) {
    if (response.payload == null) return;

    try {
      final payloadData = jsonDecode(response.payload!) as Map<String, dynamic>;
      final actionType = payloadData['actionType'];
      final navigationRoute = payloadData['navigationRoute'];

      if (actionType == 'ORDER_STATUS_UPDATE' && navigationRoute != null) {
        // Sipariş detay sayfasına yönlendirme
        _navigateToRoute(navigationRoute);
      }
    } catch (e) {
      Logger.error('Bildirim payload işlenirken hata: $e');
    }
  }

  // Yönlendirme için stream
  final _navigationStreamController = StreamController<String>.broadcast();
  Stream<String> get navigationStream => _navigationStreamController.stream;

  // Belirtilen route'a yönlendirme
  void _navigateToRoute(String route) {
    _navigationStreamController.add(route);
  }

  /// Bildirim dinleyicilerini ayarlar
  void _setupNotificationListeners() {
    // Ön planda (uygulama açıkken) gelen bildirimler
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Uygulama kapalıyken gelen bildirimlerden bir tanesine tıklandığında
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationOpened);

    // Uygulamanın kapalıyken bir bildirimden açılması durumu
    _firebaseMessaging.getInitialMessage().then(_handleInitialMessage);
  }

  /// Ön planda (uygulama açıkken) gelen bildirimleri işler
  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    Logger.info('Ön planda bildirim alındı: ${message.messageId}');

    final notification = NotificationModel.fromRemoteMessage(message);
    _notificationSubject.add(notification);

    // Bildirim tipine göre filtrele
    if (!_shouldProcessNotification(notification.type)) {
      Logger.info('Bildirim türü devre dışı bırakıldı: ${notification.type}');
      return;
    }

    // Yerel bildirim göster
    await _showLocalNotification(notification);
  }

  /// Bildirimin işlenip işlenmeyeceğini kontrol eder
  bool _shouldProcessNotification(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return _orderNotificationsEnabled;
      case NotificationType.promotion:
        return _promotionNotificationsEnabled;
      case NotificationType.general:
        return _generalNotificationsEnabled;
    }
  }

  /// Bir bildirime tıklandığında çalışacak fonksiyon
  Future<void> _handleNotificationOpened(RemoteMessage message) async {
    Logger.info('Bildirime tıklandı: ${message.messageId}');

    final notification = NotificationModel.fromRemoteMessage(message);
    _notificationSubject.add(notification);

    // Bildirim tipine göre yönlendirme yapılabilir
    // Örneğin: Sipariş bildirimine tıklandığında sipariş detay sayfasına yönlendirme
  }

  /// Uygulama kapalıyken gelen bir bildirimden açıldığında çalışacak fonksiyon
  Future<void> _handleInitialMessage(RemoteMessage? message) async {
    if (message == null) return;

    Logger.info('Uygulama bildirimden açıldı: ${message.messageId}');

    final notification = NotificationModel.fromRemoteMessage(message);
    _notificationSubject.add(notification);

    // Bildirim tipine göre yönlendirme yapılabilir
  }

  /// Yerel bildirim gösterir
  Future<void> _showLocalNotification(NotificationModel notification) async {
    if (kIsWeb) return;

    try {
      // Bildirim kanalını belirle
      String channelId = 'default_channel';
      switch (notification.type) {
        case NotificationType.order:
          channelId = 'order_channel';
          break;
        case NotificationType.promotion:
          channelId = 'promotion_channel';
          break;
        case NotificationType.general:
          channelId = 'default_channel';
          break;
      }

      // Bildirim içeriğini hazırla
      final androidDetails = AndroidNotificationDetails(
        channelId,
        notification.type.toString().split('.').last,
        channelDescription: 'Bildirim kanalı',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        largeIcon: notification.imageUrl != null
            ? ByteArrayAndroidBitmap(
                await _getByteArrayFromUrl(notification.imageUrl!))
            : null,
        styleInformation: notification.imageUrl != null
            ? BigPictureStyleInformation(
                ByteArrayAndroidBitmap(
                    await _getByteArrayFromUrl(notification.imageUrl!)),
                largeIcon: ByteArrayAndroidBitmap(
                    await _getByteArrayFromUrl(notification.imageUrl!)),
              )
            : null,
      );

      final iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      final platformDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Bildirimi göster
      await _localNotifications.show(
        notification.id.hashCode,
        notification.title,
        notification.body,
        platformDetails,
        payload: json.encode({
          'id': notification.id,
          'type': notification.type.toString().split('.').last,
          'data': notification.data,
        }),
      );

      Logger.info('Yerel bildirim gösterildi: ${notification.id}');
    } catch (e) {
      Logger.error('Yerel bildirim gösterilirken hata oluştu: $e');
    }
  }

  /// URL'den resim verisi alır
  Future<Uint8List> _getByteArrayFromUrl(String url) async {
    // Bu kısım büyük resimler için uygulamayı yavaşlatabilir
    // Gerçek uygulamada bu kısmı optimize etmek gerekebilir
    // URL'den resim verisi çekme işlemi gerçekleştirilecek
    return Uint8List(0); // Şimdilik boş bytelist dönüyor
  }

  /// Servisi kapatır ve kaynakları temizler
  @override
  void dispose() {
    _notificationSubject.close();
    super.dispose();
  }

  /// Bildirimi Firestore'a kaydet
  Future<void> saveNotificationToFirestore(
      NotificationModel notification) async {
    try {
      final authService = ServiceLocator.getIt<AuthService>();
      if (!authService.isAuthenticated) return;

      final userId = authService.currentUser!.id;

      await _firestore
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .doc(notification.id)
          .set(notification.toFirestore());

      Logger.info('Bildirim Firestore\'a kaydedildi: ${notification.id}');
    } catch (e) {
      Logger.error('Bildirim Firestore\'a kaydedilirken hata: $e');
    }
  }
}
