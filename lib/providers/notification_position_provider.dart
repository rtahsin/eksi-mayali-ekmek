import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/notification_icon.dart';

/// Bildirim simgesinin konumunu saklayan ve değiştiren provider
class NotificationPositionProvider extends ChangeNotifier {
  NotificationIconPosition _position = NotificationIconPosition.end;
  final SharedPreferences _prefs;

  /// Bildirim simgesinin mevcut konumu
  NotificationIconPosition get position => _position;

  /// Constructor - SharedPreferences örneğini alır
  NotificationPositionProvider(this._prefs) {
    _loadPosition();
  }

  /// Kaydedilmiş bildirim konumunu yükler
  Future<void> _loadPosition() async {
    final positionString = _prefs.getString('notification_position') ?? 'end';
    setPosition(_parsePosition(positionString));
  }

  /// String'i NotificationIconPosition'a dönüştürür
  NotificationIconPosition _parsePosition(String position) {
    switch (position) {
      case 'start':
        return NotificationIconPosition.start;
      case 'custom':
        return NotificationIconPosition.custom;
      case 'end':
      default:
        return NotificationIconPosition.end;
    }
  }

  /// String'e NotificationIconPosition'ı dönüştürür
  String _positionToString(NotificationIconPosition position) {
    switch (position) {
      case NotificationIconPosition.start:
        return 'start';
      case NotificationIconPosition.custom:
        return 'custom';
      case NotificationIconPosition.end:
      default:
        return 'end';
    }
  }

  /// Bildirim konumunu değiştirir ve kaydeder
  Future<void> setPosition(NotificationIconPosition position) async {
    _position = position;
    await _prefs.setString(
        'notification_position', _positionToString(position));
    notifyListeners();
  }
}
