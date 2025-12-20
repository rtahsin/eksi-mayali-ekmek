import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

import '../domain/repositories/i_payment_repository.dart';
import '../models/payment_method.dart';
import '../models/payment_transaction.dart';
import '../utils/logger.dart';

class PaymentService with ChangeNotifier {
  final IPaymentRepository _repository;
  bool _isLoading = false;
  List<PaymentMethod> _userPaymentMethods = [];
  List<PaymentTransaction> _userTransactions = [];
  Map<String, dynamic> _paymentStats = {};

  PaymentService(this._repository);

  bool get isLoading => _isLoading;
  List<PaymentMethod> get userPaymentMethods => _userPaymentMethods;
  List<PaymentTransaction> get userTransactions => _userTransactions;
  Map<String, dynamic> get paymentStats => _paymentStats;

  // Ödeme yöntemlerini yükle
  Future<void> loadUserPaymentMethods(String userId) async {
    try {
      _isLoading = true;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      _userPaymentMethods = await _repository.getUserPaymentMethods(userId);

      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    } catch (e) {
      Logger.error('Ödeme yöntemleri yüklenirken hata: $e');
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      rethrow;
    }
  }

  // Ödeme yöntemi ekle
  Future<PaymentMethod> addPaymentMethod(PaymentMethod method) async {
    try {
      _isLoading = true;
      notifyListeners();

      final newMethod = await _repository.addPaymentMethod(method);
      _userPaymentMethods.add(newMethod);

      _isLoading = false;
      notifyListeners();
      return newMethod;
    } catch (e) {
      Logger.error('Ödeme yöntemi eklenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Ödeme yöntemi güncelle
  Future<bool> updatePaymentMethod(PaymentMethod method) async {
    try {
      _isLoading = true;
      notifyListeners();

      final success = await _repository.updatePaymentMethod(method);
      if (success) {
        final index = _userPaymentMethods.indexWhere((m) => m.id == method.id);
        if (index >= 0) {
          _userPaymentMethods[index] = method;
        }
      }

      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      Logger.error('Ödeme yöntemi güncellenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Ödeme yöntemi sil
  Future<bool> deletePaymentMethod(String id) async {
    try {
      _isLoading = true;
      notifyListeners();

      final success = await _repository.deletePaymentMethod(id);
      if (success) {
        _userPaymentMethods.removeWhere((m) => m.id == id);
      }

      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      Logger.error('Ödeme yöntemi silinirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Varsayılan ödeme yöntemini ayarla
  Future<bool> setDefaultPaymentMethod(String userId, String methodId) async {
    try {
      _isLoading = true;
      notifyListeners();

      final success = await _repository.setDefaultPaymentMethod(userId, methodId);
      if (success) {
        for (var method in _userPaymentMethods) {
          if (method.id == methodId) {
            final index = _userPaymentMethods.indexOf(method);
            _userPaymentMethods[index] = method.copyWith(isDefault: true);
          } else if (method.isDefault) {
            final index = _userPaymentMethods.indexOf(method);
            _userPaymentMethods[index] = method.copyWith(isDefault: false);
          }
        }
      }

      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      Logger.error('Varsayılan ödeme yöntemi ayarlanırken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Ödeme işlemi oluştur
  Future<PaymentTransaction> createTransaction(PaymentTransaction transaction) async {
    try {
      _isLoading = true;
      notifyListeners();

      final newTransaction = await _repository.createTransaction(transaction);
      _userTransactions.insert(0, newTransaction);

      _isLoading = false;
      notifyListeners();
      return newTransaction;
    } catch (e) {
      Logger.error('Ödeme işlemi oluşturulurken hata: $e');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Kullanıcının işlemlerini yükle
  Future<void> loadUserTransactions(String userId) async {
    try {
      _isLoading = true;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      _userTransactions = await _repository.getUserTransactions(userId);

      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    } catch (e) {
      Logger.error('Kullanıcı işlemleri yüklenirken hata: $e');
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      rethrow;
    }
  }

  // İşlem durumunu güncelle
  Future<bool> updateTransactionStatus(String id, String status, {String? errorMessage}) async {
    try {
      _isLoading = true;
      notifyListeners();

      final success =
          await _repository.updateTransactionStatus(id, status, errorMessage: errorMessage);
      if (success) {
        final index = _userTransactions.indexWhere((t) => t.id == id);
        if (index >= 0) {
          _userTransactions[index] = _userTransactions[index].copyWith(
            status: status,
            errorMessage: errorMessage,
          );
        }
      }

      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      Logger.error('İşlem durumu güncellenirken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // İade işlemi
  Future<bool> refundTransaction(String id, {double? amount, String? reason}) async {
    try {
      _isLoading = true;
      notifyListeners();

      final success = await _repository.refundTransaction(id, amount: amount, reason: reason);
      if (success) {
        await loadUserTransactions(_userTransactions.first.userId);
      }

      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      Logger.error('İade işlemi yapılırken hata: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Ödeme istatistiklerini yükle
  Future<void> loadPaymentStats(String userId) async {
    try {
      _isLoading = true;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      _paymentStats = await _repository.getUserPaymentStats(userId);

      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    } catch (e) {
      Logger.error('Ödeme istatistikleri yüklenirken hata: $e');
      _isLoading = false;

      // Build aşamasında notifyListeners çağrılmasını önlemek için
      // SchedulerBinding kullanarak sonraki frame'e ertele
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });

      rethrow;
    }
  }
}
