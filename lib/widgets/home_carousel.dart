// ignore_for_file: deprecated_member_use, use_super_parameters

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';

class HomeCarousel extends StatefulWidget {
  const HomeCarousel({Key? key}) : super(key: key);

  @override
  State<HomeCarousel> createState() => _HomeCarouselState();
}

class _HomeCarouselState extends State<HomeCarousel> {
  final PageController _pageController = PageController();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  int _currentIndex = 0;
  List<Map<String, dynamic>> _carouselItems = [];
  bool _isLoading = true;

  // Otomatik kaydırma için timer
  @override
  void initState() {
    super.initState();
    _loadBackgroundImages();
    // Otomatik kaydırma için periyodik işlem
    Future.delayed(const Duration(seconds: 5), () {
      _autoScroll();
    });
  }

  Future<void> _loadBackgroundImages() async {
    Logger.debug('🎠 [HOME CAROUSEL] Banner yükleniyor...');
    try {
      final doc = await _firestore.collection('settings').doc('background_images').get();
      Logger.debug('📊 [HOME CAROUSEL] Document exists: ${doc.exists}');
      if (doc.exists) {
        final data = doc.data();
        if (data != null && data['images'] != null) {
          final list = List<Map<String, dynamic>>.from(data['images']);
          // Filtrele: aktif olanları ve ana sayfa için olanları al
          Logger.debug('📊 [HOME CAROUSEL] Toplam banner: ${list.length}');

          list.removeWhere((e) =>
              e['isActive'] == false ||
              (e['page'] != null && e['page'] != 'home' && e['page'] != 'all'));

          Logger.debug('✅ [HOME CAROUSEL] Filtrelendi: ${list.length} aktif banner');
          for (var i = 0; i < list.length; i++) {
            final url = list[i]['url'] ?? list[i]['imageUrl'] ?? '';
            Logger.debug('   [$i] ${list[i]['title']}');
            Logger.debug('       URL: ${url.isEmpty ? "BOŞ!" : url.substring(0, 50)}...');
            Logger.debug('       Page: ${list[i]['page']}, Active: ${list[i]['isActive']}');
          }

          list.sort((a, b) => (a['order'] ?? 0).compareTo(b['order'] ?? 0));
          setState(() {
            _carouselItems = list;
            _isLoading = false;
          });
          return;
        }
      }
    } catch (e) {
      Logger.error('❌ [HOME CAROUSEL] HATA: $e');
      // Hata durumunda varsayılan görselleri kullan
    }

    // Varsayılan görseller
    Logger.warning('⚠️ [HOME CAROUSEL] Varsayılan görseller kullanılıyor');
    setState(() {
      _carouselItems = _defaultCarouselItems;
      _isLoading = false;
    });
  }

