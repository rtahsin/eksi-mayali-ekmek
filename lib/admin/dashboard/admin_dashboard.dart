// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, avoid_print, unused_field, unused_local_variable, unused_import

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

/// AdminDashboardPage, yönetici panelinin ana ekranını oluşturan sınıftır.
/// Bu sınıf yöneticiye hızlı erişim seçenekleri ve genel istatistikler sunar.

// Basit istatistik sınıfı
class DashboardStats {
  final int productCount;
  final int categoryCount;
  final int orderCount;
  final int userCount;
  // Bugünkü istatistikler
  final int todayOrders;
  final int todayPending;
  final int todayReady;
  final int todayCompleted;
  final double todayRevenue;
  // Uyarılar
  final int lowStockCount; // Stok < 10
  final int pendingOrderCount; // Bekleyen siparişler

  DashboardStats({
    this.productCount = 0,
    this.categoryCount = 0,
    this.orderCount = 0,
    this.userCount = 0,
    this.todayOrders = 0,
    this.todayPending = 0,
    this.todayReady = 0,
    this.todayCompleted = 0,
    this.todayRevenue = 0.0,
    this.lowStockCount = 0,
    this.pendingOrderCount = 0,
  });

  DashboardStats copyWith({
    int? productCount,
    int? categoryCount,
    int? orderCount,
    int? userCount,
    int? todayOrders,
    int? todayPending,
    int? todayReady,
    int? todayCompleted,
    double? todayRevenue,
    int? lowStockCount,
    int? pendingOrderCount,
  }) {
    return DashboardStats(
      productCount: productCount ?? this.productCount,
      categoryCount: categoryCount ?? this.categoryCount,
      orderCount: orderCount ?? this.orderCount,
      userCount: userCount ?? this.userCount,
      todayOrders: todayOrders ?? this.todayOrders,
      todayPending: todayPending ?? this.todayPending,
      todayReady: todayReady ?? this.todayReady,
      todayCompleted: todayCompleted ?? this.todayCompleted,
      todayRevenue: todayRevenue ?? this.todayRevenue,
      lowStockCount: lowStockCount ?? this.lowStockCount,
      pendingOrderCount: pendingOrderCount ?? this.pendingOrderCount,
    );
  }
}

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({Key? key}) : super(key: key);

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  final int _selectedIndex = 0; // Ana sayfa seçili durumda
  bool _isLoading = true;
  DashboardStats _stats = DashboardStats();

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  // İstatistikleri yükle
  Future<void> _loadStats() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final firestore = FirebaseFirestore.instance;

      // Ürün sayısı
      final productsQuery = await firestore.collection('urunler').count().get();
      final productCount = productsQuery.count ?? 0;

      // Kategori sayısı
      final categoriesQuery = await firestore.collection('kategoriler').count().get();
      final categoryCount = categoriesQuery.count ?? 0;

      // Sipariş sayısı
      final ordersQuery = await firestore.collection('siparisler').count().get();
      final orderCount = ordersQuery.count ?? 0;

      // Kullanıcı sayısı
      final usersQuery = await firestore.collection('users').count().get();
      final userCount = usersQuery.count ?? 0;

      // Bugünkü siparişleri getir
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      final endOfDay = startOfDay.add(Duration(days: 1));

      final todayOrdersSnapshot = await firestore
          .collection('siparisler')
          .where('orderDate', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('orderDate', isLessThan: Timestamp.fromDate(endOfDay))
          .get();

      int todayOrders = todayOrdersSnapshot.docs.length;
      int todayPending = 0;
      int todayReady = 0;
      int todayCompleted = 0;
      double todayRevenue = 0.0;

      for (var doc in todayOrdersSnapshot.docs) {
        final data = doc.data();
        final status = data['orderStatus'] ?? '';
        final amount = (data['amount'] ?? 0.0) as num;

        switch (status) {
          case 'pending':
          case 'processing':
            todayPending++;
            break;
          case 'ready':
            todayReady++;
            break;
          case 'delivered':
            todayCompleted++;
            todayRevenue += amount.toDouble();
            break;
        }
      }

      // Düşük stok ürünleri say (stok < 10)
      final productsSnapshot = await firestore.collection('urunler').get();
      int lowStockCount = 0;
      for (var doc in productsSnapshot.docs) {
        final data = doc.data();
        final stock = (data['stock'] ?? 0) as int;
        if (stock < 10 && stock > 0) {
          lowStockCount++;
        }
      }

      // Bekleyen siparişler (pending + processing)
      final pendingOrdersSnapshot = await firestore
          .collection('siparisler')
          .where('orderStatus', whereIn: ['pending', 'processing'])
          .get();
      int pendingOrderCount = pendingOrdersSnapshot.docs.length;

      setState(() {
        _stats = DashboardStats(
          productCount: productCount,
          categoryCount: categoryCount,
          orderCount: orderCount,
          userCount: userCount,
          todayOrders: todayOrders,
          todayPending: todayPending,
          todayReady: todayReady,
          todayCompleted: todayCompleted,
          todayRevenue: todayRevenue,
          lowStockCount: lowStockCount,
          pendingOrderCount: pendingOrderCount,
        );
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('İstatistikler yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;
    final isTablet =
        MediaQuery.of(context).size.width >= 600 && MediaQuery.of(context).size.width < 1024;

    return RefreshIndicator(
      onRefresh: _loadStats,
      child: SingleChildScrollView(
        padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Modern hoş geldiniz kartı
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(isSmallScreen ? 16 : 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.secondaryColor,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(isSmallScreen ? 10 : 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.bakery_dining_rounded,
                          color: Colors.white,
                          size: isSmallScreen ? 24 : 32,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hoş Geldiniz! 👋',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: isSmallScreen ? 18 : 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'EkmekLab Yönetim Paneli',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.95),
                                fontSize: isSmallScreen ? 13 : 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(height: isSmallScreen ? 16 : 24),

            // İstatistik kartları - Grid layout
            _isLoading
                ? Center(
                    child: Padding(
                      padding: EdgeInsets.all(40),
                      child: CircularProgressIndicator(
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  )
                : GridView.count(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    crossAxisCount: isSmallScreen ? 2 : (isTablet ? 3 : 4),
                    crossAxisSpacing: isSmallScreen ? 8 : 12,
                    mainAxisSpacing: isSmallScreen ? 8 : 12,
                    childAspectRatio: isSmallScreen ? 1.2 : 1.3,
                    children: [
                      _buildModernStatCard(
                        title: 'Ürünler',
                        value: '${_stats.productCount}',
                        icon: Icons.inventory_2_rounded,
                        gradient: [Colors.blue[400]!, Colors.blue[600]!],
                        onTap: () => Navigator.pushNamed(context, '/admin/products'),
                      ),
                      _buildModernStatCard(
                        title: 'Siparişler',
                        value: '${_stats.orderCount}',
                        icon: Icons.shopping_bag_rounded,
                        gradient: [Colors.orange[400]!, Colors.orange[600]!],
                        onTap: () => Navigator.pushNamed(context, '/admin/orders'),
                      ),
                      _buildModernStatCard(
                        title: 'Kategoriler',
                        value: '${_stats.categoryCount}',
                        icon: Icons.category_rounded,
                        gradient: [Colors.green[400]!, Colors.green[600]!],
                        onTap: () => Navigator.pushNamed(context, '/admin/categories'),
                      ),
                      _buildModernStatCard(
                        title: 'Müşteriler',
                        value: '${_stats.userCount}',
                        icon: Icons.people_rounded,
                        gradient: [Colors.purple[400]!, Colors.purple[600]!],
                        onTap: () => Navigator.pushNamed(context, '/admin/users'),
                      ),
                    ],
                  ),
            SizedBox(height: isSmallScreen ? 16 : 24),

            // Bugünkü siparişler bölümü
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.orange[50]!, Colors.orange[100]!],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.orange[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.today, color: Colors.orange[700], size: 24),
                      SizedBox(width: 8),
                      Text(
                        '🔥 Bugünkü Siparişler',
                        style: TextStyle(
                          fontSize: isSmallScreen ? 16 : 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange[900],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    crossAxisCount: isSmallScreen ? 2 : 4,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.5,
                    children: [
                      _buildTodayStatCard(
                        title: 'Toplam',
                        value: '${_stats.todayOrders}',
                        icon: Icons.receipt_long,
                        color: Colors.blue,
                      ),
                      _buildTodayStatCard(
                        title: 'Hazırlanıyor',
                        value: '${_stats.todayPending}',
                        icon: Icons.hourglass_empty,
                        color: Colors.orange,
                      ),
                      _buildTodayStatCard(
                        title: 'Hazır',
                        value: '${_stats.todayReady}',
                        icon: Icons.check_circle,
                        color: Colors.purple,
                      ),
                      _buildTodayStatCard(
                        title: 'Teslim',
                        value: '${_stats.todayCompleted}',
                        icon: Icons.done_all,
                        color: Colors.green,
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Bugünkü Ciro:',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${_stats.todayRevenue.toStringAsFixed(2)} ₺',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: isSmallScreen ? 16 : 24),

            // Hızlı erişim bölümü
            Text(
              '🚀 Hızlı Erişim',
              style: TextStyle(
                fontSize: isSmallScreen ? 16 : 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              crossAxisCount: isSmallScreen ? 3 : (isTablet ? 4 : 6),
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 1.0,
              children: [
                _buildQuickActionCard(
                  icon: Icons.factory_rounded,
                  label: 'Üretim',
                  color: Colors.brown[600]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/productions'),
                ),
                _buildQuickActionCard(
                  icon: Icons.point_of_sale_rounded,
                  label: 'Satış',
                  color: Colors.teal[600]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/sales'),
                ),
                _buildQuickActionCard(
                  icon: Icons.store_rounded,
                  label: 'Stok',
                  color: Colors.indigo[600]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/stocks'),
                ),
                _buildQuickActionCard(
                  icon: Icons.receipt_long_rounded,
                  label: 'Giderler',
                  color: Colors.red[600]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/expenses'),
                ),
                _buildQuickActionCard(
                  icon: Icons.analytics_rounded,
                  label: 'Finansal',
                  color: Colors.green[700]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/financial-report'),
                ),
                _buildQuickActionCard(
                  icon: Icons.article_rounded,
                  label: 'Blog',
                  color: Colors.deepPurple[600]!,
                  onTap: () => Navigator.pushNamed(context, '/admin/blogs'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Modern istatistik kartı
  Widget _buildModernStatCard({
    required String title,
    required String value,
    required IconData icon,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: gradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: gradient[1].withValues(alpha: 0.3),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                right: -10,
                top: -10,
                child: Icon(
                  icon,
                  size: isSmallScreen ? 60 : 80,
                  color: Colors.white.withValues(alpha: 0.2),
                ),
              ),
              Padding(
                padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Icon(
                      icon,
                      color: Colors.white,
                      size: isSmallScreen ? 24 : 28,
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          value,
                          style: TextStyle(
                            fontSize: isSmallScreen ? 24 : 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: isSmallScreen ? 11 : 13,
                            color: Colors.white.withValues(alpha: 0.9),
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
    );
  }

  /// Hızlı erişim action card
  Widget _buildQuickActionCard({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: color.withValues(alpha: 0.3),
              width: 1.5,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: color,
                size: isSmallScreen ? 24 : 28,
              ),
              SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: isSmallScreen ? 10 : 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Bugünkü sipariş istatistik kartı
  Widget _buildTodayStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 32),
          SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[700],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
