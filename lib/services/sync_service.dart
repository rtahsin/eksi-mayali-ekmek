// ignore_for_file: avoid_print

import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../utils/constants.dart';
import '../utils/logger.dart';

/// SyncService, uygulama içindeki verilerin senkronizasyonunu ve
/// Firestore değişikliklerinin izlenmesini sağlar.
///
/// Bu servis şunları yapar:
/// 1. Ürünler, siparişler, kullanıcılar ve kategorilerdeki değişiklikleri izler
/// 2. Değişiklikler olduğunda UI'ın güncellenmesi için bildirim gönderir
/// 3. Admin panelinde yapılan değişiklikleri veritabanına kaydeder
/// 4. Çevrimdışı değişiklikleri çevrimiçi olunduğunda senkronize eder
///
/// Kullanım:
/// ```dart
/// // Dinleme başlatma
/// final syncService = GetIt.I<SyncService>();
/// syncService.listenToCollection('products', (snapshot) {
///   // Değişikliği işle
/// });
/// ```
class SyncService with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream abonelikleri
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
      _productsSubscription;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _ordersSubscription;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _usersSubscription;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>?
      _categoriesSubscription;

  // Singleton pattern
  static final SyncService _instance = SyncService._internal();

  factory SyncService() {
    return _instance;
  }

  SyncService._internal() {
    // Servis oluşturulduğunda dinleyicileri başlat
    _initListeners();
  }

  /// Firestore koleksiyonları için dinleyicileri başlatır
  /// Bu metod, SyncService oluşturulduğunda otomatik olarak çağrılır
  void _initListeners() {
    // Ürünler koleksiyonunu dinle
    _productsSubscription = _firestore
        .collection(FirestoreCollections.products)
        .snapshots()
        .listen((snapshot) {
      Logger.info('Ürünler koleksiyonunda değişiklik algılandı');
      notifyListeners();
    });

    // Siparişler koleksiyonunu dinle
    _ordersSubscription = _firestore
        .collection(FirestoreCollections.orders)
        .snapshots()
        .listen((snapshot) {
      Logger.info('Siparişler koleksiyonunda değişiklik algılandı');
      notifyListeners();
    });

    // Kullanıcılar koleksiyonunu dinle
    _usersSubscription = _firestore
        .collection(FirestoreCollections.users)
        .snapshots()
        .listen((snapshot) {
      Logger.info('Kullanıcılar koleksiyonunda değişiklik algılandı');
      notifyListeners();
    });

    // Kategoriler koleksiyonunu dinle
    _categoriesSubscription = _firestore
        .collection(FirestoreCollections.categories)
        .snapshots()
        .listen((snapshot) {
      Logger.info('Kategoriler koleksiyonunda değişiklik algılandı');
      notifyListeners();
    });

    Logger.debug('SyncService dinleyicileri başlatıldı');
  }

  /// Tüm dinleyicileri durdur
  /// Uygulama kapandığında veya servis dispose edildiğinde çağrılır
  @override
  void dispose() {
    _productsSubscription?.cancel();
    _ordersSubscription?.cancel();
    _usersSubscription?.cancel();
    _categoriesSubscription?.cancel();

    for (var subscription in _subscriptions) {
      subscription.cancel();
    }
    _subscriptions.clear();

    Logger.debug('SyncService dinleyicileri durduruldu');
    super.dispose();
  }

  /// Belirli bir koleksiyonu dinle
  ///
  /// [collectionName]: Dinlenecek koleksiyon adı
  /// [callback]: Değişiklik olduğunda çağrılacak fonksiyon
  ///
  /// Bu metod, belirtilen koleksiyondaki değişiklikleri dinler ve
  /// değişiklik olduğunda callback fonksiyonunu çağırır.
  void listenToCollection(String collectionName,
      Function(QuerySnapshot<Map<String, dynamic>>) callback) {
    final subscription =
        _firestore.collection(collectionName).snapshots().listen(callback);
    _subscriptions.add(subscription);
    Logger.debug('$collectionName koleksiyonu için dinleyici eklendi');
  }

  /// Belirli bir belgeyi dinle
  ///
  /// [collectionName]: Belgenin bulunduğu koleksiyon adı
  /// [documentId]: Dinlenecek belge ID'si
  /// [callback]: Değişiklik olduğunda çağrılacak fonksiyon
  void listenToDocument(String collectionName, String documentId,
      Function(DocumentSnapshot<Map<String, dynamic>>) callback) {
    final subscription = _firestore
        .collection(collectionName)
        .doc(documentId)
        .snapshots()
        .listen(callback);
    _subscriptions.add(subscription);
    Logger.debug('$collectionName/$documentId belgesi için dinleyici eklendi');
  }

  /// Belirli bir koleksiyonu dinlemeyi durdur
  ///
  /// [collectionName]: Dinlemesi durdurulacak koleksiyon adı
  void stopListeningToCollection(String collectionName) {
    if (collectionName == FirestoreCollections.products) {
      _productsSubscription?.cancel();
      _productsSubscription = null;
    } else if (collectionName == FirestoreCollections.orders) {
      _ordersSubscription?.cancel();
      _ordersSubscription = null;
    } else if (collectionName == FirestoreCollections.users) {
      _usersSubscription?.cancel();
      _usersSubscription = null;
    } else if (collectionName == FirestoreCollections.categories) {
      _categoriesSubscription?.cancel();
      _categoriesSubscription = null;
    }
    Logger.debug('$collectionName koleksiyonu için dinleyici durduruldu');
  }

  /// Admin panelinde yapılan değişiklikleri Firestore'a kaydeder
  ///
  /// [collection]: Güncellenecek koleksiyon adı
  /// [documentId]: Güncellenecek belge ID'si
  /// [data]: Kaydedilecek veriler
  /// [merge]: true ise mevcut verilerle birleştirilir, false ise üzerine yazılır
  Future<void> syncAdminChanges({
    String? collection,
    String? documentId,
    Map<String, dynamic>? data,
    bool merge = true,
  }) async {
    if (collection == null || documentId == null || data == null) {
      throw ArgumentError(
          'Koleksiyon, belge ID ve veri parametreleri gereklidir');
    }

    try {
      await _firestore
          .collection(collection)
          .doc(documentId)
          .set(data, SetOptions(merge: merge));
      Logger.info('$collection koleksiyonunda $documentId belgesi güncellendi');
    } catch (e) {
      Logger.error('Veri senkronizasyonu hatası: $e');
      rethrow;
    }
  }

  /// Belirli bir koleksiyondaki değişiklikleri dinlemek için özel bir stream döndürür
  ///
  /// [collection]: Dinlenecek koleksiyon adı
  Stream<QuerySnapshot> getCollectionStream(String collection) {
    return _firestore.collection(collection).snapshots();
  }

  /// Belirli bir belgedeki değişiklikleri dinlemek için özel bir stream döndürür
  ///
  /// [collection]: Belgenin bulunduğu koleksiyon adı
  /// [documentId]: Dinlenecek belge ID'si
  Stream<DocumentSnapshot> getDocumentStream(
      String collection, String documentId) {
    return _firestore.collection(collection).doc(documentId).snapshots();
  }
}