  void _autoScroll() {
    if (!mounted) return;

    if (_carouselItems.isEmpty) return;

    final nextPage = (_currentIndex + 1) % _carouselItems.length;
    _pageController.animateToPage(
      nextPage,
      duration: const Duration(milliseconds: 800),
      curve: Curves.fastOutSlowIn,
    );

    Future.delayed(const Duration(seconds: 5), () {
      _autoScroll();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  // Varsayılan carousel öğeleri
  static final List<Map<String, dynamic>> _defaultCarouselItems = [
    {
      'title': 'Ekşi Mayalı Ekmekler',
      'subtitle':
          'Geleneksel yöntemlerle hazırlanan, doğal fermentasyon ile olgunlaşan ekşi mayalı ekmeklerimiz',
      'imageUrl':
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      'buttonText': 'Keşfet',
    },
    {
      'title': 'Özel Tarifler',
      'subtitle': 'Özenle seçilmiş malzemelerle hazırlanan özel tariflerimiz',
      'imageUrl':
          'https://images.unsplash.com/photo-1565181917578-a87bdd95422b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      'buttonText': 'İncele',
    },
    {
      'title': 'Sağlıklı Seçenekler',
      'subtitle': 'Glutensiz ve tam tahıllı sağlıklı ekmek çeşitlerimiz',
      'imageUrl':
          'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      'buttonText': 'Keşfet',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    // Cihaz tipine göre yükseklik belirle
    final carouselHeight = isDesktop ? 500.0 : (isTablet ? 400.0 : 300.0);

    if (_isLoading) {
      return SizedBox(
        height: carouselHeight,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_carouselItems.isEmpty) {
      return SizedBox(
        height: carouselHeight,
        child: Container(
          color: Colors.grey[200],
          child: const Center(
            child: Text('Görsel yüklenmedi'),
          ),
        ),
      );
    }

    return SizedBox(
      height: carouselHeight,
      width: double.infinity,
      child: Stack(
        children: [
          // PageView Carousel
          PageView.builder(
            controller: _pageController,
            itemCount: _carouselItems.length,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final item = _carouselItems[index];
              return _buildCarouselItem(context, item, index);
            },
          ),

          // Sayfa göstergesi
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: Center(
              child: AnimatedSmoothIndicator(
                activeIndex: _currentIndex,
                count: _carouselItems.length,
                effect: ExpandingDotsEffect(
                  dotHeight: 8,
                  dotWidth: 8,
                  activeDotColor: AppTheme.primaryColor,
                  dotColor: Colors.white.withValues(alpha: 0.5),
                ),
              ),
            ),
          ),

          // Önceki/Sonraki butonları
          if (isDesktop || isTablet) ...[
            // Önceki buton
            Positioned(
              left: 20,
              top: 0,
              bottom: 0,
              child: Center(
                child: IconButton(
                  onPressed: () {
                    _pageController.previousPage(
                      duration: const Duration(milliseconds: 400),
                      curve: Curves.easeInOut,
                    );
                  },
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 32),
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.7),
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(AppTheme.spaceMd),
                  ),
                ),
              ),
            ),

            // Sonraki buton
            Positioned(
              right: 20,
              top: 0,
              bottom: 0,
              child: Center(
                child: IconButton(
                  onPressed: () {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 400),
                      curve: Curves.easeInOut,
                    );
                  },
                  icon: const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 32),
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.7),
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(AppTheme.spaceMd),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCarouselItem(BuildContext context, Map<String, dynamic> item, int index) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    // Animasyon gecikmesi
    final delay = (index * 100).ms;

    return Stack(
      children: [
        // Arkaplan resmi
        SizedBox(
          width: double.infinity,
          height: double.infinity,
          child: Image.network(
            item['url'] ?? item['imageUrl'] ?? '',
            fit: BoxFit.cover,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) {
                return Container(
                  foregroundDecoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                  ),
                  child: child,
                );
              }
              return Container(
                color: Colors.grey[800],
                child: Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded /
                            loadingProgress.expectedTotalBytes!
                        : null,
                    color: AppTheme.primaryColor,
                  ),
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color: Colors.grey[800],
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.image_not_supported,
                        color: Colors.white.withValues(alpha: 0.6),
                        size: 60,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Görsel yüklenemedi',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // İçerik
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isDesktop ? 80 : (isTablet ? AppTheme.space4xl : AppTheme.spaceXl),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Başlık
              Text(
                item['title'],
                style: GoogleFonts.playfairDisplay(
                  fontSize: isDesktop ? 48 : (isTablet ? 36 : 28),
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ).animate().fadeIn(duration: 600.ms, delay: delay).slideX(
                    begin: -0.2,
                    end: 0,
                    curve: Curves.easeOutQuad,
                    duration: 600.ms,
                    delay: delay,
                  ),

              const SizedBox(height: 16),

              // Alt başlık
              Text(
                item['subtitle'],
                style: TextStyle(
                  fontSize: isDesktop ? 18 : 16,
                  color: Colors.white.withValues(alpha: 0.9),
                  height: 1.5,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ).animate().fadeIn(duration: 600.ms, delay: delay + 200.ms).slideX(
                    begin: -0.2,
                    end: 0,
                    curve: Curves.easeOutQuad,
                    duration: 600.ms,
                    delay: delay + 200.ms,
                  ),

              const SizedBox(height: 24),

              // Buton
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppTheme.space2xl,
                    vertical: AppTheme.spaceLg,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  ),
                ),
                child: Text(
                  item['buttonText'],
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ).animate().fadeIn(duration: 600.ms, delay: delay + 400.ms).slideX(
                    begin: -0.2,
                    end: 0,
                    curve: Curves.easeOutQuad,
                    duration: 600.ms,
                    delay: delay + 400.ms,
                  ),
            ],
          ),
        ),
      ],
    );
  }
}
