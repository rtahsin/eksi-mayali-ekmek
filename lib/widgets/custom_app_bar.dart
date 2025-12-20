// ignore_for_file: unused_import, use_super_parameters

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import '../utils/constants.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showBackButton;
  final double elevation;
  final Widget? leading;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final PreferredSizeWidget? bottom;

  const CustomAppBar({
    Key? key,
    required this.title,
    this.actions,
    this.showBackButton = true,
    this.elevation = 0,
    this.leading,
    this.backgroundColor,
    this.foregroundColor,
    this.bottom,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;

    return AppBar(
      title: Text(
        title,
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: foregroundColor ??
              (isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor),
        ),
      ),
      centerTitle: false,
      elevation: elevation,
      backgroundColor: backgroundColor ??
          (isDark ? AppTheme.darkSurfaceColor : AppTheme.backgroundColor),
      foregroundColor: foregroundColor ??
          (isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor),
      leading: showBackButton && Navigator.canPop(context)
          ? IconButton(
              icon: Icon(
                Icons.arrow_back_ios_rounded,
                color: foregroundColor ??
                    (isDark ? AppTheme.darkTextColor : AppTheme.textDarkColor),
                size: 22,
              ),
              onPressed: () => Navigator.pop(context),
            )
          : leading,
      actions: actions,
      bottom: bottom,
      shape: null,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(bottom != null
      ? kToolbarHeight + bottom!.preferredSize.height
      : kToolbarHeight);
}
