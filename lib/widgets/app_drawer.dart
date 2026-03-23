// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/cart_provider.dart';
import '../providers/theme_provider.dart';
import '../screens/about_screen.dart';
import '../screens/blog_list_screen.dart';
import '../screens/cart_screen.dart';
import '../screens/home_screen.dart';
import '../screens/order_history_screen.dart';
import '../screens/preferences_screen.dart';
import '../screens/profile_screen.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  Future<void> _launchWhatsApp(BuildContext context) async {
    try {
      final whatsappUrl = Uri.parse('https://wa.me/905010126653');

      if (await canLaunchUrl(whatsappUrl)) {
        await launchUrl(
          whatsappUrl,
          mode: LaunchMode.externalApplication,
        );
      } else {
        throw Exception('WhatsApp açılamadı');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('WhatsApp ile iletişime geçilemedi'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final cartProvider = Provider.of<CartProvider>(context);

    final isDark = themeProvider.isDarkMode;
    final isAuthenticated = authService.isAuthenticated;
    final isAdmin = isAuthenticated && authService.currentUser?.isAdmin == true;
    final cartItemCount = cartProvider.itemCount;

    return Drawer(
      backgroundColor: isDark ? AppTheme.darkSurfaceColor : Colors.white,
      child: Column(
        children: [
          // Drawer Header
          Container(
            padding: const EdgeInsets.symmetric(
              vertical: AppTheme.space2xl,
              horizontal: AppTheme.spaceLg,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                        child: Image.asset(
                          'assets/logo/logo.png',
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              padding: const EdgeInsets.all(AppTheme.spaceXs),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.bakery_dining,
                                color: Colors.white,
                                size: 40,
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Text(
                          'EkmekLab',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (isAuthenticated) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                          radius: 20,
                          child: Text(
                            authService.currentUser!.fullName.isNotEmpty
                                ? authService.currentUser!.fullName[0].toUpperCase()
                                : authService.currentUser!.email[0].toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                authService.currentUser!.fullName.isNotEmpty
                                    ? authService.currentUser!.fullName
                                    : authService.currentUser!.email.split('@')[0],
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                authService.currentUser!.email,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 12,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Drawer Items
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.home,
                  title: 'Ana Sayfa',
                  onTap: () {
                    _navigateTo(context, const HomeScreen());
                  },
                  isDark: isDark,
                ),
                if (isAuthenticated) ...[
                  _buildDrawerItem(
                    context,
                    icon: Icons.person,
                    title: 'Profil',
                    onTap: () => _navigateTo(context, ProfileScreen()),
                    isDark: isDark,
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.shopping_cart,
                    title: 'Sepet',
                    badge: cartItemCount > 0 ? cartItemCount.toString() : null,
                    onTap: () => _navigateTo(context, CartScreen()),
                    isDark: isDark,
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.history,
                    title: 'Sipariş Geçmişi',
                    onTap: () => _navigateTo(context, OrderHistoryScreen()),
                    isDark: isDark,
                  ),
                ],
                _buildDrawerItem(
                  context,
                  icon: Icons.article,
                  title: 'Blog',
                  onTap: () {
                    _navigateTo(context, const BlogListScreen());
                  },
                  isDark: isDark,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.info,
                  title: 'Hakkımızda',
                  onTap: () {
                    _navigateTo(context, const AboutScreen());
                  },
                  isDark: isDark,
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.settings,
                  title: 'Ayarlar',
                  onTap: () {
                    _navigateTo(context, const PreferencesScreen());
                  },
                  isDark: isDark,
                ),
                const Divider(),
                _buildSocialMediaButton(
                  context: context,
                  icon: FontAwesomeIcons.whatsapp,
                  color: Colors.green,
                  onPressed: () async {
                    Navigator.pop(context);
                    await _launchWhatsApp(context);
                  },
                ),
                if (isAuthenticated)
                  _buildDrawerItem(
                    context,
                    icon: Icons.logout,
                    title: 'Çıkış Yap',
                    onTap: () async {
                      await authService.logout();
                      Navigator.pop(context);
                      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
                    },
                    isDark: isDark,
                  )
                else
                  _buildDrawerItem(
                    context,
                    icon: Icons.login,
                    title: 'Giriş Yap',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, '/login');
                    },
                    isDark: isDark,
                  ),
                _buildDrawerItem(
                  context,
                  icon: Icons.notifications_outlined,
                  title: 'Bildirimler',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.pushNamed(context, '/notifications');
                  },
                  isDark: isDark,
                ),
              ],
            ),
          ),

          // Footer
          Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Text(
              '© ${DateTime.now().year} EkmekLab',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.textLightColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    String? badge,
    bool isDark = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDark ? Colors.white70 : Colors.black54,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.all(AppTheme.spaceXxs + 2),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor,
                shape: BoxShape.circle,
              ),
              child: Text(
                badge,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                ),
              ),
            )
          : null,
      onTap: onTap,
    );
  }

  Widget _buildSocialMediaButton({
    required BuildContext context,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return ListTile(
      leading: FaIcon(icon, color: color),
      title: Text(
        icon == FontAwesomeIcons.whatsapp ? 'WhatsApp' : 'YouTube',
        style: TextStyle(
          color: Provider.of<ThemeProvider>(context).isDarkMode ? Colors.white : Colors.black87,
        ),
      ),
      onTap: onPressed,
    );
  }

  void _navigateTo(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }
}
