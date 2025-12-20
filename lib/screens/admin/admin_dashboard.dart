// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables, unused_local_variable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../services/product_service.dart';
import '../../theme/app_theme.dart';
import 'admin_blogs.dart';
import 'admin_orders.dart';
import 'admin_products.dart';
import 'admin_settings.dart';
import 'admin_settings_screen.dart';
import 'admin_users.dart';
import 'background_images_screen.dart';
import 'notification_management_screen.dart';

class AdminDashboard extends StatefulWidget {
  static const routeName = '/admin';

  const AdminDashboard({Key? key}) : super(key: key);

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _selectedIndex = 0;
  bool _showQuickActions = false;

  final List<Widget> _screens = [
    const AdminDashboardHome(),
    const AdminOrders(),
    const AdminProducts(),
    const AdminUsers(),
    const AdminBlogs(),
    const AdminSettings(),
    const NotificationManagementScreen(),
    const AdminSettingsScreen(),
    const BackgroundImagesScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);

    // Admin yetkisi kontrolü
    if (!authService.isAuthenticated || !authService.isAdmin) {
      return Scaffold(
        body: Center(
          child: Column(
            children: [
              const Icon(
                Icons.admin_panel_settings,
                size: 100,
                color: Colors.grey,
              ),
              const SizedBox(height: 20),
              const Text(
                'Yönetici Paneli',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Bu sayfaya erişmek için yetkiniz yok',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 30),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).pushReplacementNamed('/');
                },
                icon: const Icon(Icons.home),
                label: const Text('Ana Sayfaya Dön'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yönetim Paneli'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.exit_to_app),
            onPressed: () {
              Navigator.of(context).pushReplacementNamed('/');
            },
            tooltip: 'Siteye Dön',
          ),
        ],
      ),
      floatingActionButton: _buildQuickActionsFab(context),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryColor, AppTheme.primaryColor.withValues(alpha: 0.7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ekşi Mayalı Ekmek',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Yönetici Paneli',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Hoş geldiniz, ${authService.currentUser?.fullName ?? 'Admin'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard),
              title: const Text('Genel Bakış'),
              selected: _selectedIndex == 0,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 0;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.shopping_bag),
              title: const Text('Siparişler'),
              selected: _selectedIndex == 1,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 1;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.inventory),
              title: const Text('Ürünler'),
              selected: _selectedIndex == 2,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 2;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.people),
              title: const Text('Kullanıcılar'),
              selected: _selectedIndex == 3,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 3;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.article),
              title: const Text('Blog'),
              selected: _selectedIndex == 4,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 4;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Ayarlar'),
              selected: _selectedIndex == 5,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 5;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications),
              title: const Text('Bildirim Yönetimi'),
              selected: _selectedIndex == 6,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 6;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.store),
              title: const Text('Mağaza Ayarları'),
              selected: _selectedIndex == 7,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 7;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.image),
              title: const Text('Arka Plan Görselleri'),
              selected: _selectedIndex == 8,
              selectedTileColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              onTap: () {
                setState(() {
                  _selectedIndex = 8;
                });
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.exit_to_app),
              title: const Text('Siteye Dön'),
              onTap: () {
                Navigator.of(context).pushReplacementNamed('/');
              },
            ),
          ],
        ),
      ),
      body: _screens[_selectedIndex],
    );
  }

  Widget _buildQuickActionsFab(BuildContext context) {
    return Stack(
      alignment: Alignment.bottomRight,
      children: [
        if (_showQuickActions)
          Padding(
            padding: const EdgeInsets.only(bottom: 70.0, right: 8.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _QuickActionButton(
                  icon: Icons.add_shopping_cart,
                  label: 'Ürün Ekle',
                  color: Colors.green,
                  onTap: () => _openAddProductDialog(context),
                ),
                const SizedBox(height: 8),
                _QuickActionButton(
                  icon: Icons.category,
                  label: 'Kategori Ekle',
                  color: Colors.orange,
                  onTap: () => _openAddCategoryDialog(context),
                ),
                const SizedBox(height: 8),
                _QuickActionButton(
                  icon: Icons.article,
                  label: 'Blog Ekle',
                  color: Colors.blue,
                  onTap: () => _openAddBlogDialog(context),
                ),
              ],
            ),
          ),
        FloatingActionButton(
          backgroundColor: AppTheme.primaryColor,
          onPressed: () {
            setState(() => _showQuickActions = !_showQuickActions);
          },
          child: Icon(_showQuickActions ? Icons.close : Icons.flash_on),
          tooltip: 'Hızlı İşlemler',
        ),
      ],
    );
  }

  Future<void> _openAddProductDialog(BuildContext context) async {
    final nameController = TextEditingController();
    final priceController = TextEditingController();
    final categoryController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hızlı Ürün Ekle'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Ürün Adı'),
                validator: (v) => v == null || v.isEmpty ? 'Zorunlu alan' : null,
              ),
              TextFormField(
                controller: priceController,
                decoration: const InputDecoration(labelText: 'Fiyat (₺)'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Zorunlu alan';
                  final val = double.tryParse(v);
                  if (val == null) return 'Geçersiz sayı';
                  if (val < 0) return 'Negatif olamaz';
                  return null;
                },
              ),
              TextFormField(
                controller: categoryController,
                decoration: const InputDecoration(labelText: 'Kategori'),
                validator: (v) => v == null || v.isEmpty ? 'Zorunlu alan' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                final productService = Provider.of<ProductService>(context, listen: false);
              } catch (_) {}
            },
            child: const Text('Ekle'),
          ),
        ],
      ),
    );
  }

  Future<void> _openAddCategoryDialog(BuildContext context) async {
    final catController = TextEditingController();
    final descController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yeni Kategori Ekle'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: catController,
              decoration: const InputDecoration(
                labelText: 'Kategori Adı *',
                hintText: 'Örn: Ekmekler',
              ),
            ),
            SizedBox(height: 16),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Açıklama *',
                hintText: 'Kısa açıklama',
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () async {
              final name = catController.text.trim();
              final description = descController.text.trim();

              if (name.isEmpty || description.isEmpty) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('Lütfen tüm alanları doldurun')));
                return;
              }

              try {
                final productService = Provider.of<ProductService>(context, listen: false);
                final result = await productService.addCategory({
                  'name': name,
                  'description': description,
                  'isActive': true,
                  'order': 0,
                  'iconName': '',
                });

                Navigator.pop(ctx);

                if (result['success']) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Kategori başarıyla eklendi'),
                    backgroundColor: Colors.green,
                  ));
                } else {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text('Hata: ${result['message']}')));
                }
              } catch (e) {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
              }
            },
            child: const Text('Ekle'),
          ),
        ],
      ),
    );
  }

  Future<void> _openAddBlogDialog(BuildContext context) async {
    final titleController = TextEditingController();
    final summaryController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hızlı Blog Ekle'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Başlık'),
                validator: (v) => v == null || v.isEmpty ? 'Zorunlu alan' : null,
              ),
              TextFormField(
                controller: summaryController,
                decoration: const InputDecoration(labelText: 'Özet'),
                validator: (v) => v == null || v.isEmpty ? 'Zorunlu alan' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () async {
              final productService = Provider.of<ProductService>(context, listen: false);
              try {
                final firestore = FirebaseFirestore.instance;
                await firestore.collection('blogs').add({
                  'title': titleController.text.trim(),
                  'summary': summaryController.text.trim(),
                  'content': '',
                  'author': 'Admin',
                  'date': DateTime.now().toIso8601String(),
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('Blog eklendi')));
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
              }
            },
            child: const Text('Ekle'),
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickActionButton(
      {required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 4,
      borderRadius: BorderRadius.circular(24),
      color: color,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}

class AdminDashboardHome extends StatelessWidget {
  const AdminDashboardHome({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Genel Bakış',
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

            const SizedBox(height: 24),

            // İstatistik kartları
            GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: MediaQuery.of(context).size.width < 600 ? 1 : 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: MediaQuery.of(context).size.width < 600 ? 2.5 : 1.5,
              ),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 4,
              itemBuilder: (context, index) {
                switch (index) {
                  case 0:
                    return _buildStatCard(
                      title: 'Toplam Sipariş',
                      value: '124',
                      icon: Icons.shopping_cart,
                      color: Colors.blue,
                      context: context,
                    );
                  case 1:
                    return _buildStatCard(
                      title: 'Toplam Gelir',
                      value: '12.450 ₺',
                      icon: Icons.attach_money,
                      color: Colors.green,
                      context: context,
                    );
                  case 2:
                    return _buildStatCard(
                      title: 'Toplam Ürün',
                      value: '48',
                      icon: Icons.inventory_2,
                      color: Colors.orange,
                      context: context,
                    );
                  case 3:
                    return _buildStatCard(
                      title: 'Toplam Kullanıcı',
                      value: '256',
                      icon: Icons.people,
                      color: Colors.purple,
                      context: context,
                    );
                  default:
                    return Container();
                }
              },
            ).animate().fadeIn(
                  duration: 600.ms,
                  delay: 200.ms,
                ),

            const SizedBox(height: 32),

            // Son siparişler
            const Text(
              'Son Siparişler',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ).animate().fadeIn(
                  duration: 600.ms,
                  delay: 400.ms,
                ),

            const SizedBox(height: 16),

            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: 5,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primaryColor.withAlpha(26),
                      child: const Icon(
                        Icons.shopping_bag,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    title: Text('Sipariş #${1000 + index}'),
                    subtitle: Text('Ahmet Yılmaz - ${(index + 1) * 100} ₺'),
                    trailing: _getStatusChip(index % 4),
                    onTap: () {
                      // Sipariş detayına git
                    },
                  );
                },
              ),
            ).animate().fadeIn(
                  duration: 600.ms,
                  delay: 600.ms,
                ),

            const SizedBox(height: 32),

            // Stok durumu
            const Text(
              'Stok Durumu',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ).animate().fadeIn(
                  duration: 600.ms,
                  delay: 800.ms,
                ),

            const SizedBox(height: 16),

            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildStockItem(
                      name: 'Ekşi Mayalı Tam Buğday Ekmeği',
                      stock: 24,
                      total: 50,
                    ),
                    const SizedBox(height: 12),
                    _buildStockItem(
                      name: 'Çavdarlı Ekşi Maya Ekmek',
                      stock: 12,
                      total: 30,
                    ),
                    const SizedBox(height: 12),
                    _buildStockItem(
                      name: 'Cevizli Ekşi Maya Ekmek',
                      stock: 5,
                      total: 20,
                      isLow: true,
                    ),
                    const SizedBox(height: 12),
                    _buildStockItem(
                      name: 'Zeytinli Ekşi Maya Ekmek',
                      stock: 18,
                      total: 25,
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(
                  duration: 600.ms,
                  delay: 1000.ms,
                ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required BuildContext context,
  }) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: 4,
      shadowColor: color.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              isDarkMode ? Colors.grey.shade800 : Colors.white,
              isDarkMode ? Colors.grey.shade900 : color.withValues(alpha: 0.05),
            ],
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 24,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.arrow_upward,
                        color: color,
                        size: 14,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '12%',
                        style: TextStyle(
                          color: color,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                color: isDarkMode ? Colors.grey.shade300 : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _getStatusChip(int status) {
    final List<Map<String, dynamic>> statuses = [
      {'label': 'Bekliyor', 'color': Colors.orange},
      {'label': 'İşleniyor', 'color': Colors.blue},
      {'label': 'Kargoda', 'color': Colors.purple},
      {'label': 'Tamamlandı', 'color': Colors.green},
    ];

    final statusData = statuses[status];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: statusData['color'].withAlpha(26),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: statusData['color'].withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      child: Text(
        statusData['label'],
        style: TextStyle(
          color: statusData['color'],
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildStockItem({
    required String name,
    required int stock,
    required int total,
    bool isLow = false,
  }) {
    final double percentage = stock / total;
    final Color color = isLow ? Colors.red : Colors.green;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: color.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Text(
                '$stock / $total',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: color,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Stack(
          children: [
            Container(
              height: 10,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.withAlpha(26),
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            Container(
              height: 10,
              width: percentage * double.infinity,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(5),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.3),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
