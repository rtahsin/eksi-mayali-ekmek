import 'package:eksi_mayali_ekmek_web/models/order.dart';
import 'package:eksi_mayali_ekmek_web/services/order_service.dart';
import 'package:eksi_mayali_ekmek_web/theme/app_theme.dart';
import 'package:eksi_mayali_ekmek_web/utils/excel_export_helper.dart';
import 'package:eksi_mayali_ekmek_web/utils/logger.dart';
import 'package:eksi_mayali_ekmek_web/utils/whatsapp_helper.dart';
import 'package:eksi_mayali_ekmek_web/widgets/skeleton_loader.dart'; // Modern loading
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

// Web platformu için conditional import
import 'admin_orders_web.dart' if (dart.library.io) 'admin_orders_mobile.dart' as platform;

/// Admin panelinde sipariş yönetimini sağlayan sayfa
///
/// Bu sayfa, admin kullanıcıların tüm siparişleri görüntülemesini,
/// filtrelemesini, sıralamasını ve sipariş durumlarını güncellemesini sağlar.
///
/// Özellikler:
/// - Tüm siparişleri listeleme
/// - Arama yapabilme (müşteri adı, sipariş ID, telefon veya email ile)
/// - Siparişleri tarih, müşteri adı veya toplam tutara göre sıralama
/// - Sipariş durumunu güncelleme (hazırlanıyor, yolda, teslim edildi, iptal)
/// - Sipariş detaylarını görüntüleme
class AdminOrdersPage extends StatefulWidget {
  const AdminOrdersPage({super.key});

  @override
  _AdminOrdersPageState createState() => _AdminOrdersPageState();
}

class _AdminOrdersPageState extends State<AdminOrdersPage> {
  // Durum değişkenleri
  bool _isLoading = true; // Yükleniyor durumu
  bool _isLoadingMore = false; // Daha fazla yükleniyor
  List<Order> _orders = []; // Tüm siparişler
  List<Order> _filteredOrders = []; // Filtrelenmiş siparişler
  String _searchQuery = ''; // Arama sorgusu
  String _sortBy = 'date'; // Sıralama kriteri (date, customer, total)
  bool _sortAscending = false; // Sıralama yönü (false = azalan)
  // Pagination - Server-side
  bool _hasMoreOrders = true;
  static const int _pageSize = 20;

  @override
  void initState() {
    super.initState();
    // Sayfa açıldığında siparişleri yükle
    _loadOrders();
  }

  /// İlk siparişleri yükle (paginated)
  Future<void> _loadOrders({bool loadMore = false}) async {
    if (loadMore) {
      setState(() => _isLoadingMore = true);
    } else {
      setState(() => _isLoading = true);
    }

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);

      Logger.info('Admin paneli: Siparişler yükleniyor (loadMore: $loadMore)');

      // Paginated query
      final orders = await orderService.getOrdersPaginated(
        limit: _pageSize,
        loadMore: loadMore,
      );

      Logger.info('Admin paneli: ${orders.length} sipariş yüklendi');

