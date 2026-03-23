import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/delivery_day.dart';
import '../../models/order.dart';
import '../../services/delivery_schedule_service.dart';
import '../../services/order_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

/// Üretim Başlatma Ekranı (Admin)
///
/// Admin bu ekrandan:
/// - Aktif teslimat gününe ait bekleyen siparişleri görür
/// - Üretimi başlatır (tüm siparişler "Hazırlanıyor" durumuna geçer)
/// - Sipariş kapama işlemini onaylar
///
/// İş Akışı:
/// 1. Aktif teslimat günü yüklenir
/// 2. O güne ait pending siparişler listelenir
/// 3. Admin "Üretimi Başlat" butonuna basar
/// 4. Onay dialogu gösterilir
/// 5. Tüm siparişler "processing" durumuna geçer
/// 6. DeliveryDay.ordersClosed = true olur
/// 7. Yeni sipariş alımı kapanır

class StartProductionScreen extends StatefulWidget {
  const StartProductionScreen({Key? key}) : super(key: key);

  @override
  State<StartProductionScreen> createState() => _StartProductionScreenState();
}

class _StartProductionScreenState extends State<StartProductionScreen> {
  bool _isLoading = true;
  bool _isProcessing = false;
  DeliveryDay? _activeDeliveryDay;
  List<Order> _pendingOrders = [];
  double _totalRevenue = 0.0;

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

      // O güne ait pending siparişleri yükle
      final allOrders = await orderService.getAllOrders();

      final deliveryDateStr = '${activeDay.date.year}-'
          '${activeDay.date.month.toString().padLeft(2, '0')}-'
          '${activeDay.date.day.toString().padLeft(2, '0')}';

      final pendingOrders = allOrders.where((order) {
        return order.deliveryDate == deliveryDateStr && order.orderStatus == OrderStatus.pending;
      }).toList();

      // Toplam ciroyu hesapla
      final revenue = pendingOrders.fold<double>(
        0.0,
        (sum, order) => sum + (order.amount ?? 0.0),
      );

      setState(() {
        _activeDeliveryDay = activeDay;
        _pendingOrders = pendingOrders;
        _totalRevenue = revenue;
        _isLoading = false;
      });

      Logger.info('${pendingOrders.length} bekleyen sipariş yüklendi');
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

