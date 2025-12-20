import '../../models/payment_method.dart';
import '../../models/payment_transaction.dart';

abstract class IPaymentRepository {
  // Ödeme yöntemleri
  Future<List<PaymentMethod>> getUserPaymentMethods(String userId);
  Future<PaymentMethod?> getPaymentMethod(String id);
  Future<PaymentMethod> addPaymentMethod(PaymentMethod method);
  Future<bool> updatePaymentMethod(PaymentMethod method);
  Future<bool> deletePaymentMethod(String id);
  Future<bool> setDefaultPaymentMethod(String userId, String methodId);

  // Ödeme işlemleri
  Future<PaymentTransaction> createTransaction(PaymentTransaction transaction);
  Future<PaymentTransaction?> getTransaction(String id);
  Future<List<PaymentTransaction>> getUserTransactions(String userId);
  Future<bool> updateTransactionStatus(String id, String status,
      {String? errorMessage});
  Future<bool> refundTransaction(String id, {double? amount, String? reason});

  // İstatistikler
  Future<Map<String, dynamic>> getUserPaymentStats(String userId);
  Future<double> getUserTotalSpent(String userId);
}
