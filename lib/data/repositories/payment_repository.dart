import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/repositories/i_payment_repository.dart';
import '../../models/payment_method.dart';
import '../../models/payment_transaction.dart';
import '../../utils/logger.dart';

class PaymentRepository implements IPaymentRepository {
  final FirebaseFirestore _firestore;
  final String _methodsCollection = 'payment_methods';
  final String _transactionsCollection = 'payment_transactions';

  PaymentRepository(this._firestore);

  @override
  Future<List<PaymentMethod>> getUserPaymentMethods(String userId) async {
    try {
      final snapshot =
          await _firestore.collection(_methodsCollection).where('userId', isEqualTo: userId).get();

      return snapshot.docs
          .map((doc) => PaymentMethod.fromJson({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      Logger.error('Ödeme yöntemleri alınırken hata: $e');
      return [];
    }
  }

  @override
  Future<PaymentMethod?> getPaymentMethod(String id) async {
    try {
      final doc = await _firestore.collection(_methodsCollection).doc(id).get();
      if (!doc.exists) return null;

      return PaymentMethod.fromJson({...doc.data()!, 'id': doc.id});
    } catch (e) {
      Logger.error('Ödeme yöntemi alınırken hata: $e');
      return null;
    }
  }

  @override
  Future<PaymentMethod> addPaymentMethod(PaymentMethod method) async {
    try {
      final docRef = await _firestore.collection(_methodsCollection).add(method.toJson());
      return method.copyWith(id: docRef.id);
    } catch (e) {
      Logger.error('Ödeme yöntemi eklenirken hata: $e');
      rethrow;
    }
  }

  @override
  Future<bool> updatePaymentMethod(PaymentMethod method) async {
    try {
      await _firestore.collection(_methodsCollection).doc(method.id).update(method.toJson());
      return true;
    } catch (e) {
      Logger.error('Ödeme yöntemi güncellenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> deletePaymentMethod(String id) async {
    try {
      await _firestore.collection(_methodsCollection).doc(id).delete();
      return true;
    } catch (e) {
      Logger.error('Ödeme yöntemi silinirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> setDefaultPaymentMethod(String userId, String methodId) async {
    try {
      final batch = _firestore.batch();

      // Eski varsayılan yöntemi güncelle
      final oldDefaultMethods = await _firestore
          .collection(_methodsCollection)
          .where('userId', isEqualTo: userId)
          .where('isDefault', isEqualTo: true)
          .get();

      for (var doc in oldDefaultMethods.docs) {
        batch.update(doc.reference, {'isDefault': false});
      }

      // Yeni varsayılan yöntemi ayarla
      batch.update(
        _firestore.collection(_methodsCollection).doc(methodId),
        {'isDefault': true},
      );

      await batch.commit();
      return true;
    } catch (e) {
      Logger.error('Varsayılan ödeme yöntemi ayarlanırken hata: $e');
      return false;
    }
  }

  @override
  Future<PaymentTransaction> createTransaction(PaymentTransaction transaction) async {
    try {
      final docRef = await _firestore.collection(_transactionsCollection).add(transaction.toJson());
      return transaction.copyWith(id: docRef.id);
    } catch (e) {
      Logger.error('Ödeme işlemi oluşturulurken hata: $e');
      rethrow;
    }
  }

  @override
  Future<PaymentTransaction?> getTransaction(String id) async {
    try {
      final doc = await _firestore.collection(_transactionsCollection).doc(id).get();
      if (!doc.exists) return null;

      return PaymentTransaction.fromJson({...doc.data()!, 'id': doc.id});
    } catch (e) {
      Logger.error('Ödeme işlemi alınırken hata: $e');
      return null;
    }
  }

  @override
  Future<List<PaymentTransaction>> getUserTransactions(String userId) async {
    try {
      final snapshot = await _firestore
          .collection(_transactionsCollection)
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => PaymentTransaction.fromJson({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      Logger.error('Kullanıcı ödeme işlemleri alınırken hata: $e');
      return [];
    }
  }

  @override
  Future<bool> updateTransactionStatus(String id, String status, {String? errorMessage}) async {
    try {
      await _firestore.collection(_transactionsCollection).doc(id).update({
        'status': status,
        if (errorMessage != null) 'errorMessage': errorMessage,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      Logger.error('Ödeme işlemi durumu güncellenirken hata: $e');
      return false;
    }
  }

  @override
  Future<bool> refundTransaction(String id, {double? amount, String? reason}) async {
    try {
      final transaction = await getTransaction(id);
      if (transaction == null) return false;

      final refundAmount = amount ?? transaction.amount;
      final metadata = {
        ...transaction.metadata,
        'refundReason': reason,
        'refundAmount': refundAmount,
        'originalTransactionId': id,
      };

      // Yeni iade işlemi oluştur
      final refund = PaymentTransaction(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        orderId: transaction.orderId,
        userId: transaction.userId,
        paymentMethodId: transaction.paymentMethodId,
        amount: -refundAmount,
        status: 'refunded',
        metadata: metadata,
      );

      await createTransaction(refund);

      // Orijinal işlemi güncelle
      await _firestore.collection(_transactionsCollection).doc(id).update({
        'status': 'refunded',
        'metadata': metadata,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      return true;
    } catch (e) {
      Logger.error('Ödeme iadesi yapılırken hata: $e');
      return false;
    }
  }

  @override
  Future<Map<String, dynamic>> getUserPaymentStats(String userId) async {
    try {
      final snapshot = await _firestore
          .collection(_transactionsCollection)
          .where('userId', isEqualTo: userId)
          .get();

      double totalSpent = 0;
      double totalRefunded = 0;
      int successfulTransactions = 0;
      int failedTransactions = 0;

      for (var doc in snapshot.docs) {
        final transaction = PaymentTransaction.fromJson({...doc.data(), 'id': doc.id});

        if (transaction.status == 'success') {
          totalSpent += transaction.amount;
          successfulTransactions++;
        } else if (transaction.status == 'refunded') {
          totalRefunded += transaction.amount.abs();
        } else if (transaction.status == 'failed') {
          failedTransactions++;
        }
      }

      return {
        'totalSpent': totalSpent,
        'totalRefunded': totalRefunded,
        'successfulTransactions': successfulTransactions,
        'failedTransactions': failedTransactions,
        'netSpent': totalSpent - totalRefunded,
      };
    } catch (e) {
      Logger.error('Kullanıcı ödeme istatistikleri alınırken hata: $e');
      return {
        'totalSpent': 0.0,
        'totalRefunded': 0.0,
        'successfulTransactions': 0,
        'failedTransactions': 0,
        'netSpent': 0.0,
      };
    }
  }

  @override
  Future<double> getUserTotalSpent(String userId) async {
    try {
      final stats = await getUserPaymentStats(userId);
      return stats['netSpent'] as double;
    } catch (e) {
      Logger.error('Kullanıcı toplam harcaması alınırken hata: $e');
      return 0.0;
    }
  }
}
