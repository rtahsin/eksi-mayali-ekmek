/// Uygulama rotalarını yöneten merkezi yapı
///
/// Bu dosya, uygulamanın gezinme yapısını tanımlar.
/// Tüm sayfalar için rotalar burada merkezi olarak yönetilir.
/// main.dart dosyasındaki MaterialApp widget'ına bu rotalar verilir.

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EKŞİ MAYALI EKMEK - ROUTES.DART                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya, uygulamanın sayfa yönlendirme (routing) yapısını içerir.          │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. Import ifadeleri                                                         │
│ 2. Routes sınıfı - Rotaları tanımlayan statik sınıf                         │
│    - getRoutes(): Tüm rotaları içeren Map'i döndürür                        │
│                                                                             │
│ ROTA GRUPLARI:                                                              │
│ 1. Kullanıcı arayüzü rotaları (ana sayfa, ürün listesi, profil vb.)         │
│ 2. Kimlik doğrulama rotaları (giriş, kayıt, şifre sıfırlama)                │
│ 3. Alışveriş rotaları (sepet, ödeme, sipariş takibi)                        │
│ 4. İçerik rotaları (blog, hakkımızda, gizlilik politikası)                  │
│ 5. Admin paneli rotaları (Admin tarafında yönetim ekranları)                │
└─────────────────────────────────────────────────────────────────────────────┘
*/

import 'package:flutter/material.dart';

// DEFERRED IMPORTS - Lazy loading
import 'admin/admin_router.dart' deferred as admin_router;
import 'admin/auth/admin_login.dart' deferred as admin_login;
import 'models/blog_post.dart';
import 'screens/about_screen.dart';
import 'screens/address_management_screen.dart' deferred as address_management;
import 'screens/ai_assistant_screen.dart' deferred as ai_assistant;
import 'screens/analytics_screen.dart' deferred as analytics;
import 'screens/blog_detail_screen.dart';
import 'screens/blog_list_screen.dart' deferred as blog_list;
import 'screens/cart_screen.dart';
import 'screens/delivery_tracking_screen.dart' deferred as delivery_tracking;
import 'screens/email_verification_screen.dart';
import 'screens/favorites_screen.dart' deferred as favorites;
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/live_chat_screen.dart';
import 'screens/live_stream_screen.dart' deferred as live_stream;
import 'screens/login_screen.dart';
import 'screens/notification_screen.dart';
import 'screens/order_confirmation_screen.dart';
import 'screens/order_history_screen.dart' deferred as order_history;
import 'screens/preferences_screen.dart' deferred as preferences;
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'screens/simple_checkout_screen.dart';
import 'utils/page_transitions.dart';

