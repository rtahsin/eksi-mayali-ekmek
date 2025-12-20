/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                   EKŞİ MAYALI EKMEK - ORDER_SERVICE.DART                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya, siparişlerin yönetiminden sorumlu servisi içerir.                 │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. OrderService sınıfı                                                      │
│    - createOrder(): Yeni sipariş oluşturur                                  │
│    - getOrders(): Kullanıcı siparişlerini getirir                           │
│    - getOrderById(): Belirli bir siparişin detaylarını getirir              │
│    - updateOrderStatus(): Sipariş durumunu günceller                        │
│    - cancelOrder(): Siparişi iptal eder                                     │
│    - getOrderItems(): Sipariş ürünlerini getirir                            │
│ 2. Entegrasyonlar                                                           │
│    - NotificationService ile bildirim gönderme                              │
│    - PaymentService ile ödeme işlemleri                                     │
│    - DeliveryService ile teslimat yönetimi                                  │
│ 3. Firebase Firestore entegrasyonu                                          │
└─────────────────────────────────────────────────────────────────────────────┘
*/

// ignore_for_file: depend_on_referenced_packages, unused_import, unreachable_switch_default, unused_field

import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../core/di/service_locator.dart';
import '../models/address.dart';
import '../models/cart_item.dart';
import '../models/order.dart';
import '../models/order_item.dart';
import '../models/user.dart';
import '../services/notification_service.dart';
import '../utils/constants.dart'; // FirestoreCollections için
import '../utils/logger.dart';
import 'audit_log_service.dart';
import 'auth_service.dart';

