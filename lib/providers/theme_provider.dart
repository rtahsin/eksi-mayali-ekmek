import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';
import '../utils/logger.dart';

class ThemeProvider extends ChangeNotifier {
  final SharedPreferences prefs;
  ThemeMode _themeMode = ThemeMode.system;
  Brightness? _systemBrightness;

  ThemeProvider(this.prefs) {
    _loadTheme();
    _detectSystemTheme();
  }

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode {
    if (_themeMode == ThemeMode.system) {
      return _systemBrightness == Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  // Sistem temasını algıla
  void _detectSystemTheme() {
    try {
      // Mevcut sistem parlaklığını al
      final brightness = PlatformDispatcher.instance.platformBrightness;
      _systemBrightness = brightness;

      // Sistem teması değişikliklerini dinle
      PlatformDispatcher.instance.onPlatformBrightnessChanged = () {
        final newBrightness = PlatformDispatcher.instance.platformBrightness;
        if (_systemBrightness != newBrightness) {
          _systemBrightness = newBrightness;
          // Eğer sistem teması kullanılıyorsa, UI'ı güncelle
          if (_themeMode == ThemeMode.system) {
            notifyListeners();
          }
        }
      };
    } catch (e) {
      Logger.error('Sistem teması algılanırken hata: $e');
    }
  }

  // Kaydedilmiş temayı yükle
  void _loadTheme() {
    try {
      final savedTheme = prefs.getString(PreferenceKeys.theme);
      if (savedTheme != null) {
        _themeMode = _getThemeMode(savedTheme);
      }
    } catch (e) {
      Logger.error('Tema yüklenirken hata: $e');
    }
  }

  // Tema modunu ayarla
  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    _saveTheme();
    notifyListeners();
    Logger.info('Tema modu değiştirildi: ${_getThemeModeString(mode)}');
  }

  // Temayı değiştir (açık/koyu)
  void toggleTheme() {
    if (_themeMode == ThemeMode.light) {
      setThemeMode(ThemeMode.dark);
    } else if (_themeMode == ThemeMode.dark) {
      setThemeMode(ThemeMode.light);
    } else {
      // Sistem teması kullanılıyorsa, mevcut sistem temasının tersini ayarla
      setThemeMode(_systemBrightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark);
    }
  }

  // Temayı kaydet
  void _saveTheme() {
    try {
      prefs.setString(PreferenceKeys.theme, _getThemeModeString(_themeMode));
    } catch (e) {
      Logger.error('Tema kaydedilirken hata: $e');
    }
  }

  // String'den ThemeMode'a dönüştür
  ThemeMode _getThemeMode(String value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  // ThemeMode'dan String'e dönüştür
  String _getThemeModeString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      default:
        return 'system';
    }
  }
}
