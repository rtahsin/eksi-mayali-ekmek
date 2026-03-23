// ignore_for_file: use_super_parameters

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import '../models/order.dart';
import '../services/order_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';
import '../widgets/custom_app_bar.dart';
import 'order_detail_screen.dart';
import 'order_history_screen.dart';

/// Sipariş onay ekranı
/// Sipariş başarıyla oluşturulduktan sonra gösterilen onay sayfası
class OrderConfirmationScreen extends StatefulWidget {
  static const routeName = '/order-confirmation';

  final String orderId;

  const OrderConfirmationScreen({
    Key? key,
    required this.orderId,
  }) : super(key: key);

  @override
  State<OrderConfirmationScreen> createState() => _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState extends State<OrderConfirmationScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  Order? _order;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _loadOrder();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      final order = await orderService.getOrderById(widget.orderId);

      if (mounted) {
        setState(() {
          _order = order;
          _isLoading = false;
        });
        _animationController.forward();
      }
    } catch (e) {
      Logger.error('Sipariş yüklenirken hata: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppTheme.darkBackgroundColor : AppTheme.backgroundColor,
      appBar: CustomAppBar(
        title: 'Sipariş Onayı',
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? _buildErrorState(isDark)
              : _buildSuccessState(isDark),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space2xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 100,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: AppTheme.space2xl),
            Text(
              'Sipariş Bulunamadı',
              style: GoogleFonts.poppins(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : AppTheme.textColor,
              ),
            ),
            const SizedBox(height: AppTheme.spaceMd),
            Text(
              'Sipariş bilgileriniz yüklenirken bir hata oluştu.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            const SizedBox(height: AppTheme.space3xl),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/');
              },
              icon: const Icon(Icons.home),
              label: const Text('Ana Sayfaya Dön'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.space3xl, vertical: AppTheme.spaceLg),
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessState(bool isDark) {
    final currencyFormat = NumberFormat.currency(locale: 'tr_TR', symbol: '₺', decimalDigits: 2);

    return SingleChildScrollView(
      child: Column(
        children: [
          // Success Animation
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: AppTheme.space3xl),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  (isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor).withValues(alpha: 0.1),
                  Colors.transparent,
                ],
              ),
            ),
            child: Column(
              children: [
                // Success Icon with Animation
                ScaleTransition(
                  scale: CurvedAnimation(
                    parent: _animationController,
                    curve: Curves.elasticOut,
                  ),
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.green.shade50,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.green.withValues(alpha: 0.3),
                          blurRadius: 20,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.check_circle,
                      size: 80,
                      color: Colors.green.shade600,
                    ),
                  ),
                ),
                const SizedBox(height: AppTheme.space2xl),
                Text(
                  'Siparişiniz Alındı!',
                  style: GoogleFonts.poppins(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppTheme.textColor,
                  ),
                ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, end: 0),
                const SizedBox(height: AppTheme.spaceXs),
                Text(
                  'Siparişiniz başarıyla oluşturuldu',
                  style: TextStyle(
                    fontSize: 16,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
              ],
            ),
          ),

          // Order Details Card
          Padding(
            padding: const EdgeInsets.all(AppTheme.spaceLg),
            child: Column(
              children: [
                // Order Number Card
                _buildInfoCard(
                  isDark: isDark,
                  icon: Icons.receipt_long,
                  title: 'Sipariş Numarası',
                  content: '#${_order!.id.substring(0, 8).toUpperCase()}',
                  iconColor: AppTheme.primaryColor,
                ),
                const SizedBox(height: AppTheme.spaceSm),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppTheme.spaceMd),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkSurfaceColor : Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(
                      color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sipariş Kanıtı (Tam ID)',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppTheme.spaceXxs),
                      Row(
                        children: [
                          Expanded(
                            child: SelectableText(
                              _order!.id,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : AppTheme.textColor,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Kopyala',
                            icon: const Icon(Icons.copy, size: 18),
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(text: _order!.id));
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Sipariş ID kopyalandı'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTheme.spaceLg),

                // Order Date Card
                _buildInfoCard(
                  isDark: isDark,
                  icon: Icons.calendar_today,
                  title: 'Sipariş Tarihi',
                  content: DateFormat('dd MMMM yyyy, HH:mm', 'tr_TR').format(_order!.orderDate),
                  iconColor: Colors.blue,
                ),
                const SizedBox(height: AppTheme.spaceLg),

                // Delivery Address Card
                _buildInfoCard(
                  isDark: isDark,
                  icon: Icons.location_on,
                  title: 'Teslimat Adresi',
                  content: _order!.shippingAddress ?? 'Belirtilmemiş',
                  iconColor: Colors.orange,
                ),
                const SizedBox(height: AppTheme.spaceLg),

                // Order Summary Card
                Container(
                  padding: const EdgeInsets.all(AppTheme.spaceXl),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkSurfaceColor : Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                    border: Border.all(
                      color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(AppTheme.spaceSm),
                            decoration: BoxDecoration(
                              color: Colors.purple.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            ),
                            child: const Icon(
                              Icons.shopping_bag,
                              color: Colors.purple,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: AppTheme.spaceLg),
                          Text(
                            'Sipariş Özeti',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : AppTheme.textColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppTheme.spaceLg),
                      const Divider(),
                      const SizedBox(height: AppTheme.spaceXs),

                      // Order Items
                      ...(_order!.items ?? []).map((item) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceXs),
                            child: Row(
                              children: [
                                Text(
                                  '${item.quantity}x',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                                  ),
                                ),
                                const SizedBox(width: AppTheme.spaceMd),
                                Expanded(
                                  child: Text(
                                    item.name,
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: isDark ? Colors.white : AppTheme.textColor,
                                    ),
                                  ),
                                ),
                                Text(
                                  currencyFormat.format(item.price * item.quantity),
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.white : AppTheme.textColor,
                                  ),
                                ),
                              ],
                            ),
                          )),

                      const SizedBox(height: AppTheme.spaceLg),
                      const Divider(),
                      const SizedBox(height: AppTheme.spaceXs),

                      // Total
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Toplam Tutar',
                            style: GoogleFonts.poppins(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : AppTheme.textColor,
                            ),
                          ),
                          Text(
                            currencyFormat.format(_order!.amount),
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 400.ms, duration: 600.ms).slideY(begin: 0.2, end: 0),

                const SizedBox(height: AppTheme.space2xl),

                // Status Card
                Container(
                  padding: const EdgeInsets.all(AppTheme.spaceXl),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkSurfaceColor : Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                    border: Border.all(
                      color: Colors.blue.shade200,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.blue.shade700,
                        size: 24,
                      ),
                      const SizedBox(width: AppTheme.spaceLg),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Sipariş Durumu',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.blue.shade900,
                              ),
                            ),
                            const SizedBox(height: AppTheme.spaceXxs),
                            Text(
                              _order!.orderStatus.displayName,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 600.ms, duration: 600.ms),

                const SizedBox(height: AppTheme.space3xl),

                // Action Buttons
                Column(
                  children: [
                    // View Order Details Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushReplacementNamed(
                            OrderDetailScreen.routeName,
                            arguments: _order!.id,
                          );
                        },
                        icon: const Icon(Icons.visibility),
                        label: const Text('Sipariş Detaylarını Görüntüle'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceMd),

                    // View All Orders Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushReplacementNamed(OrderHistoryScreen.routeName);
                        },
                        icon: const Icon(Icons.history),
                        label: const Text('Siparişlerim'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          foregroundColor: AppTheme.primaryColor,
                          side: const BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppTheme.spaceMd),

                    // Back to Home Button
                    SizedBox(
                      width: double.infinity,
                      child: TextButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushReplacementNamed('/');
                        },
                        icon: const Icon(Icons.home),
                        label: const Text('Ana Sayfaya Dön'),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                          foregroundColor: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 800.ms, duration: 600.ms),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required bool isDark,
    required IconData icon,
    required String title,
    required String content,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppTheme.spaceXl),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurfaceColor : Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppTheme.spaceSm),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 24,
            ),
          ),
          const SizedBox(width: AppTheme.spaceLg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: AppTheme.spaceXxs),
                Text(
                  content,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : AppTheme.textColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.2, end: 0);
  }
}
