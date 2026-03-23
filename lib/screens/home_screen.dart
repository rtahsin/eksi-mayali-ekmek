// ignore_for_file: unused_field, unused_element

/*
 * Ana Ekran (HomeScreen)
 * 
 * Bu dosya, uygulamanın ana ekranını içerir. Kullanıcıların ürünleri görüntüleyebileceği,
 * kategorilere göre filtreleyebileceği ve sepete ekleyebileceği bir arayüz sunar.
 * 
 * Özellikler:
 * - Carousel slider ile öne çıkan ürünlerin gösterimi
 * - Kategori filtreleme
 * - Öne çıkan ürünler listesi
 * - Tüm ürünler grid görünümü
 * - Sipariş takip sistemi
 * - Ekşi maya hakkında bilgi kartı
 * - Kullanıcı profili ve sepet yönetimi
 * - Animasyonlu geçişler ve modern UI bileşenleri
 * - Müşteri yorumları bölümü
 * - Arama fonksiyonu
 * 
 * Kullanılan servisler:
 * - AuthService: Kullanıcı oturumu ve profil yönetimi
 * - ProductService: Ürün listesi ve detayları
 * - CartProvider: Sepet yönetimi
 * - RecommendationService: Kişiselleştirilmiş öneriler
 * - YouTubeService: Canlı yayınlar ve ekmek yapım videoları
 * - ConnectionService: İnternet bağlantısı ve önbellek durumu
 * - NotificationService: Sipariş bildirimleri
 * 
 * Bağlantılı ekranlar:
 * - ProductDetailScreen: Ürün detayları
 * - CartScreen: Sepet içeriği
 * - ProfileScreen: Kullanıcı profili
 * - LoginScreen: Kullanıcı girişi
 * - RegisterScreen: Kullanıcı kaydı
 * - FavoritesScreen: Favori ürünler
 * - LiveStreamScreen: Canlı yayınlar
 * - AboutScreen: Hakkımızda
 * 
 * Güncelleme Tarihi: Haziran 2023
 */

// ignore_for_file: unused_import, use_super_parameters, unused_local_variable, prefer_const_constructors, prefer_const_literals_to_create_immutables, deprecated_member_use, unnecessary_to_list_in_spreads

import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/di/service_locator.dart';
import '../data/blog_data.dart';
import '../data/sample_data.dart';
import '../main.dart'; // MyApp sınıfı için import
import '../models/product.dart';
import '../models/user.dart';
import '../providers/cart_provider.dart';
import '../providers/notification_position_provider.dart'; // Provider'ı import ediyoruz
import '../providers/theme_provider.dart'; // Tema provider'ı
import '../services/auth_service.dart';
import '../services/connection_service.dart';
import '../services/notification_service.dart'; // NotificationService'i ekle
import '../services/product_service.dart';
import '../services/recommendation_service.dart';
import '../services/settings_service.dart';
import '../services/youtube_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../utils/translations.dart'; // Çeviri dosyasını import ediyoruz
import '../utils/url_state_helper_stub.dart'
  if (dart.library.html) '../utils/url_state_helper.dart' as url_state;
import '../widgets/app_drawer.dart';
import '../widgets/category_list.dart';
import '../widgets/chatbot_widget.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/featured_products.dart';
import '../widgets/live_chat_floating_button.dart';
import '../widgets/notification_icon.dart';
import '../widgets/page_banner.dart';
import '../widgets/personalized_recommendations.dart';
import '../widgets/product_card.dart';
import '../widgets/product_grid.dart';
import '../widgets/quick_view_dialog.dart'; // Hızlı görüntüleme dialog widget'ı
import '../widgets/skeleton_loader.dart'; // Modern loading skeleton
import 'about_screen.dart';
import 'ai_assistant_screen.dart';
import 'analytics_screen.dart';
import 'blog_detail_screen.dart';
import 'blog_list_screen.dart';
import 'cart_screen.dart';
import 'favorites_screen.dart';
import 'live_stream_screen.dart';
import 'login_screen.dart';
import 'order_history_screen.dart';
import 'product_detail_screen.dart';
import 'profile_screen.dart';
import 'register_screen.dart';

class HomeScreen extends StatefulWidget {
  static const routeName = '/home';
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  static const Set<String> _supportedPages = {'home', 'about', 'blog', 'orders'};

  String? _selectedCategory;
  final GlobalKey _productsKey = GlobalKey();
  bool _isInitialized = false;
  double _bannerOpacity = 0.0;
  final ScrollController _scrollController = ScrollController();
  List<Product> _filteredProducts = [];
  String _sortBy = 'name'; // 'name', 'price', 'popularity'
  bool _ascending = true;
  bool _isLoading = false;
  String? _error;
  bool _showConnectionError = false;
  late ConnectionService _connectionService;
  late AnimationController _animationController;
  late Animation<double> _animation;
  final NotificationService _notificationService = ServiceLocator.getIt<NotificationService>();
  StreamSubscription? _navigationSubscription;

  // Sayfa navigasyonu için
  String _currentPage = 'home'; // 'home', 'about', 'blog', 'orders'

