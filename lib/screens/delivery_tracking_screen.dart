import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/delivery_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import '../widgets/loading_indicator.dart';

class DeliveryTrackingScreen extends StatefulWidget {
  static const routeName = '/delivery-tracking';

  final String? orderId;

  const DeliveryTrackingScreen({Key? key, this.orderId}) : super(key: key);

  @override
  State<DeliveryTrackingScreen> createState() => _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState extends State<DeliveryTrackingScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _trackingData;
  String? _error;
  Timer? _refreshTimer;
  final TextEditingController _orderIdController = TextEditingController();

  @override
  void initState() {
    super.initState();

    // Eğer orderId parametre olarak geldiyse, controller'a ata
    if (widget.orderId != null) {
      _orderIdController.text = widget.orderId!;
      _loadTrackingData(widget.orderId!);
    }

    // Periyodik olarak teslimat durumunu güncelle (30 saniyede bir)
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_trackingData != null && mounted) {
        _refreshTrackingData();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _orderIdController.dispose();
    super.dispose();
  }

  Future<void> _loadTrackingData(String orderId) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final result = await deliveryService.getOrderTracking(orderId);

      if (result['success'] == true) {
        setState(() {
          _trackingData = result['tracking'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = result['error'] ?? 'Sipariş takip bilgileri alınamadı';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Bir hata oluştu: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshTrackingData() async {
    if (_trackingData == null || !mounted) return;

    try {
      final deliveryService = Provider.of<DeliveryService>(context, listen: false);
      final result = await deliveryService.getOrderTracking(_trackingData!['orderId']);

      if (result['success'] == true && mounted) {
        setState(() {
          _trackingData = result['tracking'];
        });
      }
    } catch (e) {
      // Sessizce hataları yok say, kullanıcıya gösterme
      Logger.error('Teslimat durumu güncellenirken hata: $e');
    }
  }

  void _handleTrackOrder() {
    final orderId = _orderIdController.text.trim();
    if (orderId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen bir sipariş numarası girin'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    _loadTrackingData(orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sipariş Takibi'),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sipariş numarası giriş alanı
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(AppTheme.spaceLg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Sipariş Numarası ile Takip',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _orderIdController,
                        decoration: const InputDecoration(
                          labelText: 'Sipariş Numarası',
                          border: OutlineInputBorder(),
                          hintText: 'Örn: order1',
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _handleTrackOrder,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                          ),
                          child: const Text('Siparişi Takip Et'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Yükleniyor göstergesi
              if (_isLoading)
                const Center(child: LoadingIndicator())

              // Hata mesajı
              else if (_error != null)
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: const TextStyle(fontSize: 16),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )

              // Teslimat takip bilgileri
              else if (_trackingData != null)
                _buildTrackingDetails(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTrackingDetails() {
    final status = _trackingData!['status'];
    final estimatedDeliveryTime = _trackingData!['estimatedDeliveryTime'] as DateTime;
    final trackingHistory = _trackingData!['trackingHistory'] as List;
    final deliveryOption = _trackingData!['deliveryOption'];
    final deliveryAddress = _trackingData!['deliveryAddress'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sipariş durumu kartı
        Card(
          elevation: 3,
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _buildStatusIcon(status),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Sipariş #${_trackingData!['orderId']}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          _buildStatusText(status),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(Icons.access_time, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Tahmini Teslimat Zamanı',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatDateTime(estimatedDeliveryTime),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(Icons.local_shipping, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Teslimat Tipi',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getDeliveryOptionName(deliveryOption),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
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
        ),

        const SizedBox(height: 24),

        // Teslimat adresi
        Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Teslimat Adresi',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  deliveryAddress,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Kurye bilgileri (eğer teslimat aşamasındaysa)
        if (status == DeliveryService.statusInTransit && _trackingData!.containsKey('courierName'))
          Card(
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.spaceLg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kurye Bilgileri',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const CircleAvatar(
                        child: Icon(Icons.person),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _trackingData!['courierName'],
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _trackingData!['courierPhone'],
                              style: const TextStyle(fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          // Kurye ile iletişim kur (telefon)
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Kurye aranıyor...'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.phone),
                        color: AppTheme.primaryColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 24),

        // Teslimat durumu zaman çizelgesi
        const Text(
          'Teslimat Durumu',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        _buildTrackingTimeline(trackingHistory),
      ],
    );
  }

  Widget _buildTrackingTimeline(List trackingHistory) {
    // Takip geçmişini tarihe göre sırala (en yenisi en üstte)
    final sortedHistory = List.from(trackingHistory)
      ..sort((a, b) => (b['timestamp'] as DateTime).compareTo(a['timestamp'] as DateTime));

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sortedHistory.length,
      itemBuilder: (context, index) {
        final historyItem = sortedHistory[index];
        final status = historyItem['status'];
        final timestamp = historyItem['timestamp'] as DateTime;
        final description = historyItem['description'];

        final isLast = index == sortedHistory.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: _buildStatusColor(status),
                    shape: BoxShape.circle,
                  ),
                  child: _buildStatusIcon(status),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 50,
                    color: Colors.grey[300],
                  ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusText(status),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDateTime(timestamp),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  if (!isLast) const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('dd.MM.yyyy HH:mm').format(dateTime);
  }

  Widget _buildStatusIcon(String status) {
    switch (status) {
      case DeliveryService.statusPreparing:
        return const Icon(Icons.restaurant, color: Colors.orange);
      case DeliveryService.statusReady:
        return const Icon(Icons.check_circle_outline, color: Colors.blue);
      case DeliveryService.statusInTransit:
        return const Icon(Icons.local_shipping, color: Colors.green);
      case DeliveryService.statusDelivered:
        return const Icon(Icons.check_circle, color: Colors.green);
      case DeliveryService.statusFailed:
        return const Icon(Icons.error, color: Colors.red);
      default:
        return const Icon(Icons.help_outline, color: Colors.grey);
    }
  }

  Widget _buildStatusText(String status) {
    switch (status) {
      case DeliveryService.statusPreparing:
        return const Text('Hazırlanıyor');
      case DeliveryService.statusReady:
        return const Text('Hazır');
      case DeliveryService.statusInTransit:
        return const Text('Yolda');
      case DeliveryService.statusDelivered:
        return const Text('Teslim Edildi');
      case DeliveryService.statusFailed:
        return const Text('Başarısız');
      default:
        return const Text('Bilinmeyen Durum');
    }
  }

  Color _buildStatusColor(String status) {
    switch (status) {
      case DeliveryService.statusPreparing:
        return Colors.orange;
      case DeliveryService.statusReady:
        return Colors.blue;
      case DeliveryService.statusInTransit:
        return Colors.green;
      case DeliveryService.statusDelivered:
        return Colors.green;
      case DeliveryService.statusFailed:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getDeliveryOptionName(String option) {
    switch (option) {
      case 'standardDelivery':
        return 'Standart Teslimat';
      case 'sameDay':
        return 'Aynı Gün Teslimat';
      case 'expressDelivery':
        return 'Ekspres Teslimat';
      case 'scheduledDelivery':
        return 'Planlı Teslimat';
      default:
        return 'Standart Teslimat';
    }
  }
}
