import 'package:flutter/material.dart';

import '../core/di/service_locator.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

/// Bildirim ikonu pozisyonu için enum
enum NotificationIconPosition {
  start, // AppBar'ın başında (solda)
  end, // AppBar'ın sonunda (sağda)
  custom // Özel konum
}

/// Bildirim ikonu widget'ı
/// AppBar'da kullanılarak yeni bildirimleri gösterir
class NotificationIcon extends StatefulWidget {
  final VoidCallback? onTap;
  final NotificationIconPosition position;
  final EdgeInsets? padding;
  final double iconSize;
  final Color? iconColor;
  final Color? badgeColor;
  final Color? badgeTextColor;

  const NotificationIcon({
    Key? key,
    this.onTap,
    this.position = NotificationIconPosition.end,
    this.padding,
    this.iconSize = 24.0,
    this.iconColor,
    this.badgeColor,
    this.badgeTextColor,
  }) : super(key: key);

  @override
  State<NotificationIcon> createState() => _NotificationIconState();
}

class _NotificationIconState extends State<NotificationIcon> {
  final NotificationService _notificationService =
      ServiceLocator.notificationService;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    final authService = ServiceLocator.getIt<AuthService>();
    if (authService.isAuthenticated) {
      final count = await _notificationService
          .getUnreadNotificationCount(authService.currentUser!.id);
      if (mounted) {
        setState(() {
          _unreadCount = count;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: Icon(
            Icons.notifications_outlined,
            size: widget.iconSize,
            color: widget.iconColor ?? theme.iconTheme.color,
          ),
          padding: widget.padding ?? const EdgeInsets.all(8.0),
          onPressed: widget.onTap,
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: widget.badgeColor ?? Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Text(
                '$_unreadCount',
                style: TextStyle(
                  fontSize: 10,
                  color: widget.badgeTextColor ?? Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
