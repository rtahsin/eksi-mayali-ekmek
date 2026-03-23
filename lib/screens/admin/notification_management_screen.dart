import 'package:flutter/material.dart';

import '../../core/di/service_locator.dart';
import '../../models/user.dart';
import '../../services/auth_service.dart';
import '../../services/notification_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/logger.dart';
import '../../widgets/admin_app_bar.dart';
import '../../widgets/snackbar_helper.dart';

/// Admin panelinde bildirim gönderme ekranı
class NotificationManagementScreen extends StatefulWidget {
  static const routeName = '/admin/notifications';

  const NotificationManagementScreen({Key? key}) : super(key: key);

  @override
  State<NotificationManagementScreen> createState() =>
      _NotificationManagementScreenState();
}

class _NotificationManagementScreenState
    extends State<NotificationManagementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  final _imageUrlController = TextEditingController();

  NotificationType _selectedType = NotificationType.general;
  bool _isLoading = false;
  bool _sendToAllUsers = true;
  List<User> _allUsers = [];
  List<String> _selectedUserIds = [];

  final NotificationService _notificationService =
      ServiceLocator.getIt<NotificationService>();
  final AuthService _authService = ServiceLocator.getIt<AuthService>();

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  /// Tüm kullanıcıları yükler
  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Gerçek uygulamada, bu metod AuthService içinde olacak
      // ve tüm kullanıcıları Firestore'dan çekecek
      final users = await _authService.getAllUsers();
      setState(() {
        _allUsers = users;
      });
    } catch (e) {
      Logger.error('Kullanıcılar yüklenirken hata oluştu: $e');
      if (mounted) {
        SnackbarHelper.showErrorSnackbar(
            context, 'Kullanıcılar yüklenirken bir hata oluştu');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Bildirim gönderir
  Future<void> _sendNotification() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final title = _titleController.text.trim();
      final message = _messageController.text.trim();
      final imageUrl = _imageUrlController.text.trim().isNotEmpty
          ? _imageUrlController.text.trim()
          : null;

      if (_sendToAllUsers) {
        // Tüm kullanıcılara bildirim gönder
        await _notificationService.sendNotificationToAllUsers(
          title: title,
          body: message,
          imageUrl: imageUrl,
          type: _selectedType,
        );

        if (mounted) {
          SnackbarHelper.showSuccessSnackbar(
              context, 'Bildirim tüm kullanıcılara gönderildi');
        }
      } else {
        // Seçili kullanıcılara bildirim gönder
        if (_selectedUserIds.isEmpty) {
          if (mounted) {
            SnackbarHelper.showWarningSnackbar(
                context, 'Lütfen en az bir kullanıcı seçin');
          }
          setState(() {
            _isLoading = false;
          });
          return;
        }

        await _notificationService.sendNotificationToUsers(
          userIds: _selectedUserIds,
          title: title,
          body: message,
          imageUrl: imageUrl,
          type: _selectedType,
        );

        if (mounted) {
          SnackbarHelper.showSuccessSnackbar(
              context, 'Bildirim seçili kullanıcılara gönderildi');
        }
      }

      // Form alanlarını temizle
      _titleController.clear();
      _messageController.clear();
      _imageUrlController.clear();
    } catch (e) {
      Logger.error('Bildirim gönderilirken hata oluştu: $e');
      if (mounted) {
        SnackbarHelper.showErrorSnackbar(
            context, 'Bildirim gönderilirken bir hata oluştu');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AdminAppBar(title: 'Bildirim Yönetimi'),
      body: _isLoading && _allUsers.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppTheme.spaceLg),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildNotificationForm(),
                    const SizedBox(height: 24),
                    _buildRecipientSelection(),
                    if (!_sendToAllUsers) ...[
                      const SizedBox(height: 16),
                      _buildUserSelectionList(),
                    ],
                    const SizedBox(height: 60),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isLoading ? null : _sendNotification,
        icon: const Icon(Icons.send),
        label: const Text('Gönder'),
      ),
    );
  }

  /// Bildirim formu
  Widget _buildNotificationForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bildirim İçeriği',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Başlık',
                hintText: 'Bildirim başlığı',
                icon: Icon(Icons.title),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Başlık boş olamaz';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Mesaj',
                hintText: 'Bildirim mesajı',
                icon: Icon(Icons.message),
              ),
              maxLines: 3,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Mesaj boş olamaz';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _imageUrlController,
              decoration: const InputDecoration(
                labelText: 'Resim URL (İsteğe Bağlı)',
                hintText: 'https://example.com/image.jpg',
                icon: Icon(Icons.image),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<NotificationType>(
              value: _selectedType,
              decoration: const InputDecoration(
                labelText: 'Bildirim Türü',
                icon: Icon(Icons.category),
              ),
              items: [
                DropdownMenuItem(
                  value: NotificationType.general,
                  child: const Text('Genel'),
                ),
                DropdownMenuItem(
                  value: NotificationType.order,
                  child: const Text('Sipariş'),
                ),
                DropdownMenuItem(
                  value: NotificationType.promotion,
                  child: const Text('Promosyon'),
                ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedType = value;
                  });
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Alıcı seçimi
  Widget _buildRecipientSelection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Alıcılar',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            RadioListTile<bool>(
              title: const Text('Tüm Kullanıcılar'),
              value: true,
              groupValue: _sendToAllUsers,
              onChanged: (value) {
                setState(() {
                  _sendToAllUsers = value ?? true;
                });
              },
            ),
            RadioListTile<bool>(
              title: const Text('Seçili Kullanıcılar'),
              value: false,
              groupValue: _sendToAllUsers,
              onChanged: (value) {
                setState(() {
                  _sendToAllUsers = value ?? true;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Kullanıcı seçim listesi
  Widget _buildUserSelectionList() {
    if (_allUsers.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(AppTheme.spaceLg),
          child: Center(
            child: Text('Kullanıcı bulunamadı'),
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Kullanıcı Listesi',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: const Text('Yenile'),
                  onPressed: _loadUsers,
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),
            if (_isLoading && _allUsers.isNotEmpty)
              const Center(child: CircularProgressIndicator())
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _allUsers.length,
                itemBuilder: (context, index) {
                  final user = _allUsers[index];
                  final isSelected = _selectedUserIds.contains(user.id);

                  return CheckboxListTile(
                    title: Text(user.fullName),
                    subtitle: Text(user.email),
                    value: isSelected,
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          if (!_selectedUserIds.contains(user.id)) {
                            _selectedUserIds.add(user.id);
                          }
                        } else {
                          _selectedUserIds.remove(user.id);
                        }
                      });
                    },
                  );
                },
              ),
            if (_selectedUserIds.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: AppTheme.spaceXs),
                child: Text(
                  '${_selectedUserIds.length} kullanıcı seçildi',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
