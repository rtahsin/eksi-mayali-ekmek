import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Uygulama içinde kullanılacak animasyonlar için yardımcı sınıf.
/// Bu sınıf, yeni bir bileşen eklerken veya bileşenleri güncellerken kullanılabilecek
/// hazır animasyon çözümleri sunar.
class AppAnimations {
  /// Soldan sağa kaydırarak giriş animasyonu
  static List<Effect<dynamic>> get slideInLeft => [
        FadeEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: const Offset(-0.2, 0),
          end: const Offset(0, 0),
        ),
      ];

  /// Sağdan sola kaydırarak giriş animasyonu
  static List<Effect<dynamic>> get slideInRight => [
        FadeEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: const Offset(0.2, 0),
          end: const Offset(0, 0),
        ),
      ];

  /// Yukarıdan aşağıya kaydırarak giriş animasyonu
  static List<Effect<dynamic>> get slideInDown => [
        FadeEffect(
          duration: const Duration(milliseconds: a400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: const Offset(0, -0.2),
          end: const Offset(0, 0),
        ),
      ];

  /// Aşağıdan yukarıya kaydırarak giriş animasyonu
  static List<Effect<dynamic>> get slideInUp => [
        FadeEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: const Offset(0, 0.2),
          end: const Offset(0, 0),
        ),
      ];

  /// Büyüyerek giriş animasyonu
  static List<Effect<dynamic>> get scaleIn => [
        FadeEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        ScaleEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: const Offset(0.9, 0.9),
          end: const Offset(1.0, 1.0),
        ),
      ];

  /// Solma animasyonu
  static List<Effect<dynamic>> get fadeIn => [
        FadeEffect(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
      ];

  /// Ürün kartları için özel animasyon
  static List<Effect<dynamic>> get productCard => [
        FadeEffect(
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        ScaleEffect(
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOutCubic,
          begin: const Offset(0.95, 0.95),
          end: const Offset(1.0, 1.0),
        ),
      ];

  /// Liste öğeleri için kaydırma animasyonu (staggered)
  static List<Effect<dynamic>> staggeredListItem(int index) => [
        FadeEffect(
          duration: const Duration(milliseconds: 300),
          delay: Duration(milliseconds: 50 * index),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 300),
          delay: Duration(milliseconds: 50 * index),
          curve: Curves.easeOutCubic,
          begin: const Offset(0.1, 0),
          end: const Offset(0, 0),
        ),
      ];

  /// Sepet sayfasında ürün öğeleri için animasyon
  static List<Effect<dynamic>> cartItem(int index) => [
        FadeEffect(
          duration: const Duration(milliseconds: 300),
          delay: Duration(milliseconds: 60 * index),
          curve: Curves.easeOutCubic,
          begin: 0.0,
          end: 1.0,
        ),
        SlideEffect(
          duration: const Duration(milliseconds: 300),
          delay: Duration(milliseconds: 60 * index),
          curve: Curves.easeOutCubic,
          begin: const Offset(0, 0.1),
          end: const Offset(0, 0),
        ),
      ];

  /// Düğme tıklama animasyonu
  static List<Effect<dynamic>> get buttonTap => [
        ScaleEffect(
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeInOut,
          begin: const Offset(1.0, 1.0),
          end: const Offset(0.95, 0.95),
        ),
      ];

  /// Hover efekti animasyonu
  static List<Effect<dynamic>> get hover => [
        ScaleEffect(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          begin: const Offset(1.0, 1.0),
          end: const Offset(1.03, 1.03),
        ),
      ];
}

/// Animasyon süreleri
const int a100 = 100;
const int a200 = 200;
const int a300 = 300;
const int a400 = 400;
const int a500 = 500;
const int a700 = 700;
const int a1000 = 1000;
