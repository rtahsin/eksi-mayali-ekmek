// ignore_for_file: prefer_const_constructors, use_super_parameters, unused_field, unused_local_variable, unused_import, prefer_final_fields

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../data/blog_data.dart';
import '../models/blog_post.dart';
import '../theme/app_theme.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../utils/logger.dart';
import '../widgets/app_loading_indicator.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/page_banner.dart';
import 'blog_detail_screen.dart';

/// Blog yazılarının listelendiği ekran.
/// Kullanıcıların blog yazılarını kategorilere göre filtreleyebilmesini
/// ve yazıları detaylı görüntüleyebilmesini sağlar.
class BlogListScreen extends StatefulWidget {
  static const routeName = '/blog';

  const BlogListScreen({Key? key}) : super(key: key);

  @override
  State<BlogListScreen> createState() => _BlogListScreenState();
}

class _BlogListScreenState extends State<BlogListScreen> {
  String _selectedCategory = '';
  List<String> _categories = ['Tümü', 'Tarifler', 'Sağlık', 'Püf Noktaları', 'Haberler'];
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isSearching = false;
  bool _isLoading = true;
  String _errorMessage = '';
  List<BlogPost> _blogPosts = [];

  @override
  void initState() {
    super.initState();
    _loadBlogPosts();
    _loadCategories();
  }

  /// Blog yazılarını Firestore'dan yükle
  Future<void> _loadBlogPosts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      // Önce tüm blogları çek, sonra client-side filtrele ve sırala
      final snapshot =
          await FirebaseFirestore.instance.collection(FirestoreCollections.blogs).get();

      final blogs = snapshot.docs
          .map((doc) {
            final data = doc.data();
            data['id'] = doc.id;
            return BlogPost.fromJson(data);
          })
          .where((blog) => blog.published) // Client-side filter
          .toList();

      // Client-side sorting
      blogs.sort((a, b) => b.date.compareTo(a.date));

      setState(() {
        _blogPosts = blogs;
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('Blog yazıları yüklenirken hata: $e');
      setState(() {
        _errorMessage = 'Blog yazıları yüklenirken bir hata oluştu.';
        _isLoading = false;
        // Hata durumunda demo verileri göster
        _blogPosts = BlogData.getBlogPosts();
      });
    }
  }

