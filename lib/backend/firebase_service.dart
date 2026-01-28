// ignore_for_file: depend_on_referenced_packages

import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;

import '../models/order.dart';
import '../models/product.dart';
import '../models/user.dart' as app_user;
import '../utils/logger.dart';

class FirebaseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;

  // Kullanıcı işlemleri

  // Kullanıcı girişi
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (userCredential.user != null) {
        final userData = await _getUserData(userCredential.user!.uid);
        final token = await userCredential.user!.getIdToken();

        return {
          'user': userData,
          'token': token,
        };
      } else {
        throw Exception('Kullanıcı girişi başarısız');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(String email, String password, String fullName) async {
    try {
      final userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (userCredential.user != null) {
        // Kullanıcı profil bilgilerini güncelle
        await userCredential.user!.updateDisplayName(fullName);

        // Firestore'a kullanıcı bilgilerini kaydet
        final userData = {
          'id': userCredential.user!.uid,
          'email': email,
          'fullName': fullName,
          'phoneNumber': '',
          'address': '',
          'favoriteProductIds': [],
          'isAdmin': false,
          'createdAt': DateTime.now().toIso8601String(),
        };

        await _firestore.collection('users').doc(userCredential.user!.uid).set(userData);

        final token = await userCredential.user!.getIdToken();

        return {
          'user': userData,
          'token': token,
        };
      } else {
        throw Exception('Kullanıcı kaydı başarısız');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Kullanıcı bilgilerini getir
  Future<app_user.User> getUserProfile(String token) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        final userData = await _getUserData(currentUser.uid);
        return app_user.User.fromJson(userData);
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Kullanıcı bilgilerini güncelle
  Future<app_user.User> updateUserProfile(String token, Map<String, dynamic> userData) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        await _firestore.collection('users').doc(currentUser.uid).update(userData);

        final updatedUserData = await _getUserData(currentUser.uid);
        return app_user.User.fromJson(updatedUserData);
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Kullanıcı verilerini getir
  Future<Map<String, dynamic>> _getUserData(String uid) async {
    try {
      final docSnapshot = await _firestore.collection('users').doc(uid).get();

      if (docSnapshot.exists) {
        return {
          'id': uid,
          ...docSnapshot.data() as Map<String, dynamic>,
        };
      } else {
        throw Exception('Kullanıcı verileri bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Ürün işlemleri

  // Tüm ürünleri getir
  Future<List<Product>> getProducts() async {
    try {
      final querySnapshot = await _firestore.collection('products').get();

      return querySnapshot.docs.map((doc) {
        return Product.fromJson({
          ...doc.data(),
          'id': doc.id,
        });
      }).toList();
    } catch (e) {
      rethrow;
    }
  }

  // Kategori bazında ürünleri getir
  Future<List<Product>> getProductsByCategory(String category) async {
    try {
      final querySnapshot =
          await _firestore.collection('products').where('category', isEqualTo: category).get();

      return querySnapshot.docs.map((doc) {
        return Product.fromJson({
          ...doc.data(),
          'id': doc.id,
        });
      }).toList();
    } catch (e) {
      rethrow;
    }
  }

  // Ürün detaylarını getir
  Future<Product> getProductDetails(String productId) async {
    try {
      final docSnapshot = await _firestore.collection('urunler').doc(productId).get();

      if (!docSnapshot.exists) {
        throw Exception('Ürün bulunamadı');
      }

      return Product.fromJson({...docSnapshot.data()!, 'id': productId});
    } catch (e) {
      Logger.error('Ürün detayları alınırken hata: $e');
      rethrow;
    }
  }

  // Favorilere ürün ekle
  Future<void> addToFavorites(String token, String productId) async {
    try {
      final userDoc = await _firestore.collection('users').doc(token).get();

      if (!userDoc.exists) {
        throw Exception('Kullanıcı bulunamadı');
      }

      final userData = userDoc.data() as Map<String, dynamic>;
      final List<dynamic> favorites = userData['favoriteProductIds'] ?? [];

      if (!favorites.contains(productId)) {
        await _firestore.collection('users').doc(token).update({
          'favoriteProductIds': FieldValue.arrayUnion([productId]),
        });
      }
    } catch (e) {
      rethrow;
    }
  }

  // Favorilerden ürün çıkar
  Future<void> removeFromFavorites(String token, String productId) async {
    try {
      final userDoc = await _firestore.collection('users').doc(token).get();

      if (!userDoc.exists) {
        throw Exception('Kullanıcı bulunamadı');
      }

      await _firestore.collection('users').doc(token).update({
        'favoriteProductIds': FieldValue.arrayRemove([productId]),
      });
    } catch (e) {
      rethrow;
    }
  }

  // Favori ürünleri getir
  Future<List<Product>> getFavoriteProducts(String userId) async {
    try {
      // Kullanıcının favori ürün ID'lerini al
      final userDoc = await _firestore.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        Logger.error('Kullanıcı bulunamadı: $userId');
        return [];
      }

      final userData = userDoc.data();
      if (userData == null) {
        Logger.error('Kullanıcı verisi boş: $userId');
        return [];
      }

      final favoriteIds = List<String>.from(userData['favoriteProductIds'] ?? []);
      Logger.error('Favori ürün ID\'leri: $favoriteIds'); // Debug için

      if (favoriteIds.isEmpty) {
        Logger.error('Favori ürün yok');
        return [];
      }

      // Firestore'un whereIn sorgusu en fazla 10 öğe ile çalışır
      // Bu nedenle büyük listeleri parçalara ayırmalıyız
      List<Product> allProducts = [];

      // favoriteIds listesini 10'ar öğelik parçalara böl
      for (int i = 0; i < favoriteIds.length; i += 10) {
        final end = (i + 10 < favoriteIds.length) ? i + 10 : favoriteIds.length;
        final batchIds = favoriteIds.sublist(i, end);

        // Favori ürünleri getir
        final productsSnapshot = await _firestore
            .collection('urunler') // 'products' yerine 'urunler' kullanıyoruz
            .where(FieldPath.documentId, whereIn: batchIds)
            .get();

        Logger.debug('Bulunan ürün sayısı (batch): ${productsSnapshot.docs.length}'); // Debug için

        final batchProducts = productsSnapshot.docs.map((doc) {
          return Product.fromJson({...doc.data(), 'id': doc.id});
        }).toList();

        allProducts.addAll(batchProducts);
      }

      Logger.error('Toplam bulunan ürün sayısı: ${allProducts.length}'); // Debug için
      return allProducts;
    } catch (e) {
      Logger.error('Favori ürünleri getirirken hata: $e');
      return [];
    }
  }

  // Sipariş işlemleri

  // Sipariş oluştur
  Future<Order> createOrder(String token, Map<String, dynamic> orderData) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Sipariş verilerini hazırla
        final newOrderData = {
          'userId': currentUser.uid,
          'items': orderData['items'],
          'shippingAddress': orderData['shippingAddress'],
          'paymentMethod': orderData['paymentMethod'],
          'amount': orderData['totalAmount'],
          'status': 'pending',
          'dateTime': DateTime.now().toIso8601String(),
          'trackingNumber': null,
        };

        // Siparişi Firestore'a kaydet
        final docRef = await _firestore.collection('siparisler').add(newOrderData);

        // Sipariş ID'sini ekleyerek veriyi güncelle
        await docRef.update({'id': docRef.id});

        // Güncellenmiş sipariş verilerini al
        final orderSnapshot = await docRef.get();

        return Order.fromJson({
          ...orderSnapshot.data()!,
          'id': docRef.id,
        });
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Siparişleri getir
  Future<List<Order>> getOrders(String token) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        final querySnapshot = await _firestore
            .collection('siparisler')
            .where('userId', isEqualTo: currentUser.uid)
            .orderBy('dateTime', descending: true)
            .get();

        return querySnapshot.docs.map((doc) {
          return Order.fromJson({
            ...doc.data(),
            'id': doc.id,
          });
        }).toList();
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Sipariş detaylarını getir
  Future<Order> getOrderDetails(String token, String orderId) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        final docSnapshot = await _firestore.collection('siparisler').doc(orderId).get();

        if (docSnapshot.exists) {
          // Kullanıcının kendi siparişi mi kontrol et
          if (docSnapshot.data()?['userId'] == currentUser.uid) {
            return Order.fromJson({
              ...docSnapshot.data()!,
              'id': docSnapshot.id,
            });
          } else {
            throw Exception('Bu siparişe erişim izniniz yok');
          }
        } else {
          throw Exception('Sipariş bulunamadı');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Sipariş iptal et
  Future<void> cancelOrder(String token, String orderId) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        final docSnapshot = await _firestore.collection('siparisler').doc(orderId).get();

        if (docSnapshot.exists) {
          // Kullanıcının kendi siparişi mi kontrol et
          if (docSnapshot.data()?['userId'] == currentUser.uid) {
            // Sipariş durumunu kontrol et
            final status = docSnapshot.data()?['status'];

            if (status == 'pending' || status == 'processing') {
              await _firestore.collection('siparisler').doc(orderId).update({
                'status': 'cancelled',
              });
            } else {
              throw Exception('Bu sipariş artık iptal edilemez');
            }
          } else {
            throw Exception('Bu siparişe erişim izniniz yok');
          }
        } else {
          throw Exception('Sipariş bulunamadı');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin işlemleri

  // Admin: Tüm siparişleri getir
  Future<List<Order>> getAllOrders(String token) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          final querySnapshot =
              await _firestore.collection('siparisler').orderBy('dateTime', descending: true).get();

          return querySnapshot.docs.map((doc) {
            return Order.fromJson({
              ...doc.data(),
              'id': doc.id,
            });
          }).toList();
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Sipariş durumunu güncelle
  Future<void> updateOrderStatus(String token, String orderId, String status) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          await _firestore.collection('siparisler').doc(orderId).update({
            'status': status,
          });
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Tüm kullanıcıları getir
  Future<List<app_user.User>> getAllUsers(String token) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          final querySnapshot = await _firestore.collection('users').get();

          return querySnapshot.docs.map((doc) {
            return app_user.User.fromJson({
              ...doc.data(),
              'id': doc.id,
            });
          }).toList();
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Kullanıcı bilgilerini güncelle
  Future<void> updateUser(String token, String userId, Map<String, dynamic> userData) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          await _firestore.collection('users').doc(userId).update(userData);
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Yeni ürün ekle
  Future<void> addProduct(String token, Map<String, dynamic> productData) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          final docRef = await _firestore.collection('products').add(productData);
          await docRef.update({'id': docRef.id});
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Ürün güncelle
  Future<void> updateProduct(
      String token, String productId, Map<String, dynamic> productData) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          await _firestore.collection('products').doc(productId).update(productData);
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: Ürün sil
  Future<void> deleteProduct(String token, String productId) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          await _firestore.collection('products').doc(productId).delete();
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }

  // Admin: İstatistikleri getir
  Future<Map<String, dynamic>> getStatistics(String token) async {
    try {
      final currentUser = _auth.currentUser;

      if (currentUser != null) {
        // Kullanıcının admin olup olmadığını kontrol et
        final userDoc = await _firestore.collection('users').doc(currentUser.uid).get();
        final isAdmin = userDoc.data()?['isAdmin'] ?? false;

        if (isAdmin) {
          // Toplam kullanıcı sayısı
          final usersSnapshot = await _firestore.collection('users').count().get();
          final totalUsers = usersSnapshot.count;

          // Toplam ürün sayısı
          final productsSnapshot = await _firestore.collection('products').count().get();
          final totalProducts = productsSnapshot.count;

          // Toplam sipariş sayısı
          final ordersSnapshot = await _firestore.collection('siparisler').count().get();
          final totalOrders = ordersSnapshot.count;

          // Toplam gelir
          final ordersQuerySnapshot = await _firestore.collection('siparisler').get();
          double totalRevenue = 0;

          for (var doc in ordersQuerySnapshot.docs) {
            totalRevenue += (doc.data()['amount'] as num).toDouble();
          }

          // Son siparişler
          final recentOrdersSnapshot = await _firestore
              .collection('siparisler')
              .orderBy('dateTime', descending: true)
              .limit(5)
              .get();

          final recentOrders = recentOrdersSnapshot.docs.map((doc) {
            return {
              ...doc.data(),
              'id': doc.id,
            };
          }).toList();

          return {
            'totalUsers': totalUsers,
            'totalProducts': totalProducts,
            'totalOrders': totalOrders,
            'totalRevenue': totalRevenue,
            'recentOrders': recentOrders,
          };
        } else {
          throw Exception('Bu işlem için yetkiniz yok');
        }
      } else {
        throw Exception('Kullanıcı bulunamadı');
      }
    } catch (e) {
      rethrow;
    }
  }
}
