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
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(
            color: AppTheme.primaryColor,
            width: 2,
          ),
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