  /// Kategorileri Firestore'dan yükle
  Future<void> _loadCategories() async {
    try {
      final snapshot =
          await FirebaseFirestore.instance.collection(FirestoreCollections.blogs).get();

      final blogs = snapshot.docs.map((doc) {
        final data = doc.data();
        return data['category'] as String;
      }).toList();

      // Benzersiz kategorileri al
      final uniqueCategories = [
        'Tümü',
        ...{...blogs}
      ];

      setState(() {
        _categories = uniqueCategories;
      });
    } catch (e) {
      Logger.error('Kategoriler yüklenirken hata: $e');
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    // Ekran genişliğine göre padding değerini ayarla
    final horizontalPadding =
        isDesktop ? MediaQuery.of(context).size.width * 0.2 : (isTablet ? 60.0 : 24.0);

    // Kategoriye ve arama sorgusuna göre filtrelenmiş blog yazıları
    List<BlogPost> filteredBlogPosts = _blogPosts;

    // Kategori filtreleme
    if (_selectedCategory != '' && _selectedCategory != 'Tümü') {
      filteredBlogPosts =
          filteredBlogPosts.where((post) => post.category == _selectedCategory).toList();
    }

    // Arama filtreleme
    if (_searchQuery.isNotEmpty) {
      filteredBlogPosts = filteredBlogPosts
          .where((post) =>
              post.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              post.summary.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              post.content.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              post.author.toLowerCase().contains(_searchQuery.toLowerCase()))
          .toList();
    }

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Blog Yazılarımız',
        showBackButton: true,
        actions: [
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search),
            onPressed: () {
              setState(() {
                _isSearching = !_isSearching;
                if (!_isSearching) {
                  _searchController.clear();
                  _searchQuery = '';
                }
              });
            },
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: AppLoadingIndicator())
          : _errorMessage.isNotEmpty && _blogPosts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      SizedBox(height: 16),
                      Text(
                        _errorMessage,
                        style: TextStyle(fontSize: 16, color: Colors.red[700]),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _loadBlogPosts,
                        icon: Icon(Icons.refresh),
                        label: Text('Tekrar Dene'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.space2xl, vertical: AppTheme.spaceMd),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Arama çubuğu - sadece arama modunda göster
                    if (_isSearching)
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: AppTheme.spaceXs),
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Blog yazılarında ara...',
                            prefixIcon: Icon(Icons.search),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                              borderSide: BorderSide(color: AppTheme.primaryColor),
                            ),
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            contentPadding: EdgeInsets.symmetric(vertical: AppTheme.spaceZero),
                          ),
                          onChanged: (value) {
                            setState(() {
                              _searchQuery = value;
                            });
                          },
                        ),
                      ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.1, end: 0),

                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _loadBlogPosts,
                        child: SingleChildScrollView(
                          physics: AlwaysScrollableScrollPhysics(),
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildHeader(context),
                                const SizedBox(height: 24),

                                // Kategori filtreleme
                                _buildCategoryFilter(),
                                const SizedBox(height: 24),

                                // Sonuç sayısı
                                if (_searchQuery.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: AppTheme.spaceLg),
                                    child: Text(
                                      '"$_searchQuery" için ${filteredBlogPosts.length} sonuç bulundu',
                                      style: TextStyle(
                                        color: Colors.grey[600],
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ),

                                // Blog yazıları listesi
                                filteredBlogPosts.isEmpty
                                    ? _buildEmptyState()
                                    : _buildBlogList(filteredBlogPosts),

                                const SizedBox(height: 40),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  /// Başlık ve alt başlık widget'ı
  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Text(
          'Ekşi Maya Dünyasına Hoş Geldiniz',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        )
            .animate()
            .fadeIn(duration: 600.ms)
            .slideY(begin: 0.2, end: 0, curve: Curves.easeOutQuad, duration: 600.ms),
        const SizedBox(height: 8),
        Text(
          'Ekşi maya ve ekmek yapımı hakkında bilgi ve tarifler',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.grey[700],
              ),
        ).animate().fadeIn(duration: 600.ms, delay: 200.ms).slideY(
              begin: 0.2,
              end: 0,
              curve: Curves.easeOutQuad,
              duration: 600.ms,
              delay: 200.ms,
            ),
      ],
    );
  }

  /// Kategori filtreleme widget'ı
  Widget _buildCategoryFilter() {
    return SizedBox(
      height: 50,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final category = _categories[index];
          final isSelected =
              _selectedCategory == category || (category == 'Tümü' && _selectedCategory == '');

          return Padding(
            padding: const EdgeInsets.only(right: AppTheme.spaceMd),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedCategory = category == 'Tümü' ? '' : category;
                });
              },
              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXl, vertical: AppTheme.spaceSm),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primaryColor : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppTheme.primaryColor.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: Offset(0, 3),
                          )
                        ]
                      : null,
                ),
                child: Text(
                  category,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey[800],
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          ).animate().fadeIn(duration: 400.ms, delay: (index * 100).ms);
        },
      ),
    );
  }

  /// Sonuç bulunamadı durumu
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppTheme.space6xl),
        child: Column(
          children: [
            Icon(
              Icons.search_off,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Sonuç bulunamadı',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty
                  ? 'Farklı anahtar kelimeler deneyin'
                  : 'Bu kategoride henüz blog yazısı bulunmuyor',
              style: TextStyle(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Blog yazıları listesi widget'ı - Feed formatında
  Widget _buildBlogList(List<BlogPost> blogPosts) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    // Masaüstü için 2 kolon grid, tablet/mobil için liste
    if (isDesktop) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.2,
          crossAxisSpacing: 24,
          mainAxisSpacing: 24,
        ),
        itemCount: blogPosts.length,
        itemBuilder: (ctx, index) {
          final post = blogPosts[index];
          final delay = (index * 100).ms;
          return _buildModernFeedCard(post, delay, index);
        },
      );
    } else {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: blogPosts.length,
        separatorBuilder: (ctx, index) => const SizedBox(height: 16),
        itemBuilder: (ctx, index) {
          final post = blogPosts[index];
          final delay = (index * 100).ms;
          return _buildModernFeedCard(post, delay, index);
        },
      );
    }
  }

  /// Modern feed card - Instagram/Twitter benzeri tasarım
  Widget _buildModernFeedCard(BlogPost post, Duration delay, int index) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final cardHeight = isMobile ? 480.0 : 420.0;

    return Hero(
      tag: 'blog_${post.id}',
      child: Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radius2xl),
          side: BorderSide(color: Colors.grey.shade200, width: 1),
        ),
        child: InkWell(
          onTap: () {
            Navigator.of(context).push(
              PageRouteBuilder(
                pageBuilder: (context, animation, secondaryAnimation) =>
                    BlogDetailScreen(post: post),
                transitionsBuilder: (context, animation, secondaryAnimation, child) {
                  const begin = Offset(1.0, 0.0);
                  const end = Offset.zero;
                  const curve = Curves.easeInOutCubic;
                  var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
                  return SlideTransition(
                    position: animation.drive(tween),
                    child: child,
                  );
                },
                transitionDuration: const Duration(milliseconds: 400),
              ),
            );
          },
          borderRadius: BorderRadius.circular(AppTheme.radius2xl),
          child: SizedBox(
            height: cardHeight,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header - Yazar bilgisi
                Padding(
                  padding: const EdgeInsets.all(AppTheme.spaceLg),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                        child: Text(
                          post.author[0].toUpperCase(),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              post.author,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(Icons.access_time, size: 12, color: Colors.grey[600]),
                                const SizedBox(width: 4),
                                Text(
                                  DateFormat('dd MMM yyyy', 'tr_TR').format(post.date),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceMd,
                          vertical: AppTheme.space2xs,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                        ),
                        child: Text(
                          post.category,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Görsel
                ClipRRect(
                  borderRadius: const BorderRadius.all(Radius.circular(0)),
                  child: Image.network(
                    post.imageUrl,
                    width: double.infinity,
                    height: isMobile ? 240 : 200,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: double.infinity,
                        height: isMobile ? 240 : 200,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor.withValues(alpha: 0.3),
                              AppTheme.primaryColor.withValues(alpha: 0.1),
                            ],
                          ),
                        ),
                        child: Icon(
                          Icons.image_not_supported_outlined,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                      );
                    },
                  ),
                ),

                // İçerik
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(AppTheme.spaceLg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Başlık
                        Text(
                          post.title,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),

                        // Özet
                        Expanded(
                          child: Text(
                            post.summary,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[700],
                              height: 1.5,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Footer - Etiketler ve devamını oku
                Padding(
                  padding: const EdgeInsets.only(left: AppTheme.spaceLg, right: AppTheme.spaceLg, bottom: AppTheme.spaceLg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (post.tags.isNotEmpty)
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: post.tags.take(3).map((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppTheme.spaceSm,
                                vertical: AppTheme.spaceXxs,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                              ),
                              child: Text(
                                '#$tag',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[700],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppTheme.spaceLg,
                              vertical: AppTheme.spaceXs,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor,
                              borderRadius: BorderRadius.circular(AppTheme.radius2xl),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Text(
                                  'Devamını Oku',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                SizedBox(width: 6),
                                Icon(
                                  Icons.arrow_forward,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 500.ms, delay: delay).scale(
          begin: const Offset(0.95, 0.95),
          end: const Offset(1.0, 1.0),
          curve: Curves.easeOutBack,
          duration: 500.ms,
          delay: delay,
        );
  }
}
