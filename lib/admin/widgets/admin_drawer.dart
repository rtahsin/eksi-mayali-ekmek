// ignore_for_file: use_super_parameters, prefer_const_constructors, unused_field, unused_element, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';

class AdminDrawer extends StatefulWidget {
  final int currentIndex;

  const AdminDrawer({
    Key? key,
    required this.currentIndex,
  }) : super(key: key);

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
      final pendingOrders = await firestore
          .collection('siparisler')
          .where('orderStatus', whereIn: ['pending', 'processing'])
          .count()
          .get();

      // Düşük stok ürünler (< 10)
      final products = await firestore.collection('urunler').get();
      int lowStock = 0;
      for (var doc in products.docs) {
        final stock = (doc.data()['stock'] ?? 0) as int;
        if (stock < 10 && stock > 0) {
          lowStock++;
        }
      }

      if (mounted) {
        setState(() {
          _pendingOrderCount = pendingOrders.count ?? 0;
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
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
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
                  Navigator.pushReplacementNamed(context, '/admin/users');
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
              padding: EdgeInsets.all(8),
              child: Material(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
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
                        content: Text('Yönetici panelinden çıkış yapmak istediğinize emin misiniz?'),
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
                      Navigator.of(context).pushReplacementNamed('/admin/login');
                    }
                  },
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
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
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
        left: indent ? 16 : 8,
        right: 8,
        top: 4,
        bottom: 4,
      ),
      child: Material(
        color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: isSmallScreen ? 10 : 12,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
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
                    padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    margin: EdgeInsets.only(right: 4),
                    decoration: BoxDecoration(
                      color: badgeColor ?? Colors.red,
                      borderRadius: BorderRadius.circular(10),
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
