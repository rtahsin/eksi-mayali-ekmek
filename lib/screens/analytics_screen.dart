import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/analytics_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/loading_indicator.dart';

class AnalyticsScreen extends StatefulWidget {
  static const routeName = '/analytics';

  const AnalyticsScreen({Key? key}) : super(key: key);

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  Map<String, Object>? _salesAnalytics;
  Map<String, Object>? _userAnalytics;
  Map<String, Object>? _productAnalytics;
  List<Map<String, Object>>? _salesRecommendations;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAnalytics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalytics() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final analyticsService =
          Provider.of<AnalyticsService>(context, listen: false);

      // Satış analizlerini yükle
      final salesAnalytics = await analyticsService.loadSalesAnalytics();

      // Kullanıcı analizlerini yükle
      final userAnalytics = await analyticsService.loadUserAnalytics();

      // Ürün analizlerini yükle
      final productAnalytics = await analyticsService.loadProductAnalytics();

      // Satış önerilerini yükle
      final salesRecommendations =
          await analyticsService.generateSalesRecommendations();

      setState(() {
        _salesAnalytics = salesAnalytics;
        _userAnalytics = userAnalytics;
        _productAnalytics = productAnalytics;
        _salesRecommendations = salesRecommendations;
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text('Analitik verileri yüklenirken bir hata oluştu: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analitikler'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Satışlar'),
            Tab(text: 'Kullanıcılar'),
            Tab(text: 'Ürünler'),
            Tab(text: 'Öneriler'),
          ],
        ),
      ),
      drawer: AppDrawer(),
      body: _isLoading
          ? const Center(child: LoadingIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSalesAnalytics(),
                _buildUserAnalytics(),
                _buildProductAnalytics(),
                _buildSalesRecommendations(),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _loadAnalytics,
        child: const Icon(Icons.refresh),
        tooltip: 'Analitikleri Yenile',
      ),
    );
  }

  Widget _buildSalesAnalytics() {
    if (_salesAnalytics == null) {
      return const Center(child: Text('Satış analitikleri bulunamadı.'));
    }

    final formatter = NumberFormat.currency(locale: 'tr_TR', symbol: '₺');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAnalyticsCard(
            title: 'Toplam Satışlar',
            value: formatter.format(_salesAnalytics!['totalSales']),
            icon: Icons.attach_money,
            color: Colors.green,
          ),
          const SizedBox(height: 16),
          _buildAnalyticsCard(
            title: 'Ortalama Sipariş Değeri',
            value: formatter.format(_salesAnalytics!['averageOrderValue']),
            icon: Icons.shopping_cart,
            color: Colors.blue,
          ),
          const SizedBox(height: 16),
          _buildAnalyticsCard(
            title: 'Toplam Sipariş Sayısı',
            value: _salesAnalytics!['totalOrders'].toString(),
            icon: Icons.list_alt,
            color: Colors.purple,
          ),
          const SizedBox(height: 24),
          const Text(
            'Günlük Satışlar',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Container(
            height: 200,
            padding: const EdgeInsets.all(8),
            child: _buildDailySalesChart(),
          ),
          const SizedBox(height: 24),
          const Text(
            'En Çok Satan Kategoriler',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildCategorySalesList(),
          const SizedBox(height: 24),
          const Text(
            'Yoğun Saatler',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildPeakHoursList(),
        ],
      ),
    );
  }

  Widget _buildDailySalesChart() {
    if (_salesAnalytics == null ||
        !_salesAnalytics!.containsKey('dailySales') ||
        (_salesAnalytics!['dailySales'] as Map<String, Object>).isEmpty) {
      return const Center(child: Text('Günlük satış verisi bulunamadı.'));
    }

    final dailySales = _salesAnalytics!['dailySales'] as Map<String, Object>;
    final spots = <FlSpot>[];

    // Son 7 günü göster
    final sortedDays = dailySales.keys.toList()..sort();
    final last7Days = sortedDays.length > 7
        ? sortedDays.sublist(sortedDays.length - 7)
        : sortedDays;

    for (int i = 0; i < last7Days.length; i++) {
      final day = last7Days[i];
      final value = dailySales[day] as double;
      spots.add(FlSpot(i.toDouble(), value));
    }

    return LineChart(
      LineChartData(
        gridData: FlGridData(show: true),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= 0 && value.toInt() < last7Days.length) {
                  final day = last7Days[value.toInt()];
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      day.split('-').sublist(1).join('/'),
                      style: const TextStyle(fontSize: 10),
                    ),
                  );
                }
                return const Text('');
              },
              reservedSize: 30,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: Text(
                    '₺${value.toInt()}',
                    style: const TextStyle(fontSize: 10),
                  ),
                );
              },
              reservedSize: 40,
            ),
          ),
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: true),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: AppTheme.primaryColor,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: AppTheme.primaryColor.withValues(alpha: 0.2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySalesList() {
    if (_salesAnalytics == null ||
        !_salesAnalytics!.containsKey('categorySales') ||
        (_salesAnalytics!['categorySales'] as Map<String, Object>).isEmpty) {
      return const Center(child: Text('Kategori satış verisi bulunamadı.'));
    }

    final categorySales =
        _salesAnalytics!['categorySales'] as Map<String, Object>;
    final sortedCategories = categorySales.entries.toList()
      ..sort((a, b) => (b.value as num).compareTo(a.value as num));

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sortedCategories.length > 5 ? 5 : sortedCategories.length,
      itemBuilder: (ctx, index) {
        final category = sortedCategories[index];
        final percentage = (category.value as num) /
            (_salesAnalytics!['totalSales'] as num) *
            100;

        return ListTile(
          title: Text(category.key),
          subtitle: LinearProgressIndicator(
            value: percentage / 100,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              AppTheme.primaryColor,
            ),
          ),
          trailing: Text(
            '₺${(category.value as num).toStringAsFixed(2)} (${percentage.toStringAsFixed(1)}%)',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildPeakHoursList() {
    if (_salesAnalytics == null ||
        !_salesAnalytics!.containsKey('hourlySales') ||
        (_salesAnalytics!['hourlySales'] as Map<String, Object>).isEmpty) {
      return const Center(child: Text('Saatlik satış verisi bulunamadı.'));
    }

    final hourlySales = _salesAnalytics!['hourlySales'] as Map<String, Object>;
    final sortedHours = hourlySales.entries.toList()
      ..sort((a, b) => (b.value as num).compareTo(a.value as num));

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sortedHours.length > 5 ? 5 : sortedHours.length,
      itemBuilder: (ctx, index) {
        final hour = sortedHours[index];
        final hourInt = int.parse(hour.key);
        final timeString =
            '${hourInt.toString().padLeft(2, '0')}:00 - ${(hourInt + 1).toString().padLeft(2, '0')}:00';

        return ListTile(
          leading: const Icon(Icons.access_time),
          title: Text(timeString),
          trailing: Text(
            '₺${(hour.value as num).toStringAsFixed(2)}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildUserAnalytics() {
    if (_userAnalytics == null) {
      return const Center(child: Text('Kullanıcı analitikleri bulunamadı.'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAnalyticsCard(
            title: 'Toplam Kullanıcı Sayısı',
            value: _userAnalytics!['totalUsers'].toString(),
            icon: Icons.people,
            color: Colors.blue,
          ),
          const SizedBox(height: 16),
          _buildAnalyticsCard(
            title: 'Aktif Kullanıcı Sayısı',
            value: _userAnalytics!['activeUsers'].toString(),
            icon: Icons.person_outline,
            color: Colors.green,
          ),
          const SizedBox(height: 16),
          _buildAnalyticsCard(
            title: 'Yeni Kullanıcılar (Son 30 gün)',
            value: _userAnalytics!['newUsers'].toString(),
            icon: Icons.person_add,
            color: Colors.orange,
          ),
          const SizedBox(height: 24),
          const Text(
            'En Aktif Kullanıcılar',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildActiveUsersList(),
          const SizedBox(height: 24),
          const Text(
            'Kullanıcı Tercihleri',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildUserPreferencesList(),
        ],
      ),
    );
  }

  Widget _buildActiveUsersList() {
    if (_userAnalytics == null ||
        !_userAnalytics!.containsKey('activeUsersList') ||
        (_userAnalytics!['activeUsersList'] as List).isEmpty) {
      return const Center(child: Text('Aktif kullanıcı verisi bulunamadı.'));
    }

    final activeUsers = _userAnalytics!['activeUsersList'] as List;

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: activeUsers.length > 5 ? 5 : activeUsers.length,
      itemBuilder: (ctx, index) {
        final user = activeUsers[index] as Map<String, Object>;

        return ListTile(
          leading: CircleAvatar(
            child: Text(user['name'].toString().substring(0, 1).toUpperCase()),
          ),
          title: Text(user['name'].toString()),
          subtitle: Text(user['email'].toString()),
          trailing: Text(
            '${user['orderCount']} sipariş',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildUserPreferencesList() {
    if (_userAnalytics == null ||
        !_userAnalytics!.containsKey('preferences') ||
        (_userAnalytics!['preferences'] as Map<String, Object>).isEmpty) {
      return const Center(
          child: Text('Kullanıcı tercihleri verisi bulunamadı.'));
    }

    final preferences = _userAnalytics!['preferences'] as Map<String, Object>;
    final sortedPreferences = preferences.entries.toList()
      ..sort((a, b) => (b.value as num).compareTo(a.value as num));

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sortedPreferences.length > 5 ? 5 : sortedPreferences.length,
      itemBuilder: (ctx, index) {
        final preference = sortedPreferences[index];
        final percentage = (preference.value as num) /
            (_userAnalytics!['totalUsers'] as num) *
            100;

        return ListTile(
          title: Text(preference.key),
          subtitle: LinearProgressIndicator(
            value: percentage / 100,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              AppTheme.primaryColor,
            ),
          ),
          trailing: Text(
            '${preference.value} kullanıcı (${percentage.toStringAsFixed(1)}%)',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildProductAnalytics() {
    if (_productAnalytics == null) {
      return const Center(child: Text('Ürün analitikleri bulunamadı.'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAnalyticsCard(
            title: 'Toplam Ürün Sayısı',
            value: _productAnalytics!['totalProducts'].toString(),
            icon: Icons.inventory_2,
            color: Colors.purple,
          ),
          const SizedBox(height: 16),
          _buildAnalyticsCard(
            title: 'Stokta Olmayan Ürünler',
            value: _productAnalytics!['outOfStockProducts'].toString(),
            icon: Icons.remove_shopping_cart,
            color: Colors.red,
          ),
          const SizedBox(height: 24),
          const Text(
            'En Çok Satan Ürünler',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildTopProductsList(),
          const SizedBox(height: 24),
          const Text(
            'En Çok Görüntülenen Ürünler',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildMostViewedProductsList(),
        ],
      ),
    );
  }

  Widget _buildTopProductsList() {
    if (_productAnalytics == null ||
        !_productAnalytics!.containsKey('topSellingProducts') ||
        (_productAnalytics!['topSellingProducts'] as List).isEmpty) {
      return const Center(child: Text('En çok satan ürün verisi bulunamadı.'));
    }

    final topProducts = _productAnalytics!['topSellingProducts'] as List;

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: topProducts.length > 5 ? 5 : topProducts.length,
      itemBuilder: (ctx, index) {
        final product = topProducts[index] as Map<String, dynamic>;

        return ListTile(
          leading: product['imageUrl'] != null &&
                  product['imageUrl'].toString().isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    product['imageUrl'],
                    width: 50,
                    height: 50,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, error, _) => Container(
                      width: 50,
                      height: 50,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image_not_supported),
                    ),
                  ),
                )
              : Container(
                  width: 50,
                  height: 50,
                  color: Colors.grey[300],
                  child: const Icon(Icons.image_not_supported),
                ),
          title: Text(product['title']),
          subtitle: Text('${product['salesCount']} adet satıldı'),
          trailing: Text(
            '₺${product['price']}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildMostViewedProductsList() {
    if (_productAnalytics == null ||
        !_productAnalytics!.containsKey('mostViewedProducts') ||
        (_productAnalytics!['mostViewedProducts'] as List).isEmpty) {
      return const Center(
          child: Text('En çok görüntülenen ürün verisi bulunamadı.'));
    }

    final mostViewedProducts = _productAnalytics!['mostViewedProducts'] as List;

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: mostViewedProducts.length > 5 ? 5 : mostViewedProducts.length,
      itemBuilder: (ctx, index) {
        final product = mostViewedProducts[index] as Map<String, dynamic>;

        return ListTile(
          leading: product['imageUrl'] != null &&
                  product['imageUrl'].toString().isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    product['imageUrl'],
                    width: 50,
                    height: 50,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, error, _) => Container(
                      width: 50,
                      height: 50,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image_not_supported),
                    ),
                  ),
                )
              : Container(
                  width: 50,
                  height: 50,
                  color: Colors.grey[300],
                  child: const Icon(Icons.image_not_supported),
                ),
          title: Text(product['title']),
          subtitle: Text('${product['viewCount']} görüntülenme'),
          trailing: Text(
            '₺${product['price']}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }

  Widget _buildSalesRecommendations() {
    if (_salesRecommendations == null || _salesRecommendations!.isEmpty) {
      return const Center(child: Text('Satış önerileri bulunamadı.'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Satış Önerileri',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _salesRecommendations!.length,
            itemBuilder: (ctx, index) {
              final recommendation = _salesRecommendations![index];

              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _getRecommendationIcon(
                                recommendation['type'] as String? ?? 'default'),
                            color: AppTheme.primaryColor,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              recommendation['title'] as String? ?? '',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        recommendation['description'] as String? ?? '',
                        style: const TextStyle(fontSize: 16),
                      ),
                      if (recommendation.containsKey('actionItems') &&
                          (recommendation['actionItems'] as List).isNotEmpty)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 12),
                            const Text(
                              'Önerilen Aksiyonlar:',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...(recommendation['actionItems'] as List)
                                .map((action) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(
                                      Icons.arrow_right,
                                      size: 20,
                                      color: AppTheme.primaryColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(action),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  IconData _getRecommendationIcon(String type) {
    switch (type) {
      case 'inventory':
        return Icons.inventory;
      case 'pricing':
        return Icons.attach_money;
      case 'marketing':
        return Icons.campaign;
      case 'product':
        return Icons.shopping_bag;
      case 'customer':
        return Icons.people;
      default:
        return Icons.lightbulb;
    }
  }

  Widget _buildAnalyticsCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: color,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
