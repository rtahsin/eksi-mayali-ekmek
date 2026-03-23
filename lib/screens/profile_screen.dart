// ignore_for_file: unused_field, unused_local_variable, unused_element

/*
 * Profil Ekranı (ProfileScreen)
 * 
 * Bu dosya, kullanıcının profil bilgilerini görüntüleyebileceği, düzenleyebileceği
 * ve hesap ayarlarını yönetebileceği bir arayüz sunar.
 * 
 * Özellikler:
 * - Kullanıcı profil bilgilerini görüntüleme ve düzenleme
 * - Adres yönetimi
 * - Sipariş geçmişi görüntüleme
 * - Hesap ayarları (bildirim tercihleri, vb.)
 * - Sadakat puanları takibi
 * - Oturum kapatma
 * 
 * Kullanılan servisler:
 * - AuthService: Kullanıcı oturumu ve profil yönetimi
 * 
 * Bağlantılı ekranlar:
 * - LoginScreen: Kullanıcı girişi
 * - OrderHistoryScreen: Sipariş geçmişi
 * - FavoritesScreen: Favori ürünler
 * 
 * Güncelleme Tarihi: Haziran 2023
 */

// ignore_for_file: use_key_in_widget_constructors, use_build_context_synchronously, library_private_types_in_public_api, prefer_const_constructors, deprecated_member_use, unused_import, use_super_parameters

import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../core/di/service_locator.dart';
import '../models/address.dart' as address_model;
import '../models/order.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/order_service.dart';
import '../services/privacy_service.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/privacy_consent_dialog.dart';
import 'admin/admin_dashboard.dart';
import 'favorites_screen.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';
import 'order_history_screen.dart';
import 'preferences_screen.dart';

// SliverAppBar için gerekli delegate sınıfı
class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;

  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;

  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}

class ProfileScreen extends StatefulWidget {
  static const routeName = '/profile';

  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _fullNameController;
  late TextEditingController _phoneController;
  late TextEditingController _addressController;
  late TextEditingController _bioController;
  late TabController _tabController;

  DateTime? _selectedBirthDate;
  String? _selectedGender;
  bool _isEditing = false;
  bool _isLoading = false;
  int _currentIndex = 0;

  // Sipariş listesi cache
  List<Order>? _cachedOrders;
  bool _ordersLoading = false;
  String? _ordersError;

  final PrivacyService _privacyService = ServiceLocator.getIt<PrivacyService>();

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController();
    _phoneController = TextEditingController();
    _addressController = TextEditingController();
    _bioController = TextEditingController();
    _tabController = TabController(length: 4, vsync: this);

    // Tab değişikliklerini dinle
    _tabController.addListener(() {
      if (_tabController.index == 1 && _cachedOrders == null && !_ordersLoading) {
        // Siparişler sekmesine geçildiğinde yükle
        _loadOrders();
      }
    });

