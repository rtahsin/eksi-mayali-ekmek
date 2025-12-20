// ignore_for_file: prefer_const_constructors, use_super_parameters, prefer_const_literals_to_create_immutables, unused_import

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:timeline_tile/timeline_tile.dart';

import '../models/order.dart';
import '../models/order_item.dart';
import '../screens/delivery_tracking_screen.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';

class OrderDetailScreen extends StatefulWidget {
  static const routeName = '/order-detail';

  final Order? order;
  final OrderService? orderService;

  const OrderDetailScreen({Key? key, this.order, this.orderService}) : super(key: key);

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  bool _isLoading = false;
  Order? _order;
  bool _isInitialized = false;
  bool _showReviewForm = false;
  final _reviewController = TextEditingController();
  double _rating = 0;

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      // Eğer widget'a direkt order verilmişse onu kullan
      if (widget.order != null) {
        setState(() {
          _order = widget.order;
          _isInitialized = true;
        });
      } else {
        // Route arguments'tan al
        final orderId = ModalRoute.of(context)!.settings.arguments as String;
        _loadOrderDetails(orderId);
        _isInitialized = true;
      }
    }
  }

  Future<void> _loadOrderDetails(String orderId) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final orderService = widget.orderService ?? Provider.of<OrderService>(context, listen: false);
      final orderData = await orderService.getOrderById(orderId);
      setState(() {
        _order = orderData;
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sipariş detayları yüklenirken bir hata oluştu'),
          backgroundColor: Colors.red,
        ),
      );

      Navigator.of(context).pop();
    }
  }

  Future<void> _submitReview() async {
    if (_reviewController.text.trim().isEmpty || _rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lütfen bir yorum yazın ve puan verin'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      await orderService.submitOrderReview(
        _order!.id,
        _reviewController.text,
        _rating,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Değerlendirmeniz için teşekkür ederiz!'),
          backgroundColor: Colors.green,
        ),
      );

      setState(() {
        _showReviewForm = false;
        _reviewController.clear();
        _rating = 0;
      });

      // Sipariş detaylarını yeniden yükle
      await _loadOrderDetails(_order!.id);
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Değerlendirme gönderilirken bir hata oluştu'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.grey[800],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItem(OrderItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              image: DecorationImage(
                image: NetworkImage(item.imageUrl),
                fit: BoxFit.cover,
                onError: (exception, stackTrace) => AssetImage('assets/images/placeholder.png'),
              ),
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  '${item.quantity} adet x ${item.price.toStringAsFixed(2)} ₺',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${(item.price * item.quantity).toStringAsFixed(2)} ₺',
            style: TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceSummary(String label, double amount,
      {bool isDiscount = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 16 : 14,
            ),
          ),
          Text(
            isDiscount && amount > 0
                ? '-${amount.toStringAsFixed(2)} ₺'
                : '${amount.toStringAsFixed(2)} ₺',
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 16 : 14,
              color:
                  isDiscount && amount > 0 ? Colors.red : (isTotal ? AppTheme.primaryColor : null),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(OrderStatus status) {
    Color color;
    String text = status.displayName;
    IconData icon;

    switch (status) {
      case OrderStatus.pending:
        color = Colors.blue;
        icon = Icons.hourglass_empty;
        break;
      case OrderStatus.processing:
        color = Colors.orange;
        icon = Icons.sync;
        break;
      case OrderStatus.ready:
        color = Colors.purple;
        icon = Icons.check_circle;
        break;
      case OrderStatus.delivered:
        color = Colors.green;
        icon = Icons.check_circle;
        break;
      case OrderStatus.cancelled:
        color = Colors.red;
        icon = Icons.cancel;
        break;
      default:
        color = Colors.grey;
        icon = Icons.help_outline;
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      color: color.withAlpha(26),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sipariş Durumu',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        text,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: color,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
                if (status == OrderStatus.ready)
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => DeliveryTrackingScreen(
                            orderId: _order!.id,
                          ),
                        ),
                      );
                    },
                    icon: Icon(Icons.location_on, size: 16),
                    label: Text('Takip Et'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: color,
                      foregroundColor: Colors.white,
                    ),
                  ),
              ],
            ),
            if (status == OrderStatus.delivered && _order?.review == null && !_showReviewForm)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      _showReviewForm = true;
                    });
                  },
                  icon: Icon(Icons.rate_review),
                  label: Text('Siparişi Değerlendir'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: color,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderTimeline() {
    final List<Map<String, dynamic>> timelineEvents = [];

    // Sipariş oluşturuldu
    timelineEvents.add({
      'title': 'Sipariş Alındı',
      'time': _order!.dateTime,
      'description': 'Siparişiniz başarıyla alındı ve onay bekliyor.',
      'icon': Icons.shopping_cart,
      'color': Colors.blue,
      'isCompleted': true,
    });

    // Sipariş işleniyor
    timelineEvents.add({
      'title': 'Hazırlanıyor',
      'time': _order!.orderStatus.index >= OrderStatus.processing.index
          ? _order!.dateTime.add(Duration(hours: 1))
          : null,
      'description': 'Siparişiniz hazırlanıyor.',
      'icon': Icons.sync,
      'color': Colors.orange,
      'isCompleted': _order!.orderStatus.index >= OrderStatus.processing.index,
    });

    // Kargoya verildi
    timelineEvents.add({
      'title': 'Kargoya Verildi',
      'time': _order!.orderStatus.index >= OrderStatus.ready.index
          ? _order!.dateTime.add(Duration(hours: 3))
          : null,
      'description': 'Siparişiniz kargoya verildi.',
      'icon': Icons.local_shipping,
      'color': Colors.purple,
      'isCompleted': _order!.orderStatus.index >= OrderStatus.ready.index,
    });

    // Teslim edildi
    timelineEvents.add({
      'title': 'Teslim Edildi',
      'time': _order!.orderStatus.index >= OrderStatus.delivered.index
          ? _order!.dateTime.add(Duration(hours: 24))
          : null,
      'description': 'Siparişiniz teslim edildi.',
      'icon': Icons.check_circle,
      'color': Colors.green,
      'isCompleted': _order!.orderStatus.index >= OrderStatus.delivered.index,
    });

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('Sipariş Durumu'),
            const SizedBox(height: 16),
            ListView.builder(
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              itemCount: timelineEvents.length,
              itemBuilder: (context, index) {
                final event = timelineEvents[index];
                return TimelineTile(
                  alignment: TimelineAlign.manual,
                  lineXY: 0.2,
                  isFirst: index == 0,
                  isLast: index == timelineEvents.length - 1,
                  indicatorStyle: IndicatorStyle(
                    width: 30,
                    height: 30,
                    indicator: Container(
                      decoration: BoxDecoration(
                        color: event['isCompleted'] ? event['color'] : Colors.grey.shade300,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        event['icon'],
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                  ),
                  beforeLineStyle: LineStyle(
                    color: event['isCompleted'] ? event['color'] : Colors.grey.shade300,
                  ),
                  afterLineStyle: LineStyle(
                    color: index < timelineEvents.length - 1 &&
                            timelineEvents[index + 1]['isCompleted']
                        ? timelineEvents[index + 1]['color']
                        : Colors.grey.shade300,
                  ),
                  endChild: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event['title'],
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: event['isCompleted'] ? event['color'] : Colors.grey,
                          ),
                        ),
                        if (event['time'] != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('dd.MM.yyyy HH:mm').format(event['time']),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                        const SizedBox(height: 4),
                        Text(
                          event['description'],
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  startChild: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    alignment: Alignment.centerRight,
                    child: event['isCompleted']
                        ? Icon(
                            Icons.check_circle,
                            color: event['color'],
                            size: 20,
                          )
                        : null,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewForm() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('Siparişi Değerlendir'),
            const SizedBox(height: 16),
            Text(
              'Puanınız',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(5, (index) {
                return IconButton(
                  onPressed: () {
                    setState(() {
                      _rating = index + 1.0;
                    });
                  },
                  icon: Icon(
                    index < _rating ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                    size: 32,
                  ),
                );
              }),
            ),
            const SizedBox(height: 16),
            Text(
              'Yorumunuz',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reviewController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Siparişiniz hakkında düşüncelerinizi yazın...',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.grey.shade50,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    setState(() {
                      _showReviewForm = false;
                      _reviewController.clear();
                      _rating = 0;
                    });
                  },
                  child: Text('İptal'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _submitReview,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                  ),
                  child: Text('Gönder'),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0);
  }

  Widget _buildOrderReview() {
    if (_order?.review == null) return SizedBox.shrink();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('Değerlendirmeniz'),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  'Puanınız: ',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[700],
                  ),
                ),
                Row(
                  children: List.generate(5, (index) {
                    return Icon(
                      index < (_order!.review!.rating) ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 20,
                    );
                  }),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Yorumunuz:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _order!.review!.comment,
              style: TextStyle(
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tarih: ${DateFormat('dd.MM.yyyy').format(_order!.review!.date)}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Sipariş Detayı'),
        actions: [
          if (_order != null &&
              (_order!.orderStatus == OrderStatus.pending ||
                  _order!.orderStatus == OrderStatus.processing))
            IconButton(
              icon: Icon(Icons.cancel),
              onPressed: () {
                _showCancelOrderDialog();
              },
              tooltip: 'Siparişi İptal Et',
            ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _order == null
              ? Center(child: Text('Sipariş bulunamadı'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Sipariş durumu
                      _buildStatusCard(_order!.orderStatus),
                      const SizedBox(height: 24),

                      // Sipariş zaman çizelgesi
                      _buildOrderTimeline(),
                      const SizedBox(height: 24),

                      // Sipariş bilgileri
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle('Sipariş Bilgileri'),
                              _buildInfoRow('Sipariş No:', _order!.id),
                              _buildInfoRow(
                                'Tarih:',
                                DateFormat('dd.MM.yyyy HH:mm').format(_order!.dateTime),
                              ),
                              _buildInfoRow('Ödeme Yöntemi:', _order!.paymentMethod),
                              if (_order!.notes.isNotEmpty) _buildInfoRow('Notlar:', _order!.notes),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Teslimat bilgileri
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle('Teslimat Bilgileri'),
                              _buildInfoRow('Ad Soyad:', _order!.customerName),
                              _buildInfoRow('E-posta:', _order!.customerEmail),
                              _buildInfoRow('Telefon:', _order!.customerPhone),
                              _buildInfoRow('Adres:', _order!.shippingAddress),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Sipariş öğeleri
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionTitle('Sipariş Öğeleri'),
                              const SizedBox(height: 16),
                              ..._order!.items.map((item) => _buildOrderItem(item)).toList(),
                              const Divider(),
                              const SizedBox(height: 8),
                              _buildPriceSummary('Ara Toplam', _getSubtotal()),

                              // Teslimat ücreti gösterimi
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Teslimat Ücreti:',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                  Text(
                                    _getSubtotal() >= 300 ? 'Bedava' : '50.00 ₺',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: _getSubtotal() >= 300 ? Colors.green : null,
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 8),
                              _buildPriceSummary('Toplam', _order!.amount ?? 0.0, isTotal: true),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Değerlendirme formu
                      if (_showReviewForm) _buildReviewForm(),

                      // Değerlendirme
                      if (_order?.review != null) _buildOrderReview(),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
    );
  }

  void _showCancelOrderDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Siparişi İptal Et'),
        content: Text('Bu siparişi iptal etmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              setState(() {
                _isLoading = true;
              });

              try {
                final orderService = Provider.of<OrderService>(context, listen: false);
                await orderService.cancelOrder(_order!.id);

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Sipariş başarıyla iptal edildi'),
                    backgroundColor: Colors.green,
                  ),
                );

                // Sipariş detaylarını yeniden yükle
                await _loadOrderDetails(_order!.id);
              } catch (error) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Sipariş iptal edilirken bir hata oluştu'),
                    backgroundColor: Colors.red,
                  ),
                );

                setState(() {
                  _isLoading = false;
                });
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: Text('İptal Et'),
          ),
        ],
      ),
    );
  }

  // Ara toplamı hesapla (teslimat ücreti hariç)
  double _getSubtotal() {
    final totalAmount = _order!.amount ?? 0.0;
    // Metadata'da teslimat ücreti varsa çıkar, yoksa teslimat ücretini tahmin et
    final deliveryFee = _order!.metadata != null && _order!.metadata!.containsKey('deliveryFee')
        ? (_order!.metadata!['deliveryFee'] as num).toDouble()
        : (_getSubtotalFromItems() >= 300 ? 0.0 : 50.0);

    return totalAmount - deliveryFee;
  }

  // Ürünlerin toplamını hesapla (teslimat ücreti hesabı için)
  double _getSubtotalFromItems() {
    return _order!.items.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
  }
}
