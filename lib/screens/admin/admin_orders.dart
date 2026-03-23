// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../theme/app_theme.dart';

class AdminOrders extends StatefulWidget {
  const AdminOrders({Key? key}) : super(key: key);

  @override
  State<AdminOrders> createState() => _AdminOrdersState();
}

class _AdminOrdersState extends State<AdminOrders> {
  String _filterStatus = 'Tümü';
  final List<String> _statusOptions = [
    'Tümü',
    'Bekliyor',
    'İşleniyor',
    'Kargoda',
    'Tamamlandı',
    'İptal Edildi'
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.grey.shade100,
              Colors.white,
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppTheme.spaceLg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Siparişler',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ).animate().fadeIn(duration: 600.ms).slideY(
                        begin: 0.2,
                        end: 0,
                        curve: Curves.easeOutQuad,
                        duration: 600.ms,
                      ),

                  const SizedBox(height: AppTheme.spaceLg),

                  // Filtre ve arama - Mobil responsive
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isMobile = constraints.maxWidth < 600;

                      if (isMobile) {
                        // Mobil: Dikey düzen
                        return Column(
                          children: [
                            TextField(
                              decoration: InputDecoration(
                                hintText: 'Sipariş ara...',
                                prefixIcon: const Icon(Icons.search),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                contentPadding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                            ),
                            const SizedBox(height: AppTheme.spaceMd),
                            Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    padding:
                                        const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd, vertical: AppTheme.spaceXxs),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                      border: Border.all(color: Colors.grey.shade300),
                                    ),
                                    child: DropdownButton<String>(
                                      value: _filterStatus,
                                      isExpanded: true,
                                      onChanged: (String? newValue) {
                                        if (newValue != null) {
                                          setState(() {
                                            _filterStatus = newValue;
                                          });
                                        }
                                      },
                                      items: _statusOptions
                                          .map<DropdownMenuItem<String>>((String value) {
                                        return DropdownMenuItem<String>(
                                          value: value,
                                          child: Text(value),
                                        );
                                      }).toList(),
                                      hint: const Text('Durum'),
                                      underline: Container(),
                                      icon: const Icon(Icons.arrow_drop_down),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: AppTheme.spaceMd),
                                ElevatedButton(
                                  onPressed: () {
                                    setState(() {});
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryColor,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.all(AppTheme.spaceMd),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                    ),
                                  ),
                                  child: const Icon(Icons.refresh),
                                ),
                              ],
                            ),
                          ],
                        );
                      }

                      // Desktop: Yatay düzen
                      return Row(
                        children: [
                          Expanded(
                            child: TextField(
                              decoration: InputDecoration(
                                hintText: 'Sipariş ara...',
                                prefixIcon: const Icon(Icons.search),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                contentPadding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppTheme.spaceLg),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd, vertical: AppTheme.spaceXxs),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: DropdownButton<String>(
                              value: _filterStatus,
                              onChanged: (String? newValue) {
                                if (newValue != null) {
                                  setState(() {
                                    _filterStatus = newValue;
                                  });
                                }
                              },
                              items: _statusOptions.map<DropdownMenuItem<String>>((String value) {
                                return DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value),
                                );
                              }).toList(),
                              hint: const Text('Durum'),
                              underline: Container(),
                              icon: const Icon(Icons.arrow_drop_down),
                            ),
                          ),
                          const SizedBox(width: 16),
                          ElevatedButton.icon(
                            onPressed: () {
                              setState(() {});
                            },
                            icon: const Icon(Icons.refresh),
                            label: const Text('Yenile'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceMd),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),

            // Sipariş listesi
            Expanded(
              child: FutureBuilder<List<Order>>(
                future: Provider.of<OrderService>(context, listen: false)
                    .getAllOrders()
                    .then((_) => Provider.of<OrderService>(context, listen: false).orders),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Text(
                        'Siparişler yüklenirken bir hata oluştu: ${snapshot.error}',
                        textAlign: TextAlign.center,
                      ),
                    );
                  }

                  if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(
                      child: Text(
                        'Henüz sipariş bulunmamaktadır.',
                        style: TextStyle(fontSize: 16),
                      ),
                    );
                  }

                  final orders = snapshot.data!;

                  // Durum filtreleme
                  final filteredOrders = _filterStatus == 'Tümü'
                      ? orders
                      : orders
                          .where((order) => order.orderStatus.displayName == _filterStatus)
                          .toList();

                  return ListView.builder(
                    itemCount: filteredOrders.length,
                    itemBuilder: (context, index) {
                      final order = filteredOrders[index];
                      return _buildOrderItem(order);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderItem(Order order) {
    final statusColors = {
      'Bekliyor': Colors.orange,
      'İşleniyor': Colors.blue,
      'Kargoda': Colors.purple,
      'Tamamlandı': Colors.green,
      'İptal Edildi': Colors.red,
    };

    final statusColor = statusColors[order.orderStatus.displayName] ?? Colors.grey;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceXs),
      elevation: 4,
      shadowColor: statusColor.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        side: BorderSide(
          color: statusColor.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              isDarkMode ? Colors.grey.shade800 : Colors.white,
              isDarkMode ? Colors.grey.shade900 : statusColor.withValues(alpha: 0.03),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(AppTheme.spaceXs),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _getStatusIcon(order.orderStatus.displayName),
                          color: statusColor,
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: AppTheme.spaceMd),
                      Text(
                        'Sipariş #${order.id.substring(0, 8)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTheme.spaceMd,
                      vertical: AppTheme.spaceXxs + 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withAlpha(26),
                      borderRadius: BorderRadius.circular(AppTheme.radius2xl),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      order.orderStatus.displayName,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              LayoutBuilder(
                builder: (context, constraints) {
                  final isMobile = constraints.maxWidth < 400;

                  if (isMobile) {
                    // Mobil: Tek sütun
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.person, size: 16, color: Colors.grey),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                order.customerName,
                                style: const TextStyle(fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                            const SizedBox(width: 8),
                            Text(
                              DateFormat('dd/MM/yyyy HH:mm').format(order.dateTime),
                              style: const TextStyle(fontSize: 14),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.shopping_bag, size: 16, color: Colors.grey),
                            const SizedBox(width: 8),
                            Text(
                              '${order.items.length} ürün',
                              style: const TextStyle(fontSize: 14),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceMd, vertical: AppTheme.spaceXs),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                          child: Text(
                            '${order.amount != null ? order.amount!.toStringAsFixed(2) : "0.00"} TL',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppTheme.primaryColor,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    );
                  }

                  // Desktop: İki sütun
                  return Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.person, size: 16, color: Colors.grey),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    order.customerName,
                                    style: const TextStyle(fontSize: 14),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                                const SizedBox(width: 8),
                                Text(
                                  DateFormat('dd/MM/yyyy HH:mm').format(order.dateTime),
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.shopping_bag, size: 16, color: Colors.grey),
                                const SizedBox(width: 8),
                                Text(
                                  '${order.items.length} ürün',
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppTheme.spaceMd,
                                vertical: AppTheme.spaceXxs + 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              child: Text(
                                '${order.amount != null ? order.amount!.toStringAsFixed(2) : "0.00"} TL',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: AppTheme.spaceLg),
              LayoutBuilder(
                builder: (context, constraints) {
                  final isMobile = constraints.maxWidth < 400;

                  if (isMobile) {
                    // Mobil: Tam genişlik butonlar
                    return Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () {
                              _showOrderDetails(order);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: statusColor,
                              side: BorderSide(color: statusColor),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                            ),
                            child: const Text('Detaylar'),
                          ),
                        ),
                        const SizedBox(height: AppTheme.spaceXs),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              _showUpdateStatusDialog(order);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: statusColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                            ),
                            child: const Text('Durumu Güncelle'),
                          ),
                        ),
                      ],
                    );
                  }

                  // Desktop: Yan yana butonlar
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        onPressed: () {
                          _showOrderDetails(order);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: statusColor,
                          side: BorderSide(color: statusColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                        ),
                        child: const Text('Detaylar'),
                      ),
                      const SizedBox(width: AppTheme.spaceXs),
                      ElevatedButton(
                        onPressed: () {
                          _showUpdateStatusDialog(order);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: statusColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                        ),
                        child: const Text('Durumu Güncelle'),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'Bekliyor':
        return Icons.hourglass_empty;
      case 'İşleniyor':
        return Icons.sync;
      case 'Kargoda':
        return Icons.local_shipping;
      case 'Tamamlandı':
        return Icons.check_circle;
      case 'İptal Edildi':
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  void _showOrderDetails(Order order) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Sipariş #${order.id.substring(0, 8)} Detayları'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Müşteri Bilgileri',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text('Ad Soyad: ${order.customerName}'),
              Text('Telefon: ${order.customerPhone}'),
              Text('Adres: ${order.shippingAddress}'),
              Text('E-posta: ${order.customerEmail}'),
              const SizedBox(height: 16),
              const Text(
                'Sipariş Ürünleri',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              ...order.items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppTheme.spaceXs),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${item.name} x ${item.quantity}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text('${(item.price * item.quantity).toStringAsFixed(2)} TL'),
                      ],
                    ),
                  )),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Toplam Tutar:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${order.amount != null ? order.amount!.toStringAsFixed(2) : "0.00"} TL',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Sipariş Bilgileri',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text('Sipariş Tarihi: ${DateFormat('dd/MM/yyyy HH:mm').format(order.dateTime)}'),
              Text('Ödeme Yöntemi: ${order.paymentMethod}'),
              Text('Durum: ${order.orderStatus.displayName}'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }

  void _showUpdateStatusDialog(Order order) {
    String selectedStatus = order.orderStatus.displayName;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Sipariş Durumunu Güncelle'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButton<String>(
              value: selectedStatus,
              items: OrderStatus.values
                  .map((status) => DropdownMenuItem(
                        value: status.displayName,
                        child: Text(status.displayName),
                      ))
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  selectedStatus = value;
                  (ctx as Element).markNeedsBuild();
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              // Seçilen statusa karşılık gelen OrderStatus'u bul
              final newStatus = OrderStatus.values.firstWhere(
                (status) => status.displayName == selectedStatus,
              );
              // Burada newStatus ile güncelleme yapılabilir
              Navigator.of(ctx).pop();
            },
            child: Text('Güncelle'),
          ),
        ],
      ),
    );
  }
}
