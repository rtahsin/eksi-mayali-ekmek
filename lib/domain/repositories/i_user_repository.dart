import 'package:cloud_firestore/cloud_firestore.dart';

abstract class IUserRepository {
  Future<Map<String, dynamic>> getUserProfile(String userId);
  Future<bool> updateUserProfile(String userId, Map<String, dynamic> userData);
  Future<bool> updateUserAddress(
      String userId, Map<String, dynamic> addressData);
  Future<Map<String, dynamic>> getUserOrders(String userId);
  Stream<DocumentSnapshot> getUserStream(String userId);

  /// Tüm kullanıcıları getirir
  Future<List<DocumentSnapshot>> getAllUsers();
}