/// Uygulama rotalarını içeren sınıf
///
/// Bu sınıf, tüm uygulamada kullanılan sayfaların rotalarını
/// merkezi bir noktada toplar. Böylece rota yönetimi daha kolay olur.
///
/// Kullanımı:
/// ```dart
/// // Rota tanımı
/// Routes.getRoutes()['/profile'] -> ProfileScreen()
///
/// // Sayfa geçişi
/// Navigator.pushNamed(context, '/profile');
/// ```
class Routes {
  /// Tüm rotaları içeren Map'i döndürür
  ///
  /// Bu metod, MaterialApp widget'ına verilecek routes Map'ini oluşturur.
  /// Böylece Navigator.pushNamed() ile kolayca sayfalara geçiş yapılabilir.
  ///
  /// Gruplar:
  /// 1. Kullanıcı arayüzü rotaları (/, /about, /profile vb.)
  /// 2. Kimlik doğrulama rotaları (/login, /register vb.)
  /// 3. Alışveriş rotaları (/cart, /checkout vb.)
  /// 4. İçerik rotaları (/blog, /privacy-policy vb.)
  static Map<String, WidgetBuilder> getRoutes() {
    return {
      // Kullanıcı arayüzü rotaları
      '/': (context) => const HomeScreen(),
      '/about': (context) => const AboutScreen(),
      '/cart': (context) => const CartScreen(),
      '/checkout': (context) => const SimpleCheckoutScreen(), // Basitleştirilmiş sipariş ekranı
      '/orders': (context) => _loadDeferred(() async {
            await order_history.loadLibrary();
            return order_history.OrderHistoryScreen();
          }),
      '/profile': (context) => const ProfileScreen(),
      '/login': (context) => const LoginScreen(),
      '/register': (context) => const RegisterScreen(),
      '/forgot-password': (context) => const ForgotPasswordScreen(),
      EmailVerificationScreen.routeName: (context) {
        final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>?;
        final email = args?['email'] as String? ?? '';
        return EmailVerificationScreen(email: email);
      },
      '/blog': (context) => _loadDeferred(() async {
            await blog_list.loadLibrary();
            return blog_list.BlogListScreen();
          }),
      '/blog-detail': (context) => BlogDetailScreen(
            post: ModalRoute.of(context)!.settings.arguments as BlogPost,
          ),
      '/live-stream': (context) => _loadDeferred(() async {
            await live_stream.loadLibrary();
            return live_stream.LiveStreamScreen();
          }),
      '/analytics': (context) => _loadDeferred(() async {
            await analytics.loadLibrary();
            return analytics.AnalyticsScreen();
          }),
      '/delivery-tracking': (context) => _loadDeferred(() async {
            await delivery_tracking.loadLibrary();
            return delivery_tracking.DeliveryTrackingScreen();
          }),
      '/address-management': (context) => _loadDeferred(() async {
            await address_management.loadLibrary();
            return address_management.AddressManagementScreen();
          }),
      '/preferences': (context) => _loadDeferred(() async {
            await preferences.loadLibrary();
            return preferences.PreferencesScreen();
          }),
      '/order-history': (context) => _loadDeferred(() async {
            await order_history.loadLibrary();
            return order_history.OrderHistoryScreen();
          }),
      '/order-confirmation': (context) {
        final orderId = ModalRoute.of(context)!.settings.arguments as String;
        return OrderConfirmationScreen(orderId: orderId);
      },
      '/ai-assistant': (context) => _loadDeferred(() async {
            await ai_assistant.loadLibrary();
            return ai_assistant.AIAssistantScreen();
          }),
      '/favorites': (context) => _loadDeferred(() async {
            await favorites.loadLibrary();
            return favorites.FavoritesScreen();
          }),
      '/notifications': (context) => const NotificationScreen(),
      '/live-chat': (context) => const LiveChatScreen(),

      // Admin panel rotaları - Lazy loading
      '/admin': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/login': (context) => _loadDeferred(() async {
            await admin_login.loadLibrary();
            return admin_login.AdminLoginPage();
          }),
      '/admin/dashboard': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/products': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/categories': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/orders': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/blogs': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/chatbot': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/productions': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/stocks': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/sales': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/expenses': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/financial-report': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/customers': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/users': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/settings': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/backgrounds': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
      '/admin/audit': (context) => _loadDeferred(() async {
            await admin_router.loadLibrary();
            return admin_router.AdminRouter();
          }),
    };
  }

  /// Deferred loading helper - Lazy loading için widget yükleyici
  static Widget _loadDeferred(Future<Widget> Function() loader) {
    return FutureBuilder<Widget>(
      future: loader(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done) {
          if (snapshot.hasError) {
            return Center(
              child: Text('Yükleme hatası: ${snapshot.error}'),
            );
          }
          return snapshot.data!;
        }
        // Loading indicator
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        );
      },
    );
  }

  /// Animasyonlu sayfa geçişleri için yardımcı metodlar

  /// Soldan sağa kaydırma ile geçiş
  static Route<dynamic> slideLeftTransition(Widget page) {
    return PageTransitions.slideLeft(page);
  }

  /// Sağdan sola kaydırma ile geçiş
  static Route<dynamic> slideRightTransition(Widget page) {
    return PageTransitions.slideRight(page);
  }

  /// Yukarıdan aşağıya kaydırma ile geçiş
  static Route<dynamic> slideDownTransition(Widget page) {
    return PageTransitions.slideDown(page);
  }

  /// Aşağıdan yukarıya kaydırma ile geçiş
  static Route<dynamic> slideUpTransition(Widget page) {
    return PageTransitions.slideUp(page);
  }

  /// Solma efekti ile geçiş
  static Route<dynamic> fadeTransition(Widget page) {
    return PageTransitions.fade(page);
  }

  /// Büyüme efekti ile geçiş
  static Route<dynamic> scaleTransition(Widget page) {
    return PageTransitions.scale(page);
  }

  /// Solma ve büyüme efekti ile geçiş
  static Route<dynamic> fadeScaleTransition(Widget page) {
    return PageTransitions.fadeScale(page);
  }

  /// Dönme efekti ile geçiş
  static Route<dynamic> rotateTransition(Widget page) {
    return PageTransitions.rotate(page);
  }
}
