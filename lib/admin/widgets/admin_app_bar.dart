import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';

class AdminAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showSearchBar;
  final Function(String)? onSearch;

  const AdminAppBar({
    super.key,
    required this.title,
    this.actions,
    this.showSearchBar = false,
    this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;
    final displayName = user?.displayName ?? 'Yönetici';

    return AppBar(
      title: Text(
        title,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 20,
        ),
      ),
      backgroundColor: AppTheme.primaryColor,
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.white),
      actions: actions ??
          [
            if (showSearchBar) _buildSearchBar(context),
            IconButton(
              icon: Stack(
                children: [
                  Icon(Icons.notifications_outlined),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      constraints: BoxConstraints(
                        minWidth: 12,
                        minHeight: 12,
                      ),
                      child: Text(
                        '3',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
              tooltip: 'Bildirimler',
              onPressed: () {
                // Bildirimler sayfasına yönlendir
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Bildirimler yakında eklenecek')),
                );
              },
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 8),
              child: PopupMenuButton<String>(
                offset: Offset(0, 45),
                icon: CircleAvatar(
                  backgroundColor: Colors.white,
                  radius: 16,
                  child: Text(
                    displayName.isNotEmpty ? displayName[0].toUpperCase() : 'A',
                    style: TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                onSelected: (value) async {
                  if (value == 'profile') {
                    Navigator.pushNamed(context, '/admin/profile');
                  } else if (value == 'settings') {
                    Navigator.pushNamed(context, '/admin/settings');
                  } else if (value == 'logout') {
                    await authService.logout();
                    if (!context.mounted) return;
                    Navigator.pushReplacementNamed(context, '/login');
                  }
                },
                itemBuilder: (BuildContext context) => [
                  PopupMenuItem<String>(
                    value: 'profile',
                    child: Row(
                      children: [
                        Icon(Icons.person, color: Colors.grey[700], size: 20),
                        SizedBox(width: 8),
                        Text('Profil'),
                      ],
                    ),
                  ),
                  PopupMenuItem<String>(
                    value: 'settings',
                    child: Row(
                      children: [
                        Icon(Icons.settings, color: Colors.grey[700], size: 20),
                        SizedBox(width: 8),
                        Text('Ayarlar'),
                      ],
                    ),
                  ),
                  PopupMenuDivider(),
                  PopupMenuItem<String>(
                    value: 'logout',
                    child: Row(
                      children: [
                        Icon(Icons.exit_to_app, color: Colors.red[400], size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Çıkış Yap',
                          style: TextStyle(color: Colors.red[400]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 8),
          ],
      bottom: showSearchBar ? _buildSearchBarBottom(context) : null,
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Container(
      width: 300,
      height: 40,
      margin: EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: TextField(
        style: TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: 'Ara...',
          hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
          prefixIcon: Icon(Icons.search, color: Colors.white),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        ),
        onChanged: onSearch,
      ),
    );
  }

  PreferredSizeWidget _buildSearchBarBottom(BuildContext context) {
    return PreferredSize(
      preferredSize: Size.fromHeight(60),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: AppTheme.primaryColor,
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Ara...',
              hintStyle: TextStyle(color: Colors.grey[400]),
              prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onChanged: onSearch,
          ),
        ),
      ),
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(showSearchBar ? kToolbarHeight + 60 : kToolbarHeight);
}
