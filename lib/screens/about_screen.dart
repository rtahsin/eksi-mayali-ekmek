import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';
import '../widgets/page_banner.dart';

class AboutScreen extends StatelessWidget {
  static const routeName = '/about';

  const AboutScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hakkımızda'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Dinamik Banner
            const PageBanner(page: 'about', height: 300),

            // Hikayemiz
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hikayemiz',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2, end: 0),
                  const SizedBox(height: 16),
                  const Text(
                    'Ekşi Mayalı Ekmek serüvenimiz, 2010 yılında küçük bir mahalle fırınında başladı. Geleneksel ekmek yapım yöntemlerini modern tekniklerle birleştirerek, sağlıklı ve lezzetli ekmekler üretme tutkusuyla yola çıktık.',
                    style: TextStyle(fontSize: 16, height: 1.6),
                  ).animate().fadeIn(delay: 400.ms),
                ],
              ),
            ),

            // Misyonumuz
            Container(
              color: Colors.grey[100],
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Misyonumuz',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ).animate().fadeIn(delay: 600.ms).slideX(begin: 0.2, end: 0),
                  const SizedBox(height: 16),
                  const Text(
                    'Doğal ve sağlıklı ekşi mayalı ekmekleri herkes için erişilebilir kılmak. Geleneksel yöntemlerle üretilen, katkısız ve besleyici ekmekleri sofralarınıza ulaştırmak için çalışıyoruz.',
                    style: TextStyle(fontSize: 16, height: 1.6),
                  ).animate().fadeIn(delay: 800.ms),
                ],
              ),
            ),

            // Vizyonumuz
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Vizyonumuz',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ).animate().fadeIn(delay: 1000.ms).slideX(begin: -0.2, end: 0),
                  const SizedBox(height: 16),
                  const Text(
                    'Türkiye\'nin en güvenilir ve tercih edilen ekşi mayalı ekmek markası olmak. İnovatif yaklaşımlarla geleneksel lezzetleri koruyarak, sağlıklı beslenme konusunda farkındalık yaratmak.',
                    style: TextStyle(fontSize: 16, height: 1.6),
                  ).animate().fadeIn(delay: 1200.ms),
                ],
              ),
            ),

            // Değerlerimiz
            Container(
              color: Colors.grey[100],
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Değerlerimiz',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ).animate().fadeIn(delay: 1400.ms).slideX(begin: 0.2, end: 0),
                  const SizedBox(height: 24),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 1.5,
                    children: [
                      _buildValueCard(
                        'Kalite',
                        'En iyi malzemeler, en iyi sonuç',
                        Icons.star,
                        1600,
                      ),
                      _buildValueCard(
                        'Doğallık',
                        'Katkısız ve sağlıklı üretim',
                        Icons.eco,
                        1800,
                      ),
                      _buildValueCard(
                        'Yenilikçilik',
                        'Geleneksel ve modern sentezi',
                        Icons.lightbulb,
                        2000,
                      ),
                      _buildValueCard(
                        'Güven',
                        'Şeffaf ve dürüst yaklaşım',
                        Icons.verified_user,
                        2200,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // İletişim
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'İletişim',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ).animate().fadeIn(delay: 2400.ms).slideX(begin: -0.2, end: 0),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: const Icon(Icons.location_on, color: AppTheme.primaryColor),
                    title: const Text('Adres'),
                    subtitle: const Text('Merkez Mahallesi, Ekmek Sokak No:1, İstanbul'),
                  ).animate().fadeIn(delay: 2600.ms),
                  ListTile(
                    leading: const Icon(Icons.phone, color: AppTheme.primaryColor),
                    title: const Text('Telefon'),
                    subtitle: const Text('+90 (212) 555 0123'),
                  ).animate().fadeIn(delay: 2800.ms),
                  ListTile(
                    leading: const Icon(Icons.email, color: AppTheme.primaryColor),
                    title: const Text('E-posta'),
                    subtitle: const Text('info@eksimayaliekmek.com'),
                  ).animate().fadeIn(delay: 3000.ms),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildValueCard(String title, String description, IconData icon, int delay) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: AppTheme.primaryColor),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              description,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: delay.ms).scale(delay: delay.ms, duration: 400.ms);
  }
}
