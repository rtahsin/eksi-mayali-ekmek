import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/repositories/i_product_repository.dart';
import '../../utils/logger.dart';

class ProductRepository implements IProductRepository {
  final FirebaseFirestore _firestore;
  final String _collection = 'urunler';

  ProductRepository(this._firestore);

  @override
  Future<Map<String, dynamic>> getProducts() async {
    try {
      final snapshot = await _firestore.collection(_collection).get();
      return {
        'data': snapshot.docs.map((doc) => {...doc.data(), 'id': doc.id}).toList(),
        'error': null
      };
    } catch (e) {
      return {'data': null, 'error': 'Ürünler alınırken bir hata oluştu: $e'};
    }
  }

  @override
  Future<Map<String, dynamic>> getProductDetails(String productId) async {
    try {
      final doc = await _firestore.collection(_collection).doc(productId).get();
      if (!doc.exists) {
        return {'data': null, 'error': 'Ürün bulunamadı'};
      }
      return {
        'data': {...doc.data()!, 'id': doc.id},
        'error': null
      };
    } catch (e) {
      return {'data': null, 'error': 'Ürün detayları alınırken bir hata oluştu: $e'};
    }
  }

  @override
  Future<bool> addProduct(Map<String, dynamic> productData) async {
    try {
      await _firestore.collection(_collection).add(productData);
      return true;
    } catch (e) {
      Logger.error('Ürün eklenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> updateProduct(String productId, Map<String, dynamic> productData) async {
    try {
      await _firestore.collection(_collection).doc(productId).update(productData);
      return true;
    } catch (e) {
      Logger.error('Ürün güncellenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> deleteProduct(String productId) async {
    try {
      await _firestore.collection(_collection).doc(productId).delete();
      return true;
    } catch (e) {
      Logger.error('Ürün silinirken hata: $e');
      return false;
    }
  }

  @override
  Stream<QuerySnapshot> getProductsStream() {
    return _firestore.collection(_collection).snapshots();
  }

  @override
  Future<bool> updateStock(String productId, int newStock) async {
    try {
      await _firestore.collection(_collection).doc(productId).update({
        'stock': newStock,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      Logger.error('Stok güncellenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> toggleProductStatus(String productId, bool newStatus) async {
    try {
      await _firestore.collection(_collection).doc(productId).update({
        'isActive': newStatus,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      Logger.error('Ürün durumu güncellenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> toggleFeaturedStatus(String productId, bool newStatus) async {
    try {
      await _firestore.collection(_collection).doc(productId).update({
        'isFeatured': newStatus,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      Logger.error('Öne çıkan durumu güncellenirken hata: $e');
      return false;
    }
  }

  @override
  WriteBatch batch() {
    return _firestore.batch();
  }

  @override
  Future<List<Map<String, dynamic>>> fetchProductsByCategory(String category) async {
    try {
      final snapshot =
          await _firestore.collection(_collection).where('category', isEqualTo: category).get();
      return snapshot.docs.map((doc) => {...doc.data(), 'id': doc.id}).toList();
    } catch (e) {
      Logger.error('Kategori ürünleri alınırken hata: $e');
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getTopSellingProducts({int limit = 5}) async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .orderBy('sales', descending: true)
          .limit(limit)
          .get();
      return snapshot.docs.map((doc) => {...doc.data(), 'id': doc.id}).toList();
    } catch (e) {
      Logger.error('En çok satılan ürünler alınırken hata: $e');
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getProductsByIds(List<String> productIds) async {
    try {
      if (productIds.isEmpty) {
        return [];
      }

      List<Map<String, dynamic>> allProducts = [];

      // Firestore'un whereIn sorgusu en fazla 10 öğe ile çalışır
      for (int i = 0; i < productIds.length; i += 10) {
        final end = (i + 10 < productIds.length) ? i + 10 : productIds.length;
        final batchIds = productIds.sublist(i, end);

        final snapshot = await _firestore
            .collection(_collection)
            .where(FieldPath.documentId, whereIn: batchIds)
            .get();

        final batchProducts = snapshot.docs
            .map((doc) => {
                  ...doc.data(),
                  'id': doc.id,
                })
            .toList();

        allProducts.addAll(batchProducts);
      }

      return allProducts;
    } catch (e) {
      Logger.error('Ürünleri ID\'ye göre getirirken hata: $e');
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getFavoriteProducts(String userId) async {
    try {
      // Kullanıcının favori ürün ID'lerini al
      final userDoc = await _firestore.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return [];
      }

      final favorites = userDoc.data()?['favorites'] as List<dynamic>? ?? [];
      final favoriteIds = favorites.cast<String>();

      // Favori ürünleri getir
      return await getProductsByIds(favoriteIds);
    } catch (e) {
      Logger.error('Favori ürünleri getirirken hata: $e');
      return [];
    }
  }

  @override
  Future<bool> incrementSales(String productId, int quantity) async {
    try {
      final docRef = _firestore.collection(_collection).doc(productId);
      final doc = await docRef.get();

      if (!doc.exists) {
        return false;
      }

      final currentSales = doc.data()?['sales'] ?? 0;
      await docRef.update({
        'sales': currentSales + quantity,
        'updatedAt': Timestamp.now(),
      });

      return true;
    } catch (e) {
      Logger.error('Satış sayısı güncellenirken hata: $e');
      return false;
    }
  }
}
