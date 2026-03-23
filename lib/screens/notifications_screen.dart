import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../services/notification_service.dart';
import '../theme/app_theme.dart';
import '../utils/logger.dart';

/// Bildirimler Ekranı
///
/// Kullanıcının tüm bildirimlerini listeler ve yönetir
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = true;
  List<NotificationModel> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final notificationService = Provider.of<NotificationService>(context, listen: false);

      if (authService.currentUser == null) {
        Logger.warning('Kullanıcı giriş yapmamış');
        setState(() => _isLoading = false);
        return;
      }

      final notifications = await notificationService.loadUserNotifications(
        authService.currentUser!.id,
        limit: 50,
      );

      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (e) {
      Logger.error('Bildirimler yüklenirken hata: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(NotificationModel notification) async {
    if (notification.isRead) return;

    final authService = Provider.of<AuthService>(context, listen: false);
    final notificationService = Provider.of<NotificationService>(context, listen: false);

    await notificationService.markNotificationAsRead(
      authService.currentUser!.id,
      notification.id,
    );

    // Local listeyi güncelle
    setState(() {
      final index = _notifications.indexWhere((n) => n.id == notification.id);
      if (index != -1) {
        _notifications[index] = notification.copyWithRead(isRead: true);
      }
    });
  }

  Future<void> _markAllAsRead() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final notificationService = Provider.of<NotificationService>(context, listen: false);

    await notificationService.markAllNotificationsAsRead(
      authService.currentUser!.id,
    );

    setState(() {
      _notifications = _notifications.map((n) => n.copyWithRead(isRead: true)).toList();
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tüm bildirimler okundu olarak işaretlendi')),
      );
    }
  }

  Future<void> _deleteNotification(NotificationModel notification) async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final notificationService = Provider.of<NotificationService>(context, listen: false);

    await notificationService.deleteNotification(
      authService.currentUser!.id,
      notification.id,
    );

    setState(() {
      _notifications.removeWhere((n) => n.id == notification.id);
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bildirim silindi')),
      );
    }
  }

  Future<void> _deleteAllNotifications() async {
    // Onay dialogu göster
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Tüm Bildirimleri Sil'),
        content: Text('Tüm bildirimleri silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Sil', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final authService = Provider.of<AuthService>(context, listen: false);
    final notificationService = Provider.of<NotificationService>(context, listen: false);

    await notificationService.deleteAllNotifications(
      authService.currentUser!.id,
    );

    setState(() {
      _notifications.clear();
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Tüm bildirimler silindi')),
      );
    }
  }

  Widget _buildNotificationIcon(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return Icon(Icons.shopping_bag, color: AppTheme.primaryColor);
      case NotificationType.promotion:
        return Icon(Icons.local_offer, color: Colors.orange);
      case NotificationType.general:
      default:
        return Icon(Icons.notifications, color: Colors.blue);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Bildirimler'),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: _markAllAsRead,
              icon: Icon(Icons.done_all, color: Colors.white),
              label: Text(
                'Tümünü Okundu İşaretle',
                style: TextStyle(color: Colors.white),
              ),
            ),
          if (_notifications.isNotEmpty)
            IconButton(
              icon: Icon(Icons.delete_sweep),
              onPressed: _deleteAllNotifications,
              tooltip: 'Tümünü Sil',
            ),
        ],
      ),
      body: authService.currentUser == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.login, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'Bildirimleri görmek için giriş yapın',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : _isLoading
              ? Center(child: CircularProgressIndicator())
              : _notifications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.notifications_off_outlined,
                            size: 80,
                            color: Colors.grey[400],
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Henüz bildiriminiz yok',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadNotifications,
                      child: ListView.separated(
                        itemCount: _notifications.length,
                        separatorBuilder: (context, index) => Divider(height: 1),
                        itemBuilder: (context, index) {
                          final notification = _notifications[index];
                          final dateStr = DateFormat('dd MMM yyyy, HH:mm', 'tr_TR')
                              .format(notification.timestamp);

                          return Dismissible(
                            key: Key(notification.id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              color: Colors.red,
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: AppTheme.spaceLg),
                              child: Icon(Icons.delete, color: Colors.white),
                            ),
                            onDismissed: (direction) {
                              _deleteNotification(notification);
                            },
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: notification.isRead
                                    ? Colors.grey[200]
                                    : AppTheme.primaryColor.withValues(alpha: 0.1),
                                child: _buildNotificationIcon(notification.type),
                              ),
                              title: Text(
                                notification.title,
                                style: TextStyle(
                                  fontWeight:
                                      notification.isRead ? FontWeight.normal : FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(height: 4),
                                  Text(notification.body),
                                  SizedBox(height: 4),
                                  Text(
                                    dateStr,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                              trailing: notification.isRead
                                  ? null
                                  : Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                              onTap: () async {
                                await _markAsRead(notification);

                                // Sipariş bildirimi ise sipariş detayına git
                                if (notification.type == NotificationType.order &&
                                    notification.data != null &&
                                    notification.data!['orderId'] != null) {
                                  // TODO: Sipariş detay sayfasına yönlendir
                                  Logger.info(
                                      'Sipariş detayına git: ${notification.data!['orderId']}');
                                }
                              },
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
