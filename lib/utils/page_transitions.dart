import 'package:flutter/material.dart';

/// Özel sayfa geçiş animasyonları sınıfı
///
/// Bu sınıf, sayfa geçişleri için farklı animasyon seçenekleri sunar.
class PageTransitions {
  /// Standart sayfa geçişi (sağdan sola)
  static PageRouteBuilder<T> slideRight<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        var begin = const Offset(1.0, 0.0);
        var end = Offset.zero;
        var curve = Curves.ease;
        var tween =
            Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
    );
  }

  /// Alt sayfaya geçiş (aşağıdan yukarıya)
  static PageRouteBuilder<T> slideUp<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        var begin = const Offset(0.0, 1.0);
        var end = Offset.zero;
        var curve = Curves.ease;
        var tween =
            Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
    );
  }

  /// Soldan sağa geçiş (geri dönüş için)
  static PageRouteBuilder<T> slideLeft<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        var begin = const Offset(-1.0, 0.0);
        var end = Offset.zero;
        var curve = Curves.ease;
        var tween =
            Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
    );
  }

  /// Yukarıdan aşağıya geçiş (detaydan listeye dönüş için)
  static PageRouteBuilder<T> slideDown<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        var begin = const Offset(0.0, -1.0);
        var end = Offset.zero;
        var curve = Curves.ease;
        var tween =
            Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        return SlideTransition(
          position: animation.drive(tween),
          child: child,
        );
      },
    );
  }

  /// Fade geçişi (solma efekti ile)
  static PageRouteBuilder<T> fade<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  /// Scale geçişi (büyüme efekti ile)
  static PageRouteBuilder<T> scale<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 300)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return ScaleTransition(
          scale: Tween<double>(begin: 0.0, end: 1.0).animate(
            CurvedAnimation(
              parent: animation,
              curve: Curves.fastOutSlowIn,
            ),
          ),
          child: child,
        );
      },
    );
  }

  /// Rotate geçişi (dönme efekti ile)
  static PageRouteBuilder<T> rotate<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 500)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return RotationTransition(
          turns: Tween<double>(begin: 0.0, end: 1.0).animate(
            CurvedAnimation(
              parent: animation,
              curve: Curves.fastOutSlowIn,
            ),
          ),
          child: FadeTransition(
            opacity: animation,
            child: child,
          ),
        );
      },
    );
  }

  /// Fade ve Scale kombinasyonu (nazik bir giriş)
  static PageRouteBuilder<T> fadeScale<T>(Widget page,
      [Duration duration = const Duration(milliseconds: 400)]) {
    return PageRouteBuilder<T>(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionDuration: duration,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.95, end: 1.0).animate(
              CurvedAnimation(
                parent: animation,
                curve: Curves.fastOutSlowIn,
              ),
            ),
            child: child,
          ),
        );
      },
    );
  }
}
