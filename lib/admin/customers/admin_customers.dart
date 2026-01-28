import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/user.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../utils/logger.dart';
import '../widgets/admin_app_bar.dart';
import '../widgets/admin_drawer.dart';

class AdminCustomersPage extends StatefulWidget {
  const AdminCustomersPage({Key? key}) : super(key: key);

  @override
  State<AdminCustomersPage> createState() => _AdminCustomersPageState();
}

class _AdminCustomersPageState extends State<AdminCustomersPage> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  List<User> _allUsers = [];

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // Firestore'dan kullanıcıları yükle
  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final firestore = FirebaseFirestore.instance;
      final querySnapshot = await firestore.collection(FirestoreCollections.users).get();

      if (querySnapshot.docs.isEmpty) {
        Logger.warning('Hiç kullanıcı bulunamadı');
        setState(() {
          _allUsers = [];
          _isLoading = false;
        });
        return;
      }

      final users = querySnapshot.docs
          .map((doc) {
            try {
              final data = doc.data();
              return User(
                id: doc.id,
                email: data['email'] ?? '',
                fullName: data['fullName'] ?? '',
                phoneNumber: data['phoneNumber'] ?? '',
                address: data['address'] ?? '',
                favoriteProductIds: List<String>.from(data['favoriteProductIds'] ?? []),
                createdAt: data['createdAt'] != null
                    ? (data['createdAt'] is Timestamp
                        ? (data['createdAt'] as Timestamp).toDate()
                        : DateTime.parse(data['createdAt']))
                    : DateTime.now(),
                isAdmin: data['isAdmin'] ?? false,
              );
            } catch (e) {
              Logger.error('Kullanıcı nesnesi oluşturulurken hata: $e');
              return null;
            }
          })
          .whereType<User>()
          .toList();

      setState(() {
        _allUsers = users;
        _isLoading = false;
      });

      Logger.info('${users.length} kullanıcı yüklendi');
    } catch (e) {
      Logger.error('Kullanıcılar yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kullanıcılar yüklenirken bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Kullanıcıyı güncelle
  Future<void> _updateUser(User user, bool isAdmin) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final firestore = FirebaseFirestore.instance;
      await firestore.collection(FirestoreCollections.users).doc(user.id).update({
        'fullName': user.fullName,
        'phoneNumber': user.phoneNumber,
        'address': user.address,
        'isAdmin': isAdmin,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      // Kullanıcıyı listede güncelle
      setState(() {
        final index = _allUsers.indexWhere((u) => u.id == user.id);
        if (index != -1) {
          _allUsers[index] = user.copyWith(isAdmin: isAdmin);
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kullanıcı başarıyla güncellendi'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      Logger.error('Kullanıcı güncellenirken hata: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kullanıcı güncellenirken bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AdminAppBar(title: 'Müşteri Yönetimi'),
      drawer: AdminDrawer(currentIndex: 11),
      body: Padding(
        padding: EdgeInsets.all(isSmallScreen ? 8.0 : 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header - başlık ve yenileme butonu
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Müşteri Listesi',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 20 : 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ).animate().fadeIn(duration: 600.ms).slideY(
                        begin: 0.2,
                        end: 0,
                        curve: Curves.easeOutQuad,
                        duration: 600.ms,
                      ),
                ),
                ElevatedButton.icon(
                  onPressed: _loadUsers,
                  icon: Icon(Icons.refresh, size: isSmallScreen ? 16 : 18),
                  label: Text(
                    isSmallScreen ? 'Yenile' : 'Kullanıcıları Yenile',
                    style: TextStyle(fontSize: isSmallScreen ? 12 : 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: EdgeInsets.symmetric(
                      horizontal: isSmallScreen ? 8 : 16,
                      vertical: isSmallScreen ? 6 : 12,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Arama
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Müşteri ara...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: EdgeInsets.symmetric(
                  vertical: isSmallScreen ? 10 : 12,
                  horizontal: isSmallScreen ? 10 : 12,
                ),
              ),
              onChanged: (value) {
                setState(() {});
              },
            ),

            const SizedBox(height: 16),

            // Müşteri sayısı
            _isLoading
                ? SizedBox()
                : Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Text(
                      'Toplam ${_searchController.text.isEmpty ? _allUsers.length : _filteredUsers().length} müşteri',
                      style: TextStyle(
                        fontSize: isSmallScreen ? 13 : 14,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),

            // Kullanıcı listesi
            Expanded(
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.primaryColor,
                      ),
                    )
                  : _buildUserList(),
            ),
          ],
        ),
      ),
    );
  }

  // Filtrelenmiş kullanıcı listesini döndürür
  List<User> _filteredUsers() {
    if (_searchController.text.isEmpty) {
      return _allUsers;
    }

    final searchQuery = _searchController.text.toLowerCase();
    return _allUsers
        .where((user) =>
            user.fullName.toLowerCase().contains(searchQuery) ||
            user.email.toLowerCase().contains(searchQuery) ||
            user.phoneNumber.toLowerCase().contains(searchQuery))
        .toList();
  }

  Widget _buildUserList() {
    final filteredUsers = _filteredUsers();

    if (_allUsers.isEmpty) {
      return const Center(
        child: Text(
          'Henüz müşteri bulunmamaktadır.',
          style: TextStyle(fontSize: 16),
        ),
      );
    }

    if (filteredUsers.isEmpty) {
      return Center(
        child: Text(
          'Aramanızla eşleşen müşteri bulunamadı: "${_searchController.text}"',
          style: const TextStyle(fontSize: 16),
          textAlign: TextAlign.center,
        ),
      );
    }

    return ListView.builder(
      itemCount: filteredUsers.length,
      itemBuilder: (context, index) {
        final user = filteredUsers[index];
        return _buildUserItem(user);
      },
    );
  }

  Widget _buildUserItem(User user) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;
    final isVerySmallScreen = MediaQuery.of(context).size.width < 360;

    return Card(
      margin: EdgeInsets.symmetric(vertical: 8, horizontal: isSmallScreen ? 0 : 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
        child: isSmallScreen
            ? _buildMobileUserItem(user, isVerySmallScreen)
            : _buildDesktopUserItem(user),
      ),
    );
  }

  Widget _buildMobileUserItem(User user, bool isVerySmallScreen) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            // Kullanıcı avatarı
            CircleAvatar(
              radius: isVerySmallScreen ? 20 : 24,
              backgroundColor: AppTheme.primaryColor.withAlpha(26),
              child: Text(
                user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                style: TextStyle(
                  fontSize: isVerySmallScreen ? 14 : 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),

            const SizedBox(width: 12),

            // Kullanıcı bilgileri
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.fullName,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: isVerySmallScreen ? 12 : 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    user.email,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: isVerySmallScreen ? 10 : 12,
                    ),
                  ),
                ],
              ),
            ),

            // Kullanıcı durumu
            Container(
              padding: EdgeInsets.symmetric(
                  horizontal: isVerySmallScreen ? 6 : 8, vertical: isVerySmallScreen ? 2 : 4),
              decoration: BoxDecoration(
                color: user.isAdmin ? Colors.purple.withAlpha(26) : Colors.green.withAlpha(26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                user.isAdmin ? 'Admin' : 'Müşteri',
                style: TextStyle(
                  color: user.isAdmin ? Colors.purple : Colors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: isVerySmallScreen ? 8 : 10,
                ),
              ),
            ),
          ],
        ),

        SizedBox(height: isVerySmallScreen ? 8 : 12),

        // İşlem butonları
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton.icon(
              onPressed: () {
                _showUserDetails(user);
              },
              icon: Icon(Icons.info, size: isVerySmallScreen ? 14 : 16),
              label: Text('Detaylar', style: TextStyle(fontSize: isVerySmallScreen ? 10 : 12)),
              style: TextButton.styleFrom(
                foregroundColor: Colors.blue,
                padding: EdgeInsets.symmetric(horizontal: isVerySmallScreen ? 6 : 8),
              ),
            ),
            TextButton.icon(
              onPressed: () {
                _showEditUserDialog(user);
              },
              icon: Icon(Icons.edit, size: isVerySmallScreen ? 14 : 16),
              label: Text('Düzenle', style: TextStyle(fontSize: isVerySmallScreen ? 10 : 12)),
              style: TextButton.styleFrom(
                foregroundColor: Colors.orange,
                padding: EdgeInsets.symmetric(horizontal: isVerySmallScreen ? 6 : 8),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDesktopUserItem(User user) {
    return Row(
      children: [
        // Kullanıcı avatarı
        CircleAvatar(
          radius: 30,
          backgroundColor: AppTheme.primaryColor.withAlpha(26),
          child: Text(
            user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        ),

        const SizedBox(width: 16),

        // Kullanıcı bilgileri
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user.fullName,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                user.email,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.phone,
                    size: 14,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    user.phoneNumber.isNotEmpty ? user.phoneNumber : 'Telefon yok',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Kullanıcı durumu ve işlemler
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: user.isAdmin ? Colors.purple.withAlpha(26) : Colors.green.withAlpha(26),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                user.isAdmin ? 'Admin' : 'Müşteri',
                style: TextStyle(
                  color: user.isAdmin ? Colors.purple : Colors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton.icon(
                  onPressed: () {
                    _showUserDetails(user);
                  },
                  icon: const Icon(Icons.info),
                  label: const Text('Detaylar'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.blue,
                  ),
                ),
                const SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () {
                    _showEditUserDialog(user);
                  },
                  icon: const Icon(Icons.edit),
                  label: const Text('Düzenle'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.orange,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  void _showUserDetails(User user) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        titlePadding: EdgeInsets.fromLTRB(24, 24, 24, 0),
        contentPadding: EdgeInsets.fromLTRB(24, 20, 24, 0),
        title: Text(
          '${user.fullName} Detayları',
          style: TextStyle(
            fontSize: isSmallScreen ? 16 : 18,
          ),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Kullanıcı Bilgileri',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text('ID: ${user.id}'),
              Text('E-posta: ${user.email}'),
              Text('Ad Soyad: ${user.fullName}'),
              Text('Telefon: ${user.phoneNumber.isNotEmpty ? user.phoneNumber : "Belirtilmemiş"}'),
              Text('Adres: ${user.address.isNotEmpty ? user.address : "Belirtilmemiş"}'),
              Text(
                  'Kayıt Tarihi: ${user.createdAt.day}/${user.createdAt.month}/${user.createdAt.year}'),
              Text('Yetki: ${user.isAdmin ? "Yönetici" : "Müşteri"}'),
              const SizedBox(height: 16),
              const Text(
                'Favoriler',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              user.favoriteProductIds.isEmpty
                  ? const Text('Favori ürün bulunmamaktadır.')
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: user.favoriteProductIds
                          .map((productId) => Text('• Ürün ID: $productId'))
                          .toList(),
                    ),
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
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  void _showEditUserDialog(User user) {
    final fullNameController = TextEditingController(text: user.fullName);
    final phoneController = TextEditingController(text: user.phoneNumber);
    final addressController = TextEditingController(text: user.address);
    bool isAdmin = user.isAdmin;
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          titlePadding: EdgeInsets.fromLTRB(24, 24, 24, 0),
          contentPadding: EdgeInsets.fromLTRB(24, 20, 24, 0),
          title: Text(
            '${user.fullName} Düzenle',
            style: TextStyle(
              fontSize: isSmallScreen ? 16 : 18,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: fullNameController,
                  decoration: const InputDecoration(
                    labelText: 'Ad Soyad',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Telefon',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: addressController,
                  decoration: const InputDecoration(
                    labelText: 'Adres',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Yönetici Yetkisi'),
                  value: isAdmin,
                  onChanged: (bool value) {
                    setState(() {
                      isAdmin = value;
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () {
                // Kullanıcıyı güncelle
                final updatedUser = user.copyWith(
                  fullName: fullNameController.text,
                  phoneNumber: phoneController.text,
                  address: addressController.text,
                );

                Navigator.of(context).pop();
                _updateUser(updatedUser, isAdmin);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
              ),
              child: const Text('Güncelle'),
            ),
          ],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
