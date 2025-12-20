import 'package:cloud_firestore/cloud_firestore.dart';

abstract class IProductRepository {
  Future<Map<String, dynamic>> getProducts();
  Future<Map<String, dynamic>> getProductDetails(String productId);
  Future<bool> addProduct(Map<String, dynamic> productData);
  Future<bool> updateProduct(
      String productId, Map<String, dynamic> productData);
  Future<bool> deleteProduct(String productId);
  Stream<QuerySnapshot> getProductsStream();
  Future<bool> updateStock(String productId, int newStock);
  Future<bool> toggleProductStatus(String productId, bool newStatus);
  Future<bool> toggleFeaturedStatus(String productId, bool newStatus);
  WriteBatch batch();
  Future<List<Map<String, dynamic>>> fetchProductsByCategory(String category);
  Future<List<Map<String, dynamic>>> getTopSellingProducts({int limit = 5});
  Future<List<Map<String, dynamic>>> getProductsByIds(List<String> productIds);
  Future<List<Map<String, dynamic>>> getFavoriteProducts(String userId);
  Future<bool> incrementSales(String productId, int quantity);
}