      setState(() {
        if (loadMore) {
          _orders.addAll(orders);
        } else {
          _orders = orders;
        }
        _filteredOrders = _orders;
        _hasMoreOrders = orderService.hasMoreOrders;
        _applyFilters();
        _isLoading = false;
        _isLoadingMore = false;
      });
    } catch (error) {
      Logger.error('Admin paneli: Siparişler yüklenirken hata: $error');
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
        _filteredOrders = [];
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Siparişler yüklenirken bir hata oluştu: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Arama ve sıralama filtrelerini siparişlere uygular (client-side)
  ///
  /// Server-side pagination kullanıldığı için burada sadece
  /// arama ve sıralama yapılır, sayfalama sunucu tarafında
  void _applyFilters() {
    List<Order> filteredList = List.from(_orders);

    // Arama filtreleme
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filteredList = filteredList.where((order) {
        return order.customerName.toLowerCase().contains(query) ||
            order.id.toLowerCase().contains(query) ||
            order.customerPhone.toLowerCase().contains(query) ||
            order.customerEmail.toLowerCase().contains(query);
      }).toList();
    }

    // Sıralama
    filteredList.sort((a, b) {
      int result = 0;

      switch (_sortBy) {
        case 'date':
          result = a.orderDate.compareTo(b.orderDate);
          break;
        case 'customer':
          result = a.customerName.compareTo(b.customerName);
          break;
        case 'total':
          result = (a.amount ?? 0).compareTo(b.amount ?? 0);
          break;
      }

      return _sortAscending ? result : -result;
    });

    setState(() {
      _filteredOrders = filteredList;
    });
  }

  /// Excel'e aktarma işlemi
  ///
  /// Filtrelenmiş siparişleri Excel dosyasına dönüştürür ve indirir
  Future<void> _exportToExcel() async {
    try {
      Logger.info('Excel export başlatılıyor: ${_orders.length} sipariş');

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(AppTheme.spaceXl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: AppTheme.spaceLg),
                  Text('Excel dosyası hazırlanıyor...'),
                ],
              ),
            ),
          ),
        ),
      );

      // Export to Excel (use ALL orders, not filtered - kullanıcı tüm verileri isteyebilir)
      final excelBytes = await ExcelExportHelper.instance.exportOrdersToExcel(_orders);

      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }

      if (excelBytes != null) {
        // Download file
        final filename = 'siparisler_${DateFormat('yyyyMMdd_HHmmss').format(DateTime.now())}.xlsx';

        if (kIsWeb) {
          // Web platform - trigger browser download
          platform.downloadFile(excelBytes, filename);

          Logger.info('Excel dosyası indirildi: $filename');

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Excel dosyası indirildi: $filename'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          // Mobile/Desktop - show success message
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Excel dosyası kaydedildi: $filename'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      } else {
        throw Exception('Excel dosyası oluşturulamadı');
      }
    } catch (e) {
      Logger.error('Excel export hatası: $e');

      // Close loading dialog if still open
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Excel dosyası oluşturulurken hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık ve arama alanı
          Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sipariş Yönetimi',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: AppTheme.spaceXxs),
                      Text(
                        'Tüm siparişleri görüntüleyip yönetebilirsiniz',
                        style: TextStyle(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.download),
                  onPressed: _exportToExcel,
                  tooltip: 'Excel\'e Aktar',
                ),
                IconButton(
                  icon: Icon(Icons.refresh),
                  onPressed: _loadOrders,
                  tooltip: 'Yenile',
                ),
              ],
            ),
          ),

          // Filtre ve arama bölümü
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg),
            child: Column(
              children: [
                // Arama kutusu
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Müşteri adı, sipariş ID veya telefon ile ara',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                  ),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                    _applyFilters();
                  },
                ),
                SizedBox(height: 16),

                // Filtre seçenekleri
                Row(
                  children: [
                    // Sıralama seçenekleri
                    Expanded(
                      flex: 2,
                      child: DropdownButtonFormField<String>(
                        decoration: InputDecoration(
                          labelText: 'Sıralama',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: AppTheme.spaceMd,
                            vertical: AppTheme.spaceXs,
                          ),
                        ),
                        value: _sortBy,
                        items: [
                          DropdownMenuItem(
                            value: 'date',
                            child: Text('Tarih'),
                          ),
                          DropdownMenuItem(
                            value: 'customer',
                            child: Text('Müşteri Adı'),
                          ),
                          DropdownMenuItem(
                            value: 'total',
                            child: Text('Sipariş Tutarı'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              _sortBy = value;
                            });
                            _applyFilters();
                          }
                        },
                      ),
                    ),
                    SizedBox(width: AppTheme.spaceXs),

                    // Sıralama yönü
                    IconButton(
                      icon: Icon(_sortAscending ? Icons.arrow_upward : Icons.arrow_downward),
                      onPressed: () {
                        setState(() {
                          _sortAscending = !_sortAscending;
                        });
                        _applyFilters();
                      },
                      tooltip: _sortAscending ? 'Artan' : 'Azalan',
                    ),
                  ],
                ),
              ],
            ),
          ),

          SizedBox(height: AppTheme.spaceLg),

          // Siparişler listesi
          Expanded(
            child: _isLoading
                ? SkeletonList(
                    itemCount: 8,
                    showAvatar: true,
                    showTrailing: true,
                  )
                : _filteredOrders.isEmpty
                    ? Center(
                        child: Text(
                          _orders.isEmpty
                              ? 'Henüz hiç sipariş bulunmuyor'
                              : 'Arama kriterlerine uygun sipariş bulunamadı',
                          style: TextStyle(fontSize: 16),
                        ),
                      )
                    : Column(
                        children: [
                          Expanded(
                            child: ListView.builder(
                              itemCount: _filteredOrders.length,
                              padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceLg),
                              itemBuilder: (context, index) {
                                final order = _filteredOrders[index];
                                return _buildOrderCard(order);
                              },
                            ),
                          ),

                          // Load More butonu (server-side pagination)
                          if (_hasMoreOrders && !_isLoadingMore)
                            Container(
                              padding: EdgeInsets.symmetric(
                                vertical: AppTheme.spaceLg,
                                horizontal: AppTheme.space2xl,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border(top: BorderSide(color: Colors.grey.shade300)),
                              ),
                              child: Center(
                                child: ElevatedButton.icon(
                                  onPressed: () => _loadOrders(loadMore: true),
                                  icon: Icon(Icons.expand_more),
                                  label: Text('Daha Fazla Yükle (${_filteredOrders.length} / ?)'),
                                  style: ElevatedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    backgroundColor: AppTheme.primaryColor,
                                    padding: EdgeInsets.symmetric(
                                      horizontal: AppTheme.space3xl,
                                      vertical: AppTheme.spaceLg,
                                    ),
                                  ),
                                ),
                              ),
                            ),

                          // Loading indicator
                          if (_isLoadingMore)
                            Container(
                              padding: EdgeInsets.all(AppTheme.spaceLg),
                              child: Center(
                                child: CircularProgressIndicator(),
                              ),
                            ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    try {
      String orderId = order.id;
      // Kısa ID oluşturma işleminin hata kontrollü versiyonu
      String shortId = orderId.length > 8 ? orderId.substring(0, 8) : orderId;

      return Card(
        margin: EdgeInsets.only(bottom: AppTheme.spaceLg),
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        child: InkWell(
          onTap: () => _showOrderDetails(order),
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Üst kısım: Sipariş ID ve Tarih
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Sipariş #$shortId',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      DateFormat('dd.MM.yyyy HH:mm').format(order.orderDate),
                      style: TextStyle(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: AppTheme.spaceXs),
                Divider(),
                SizedBox(height: AppTheme.spaceXs),

                // Orta kısım: Müşteri bilgileri
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Müşteri bilgileri
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            order.customerName,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: AppTheme.spaceXxs),
                          Text(
                            order.customerPhone,
                            style: TextStyle(
                              color: Colors.grey[700],
                            ),
                          ),
                          SizedBox(height: AppTheme.spaceXxs),
                          Text(
                            order.customerEmail,
                            style: TextStyle(
                              color: Colors.grey[700],
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // Sipariş tutarı ve durum
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${(order.amount ?? 0).toStringAsFixed(2)} ₺',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          SizedBox(height: AppTheme.spaceXs),
                          _buildStatusBadge(order.orderStatus.value),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: AppTheme.spaceLg),

                // Alt kısım: Sipariş özeti ve aksiyonlar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Sipariş özeti
                    Text(
                      '${order.items.length} ürün',
                      style: TextStyle(
                        color: Colors.grey[700],
                      ),
                    ),

                    // Aksiyon butonları
                    Row(
                      children: [
                        // WhatsApp butonu (telefon varsa)
                        if (order.customerPhone.isNotEmpty &&
                            WhatsAppHelper.isValidTurkishPhone(order.customerPhone))
                          Padding(
                            padding: const EdgeInsets.only(right: AppTheme.spaceXs),
                            child: IconButton(
                              onPressed: () async {
                                try {
                                  final message = WhatsAppHelper.createOrderInfoMessage(order);
                                  await WhatsAppHelper.openWhatsApp(
                                    phoneNumber: order.customerPhone,
                                    message: message,
                                  );
                                } catch (e) {
                                  Logger.error('WhatsApp açılırken hata: $e');
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('WhatsApp açılamadı'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              },
                              icon: Icon(Icons.chat, color: Colors.green),
                              tooltip: 'WhatsApp ile bildir',
                            ),
                          ),
                        // Durum güncelle butonu
                        OutlinedButton.icon(
                          onPressed: () => _showUpdateStatusDialog(order),
                          icon: Icon(Icons.edit, size: 16),
                          label: Text('Durum Güncelle'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.primaryColor,
                          ),
                        ),
                        SizedBox(width: AppTheme.spaceXs),
                        // Detay butonu
                        ElevatedButton.icon(
                          onPressed: () => _showOrderDetails(order),
                          icon: Icon(Icons.visibility, size: 16),
                          label: Text('Detay'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      Logger.error('Sipariş kartı oluşturulurken hata: $e');
      return Card(
        margin: EdgeInsets.only(bottom: AppTheme.spaceLg),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Text('Sipariş verisi görüntülenirken hata oluştu: ${order.id}'),
        ),
      );
    }
  }

  Widget _buildStatusBadge(String status) {
    Color backgroundColor;
    Color textColor = Colors.white;
    String statusText;

    switch (status) {
      case 'pending':
        backgroundColor = Colors.orange;
        statusText = 'Sipariş Alındı';
        break;
      case 'processing':
        backgroundColor = Colors.blue;
        statusText = 'Hazırlanıyor';
        break;
      case 'ready':
        backgroundColor = Colors.purple;
        statusText = 'Hazır - Alınabilir';
        break;
      case 'delivered':
        backgroundColor = Colors.green;
        statusText = 'Teslim Edildi';
        break;
      case 'cancelled':
        backgroundColor = Colors.red;
        statusText = 'İptal Edildi';
        break;
      default:
        backgroundColor = Colors.grey;
        statusText = 'Bilinmiyor';
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: AppTheme.spaceMd,
        vertical: AppTheme.spaceXxs + 2,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppTheme.radius2xl),
        border: Border.all(color: backgroundColor),
      ),
      child: Text(
        statusText,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Future<void> _showOrderDetails(Order order) async {
    // Sipariş detaylarını gösteren diyalog
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Sipariş Detayları'),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailItem('Sipariş ID', order.id),
                _buildDetailItem('Kayıt Zamanı',
                  order.createdAt != null ? DateFormat('dd.MM.yyyy HH:mm').format(order.createdAt!) : '-'),
                _buildDetailItem('Oluşturan UID', order.createdByUid ?? order.userId),
                _buildDetailItem('Tarih', DateFormat('dd.MM.yyyy HH:mm').format(order.orderDate)),
                _buildDetailItem('Müşteri', order.customerName),
                _buildDetailItem('Telefon', order.customerPhone),
                _buildDetailItem('E-posta', order.customerEmail),
                _buildDetailItem('Adres', order.shippingAddress),
                _buildDetailItem('Ödeme Yöntemi', order.paymentMethod),
                _buildDetailItem('Durum', _getOrderStatusText(order.orderStatus.value)),
                _buildDetailItem('Toplam Tutar', '${(order.amount ?? 0).toStringAsFixed(2)} ₺'),

                // Konum bilgisi varsa göster
                if (order.latitude != null && order.longitude != null) ...[
                  Divider(height: 32),
                  Row(
                    children: [
                      Icon(Icons.location_on, color: Colors.red, size: 20),
                      SizedBox(width: AppTheme.spaceXs),
                      Text(
                        'Teslimat Konumu',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: AppTheme.spaceMd),
                  Container(
                    padding: EdgeInsets.all(AppTheme.spaceMd),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Enlem: ${order.latitude!.toStringAsFixed(6)}',
                          style: TextStyle(fontSize: 13),
                        ),
                        SizedBox(height: AppTheme.spaceXxs),
                        Text(
                          'Boylam: ${order.longitude!.toStringAsFixed(6)}',
                          style: TextStyle(fontSize: 13),
                        ),
                        SizedBox(height: AppTheme.spaceMd),
                        ElevatedButton.icon(
                          onPressed: () async {
                            final url = Uri.parse(
                                'https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}');
                            if (await canLaunchUrl(url)) {
                              await launchUrl(url, mode: LaunchMode.externalApplication);
                            }
                          },
                          icon: Icon(Icons.directions),
                          label: Text('Yol Tarifi Al'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                Divider(height: 32),
                Text(
                  'Ürünler',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: AppTheme.spaceXs),

                // Ürün listesi
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXxs),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text('${item.name} x${item.quantity}'),
                          ),
                          Text('${(item.price * item.quantity).toStringAsFixed(2)} ₺'),
                        ],
                      ),
                    )),

                if (order.notes.isNotEmpty) ...[
                  Divider(height: 32),
                  _buildDetailItem('Notlar', order.notes),
                ],
              ],
            ),
          ),
        ),
        actions: [
          // WhatsApp butonu (telefon varsa göster)
          if (order.customerPhone.isNotEmpty &&
              WhatsAppHelper.isValidTurkishPhone(order.customerPhone))
            TextButton.icon(
              onPressed: () async {
                try {
                  final message = WhatsAppHelper.createOrderInfoMessage(order);
                  await WhatsAppHelper.openWhatsApp(
                    phoneNumber: order.customerPhone,
                    message: message,
                  );
                } catch (e) {
                  Logger.error('WhatsApp açılırken hata: $e');
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('WhatsApp açılamadı: ${e.toString()}'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              icon: Icon(Icons.chat, color: Colors.green),
              label: Text(
                'WhatsApp',
                style: TextStyle(color: Colors.green),
              ),
            ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Kapat'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showUpdateStatusDialog(order);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: Text('Durum Güncelle'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXxs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 1,
            child: Text(
              '$label:',
              style: TextStyle(
                color: Colors.grey[700],
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          SizedBox(width: AppTheme.spaceXs),
          Expanded(
            flex: 2,
            child: Text(value),
          ),
        ],
      ),
    );
  }

  void _showUpdateStatusDialog(Order order) {
    String selectedStatus = order.orderStatus.value;
    bool sendWhatsAppNotification = false; // WhatsApp gönder checkbox
    // Mevcut history gösterimi hazırlığı
    final history = order.statusHistory;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text('Sipariş Durumunu Güncelle'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Yeni sipariş durumunu seçin:'),
                    SizedBox(height: AppTheme.spaceMd),
                    DropdownButtonFormField<String>(
                      value: selectedStatus,
                      onChanged: (String? newValue) {
                        if (newValue != null) {
                          setState(() {
                            selectedStatus = newValue;
                          });
                        }
                      },
                      items: ['pending', 'processing', 'ready', 'delivered', 'cancelled']
                          .map<DropdownMenuItem<String>>((String status) {
                        return DropdownMenuItem<String>(
                          value: status,
                          child: Text(_getOrderStatusText(status)),
                        );
                      }).toList(),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: AppTheme.spaceMd,
                          vertical: AppTheme.spaceXs,
                        ),
                      ),
                    ),

                    // WhatsApp bildirim checkbox (telefon varsa)
                    if (order.customerPhone.isNotEmpty &&
                        WhatsAppHelper.isValidTurkishPhone(order.customerPhone)) ...[
                        SizedBox(height: AppTheme.spaceLg),
                      Container(
                        padding: EdgeInsets.all(AppTheme.spaceMd),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.chat, color: Colors.green, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'WhatsApp Bildirimi',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green[800],
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: AppTheme.spaceXs),
                            CheckboxListTile(
                              value: sendWhatsAppNotification,
                              onChanged: (bool? value) {
                                setState(() {
                                  sendWhatsAppNotification = value ?? false;
                                });
                              },
                              title: Text(
                                'Müşteriye WhatsApp ile bildir',
                                style: TextStyle(fontSize: 14),
                              ),
                              subtitle: Text(
                                WhatsAppHelper.formatPhoneForDisplay(order.customerPhone),
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                              controlAffinity: ListTileControlAffinity.leading,
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                            ),
                          ],
                        ),
                      ),
                    ],

                    SizedBox(height: 20),
                    if (history.isNotEmpty) ...[
                      Text(
                        'Durum Geçmişi',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                              SizedBox(height: AppTheme.spaceXs),
                      Container(
                        constraints: BoxConstraints(maxHeight: 200),
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: history.length,
                          itemBuilder: (context, index) {
                            final h = history[index];
                            final status = h['status']?.toString() ?? '';
                            final changedAt = h['changedAt']?.toString();
                            final role = h['changedByRole']?.toString() ?? '';
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXxs),
                              child: Row(
                                children: [
                                  _buildStatusBadge(status),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${changedAt != null ? changedAt.substring(0, 19) : ''} • $role',
                                      style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('İptal'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.of(context).pop();
                    await _updateOrderStatus(
                      order,
                      selectedStatus,
                      sendWhatsAppNotification: sendWhatsAppNotification,
                    );
                  },
                  child: Text('Güncelle'),
                  style: ElevatedButton.styleFrom(
                    foregroundColor: Colors.white,
                    backgroundColor: AppTheme.primaryColor,
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _updateOrderStatus(Order order, String newStatus,
      {bool sendWhatsAppNotification = false}) async {
    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      // String'i OrderStatus'e dönüştürme
      OrderStatus orderStatus = OrderStatus.values
          .firstWhere((status) => status.value == newStatus, orElse: () => OrderStatus.pending);

      await orderService.updateOrderStatus(order.id, orderStatus);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş durumu güncellendi'),
            backgroundColor: Colors.green,
          ),
        );
      }

      // WhatsApp bildirimi gönder (seçiliyse)
      if (sendWhatsAppNotification &&
          order.customerPhone.isNotEmpty &&
          WhatsAppHelper.isValidTurkishPhone(order.customerPhone)) {
        try {
          // Güncellenmiş sipariş bilgisi ile mesaj oluştur
          final updatedOrder = order.copyWith(
            orderStatus: orderStatus,
          );

          final message = WhatsAppHelper.createOrderStatusMessage(
            order: updatedOrder,
            status: orderStatus,
          );

          await WhatsAppHelper.openWhatsApp(
            phoneNumber: order.customerPhone,
            message: message,
          );

          Logger.info('WhatsApp bildirimi gönderildi: ${order.id}');
        } catch (e) {
          Logger.error('WhatsApp bildirimi gönderilemedi: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Durum güncellendi ama WhatsApp açılamadı'),
                backgroundColor: Colors.orange,
              ),
            );
          }
        }
      }

      _loadOrders(); // Siparişleri yeniden yükle
    } catch (error) {
      Logger.error('Sipariş durumu güncellenirken hata: $error');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş durumu güncellenemedi: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getOrderStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Sipariş Alındı';
      case 'processing':
        return 'Hazırlanıyor';
      case 'ready':
        return 'Hazır - Alınabilir';
      case 'delivered':
        return 'Teslim Edildi';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  }
}
