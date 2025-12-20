import 'package:cloud_firestore/cloud_firestore.dart';

abstract class IOrderRepository {
  Future<Map<String, dynamic>> getOrders(String userId);
  Future<Map<String, dynamic>> getOrderDetails(String orderId);
  Future<bool> createOrder(Map<String, dynamic> orderData);
  Future<bool> updateOrderStatus(String orderId, String status);
  Future<bool> cancelOrder(String orderId);
  Stream<DocumentSnapshot> getOrderStream(String orderId);
}
