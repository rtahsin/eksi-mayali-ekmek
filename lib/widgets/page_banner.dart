import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../utils/logger.dart';

/// Sayfa bazlı dinamik banner widget'ı
/// Her sayfa için Firebase'den ilgili bannerları çeker ve gösterir
class PageBanner extends StatefulWidget {
  final String page; // 'home', 'products', 'blog', 'about'
  final double height;

  const PageBanner({
    super.key,
    required this.page,
    this.height = 400,
  });

  @override
  State<PageBanner> createState() => _PageBannerState();
}

class _PageBannerState extends State<PageBanner> {
  final PageController _pageController = PageController();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  int _currentIndex = 0;
  List<Map<String, dynamic>> _bannerItems = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBanners();
    _startAutoScroll();
  }

  Future<void> _loadBanners() async {
    Logger.debug('🎯 [PAGE BANNER - ${widget.page}] Banner yükleniyor...');
    try {
      final doc = await _firestore.collection('settings').doc('background_images').get();
      Logger.debug('📊 [PAGE BANNER - ${widget.page}] Document exists: ${doc.exists}');
      if (doc.exists) {
        final data = doc.data();
        if (data != null && data['images'] != null) {
          final allImages = List<Map<String, dynamic>>.from(data['images']);

          // Sadece bu sayfa için olan veya 'all' olanları filtrele
          Logger.debug('📊 [PAGE BANNER - ${widget.page}] Toplam banner: ${allImages.length}');

          final filteredImages = allImages.where((image) {
            final isActive = image['isActive'] == true;
            final imagePage = image['page'] ?? 'home';
            return isActive && (imagePage == widget.page || imagePage == 'all');
          }).toList();

          Logger.debug(
              '✅ [PAGE BANNER - ${widget.page}] Filtrelendi: ${filteredImages.length} banner');
          for (var i = 0; i < filteredImages.length; i++) {
            final url = filteredImages[i]['url'] ?? '';
            Logger.debug('   [$i] ${filteredImages[i]['title']}');
            Logger.debug('       URL: ${url.isEmpty ? "BOŞ!" : url.substring(0, 50)}...');
          }

          // Sırala
          filteredImages.sort((a, b) => (a['order'] ?? 0).compareTo(b['order'] ?? 0));

          if (filteredImages.isNotEmpty) {
            setState(() {
              _bannerItems = filteredImages;
              _isLoading = false;
            });
            return;
          }
        }
      }
    } catch (e) {
      Logger.error('❌ [PAGE BANNER - ${widget.page}] HATA: $e');
      Logger.error('Banner yükleme hatası: $e');
    }

    // Varsayılan banner
    Logger.warning('⚠️ [PAGE BANNER - ${widget.page}] Varsayılan banner kullanılıyor');
    setState(() {
      _bannerItems = _getDefaultBanner();
      _isLoading = false;
    });
  }

  List<Map<String, dynamic>> _getDefaultBanner() {
    switch (widget.page) {
      case 'products':
        return [
          {
            'title': 'Ürünlerimiz',
            'subtitle': 'Taze ve lezzetli ürünlerimizi keşfedin',
            'url': 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
            'buttonText': 'Ürünleri İncele',
          }
        ];
      case 'blog':
        return [
          {
            'title': 'Blog',
            'subtitle': 'Lezzetli tarifler ve faydalı bilgiler',
            'url': 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086',
            'buttonText': 'Yazıları Oku',
          }
        ];
      case 'about':
        return [
          {
            'title': 'Hakkımızda',
            'subtitle': 'Kaliteli ekmek geleneğimiz',
            'url': 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
            'buttonText': 'Hikayemiz',
          }
        ];
      default: // home
        return [
          {
            'title': 'Ekşi Mayalı Ekmekler',
            'subtitle': 'Geleneksel yöntemlerle hazırlanan doğal ekmekler',
            'url': 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
            'buttonText': 'Keşfet',
          }
        ];
    }
  }

  void _startAutoScroll() {
    Future.delayed(const Duration(seconds: 5), () {
      if (!mounted || _bannerItems.length <= 1) return;

      final nextPage = (_currentIndex + 1) % _bannerItems.length;
      _pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 800),
        curve: Curves.easeInOut,
      );

      _startAutoScroll();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final bannerHeight = isMobile ? 300.0 : widget.height;

    if (_isLoading) {
      return SizedBox(
        height: bannerHeight,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_bannerItems.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: bannerHeight,
      child: Stack(
        children: [
          // Banner carousel
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentIndex = index);
            },
            itemCount: _bannerItems.length,
            itemBuilder: (context, index) {
              final item = _bannerItems[index];
              return _buildBannerSlide(item);
            },
          ),

          // Page indicator (sadece birden fazla banner varsa)
          if (_bannerItems.length > 1)
            Positioned(
              bottom: 20,
              left: 0,
              right: 0,
              child: Center(
                child: SmoothPageIndicator(
                  controller: _pageController,
                  count: _bannerItems.length,
                  effect: ExpandingDotsEffect(
                    activeDotColor: Colors.white,
                    dotColor: Colors.white.withValues(alpha: 0.5),
                    dotHeight: 8,
                    dotWidth: 8,
                    expansionFactor: 3,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBannerSlide(Map<String, dynamic> item) {
    final title = item['title'] ?? '';
    final subtitle = item['subtitle'] ?? '';
    final imageUrl = item['url'] ?? '';
    final buttonText = item['buttonText'] ?? 'Keşfet';
    final linkTarget = item['linkTarget'] ?? '';

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final titleFontSize = isMobile ? 32.0 : 48.0;
        final subtitleFontSize = isMobile ? 16.0 : 20.0;
        final buttonPadding = isMobile
            ? const EdgeInsets.symmetric(horizontal: 24, vertical: 14)
            : const EdgeInsets.symmetric(horizontal: 40, vertical: 20);
        final containerPadding = isMobile ? const EdgeInsets.all(16) : const EdgeInsets.all(32);

        return Container(
          decoration: BoxDecoration(
            image: DecorationImage(
              image: NetworkImage(imageUrl),
              fit: BoxFit.cover,
              colorFilter: ColorFilter.mode(
                Colors.black.withValues(alpha: 0.4),
                BlendMode.darken,
              ),
            ),
          ),
          child: Center(
            child: Container(
              padding: containerPadding,
              constraints: const BoxConstraints(maxWidth: 800),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Başlık
                  Text(
                    title,
                    style: GoogleFonts.playfairDisplay(
                      fontSize: titleFontSize,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      height: 1.2,
                    ),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(duration: 600.ms, delay: 200.ms).slideY(begin: -0.3, end: 0),

                  SizedBox(height: isMobile ? 12 : 16),

                  // Alt başlık
                  Text(
                    subtitle,
                    style: GoogleFonts.lato(
                      fontSize: subtitleFontSize,
                      color: Colors.white.withValues(alpha: 0.95),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(duration: 600.ms, delay: 400.ms).slideY(begin: 0.3, end: 0),

                  SizedBox(height: isMobile ? 20 : 32),

                  // Buton
                  if (buttonText.isNotEmpty)
                    ElevatedButton(
                      onPressed: () {
                        if (linkTarget.isNotEmpty) {
                          if (linkTarget.startsWith('http')) {
                            // External link
                          } else {
                            // Internal navigation
                            Navigator.pushNamed(context, linkTarget);
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black87,
                        padding: buttonPadding,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30),
                        ),
                        elevation: 8,
                      ),
                      child: Text(
                        buttonText,
                        style: TextStyle(
                          fontSize: isMobile ? 16 : 18,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 600.ms)
                        .scale(begin: const Offset(0.8, 0.8)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