    // Kullanıcı bilgilerini yükle
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadUserData();
    });
  }

  Future<void> _loadOrders() async {
    if (_ordersLoading) return;

    setState(() {
      _ordersLoading = true;
      _ordersError = null;
    });

    try {
      final orderService = Provider.of<OrderService>(context, listen: false);
      final orders = await orderService.getUserOrders();

      if (mounted) {
        setState(() {
          _cachedOrders = orders;
          _ordersLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _ordersError = e.toString();
          _ordersLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _bioController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _loadUserData() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final user = authService.currentUser;

    if (user != null) {
      _fullNameController.text = user.fullName;
      _phoneController.text = user.phoneNumber;
      _addressController.text = user.address;
      _bioController.text = user.bio ?? '';
      _selectedBirthDate = user.birthDate;
      _selectedGender = user.gender;
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedBirthDate ?? DateTime(1990),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedBirthDate) {
      setState(() {
        _selectedBirthDate = picked;
      });
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.updateUserProfile(
        fullName: _fullNameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        address: _addressController.text.trim(),
        bio: _bioController.text.trim(),
        birthDate: _selectedBirthDate,
        gender: _selectedGender,
      );

      setState(() {
        _isEditing = false;
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Profil bilgileriniz güncellendi'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Profil güncellenirken bir hata oluştu'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _logout() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(LoginScreen.routeName);
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final currentUser = authService.currentUser;

    if (currentUser == null) {
      return const Center(
        child: Text('Lütfen giriş yapınız'),
      );
    }

    // Profil ekranındaki listede KVKK izinleri yönetme seçeneği ekle
    return _buildProfileScreen(context, currentUser, authService);
  }

  // Profil ekranı
  Widget _buildProfileScreen(BuildContext context, User user, AuthService authService) {
    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            _buildSliverAppBar(context, user),
            _buildTabBar(),
          ];
        },
        body: _isLoading
            ? Center(child: CircularProgressIndicator())
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildProfileTab(user),
                  _buildAddressesTab(user),
                  _buildOrdersTab(user),
                  _buildSettingsTabAsync(authService),
                ],
              ),
      ),
    );
  }

  // SliverAppBar bileşeni
  Widget _buildSliverAppBar(BuildContext context, User user) {
    return SliverAppBar(
      expandedHeight: 200.0,
      floating: false,
      pinned: true,
      backgroundColor: AppTheme.primaryColor,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          user.fullName,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withValues(alpha: 0.8),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 50,
              left: 0,
              right: 0,
              child: Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.white,
                      backgroundImage:
                          user.profileImageUrl != null ? NetworkImage(user.profileImageUrl!) : null,
                      child: user.profileImageUrl == null
                          ? Icon(
                              Icons.person,
                              size: 60,
                              color: AppTheme.primaryColor,
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        if (_currentIndex == 0) // Sadece profil sekmesinde düzenleme butonu göster
          _isEditing
              ? IconButton(
                  icon: Icon(Icons.save),
                  tooltip: 'Kaydet',
                  onPressed: _isLoading ? null : _saveProfile,
                )
              : IconButton(
                  icon: Icon(Icons.edit),
                  tooltip: 'Düzenle',
                  onPressed: () {
                    setState(() {
                      _isEditing = true;
                    });
                  },
                ),
        IconButton(
          icon: Icon(Icons.logout),
          tooltip: 'Çıkış Yap',
          onPressed: _logout,
        ),
      ],
    );
  }

  // TabBar bileşeni
  Widget _buildTabBar() {
    return SliverPersistentHeader(
      delegate: _SliverAppBarDelegate(
        TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primaryColor,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          tabs: [
            Tab(icon: Icon(Icons.person), text: 'Profil'),
            Tab(icon: Icon(Icons.location_on), text: 'Adresler'),
            Tab(icon: Icon(Icons.shopping_bag), text: 'Siparişler'),
            Tab(icon: Icon(Icons.settings), text: 'Ayarlar'),
          ],
        ),
      ),
      pinned: true,
    );
  }

  Widget _buildProfileTab(User user) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(AppTheme.spaceLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Kullanıcı Bilgileri Kartı
          if (!_isEditing) ...[
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusXl),
              ),
              child: Padding(
                padding: EdgeInsets.all(AppTheme.spaceLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.person, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(
                          'Ad Soyad',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(user.fullName),
                    Divider(height: 24),
                    Row(
                      children: [
                        Icon(Icons.email, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(
                          'E-posta',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(user.email),
                    Divider(height: 24),
                    Row(
                      children: [
                        Icon(Icons.phone, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(
                          'Telefon',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(user.phoneNumber.isNotEmpty ? user.phoneNumber : 'Belirtilmemiş'),
                    Divider(height: 24),
                    Row(
                      children: [
                        Icon(Icons.cake, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(
                          'Doğum Tarihi',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(user.birthDate != null
                        ? DateFormat('dd.MM.yyyy').format(user.birthDate!)
                        : 'Belirtilmemiş'),
                    Divider(height: 24),
                    Row(
                      children: [
                        Icon(Icons.calendar_today, color: AppTheme.primaryColor),
                        SizedBox(width: 8),
                        Text(
                          'Üyelik Tarihi',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 4),
                    Text(DateFormat('dd.MM.yyyy').format(user.createdAt)),
                    SizedBox(height: 16),
                    // Profili düzenle butonu
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _isEditing = true;
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          ),
                        ),
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                          child: Text(
                            'Profili Düzenle',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1, end: 0),
          ] else ...[
            // Profil Düzenleme Formu
            Text(
              'Profil Bilgilerini Düzenle',
              style: GoogleFonts.playfairDisplay(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  // Ad Soyad
                  TextFormField(
                    controller: _fullNameController,
                    decoration: InputDecoration(
                      labelText: 'Ad Soyad',
                      prefixIcon: Icon(Icons.person),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adınızı ve soyadınızı girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),

                  // Telefon
                  TextFormField(
                    controller: _phoneController,
                    decoration: InputDecoration(
                      labelText: 'Telefon',
                      prefixIcon: Icon(Icons.phone),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen telefon numaranızı girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),

                  // Doğum Tarihi
                  InkWell(
                    onTap: () => _selectDate(context),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Doğum Tarihi',
                        prefixIcon: Icon(Icons.cake),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _selectedBirthDate != null
                                ? DateFormat('dd.MM.yyyy').format(_selectedBirthDate!)
                                : 'Seçiniz',
                          ),
                          Icon(Icons.calendar_today, size: 16),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 16),

                  // Adres
                  TextFormField(
                    controller: _addressController,
                    decoration: InputDecoration(
                      labelText: 'Adres',
                      prefixIcon: Icon(Icons.home),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                    ),
                    maxLines: 3,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adresinizi girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),

                  // Biyografi
                  TextFormField(
                    controller: _bioController,
                    decoration: InputDecoration(
                      labelText: 'Hakkımda',
                      prefixIcon: Icon(Icons.info_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                    ),
                    maxLines: 3,
                  ),
                  SizedBox(height: 24),

                  // Kaydet ve İptal Butonları
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _isEditing = false;
                              _loadUserData(); // Form değerlerini sıfırla
                            });
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey,
                            side: BorderSide(color: Colors.grey),
                            padding: EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            ),
                          ),
                          child: Text('İptal'),
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _saveProfile,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: AppTheme.spaceLg),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            ),
                          ),
                          child: _isLoading
                              ? CircularProgressIndicator(color: Colors.white)
                              : Text(
                                  'Kaydet',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms, delay: 200.ms).slideY(begin: 0.1, end: 0),
          ],

          SizedBox(height: 24),

          // Sadakat programı kaldırıldı
        ],
      ),
    );
  }

  Widget _buildAddressesTab(User user) {
    final authService = Provider.of<AuthService>(context);
    final addresses = authService.getUserAddresses(); // AuthService'den adresleri al

    return SingleChildScrollView(
      padding: EdgeInsets.all(AppTheme.spaceLg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Kayıtlı Adreslerim',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              ElevatedButton.icon(
                onPressed: () {
                  _showAddAddressDialog(context, authService);
                },
                icon: Icon(Icons.add),
                label: Text('Yeni Adres'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          SizedBox(height: 8), // Boşluğu azalttım
          // Tüm adresler için tam ekran yönetim sayfasına geçiş butonu
          if (addresses.isNotEmpty)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  Navigator.of(context).pushNamed('/address-management');
                },
                icon: Icon(Icons.manage_accounts, size: 18),
                label: Text('Tüm Adresleri Yönet'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primaryColor,
                ),
              ),
            ),
          SizedBox(height: 8), // Ekstra boşluk ekledim
          if (addresses.isEmpty)
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.location_off,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Henüz kayıtlı adresiniz bulunmuyor',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              itemCount: addresses.length,
              itemBuilder: (context, index) {
                final address = addresses[index];
                return Card(
                  margin: EdgeInsets.only(bottom: AppTheme.spaceMd),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    side: BorderSide(
                      color: address.isDefault ? AppTheme.primaryColor : Colors.transparent,
                      width: address.isDefault ? 2 : 0,
                    ),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(AppTheme.spaceLg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.location_on, color: AppTheme.primaryColor),
                                SizedBox(width: 8),
                                Text(
                                  address.fullName,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            if (address.isDefault)
                              Container(
                                padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                                ),
                                child: Text(
                                  'Varsayılan',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        SizedBox(height: 8),
                        Text(address.addressLine1),
                        SizedBox(height: 4),
                        Text('${address.district}, ${address.city}, ${address.postalCode}'),
                        SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (!address.isDefault)
                              TextButton(
                                onPressed: () async {
                                  try {
                                    await authService.setDefaultAddress(address.id);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Varsayılan adres güncellendi'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                    setState(() {}); // Sayfayı yenile
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('İşlem sırasında bir hata oluştu: $e'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                },
                                child: Text('Varsayılan Yap'),
                              ),
                            TextButton(
                              onPressed: () {
                                _showEditAddressDialog(context, authService, address);
                              },
                              child: Text('Düzenle'),
                            ),
                            TextButton(
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: Text('Adres Silme'),
                                    content: Text('Bu adresi silmek istediğinizden emin misiniz?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.of(context).pop(false),
                                        child: Text('İptal'),
                                      ),
                                      TextButton(
                                        onPressed: () => Navigator.of(context).pop(true),
                                        child: Text('Sil'),
                                        style: TextButton.styleFrom(foregroundColor: Colors.red),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirm == true) {
                                  try {
                                    await authService.deleteUserAddress(address.id);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Adres başarıyla silindi'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                    setState(() {}); // Sayfayı yenile
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Adres silinirken bir hata oluştu: $e'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: Colors.red,
                              ),
                              child: Text('Sil'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
                    .animate()
                    .fadeIn(duration: 300.ms, delay: 100.ms * index)
                    .slideY(begin: 0.1, end: 0);
              },
            ),
        ],
      ),
    );
  }

  // Yeni adres ekleme dialog'u
  void _showAddAddressDialog(BuildContext context, AuthService authService) {
    final formKey = GlobalKey<FormState>();
    final TextEditingController titleController = TextEditingController();
    final TextEditingController addressLine1Controller = TextEditingController();
    final TextEditingController addressLine2Controller = TextEditingController();
    final TextEditingController cityController = TextEditingController();
    final TextEditingController districtController = TextEditingController();
    final TextEditingController postalCodeController = TextEditingController();
    bool isDefault = false;
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Yeni Adres Ekle'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: 'Adres Başlığı',
                      hintText: 'Ev, İş, vb.',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adres başlığı girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: addressLine1Controller,
                    decoration: InputDecoration(
                      labelText: 'Adres Satırı 1',
                      hintText: 'Sokak, Bina No, Daire No',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adres bilgisi girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: addressLine2Controller,
                    decoration: InputDecoration(
                      labelText: 'Adres Satırı 2 (İsteğe bağlı)',
                      hintText: 'Ek adres bilgisi',
                    ),
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: cityController,
                    decoration: InputDecoration(
                      labelText: 'İl',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen il girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: districtController,
                    decoration: InputDecoration(
                      labelText: 'İlçe',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen ilçe girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: postalCodeController,
                    decoration: InputDecoration(
                      labelText: 'Posta Kodu',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen posta kodu girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),
                  CheckboxListTile(
                    title: Text('Varsayılan adres olarak ayarla'),
                    value: isDefault,
                    onChanged: (value) {
                      setState(() {
                        isDefault = value ?? false;
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (formKey.currentState!.validate()) {
                        setState(() {
                          isLoading = true;
                        });

                        try {
                          // Yeni adres oluştur
                          final newAddress = address_model.Address(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            fullName: titleController.text,
                            phoneNumber: authService.currentUser?.phoneNumber ?? '',
                            addressLine1: addressLine1Controller.text,
                            addressLine2: addressLine2Controller.text.isEmpty
                                ? null
                                : addressLine2Controller.text,
                            city: cityController.text,
                            district: districtController.text,
                            postalCode: postalCodeController.text,
                            isDefault: isDefault,
                          );

                          // Adresi ekle
                          await authService.addUserAddress(newAddress);

                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Adres başarıyla eklendi'),
                              backgroundColor: Colors.green,
                            ),
                          );

                          // ProfileScreen'i yenile
                          if (mounted) {
                            this.setState(() {});
                          }
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Adres eklenirken bir hata oluştu: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                          if (mounted) {
                            setState(() {
                              isLoading = false;
                            });
                          }
                        }
                      }
                    },
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : Text('Kaydet'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Adres düzenleme dialog'u
  void _showEditAddressDialog(
      BuildContext context, AuthService authService, address_model.Address address) {
    final formKey = GlobalKey<FormState>();
    final TextEditingController titleController = TextEditingController(text: address.fullName);
    final TextEditingController addressLine1Controller =
        TextEditingController(text: address.addressLine1);
    final TextEditingController addressLine2Controller =
        TextEditingController(text: address.addressLine2 ?? '');
    final TextEditingController cityController = TextEditingController(text: address.city);
    final TextEditingController districtController = TextEditingController(text: address.district);
    final TextEditingController postalCodeController =
        TextEditingController(text: address.postalCode);
    bool isDefault = address.isDefault;
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Adres Düzenle'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: 'Adres Başlığı',
                      hintText: 'Ev, İş, vb.',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adres başlığı girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: addressLine1Controller,
                    decoration: InputDecoration(
                      labelText: 'Adres Satırı 1',
                      hintText: 'Sokak, Bina No, Daire No',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen adres bilgisi girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: addressLine2Controller,
                    decoration: InputDecoration(
                      labelText: 'Adres Satırı 2 (İsteğe bağlı)',
                      hintText: 'Ek adres bilgisi',
                    ),
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: cityController,
                    decoration: InputDecoration(
                      labelText: 'İl',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen il girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: districtController,
                    decoration: InputDecoration(
                      labelText: 'İlçe',
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen ilçe girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 12),
                  TextFormField(
                    controller: postalCodeController,
                    decoration: InputDecoration(
                      labelText: 'Posta Kodu',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Lütfen posta kodu girin';
                      }
                      return null;
                    },
                  ),
                  SizedBox(height: 16),
                  CheckboxListTile(
                    title: Text('Varsayılan adres olarak ayarla'),
                    value: isDefault,
                    onChanged: (value) {
                      setState(() {
                        isDefault = value ?? false;
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('İptal'),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (formKey.currentState!.validate()) {
                        setState(() {
                          isLoading = true;
                        });

                        try {
                          // Güncellenen adresi oluştur
                          final updatedAddress = address_model.Address(
                            id: address.id,
                            fullName: titleController.text,
                            phoneNumber: authService.currentUser?.phoneNumber ?? '',
                            addressLine1: addressLine1Controller.text,
                            addressLine2: addressLine2Controller.text.isEmpty
                                ? null
                                : addressLine2Controller.text,
                            city: cityController.text,
                            district: districtController.text,
                            postalCode: postalCodeController.text,
                            isDefault: isDefault,
                          );

                          // Adresi güncelle
                          await authService.updateUserAddress(updatedAddress);

                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Adres başarıyla güncellendi'),
                              backgroundColor: Colors.green,
                            ),
                          );

                          // ProfileScreen'i yenile
                          if (mounted) {
                            this.setState(() {});
                          }
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Adres güncellenirken bir hata oluştu: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                          if (mounted) {
                            setState(() {
                              isLoading = false;
                            });
                          }
                        }
                      }
                    },
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : Text('Kaydet'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersTab(User user) {
    // İlk yükleme kontrolü
    if (_cachedOrders == null && !_ordersLoading && _ordersError == null) {
      _loadOrders();
    }

    // Yükleniyor durumu
    if (_ordersLoading) {
      return Center(child: CircularProgressIndicator());
    }

    // Hata durumu
    if (_ordersError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            SizedBox(height: 16),
            Text(
              'Siparişler yüklenirken hata oluştu',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            SizedBox(height: 8),
            Text(
              _ordersError!,
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadOrders,
              icon: Icon(Icons.refresh),
              label: Text('Tekrar Dene'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    final orders = _cachedOrders ?? [];

    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.shopping_bag_outlined,
              size: 80,
              color: Colors.grey[300],
            ),
            SizedBox(height: 16),
            Text(
              'Henüz sipariş vermediniz',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
              ),
            ),
            SizedBox(height: 8),
            Text(
              'İlk siparişinizi vererek başlayın!',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(horizontal: AppTheme.space3xl, vertical: AppTheme.spaceMd),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                ),
              ),
              child: Text('Alışverişe Başla'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: EdgeInsets.all(AppTheme.spaceLg),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          return _buildOrderCard(order);
        },
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    final currencyFormat = NumberFormat.currency(locale: 'tr_TR', symbol: '₺', decimalDigits: 2);
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm', 'tr_TR');

    Color statusColor;
    IconData statusIcon;

    switch (order.orderStatus) {
      case OrderStatus.pending:
        statusColor = Colors.orange;
        statusIcon = Icons.hourglass_empty;
        break;
      case OrderStatus.processing:
        statusColor = Colors.blue;
        statusIcon = Icons.shopping_basket;
        break;
      case OrderStatus.ready:
        statusColor = Colors.purple;
        statusIcon = Icons.check_circle_outline;
        break;
      case OrderStatus.delivered:
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case OrderStatus.cancelled:
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
    }

    return Card(
      margin: EdgeInsets.only(bottom: AppTheme.spaceLg),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OrderDetailScreen(
                order: order,
                orderService: Provider.of<OrderService>(context, listen: false),
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Padding(
          padding: EdgeInsets.all(AppTheme.spaceLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Başlık satırı
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(statusIcon, color: statusColor, size: 20),
                      SizedBox(width: 8),
                      Text(
                        order.orderStatus.displayName,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    dateFormat.format(order.orderDate),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),

              // Sipariş numarası
              Text(
                'Sipariş #${order.id.substring(0, 8).toUpperCase()}',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 8),

              // Ürün bilgisi
              Text(
                '${order.items.length} ürün',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),

              // İlk 2 ürünü göster
              if (order.items.isNotEmpty) ...[
                SizedBox(height: 8),
                ...order.items.take(2).map((item) => Padding(
                      padding: EdgeInsets.only(bottom: AppTheme.spaceXxs),
                      child: Row(
                        children: [
                          Text(
                            '• ${item.quantity}x ',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[700],
                            ),
                          ),
                          Expanded(
                            child: Text(
                              item.name,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[700],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    )),
                if (order.items.length > 2)
                  Text(
                    '  ... ve ${order.items.length - 2} ürün daha',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
              ],

              Divider(height: 24),

              // Toplam tutar ve detay butonu
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Toplam: ${currencyFormat.format(order.amount ?? 0)}',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => OrderDetailScreen(
                            order: order,
                            orderService: Provider.of<OrderService>(context, listen: false),
                          ),
                        ),
                      );
                    },
                    icon: Icon(Icons.arrow_forward, size: 16),
                    label: Text('Detaylar'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0);
  }

  // Profil ayarları sekmesi (Async - Custom Claims kontrolü için)
  Widget _buildSettingsTabAsync(AuthService authService) {
    return FutureBuilder<bool>(
      future: authService.checkAdminPermission(),
      builder: (context, snapshot) {
        final isAdmin = snapshot.data ?? false;
        return _buildSettingsTab(isAdmin);
      },
    );
  }

  // Profil ayarları sekmesi
  Widget _buildSettingsTab(bool isAdmin) {
    return ListView(
      padding: EdgeInsets.symmetric(vertical: AppTheme.spaceLg, horizontal: AppTheme.spaceLg),
      children: [
        // Hesap Ayarları
        _buildSectionTitle('Hesap Ayarları'),
        _buildSettingsTile(
          title: 'E-posta Adresini Değiştir',
          icon: Icons.email,
          onTap: () => _showChangeEmailDialog(context),
        ),
        _buildSettingsTile(
          title: 'Şifre Değiştir',
          icon: Icons.lock,
          onTap: () {
            // Şifre değiştirme fonksiyonu - Firebase Authentication ile yapılır
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content:
                    Text('Şifre değiştirme için e-posta adresinize sıfırlama bağlantısı gönderin'),
                action: SnackBarAction(
                  label: 'Gönder',
                  onPressed: () async {
                    final authService = Provider.of<AuthService>(context, listen: false);
                    final email = authService.currentUser?.email;
                    if (email != null) {
                      await firebase_auth.FirebaseAuth.instance
                          .sendPasswordResetEmail(email: email);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Şifre sıfırlama e-postası gönderildi')),
                      );
                    }
                  },
                ),
              ),
            );
          },
        ),

        // Admin kullanıcıları için Admin Paneli butonu
        if (isAdmin)
          _buildSettingsTile(
            title: 'Admin Paneli',
            icon: Icons.admin_panel_settings,
            onTap: () {
              Navigator.of(context).pushNamed('/admin/login');
            },
            color: AppTheme.primaryColor,
          ),

        Divider(),

        // KVKK İzinleri Yönetme
        ListTile(
          leading: const Icon(Icons.privacy_tip),
          title: const Text('KVKK İzinlerini Yönet'),
          subtitle: const Text('Veri işleme izinlerinizi güncelleyin'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            final authService = Provider.of<AuthService>(context, listen: false);
            final currentUser = authService.currentUser;
            if (currentUser != null) {
              _showPrivacyConsentDialog(context, currentUser.id);
            }
          },
        ),

        // Gizlilik Politikası
        ListTile(
          leading: const Icon(Icons.article_outlined),
          title: const Text('Gizlilik Politikası'),
          subtitle: const Text('KVKK aydınlatma metnimizi okuyun'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).pushNamed('/gizlilik-politikasi'),
        ),

        Divider(),

        // Hesabı Sil
        ListTile(
          leading: const Icon(Icons.delete_forever, color: Colors.red),
          title: const Text(
            'Hesabı Sil',
            style: TextStyle(color: Colors.red),
          ),
          subtitle: const Text('Hesabınızı kalıcı olarak silin'),
          trailing: const Icon(Icons.chevron_right, color: Colors.red),
          onTap: () => _showDeleteAccountDialog(context),
        ),
      ],
    );
  }

  // E-posta değiştirme dialog'u
  void _showChangeEmailDialog(BuildContext context) {
    final newEmailController = TextEditingController();
    final passwordController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final authService = Provider.of<AuthService>(context, listen: false);
    final user = firebase_auth.FirebaseAuth.instance.currentUser;

    // Google ile giriş yapan kullanıcı için farklı mesaj
    final isGoogleUser = user?.providerData.any((info) => info.providerId == 'google.com') ?? false;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.email, color: AppTheme.primaryColor, size: 28),
            SizedBox(width: 12),
            Text('E-posta Değiştir'),
          ],
        ),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Mevcut e-posta: ${user?.email ?? ''}',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
              SizedBox(height: 16),
              TextFormField(
                controller: newEmailController,
                decoration: InputDecoration(
                  labelText: 'Yeni E-posta',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen yeni e-posta adresinizi girin';
                  }
                  if (!value.contains('@')) {
                    return 'Geçerli bir e-posta adresi girin';
                  }
                  return null;
                },
              ),
              if (!isGoogleUser) ...[
                SizedBox(height: 16),
                TextFormField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Mevcut Şifreniz',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Güvenlik için şifrenizi girin';
                    }
                    return null;
                  },
                ),
              ],
              if (isGoogleUser) ...[
                SizedBox(height: 12),
                Container(
                  padding: EdgeInsets.all(AppTheme.spaceMd),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Google hesabı ile giriş yaptığınız için şifre gerekmez',
                          style: TextStyle(fontSize: 12, color: Colors.blue[900]),
                        ),
                      ),
                    ],
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
              if (formKey.currentState!.validate()) {
                Navigator.of(context).pop();
                await _changeEmail(
                    newEmailController.text, isGoogleUser ? null : passwordController.text);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
            ),
            child: Text('E-postayı Değiştir'),
          ),
        ],
      ),
    );
  }

  // E-posta değiştirme fonksiyonu
  Future<void> _changeEmail(String newEmail, String? password) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(child: CircularProgressIndicator()),
    );

    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) throw 'Kullanıcı bulunamadı';

      // Google kullanıcısı değilse şifre ile re-authenticate
      if (password != null) {
        final credential = firebase_auth.EmailAuthProvider.credential(
          email: user.email!,
          password: password,
        );
        await user.reauthenticateWithCredential(credential);
      }

      // E-postayı güncelle
      await user.updateEmail(newEmail);
      await user.sendEmailVerification();

      // Firestore'daki kullanıcı bilgisini güncelle - sadece profil bilgisi güncellenir
      // E-posta Firebase Auth tarafından yönetilir

      if (mounted) {
        Navigator.of(context).pop(); // Loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('E-posta başarıyla değiştirildi. Lütfen yeni e-postanızı doğrulayın.'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() {
          _loadUserData();
        });
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Loading dialog
        String errorMessage = 'E-posta değiştirme başarısız';

        if (e.toString().contains('wrong-password')) {
          errorMessage = 'Şifreniz yanlış';
        } else if (e.toString().contains('email-already-in-use')) {
          errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
        } else if (e.toString().contains('requires-recent-login')) {
          errorMessage = 'Güvenlik nedeniyle lütfen tekrar giriş yapın';
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Hesap silme dialog'u
  void _showDeleteAccountDialog(BuildContext context) {
    final passwordController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final user = firebase_auth.FirebaseAuth.instance.currentUser;

    // Google ile giriş yapan kullanıcı kontrolü
    final isGoogleUser = user?.providerData.any((info) => info.providerId == 'google.com') ?? false;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber, color: Colors.red, size: 28),
            SizedBox(width: 12),
            Text('Hesabı Sil'),
          ],
        ),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bu işlem geri alınamaz!',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.red[700],
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Hesabınız ve tüm verileriniz kalıcı olarak silinecektir:',
                style: TextStyle(fontSize: 14),
              ),
              SizedBox(height: 12),
              Text('• Profil bilgileriniz', style: TextStyle(fontSize: 13)),
              Text('• Favori ürünleriniz', style: TextStyle(fontSize: 13)),
              Text('• Kayıtlı adresleriniz', style: TextStyle(fontSize: 13)),
              Text('• Tercihleriniz', style: TextStyle(fontSize: 13)),
              SizedBox(height: 16),
              if (!isGoogleUser) ...[
                Text(
                  'Devam etmek için şifrenizi girin:',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
                SizedBox(height: 8),
                TextFormField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Şifre',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Lütfen şifrenizi girin';
                    }
                    return null;
                  },
                ),
              ] else ...[
                Container(
                  padding: EdgeInsets.all(AppTheme.spaceMd),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: Colors.orange[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.orange[700], size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Google hesabı ile giriş yaptığınız için doğrudan silebilirsiniz',
                          style: TextStyle(fontSize: 12, color: Colors.orange[900]),
                        ),
                      ),
                    ],
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
              if (isGoogleUser || formKey.currentState!.validate()) {
                Navigator.of(context).pop();
                await _deleteAccount(isGoogleUser ? null : passwordController.text);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('Hesabı Sil'),
          ),
        ],
      ),
    );
  }

  // Hesap silme fonksiyonu
  Future<void> _deleteAccount(String? password) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(child: CircularProgressIndicator()),
    );

    try {
      final user = firebase_auth.FirebaseAuth.instance.currentUser;
      if (user == null) throw 'Kullanıcı bulunamadı';

      // Şifre ile giriş yapan kullanıcı için re-authenticate
      if (password != null) {
        final credential = firebase_auth.EmailAuthProvider.credential(
          email: user.email!,
          password: password,
        );
        await user.reauthenticateWithCredential(credential);
      }

      final authService = Provider.of<AuthService>(context, listen: false);
      final success = await authService.deleteAccount(password ?? '');

      if (mounted) {
        Navigator.of(context).pop(); // Loading dialog'unu kapat

        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Hesabınız başarıyla silindi'),
              backgroundColor: Colors.green,
            ),
          );

          // Login ekranına yönlendir
          Navigator.of(context).pushNamedAndRemoveUntil(
            LoginScreen.routeName,
            (route) => false,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Loading dialog'unu kapat

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Ayarlar sekmesinde gösterilen öğe
  Widget _buildSettingsTile({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
    Color? color,
  }) {
    return ListTile(
      title: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
      leading: Icon(icon, color: color ?? AppTheme.secondaryColor),
      trailing: Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
      contentPadding: EdgeInsets.symmetric(vertical: AppTheme.spaceXxs, horizontal: AppTheme.spaceLg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
      ),
    );
  }

  // Ayarlar sekmesinde bölüm başlığı
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: AppTheme.spaceLg, bottom: AppTheme.spaceXs, left: AppTheme.spaceXs),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.grey[800],
        ),
      ),
    );
  }

  // KVKK izinleri diyalogu gösterme fonksiyonu
  void _showPrivacyConsentDialog(BuildContext context, String userId) {
    showDialog(
      context: context,
      builder: (context) => PrivacyConsentDialog(
        userId: userId,
        onConsentsUpdated: (consents) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('İzinleriniz başarıyla güncellendi')),
          );
        },
      ),
    );
  }
}
