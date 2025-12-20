// ignore_for_file: unused_import, use_build_context_synchronously, deprecated_member_use, unreachable_switch_default, use_super_parameters, unused_local_variable

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/order.dart';
import '../services/auth_service.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';
import 'order_detail_screen.dart';

/// Sipariş geçmişi ekranı.
/// Kullanıcının geçmiş siparişlerini görüntülemesini, sipariş detaylarını
/// incelemesini ve siparişleri iptal etmesini sağlar.
class OrderHistoryScreen extends StatefulWidget {
  static const routeName = '/order-history';

  const OrderHistoryScreen({Key? key}) : super(key: key);

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  bool _isLoading = false;
  bool _isInit = false;
  List<Order> _orders = [];
  List<Order> _filteredOrders = [];
  String _searchQuery = '';
  OrderStatus? _selectedStatus;
  bool _isLoadingMore = false;
  bool _hasMoreOrders = true;
  final int _pageSize = 10;
  int _currentPage = 1;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_scrollListener);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollListener() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMoreOrders) {
      _loadMoreOrders();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInit) {
      _fetchOrders();
      _isInit = true;
    }
  }

  /// Siparişleri yükler
  Future<void> _fetchOrders() async {
    setState(() {
      _isLoading = true;
      _currentPage = 1;
      _hasMoreOrders = true;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      await orderService.fetchOrders();

      setState(() {
        _orders = orderService.orders;

        if (_orders.isEmpty) {
          Logger.info('Yüklenen sipariş sayısı: 0 - Sipariş bulunamadı');
        } else {
          Logger.info('Yüklenen sipariş sayısı: ${_orders.length}');

          // Siparişlerin doğru sıralandığından emin ol (en yeni en üstte)
          _orders.sort((a, b) => b.orderDate.compareTo(a.orderDate));
        }

        _applyFilters();
        _isLoading = false;
      });
    } catch (error) {
      Logger.error('Siparişler yüklenirken hata: $error');

      // Build sırasında showSnackBar kullanmak yerine, bir sonraki frame'de gösteriyoruz
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Siparişler yüklenirken bir hata oluştu: $error'),
              backgroundColor: Colors.red,
            ),
          );
        }
      });

      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Daha fazla sipariş yükler
  Future<void> _loadMoreOrders() async {
    if (_isLoadingMore || !_hasMoreOrders) return;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      final nextPage = _currentPage + 1;
      final moreOrders = await orderService.fetchOrders();

      if (moreOrders.isEmpty || moreOrders.length < _pageSize) {
        setState(() {
          _hasMoreOrders = false;
        });
      }

      if (moreOrders.isNotEmpty) {
        setState(() {
          _currentPage = nextPage;
          _orders.addAll(moreOrders);
          _applyFilters();
        });
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Daha fazla sipariş yüklenirken hata oluştu: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  /// Siparişi iptal eder
  Future<void> _cancelOrder(String orderId) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      await orderService.cancelOrder(orderId);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sipariş başarıyla iptal edildi'),
          backgroundColor: Colors.green,
        ),
      );

      setState(() {
        _orders = orderService.orders;
        _applyFilters();
      });
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString()),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Filtreleri uygular
  void _applyFilters() {
    List<Order> filtered = List.from(_orders);

    // Arama filtrelemesi
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((order) {
        final orderIdMatch = order.id.toLowerCase().contains(_searchQuery.toLowerCase());
        final customerNameMatch =
            order.customerName.toLowerCase().contains(_searchQuery.toLowerCase());
        final addressMatch =
            order.shippingAddress.toLowerCase().contains(_searchQuery.toLowerCase());
        return orderIdMatch || customerNameMatch || addressMatch;
      }).toList();
    }

    // Durum filtrelemesi
    if (_selectedStatus != null) {
      filtered = filtered.where((order) => order.orderStatus == _selectedStatus).toList();
    }

    setState(() {
      _filteredOrders = filtered;
    });
  }

  /// Sipariş durumu için chip widget'ı
  Widget _buildStatusChip(OrderStatus status) {
    final Color color;

    switch (status) {
      case OrderStatus.pending:
        color = Colors.orange;
        break;
      case OrderStatus.processing:
        color = Colors.blue;
        break;
      case OrderStatus.ready:
        color = Colors.purple;
        break;
      case OrderStatus.delivered:
        color = Colors.green;
        break;
      case OrderStatus.cancelled:
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(26), // 0.1 opaklık değeri
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.displayName,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  /// Durum filtresi için chip widget'ı
  Widget _buildStatusFilterChip(OrderStatus status) {
    final bool isSelected = _selectedStatus == status;
    final Color color;

    switch (status) {
      case OrderStatus.pending:
        color = Colors.orange;
        break;
      case OrderStatus.processing:
        color = Colors.blue;
        break;
      case OrderStatus.ready:
        color = Colors.purple;
        break;
      case OrderStatus.delivered:
        color = Colors.green;
        break;
      case OrderStatus.cancelled:
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return FilterChip(
      selected: isSelected,
      label: Text(status.displayName),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : color,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      selectedColor: color,
      backgroundColor: color.withAlpha(26),
      checkmarkColor: Colors.white,
      onSelected: (selected) {
        setState(() {
          _selectedStatus = selected ? status : null;
          _applyFilters();
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDesktop = MediaQuery.of(context).size.width > 800;

    return Scaffold(
      appBar: CustomAppBar(title: 'Siparişlerim'),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : _orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.shopping_bag_outlined,
                        size: 100,
                        color: theme.disabledColor,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Henüz siparişiniz bulunmuyor',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Alışverişe başlayarak siparişlerinizi burada görebilirsiniz',
                        style: theme.textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pushReplacementNamed('/');
                        },
                        child: const Text('Alışverişe Başla'),
                      ),
                      const SizedBox(height: 20),
                      OutlinedButton.icon(
                        onPressed: _fetchOrders,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Siparişleri Yenile'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchOrders,
                  child: Column(
                    children: [
                      // Filtre ve arama başlığı
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Sipariş Geçmişi',
                                style: theme.textTheme.titleLarge,
                              ),
                            ),
                            IconButton(
                              onPressed: _fetchOrders,
                              icon: const Icon(Icons.refresh),
                              tooltip: 'Siparişleri Yenile',
                            ),
                          ],
                        ),
                      ),
                      _buildSearchAndFilterBar(),
                      Expanded(
                        child: _buildOrdersList(),
                      ),
                    ],
                  ),
                ),
    );
  }

  /// Arama ve filtreleme çubuğu
  Widget _buildSearchAndFilterBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Arama alanı
          TextField(
            decoration: InputDecoration(
              hintText: 'Sipariş ara...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.grey.shade100,
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
                _applyFilters();
              });
            },
          ),

          const SizedBox(height: 16),

          // Durum filtreleri
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                const Text('Filtrele: ', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Wrap(
                  spacing: 8,
                  children: OrderStatus.values.map((status) {
                    return _buildStatusFilterChip(status);
                  }).toList(),
                ),
                if (_selectedStatus != null) ...[
                  const SizedBox(width: 8),
                  ActionChip(
                    avatar: const Icon(Icons.clear, size: 16),
                    label: const Text('Filtreyi Temizle'),
                    onPressed: () {
                      setState(() {
                        _selectedStatus = null;
                        _applyFilters();
                      });
                    },
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Sipariş listesi widget'ı
  Widget _buildOrdersList() {
    return _filteredOrders.isEmpty && _searchQuery.isNotEmpty
        ? _buildNoSearchResultsWidget()
        : ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _filteredOrders.length + (_isLoadingMore ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == _filteredOrders.length) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              final order = _filteredOrders[index];
              final formattedDate = DateFormat('dd.MM.yyyy HH:mm').format(order.dateTime);

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: InkWell(
                  onTap: () {
                    Navigator.of(context).pushNamed(
                      OrderDetailScreen.routeName,
                      arguments: order.id,
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Sipariş #${order.id.substring(0, 8)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            _buildStatusChip(order.orderStatus),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Tarih: $formattedDate',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Adres: ${order.shippingAddress}',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Toplam: ${order.amount?.toStringAsFixed(2) ?? "0.00"} ₺',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            if (order.orderStatus == OrderStatus.pending ||
                                order.orderStatus == OrderStatus.processing)
                              TextButton(
                                onPressed: () => _cancelOrder(order.id),
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.red,
                                ),
                                child: const Text('İptal Et'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              )
                  .animate(onPlay: (controller) => controller.forward())
                  .fadeIn(duration: 300.ms, delay: (index * 50).ms)
                  .slideY(begin: 0.1, end: 0);
            },
          );
  }

  /// Arama sonucu bulunamadığında gösterilecek widget
  Widget _buildNoSearchResultsWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.search_off,
            size: 80,
            color: Colors.grey,
          ),
          const SizedBox(height: 16),
          Text(
            'Arama sonucu bulunamadı',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '"$_searchQuery" için sonuç bulunamadı',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _searchQuery = '';
                _applyFilters();
              });
            },
            icon: const Icon(Icons.clear),
            label: const Text('Aramayı Temizle'),
          ),
        ],
      ),
    );
  }
}