  Future<void> _startProduction() async {
    if (_activeDeliveryDay == null || _pendingOrders.isEmpty) {
      return;
    }

    // Onay dialogu göster
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
            SizedBox(width: 12),
            Text('Üretimi Başlat'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Üretimi başlatmak istediğinizden emin misiniz?',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            SizedBox(height: 16),
            _buildConfirmationInfo(
              icon: Icons.shopping_bag,
              label: 'Sipariş Sayısı',
              value: '${_pendingOrders.length} adet',
            ),
            SizedBox(height: 8),
            _buildConfirmationInfo(
              icon: Icons.attach_money,
              label: 'Toplam Tutar',
              value: '${_totalRevenue.toStringAsFixed(2)} TL',
            ),
            SizedBox(height: 8),
            _buildConfirmationInfo(
              icon: Icons.calendar_today,
              label: 'Teslimat Günü',
              value: DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR').format(_activeDeliveryDay!.date),
            ),
            SizedBox(height: 16),
            Container(
              padding: EdgeInsets.all(AppTheme.spaceMd),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                border: Border.all(color: Colors.red[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.red[700], size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Bu işlemden sonra yeni sipariş alınamayacak!',
                      style: TextStyle(
                        color: Colors.red[700],
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: Text('Üretimi Başlat'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isProcessing = true);

    try {
      final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);

      // DeliveryScheduleService üzerinden üretimi başlat
      await deliveryScheduleService.startProduction();

      Logger.info('✅ Üretim başarıyla başlatıldı');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                      'Üretim başlatıldı! ${_pendingOrders.length} sipariş hazırlanıyor durumuna geçti.'),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );

        // Delivery Schedule ekranına geri dön
        Navigator.pop(context, true);
      }
    } catch (e) {
      Logger.error('Üretim başlatılırken hata: $e');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Widget _buildConfirmationInfo({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey[700]),
        SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(color: Colors.grey[600]),
        ),
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(title: 'Üretimi Başlat'),
      drawer: AdminDrawer(currentIndex: -1),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _activeDeliveryDay == null
              ? _buildNoDataState()
              : _buildContent(),
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
    final dateFormat = DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR');
    final isProductionStarted = _activeDeliveryDay!.ordersClosed;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Teslimat günü bilgisi
            _buildDeliveryDayCard(dateFormat, isProductionStarted),
            SizedBox(height: 24),

            // İstatistikler
            _buildStatisticsCard(),
            SizedBox(height: 24),

            // Sipariş listesi
            _buildOrdersList(),
            SizedBox(height: 24),

            // Üretimi başlat butonu
            if (!isProductionStarted && _pendingOrders.isNotEmpty) _buildStartProductionButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildDeliveryDayCard(DateFormat dateFormat, bool isProductionStarted) {
    return Card(
      elevation: 4,
      child: Container(
        padding: EdgeInsets.all(AppTheme.spaceLg),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          gradient: LinearGradient(
            colors: isProductionStarted
                ? [Colors.red[50]!, Colors.red[100]!]
                : [Colors.green[50]!, Colors.green[100]!],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isProductionStarted
                      ? Icons.production_quantity_limits
                      : Icons.local_shipping_outlined,
                  size: 32,
                  color: isProductionStarted ? Colors.red[700] : Colors.green[700],
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isProductionStarted ? 'Üretim Başladı' : 'Üretim Bekliyor',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isProductionStarted ? Colors.red[900] : Colors.green[900],
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        dateFormat.format(_activeDeliveryDay!.date),
                        style: TextStyle(
                          fontSize: 14,
                          color: isProductionStarted ? Colors.red[800] : Colors.green[800],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Divider(),
            SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildInfoItem(
                  icon: Icons.access_time,
                  label: 'Başlangıç',
                  value: _activeDeliveryDay!.productionStartTime,
                ),
                _buildInfoItem(
                  icon: Icons.local_shipping,
                  label: 'Teslimat',
                  value:
                      '${_activeDeliveryDay!.deliveryStartTime} - ${_activeDeliveryDay!.deliveryEndTime}',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem({required IconData icon, required String label, required String value}) {
    return Column(
      children: [
        Icon(icon, size: 20, color: Colors.grey[700]),
        SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildStatisticsCard() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'İstatistikler',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.shopping_bag,
                    label: 'Bekleyen Sipariş',
                    value: '${_pendingOrders.length}',
                    color: Colors.blue,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.attach_money,
                    label: 'Toplam Ciro',
                    value: '${(_totalRevenue).toStringAsFixed(0)} ₺',
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: EdgeInsets.all(AppTheme.spaceMd),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 32),
          SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[700]),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildOrdersList() {
    if (_pendingOrders.isEmpty) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(AppTheme.space3xl),
          child: Column(
            children: [
              Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
              SizedBox(height: 16),
              Text(
                'Henüz Sipariş Yok',
                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(AppTheme.spaceLg),
            child: Text(
              'Bekleyen Siparişler (${_pendingOrders.length})',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          Divider(height: 1),
          ListView.separated(
            shrinkWrap: true,
            physics: NeverScrollableScrollPhysics(),
            itemCount: _pendingOrders.length,
            separatorBuilder: (context, index) => Divider(height: 1),
            itemBuilder: (context, index) {
              final order = _pendingOrders[index];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                title: Text(
                  order.customerName,
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: 4),
                    Text('${order.items.length} ürün'),
                    if (order.customerPhone.isNotEmpty) Text(order.customerPhone),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${(order.amount ?? 0.0).toStringAsFixed(2)} ₺',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.green[700],
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      DateFormat('HH:mm').format(order.dateTime),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStartProductionButton() {
    return ElevatedButton(
      onPressed: _isProcessing ? null : _startProduction,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppTheme.primaryColor,
        padding: EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        ),
      ),
      child: _isProcessing
          ? Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
                SizedBox(width: 12),
                Text('İşleniyor...'),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.play_arrow, size: 24),
                SizedBox(width: 8),
                Text(
                  'Üretimi Başlat - Siparişleri Kapat',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
    );
  }
}
