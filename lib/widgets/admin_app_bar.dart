import 'package:flutter/material.dart';

/// Admin panelindeki tüm sayfalar için ortak bir AppBar sağlar
class AdminAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showBackButton;

  const AdminAppBar({
    Key? key,
    required this.title,
    this.actions,
    this.showBackButton = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
        ),
      ),
      automaticallyImplyLeading: showBackButton,
      actions: actions ??
          [
            // Varsayılan olarak yardım butonu ekle
            IconButton(
              icon: const Icon(Icons.help_outline),
              tooltip: 'Yardım',
              onPressed: () {
                _showHelpDialog(context);
              },
            ),
          ],
      elevation: 0,
      backgroundColor: Theme.of(context).primaryColor,
      foregroundColor: Colors.white,
    );
  }

  void _showHelpDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Admin Paneli Yardım'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Admin Panelinde Neler Yapabilirsiniz?',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Ürünleri ekleyebilir, düzenleyebilir ve silebilirsiniz'),
              Text(
                  '• Siparişleri görüntüleyebilir ve durumlarını güncelleyebilirsiniz'),
              Text('• Kullanıcıları yönetebilirsiniz'),
              Text('• Site ayarlarını değiştirebilirsiniz'),
              Text('• Canlı yayın ve video içeriklerini yönetebilirsiniz'),
              SizedBox(height: 16),
              Text(
                'Not: Yapılan değişiklikler anında uygulamaya yansıyacaktır. Dikkatli olunuz.',
                style: TextStyle(
                  fontStyle: FontStyle.italic,
                  color: Colors.red,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            child: const Text('Anladım'),
          ),
        ],
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
