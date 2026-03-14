import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/delivery_day.dart';
import '../../models/order.dart';
import '../../services/delivery_schedule_service.dart';
import '../../services/order_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

/// Teslimat Rota Ekranı (Admin)
///
/// Bu ekran teslimat rotasını optimize eder ve yönetir:
/// - Aktif teslimat gününe ait siparişleri listeler
/// - Konum bilgisi olan siparişleri harita üzerinde gösterir
/// - TSP algoritması ile optimal rota hesaplar
/// - Teslimat sırasını günceller
/// - Teslim edildi işaretleme
/// - Google Maps ile yol tarifi

class DeliveryRouteScreen extends StatefulWidget {
  const DeliveryRouteScreen({Key? key}) : super(key: key);

  @override
  State<DeliveryRouteScreen> createState() => _DeliveryRouteScreenState();
}

class _DeliveryRouteScreenState extends State<DeliveryRouteScreen> {
  bool _isLoading = true;
  bool _isOptimizing = false;
  DeliveryDay? _activeDeliveryDay;
  List<Order> _deliveryOrders = [];
  List<Order> _optimizedOrders = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);
      final orderService = Provider.of<OrderService>(context, listen: false);

      // Aktif teslimat gününü yükle
      await deliveryScheduleService.init();
      final activeDay = deliveryScheduleService.activeDeliveryDay;

      if (activeDay == null) {
        Logger.warning('Aktif teslimat günü bulunamadı');
        setState(() => _isLoading = false);
        return;
      }

      // O güne ait processing/ready siparişleri yükle
      final allOrders = await orderService.getAllOrders();

      final deliveryDateStr = '${activeDay.date.year}-'
          '${activeDay.date.month.toString().padLeft(2, '0')}-'
          '${activeDay.date.day.toString().padLeft(2, '0')}';

      final deliveryOrders = allOrders.where((order) {
        return order.deliveryDate == deliveryDateStr &&
            (order.orderStatus == OrderStatus.processing || order.orderStatus == OrderStatus.ready);
      }).toList();

      // Konum bilgisi olan siparişleri filtrele
      final ordersWithLocation = deliveryOrders
          .where((order) => order.latitude != null && order.longitude != null)
          .toList();

      // Teslimat sırasına göre sırala (varsa)
      ordersWithLocation.sort((a, b) {
        if (a.deliverySequence != null && b.deliverySequence != null) {
          return a.deliverySequence!.compareTo(b.deliverySequence!);
        }
        return 0;
      });

      setState(() {
        _activeDeliveryDay = activeDay;
        _deliveryOrders = ordersWithLocation;
        _optimizedOrders = List.from(ordersWithLocation);
        _isLoading = false;
      });

      Logger.info('${ordersWithLocation.length} teslimat siparişi yüklendi');
    } catch (e) {
      Logger.error('Veriler yüklenirken hata: $e');
      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Veriler yüklenirken hata oluştu'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// TSP (Traveling Salesman Problem) algoritması ile rota optimizasyonu
  /// Greedy Nearest Neighbor yaklaşımı kullanır
  Future<void> _optimizeRoute() async {
    if (_deliveryOrders.isEmpty) return;

    setState(() => _isOptimizing = true);

    try {
      // Başlangıç noktası (işletme konumu - örnek: 41.0082, 28.9784 - İstanbul)
      const startLat = 41.0082;
      const startLon = 28.9784;

      List<Order> optimized = [];
      List<Order> remaining = List.from(_deliveryOrders);

      double currentLat = startLat;
      double currentLon = startLon;

      // Nearest Neighbor algoritması
      while (remaining.isNotEmpty) {
        double minDistance = double.infinity;
        int nearestIndex = 0;

        // En yakın siparişi bul
        for (int i = 0; i < remaining.length; i++) {
          final order = remaining[i];
          final distance = _calculateDistance(
            currentLat,
            currentLon,
            order.latitude!,
            order.longitude!,
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }

        // En yakın siparişi ekle
        final nearest = remaining.removeAt(nearestIndex);
        optimized.add(nearest);
        currentLat = nearest.latitude!;
        currentLon = nearest.longitude!;
      }

      // Teslimat sırasını güncelle - Firestore direct update
      final firestore = FirebaseFirestore.instance;
      for (int i = 0; i < optimized.length; i++) {
        final order = optimized[i];
        await firestore.collection('siparisler').doc(order.id).update({
          'deliverySequence': i + 1,
        });
      }

      setState(() {
        _optimizedOrders = optimized;
        _isOptimizing = false;
      });

      Logger.info('✅ Rota optimize edildi: ${optimized.length} sipariş');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text('Rota optimize edildi!'),
              ],
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      Logger.error('Rota optimizasyonu hatası: $e');
      setState(() => _isOptimizing = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// İki nokta arasındaki mesafeyi hesapla (Haversine formülü)
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371; // Dünya'nın yarıçapı (km)
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  double _toRadians(double degrees) {
    return degrees * math.pi / 180;
  }

  /// Google Maps'te yol tarifi aç
  Future<void> _openInMaps(Order order) async {
    if (order.latitude == null || order.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bu sipariş için konum bilgisi yok')),
      );
      return;
    }

    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}',
    );

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Harita açılamadı')),
        );
      }
    }
  }

  /// Siparişi teslim edildi olarak işaretle
  Future<void> _markAsDelivered(Order order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Teslim Edildi'),
        content: Text(
          '${order.customerName} adlı müşterinin siparişi teslim edildi mi?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Hayır'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
            ),
            child: Text('Evet, Teslim Edildi'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      await orderService.updateOrderStatus(order.id, OrderStatus.delivered);

      // Teslim zamanını kaydet - Firestore direct update
      final firestore = FirebaseFirestore.instance;
      await firestore.collection('siparisler').doc(order.id).update({
        'deliveredAt': DateTime.now().toIso8601String(),
      });

      Logger.info('✅ Sipariş teslim edildi: ${order.id}');

      // Listeyi yenile
      await _loadData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş teslim edildi işaretlendi'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      Logger.error('Sipariş güncelleme hatası: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(title: 'Teslimat Rotası'),
      drawer: AdminDrawer(currentIndex: -1),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _activeDeliveryDay == null
              ? _buildNoDataState()
              : _buildContent(),
      floatingActionButton: _deliveryOrders.isNotEmpty && !_isOptimizing
          ? FloatingActionButton.extended(
              onPressed: _optimizeRoute,
              icon: Icon(Icons.route),
              label: Text('Rotayı Optimize Et'),
              backgroundColor: AppTheme.primaryColor,
            )
          : null,
    );
  }

  Widget _buildNoDataState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.warning_amber_rounded, size: 64, color: Colors.orange),
          SizedBox(height: 16),
          Text(
            'Aktif Teslimat Günü Yok',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            'Lütfen önce teslimat takvimini ayarlayın.',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_optimizedOrders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2, size: 64, color: Colors.grey[400]),
            SizedBox(height: 16),
            Text(
              'Teslimat Siparişi Yok',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'Konum bilgisi olan hazır sipariş bulunmuyor.',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: _optimizedOrders.length + 1, // +1 for header
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildHeaderCard();
          }
          final order = _optimizedOrders[index - 1];
          return _buildOrderCard(order, index);
        },
      ),
    );
  }

  Widget _buildHeaderCard() {
    final dateFormat = DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR');
    final totalOrders = _optimizedOrders.length;

    return Container(
      margin: EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue[700]!, Colors.blue[500]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.local_shipping, color: Colors.white, size: 32),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Teslimat Rotası',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      dateFormat.format(_activeDeliveryDay!.date),
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          Text(
            'Toplam $totalOrders teslimat',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
          if (_isOptimizing) ...[
            SizedBox(height: 12),
            LinearProgressIndicator(
              backgroundColor: Colors.white30,
              valueColor: AlwaysStoppedAnimation(Colors.white),
            ),
            SizedBox(height: 8),
            Text(
              'Rota optimize ediliyor...',
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order, int sequence) {
    final isDelivered = order.orderStatus == OrderStatus.delivered;

    return Card(
      margin: EdgeInsets.only(bottom: 12),
      elevation: isDelivered ? 1 : 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isDelivered ? BorderSide(color: Colors.green, width: 2) : BorderSide.none,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: isDelivered ? null : () => _openInMaps(order),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Sequence number
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isDelivered ? Colors.green : AppTheme.primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: isDelivered
                          ? Icon(Icons.check, color: Colors.white)
                          : Text(
                              '$sequence',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.customerName,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            decoration: isDelivered ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          order.customerPhone,
                          style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  if (!isDelivered)
                    IconButton(
                      icon: Icon(Icons.check_circle_outline, color: Colors.green),
                      onPressed: () => _markAsDelivered(order),
                      tooltip: 'Teslim Edildi',
                    ),
                ],
              ),
              SizedBox(height: 12),
              Divider(height: 1),
              SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.shopping_bag, size: 16, color: Colors.grey[600]),
                  SizedBox(width: 8),
                  Text('${order.items.length} ürün', style: TextStyle(fontSize: 13)),
                  SizedBox(width: 16),
                  Icon(Icons.attach_money, size: 16, color: Colors.green[700]),
                  Text(
                    '${(order.amount ?? 0).toStringAsFixed(2)} ₺',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green[700]),
                  ),
                ],
              ),
              if (order.notes != null && order.notes.isNotEmpty) ...[
                SizedBox(height: 8),
                Container(
                  padding: EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.notes, size: 16, color: Colors.grey[600]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          order.notes,
                          style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (!isDelivered) ...[
                SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openInMaps(order),
                  icon: Icon(Icons.directions, size: 18),
                  label: Text('Yol Tarifi Al'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[700],
                    minimumSize: Size(double.infinity, 40),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
              if (isDelivered && order.deliveredAt != null) ...[
                SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.check_circle, size: 16, color: Colors.green),
                    SizedBox(width: 8),
                    Text(
                      'Teslim edildi: ${DateFormat('HH:mm').format(order.deliveredAt!)}',
                      style: TextStyle(
                        color: Colors.green,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
