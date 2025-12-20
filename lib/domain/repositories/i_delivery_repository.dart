import 'package:cloud_firestore/cloud_firestore.dart';

abstract class IDeliveryRepository {
  Future<Map<String, dynamic>> getDeliveryOptions();
  Future<Map<String, dynamic>> getDeliveryZones();
  Future<Map<String, dynamic>> getActiveDeliveries(String userId);
  Future<bool> updateDeliveryStatus(String orderId, String status,
      {String? description});
  Future<bool> updateCourierLocation(String orderId, double lat, double lng);
  Future<Map<String, dynamic>> selectDeliveryOption(
      String optionId, String date, String timeSlot);
  Future<bool> selectDeliveryZone(String orderId, String zone);
  Future<Map<String, dynamic>> getOrderTracking(String orderId);
  Stream<DocumentSnapshot> getDeliveryStream(String orderId);
}
