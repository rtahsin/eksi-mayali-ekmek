import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/repositories/i_user_repository.dart';
import '../../utils/logger.dart';

/// Kullanıcı veritabanı koleksiyon adları
class UserCollections {
  static const String users = 'users';
  static const String orders = 'orders';
}

class UserRepository implements IUserRepository {
  final FirebaseFirestore _firestore;

  UserRepository(this._firestore);

  @override
  Future<Map<String, dynamic>> getUserProfile(String userId) async {
    try {
      final doc =
          await _firestore.collection(UserCollections.users).doc(userId).get();
      if (!doc.exists) {
        Logger.warning('Kullanıcı bulunamadı: $userId');
        throw Exception('Kullanıcı bulunamadı');
      }

      return doc.data()!;
    } catch (e) {
      Logger.error('Kullanıcı profili alınırken hata oluştu: $e');
      throw Exception('Kullanıcı profili alınırken hata oluştu: $e');
    }
  }

  @override
  Future<bool> updateUserProfile(
      String userId, Map<String, dynamic> userData) async {
    try {
      await _firestore
          .collection(UserCollections.users)
          .doc(userId)
          .update(userData);
      Logger.info('Kullanıcı profili güncellendi: $userId');
      return true;
    } catch (e) {
      Logger.error('Kullanıcı profili güncellenirken hata oluştu: $e');
      throw Exception('Kullanıcı profili güncellenirken hata oluştu: $e');
    }
  }

  @override
  Future<bool> updateUserAddress(
      String userId, Map<String, dynamic> addressData) async {
    try {
      await _firestore.collection(UserCollections.users).doc(userId).update({
        'addresses': FieldValue.arrayUnion([addressData]),
      });
      Logger.info('Kullanıcı adresi güncellendi: $userId');
      return true;
    } catch (e) {
      Logger.error('Kullanıcı adresi güncellenirken hata oluştu: $e');
      throw Exception('Kullanıcı adresi güncellenirken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getUserOrders(String userId) async {
    try {
      final snapshot = await _firestore
          .collection(UserCollections.orders)
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      final orders = <String, dynamic>{};
      for (var doc in snapshot.docs) {
        orders[doc.id] = doc.data();
      }

      Logger.info(
          'Kullanıcı siparişleri alındı: $userId, ${orders.length} sipariş');
      return orders;
    } catch (e) {
      Logger.error('Kullanıcı siparişleri alınırken hata oluştu: $e');
      throw Exception('Kullanıcı siparişleri alınırken hata oluştu: $e');
    }
  }

  @override
  Stream<DocumentSnapshot> getUserStream(String userId) {
    return _firestore.collection(UserCollections.users).doc(userId).snapshots();
  }

  @override
  Future<List<DocumentSnapshot>> getAllUsers() async {
    try {
      final querySnapshot = await _firestore
          .collection('users')
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs;
    } catch (e) {
      Logger.error('Error getting all users: $e');
      rethrow;
    }
  }
}
