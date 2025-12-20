import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Uygulama genelinde kullanılan yükleme göstergesi widget'ı
class AppLoadingIndicator extends StatelessWidget {
  final double size;
  final Color? color;

  const AppLoadingIndicator({
    Key? key,
    this.size = 40.0,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: size,
        height: size,
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(
            color ?? AppTheme.primaryColor,
          ),
          strokeWidth: 3.0,
        ),
      ),
    );
  }
}
