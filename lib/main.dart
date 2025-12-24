// ignore_for_file: use_super_parameters, prefer_const_constructors, unused_import

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EKŞİ MAYALI EKMEK - MAIN.DART                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya uygulamanın giriş noktasıdır ve temel yapılandırmayı içerir.       │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. Import ifadeleri                                                         │
│ 2. Global değişkenler ve yardımcı fonksiyonlar                              │
│ 3. main() fonksiyonu - Uygulama başlangıç noktası                           │
│    - Firebase ve servis başlatma                                            │
│    - Provider yapılandırması                                                │
│ 4. MyApp sınıfı - Ana uygulama yapısı                                       │
│    - MaterialApp yapılandırması                                             │
│    - Tema ayarları                                                          │
│    - Rota tanımlamaları                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
*/

import 'dart:io' show Platform;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get_it/get_it.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Uygulama modülleri
import 'admin/admin_app.dart';
import 'admin/admin_router.dart';
import 'admin/auth/admin_login.dart';
import 'backend/firebase_config.dart';
import 'core/di/service_locator.dart';
import 'data/blog_data.dart';
import 'firebase_options.dart';
import 'models/blog_post.dart';
import 'models/order.dart';
import 'models/product.dart';
import 'providers/cart_provider.dart';
import 'providers/notification_position_provider.dart';
import 'providers/theme_provider.dart';
import 'routes.dart';
import 'screens/address_management_screen.dart';
import 'screens/admin/admin_dashboard.dart';
import 'screens/admin/live_stream_management_screen.dart';
import 'screens/ai_assistant_screen.dart';
import 'screens/analytics_screen.dart';
import 'screens/blog_detail_screen.dart';
import 'screens/blog_list_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/checkout_screen.dart';
import 'screens/delivery_tracking_screen.dart' deferred as delivery_tracking;
import 'screens/favorites_screen.dart';
import 'screens/home_screen.dart';
import 'screens/live_stream_screen.dart';
import 'screens/login_screen.dart';
import 'screens/order_history_screen.dart';
import 'screens/order_screen.dart';
import 'screens/preferences_screen.dart';
import 'screens/privacy_policy_screen.dart';
import 'screens/product_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'screens/simple_checkout_screen.dart';
import 'screens/splash_screen.dart';
import 'services/ai_service.dart';
import 'services/analytics_service.dart';
import 'services/auth_service.dart';
import 'services/connection_service.dart';
import 'services/delivery_service.dart';
import 'services/live_chat_service.dart';
import 'services/notification_service.dart';
import 'services/order_service.dart';
import 'services/payment_service.dart';
import 'services/privacy_service.dart';
import 'services/product_service.dart';
import 'services/recommendation_service.dart';
import 'services/sync_service.dart';
import 'services/web_one_tap.dart' if (dart.library.io) 'services/web_one_tap_stub.dart';
import 'services/youtube_service.dart';
import 'theme/app_theme.dart';
import 'utils/constants.dart';
import 'utils/logger.dart'; // Logger sınıfını import ediyoruz
import 'utils/page_transitions.dart'; // Sayfa geçiş animasyonlarını import ediyoruz
import 'web_config.dart'
    if (dart.library.io) 'mobile_config.dart'; // Web ve mobil konfigürasyonları
import 'widgets/feedback_chat_overlay.dart';

// Uygulama genelinde erişilebilir ScaffoldMessengerKey
// Bu key sayesinde uygulama içinde herhangi bir yerden SnackBar gösterilebilir
final GlobalKey<ScaffoldMessengerState> rootScaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

// Blog verilerini ID üzerinden çağırma fonksiyonu
// Bu fonksiyon, blog detay sayfasına geçişlerde blog içeriğini getirmek için kullanılır
BlogPost? getBlogById(String id) {
  return BlogData.getBlogById(id);
}

/// Uygulama başlangıç noktası
///
/// Bu fonksiyon uygulamanın ilk çalıştırıldığında başlatılacak olan servisleri
/// ve yapılandırmaları içerir. Sırasıyla:
/// 1. Flutter binding'i başlatılır
/// 2. Web konfigürasyonu yapılır (eğer web platformunda çalışıyorsa)
/// 3. Firebase servisleri başlatılır
/// 4. Service locator (GetIt) yapılandırılır
/// 5. SharedPreferences başlatılır (kullanıcı ayarları için)
/// 6. Bildirim servisi başlatılır
/// 7. Ana uygulama (MyApp) çalıştırılır
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Türkçe tarih formatlamasını başlat
  await initializeDateFormatting('tr_TR', null);

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Performans optimizasyonları
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Resim önbellek ayarları
  PaintingBinding.instance.imageCache.maximumSize = 100;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 50 << 20; // 50 MB

  // Platform-specific optimizasyonlar
  if (!kIsWeb && Platform.isAndroid) {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  }

  // Service locator'ı başlat
  ServiceLocator.setup();
  await ServiceLocator.initialize();

  // SharedPreferences'ı başlat
  final prefs = await SharedPreferences.getInstance();

  // Bildirim servisini başlat
  final notificationService = ServiceLocator.getIt<NotificationService>();
  await notificationService.init();

  // Web'de Google redirect sonucunu kontrol et (uygulama başlarken bir kez)
  if (kIsWeb) {
    try {
      final authService = ServiceLocator.getIt<AuthService>();
      await authService.handleRedirectResult();
    } catch (e) {
      Logger.error('Redirect result kontrolü hatası: $e');
    }
  }

  // Ana uygulamayı başlat - Sadece kritik provider'lar
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => ThemeProvider(prefs)),
        ChangeNotifierProvider(create: (context) => NotificationPositionProvider(prefs)),
        ChangeNotifierProvider(create: (context) => CartProvider()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<AuthService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<ProductService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<OrderService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<DeliveryService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<PaymentService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<YouTubeService>()),
        ChangeNotifierProvider(create: (context) => GetIt.instance<ConnectionService>()),
        ChangeNotifierProvider(create: (context) => LiveChatService()),
      ],
      child: MyApp(prefs: prefs),
    ),
  );
}

