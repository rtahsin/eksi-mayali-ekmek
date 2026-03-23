import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminDrawer extends StatefulWidget {
  final int currentIndex;

  const AdminDrawer({
    super.key,
    required this.currentIndex,
  });

  @override
  State<AdminDrawer> createState() => _AdminDrawerState();
}

class _AdminDrawerState extends State<AdminDrawer> {
  bool _isInventoryExpanded = true;
  bool _isOtherExpanded = false;
  int _pendingOrderCount = 0;
  int _lowStockCount = 0;

  @override
  void initState() {
    super.initState();
    _loadBadgeCounts();
  }

  /// Badge sayılarını yükle (Firestore'dan)
  Future<void> _loadBadgeCounts() async {
    try {
      final firestore = FirebaseFirestore.instance;

      // Bekleyen siparişler
      // Legacy uyumluluğu için hem status hem orderStatus alanlarını destekler.
      final ordersSnapshot = await firestore.collection('siparisler').get();
      int pendingOrdersCount = 0;
      for (final doc in ordersSnapshot.docs) {
        final data = doc.data();
        final status = (data['status'] ?? data['orderStatus'] ?? '').toString();
        if (status == 'pending' || status == 'processing') {
          pendingOrdersCount++;
        }
      }

      // Düşük stok ürünler (< 10)
      final products = await firestore.collection('urunler').get();
      int lowStock = 0;
      for (var doc in products.docs) {
        final stock = (doc.data()['stock'] as num?)?.toInt() ?? 0;
        if (stock < 10 && stock > 0) {
          lowStock++;
        }
      }

      if (mounted) {
        setState(() {
          _pendingOrderCount = pendingOrdersCount;
          _lowStockCount = lowStock;
        });
      }
    } catch (e) {
      Logger.error('Badge sayıları yüklenirken hata: $e');
    }
  }

