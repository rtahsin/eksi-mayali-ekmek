// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:get_it/get_it.dart';

import '../../domain/repositories/i_order_repository.dart';

class OrderRepository implements IOrderRepository {
  final FirebaseFirestore _firestore;
  final GetIt _getIt;

  OrderRepository(this._getIt) : _firestore = _getIt<FirebaseFirestore>();

  @override
  Future<Map<String, dynamic>> getOrders(String userId) async {
    try {
      final snapshot = await _firestore
          .collection('orders')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      final orders = <String, dynamic>{};
      for (var doc in snapshot.docs) {
        orders[doc.id] = doc.data();
      }

      return orders;
    } catch (e) {
      throw Exception('Siparişler alınırken hata oluştu: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> getOrderDetails(String orderId) async {
    try {
      final doc = await _firestore.collection('orders').doc(orderId).get();
      if (!doc.exists) {
        throw Exception('Sipariş bulunamadı');
      }

      return doc.data()!;
    } catch (e) {
      throw Exception('Sipariş detayları alınırken hata oluştu: $e');
    }
  }

  @override
  Future<bool> createOrder(Map<String, dynamic> orderData) async {
    try {
      await _firestore.collection('orders').add(orderData);
      return true;
    } catch (e) {
      throw Exception('Sipariş oluşturulurken hata oluştu: $e');
    }
  }

  @override
  Future<bool> updateOrderStatus(String orderId, String status) async {
    try {
      await _firestore.collection('orders').doc(orderId).update({
        'status': status,
        'updatedAt': DateTime.now(),
      });
      return true;
    } catch (e) {
      throw Exception('Sipariş durumu güncellenirken hata oluştu: $e');
    }
  }

  @override
  Future<bool> cancelOrder(String orderId) async {
    try {
      await _firestore.collection('orders').doc(orderId).update({
        'status': 'cancelled',
        'cancelledAt': DateTime.now(),
      });
      return true;
    } catch (e) {
      throw Exception('Sipariş iptal edilirken hata oluştu: $e');
    }
  }

  @override
  Stream<DocumentSnapshot> getOrderStream(String orderId) {
    return _firestore.collection('orders').doc(orderId).snapshots();
  }
}