  @override
  void initState() {
    super.initState();
    _applyInitialUrlState();
    _scrollController.addListener(_scrollListener);
    _loadProducts();
    _loadCategories();

    // Bildirim navigation setup (_listenToNotifications metodu kaldırıldı - gereksizdi)
    _setupNotificationNavigation();

    _animationController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 500),
    );
    _animation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    _animationController.forward();

    _setupNotificationNavigation();
  }

  void _applyInitialUrlState() {
    final queryParams = url_state.getCurrentQueryParams();

    final page = queryParams['page'];
    if (page != null && _supportedPages.contains(page)) {
      _currentPage = page;
    }

    final category = queryParams['category'];
    if (category != null && category.trim().isNotEmpty) {
      _selectedCategory = category.trim();
    }
  }

  void _syncUrlState() {
    final queryParams = <String, String>{};

    if (_currentPage != 'home') {
      queryParams['page'] = _currentPage;
    }

    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      queryParams['category'] = _selectedCategory!;
    }

    url_state.replaceQueryParams(queryParams);
  }

  void _setCurrentPage(String page) {
    if (!_supportedPages.contains(page)) return;

    setState(() {
      _currentPage = page;
    });

    _syncUrlState();
  }

  void _setupNotificationNavigation() {
    _navigationSubscription = _notificationService.navigationStream.listen((route) {
      if (mounted) {
        Navigator.of(context).pushNamed(route);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Provider'a güvenli erişim için
    _connectionService = Provider.of<ConnectionService>(context, listen: false);
    // Connection listener'ı ekle
    _connectionService.addListener(_onConnectionChanged);
    _checkConnectionStatus(_connectionService);

    // Ürünleri filtreleme işlemini burada yapıyoruz
    _filterProducts();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();

    // Animasyon kontrolcüsünü dispose et
    _animationController.dispose();

    // ConnectionService listener'ını kaldır
    try {
      if (mounted) {
        _connectionService.removeListener(_onConnectionChanged);
      }
    } catch (e) {
      Logger.error('Bağlantı servisi listener kaldırılırken hata: $e');
    }

    _navigationSubscription?.cancel();
    super.dispose();
  }

  // Bağlantı durumu değiştiğinde yapılacak işlemler
  void _onConnectionChanged() {
    // Widget hala aktif mi kontrol et
    if (!mounted) return;

    try {
      _checkConnectionStatus(_connectionService);
    } catch (e) {
      Logger.error('Bağlantı durumu değiştiğinde hata: $e');
    }
  }

  // Bağlantı durumunu kontrol et
  void _checkConnectionStatus(ConnectionService connectionService) {
    // İnternet bağlantısı yoksa ve uygulama zaten yüklendiyse göster
    // İlk açılışta bu uyarıyı göstermeyelim
    if (!connectionService.isOnline && mounted && _isInitialized) {
      setState(() {
        _showConnectionError = true;
      });

      // SchedulerBinding kullanarak bir sonraki frame'e erteleme
      SchedulerBinding.instance.addPostFrameCallback((_) {
        // Helpers sınıfını kullanarak global scaffold'a erişim
        Helpers.showWarningSnackBar(
          'Çevrimdışı mod: İnternet bağlantısı yok. Önbelleğe alınmış veriler gösteriliyor.',
        );
      });
    } else {
      setState(() {
        _showConnectionError = false;
      });
    }
  }

  // Scroll listener
  void _scrollListener() {
    final position = _scrollController.position;
    if (position.pixels > 10) {
      if (_bannerOpacity == 1.0) {
        setState(() {
          _bannerOpacity = 1.0;
        });
      }
    } else {
      if (_bannerOpacity < 1.0) {
        setState(() {
          _bannerOpacity = 1.0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final authService = Provider.of<AuthService>(context);
    final youtubeService = Provider.of<YouTubeService>(context);
    final cartProvider = Provider.of<CartProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: _buildAppBar(context, authService, isDesktop),
      drawer: isDesktop ? null : _buildDrawer(context, authService, cartProvider),
      body: Stack(
        children: [
          _buildPageContent(context, authService, cartProvider, isDesktop),
          if (!isDesktop && _currentPage == 'home' && cartProvider.itemCount > 0)
            Positioned(
              left: AppTheme.spaceLg,
              right: AppTheme.spaceLg,
              bottom: AppTheme.spaceLg,
              child: _buildMobileStickyCartCta(context, cartProvider),
            ),
          // ChatBot Widget - Doğrudan Stack child'ı
          ChatBotWidget(),
          // Live Chat Floating Button - Canlı destek
          LiveChatFloatingButton(),
        ],
      ),
    );
  }

  Future<void> _refreshProducts() async {
    // Yenileme işlemi burada yapılabilir
    await Future.delayed(const Duration(milliseconds: 1000));
    _loadProducts();
    return Future.value();
  }

  // Sayfa içeriğini göster
  Widget _buildPageContent(
      BuildContext context, AuthService authService, CartProvider cartProvider, bool isDesktop) {
    switch (_currentPage) {
      case 'about':
        return _buildAboutPage(context, isDesktop);
      case 'blog':
        return _buildBlogPage(context, isDesktop);
      case 'orders':
        return _buildOrdersPage(context, isDesktop);
      case 'home':
      default:
        return _buildHomePage(context, cartProvider, isDesktop);
    }
  }

  // Ana sayfa içeriği
  Widget _buildHomePage(BuildContext context, CartProvider cartProvider, bool isDesktop) {
    return RefreshIndicator(
      onRefresh: _refreshProducts,
      color: AppTheme.primaryColor,
      child: ListView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          // Dinamik Banner
          const PageBanner(page: 'home', height: 400),

          // Sepet özeti (eğer sepette ürün varsa)
          if (cartProvider.items.isNotEmpty) _buildCartSummary(context, cartProvider),

          // Ana içerik bölümü
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isDesktop ? AppTheme.pagePaddingDesktop : AppTheme.pagePaddingMobile,
              vertical: AppTheme.spaceLg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Kategoriler
                Center(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: CategoryList(
                      onCategorySelected: _onCategorySelected,
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Ürünler
                AnimatedContainer(
                  key: _productsKey,
                  duration: Duration(milliseconds: 500),
                  curve: Curves.easeInOut,
                  margin: const EdgeInsets.only(top: AppTheme.spaceXs),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _selectedCategory != null ? '$_selectedCategory' : 'Tüm Ürünler',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Row(
                            children: [
                              // Sıralama butonu
                              _buildSortButton(context),
                              SizedBox(width: 8),
                              // Filtre temizleme butonu
                              if (_selectedCategory != null)
                                TextButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _selectedCategory = null;
                                    });
                                    _filterProducts();
                                    _syncUrlState();
                                  },
                                  icon: const Icon(Icons.filter_alt_off),
                                  label: Text(
                                    AppTranslations.getTranslation(context, 'clearFilters'),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      if (_selectedCategory != null && _selectedCategory!.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: AppTheme.spaceXs,
                          children: [
                            InputChip(
                              avatar: const Icon(Icons.filter_alt, size: 18),
                              label: Text(
                                _selectedCategory!,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              onDeleted: () {
                                setState(() {
                                  _selectedCategory = null;
                                });
                                _filterProducts();
                                _syncUrlState();
                              },
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 16),
                      _buildProductList(context),
                    ],
                  ),
                ),

                const SizedBox(height: AppTheme.space3xl),

                // Bağlantı hatası göster
                if (_showConnectionError) _buildConnectionError(),

                // Hata göster
                if (_error != null) _buildError(),

                // Yükleniyor göster
                if (_isLoading) _buildLoading(),

                if (!isDesktop && cartProvider.itemCount > 0) const SizedBox(height: 96),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileStickyCartCta(BuildContext context, CartProvider cartProvider) {
    return Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      color: Theme.of(context).cardColor,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd, vertical: AppTheme.spaceSm),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${cartProvider.itemCount} ${AppTranslations.getTranslation(context, 'products')}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '${cartProvider.totalAmount.toStringAsFixed(2)} ₺',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppTheme.spaceXs),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(_createRoute(CartScreen()));
              },
              icon: const Icon(Icons.shopping_cart_checkout),
              label: Text(AppTranslations.getTranslation(context, 'goToCart')),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Hakkımızda sayfası içeriği
  Widget _buildAboutPage(BuildContext context, bool isDesktop) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Dinamik Banner
          const PageBanner(page: 'about', height: 300),

          // Hikayemiz
          Padding(
            padding: EdgeInsets.all(isDesktop ? AppTheme.pagePaddingDesktop : AppTheme.pagePaddingMobile),
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
            padding: EdgeInsets.all(isDesktop ? AppTheme.pagePaddingDesktop : AppTheme.pagePaddingMobile),
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
            padding: EdgeInsets.all(isDesktop ? AppTheme.pagePaddingDesktop : AppTheme.pagePaddingMobile),
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
        ],
      ),
    );
  }

  // Blog sayfası içeriği
  Widget _buildBlogPage(BuildContext context, bool isDesktop) {
    return BlogListScreen();
  }

  // Siparişler sayfası içeriği
  Widget _buildOrdersPage(BuildContext context, bool isDesktop) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(isDesktop ? AppTheme.pagePaddingDesktop : AppTheme.pagePaddingMobile),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_bag, size: 64, color: AppTheme.primaryColor),
            SizedBox(height: 16),
            Text(
              'Siparişlerim',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Sipariş geçmişiniz burada görünecek',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  // Mobil drawer menüsü
  Widget _buildDrawer(BuildContext context, AuthService authService, CartProvider cartProvider) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isAuthenticated = authService.isAuthenticated;
    final cartItemCount = cartProvider.itemCount;

    return Drawer(
      backgroundColor: isDark ? AppTheme.darkSurfaceColor : Colors.white,
      child: Column(
        children: [
          // Drawer Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: AppTheme.space2xl, horizontal: AppTheme.spaceLg),
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
                      Container(
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
                    Navigator.pop(context);
                    _setCurrentPage('home');
                  },
                  isDark: isDark,
                  isActive: _currentPage == 'home',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.info,
                  title: 'Hakkımızda',
                  onTap: () {
                    Navigator.pop(context);
                    _setCurrentPage('about');
                  },
                  isDark: isDark,
                  isActive: _currentPage == 'about',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.article,
                  title: 'Blog',
                  onTap: () {
                    Navigator.pop(context);
                    _setCurrentPage('blog');
                  },
                  isDark: isDark,
                  isActive: _currentPage == 'blog',
                ),
                if (isAuthenticated) ...[
                  _buildDrawerItem(
                    context,
                    icon: Icons.shopping_bag,
                    title: 'Siparişlerim',
                    onTap: () {
                      Navigator.pop(context);
                      _setCurrentPage('orders');
                    },
                    isDark: isDark,
                    isActive: _currentPage == 'orders',
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person,
                    title: 'Profil',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).pushNamed(ProfileScreen.routeName);
                    },
                    isDark: isDark,
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.shopping_cart,
                    title: 'Sepet',
                    badge: cartItemCount > 0 ? cartItemCount.toString() : null,
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => CartScreen()),
                      );
                    },
                    isDark: isDark,
                  ),
                ],
              ],
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
    required bool isDark,
    String? badge,
    bool isActive = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color:
            isActive ? AppTheme.primaryColor : (isDark ? AppTheme.darkTextColor : Colors.grey[700]),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          color:
              isActive ? AppTheme.primaryColor : (isDark ? AppTheme.darkTextColor : Colors.black87),
        ),
      ),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: Text(
                badge,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          : null,
      selected: isActive,
      selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
      onTap: onTap,
    );
  }

  // AppBar bileşeni
  PreferredSizeWidget _buildAppBar(BuildContext context, AuthService authService, bool isDesktop) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    // NotificationPositionProvider'dan konum bilgisini al
    final notificationPositionProvider = Provider.of<NotificationPositionProvider>(context);
    final notificationPosition = notificationPositionProvider.position;

    return AppBar(
      elevation: 0,
      backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
      title: isDesktop ? _buildDesktopMenu(context, authService) : null,
      // NotificationIconPosition'a göre leading widget'ını ayarlıyoruz
      leading: notificationPosition == NotificationIconPosition.start
          ? NotificationIcon(
              position: notificationPosition,
              iconColor: Theme.of(context).iconTheme.color,
              badgeColor: Colors.red,
              onTap: () => _showNotificationDialog(context, '/notifications'),
            )
          : null,
      actions: [
        // Bildirim simgesi end veya custom konumunda ise actions içinde gösterilir
        if (notificationPosition != NotificationIconPosition.start)
          Padding(
            padding: const EdgeInsets.only(right: AppTheme.spaceXxs),
            child: NotificationIcon(
              position: notificationPosition,
              iconColor: Theme.of(context).iconTheme.color,
              badgeColor: Colors.red,
              onTap: () => _showNotificationDialog(context, '/notifications'),
            ),
          ),

        // Sepet butonu
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.shopping_cart),
              tooltip: AppTranslations.getTranslation(context, 'cart'),
              onPressed: () {
                _showCartPopup(context);
              },
            ),
            Positioned(
              right: 8,
              top: 8,
              child: Consumer<CartProvider>(
                builder: (ctx, cart, _) => cart.itemCount > 0
                    ? Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '${cart.itemCount}',
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      )
                    : const SizedBox(),
              ),
            ),
          ],
        ),

        // Giriş/Kayıt veya Profil butonu
        authService.isAuthenticated
            ? InkWell(
                onTap: () {
                  Navigator.of(context).pushNamed(ProfileScreen.routeName);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                        backgroundImage: authService.currentUser?.profileImageUrl != null
                            ? NetworkImage(authService.currentUser!.profileImageUrl!)
                            : null,
                        child: authService.currentUser?.profileImageUrl == null
                            ? Text(
                                authService.currentUser?.fullName.isNotEmpty == true
                                    ? authService.currentUser!.fullName[0].toUpperCase()
                                    : 'K',
                                style: TextStyle(
                                  color: AppTheme.primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      if (isDesktop) ...[
                        SizedBox(width: 8),
                        Text(
                          authService.currentUser?.fullName ?? 'Kullanıcı',
                          style: TextStyle(
                            color: Theme.of(context).textTheme.bodyLarge?.color,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              )
            : PopupMenuButton(
                icon: Icon(Icons.account_circle, color: Theme.of(context).iconTheme.color),
                tooltip: 'Hesap',
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'login',
                    child: Row(
                      children: [
                        Icon(Icons.login, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(AppTranslations.getTranslation(context, 'login')),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'register',
                    child: Row(
                      children: [
                        Icon(Icons.person_add, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(AppTranslations.getTranslation(context, 'register')),
                      ],
                    ),
                  ),
                ],
                onSelected: (value) {
                  if (value == 'login') {
                    Navigator.of(context).pushNamed(LoginScreen.routeName);
                  } else if (value == 'register') {
                    Navigator.of(context).pushNamed(RegisterScreen.routeName);
                  }
                },
              ),

        // WhatsApp butonu
        IconButton(
          icon: FaIcon(
            FontAwesomeIcons.whatsapp,
            color: Color(0xFF25D366),
            size: 24,
          ),
          tooltip: 'WhatsApp ile İletişim',
          onPressed: () {
            _launchWhatsApp(context);
          },
        ),

        // YouTube butonu
        IconButton(
          icon: FaIcon(
            FontAwesomeIcons.youtube,
            color: Color(0xFFFF0000),
            size: 24,
          ),
          tooltip: 'YouTube Kanalımız',
          onPressed: () {
            _launchYouTube(context);
          },
        ),

        // Tema değiştirme butonu
        IconButton(
          icon: Icon(
            isDarkMode ? Icons.wb_sunny_outlined : Icons.nightlight_round,
            color: Theme.of(context).iconTheme.color,
          ),
          tooltip: isDarkMode ? 'Aydınlık Tema' : 'Karanlık Tema',
          onPressed: () {
            _toggleTheme(context);
          },
        ),

        // Dil seçici
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
          child: SizedBox.shrink(), // Dil seçici kaldırıldı
        ),
      ],
    );
  }

  // Masaüstü için üst menü
  Widget _buildDesktopMenu(BuildContext context, AuthService authService) {
    final isAuthenticated = authService.isAuthenticated;
    final isAdmin = isAuthenticated && authService.currentUser?.isAdmin == true;

    return Row(
      children: [
        // Anasayfa
        _buildMenuButton(
          context,
          AppTranslations.getTranslation(context, 'home'),
          Icons.home,
          () => _setCurrentPage('home'),
          isActive: _currentPage == 'home',
        ),

        // Hakkımızda
        _buildMenuButton(
          context,
          AppTranslations.getTranslation(context, 'about'),
          Icons.info_outline,
          () => _setCurrentPage('about'),
          isActive: _currentPage == 'about',
        ),

        // Blog
        _buildMenuButton(
          context,
          AppTranslations.getTranslation(context, 'blog'),
          Icons.article,
          () => _setCurrentPage('blog'),
          isActive: _currentPage == 'blog',
        ),

        // Siparişlerim (sadece giriş yapmış kullanıcılar için)
        if (isAuthenticated)
          _buildMenuButton(
            context,
            AppTranslations.getTranslation(context, 'myOrders'),
            Icons.shopping_bag,
            () => _setCurrentPage('orders'),
            isActive: _currentPage == 'orders',
          ),
      ],
    );
  }

  // Menü butonu oluşturma yardımcı metodu
  Widget _buildMenuButton(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap, {
    Color? iconColor,
    bool isActive = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: iconColor ?? (isActive ? AppTheme.primaryColor : null),
              ),
              SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                  color: isActive ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Animasyonlu banner widget'ı
  Widget _buildBanner(BuildContext context) {
    String bannerTitle = AppTranslations.getTranslation(context, 'heroTitle');
    String bannerDescription = AppTranslations.getTranslation(context, 'heroSubtitle');
    String bannerImage =
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';

    // Seçilen kategoriye göre banner içeriğini değiştir
    if (_selectedCategory != null) {
      switch (_selectedCategory) {
        case 'Ekmek Çeşitleri':
          bannerTitle = AppTranslations.getTranslation(context, 'breadTypes');
          bannerDescription = AppTranslations.getTranslation(context, 'breadDescription');
          bannerImage =
              'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
          break;
        case 'Pastane Ürünleri':
          bannerTitle = AppTranslations.getTranslation(context, 'specialProducts');
          bannerDescription = AppTranslations.getTranslation(context, 'specialProductsDescription');
          bannerImage =
              'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
          break;
        case 'Şarküteri Ürünleri':
          bannerTitle = AppTranslations.getTranslation(context, 'delicatessen');
          bannerDescription = AppTranslations.getTranslation(context, 'delicatessenDescription');
          bannerImage =
              'https://images.unsplash.com/photo-1551782450-17144efb9c50?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
          break;
        default:
          // Varsayılan banner içeriği
          break;
      }
    }

    return AnimatedContainer(
      duration: Duration(milliseconds: 500),
      curve: Curves.easeInOut,
      width: double.infinity,
      height: 400,
      decoration: BoxDecoration(
        image: DecorationImage(
          image: NetworkImage(bannerImage),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(
            Colors.black.withValues(alpha: 0.4),
            BlendMode.darken,
          ),
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              bannerTitle,
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                shadows: [
                  Shadow(
                    blurRadius: 10,
                    color: Colors.black.withValues(alpha: 0.5),
                    offset: Offset(2, 2),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),
            Text(
              bannerDescription,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                color: Colors.white,
                shadows: [
                  Shadow(
                    blurRadius: 8,
                    color: Colors.black.withValues(alpha: 0.5),
                    offset: Offset(1, 1),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                // Ürünler bölümüne kaydır
                Scrollable.ensureVisible(
                  _productsKey.currentContext!,
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.easeInOut,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.space2xl, vertical: AppTheme.spaceMd),
              ),
              child: Text(AppTranslations.getTranslation(context, 'browseProducts')),
            ),
          ],
        ),
      ),
    );
  }

  // Ürün listesi bileşeni
  Widget _buildProductList(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isMobile = deviceType == DeviceType.mobile;

    // Mobil cihazlarda yatay kaydırma, diğerlerinde grid görünümü
    if (isMobile) {
      // Ekran genişliğini alalım
      final screenWidth = MediaQuery.of(context).size.width;
      // Ekranın kenar boşluğunu azaltalım
      final horizontalPadding = screenWidth * 0.02; // %2 kenar boşluğu (toplam %4)

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_filteredProducts.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spaceXl),
                child: Column(
                  children: [
                    Icon(Icons.search_off, size: 48, color: Colors.grey),
                    SizedBox(height: 16),
                    Text(
                      _selectedCategory != null && _selectedCategory!.isNotEmpty
                          ? AppTranslations.getTranslation(context, 'noProductsForFilter')
                          : AppTranslations.getTranslation(context, 'noProductsFound'),
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                      textAlign: TextAlign.center,
                    ),
                    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _selectedCategory = null;
                          });
                          _filterProducts();
                          _syncUrlState();
                        },
                        icon: const Icon(Icons.restart_alt),
                        label: Text(AppTranslations.getTranslation(context, 'clearFilters')),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            Container(
              height: 380, // Yüksekliği artırdım
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: AppTheme.spaceSm),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _filteredProducts.length,
                itemBuilder: (context, index) {
                  return _buildProductCard(_filteredProducts[index], context);
                },
              ),
            ),
        ],
      );
    } else {
      // Masaüstü ve tablet için grid görünümü
      return Container(
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: _filteredProducts.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppTheme.space4xl),
                  child: Column(
                    children: [
                      Icon(Icons.search_off, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        _selectedCategory != null && _selectedCategory!.isNotEmpty
                            ? AppTranslations.getTranslation(context, 'noProductsForFilter')
                            : AppTranslations.getTranslation(context, 'noProductsFound'),
                        style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                        textAlign: TextAlign.center,
                      ),
                      if (_selectedCategory != null && _selectedCategory!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _selectedCategory = null;
                            });
                            _filterProducts();
                            _syncUrlState();
                          },
                          icon: const Icon(Icons.restart_alt),
                          label: Text(AppTranslations.getTranslation(context, 'clearFilters')),
                        ),
                      ],
                    ],
                  ),
                ),
              )
            : GridView.builder(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isDesktop ? 6 : 4,
                  childAspectRatio: 0.7, // Kartları daha kompakt hale getiriyorum
                  crossAxisSpacing: 8, // Boşlukları azaltıyorum
                  mainAxisSpacing: 8,
                ),
                itemCount: _filteredProducts.length,
                itemBuilder: (ctx, index) {
                  return _buildProductCard(_filteredProducts[index], context);
                },
              ),
      );
    }
  }

  // Ürün kartı widget'ı
  Widget _buildProductCard(Product product, BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isMobile = deviceType == DeviceType.mobile;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    // Ürün için özel etiketleri belirle
    final bool isNew = product.id.hashCode % 5 == 0; // Örnek: Bazı ürünleri "Yeni" olarak işaretle
    final bool isBestSeller =
        product.id.hashCode % 7 == 0; // Örnek: Bazı ürünleri "Çok Satan" olarak işaretle
    final bool isLimitedStock =
        product.id.hashCode % 11 == 0; // Örnek: Bazı ürünleri "Sınırlı Stok" olarak işaretle

    // Ürün derecelendirmesi (1-5 arası)
    final double rating = (product.id.hashCode % 50) / 10 + 3.0; // 3.0 ile 8.0 arası bir değer
    final double normalizedRating = rating > 5.0 ? 5.0 : rating; // 5.0'dan büyükse 5.0'a sabitle
    final int fullStars = normalizedRating.floor(); // Tam yıldız sayısı
    final bool hasHalfStar = normalizedRating - fullStars >= 0.5; // Yarım yıldız var mı?
    final int reviewCount = (product.id.hashCode % 100) + 10; // Yorum sayısı (10-109 arası)

    return Container(
      width: isMobile ? 220 : null,
      margin: isMobile ? const EdgeInsets.only(right: AppTheme.spaceLg) : null,
      child: ProductCard(
        product: product,
        isDarkMode: isDarkMode,
      ),
    );
  }

  // Kategori seçildiğinde çağrılacak metod
  void _onCategorySelected(String category) {
    setState(() {
      _selectedCategory = category.isEmpty ? null : category;
    });

    // Ürünleri filtreleme işlemini çağır
    _filterProducts();
    _syncUrlState();

    // Ürünler bölümüne kaydır
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_productsKey.currentContext != null) {
        Scrollable.ensureVisible(
          _productsKey.currentContext!,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  // Sepet özeti widget'ı
  Widget _buildCartSummary(BuildContext context, CartProvider cartProvider) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final total = cartProvider.totalAmount;
    final itemCount = cartProvider.itemCount;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXl, vertical: AppTheme.spaceMd),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : Colors.grey.shade50,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                Icons.shopping_cart,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                '$itemCount ${AppTranslations.getTranslation(context, 'products')}',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          Row(
            children: [
              Text(
                '${total.toStringAsFixed(2)} ₺',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              SizedBox(width: 12),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(_createRoute(CartScreen()));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceXs),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                ),
                child: Text(AppTranslations.getTranslation(context, 'goToCart')),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  // Sıralama butonu
  Widget _buildSortButton(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopupMenuButton<Map<String, dynamic>>(
      icon: Icon(
        Icons.sort,
        color: isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor,
      ),
      tooltip: AppTranslations.getTranslation(context, 'sortBy'),
      onSelected: (value) {
        _changeSortOption(value['sortBy'], value['ascending']);
      },
      itemBuilder: (context) => [
        // İsme göre sıralama
        PopupMenuItem(
          value: {'sortBy': 'name', 'ascending': true},
          child: Row(
            children: [
              Icon(
                Icons.sort_by_alpha,
                color: _sortBy == 'name' && _ascending ? AppTheme.primaryColor : null,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                '${AppTranslations.getTranslation(context, 'sortByName')} (A-Z)',
                style: TextStyle(
                  fontWeight: _sortBy == 'name' && _ascending ? FontWeight.bold : FontWeight.normal,
                  color: _sortBy == 'name' && _ascending ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: {'sortBy': 'name', 'ascending': false},
          child: Row(
            children: [
              Icon(
                Icons.sort_by_alpha,
                color: _sortBy == 'name' && !_ascending ? AppTheme.primaryColor : null,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                '${AppTranslations.getTranslation(context, 'sortByName')} (Z-A)',
                style: TextStyle(
                  fontWeight:
                      _sortBy == 'name' && !_ascending ? FontWeight.bold : FontWeight.normal,
                  color: _sortBy == 'name' && !_ascending ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
        // Fiyata göre sıralama
        PopupMenuItem(
          value: {'sortBy': 'price', 'ascending': true},
          child: Row(
            children: [
              Icon(
                Icons.arrow_upward,
                color: _sortBy == 'price' && _ascending ? AppTheme.primaryColor : null,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                '${AppTranslations.getTranslation(context, 'sortByPrice')} (${AppTranslations.getTranslation(context, 'ascending')})',
                style: TextStyle(
                  fontWeight:
                      _sortBy == 'price' && _ascending ? FontWeight.bold : FontWeight.normal,
                  color: _sortBy == 'price' && _ascending ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: {'sortBy': 'price', 'ascending': false},
          child: Row(
            children: [
              Icon(
                Icons.arrow_downward,
                color: _sortBy == 'price' && !_ascending ? AppTheme.primaryColor : null,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                '${AppTranslations.getTranslation(context, 'sortByPrice')} (${AppTranslations.getTranslation(context, 'descending')})',
                style: TextStyle(
                  fontWeight:
                      _sortBy == 'price' && !_ascending ? FontWeight.bold : FontWeight.normal,
                  color: _sortBy == 'price' && !_ascending ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
        // Popülerliğe göre sıralama
        PopupMenuItem(
          value: {'sortBy': 'popularity', 'ascending': false},
          child: Row(
            children: [
              Icon(
                Icons.trending_up,
                color: _sortBy == 'popularity' && !_ascending ? AppTheme.primaryColor : null,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                AppTranslations.getTranslation(context, 'sortByPopularity'),
                style: TextStyle(
                  fontWeight:
                      _sortBy == 'popularity' && !_ascending ? FontWeight.bold : FontWeight.normal,
                  color: _sortBy == 'popularity' && !_ascending ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Hızlı görüntüleme dialogunu göster
  void _showQuickViewDialog(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (ctx) => QuickViewDialog(
        product: product,
        onAddToCart: () => _addToCart(product, context),
      ),
    );
  }

  // Banner animasyonu
  void _animateBanner() {
    Future.delayed(Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _bannerOpacity = 1.0;
        });
      }
    });
  }

  // Bağlantı hatası göster
  Widget _buildConnectionError() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      margin: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: Colors.orange),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off, color: Colors.orange),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Çevrimdışı mod: İnternet bağlantısı yok. Önbelleğe alınmış veriler gösteriliyor.',
              style: TextStyle(color: Colors.orange[800]),
            ),
          ),
          TextButton(
            onPressed: () {
              final connectionService = Provider.of<ConnectionService>(context, listen: false);
              connectionService.checkConnection().then((isOnline) {
                if (isOnline) {
                  _loadProducts();
                }
              });
            },
            child: Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  // Hata göster
  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceLg),
      margin: const EdgeInsets.all(AppTheme.spaceLg),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        border: Border.all(color: Colors.red),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              _error ?? 'Ürünler yüklenirken bir hata oluştu.',
              style: TextStyle(color: Colors.red[800]),
            ),
          ),
          TextButton(
            onPressed: () {
              _loadProducts();
            },
            child: Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  // Yükleniyor göster
  Widget _buildLoading() {
    // Modern skeleton loading ekranı
    return SkeletonGrid(
      itemCount: 6,
      crossAxisCount: MediaQuery.of(context).size.width > 900 ? 4 : 2,
      childAspectRatio: 0.75,
    );
  }

  // Sepete ekleme işlemi
  void _addToCart(Product product, BuildContext context) {
    final cart = Provider.of<CartProvider>(context, listen: false);
    cart.addItem(product);
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} sepete eklendi'),
        duration: Duration(seconds: 2),
        action: SnackBarAction(
          label: AppTranslations.getTranslation(context, 'cancel'),
          onPressed: () {
            cart.removeSingleItem(product.id);
          },
        ),
      ),
    );
  }

  // Ürünleri filtreleme
  void _filterProducts() {
    final productService = Provider.of<ProductService>(context, listen: false);
    final products = productService.products;

    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      _filteredProducts = products.where((p) => p.category == _selectedCategory).toList();
    } else {
      _filteredProducts = products;
    }

    // Ürünleri sırala
    _sortProducts();

    if (mounted) {
      setState(() {});
    }
  }

  // Ürünleri sıralama
  void _sortProducts() {
    switch (_sortBy) {
      case 'name':
        _filteredProducts
            .sort((a, b) => _ascending ? a.name.compareTo(b.name) : b.name.compareTo(a.name));
        break;
      case 'price':
        _filteredProducts
            .sort((a, b) => _ascending ? a.price.compareTo(b.price) : b.price.compareTo(a.price));
        break;
      case 'popularity':
        // Örnek olarak, popülerlik için id'yi kullanıyoruz
        // Gerçek uygulamada bu, ürünün satış sayısı veya yıldız sayısı olabilir
        _filteredProducts.sort((a, b) => _ascending ? a.id.compareTo(b.id) : b.id.compareTo(a.id));
        break;
    }
  }

  // Sıralama seçeneğini değiştir
  void _changeSortOption(String sortBy, bool ascending) {
    setState(() {
      _sortBy = sortBy;
      _ascending = ascending;
    });
    _sortProducts();
  }

  // Tema değiştirme metodu
  void _toggleTheme(BuildContext context) {
    // Provider'ı kullanarak tema değiştirme
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    themeProvider.toggleTheme();

    // Kullanıcıya bilgi ver
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          themeProvider.themeMode == ThemeMode.dark
              ? AppTranslations.getTranslation(context, 'darkThemeApplied')
              : AppTranslations.getTranslation(context, 'lightThemeApplied'),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // Ürünleri yükle
  Future<void> _loadProducts() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final productService = Provider.of<ProductService>(context, listen: false);

      // Firestore'dan ürünleri çek
      await productService.getProducts();

      // Ürünleri filtreleme işlemini çağır
      _filterProducts();

      setState(() {
        _isLoading = false;
        _isInitialized = true; // Ürünler yüklendikten sonra initialized olarak işaretle
      });
    } catch (e) {
      Logger.error('Ürün kontrolü sırasında hata: $e');
      setState(() {
        _error = 'Ürünler yüklenirken bir hata oluştu: $e';
        _isLoading = false;
        _isInitialized = true; // Hata oluşsa bile initialized olarak işaretle
      });
    }
  }

  // Kategorileri yükle
  void _loadCategories() {
    // Bu metot şu anda sadece bir yer tutucu
    // Gerçek uygulamada burada kategoriler yüklenebilir
    Logger.info('Kategoriler yükleniyor...');
  }

  // Sepet açılır penceresi
  void _showCartPopup(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        ),
        child: Container(
          width: 320,
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: StatefulBuilder(
            builder: (context, setState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Sepetiniz',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textDarkColor,
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ).animate().fadeIn(duration: 300.ms),
                  Divider(),
                  if (cartProvider.items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXl),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.shopping_cart_outlined, size: 50, color: Colors.grey),
                            SizedBox(height: 10),
                            Text(
                              'Sepetiniz boş',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(duration: 300.ms)
                  else
                    SizedBox(
                      height: cartProvider.items.length > 3 ? 300 : null,
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: cartProvider.items.length > 5 ? 5 : cartProvider.items.length,
                        itemBuilder: (ctx, index) {
                          final cartItem = cartProvider.items.values.toList()[index];
                          final product = cartItem.product;
                          final productId = cartProvider.items.keys.toList()[index];

                          return Dismissible(
                            key: ValueKey(productId),
                            background: Container(
                              color: Colors.red,
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: AppTheme.spaceXl),
                              margin: EdgeInsets.symmetric(vertical: AppTheme.spaceXxs),
                              child: Icon(
                                Icons.delete,
                                color: Colors.white,
                                size: 30,
                              ),
                            ),
                            direction: DismissDirection.endToStart,
                            confirmDismiss: (direction) async {
                              return await showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: Text('Emin misiniz?'),
                                  content: Text(
                                      'Bu ürünü sepetten kaldırmak istediğinize emin misiniz?'),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.of(ctx).pop(false),
                                      child: Text('Hayır'),
                                    ),
                                    TextButton(
                                      onPressed: () => Navigator.of(ctx).pop(true),
                                      child: Text('Evet'),
                                    ),
                                  ],
                                ),
                              );
                            },
                            onDismissed: (direction) {
                              cartProvider.removeItem(productId);
                              _showAnimatedSnackBar(context, 'Ürün sepetten kaldırıldı',
                                  isSuccess: true);
                              setState(() {}); // Dialog'u yeniden oluştur
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXs),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                    child: Image.network(
                                      product.imageUrl,
                                      width: 50,
                                      height: 50,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.name,
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Row(
                                          children: [
                                            // Miktar ayarlama butonları
                                            Container(
                                              height: 24,
                                              decoration: BoxDecoration(
                                                border: Border.all(color: Colors.grey.shade300),
                                                borderRadius: BorderRadius.circular(AppTheme.spaceXxs),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  // Azaltma butonu
                                                  InkWell(
                                                    onTap: () {
                                                      if (cartItem.quantity > 1) {
                                                        cartProvider.decreaseQuantity(productId);
                                                        setState(() {}); // Dialog'u güncelle
                                                      } else {
                                                        cartProvider.removeItem(productId);
                                                        setState(() {}); // Dialog'u güncelle
                                                      }
                                                    },
                                                    child: Container(
                                                      width: 24,
                                                      height: 24,
                                                      alignment: Alignment.center,
                                                      child: Icon(
                                                        Icons.remove,
                                                        size: 16,
                                                        color: Colors.grey[700],
                                                      ),
                                                    ),
                                                  ),
                                                  // Miktar
                                                  Container(
                                                    width: 24,
                                                    height: 24,
                                                    alignment: Alignment.center,
                                                    decoration: BoxDecoration(
                                                      border: Border(
                                                        left:
                                                            BorderSide(color: Colors.grey.shade300),
                                                        right:
                                                            BorderSide(color: Colors.grey.shade300),
                                                      ),
                                                    ),
                                                    child: Text(
                                                      '${cartItem.quantity}',
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                  // Artırma butonu
                                                  InkWell(
                                                    onTap: () {
                                                      cartProvider.increaseQuantity(productId);
                                                      setState(() {}); // Dialog'u güncelle
                                                    },
                                                    child: Container(
                                                      width: 24,
                                                      height: 24,
                                                      alignment: Alignment.center,
                                                      child: Icon(
                                                        Icons.add,
                                                        size: 16,
                                                        color: Colors.grey[700],
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            SizedBox(width: 8),
                                            Text(
                                              '${product.price.toStringAsFixed(2)}₺',
                                              style: TextStyle(
                                                color: Colors.grey[600],
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '${(product.price * cartItem.quantity).toStringAsFixed(2)}₺',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            )
                                .animate(delay: Duration(milliseconds: 50 * index))
                                .fadeIn(duration: 200.ms),
                          );
                        },
                      ),
                    ),
                  if (cartProvider.items.length > 5)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXs),
                      child: Center(
                        child: Text(
                          '... ve ${cartProvider.items.length - 5} ürün daha',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ),
                  if (cartProvider.items.isNotEmpty) ...[
                    Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Toplam:',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${cartProvider.totalAmount.toStringAsFixed(2)}₺',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ).animate().fadeIn(duration: 300.ms),
                    SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          flex: 1,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              Navigator.of(context).push(_createRoute(CartScreen()));
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey[200],
                              foregroundColor: AppTheme.textDarkColor,
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                            ),
                            child: Text(
                              'Sepete Git',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              Navigator.of(context).push(_createRoute(CartScreen()));
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                            ),
                            child: Text(
                              'Ödemeye Geç',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ).animate().fadeIn(duration: 300.ms),
                  ],
                ],
              );
            },
          ),
        ).animate().fadeIn(duration: 300.ms).scaleXY(begin: 0.9, end: 1.0),
      ),
    );
  }

  void _showNotificationDialog(BuildContext context, String route) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        ),
        child: Container(
          width: 320,
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Yeni Bildirim',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.textDarkColor,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ).animate().fadeIn(duration: 300.ms),
              Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                child: Text(
                  'Siparişinizle ilgili yeni bir güncelleme var!',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16),
                ),
              ),
              SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: Text('Kapat'),
                  ),
                  SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      Navigator.of(context).pushNamed(route);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                    ),
                    child: Text('Görüntüle'),
                  ),
                ],
              ),
            ],
          ),
        ).animate().fadeIn(duration: 300.ms).scaleXY(begin: 0.9, end: 1.0),
      ),
    );
  }

  // Sayfalar arası geçiş animasyonlarını ekle
  Route<dynamic> _createRoute(Widget page) {
    return PageRouteBuilder(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(1.0, 0.0);
        const end = Offset.zero;
        const curve = Curves.easeInOut;

        var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        var offsetAnimation = animation.drive(tween);

        return SlideTransition(position: offsetAnimation, child: child);
      },
      transitionDuration: const Duration(milliseconds: 300),
    );
  }

  // AnimasyonluSnackBar gösterme
  void _showAnimatedSnackBar(BuildContext context, String message, {bool isSuccess = true}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isSuccess ? Icons.check_circle : Icons.error_outline,
              color: Colors.white,
            ),
            SizedBox(width: 10),
            Text(message),
          ],
        ).animate().fadeIn(duration: 300.ms).slideX(begin: -0.1, end: 0),
        backgroundColor: isSuccess ? AppTheme.primaryColor : Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppTheme.spaceSm),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusSm)),
      ),
    );
  }

  // WhatsApp'ı aç
  Future<void> _launchWhatsApp(BuildContext context) async {
    try {
      // Platform kontrolü yapmadan direkt URL'yi aç
      // Android'de WhatsApp uygulamasını, web'de web.whatsapp.com'u açar
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
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  // YouTube kanalını aç
  Future<void> _launchYouTube(BuildContext context) async {
    try {
      final youtubeUrl = Uri.parse('https://www.youtube.com/@EkmekLab');

      if (await canLaunchUrl(youtubeUrl)) {
        await launchUrl(
          youtubeUrl,
          mode: LaunchMode.externalApplication,
        );
      } else {
        throw Exception('YouTube açılamadı');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('YouTube kanalı açılamadı'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }
}
