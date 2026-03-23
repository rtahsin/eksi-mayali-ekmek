import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'admin_router.dart';

class AdminApp extends StatelessWidget {
  const AdminApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Admin uygulama tema ayarları
    final ThemeData theme = ThemeData(
      useMaterial3: true,
      primaryColor: AppTheme.primaryColor,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppTheme.primaryColor,
        primary: AppTheme.primaryColor,
        secondary: AppTheme.secondaryColor,
      ),
      textTheme: Theme.of(context).textTheme.apply(
            fontFamily: 'Poppins',
          ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: AppTheme.primaryColor,
          padding: const EdgeInsets.symmetric(
            horizontal: AppTheme.spaceLg,
            vertical: AppTheme.spaceMd,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          borderSide: BorderSide(
            color: AppTheme.primaryColor,
            width: 2,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppTheme.spaceLg,
          vertical: AppTheme.spaceLg,
        ),
      ),
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Ekşi Mayalı Ekmek Yönetici Paneli',
      theme: theme,
      home: AdminRouter(),
    );
  }
}
