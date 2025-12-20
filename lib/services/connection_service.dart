import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../utils/logger.dart';

/// Bağlantı durumlarını temsil eden enum
enum ConnectionStatus {
  online,
  offline,
  unknown,
}

/// İnternet bağlantısı durumunu yönetmek için servis
class ConnectionService with ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  ConnectionStatus _status = ConnectionStatus.unknown;
  bool _isFirstCheck = true;
  Timer? _pingTimer;

  ConnectionStatus get status => _status;
  bool get isOnline => _status == ConnectionStatus.online;
  bool get isOffline => _status == ConnectionStatus.offline;

  /// Singleton pattern
  static final ConnectionService _instance = ConnectionService._internal();

  factory ConnectionService() {
    return _instance;
  }

  ConnectionService._internal() {
    // Servis başlatıldığında bağlantı durumunu kontrol et
    _initConnectivity();

    // Bağlantı değişikliklerini dinle
    _connectivitySubscription =
        _connectivity.onConnectivityChanged.listen(_updateConnectionStatus);

    // Periyodik olarak bağlantıyı kontrol et
    _startPeriodicPing();
  }

  void _startPeriodicPing() {
    // 30 saniyede bir internet bağlantısını kontrol et
    _pingTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      checkConnection();
    });
  }

  /// İlk bağlantı durumunu kontrol et
  Future<void> _initConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      _updateConnectionStatus(result);
    } catch (e) {
      Logger.error('Bağlantı durumu kontrol edilirken hata: $e');
      _status = ConnectionStatus.unknown;
      notifyListeners();
    }
  }

  /// Bağlantı durumunu güncelle
  Future<void> _updateConnectionStatus(ConnectivityResult result) async {
    if (result == ConnectivityResult.none) {
      _status = ConnectionStatus.offline;
      Logger.warning('Bağlantı durumu: Çevrimdışı');
    } else {
      // Gerçek internet bağlantısını kontrol et
      final hasInternet = await _checkInternet();
      _status =
          hasInternet ? ConnectionStatus.online : ConnectionStatus.offline;

      if (hasInternet) {
        Logger.info('Bağlantı durumu: Çevrimiçi');
      } else {
        Logger.warning('Bağlantı durumu: Ağa bağlı ancak internet erişimi yok');
      }
    }

    // İlk kontrol değilse bildirimi tetikle
    if (!_isFirstCheck) {
      notifyListeners();
    }
    _isFirstCheck = false;
  }

  /// Gerçek internet bağlantısını kontrol et
  Future<bool> _checkInternet() async {
    try {
      // Web platformu kontrolü
      if (kIsWeb) {
        // Web için doğrudan Firestore'a erişim deneyin
        return true;
      }

      // Mobil platformlar için LookupAddress (ping) testi
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (e) {
      Logger.error('İnternet bağlantısı kontrol edilirken hata: $e');
      return false;
    }
  }

  /// Bağlantı durumunu manuel olarak kontrol et
  Future<bool> checkConnection() async {
    try {
      final connectivityResult = await _connectivity.checkConnectivity();

      if (connectivityResult == ConnectivityResult.none) {
        _status = ConnectionStatus.offline;
        notifyListeners();
        return false;
      }

      final hasInternet = await _checkInternet();
      _status =
          hasInternet ? ConnectionStatus.online : ConnectionStatus.offline;
      notifyListeners();
      return hasInternet;
    } catch (e) {
      Logger.error('Bağlantı kontrolü sırasında hata: $e');
      _status = ConnectionStatus.unknown;
      notifyListeners();
      return false;
    }
  }

  /// Servis için kaynakları temizle
  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    _pingTimer?.cancel();
    super.dispose();
  }

  /// Bağlantı hatası dialog'unu göster
  static Future<void> showConnectionError(
    BuildContext context, {
    String? title,
    String? message,
    String? buttonText,
    VoidCallback? onRetry,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title ?? 'Bağlantı Hatası'),
        content: Text(
            message ?? 'İnternet bağlantınızı kontrol edip tekrar deneyiniz.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              if (onRetry != null) {
                onRetry();
              }
            },
            child: Text(buttonText ?? 'Tekrar Dene'),
          ),
        ],
      ),
    );
  }
}
