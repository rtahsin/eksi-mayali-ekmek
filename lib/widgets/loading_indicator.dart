import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';

class LoadingIndicator extends StatelessWidget {
  final double size;
  final Color? color;
  final String? message;
  final bool isFullScreen;

  const LoadingIndicator({
    Key? key,
    this.size = 40.0,
    this.color,
    this.message,
    this.isFullScreen = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;
    final defaultColor =
        isDark ? AppTheme.darkPrimaryColor : AppTheme.primaryColor;

    final loadingWidget = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(
              color ?? defaultColor,
            ),
            strokeWidth: 3.0,
          ),
        ),
        if (message != null) ...[
          const SizedBox(height: 16),
          Text(
            message!,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );

    if (isFullScreen) {
      return Container(
        color: isDark
            ? AppTheme.darkBackgroundColor.withValues(alpha: 0.7)
            : AppTheme.backgroundColor.withValues(alpha: 0.7),
        child: Center(
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusXl),
            ),
            color: isDark ? AppTheme.darkCardColor : Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(AppTheme.space2xl),
              child: loadingWidget,
            ),
          ),
        ),
      );
    }

    return Center(child: loadingWidget);
  }
}
