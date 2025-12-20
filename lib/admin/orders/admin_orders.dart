// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, library_private_types_in_public_api

import 'package:eksi_mayali_ekmek_web/models/order.dart';
import 'package:eksi_mayali_ekmek_web/services/auth_service.dart';
import 'package:eksi_mayali_ekmek_web/services/order_service.dart';
import 'package:eksi_mayali_ekmek_web/theme/app_theme.dart';
import 'package:eksi_mayali_ekmek_web/utils/logger.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

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
  const AdminOrdersPage({Key? key}) : super(key: key);

  @override
  _AdminOrdersPageState createState() => _AdminOrdersPageState();
}

class _AdminOrdersPageState extends State<AdminOrdersPage> {
  // Durum değişkenleri
  bool _isLoading = true; // Yükleniyor durumu
  List<Order> _orders = []; // Tüm siparişler
  List<Order> _filteredOrders = []; // Filtrelenmiş siparişler
  String _searchQuery = ''; // Arama sorgusu
  String _sortBy = 'date'; // Sıralama kriteri (date, customer, total)
  bool _sortAscending = false; // Sıralama yönü (false = azalan)

  @override
  void initState() {
    super.initState();
    // Sayfa açıldığında siparişleri yükle
    _loadOrders();
  }

  /// Tüm siparişleri veritabanından yükler
  ///
  /// Bu metod OrderService kullanarak Firebase'den tüm siparişleri çeker,
  /// sonuçları state'e kaydeder ve UI'ı günceller.
  /// Hata durumunda kullanıcıya bilgi verir.
  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);

      Logger.info('Admin paneli: Siparişler yükleniyor...');

      // Siparişleri getir
      final orders = await orderService.getAllOrders();

      Logger.info('Admin paneli: ${orders.length} sipariş yüklendi');

      // Sipariş yoksa hata ayıklama için detaylı bilgiler görüntüle
      if (orders.isEmpty) {
        Logger.warning('Admin paneli: Hiç sipariş bulunamadı!');

        // Auth durumunu kontrol et
        final authService = Provider.of<AuthService>(context, listen: false);
        if (authService.currentUser != null) {
          Logger.info('Admin paneli: Giriş yapan kullanıcı: ${authService.currentUser!.email}');
        } else {
          Logger.error('Admin paneli: Kimlik doğrulaması yapılmamış!');
        }
      } else {
        // Bazı sipariş bilgilerini log'a yazdır
        Logger.info('Admin paneli: İlk sipariş ID: ${orders.first.id}');
        Logger.info('Admin paneli: Son sipariş tarihi: ${orders.last.orderDate}');
      }

      setState(() {
        _orders = orders;
        _filteredOrders = orders; // Filtrelenmemiş listeyi başlangıçta tam liste olarak ayarla
        _applyFilters(); // Sonra filtreleri uygula
        _isLoading = false;
      });
    } catch (error) {
      Logger.error('Admin paneli: Siparişler yüklenirken hata: $error');
      setState(() {
        _isLoading = false;
        _orders = [];
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

  /// Arama ve sıralama filtrelerini siparişlere uygular
  ///
  /// Bu metod _searchQuery ve _sortBy değişkenlerine göre
  /// siparişleri filtreler ve sıralar, sonra _filteredOrders listesini günceller.
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık ve arama alanı
          Padding(
            padding: const EdgeInsets.all(16.0),
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
                      SizedBox(height: 4),
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
                  icon: Icon(Icons.refresh),
                  onPressed: _loadOrders,
                  tooltip: 'Yenile',
                ),
              ],
            ),
          ),

          // Filtre ve arama bölümü
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              children: [
                // Arama kutusu
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Müşteri adı, sipariş ID veya telefon ile ara',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
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
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                    SizedBox(width: 8),

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

          SizedBox(height: 16),

          // Siparişler listesi
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : _filteredOrders.isEmpty
                    ? Center(
                        child: Text(
                          _orders.isEmpty
                              ? 'Henüz hiç sipariş bulunmuyor'
                              : 'Arama kriterlerine uygun sipariş bulunamadı',
                          style: TextStyle(fontSize: 16),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _filteredOrders.length,
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        itemBuilder: (context, index) {
                          final order = _filteredOrders[index];
                          return _buildOrderCard(order);
                        },
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
        margin: EdgeInsets.only(bottom: 16),
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: () => _showOrderDetails(order),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
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
                SizedBox(height: 8),
                Divider(),
                SizedBox(height: 8),

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
                          SizedBox(height: 4),
                          Text(
                            order.customerPhone,
                            style: TextStyle(
                              color: Colors.grey[700],
                            ),
                          ),
                          SizedBox(height: 4),
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
                          SizedBox(height: 8),
                          _buildStatusBadge(order.orderStatus.value),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 16),

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
                        // Durum güncelle butonu
                        OutlinedButton.icon(
                          onPressed: () => _showUpdateStatusDialog(order),
                          icon: Icon(Icons.edit, size: 16),
                          label: Text('Durum Güncelle'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.primaryColor,
                          ),
                        ),
                        SizedBox(width: 8),
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
        margin: EdgeInsets.only(bottom: 16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
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
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
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
                _buildDetailItem('Tarih', DateFormat('dd.MM.yyyy HH:mm').format(order.orderDate)),
                _buildDetailItem('Müşteri', order.customerName),
                _buildDetailItem('Telefon', order.customerPhone),
                _buildDetailItem('E-posta', order.customerEmail),
                _buildDetailItem('Adres', order.shippingAddress),
                _buildDetailItem('Ödeme Yöntemi', order.paymentMethod),
                _buildDetailItem('Durum', _getOrderStatusText(order.orderStatus.value)),
                _buildDetailItem('Toplam Tutar', '${(order.amount ?? 0).toStringAsFixed(2)} ₺'),

                Divider(height: 32),
                Text(
                  'Ürünler',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                SizedBox(height: 8),

                // Ürün listesi
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
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
      padding: const EdgeInsets.symmetric(vertical: 4.0),
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
          SizedBox(width: 8),
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
    // Mevcut history gösterimi hazırlığı
    final history = order.statusHistory;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Sipariş Durumunu Güncelle'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Yeni sipariş durumunu seçin:'),
                SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedStatus,
                  onChanged: (String? newValue) {
                    if (newValue != null) {
                      selectedStatus = newValue;
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
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
                SizedBox(height: 20),
                if (history.isNotEmpty) ...[
                  Text(
                    'Durum Geçmişi',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
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
                          padding: const EdgeInsets.symmetric(vertical: 4.0),
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
              onPressed: () {
                _updateOrderStatus(order, selectedStatus);
                Navigator.of(context).pop();
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
  }

  void _updateOrderStatus(Order order, String newStatus) {
    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      // String'i OrderStatus'e dönüştürme
      OrderStatus orderStatus = OrderStatus.values
          .firstWhere((status) => status.value == newStatus, orElse: () => OrderStatus.pending);

      orderService.updateOrderStatus(order.id, orderStatus).then((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş durumu güncellendi'),
            backgroundColor: Colors.green,
          ),
        );
        _loadOrders(); // Siparişleri yeniden yükle
      }).catchError((error) {
        Logger.error('Sipariş durumu güncellenirken hata: $error');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sipariş durumu güncellenemedi: $error'),
            backgroundColor: Colors.red,
          ),
        );
      });
    } catch (e) {
      Logger.error('Sipariş durumu güncellenirken hata: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sipariş durumu güncellenemedi: $e'),
          backgroundColor: Colors.red,
        ),
      );
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