/// Sipariş yönetimi servisi
///
/// Bu servis, sipariş oluşturma, takip etme, güncelleme ve iptal etme
/// işlemlerini yönetir. Aynı zamanda sipariş bildirimleri göndermek
/// için NotificationService ile entegre çalışır.
///
/// Temel sorumlulukları:
/// - Sepetten sipariş oluşturma
/// - Sipariş durumunu izleme ve güncelleme
/// - Sipariş geçmişini görüntüleme
/// - Sipariş iptali ve iade işlemleri
/// - Sipariş bildirimlerini yönetme
class OrderService with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;
  final AuthService _authService;

  OrderService(this._authService);

  List<Order> _orders = [];
  bool _isLoading = false;

  List<Order> get orders => [..._orders];
  bool get isLoading => _isLoading;

  // Tüm siparişleri getir - Admin için
  Future<List<Order>> getAllOrders() async {
    try {
      Logger.info('Tüm siparişler yükleniyor');

      // 1. 'siparisler' koleksiyonundan siparişleri al
      List<Order> ordersFromSiparislerCollection = [];
      try {
        final snapshot = await _firestore.collection('siparisler').get();

        Logger.info('"siparisler" koleksiyonundan ${snapshot.docs.length} sipariş bulundu');

        if (snapshot.docs.isEmpty) {
          Logger.warning('"siparisler" koleksiyonu boş veya erişim yetkisi yok');
        }

        for (var doc in snapshot.docs) {
          try {
            final order = Order.fromJson({
              'id': doc.id,
              ...doc.data(),
            });
            ordersFromSiparislerCollection.add(order);
          } catch (e) {
            Logger.error('"siparisler" koleksiyonundan sipariş dönüştürme hatası: $e');
          }
        }
      } catch (e) {
        Logger.error('"siparisler" koleksiyonundan veri çekilirken hata: $e');
      }

      // 2. FirestoreCollections.orders koleksiyonundan siparişleri al
      List<Order> ordersFromOrdersCollection = [];
      try {
        final snapshot = await _firestore.collection(FirestoreCollections.orders).get();

        Logger.info('"orders" koleksiyonundan ${snapshot.docs.length} sipariş bulundu');

        if (snapshot.docs.isEmpty) {
          Logger.warning('"orders" koleksiyonu boş veya erişim yetkisi yok');
        }

        for (var doc in snapshot.docs) {
          try {
            final order = Order.fromFirestore(doc);
            ordersFromOrdersCollection.add(order);
          } catch (e) {
            Logger.error('"orders" koleksiyonundan sipariş dönüştürme hatası: $e');
          }
        }
      } catch (e) {
        Logger.error('"orders" koleksiyonundan veri çekilirken hata: $e');
      }

      // İki koleksiyondan gelen verileri birleştir
      final allOrders = [...ordersFromSiparislerCollection, ...ordersFromOrdersCollection];

      // Dublike siparişleri kontrol et ve kaldır (aynı ID'ye sahip olanlar)
      final uniqueOrders = <String, Order>{};
      for (var order in allOrders) {
        uniqueOrders[order.id] = order;
      }

      final dedupedOrders = uniqueOrders.values.toList();

      // Tarihe göre sırala (en yeni en üstte)
      dedupedOrders.sort((a, b) => b.orderDate.compareTo(a.orderDate));

      Logger.info('Toplam ${dedupedOrders.length} benzersiz sipariş yüklendi');

      if (dedupedOrders.isEmpty) {
        // Firestore erişim kontrolleri
        final auth = _auth.currentUser;
        Logger.warning(
            'Kullanıcı oturum durumu: ${auth != null ? "Giriş yapılmış" : "Giriş yapılmamış"}');
        if (auth != null) {
          Logger.info('Giriş yapan kullanıcı ID: ${auth.uid}');
        }
      }

      _orders = dedupedOrders;
      notifyListeners();
      return dedupedOrders;
    } catch (e) {
      Logger.error('Tüm siparişleri getirirken hata: $e');
      rethrow;
    }
  }

  // Kullanıcı siparişlerini getir (fetchOrders takma adı)
  Future<List<Order>> fetchOrders() async {
    return getUserOrders();
  }

  // Kullanıcının siparişlerini getir
  Future<List<Order>> getUserOrders() async {
    try {
      if (_authService.currentUser == null) {
        throw Exception('Kullanıcı girişi yapılmamış');
      }

      Logger.info('Kullanıcı siparişleri yükleniyor: ${_authService.currentUser!.id}');

      // İlk olarak "orders" koleksiyonunu kontrol et
      List<Order> ordersFromOrdersCollection = [];
      try {
        Logger.info('Orders koleksiyonunu sorguluyor - userId: ${_authService.currentUser!.id}');

        // Geçici olarak orderBy kaldırıldı - Firestore composite index olmayabilir
        final ordersRef = _firestore
            .collection(FirestoreCollections.orders)
            .where('userId', isEqualTo: _authService.currentUser!.id);

        final snapshot = await ordersRef.get();

        Logger.info('"orders" koleksiyonundan ${snapshot.docs.length} sipariş bulundu');

        // Debug: İlk sipariş varsa detaylarını göster
        if (snapshot.docs.isNotEmpty) {
          final firstDoc = snapshot.docs.first;
          Logger.info('İlk sipariş ID: ${firstDoc.id}');
          Logger.info('İlk sipariş data keys: ${(firstDoc.data() as Map).keys.toList()}');
        }

        for (var doc in snapshot.docs) {
          try {
            final order = Order.fromFirestore(doc);
            ordersFromOrdersCollection.add(order);
            Logger.info(
                'Sipariş yüklendi: ${order.id}, Tarih: ${order.orderDate}, Status: ${order.orderStatus.displayName}');
          } catch (e) {
            Logger.error('Orders koleksiyonundan sipariş dönüştürme hatası (doc ${doc.id}): $e');
          }
        }
      } catch (e) {
        Logger.error('"orders" koleksiyonundan sipariş yüklenirken hata: $e');
        Logger.error('Hata detayı: ${e.toString()}');
      }

      // Sonra "siparisler" koleksiyonunu kontrol et
      List<Order> ordersFromSiparislerCollection = [];
      try {
        // Geçici olarak orderBy kaldırıldı
        final siparislerRef = _firestore
            .collection('siparisler') // String değer kullandık
            .where('userId', isEqualTo: _authService.currentUser!.id);

        final snapshot = await siparislerRef.get();

        Logger.info('"siparisler" koleksiyonundan ${snapshot.docs.length} sipariş bulundu');

        for (var doc in snapshot.docs) {
          try {
            final order = Order.fromFirestore(doc);
            ordersFromSiparislerCollection.add(order);
          } catch (e) {
            Logger.error('Siparisler koleksiyonundan sipariş dönüştürme hatası: $e');
          }
        }
      } catch (e) {
        Logger.error('"siparisler" koleksiyonundan sipariş yüklenirken hata: $e');
      }

      // İki koleksiyondan gelen siparişleri birleştir
      final allOrders = [...ordersFromOrdersCollection, ...ordersFromSiparislerCollection];

      // Tarihe göre sırala (en yeni en üstte)
      allOrders.sort((a, b) => b.orderDate.compareTo(a.orderDate));

      Logger.info('Toplam ${allOrders.length} sipariş yüklendi');

      // Yerel listeyi güncelle ve bildirim gönder
      _orders = allOrders;
      notifyListeners();

      return allOrders;
    } catch (e) {
      Logger.error('Kullanıcı siparişleri yüklenirken hata: $e');
      throw Exception('Siparişler yüklenirken bir hata oluştu: $e');
    }
  }

  // Sipariş detaylarını getir
  Future<Order?> getOrderById(String orderId) async {
    try {
      Logger.info('Sipariş detayları yükleniyor: $orderId');

      // Önce 'siparisler' koleksiyonuna bak
      try {
        final doc = await _firestore.collection('siparisler').doc(orderId).get();

        if (doc.exists) {
          Logger.info('Sipariş "siparisler" koleksiyonunda bulundu');
          final data = doc.data()!;
          return Order.fromJson({
            'id': doc.id,
            ...data,
          });
        }
      } catch (e) {
        Logger.error('"siparisler" koleksiyonunda sipariş aranırken hata: $e');
      }

      // Sonra 'orders' koleksiyonuna bak
      try {
        final doc = await _firestore.collection(FirestoreCollections.orders).doc(orderId).get();

        if (doc.exists) {
          Logger.info('Sipariş "orders" koleksiyonunda bulundu');
          return Order.fromFirestore(doc);
        }
      } catch (e) {
        Logger.error('"orders" koleksiyonunda sipariş aranırken hata: $e');
      }

      Logger.warning('Sipariş bulunamadı: $orderId');
      return null;
    } catch (e) {
      Logger.error('Sipariş detaylarını alma hatası: $e');
      rethrow;
    }
  }

  /// Yeni bir sipariş oluşturur
  ///
  /// Ödeme bilgileri, teslimat adresi ve sepet içeriğini kullanarak
  /// yeni bir sipariş kaydı oluşturur ve Firestore'a kaydeder.
  /// Başarılı durumda sipariş ID'sini döndürür.
  ///
  /// @param paymentMethod Ödeme yöntemi
  /// @param address Teslimat adresi
  /// @param cart Sepet içeriği
  /// @return Oluşturulan siparişin ID'si
  Future<String> createOrder({
    required List<OrderItem> items,
    required double amount,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required String shippingAddress,
    required String paymentMethod,
    required String userId,
    String? notes,
  }) async {
    try {
      final orderId = const Uuid().v4();
      final order = Order(
        id: orderId,
        userId: userId,
        items: items,
        amount: amount,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        shippingAddress: shippingAddress,
        orderStatus: OrderStatus.pending,
        dateTime: DateTime.now(),
        paymentMethod: paymentMethod,
        notes: notes ?? '',
      );

      await _firestore.collection('orders').doc(orderId).set(order.toJson());

      // Bildirim gönder
      final notificationService = ServiceLocator.getIt<NotificationService>();
      notificationService.showOrderStatusNotification(
        orderId: orderId,
        title: 'Sipariş Oluşturuldu',
        body: 'Siparişiniz başarıyla oluşturuldu. Sipariş numarası: $orderId',
        data: {'orderId': orderId, 'status': 'pending'},
      );

      // Sipariş onay e-postası gönder
      await sendOrderConfirmationEmail(
        email: customerEmail,
        customerName: customerName,
        orderId: orderId,
        amount: amount,
        items: items,
      );

      return orderId;
    } catch (e) {
      Logger.error('Sipariş oluşturulurken hata: $e');
      throw Exception('Sipariş oluşturulamadı: $e');
    }
  }

  // E-posta ile sipariş onayı gönderme
  Future<void> sendOrderConfirmationEmail({
    required String email,
    required String customerName,
    required String orderId,
    required double amount,
    required List<OrderItem> items,
  }) async {
    try {
      // E-posta içeriğini oluştur
      final StringBuffer emailBody = StringBuffer();

      emailBody.writeln('<html><body>');
      emailBody.writeln('<h2>Merhaba $customerName,</h2>');
      emailBody.writeln('<p>EkmekLab olarak siparişiniz için teşekkür ederiz!</p>');
      emailBody.writeln('<h3>📋 Sipariş Detayları:</h3>');
      emailBody.writeln('<p><strong>Sipariş No:</strong> $orderId</p>');
      emailBody.writeln('<p><strong>Toplam Tutar:</strong> ${amount.toStringAsFixed(2)} ₺</p>');

      emailBody.writeln('<h3>🛒 Sipariş İçeriği:</h3>');
      emailBody.writeln('<ul>');
      for (var item in items) {
        emailBody.writeln(
            '<li>${item.name} x${item.quantity} - ${(item.price * item.quantity).toStringAsFixed(2)} ₺</li>');
      }
      emailBody.writeln('</ul>');

      emailBody.writeln('<p>Siparişiniz hazırlandığında tekrar bilgilendirme yapılacaktır.</p>');
      emailBody.writeln(
          '<p>Sorularınız için bize ulaşabilirsiniz: <a href="tel:05551234567">0555 123 4567</a></p>');
      emailBody.writeln('<p>Bizi tercih ettiğiniz için teşekkürler!</p>');
      emailBody.writeln('<p><strong>EkmekLab</strong></p>');
      emailBody.writeln('</body></html>');

      // Firebase Function URL - Functions dağıtıldıktan sonra gerçek URL'yi kullanın
      const emailServiceUrl = 'https://us-central1-eksimayaliekmekweb.cloudfunctions.net/sendEmail';

      // E-posta gönderme isteği
      final response = await http.post(
        Uri.parse(emailServiceUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'to': email,
          'subject': 'Siparişiniz Alındı - Ekşi Mayalı Ekmek',
          'html': emailBody.toString(),
          'from': 'siparis@eksimayaliekmek.com',
          'fromName': 'Ekşi Mayalı Ekmek',
        }),
      );

      if (response.statusCode == 200) {
        Logger.info('Sipariş onay e-postası gönderildi: $email');
      } else {
        Logger.error('E-posta gönderilirken hata: ${response.statusCode} - ${response.body}');

        // Hata durumunda Firebase'e kaydet - böylece admin panelinden görülebilir
        await _firestore.collection('mail_queue').add({
          'to': email,
          'subject': 'Siparişiniz Alındı - Ekşi Mayalı Ekmek',
          'html': emailBody.toString(),
          'orderId': orderId,
          'createdAt': FieldValue.serverTimestamp(),
          'status': 'error',
          'statusCode': response.statusCode,
          'errorMessage': response.body,
        });
      }
    } catch (e) {
      Logger.error('E-posta gönderilirken hata: $e');

      // Hata durumunda daha sonra tekrar denemek üzere Firebase'e kaydet
      await _firestore.collection('mail_queue').add({
        'to': email,
        'subject': 'Siparişiniz Alındı - Ekşi Mayalı Ekmek',
        'orderId': orderId,
        'createdAt': FieldValue.serverTimestamp(),
        'status': 'error',
        'errorMessage': e.toString(),
      });
    }
  }

  /// Sipariş durumunu günceller
  ///
  /// Belirtilen siparişin durumunu günceller ve gerekirse
  /// ilgili bildirimleri gönderir. Admin ve kullanıcı tarafından
  /// kullanılabilir.
  ///
  /// @param orderId Sipariş ID'si
  /// @param newStatus Yeni sipariş durumu
  /// @param notifyUser Kullanıcıya bildirim gönderilip gönderilmeyeceği
  /// @return İşlem başarılı ise true, değilse false
  Future<bool> updateOrderStatus(String orderId, OrderStatus newStatus,
      {bool notifyUser = true}) async {
    try {
      // Yetki kontrolü: support veya admin veya superadmin; aksi halde reddet
      if (!_authService.hasAtLeast('support')) {
        throw Exception('Yetkisiz işlem: sipariş durumu güncelleme izni yok');
      }

      // Mevcut siparişi al (önce orders sonra siparisler)
      DocumentSnapshot? existingDoc;
      String targetCollection = 'orders';
      try {
        existingDoc = await _firestore.collection('orders').doc(orderId).get();
        if (!existingDoc.exists) {
          existingDoc = await _firestore.collection('siparisler').doc(orderId).get();
          if (existingDoc.exists) targetCollection = 'siparisler';
        }
      } catch (_) {}

      final nowIso = DateTime.now().toIso8601String();
      List<dynamic> history = [];
      if (existingDoc != null && existingDoc.exists) {
        final data = existingDoc.data() as Map<String, dynamic>;
        if (data['statusHistory'] is List) {
          history = List.from(data['statusHistory']);
        }
        // Mevcut status'u al (çeşitli alan adları için)
        String previousStatus = (data['status'] ?? data['orderStatus'] ?? 'pending').toString();
        history.add({
          'status': newStatus.toString().split('.').last,
          'changedAt': nowIso,
          'changedBy': _authService.currentUser?.id ?? 'unknown',
          'changedByRole': _authService.currentRole,
          'previousStatus': previousStatus,
        });
      } else {
        // İlk kayıt
        history.add({
          'status': newStatus.toString().split('.').last,
          'changedAt': nowIso,
          'changedBy': _authService.currentUser?.id ?? 'unknown',
          'changedByRole': _authService.currentRole,
          'previousStatus': null,
        });
      }

      await _firestore.collection(targetCollection).doc(orderId).set({
        'status': newStatus.toString().split('.').last,
        'updatedAt': nowIso,
        'statusHistory': history,
      }, SetOptions(merge: true));

      // Audit log
      await AuditLogService.instance.log('order_status_change', data: {
        'orderId': orderId,
        'newStatus': newStatus.toString().split('.').last,
        'actorRole': _authService.currentRole,
        'actorId': _authService.currentUser?.id,
        'collection': targetCollection,
      });

      // Bildirim gönder
      final notificationService = ServiceLocator.getIt<NotificationService>();
      String title = '';
      String body = '';
      String? imageUrl;

      switch (newStatus) {
        case OrderStatus.processing:
          title = 'Siparişiniz Hazırlanıyor 👨‍🍳';
          body =
              'Siparişiniz (#$orderId) şu anda fırınımızda özenle hazırlanıyor. Taze ekmeğiniz yakında hazır olacak!';
          imageUrl = 'assets/images/order_processing.jpg';
          break;
        case OrderStatus.ready:
          title = 'Siparişiniz Hazır! 🍞';
          body = 'Taze ekmeğiniz (#$orderId) hazır! Alabilirsiniz.';
          imageUrl = 'assets/images/order_ready.jpg';
          break;
        case OrderStatus.delivered:
          title = 'Siparişiniz Teslim Edildi ✅';
          body =
              'Siparişiniz (#$orderId) başarıyla teslim edildi. Afiyet olsun! Deneyiminizi değerlendirmeyi unutmayın.';
          imageUrl = 'assets/images/order_delivered.jpg';
          break;
        case OrderStatus.cancelled:
          title = 'Siparişiniz İptal Edildi ❌';
          body =
              'Siparişiniz (#$orderId) iptal edildi. Detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.';
          imageUrl = 'assets/images/order_cancelled.jpg';
          break;
        default:
          return false; // Bildirim gönderme
      }

      if (notifyUser) {
        notificationService.showOrderStatusNotification(
          orderId: orderId,
          title: title,
          body: body,
          data: {
            'orderId': orderId,
            'status': newStatus.toString().split('.').last,
            'imageUrl': imageUrl,
            'timestamp': DateTime.now().toIso8601String(),
            'actionType': 'ORDER_STATUS_UPDATE',
            'navigationRoute': '/orders/$orderId',
          },
        );
      }

      notifyListeners();
      return true;
    } catch (e) {
      Logger.error('Sipariş durumu güncellenirken hata: $e');
      throw Exception('Sipariş durumu güncellenemedi: $e');
    }
  }

  // Sipariş sil
  Future<void> deleteOrder(String orderId) async {
    try {
      await _firestore.collection('siparisler').doc(orderId).delete();

      // Yerel listeden kaldır
      _orders.removeWhere((order) => order.id == orderId);
      notifyListeners();
    } catch (e) {
      Logger.error('Sipariş silinirken hata: $e');
      rethrow;
    }
  }

  // Toplam geliri hesapla
  double calculateTotalRevenue() {
    return _orders.fold(0.0, (sum, order) => sum + (order.amount ?? 0.0));
  }

  // Sipariş durumu sayılarını hesapla
  Map<String, int> getOrderStatusCounts() {
    final counts = <String, int>{
      'pending': 0,
      'processing': 0,
      'shipped': 0,
      'delivered': 0,
      'cancelled': 0,
      'total': orders.length,
    };

    for (final order in orders) {
      switch (order.orderStatus) {
        case OrderStatus.pending:
          counts['pending'] = (counts['pending'] ?? 0) + 1;
          break;
        case OrderStatus.processing:
          counts['processing'] = (counts['processing'] ?? 0) + 1;
          break;
        case OrderStatus.ready:
          counts['ready'] = (counts['ready'] ?? 0) + 1;
          break;
        case OrderStatus.delivered:
          counts['delivered'] = (counts['delivered'] ?? 0) + 1;
          break;
        case OrderStatus.cancelled:
          counts['cancelled'] = (counts['cancelled'] ?? 0) + 1;
          break;
      }
    }

    return counts;
  }

  // Sipariş istatistikleri
  Map<String, dynamic> getOrderStats() {
    if (_orders.isEmpty) {
      return {
        'totalOrders': 0,
        'pendingOrders': 0,
        'processingOrders': 0,
        'shippedOrders': 0,
        'deliveredOrders': 0,
        'cancelledOrders': 0,
        'totalRevenue': 0.0,
        'averageOrderValue': 0.0,
      };
    }

    final pendingOrders = _orders.where((order) => order.orderStatus == OrderStatus.pending).length;
    final processingOrders =
        _orders.where((order) => order.orderStatus == OrderStatus.processing).length;
    final shippedOrders = _orders.where((order) => order.orderStatus == OrderStatus.ready).length;
    final deliveredOrders =
        _orders.where((order) => order.orderStatus == OrderStatus.delivered).length;
    final cancelledOrders =
        _orders.where((order) => order.orderStatus == OrderStatus.cancelled).length;

    final totalRevenue = _orders
        .where((order) => order.orderStatus != OrderStatus.cancelled)
        .fold(0.0, (sum, order) => sum + (order.amount ?? 0.0));

    final averageOrderValue = _orders.isEmpty ? 0.0 : totalRevenue / _orders.length;

    return {
      'totalOrders': _orders.length,
      'pendingOrders': pendingOrders,
      'processingOrders': processingOrders,
      'shippedOrders': shippedOrders,
      'deliveredOrders': deliveredOrders,
      'cancelledOrders': cancelledOrders,
      'totalRevenue': totalRevenue,
      'averageOrderValue': averageOrderValue,
    };
  }

  // Belirli bir tarih aralığındaki siparişleri getir
  List<Order> getOrdersByDateRange(DateTime startDate, DateTime endDate) {
    return _orders.where((order) {
      final orderDate = order.dateTime;
      return orderDate.isAfter(startDate) &&
          orderDate.isBefore(endDate.add(const Duration(days: 1)));
    }).toList();
  }

  // Günlük gelir verisi
  Map<DateTime, double> getDailyRevenue(int days) {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: days));

    // Başlangıç değerlerini 0 olarak ayarla
    final dailyData = <DateTime, double>{};
    for (var i = 0; i < days; i++) {
      final date = startDate.add(Duration(days: i));
      dailyData[DateTime(date.year, date.month, date.day)] = 0;
    }

    // Siparişleri tarihlerine göre topla
    for (final order in _orders) {
      if (order.orderStatus != OrderStatus.cancelled && order.dateTime.isAfter(startDate)) {
        final date = DateTime(order.dateTime.year, order.dateTime.month, order.dateTime.day);
        dailyData[date] = (dailyData[date] ?? 0) + (order.amount ?? 0.0);
      }
    }

    return dailyData;
  }

  // Siparişi iptal et
  Future<void> cancelOrder(String orderId, {String? cancelReason}) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Sipariş var mı kontrol et
      final order = await getOrderById(orderId);
      if (order == null) {
        throw Exception('Sipariş bulunamadı');
      }

      // İptal edilmiş siparişi tekrar iptal etmeyi engelle
      if (order.orderStatus == OrderStatus.cancelled) {
        throw Exception('Sipariş zaten iptal edilmiş');
      }

      // Teslim edilmiş siparişi iptal etmeyi engelle
      if (order.orderStatus == OrderStatus.delivered) {
        throw Exception('Teslim edilmiş sipariş iptal edilemez');
      }

      // Firestore'da güncelle
      await _firestore.collection('siparisler').doc(orderId).update({
        'orderStatus': OrderStatus.cancelled.index,
        'updatedAt': Timestamp.now(),
        'cancelReason': cancelReason ?? 'Müşteri talebi üzerine iptal edildi',
      });

      // Yerel listeyi güncelle
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index >= 0) {
        _orders[index] = _orders[index].copyWith(orderStatus: OrderStatus.cancelled);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Sipariş iptal edilirken hata: $e');
      rethrow;
    }
  }

  // Teslimat bilgilerini güncelle
  Future<void> updateShippingInfo(
    String orderId, {
    String? trackingNumber,
    String? shippingCompany,
    DateTime? estimatedDeliveryDate,
  }) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Sipariş var mı kontrol et
      final order = await getOrderById(orderId);
      if (order == null) {
        throw Exception('Sipariş bulunamadı');
      }

      // Firestore'da güncelle
      final updateData = <String, dynamic>{
        'updatedAt': Timestamp.now(),
      };

      if (trackingNumber != null) {
        updateData['trackingNumber'] = trackingNumber;
      }

      if (shippingCompany != null) {
        updateData['shippingCompany'] = shippingCompany;
      }

      if (estimatedDeliveryDate != null) {
        updateData['estimatedDeliveryDate'] = Timestamp.fromDate(estimatedDeliveryDate);
      }

      // Sipariş durumunu kargoya verildi olarak güncelle
      updateData['orderStatus'] = OrderStatus.ready.index;

      await _firestore.collection('siparisler').doc(orderId).update(updateData);

      // Yerel listeyi güncelle
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index >= 0) {
        _orders[index] = _orders[index].copyWith(orderStatus: OrderStatus.ready);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Teslimat bilgileri güncellenirken hata: $e');
      rethrow;
    }
  }

  // Toplu sipariş durumu güncelleme
  Future<void> bulkUpdateOrderStatus(List<String> orderIds, OrderStatus newStatus) async {
    try {
      _isLoading = true;
      notifyListeners();

      // Batch işlemi oluştur
      final batch = _firestore.batch();

      for (final orderId in orderIds) {
        final docRef = _firestore.collection('siparisler').doc(orderId);
        batch.update(docRef, {
          'orderStatus': newStatus.index,
          'updatedAt': Timestamp.now(),
        });
      }

      // Batch işlemini çalıştır
      await batch.commit();

      // Yerel listeyi güncelle
      for (final orderId in orderIds) {
        final index = _orders.indexWhere((o) => o.id == orderId);
        if (index >= 0) {
          _orders[index] = _orders[index].copyWith(orderStatus: newStatus);
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      Logger.error('Toplu sipariş durumu güncellenirken hata: $e');
      rethrow;
    }
  }

  // Belirli bir tarih aralığındaki siparişleri getir
  Future<List<Order>> fetchOrdersByDateRange(DateTime startDate, DateTime endDate) async {
    try {
      // Tarih aralığını Timestamp'e çevir
      final startTimestamp = Timestamp.fromDate(startDate);
      final endTimestamp =
          Timestamp.fromDate(endDate.add(Duration(days: 1))); // Bitiş tarihini dahil etmek için

      final snapshot = await _firestore
          .collection('siparisler')
          .where('dateTime', isGreaterThanOrEqualTo: startTimestamp)
          .where('dateTime', isLessThan: endTimestamp)
          .orderBy('dateTime', descending: true)
          .get();

      final orders = snapshot.docs.map((doc) {
        return Order.fromJson({
          'id': doc.id,
          ...doc.data(),
        });
      }).toList();

      return orders;
    } catch (e) {
      Logger.error('Tarih aralığındaki siparişleri getirirken hata: $e');
      rethrow;
    }
  }

  // Belirli bir kullanıcının siparişlerini getir
  Future<List<Order>> getOrdersByUserId(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('siparisler')
          .where('userId', isEqualTo: userId)
          .orderBy('dateTime', descending: true)
          .get();

      final orders = snapshot.docs.map((doc) {
        return Order.fromJson({
          'id': doc.id,
          ...doc.data(),
        });
      }).toList();

      return orders;
    } catch (e) {
      Logger.error('Kullanıcı siparişlerini getirirken hata: $e');
      rethrow;
    }
  }

  // Sipariş notlarını güncelle
  Future<void> updateOrderNotes(String orderId, String notes) async {
    try {
      // Sipariş var mı kontrol et
      final order = await getOrderById(orderId);
      if (order == null) {
        throw Exception('Sipariş bulunamadı');
      }

      // Firestore'da güncelle
      await _firestore.collection('siparisler').doc(orderId).update({
        'notes': notes,
        'updatedAt': Timestamp.now(),
      });

      // Yerel listeyi güncelle
      final index = _orders.indexWhere((o) => o.id == orderId);
      if (index >= 0) {
        _orders[index] = _orders[index].copyWith(notes: notes);
      }

      notifyListeners();
    } catch (e) {
      Logger.error('Sipariş notları güncellenirken hata: $e');
      rethrow;
    }
  }

  // Sipariş istatistiklerini getir (belirli bir tarih aralığı için)
  Future<Map<String, dynamic>> getOrderStatsForDateRange(
      DateTime startDate, DateTime endDate) async {
    try {
      final orders = await fetchOrdersByDateRange(startDate, endDate);

      if (orders.isEmpty) {
        return {
          'totalOrders': 0,
          'totalRevenue': 0.0,
          'averageOrderValue': 0.0,
          'statusCounts': {
            'pending': 0,
            'processing': 0,
            'shipped': 0,
            'delivered': 0,
            'cancelled': 0,
          },
        };
      }

      // Toplam sipariş sayısı
      final totalOrders = orders.length;

      // Toplam gelir
      final totalRevenue = orders.fold(0.0, (sum, order) => sum + order.total);

      // Ortalama sipariş değeri
      final averageOrderValue = totalRevenue / totalOrders;

      // Durum sayıları
      final statusCounts = <String, int>{
        'pending': 0,
        'processing': 0,
        'shipped': 0,
        'delivered': 0,
        'cancelled': 0,
      };

      for (final order in orders) {
        switch (order.orderStatus) {
          case OrderStatus.pending:
            statusCounts['pending'] = (statusCounts['pending'] ?? 0) + 1;
            break;
          case OrderStatus.processing:
            statusCounts['processing'] = (statusCounts['processing'] ?? 0) + 1;
            break;
          case OrderStatus.ready:
            statusCounts['ready'] = (statusCounts['ready'] ?? 0) + 1;
            break;
          case OrderStatus.delivered:
            statusCounts['delivered'] = (statusCounts['delivered'] ?? 0) + 1;
            break;
          case OrderStatus.cancelled:
            statusCounts['cancelled'] = (statusCounts['cancelled'] ?? 0) + 1;
            break;
        }
      }

      return {
        'totalOrders': totalOrders,
        'totalRevenue': totalRevenue,
        'averageOrderValue': averageOrderValue,
        'statusCounts': statusCounts,
      };
    } catch (e) {
      Logger.error('Sipariş istatistiklerini getirirken hata: $e');
      rethrow;
    }
  }

  Future<void> submitOrderReview(String orderId, String comment, double rating) async {
    try {
      final review = {
        'rating': rating,
        'comment': comment,
        'date': DateTime.now().toIso8601String(),
      };

      await _firestore.collection('siparisler').doc(orderId).update({
        'review': review,
      });
    } catch (e) {
      Logger.error('Error submitting review: $e');
      rethrow;
    }
  }
}