  int? _getPendingOrderCount() => _pendingOrderCount > 0 ? _pendingOrderCount : null;
  int? _getLowStockCount() => _lowStockCount > 0 ? _lowStockCount : null;

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Drawer(
      child: Container(
        color: Colors.grey[50],
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              height: isSmallScreen ? 120 : 140,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppTheme.spaceLg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(AppTheme.spaceXs),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            ),
                            child: Icon(
                              Icons.bakery_dining_rounded,
                              color: Colors.white,
                              size: isSmallScreen ? 24 : 28,
                            ),
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "EkmekLab",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: isSmallScreen ? 18 : 20,
                                  ),
                                ),
                                Text(
                                  authService.currentUser?.email ?? "Admin Panel",
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: isSmallScreen ? 11 : 12,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
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
            ),

            // TEMEL İŞLEMLER
            _buildModernTile(
              context: context,
              icon: Icons.dashboard_rounded,
              title: "Gösterge Paneli",
              isSelected: widget.currentIndex == 0,
              isSmallScreen: isSmallScreen,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin');
              },
            ),
            _buildModernTile(
              context: context,
              icon: Icons.inventory_2_rounded,
              title: "Ürünler",
              isSelected: widget.currentIndex == 1,
              isSmallScreen: isSmallScreen,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin/products');
              },
            ),
            _buildModernTile(
              context: context,
              icon: Icons.category_rounded,
              title: "Kategoriler",
              isSelected: widget.currentIndex == 2,
              isSmallScreen: isSmallScreen,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin/categories');
              },
            ),
            _buildModernTile(
              context: context,
              icon: Icons.shopping_bag_rounded,
              title: "Siparişler",
              isSelected: widget.currentIndex == 3,
              isSmallScreen: isSmallScreen,
              badge: _getPendingOrderCount(),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin/orders');
              },
            ),

            Divider(height: 1),

            // ENVANTER & FİNANS (Collapsible)
            _buildSectionHeader(
              title: '💼 Envanter & Finans',
              isExpanded: _isInventoryExpanded,
              onTap: () => setState(() => _isInventoryExpanded = !_isInventoryExpanded),
            ),
            if (_isInventoryExpanded) ...[
              _buildModernTile(
                context: context,
                icon: Icons.factory_rounded,
                title: "Üretim Kayıtları",
                isSelected: widget.currentIndex == 6,
                isSmallScreen: isSmallScreen,
                indent: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/productions');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.store_rounded,
                title: "Stok Durumu",
                isSelected: widget.currentIndex == 7,
                isSmallScreen: isSmallScreen,
                indent: true,
                badge: _getLowStockCount(),
                badgeColor: Colors.red,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/stocks');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.point_of_sale_rounded,
                title: "Satış Kayıtları",
                isSelected: widget.currentIndex == 8,
                isSmallScreen: isSmallScreen,
                indent: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/sales');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.receipt_long_rounded,
                title: "Giderler",
                isSelected: widget.currentIndex == 9,
                isSmallScreen: isSmallScreen,
                indent: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/expenses');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.analytics_rounded,
                title: "Finansal Rapor",
                isSelected: widget.currentIndex == 10,
                isSmallScreen: isSmallScreen,
                indent: true,
                color: Colors.green[700],
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/financial-report');
                },
              ),
              // Teslimat Yönetimi
              _buildModernTile(
                context: context,
                icon: Icons.local_shipping_rounded,
                title: "Teslimat Takvimi",
                isSelected: widget.currentIndex == 14,
                isSmallScreen: isSmallScreen,
                indent: true,
                color: Colors.blue[700],
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/delivery-schedule');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.play_circle_rounded,
                title: "Üretimi Başlat",
                isSelected: widget.currentIndex == 15,
                isSmallScreen: isSmallScreen,
                indent: true,
                color: Colors.orange[700],
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/start-production');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.route_rounded,
                title: "Teslimat Rotası",
                isSelected: widget.currentIndex == 16,
                isSmallScreen: isSmallScreen,
                indent: true,
                color: Colors.green[700],
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/delivery-route');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.notifications_active_rounded,
                title: "Manuel Bildirim",
                isSelected: widget.currentIndex == 17,
                isSmallScreen: isSmallScreen,
                indent: true,
                color: Colors.purple[700],
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/manual-notification');
                },
              ),
            ],

            Divider(height: 1),

            // İÇERİK YÖNETİMİ
            _buildModernTile(
              context: context,
              icon: Icons.article_rounded,
              title: "Blog Yönetimi",
              isSelected: widget.currentIndex == 4,
              isSmallScreen: isSmallScreen,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin/blogs');
              },
            ),
            _buildModernTile(
              context: context,
              icon: Icons.chat_bubble_rounded,
              title: "ChatBot",
              isSelected: widget.currentIndex == 5,
              isSmallScreen: isSmallScreen,
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/admin/chatbot');
              },
            ),

            Divider(height: 1),

            // DİĞER (Collapsible)
            _buildSectionHeader(
              title: '⚙️ Diğer',
              isExpanded: _isOtherExpanded,
              onTap: () => setState(() => _isOtherExpanded = !_isOtherExpanded),
            ),
            if (_isOtherExpanded) ...[
              _buildModernTile(
                context: context,
                icon: Icons.people_rounded,
                title: "Müşteriler",
                isSelected: widget.currentIndex == 11,
                isSmallScreen: isSmallScreen,
                indent: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/customers');
                },
              ),
              _buildModernTile(
                context: context,
                icon: Icons.image_rounded,
                title: "Arka Plan Görselleri",
                isSelected: widget.currentIndex == 12,
                isSmallScreen: isSmallScreen,
                indent: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/admin/backgrounds');
                },
              ),
            ],

            Divider(height: 8, thickness: 2),

            // Çıkış
            Padding(
              padding: const EdgeInsets.all(AppTheme.spaceXs),
              child: Material(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  onTap: () async {
                    final shouldLogout = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Row(
                          children: [
                            Icon(Icons.logout, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Çıkış Yap'),
                          ],
                        ),
                        content:
                            Text('Yönetici panelinden çıkış yapmak istediğinize emin misiniz?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: Text('İptal'),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                            ),
                            child: Text('Çıkış Yap'),
                          ),
                        ],
                      ),
                    );

                    if (shouldLogout == true) {
                      await authService.logout();
                      if (!context.mounted) return;
                      Navigator.of(context).pushReplacementNamed('/admin/login');
                    }
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: AppTheme.spaceMd,
                      horizontal: AppTheme.spaceLg,
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.logout_rounded, color: Colors.red, size: 20),
                        SizedBox(width: 12),
                        Text(
                          'Çıkış Yap',
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                            fontSize: isSmallScreen ? 13 : 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required bool isExpanded,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceLg,
          vertical: AppTheme.spaceMd,
        ),
        color: Colors.grey[100],
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[700],
                ),
              ),
            ),
            Icon(
              isExpanded ? Icons.expand_less : Icons.expand_more,
              color: Colors.grey[600],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModernTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required bool isSelected,
    required bool isSmallScreen,
    required VoidCallback onTap,
    bool indent = false,
    Color? color,
    int? badge,
    Color? badgeColor,
  }) {
    final tileColor = color ?? (isSelected ? AppTheme.primaryColor : Colors.grey[700]!);

    return Padding(
      padding: EdgeInsets.only(
        left: indent ? AppTheme.spaceLg : AppTheme.spaceXs,
        right: AppTheme.spaceXs,
        top: AppTheme.spaceXxs,
        bottom: AppTheme.spaceXxs,
      ),
      child: Material(
        color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: AppTheme.spaceMd,
              vertical: isSmallScreen ? AppTheme.spaceSm : AppTheme.spaceMd,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              border: isSelected
                  ? Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3), width: 1.5)
                  : null,
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  color: tileColor,
                  size: isSmallScreen ? 20 : 22,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: tileColor,
                      fontSize: isSmallScreen ? 13 : 14,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                ),
                if (badge != null && badge > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppTheme.spaceXxs + 2,
                      vertical: 2,
                    ),
                    margin: EdgeInsets.only(right: AppTheme.spaceXxs),
                    decoration: BoxDecoration(
                      color: badgeColor ?? Colors.red,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    ),
                    constraints: BoxConstraints(minWidth: 18),
                    child: Text(
                      badge > 99 ? '99+' : badge.toString(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                if (isSelected)
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
