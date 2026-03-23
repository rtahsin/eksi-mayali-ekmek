// ignore_for_file: unused_field, unused_element, unused_local_variable

import 'package:flutter/material.dart';

import '../core/di/service_locator.dart';
import '../services/notification_service.dart';
import '../theme/app_theme.dart';
import '../utils/date_formatter.dart';
import '../widgets/app_scaffold.dart';
import '../widgets/empty_state.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({Key? key}) : super(key: key);

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final NotificationService _notificationService =
      ServiceLocator.notificationService;
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
    });

    // Burada gerçek uygulama için bildirimler Firestore veya yerel veritabanından yüklenecek
    // Örnek veriler:
    await Future.delayed(const Duration(milliseconds: 800));
    final notifications = [
      NotificationModel(
        id: '1',
        title: 'Siparişiniz Hazırlanıyor',
        body: 'Siparişiniz #12345 hazırlanmaya başladı. Yakında yola çıkacak.',
        type: NotificationType.order,
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      NotificationModel(
        id: '2',
        title: 'Özel İndirim Fırsatı',
        body: 'Bu hafta sonu tüm ekmeklerde %20 indirim fırsatı sizi bekliyor!',
        type: NotificationType.promotion,
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
      ),
      NotificationModel(
        id: '3',
        title: 'Yeni Ürünümüz: Tam Buğday Ekşi Maya',
        body: 'Yeni ürünümüz Tam Buğday Ekşi Maya ekmeğimizi denediniz mi?',
        type: NotificationType.general,
        timestamp: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ];

    setState(() {
      _notifications = notifications;
      _isLoading = false;
    });
  }

  Future<void> _refreshNotifications() async {
    await _loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Bildirimler',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildNotificationList(),
    );
  }

  Widget _buildNotificationList() {
    if (_notifications.isEmpty) {
      return const EmptyState(
        icon: Icons.notifications_off_outlined,
        title: 'Bildirim Bulunamadı',
        message: 'Henüz bir bildiriminiz bulunmuyor.',
      );
    }

    return RefreshIndicator(
      onRefresh: _refreshNotifications,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppTheme.spaceMd),
        itemCount: _notifications.length,
        separatorBuilder: (context, index) => const Divider(),
        itemBuilder: (context, index) {
          final notification = _notifications[index];
          return _buildNotificationItem(notification);
        },
      ),
    );
  }

  Widget _buildNotificationItem(NotificationModel notification) {
    final theme = Theme.of(context);

    // Bildirim tipine göre ikon ve renk belirle
    IconData icon;
    Color iconColor;

    switch (notification.type) {
      case NotificationType.order:
        icon = Icons.shopping_bag_outlined;
        iconColor = Colors.blue;
        break;
      case NotificationType.promotion:
        icon = Icons.local_offer_outlined;
        iconColor = Colors.orange;
        break;
      case NotificationType.general:
      default:
        icon = Icons.notifications_outlined;
        iconColor = Colors.green;
        break;
    }

    return Dismissible(
      key: Key(notification.id),
      background: Container(
        color: Colors.red,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppTheme.spaceMd),
        child: const Icon(
          Icons.delete_outline,
          color: Colors.white,
        ),
      ),
      direction: DismissDirection.endToStart,
      onDismissed: (direction) {
        // Bildirim silme işlemi
        final deletedIndex =
            _notifications.indexWhere((item) => item.id == notification.id);
        final deletedItem = notification;

        setState(() {
          _notifications.removeWhere((item) => item.id == notification.id);
        });

        // Silme geri alma seçeneği
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Bildirim silindi'),
            action: SnackBarAction(
              label: 'Geri Al',
              onPressed: () {
                setState(() {
                  _notifications.insert(deletedIndex, deletedItem);
                });
              },
            ),
          ),
        );
      },
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(vertical: AppTheme.spaceSm, horizontal: AppTheme.spaceMd),
        leading: CircleAvatar(
          backgroundColor: iconColor.withValues(alpha: 0.1),
          child: Icon(icon, color: iconColor),
        ),
        title: Text(
          notification.title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight:
                notification.isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppTheme.spaceXs),
            Text(
              notification.body,
              style: theme.textTheme.bodyMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppTheme.spaceXs),
            Text(
              DateFormatter.formatRelativeTime(notification.timestamp),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.hintColor,
              ),
            ),
          ],
        ),
        onTap: () {
          // Bildirim detayları veya ilgili sayfaya yönlendirme
          setState(() {
            final index =
                _notifications.indexWhere((item) => item.id == notification.id);
            if (index != -1) {
              _notifications[index] = notification.copyWithRead(isRead: true);
            }
          });
        },
      ),
    );
  }
}
