// ignore_for_file: use_super_parameters, prefer_const_constructors, prefer_const_literals_to_create_immutables

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/user.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../utils/logger.dart';

class AdminUsers extends StatefulWidget {
  const AdminUsers({Key? key}) : super(key: key);

  @override
  State<AdminUsers> createState() => _AdminUsersState();
}

class _AdminUsersState extends State<AdminUsers> {
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
      final querySnapshot =
          await firestore.collection(FirestoreCollections.users).get();

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
                favoriteProductIds:
                    List<String>.from(data['favoriteProductIds'] ?? []),
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
      await firestore
          .collection(FirestoreCollections.users)
          .doc(user.id)
          .update({
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
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: const Text(
                        'Müşteri Yönetimi',
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
                    ),
                    ElevatedButton.icon(
                      onPressed: _loadUsers,
                      icon: const Icon(Icons.refresh, size: 18),
                      label: Text(
                        isSmallScreen ? 'Yenile' : 'Kullanıcıları Yenile',
                        style: TextStyle(
                          fontSize: isSmallScreen ? 12 : 14,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        padding: EdgeInsets.symmetric(
                          horizontal: isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg,
                          vertical: isSmallScreen ? AppTheme.spaceXs : AppTheme.spaceMd,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Arama ve Filtre
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Müşteri ara...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: AppTheme.spaceMd),
                  ),
                  onChanged: (value) {
                    setState(() {});
                  },
                ),
              ],
            ),
          ),

          // Kullanıcı listesi
          Expanded(
            child: _isLoading
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppTheme.primaryColor))
                : _buildUserList(),
          ),
        ],
      ),
    );
  }

  Widget _buildUserList() {
    if (_allUsers.isEmpty) {
      return const Center(
        child: Text(
          'Henüz müşteri bulunmamaktadır.',
          style: TextStyle(fontSize: 16),
        ),
      );
    }

    // Arama filtresi
    var filteredUsers = _allUsers;
    if (_searchController.text.isNotEmpty) {
      final searchQuery = _searchController.text.toLowerCase();
      filteredUsers = filteredUsers
          .where((user) =>
              user.fullName.toLowerCase().contains(searchQuery) ||
              user.email.toLowerCase().contains(searchQuery))
          .toList();
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

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceXs),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Padding(
        padding: EdgeInsets.all(isSmallScreen ? AppTheme.spaceMd : AppTheme.spaceLg),
        child: isSmallScreen
            ? _buildMobileUserItem(user)
            : _buildDesktopUserItem(user),
      ),
    );
  }

  Widget _buildMobileUserItem(User user) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            // Kullanıcı avatarı
            CircleAvatar(
              radius: 24,
              backgroundColor: AppTheme.primaryColor.withAlpha(26),
              child: Text(
                user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                style: const TextStyle(
                  fontSize: 18,
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
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    user.email,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Kullanıcı durumu
            Container(
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs, vertical: AppTheme.spaceXxs),
              decoration: BoxDecoration(
                color: user.isAdmin
                    ? Colors.purple.withAlpha(26)
                    : Colors.green.withAlpha(26),
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: Text(
                user.isAdmin ? 'Admin' : 'Müşteri',
                style: TextStyle(
                  color: user.isAdmin ? Colors.purple : Colors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // İşlem butonları
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton.icon(
              onPressed: () {
                _showUserDetails(user);
              },
              icon: const Icon(Icons.info, size: 16),
              label: const Text('Detaylar', style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(
                foregroundColor: Colors.blue,
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
              ),
            ),
            TextButton.icon(
              onPressed: () {
                _showEditUserDialog(user);
              },
              icon: const Icon(Icons.edit, size: 16),
              label: const Text('Düzenle', style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(
                foregroundColor: Colors.orange,
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceXs),
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
                    user.phoneNumber.isNotEmpty
                        ? user.phoneNumber
                        : 'Telefon yok',
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
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.spaceMd,
                vertical: AppTheme.spaceXxs + 2,
              ),
              decoration: BoxDecoration(
                color: user.isAdmin
                    ? Colors.purple.withAlpha(26)
                    : Colors.green.withAlpha(26),
                borderRadius: BorderRadius.circular(AppTheme.radius2xl),
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
        titlePadding: const EdgeInsets.fromLTRB(AppTheme.space2xl, AppTheme.space2xl, AppTheme.space2xl, AppTheme.spaceZero),
        contentPadding: const EdgeInsets.fromLTRB(AppTheme.space2xl, AppTheme.spaceXl, AppTheme.space2xl, AppTheme.spaceZero),
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
              Text(
                  'Telefon: ${user.phoneNumber.isNotEmpty ? user.phoneNumber : "Belirtilmemiş"}'),
              Text(
                  'Adres: ${user.address.isNotEmpty ? user.address : "Belirtilmemiş"}'),
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
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
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
          titlePadding: const EdgeInsets.fromLTRB(AppTheme.space2xl, AppTheme.space2xl, AppTheme.space2xl, AppTheme.spaceZero),
          contentPadding: const EdgeInsets.fromLTRB(AppTheme.space2xl, AppTheme.spaceXl, AppTheme.space2xl, AppTheme.spaceZero),
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
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
        ),
      ),
    );
  }
}
