import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../orders/admin_orders.dart';
import '../products/admin_products.dart';

/// Mobil cihazlar için optimize edilmiş hızlı admin erişim sayfası
///
/// Özellikler:
/// - Tek dokunuşla sık kullanılan işlemler
/// - Büyük dokunma alanları
/// - Hızlı navigasyon (Stok, Siparişler, Dashboard)
class AdminMobileLanding extends StatefulWidget {
  const AdminMobileLanding({super.key});

  @override
  State<AdminMobileLanding> createState() => _AdminMobileLandingState();
}

class _AdminMobileLandingState extends State<AdminMobileLanding> {
  // ignore: unused_field
  bool _isLoading = true;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    setState(() {
      _isLoading = true;
      _isChecking = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);

      // Firebase session kontrolü - biraz bekle ki AuthService initialize olsun
      await Future.delayed(const Duration(milliseconds: 500));

      Logger.info(
          'AdminMobile - Session kontrolü: isLoggedIn=${authService.isLoggedIn}, isAdmin=${authService.isAdmin}');

      // Eğer giriş yapılmışsa ve admin ise direkt göster
      if (authService.isLoggedIn && authService.currentUser?.isAdmin == true) {
        Logger.info(
            'AdminMobile - Kullanıcı zaten giriş yapmış: ${authService.currentUser?.email}');
        setState(() {
          _isLoading = false;
          _isChecking = false;
        });
        return;
      }

      // Giriş yapılmamışsa login sayfasına yönlendir
      if (!authService.isLoggedIn) {
        Logger.info('AdminMobile - Session yok, login\'e yönlendiriliyor');
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/admin/login');
        return;
      }

      // Giriş var ama admin değilse
      if (!authService.isAdmin) {
        Logger.warning('AdminMobile - Kullanıcı admin değil: ${authService.currentUser?.email}');
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/admin/login');
        return;
      }
    } catch (e) {
      Logger.error('AdminMobile - Auth kontrolü hatası: $e');
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/admin/login');
    }

    setState(() {
      _isLoading = false;
      _isChecking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    // Session kontrolü yapılırken loading göster
    if (_isChecking) {
      return Scaffold(
        backgroundColor: AppTheme.primaryColor,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Colors.white),
              const SizedBox(height: AppTheme.space2xl),
              Text(
                'Oturum kontrol ediliyor...',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'EkmekLab Admin',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              user?.email ?? '',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await authService.logout();
              if (mounted) {
                Navigator.pushReplacementNamed(context, '/admin/login');
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceXl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppTheme.spaceXl),

              // Hoş geldin mesajı
              Text(
                'Hoş Geldiniz 👋',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: AppTheme.spaceXs),
              Text(
                'Hızlı erişim için aşağıdaki butonları kullanın',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),

              const SizedBox(height: AppTheme.space3xl + AppTheme.spaceXs),

              // Hızlı erişim butonları
              Expanded(
                child: GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: AppTheme.spaceLg,
                  crossAxisSpacing: AppTheme.spaceLg,
                  childAspectRatio: 1.1,
                  children: [
                    _buildQuickAccessCard(
                      context,
                      title: 'Stok Yönetimi',
                      icon: Icons.inventory_2,
                      color: Colors.orange,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AdminProductsPage(),
                        ),
                      ),
                    ),
                    _buildQuickAccessCard(
                      context,
                      title: 'Siparişler',
                      icon: Icons.shopping_bag,
                      color: Colors.blue,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AdminOrdersPage(),
                        ),
                      ),
                    ),
                    _buildQuickAccessCard(
                      context,
                      title: 'Dashboard',
                      icon: Icons.dashboard,
                      color: AppTheme.primaryColor,
                      onTap: () => Navigator.pushReplacementNamed(context, '/admin'),
                    ),
                    _buildQuickAccessCard(
                      context,
                      title: 'Tam Panel',
                      icon: Icons.desktop_windows,
                      color: Colors.green,
                      onTap: () => Navigator.pushReplacementNamed(context, '/admin'),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.spaceXl),

              // Bilgi kartı
              Container(
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue[700], size: 24),
                    const SizedBox(width: AppTheme.spaceMd),
                    Expanded(
                      child: Text(
                        'Bu sayfayı "Ana Ekrana Ekle" ile daha hızlı erişebilirsiniz',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.blue[900],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAccessCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        child: Container(
          padding: const EdgeInsets.all(AppTheme.spaceXl),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withValues(alpha: 0.1),
                color.withValues(alpha: 0.05),
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppTheme.spaceLg),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                ),
                child: Icon(
                  icon,
                  size: 40,
                  color: color,
                ),
              ),
              const SizedBox(height: AppTheme.spaceLg),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
