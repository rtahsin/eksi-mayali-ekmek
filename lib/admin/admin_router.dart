import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../screens/admin/admin_blogs.dart';
import '../screens/admin/admin_chatbot.dart';
import '../screens/admin/admin_expenses.dart';
import '../screens/admin/admin_financial_report.dart';
import '../screens/admin/admin_productions.dart';
import '../screens/admin/admin_sales.dart';
import '../screens/admin/admin_settings.dart';
import '../screens/admin/admin_stocks.dart';
import '../screens/admin/background_images_screen.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import 'audit/admin_audit_logs.dart';
import 'auth/admin_login.dart';
import 'categories/admin_categories.dart';
import 'customers/admin_customers.dart';
import 'dashboard/admin_dashboard.dart';
import 'delivery/delivery_route_screen.dart';
import 'delivery/delivery_schedule_screen.dart';
import 'notifications/manual_notification_screen.dart';
import 'orders/admin_orders.dart';
import 'production/start_production_screen.dart';
import 'products/admin_products.dart';
import 'widgets/admin_drawer.dart';

export 'mobile/admin_mobile_landing.dart';

/// AdminRouter sınıfı, yönetici panelinin ana yönlendirme bileşenidir.
/// Bu sınıf, kullanıcının admin yetkisini kontrol eder ve
/// uygun ekranı (login veya dashboard) gösterir.
///
/// AdminRouter nasıl çalışır?
/// 1. Kullanıcının oturum durumunu kontrol eder
/// 2. Oturum açılmışsa, admin yetkisini kontrol eder
/// 3. Admin yetkisi varsa, ilgili admin sayfasını gösterir
/// 4. Yetki yoksa veya oturum açılmamışsa login sayfasına yönlendirir
class AdminRouter extends StatefulWidget {
  const AdminRouter({Key? key}) : super(key: key);

  @override
  State<AdminRouter> createState() => _AdminRouterState();
}

class _AdminRouterState extends State<AdminRouter> {
  // Admin yetkisi kontrolü için durum değişkenleri
  bool _isCheckingAdmin = true; // Yetki kontrolü yapılıyor mu?
  bool _hasAdminPermission = false; // Admin yetkisi var mı?

  @override
  void initState() {
    super.initState();
    // Uygulama başladığında admin yetkisini kontrol et
    _checkAdminPermission();
  }

  /// Admin yetkisini kontrol eden metot.
  /// Bu metot kullanıcının giriş yapmış olup olmadığını ve
  /// admin yetkisine sahip olup olmadığını kontrol eder.
  ///
  /// Yetki kontrolü şu adımları izler:
  /// 1. AuthService üzerinden kullanıcının giriş yapmış olup olmadığını kontrol eder
  /// 2. Süper admin özel kontrolü yapar (tahsinreyhan@gmail.com hesabı)
  /// 3. Firestore'dan admin yetkisini kontrol eder
  /// 4. Sonucu state'e kaydeder
  Future<void> _checkAdminPermission() async {
    Logger.info('AdminRouter: Admin yetki kontrolü başlatılıyor');

    try {
      final authService = Provider.of<AuthService>(context, listen: false);

      setState(() {
        _isCheckingAdmin = true;
      });

      // Kullanıcı giriş yapmış mı kontrol et
      if (!authService.isAuthenticated) {
        Logger.info('AdminRouter: Kullanıcı giriş yapmamış');
        setState(() {
          _hasAdminPermission = false;
          _isCheckingAdmin = false;
        });
        return;
      }

      // Firebase Custom Claims ile admin kontrolü
      final currentUser = authService.currentUser;
      if (currentUser != null) {
        Logger.info('AdminRouter: Admin yetkisi kontrol ediliyor: ${currentUser.email}');

        try {
          // Custom Claims'den güvenli admin kontrolü
          final isAdmin = await authService.checkAdminPermission();

          if (isAdmin) {
            Logger.info('AdminRouter: Admin yetkisi onaylandı: ${currentUser.email}');

            // Firestore'da admin kaydını güncelle
            final firestore = FirebaseFirestore.instance;
            await firestore.collection('adminler').doc(currentUser.id).set({
              'email': currentUser.email,
              'isActive': true,
              'lastLogin': DateTime.now().toIso8601String(),
              'updatedAt': DateTime.now().toIso8601String(),
            }, SetOptions(merge: true));

            // Kullanıcı belgesini admin olarak işaretle
            // update() yerine set(merge:true) kullanarak belge yoksa da güvenli yaz.
            await firestore.collection('users').doc(currentUser.id).set({
              'isAdmin': true,
              'updatedAt': DateTime.now().toIso8601String(),
            }, SetOptions(merge: true));

            Logger.info('AdminRouter: Admin yetkisi veritabanında güncellendi');

            setState(() {
              _hasAdminPermission = true;
              _isCheckingAdmin = false;
            });
            return;
          } else {
            Logger.warning('AdminRouter: Admin yetkisi reddedildi: ${currentUser.email}');
            setState(() {
              _hasAdminPermission = false;
              _isCheckingAdmin = false;
            });
            return;
          }
        } catch (e) {
          Logger.error('AdminRouter: Admin kontrolü hatası: $e');
          setState(() {
            _hasAdminPermission = false;
            _isCheckingAdmin = false;
          });
          return;
        }
      }

      // Kullanıcı yoksa admin değil
      final hasPermission = await authService.checkAdminPermission();
      Logger.info('AdminRouter: Admin yetki kontrolü sonucu: $hasPermission');

      setState(() {
        _hasAdminPermission = hasPermission;
        _isCheckingAdmin = false;
      });

      // Admin yetkisi yoksa kullanıcıyı çıkış yaptır
      if (!hasPermission && authService.isLoggedIn) {
        Logger.info('AdminRouter: Admin yetkisi yok, çıkış yapılıyor');
        await _showNoPermissionDialog();
        await authService.logout();
        // Login sayfasına yönlendirme, ancak popuptan sonra yapılacak
      }
    } catch (e) {
      Logger.error('AdminRouter: Admin yetki kontrolü hatası: $e');
      setState(() {
        _hasAdminPermission = false;
        _isCheckingAdmin = false;
      });
    }
  }

