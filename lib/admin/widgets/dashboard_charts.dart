// ignore_for_file: prefer_const_constructors

/*
 * Dashboard Charts Widget
 * 
 * PURPOSE: Interactive charts for admin dashboard analytics
 * LAYER: Admin Widgets
 * DEPENDS ON: fl_chart, models, services
 * 
 * FEATURES:
 * - Sales trend line chart (daily/weekly revenue)
 * - Order status pie chart
 * - Top products bar chart
 * - Revenue by category donut chart
 * 
 * LAST UPDATED: 2025-01-27
 */

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/order.dart';
import '../../models/product.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class DashboardCharts extends StatelessWidget {
  final List<Order> orders;
  final List<Product> products;

  const DashboardCharts({
    Key? key,
    required this.orders,
    required this.products,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width > 900;

    return Column(
      children: [
        // Sales Trend + Order Status
        if (isDesktop)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _buildSalesTrendChart()),
              SizedBox(width: 16),
              Expanded(child: _buildOrderStatusChart()),
            ],
          )
        else ...[
          _buildSalesTrendChart(),
          SizedBox(height: 16),
          _buildOrderStatusChart(),
        ],

        SizedBox(height: 16),

        // Top Products + Category Revenue
        if (isDesktop)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _buildTopProductsChart()),
              SizedBox(width: 16),
              Expanded(child: _buildCategoryRevenueChart()),
            ],
          )
        else ...[
          _buildTopProductsChart(),
          SizedBox(height: 16),
          _buildCategoryRevenueChart(),
        ],
      ],
    );
  }

  /// 📈 Sales Trend Chart (Line Chart - Son 7 gün)
  Widget _buildSalesTrendChart() {
    final salesData = _calculateDailySales();

    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.trending_up, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  'Satış Trendi (Son 7 Gün)',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: salesData.isEmpty
                  ? Center(child: Text('Veri yok', style: TextStyle(color: Colors.grey)))
                  : LineChart(
                      LineChartData(
                        gridData: FlGridData(show: true, drawVerticalLine: false),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 40,
                              getTitlesWidget: (value, meta) {
                                return Text(
                                  '${value.toInt()}₺',
                                  style: TextStyle(fontSize: 10),
                                );
                              },
                            ),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, meta) {
                                final date =
                                    DateTime.now().subtract(Duration(days: 6 - value.toInt()));
                                return Padding(
                                  padding: EdgeInsets.only(top: 8),
                                  child: Text(
                                    DateFormat('dd/MM').format(date),
                                    style: TextStyle(fontSize: 10),
                                  ),
                                );
                              },
                            ),
                          ),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(
                            show: true, border: Border.all(color: Colors.grey.shade300)),
                        lineBarsData: [
                          LineChartBarData(
                            spots: salesData,
                            isCurved: true,
                            color: Colors.green,
                            barWidth: 3,
                            dotData: FlDotData(show: true),
                            belowBarData: BarAreaData(
                              show: true,
                              color: Colors.green.withValues(alpha: 0.1),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// 🥧 Order Status Chart (Pie Chart)
  Widget _buildOrderStatusChart() {
    final statusData = _calculateOrderStatusDistribution();

    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.pie_chart, color: AppTheme.primaryColor),
                SizedBox(width: 8),
                Text(
                  'Sipariş Durumları',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: statusData.isEmpty
                  ? Center(child: Text('Veri yok', style: TextStyle(color: Colors.grey)))
                  : Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: PieChart(
                            PieChartData(
                              sections: statusData,
                              sectionsSpace: 2,
                              centerSpaceRadius: 40,
                              borderData: FlBorderData(show: false),
                            ),
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: _buildStatusLegend(),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// 📊 Top Products Chart (Bar Chart)
  Widget _buildTopProductsChart() {
    final topProducts = _calculateTopProducts();

    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.bar_chart, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'En Çok Satan Ürünler',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: topProducts.isEmpty
                  ? Center(child: Text('Veri yok', style: TextStyle(color: Colors.grey)))
                  : BarChart(
                      BarChartData(
                        alignment: BarChartAlignment.spaceAround,
                        barGroups: topProducts,
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 40,
                              getTitlesWidget: (value, meta) {
                                return Text('${value.toInt()}', style: TextStyle(fontSize: 10));
                              },
                            ),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, meta) {
                                final productNames = _getTopProductNames();
                                if (value.toInt() >= 0 && value.toInt() < productNames.length) {
                                  return Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      productNames[value.toInt()],
                                      style: TextStyle(fontSize: 9),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                }
                                return Text('');
                              },
                            ),
                          ),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(
                            show: true, border: Border.all(color: Colors.grey.shade300)),
                        gridData: FlGridData(show: true, drawVerticalLine: false),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// 🍩 Category Revenue Chart (Donut Chart)
  Widget _buildCategoryRevenueChart() {
    final categoryData = _calculateCategoryRevenue();

    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.donut_large, color: Colors.orange),
                SizedBox(width: 8),
                Text(
                  'Kategoriye Göre Gelir',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: categoryData.isEmpty
                  ? Center(child: Text('Veri yok', style: TextStyle(color: Colors.grey)))
                  : Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: PieChart(
                            PieChartData(
                              sections: categoryData,
                              sectionsSpace: 2,
                              centerSpaceRadius: 50,
                              borderData: FlBorderData(show: false),
                            ),
                          ),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: _buildCategoryLegend(),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// Calculate daily sales for last 7 days
  List<FlSpot> _calculateDailySales() {
    try {
      final now = DateTime.now();
      final salesByDay = <int, double>{};

      // Initialize last 7 days with 0
      for (int i = 0; i < 7; i++) {
        salesByDay[i] = 0;
      }

      // Calculate sales for each order
      for (final order in orders) {
        final orderDate = order.orderDate;
        final amount = order.amount;

        if (orderDate != null && amount != null) {
          final daysDiff = now.difference(orderDate).inDays;
          if (daysDiff >= 0 && daysDiff < 7) {
            final index = 6 - daysDiff; // Reverse order (oldest to newest)
            salesByDay[index] = (salesByDay[index] ?? 0) + amount;
          }
        }
      }

      return salesByDay.entries.map((e) => FlSpot(e.key.toDouble(), e.value)).toList();
    } catch (e) {
      Logger.error('Sales trend calculation error: $e');
      return [];
    }
  }

  /// Calculate order status distribution
  List<PieChartSectionData> _calculateOrderStatusDistribution() {
    try {
      final statusCounts = <OrderStatus, int>{};

      for (final order in orders) {
        statusCounts[order.orderStatus] = (statusCounts[order.orderStatus] ?? 0) + 1;
      }

      final colors = {
        OrderStatus.pending: Colors.orange,
        OrderStatus.processing: Colors.blue,
        OrderStatus.ready: Colors.purple,
        OrderStatus.delivered: Colors.green,
        OrderStatus.cancelled: Colors.red,
      };

      final total = orders.length.toDouble();

      return statusCounts.entries.map((entry) {
        final percentage = (entry.value / total * 100);
        return PieChartSectionData(
          color: colors[entry.key] ?? Colors.grey,
          value: entry.value.toDouble(),
          title: '${percentage.toStringAsFixed(0)}%',
          radius: 60,
          titleStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
        );
      }).toList();
    } catch (e) {
      Logger.error('Order status calculation error: $e');
      return [];
    }
  }

  /// Calculate top 5 products by sales
  List<BarChartGroupData> _calculateTopProducts() {
    try {
      final productSales = <String, int>{};

      // Count sales for each product
      for (final order in orders) {
        for (final item in order.items) {
          productSales[item.name] = (productSales[item.name] ?? 0) + item.quantity;
        }
      }

      // Sort by sales and take top 5
      final topProducts = productSales.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

      final top5 = topProducts.take(5).toList();

      return List.generate(top5.length, (index) {
        return BarChartGroupData(
          x: index,
          barRods: [
            BarChartRodData(
              toY: top5[index].value.toDouble(),
              color: Colors.blue,
              width: 16,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        );
      });
    } catch (e) {
      Logger.error('Top products calculation error: $e');
      return [];
    }
  }

  /// Get top product names for chart labels
  List<String> _getTopProductNames() {
    try {
      final productSales = <String, int>{};

      for (final order in orders) {
        for (final item in order.items) {
          productSales[item.name] = (productSales[item.name] ?? 0) + item.quantity;
        }
      }

      final topProducts = productSales.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

      return topProducts.take(5).map((e) => e.key).toList();
    } catch (e) {
      Logger.error('Product names error: $e');
      return [];
    }
  }

  /// Calculate revenue by category
  List<PieChartSectionData> _calculateCategoryRevenue() {
    try {
      final categoryRevenue = <String, double>{};

      // Map products by name for easy lookup
      final productMap = {for (var p in products) p.name: p};

      // Calculate revenue for each category
      for (final order in orders) {
        for (final item in order.items) {
          final product = productMap[item.name];
          if (product != null && order.amount != null) {
            final category = product.category;
            final itemRevenue = (item.price ?? 0) * item.quantity;
            categoryRevenue[category] = (categoryRevenue[category] ?? 0) + itemRevenue;
          }
        }
      }

      final colors = [
        Colors.orange,
        Colors.blue,
        Colors.green,
        Colors.purple,
        Colors.red,
        Colors.teal,
      ];

      final total = categoryRevenue.values.fold(0.0, (sum, val) => sum + val);

      return categoryRevenue.entries.take(5).toList().asMap().entries.map((entry) {
        final index = entry.key;
        final data = entry.value;
        final percentage = (data.value / total * 100);

        return PieChartSectionData(
          color: colors[index % colors.length],
          value: data.value,
          title: '${percentage.toStringAsFixed(0)}%',
          radius: 55,
          titleStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
        );
      }).toList();
    } catch (e) {
      Logger.error('Category revenue calculation error: $e');
      return [];
    }
  }

  /// Status legend widget
  Widget _buildStatusLegend() {
    final statuses = {
      OrderStatus.pending: ('Bekliyor', Colors.orange),
      OrderStatus.processing: ('Hazırlanıyor', Colors.blue),
      OrderStatus.ready: ('Hazır', Colors.purple),
      OrderStatus.delivered: ('Teslim', Colors.green),
      OrderStatus.cancelled: ('İptal', Colors.red),
    };

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: statuses.entries.map((entry) {
        return Padding(
          padding: EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: entry.value.$2,
                  shape: BoxShape.circle,
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  entry.value.$1,
                  style: TextStyle(fontSize: 11),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  /// Category legend widget
  Widget _buildCategoryLegend() {
    try {
      final categoryRevenue = <String, double>{};
      final productMap = {for (var p in products) p.name: p};

      for (final order in orders) {
        for (final item in order.items) {
          final product = productMap[item.name];
          if (product != null) {
            final itemRevenue = (item.price ?? 0) * item.quantity;
            categoryRevenue[product.category] =
                (categoryRevenue[product.category] ?? 0) + itemRevenue;
          }
        }
      }

      final top5 = categoryRevenue.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

      final colors = [Colors.orange, Colors.blue, Colors.green, Colors.purple, Colors.red];

      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: top5.take(5).toList().asMap().entries.map((entry) {
          return Padding(
            padding: EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: colors[entry.key % colors.length],
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    entry.value.key,
                    style: TextStyle(fontSize: 11),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      );
    } catch (e) {
      return Container();
    }
  }
}