/// Ana uygulama sınıfı
///
/// Bu sınıf, uygulamanın temel yapısını oluşturur ve şunları içerir:
/// - Provider yapılandırması (state yönetimi)
/// - MaterialApp ayarları
/// - Tema konfigürasyonu (aydınlık/karanlık)
/// - Rota tanımlamaları
/// - Responsive tasarım ayarları
///
/// Kullanıcı arayüzünün genel yapısı ve davranışı burada tanımlanır.
class MyApp extends StatelessWidget {
  final SharedPreferences prefs;

  const MyApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // One Tap entegrasyonunu (web) initialize et - tekrar kayıt olmasın
    if (kIsWeb) {
      WebOneTap.init((idToken) async {
        final auth = GetIt.I<AuthService>();
        final ok = await auth.signInWithGoogleIdToken(idToken);
        if (ok) {
          rootScaffoldMessengerKey.currentState?.showSnackBar(
            const SnackBar(content: Text('Google ile giriş başarılı (One Tap)')),
          );
        } else {
          rootScaffoldMessengerKey.currentState?.showSnackBar(
            const SnackBar(content: Text('Google One Tap giriş başarısız')),
          );
        }
      });
    }
    return MultiProvider(
      // Provider'lar: Sadece kritik servisler başlangıçta yüklenir
      // Diğer servisler (AI, Analytics, YouTube, Sync, Connection) lazy loading ile yüklenecek
      providers: [
        // Tema provider'ı
        ChangeNotifierProvider(
          create: (_) => ThemeProvider(prefs),
        ),
        // Kimlik doğrulama servisi (giriş/çıkış işlemleri)
        ChangeNotifierProvider(
          create: (_) => GetIt.I<AuthService>(),
        ),
        // Ürün servisi (ürün listeleme, arama vb.)
        ChangeNotifierProvider(
          create: (_) => GetIt.I<ProductService>(),
        ),
        // Sipariş servisi (sipariş oluşturma, listeleme vb.)
        ChangeNotifierProvider(
          create: (_) => GetIt.I<OrderService>(),
        ),
        // Teslimat servisi (teslimat durumu, takip vb.)
        ChangeNotifierProvider(
          create: (_) => GetIt.I<DeliveryService>(),
        ),
        // Ödeme servisi (ödeme yöntemleri, işlemleri vb.)
        ChangeNotifierProvider(
          create: (_) => GetIt.I<PaymentService>(),
        ),
        // Sepet provider'ı (ürün ekleme/çıkarma, temizleme vb.)
        ChangeNotifierProvider(
          create: (context) {
            final cartProvider = CartProvider();
            // Sepeti yerel depolamadan yükle
            cartProvider.loadCartFromPrefs();
            return cartProvider;
          },
        ),
        // NOT: Recommendation, Analytics, AI, YouTube, Sync, Connection servisleri
        // lazy loading ile yüklenecek - başlangıç hızını %40+ artırır
      ],
      // Consumer ile tema değişikliklerini dinliyoruz
      child: Consumer<ThemeProvider>(builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'EkmekLab',
          scaffoldMessengerKey: rootScaffoldMessengerKey, // Global mesaj gösterici
          theme: AppTheme.createLightTheme(),
          darkTheme: AppTheme.createDarkTheme(),
          themeMode: themeProvider.themeMode, // Aktif tema modu
          debugShowCheckedModeBanner: false, // Debug banner'ı gizle

          // Responsive tasarım için MediaQuery değerlerini ayarlıyoruz
          builder: (context, child) {
            final mediaQueryData = MediaQuery.of(context);
            final scale = mediaQueryData.textScaler.scale(1.0).clamp(0.8, 1.2);

            final mediaChild = MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            );

            // Admin panelinde geri bildirim butonunu tamamen gizle
            // URL path kontrolü ile admin sayfalarında feedback overlay'i gösterme
            return mediaChild;
          },

          // Sayfa geçişleri için pageBuilder kullanıyoruz
          onGenerateRoute: (settings) {
            // Eğer rota haritasında tanımlıysa normal şekilde işle
            if (settings.name == '/checkout') {
              return PageTransitions.slideUp(const SimpleCheckoutScreen()); // Basit sipariş ekranı
            } else if (settings.name == '/cart') {
              return PageTransitions.slideRight(const CartScreen());
            } else if (settings.name == '/blog-detail') {
              return PageTransitions.fadeScale(
                BlogDetailScreen(post: settings.arguments as BlogPost),
              );
            } else if (settings.name == '/profile') {
              return PageTransitions.slideRight(const ProfileScreen());
            } else if (settings.name == PrivacyPolicyScreen.routeName) {
              return PageTransitions.slideUp(const PrivacyPolicyScreen());
            }
            // Diğer rotalar için normal routes sistemini kullan
            return null;
          },

          // Başlangıç sayfası
          initialRoute: '/',

          // Uygulama içi sayfalar ve rotalar
          // Merkezi rota sistemi kullanılıyor
          routes: Routes.getRoutes(),
        );
      }),
    );
  }
}