  /// Admin yetkisi olmayan kullanıcılara gösterilecek dialog
  /// Bu dialog, kullanıcıya admin yetkisi olmadığını bildirir
  /// ve tamam butonuna basıldığında login sayfasına yönlendirir.
  Future<void> _showNoPermissionDialog() async {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return showDialog(
      context: context,
      barrierDismissible: false, // Dialog dışına tıklayarak kapatılamaz
      builder: (context) => AlertDialog(
        title: Text(
          'Yetkisiz Erişim',
          style: TextStyle(
            fontSize: isSmallScreen ? 16 : 18,
          ),
        ),
        content: Text(
          'Admin paneline erişim yetkiniz bulunmamaktadır.',
          style: TextStyle(
            fontSize: isSmallScreen ? 14 : 16,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Dialog kapandıktan sonra login sayfasına yönlendir
              Navigator.of(context).pushReplacementNamed('/admin/login');
            },
            child: Text('Tamam'),
          ),
        ],
        contentPadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.spaceXl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        titlePadding: const EdgeInsets.fromLTRB(
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.space2xl,
          AppTheme.spaceZero,
        ),
        actionsPadding: const EdgeInsets.fromLTRB(
          AppTheme.spaceXs,
          AppTheme.spaceXs,
          AppTheme.spaceLg,
          AppTheme.spaceLg,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // URL yolunu al
    final String? currentPath = ModalRoute.of(context)?.settings.name;
    Logger.info('Admin Router build çağrıldı. URL: $currentPath');
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    // Login sayfası için özel kontrol - URL'nin login içerip içermediğini kontrol et
    if (currentPath != null &&
        (currentPath == '/admin/login' || currentPath.contains('admin/login'))) {
      Logger.info('AdminRouter: admin/login sayfasına yönlendiriliyor. Path: $currentPath');
      return const AdminLoginPage();
    }

    // Yetki kontrolü yapılıyorsa yükleniyor ekranı göster
    if (_isCheckingAdmin) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
              ), // Yükleniyor göstergesi
              SizedBox(height: 16),
              Text(
                'Yetki kontrolü yapılıyor...',
                style: TextStyle(
                  fontSize: isSmallScreen ? 14 : 16,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    // AuthService'i kontrol et
    final authService = Provider.of<AuthService>(context);
    final bool isLoggedIn = authService.isLoggedIn;

    // Giriş yapılmamışsa veya admin yetkisi yoksa login ekranına yönlendir
    if (!isLoggedIn || !_hasAdminPermission) {
      Logger.info('AdminRouter: Yetkisiz erişim - Login sayfasına yönlendiriliyor');
      return const AdminLoginPage();
    }

    // Admin yetkisi varsa - sayfa yönlendirmesi
    Widget pageToShow = const AdminDashboardPage(); // Varsayılan dashboard

    // URL'e göre hangi sayfanın gösterileceğini belirle
    if (currentPath != null) {
      if (currentPath.contains('/admin/products')) {
        Logger.info('AdminRouter: Products sayfası gösteriliyor');
        pageToShow = const AdminProductsPage();
      } else if (currentPath.contains('/admin/categories')) {
        Logger.info('AdminRouter: Categories sayfası gösteriliyor');
        pageToShow = const AdminCategoriesPage();
      } else if (currentPath.contains('/admin/orders')) {
        Logger.info('AdminRouter: Orders sayfası gösteriliyor');
        pageToShow = const AdminOrdersPage();
      } else if (currentPath.contains('/admin/blogs')) {
        Logger.info('AdminRouter: Blog sayfası gösteriliyor');
        pageToShow = const AdminBlogs();
      } else if (currentPath.contains('/admin/chatbot')) {
        Logger.info('AdminRouter: ChatBot sayfası gösteriliyor');
        pageToShow = const AdminChatBotScreen();
      } else if (currentPath.contains('/admin/productions')) {
        Logger.info('AdminRouter: Üretim Kayıtları sayfası gösteriliyor');
        pageToShow = const AdminProductionsScreen();
      } else if (currentPath.contains('/admin/stocks')) {
        Logger.info('AdminRouter: Stok Durumu sayfası gösteriliyor');
        pageToShow = const AdminStocksScreen();
      } else if (currentPath.contains('/admin/sales')) {
        Logger.info('AdminRouter: Satış Kayıtları sayfası gösteriliyor');
        pageToShow = const AdminSalesScreen();
      } else if (currentPath.contains('/admin/expenses')) {
        Logger.info('AdminRouter: Gider Kayıtları sayfası gösteriliyor');
        pageToShow = const AdminExpensesScreen();
      } else if (currentPath.contains('/admin/financial-report')) {
        Logger.info('AdminRouter: Finansal Rapor sayfası gösteriliyor');
        pageToShow = const AdminFinancialReportScreen();
      } else if (currentPath.contains('/admin/customers')) {
        Logger.info('AdminRouter: Müşteriler sayfası gösteriliyor');
        pageToShow = const AdminCustomersPage();
      } else if (currentPath.contains('/admin/settings')) {
        Logger.info('AdminRouter: Ayarlar sayfası gösteriliyor');
        pageToShow = const AdminSettings();
      } else if (currentPath.contains('/admin/backgrounds')) {
        Logger.info('AdminRouter: Arka Plan Görselleri sayfası gösteriliyor');
        pageToShow = const BackgroundImagesScreen();
      } else if (currentPath.contains('/admin/audit')) {
        Logger.info('AdminRouter: Denetim Kayıtları sayfası gösteriliyor');
        pageToShow = const AdminAuditLogsPage();
      } else if (currentPath.contains('/admin/delivery-schedule')) {
        Logger.info('AdminRouter: Teslimat Takvimi sayfası gösteriliyor');
        pageToShow = const DeliveryScheduleScreen();
      } else if (currentPath.contains('/admin/start-production')) {
        Logger.info('AdminRouter: Üretim Başlatma sayfası gösteriliyor');
        pageToShow = const StartProductionScreen();
      } else if (currentPath.contains('/admin/delivery-route')) {
        Logger.info('AdminRouter: Teslimat Rotası sayfası gösteriliyor');
        pageToShow = const DeliveryRouteScreen();
      } else if (currentPath.contains('/admin/manual-notification')) {
        Logger.info('AdminRouter: Manuel Bildirim sayfası gösteriliyor');
        pageToShow = const ManualNotificationScreen();
      }
    }

    // Drawer'ın seçili menü öğesini belirle
    int selectedIndex = 0; // Varsayılan olarak Dashboard
    if (currentPath != null) {
      if (currentPath.contains('/admin/products')) {
        selectedIndex = 1;
      } else if (currentPath.contains('/admin/categories')) {
        selectedIndex = 2;
      } else if (currentPath.contains('/admin/orders')) {
        selectedIndex = 3;
      } else if (currentPath.contains('/admin/blogs')) {
        selectedIndex = 4;
      } else if (currentPath.contains('/admin/chatbot')) {
        selectedIndex = 5;
      } else if (currentPath.contains('/admin/productions')) {
        selectedIndex = 6;
      } else if (currentPath.contains('/admin/stocks')) {
        selectedIndex = 7;
      } else if (currentPath.contains('/admin/sales')) {
        selectedIndex = 8;
      } else if (currentPath.contains('/admin/expenses')) {
        selectedIndex = 9;
      } else if (currentPath.contains('/admin/financial-report')) {
        selectedIndex = 10;
      } else if (currentPath.contains('/admin/customers')) {
        selectedIndex = 11;
      } else if (currentPath.contains('/admin/backgrounds')) {
        selectedIndex = 12;
      } else if (currentPath.contains('/admin/audit')) {
        selectedIndex = 13;
      } else if (currentPath.contains('/admin/delivery-schedule')) {
        selectedIndex = 14;
      } else if (currentPath.contains('/admin/start-production')) {
        selectedIndex = 15;
      } else if (currentPath.contains('/admin/delivery-route')) {
        selectedIndex = 16;
      } else if (currentPath.contains('/admin/manual-notification')) {
        selectedIndex = 17;
      }
    }

    // Admin panelinin ana yapısını oluştur
    return Scaffold(
      // Üst bar
      appBar: AppBar(
        title: Text(
          isSmallScreen ? 'Yönetici Paneli' : 'Ekşi Mayalı Ekmek Yönetici Paneli',
          style: TextStyle(
            fontSize: isSmallScreen ? 16 : 18,
          ),
        ),
        backgroundColor: AppTheme.primaryColor,
        elevation: 2,
        actions: [
          // Bildirim butonu
          if (!isSmallScreen)
            IconButton(
              icon: Icon(Icons.notifications),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Bildirimler henüz hazır değil')),
                );
              },
            ),
          // Çıkış butonu
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              await authService.logout();
              if (!context.mounted) return;
              Navigator.pushReplacementNamed(context, '/admin/login');
            },
          ),
        ],
      ),
      // Yan menü
      drawer: AdminDrawer(currentIndex: selectedIndex),
      // Sayfa içeriği
      body: pageToShow,
    );
  }
}
