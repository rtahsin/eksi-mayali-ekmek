import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/delivery_day.dart';
import '../../services/delivery_schedule_service.dart';
import '../../theme/app_theme.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

/// Teslimat Takvimi Yönetim Ekranı (Admin)
///
/// Admin bu ekrandan:
/// - Aktif teslimat gününü görür
/// - Üretimi başlatabilir (sipariş kapatma)
/// - Gelecek teslimat günlerini görür
/// - Teslimat ayarlarını değiştirebilir
class DeliveryScheduleScreen extends StatefulWidget {
  const DeliveryScheduleScreen({super.key});

  @override
  State<DeliveryScheduleScreen> createState() => _DeliveryScheduleScreenState();
}

class _DeliveryScheduleScreenState extends State<DeliveryScheduleScreen> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);

    await deliveryScheduleService.init();

    setState(() => _isLoading = false);
  }

  Future<void> _showStartProductionDialog() async {
    final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);

    final activeDay = deliveryScheduleService.activeDeliveryDay;
    if (activeDay == null) return;

    // Onay dialogu
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 8),
            Text('Üretimi Başlat'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Teslimat Günü: ${DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR').format(activeDay.date)}',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('Toplam Sipariş: ${activeDay.orderCount} adet'),
            SizedBox(height: 16),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '⚠️ Uyarı',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.orange.shade900,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Üretimi başlatırsanız:',
                    style: TextStyle(fontSize: 13),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '• Yeni sipariş alınmayacak',
                    style: TextStyle(fontSize: 13),
                  ),
                  Text(
                    '• Mevcut siparişler "Hazırlanıyor" durumuna geçecek',
                    style: TextStyle(fontSize: 13),
                  ),
                  Text(
                    '• Yeni siparişler gelecek haftaya atanacak',
                    style: TextStyle(fontSize: 13),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),
            Text('Bu işlemi onaylıyor musunuz?'),
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
              foregroundColor: Colors.white,
            ),
            child: Text('Üretimi Başlat'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    // Üretimi başlat
    final success = await deliveryScheduleService.startProduction();

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Üretim başlatıldı! Sipariş alımı kapatıldı.'),
          backgroundColor: Colors.green,
        ),
      );
      await _loadData(); // Verileri yenile
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Üretim başlatılırken hata oluştu'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _showEditDeliveryDayDialog() async {
    final deliveryScheduleService = Provider.of<DeliveryScheduleService>(context, listen: false);

    final activeDay = deliveryScheduleService.activeDeliveryDay;
    if (activeDay == null) return;

    DateTime selectedDate = activeDay.date;

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Teslimat Gününü Değiştir'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Yeni teslimat tarihini seçin:'),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: selectedDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(Duration(days: 60)),
                  locale: Locale('tr', 'TR'),
                );
                if (picked != null) {
                  selectedDate = picked;
                }
              },
              icon: Icon(Icons.calendar_today),
              label: Text(DateFormat('dd MMMM yyyy', 'tr_TR').format(selectedDate)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              final success = await deliveryScheduleService.updateDeliveryDay(
                date: selectedDate,
              );

              if (!mounted) return;
              Navigator.pop(context);

              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Teslimat günü güncellendi')),
                );
                await _loadData();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Güncelleme başarısız'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: Text('Kaydet'),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveDeliveryCard(DeliveryDay activeDay) {
    final dateFormat = DateFormat('dd MMMM yyyy (EEEE)', 'tr_TR');

    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.calendar_today, color: AppTheme.primaryColor, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Aktif Teslimat Günü',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        dateFormat.format(activeDay.date),
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.edit),
                  onPressed: activeDay.ordersClosed ? null : _showEditDeliveryDayDialog,
                  tooltip: 'Tarihi Değiştir',
                ),
              ],
            ),
            SizedBox(height: 16),
            Divider(),
            SizedBox(height: 16),
            // Sipariş durumu
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: activeDay.ordersClosed
                    ? Colors.red.withValues(alpha: 0.1)
                    : Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: activeDay.ordersClosed ? Colors.red : Colors.green,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    activeDay.ordersClosed ? Icons.lock : Icons.lock_open,
                    color: activeDay.ordersClosed ? Colors.red : Colors.green,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeDay.ordersClosed ? '🔒 Sipariş Kapandı' : '✅ Sipariş Açık',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          activeDay.ordersClosed
                              ? 'Üretim başladı, yeni sipariş alınmıyor'
                              : '${activeDay.orderCount} sipariş alındı',
                          style: TextStyle(fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),
            // İstatistikler
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.shopping_bag,
                    label: 'Sipariş',
                    value: '${activeDay.orderCount}',
                    color: Colors.blue,
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _buildStatItem(
                    icon: Icons.attach_money,
                    label: 'Gelir',
                    value: '${activeDay.totalRevenue.toStringAsFixed(0)} ₺',
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            // Üretim başlama zamanı
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                SizedBox(width: 8),
                Text(
                  'Üretim Başlangıç: ${activeDay.productionStartTime} (${activeDay.hasProductionStartTimePassed ? "Geçti" : "Bekliyor"})',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.local_shipping, size: 16, color: Colors.grey[600]),
                SizedBox(width: 8),
                Text(
                  'Teslimat Saati: ${activeDay.deliveryStartTime} - ${activeDay.deliveryEndTime}',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            ),
            if (!activeDay.ordersClosed) ...[
              SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: activeDay.orderCount > 0 ? _showStartProductionDialog : null,
                  icon: Icon(Icons.play_arrow),
                  label: Text('Üretimi Başlat - Siparişi Kapat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
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
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[700]),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingDeliveriesSection(List<DeliveryDay> upcomingDeliveries) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.event, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Gelecek Teslimatlar',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            if (upcomingDeliveries.isEmpty)
              Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    'Gelecek teslimat yok',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: NeverScrollableScrollPhysics(),
                itemCount: upcomingDeliveries.length,
                separatorBuilder: (context, index) => Divider(height: 24),
                itemBuilder: (context, index) {
                  final delivery = upcomingDeliveries[index];
                  final dateFormat = DateFormat('dd MMM yyyy (EEEE)', 'tr_TR');

                  return Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
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
                              dateFormat.format(delivery.date),
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 15,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              '${delivery.orderCount} sipariş',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, color: Colors.grey[400]),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AdminAppBar(title: 'Teslimat Takvimi'),
      drawer: AdminDrawer(currentIndex: -1),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : Consumer<DeliveryScheduleService>(
              builder: (context, deliveryScheduleService, child) {
                final activeDay = deliveryScheduleService.activeDeliveryDay;
                final upcomingDeliveries = deliveryScheduleService.upcomingDeliveries;

                if (activeDay == null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text(
                          'Teslimat takvimi yüklenemedi',
                          style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                        ),
                        SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadData,
                          child: Text('Yeniden Dene'),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView(
                    padding: EdgeInsets.all(16),
                    children: [
                      _buildActiveDeliveryCard(activeDay),
                      SizedBox(height: 16),
                      _buildUpcomingDeliveriesSection(upcomingDeliveries),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
