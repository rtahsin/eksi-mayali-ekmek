// ignore_for_file: deprecated_member_use

/*
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EKŞİ MAYALI EKMEK - APP_THEME.DART                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Bu dosya, uygulamanın tüm renk ve tema tanımlamalarını içerir.              │
│                                                                             │
│ İÇİNDEKİLER:                                                                │
│ 1. Renk tanımlamaları                                                       │
│    - Ana renkler (primaryColor, secondaryColor vb.)                         │
│    - Arka plan renkleri (backgroundColor, surfaceColor vb.)                 │
│    - Metin renkleri (textColor, textLightColor vb.)                         │
│    - Karanlık tema renkleri                                                 │
│    - Durum renkleri (errorColor, successColor vb.)                          │
│    - Admin paneli renkleri                                                  │
│ 2. Tema oluşturma metodları                                                 │
│    - createLightTheme(): Aydınlık tema                                      │
│    - createDarkTheme(): Karanlık tema                                       │
│    - lightTheme(): Aydınlık tema getter'ı                                   │
│    - darkTheme(): Karanlık tema getter'ı                                    │
│    - adminTheme(): Admin paneli teması                                      │
└─────────────────────────────────────────────────────────────────────────────┘
*/

import 'package:flutter/material.dart';
import 'app_theme.dart';

/// Uygulama temasını yöneten merkezi sınıf
///
/// Bu sınıf, uygulamanın görsel stilini belirleyen tüm renk, şekil ve
/// tema tanımlamalarını içerir. Başlıca sorumlulukları:
///
/// 1. Renk paletinin tanımlanması
/// 2. Aydınlık ve karanlık tema oluşturma
/// 3. Admin paneli için özel tema tanımlama
/// 4. Gölge ve kart stilleri tanımlama
///
/// Kullanımı:
/// ```dart
/// // Ana renklere erişim
/// Color primaryColor = AppTheme.primaryColor;
///
/// // Tema nesnelerine erişim
/// ThemeData lightTheme = AppTheme.lightTheme();
/// ThemeData darkTheme = AppTheme.darkTheme();
/// ```
class AppTheme {
  // Design tokens - spacing
  static const double spaceXxs = 4.0;
  static const double space5 = 5.0;
  static const double space2xs = 6.0;
  static const double spaceXs = 8.0;
  static const double spaceSm = 10.0;
  static const double spaceMd = 12.0;
  static const double spaceBase = 14.0;
  static const double spaceLg = 16.0;
  static const double space18 = 18.0;
  static const double spaceXl = 20.0;
  static const double space2xl = 24.0;
  static const double space3xl = 32.0;
  static const double space4xl = 40.0;
  static const double space5xl = 48.0;
  static const double space6xl = 60.0;
  static const double space7xl = 70.0;
  static const double space8xl = 100.0;
  static const double spaceZero = 0.0;
  static const double pagePaddingDesktop = 80.0;
  static const double pagePaddingMobile = 24.0;

  // Design tokens - radius
  static const double radiusXxs = 4.0;
  static const double radiusXs = 5.0;
  static const double radiusSmSoft = 6.0;
  static const double radiusSm = 8.0;
  static const double radiusMdSoft = 10.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 14.0;
  static const double radiusXl = 16.0;
  static const double radius2xl = 20.0;
  static const double radius3xl = 24.0;
  static const double radiusPill = 30.0;

  // Ana renkler
  /// Ekmek kabuğu kahverengisi - Ana renk
  static const Color primaryColor = Color(0xFF8B4513);

  /// Açık ekmek kabuğu - Ana rengin açık tonu
  static const Color primaryLightColor = Color(0xFFA0522D);

  /// Altın kahverengi - İkincil renk
  static const Color secondaryColor = Color(0xFFCD853F);

  /// Buğday rengi - Vurgu rengi
  static const Color accentColor = Color(0xFFDEB887);

  // Arka plan renkleri
  static const Color backgroundColor = Color(0xFFF5F5F5); // Kırık beyaz
  static const Color surfaceColor = Color(0xFFFFFBF0); // Krem
  static const Color backgroundLight = Color(0xFFF5F5F5);
  static const Color backgroundDark = Color(0xFF222222); // Yumuşak siyah

  // Metin renkleri
  static const Color textColor = Color(0xFF3A3A3A); // Koyu gri
  static const Color textLightColor = Color(0xFF707070); // Orta gri
  static const Color textDarkColor = Color(0xFF3A3A3A);

  // Karanlık tema renkleri
  static const Color darkPrimaryColor =
      Color(0xFF8B4513); // Ekmek kabuğu kahverengisi
  static const Color darkSecondaryColor = Color(0xFFCD853F); // Altın kahverengi
  static const Color darkAccentColor = Color(0xFFDEB887); // Buğday rengi
  static const Color darkSurfaceColor = Color(0xFF2D2D2D); // Yumuşak koyu gri
  static const Color darkBackgroundColor = Color(0xFF222222); // Yumuşak siyah
  static const Color darkTextColor = Color(0xFFEEEEEE); // Kırık beyaz
  static const Color darkCardColor = Color(0xFF2D2D2D); // Yumuşak koyu gri
  static const Color darkTextSecondaryColor = Color(0xFFBBBBBB); // Açık gri

  // Durum renkleri
  static const Color errorColor = Color(0xFFE74C3C);
  static const Color successColor = Color(0xFF27AE60);
  static const Color warningColor = Color(0xFFF39C12);
  static const Color infoColor = Color(0xFF3498DB);

  // Kart ve gölge stilleri
  static BoxShadow cardShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.05),
    blurRadius: 10,
    offset: const Offset(0, 2),
  );

  static BoxShadow darkCardShadow = BoxShadow(
    color: Colors.black.withValues(alpha: 0.2),
    blurRadius: 10,
    offset: const Offset(0, 2),
  );

  /// Tema oluştur - Aydınlık tema
  ///
  /// Material Design 2 stilinde bir aydınlık tema oluşturur.
  /// Bu tema, ekmek kabuğu tonlarını baz alır ve kullanıcı arayüzü
  /// bileşenlerinin görünümünü belirler.
  ///
  /// @return ThemeData Aydınlık tema nesnesi
  static ThemeData createLightTheme() {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: primaryColor,
      scaffoldBackgroundColor: backgroundColor,
      cardColor: surfaceColor,
      shadowColor: Colors.black.withValues(alpha: 0.05),
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: secondaryColor,
        surface: surfaceColor,
        background: backgroundColor,
        error: errorColor,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceColor,
        elevation: 0,
        iconTheme: IconThemeData(color: textDarkColor),
        titleTextStyle: TextStyle(
          color: textDarkColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardTheme(
        color: surfaceColor,
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: textDarkColor),
        bodyMedium: TextStyle(color: textDarkColor),
        titleLarge: TextStyle(color: textDarkColor),
      ),
      iconTheme: const IconThemeData(color: textDarkColor),
    );
  }

  /// Karanlık tema oluştur
  ///
  /// Material Design 2 stilinde bir karanlık tema oluşturur.
  /// Bu tema, koyu tonları baz alır ve düşük ışık koşullarında
  /// kullanıcı deneyimini iyileştirir.
  ///
  /// @return ThemeData Karanlık tema nesnesi
  static ThemeData createDarkTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: darkPrimaryColor,
      scaffoldBackgroundColor: darkBackgroundColor,
      cardColor: darkSurfaceColor,
      shadowColor: Colors.black.withValues(alpha: 0.2),
      colorScheme: const ColorScheme.dark(
        primary: darkPrimaryColor,
        secondary: darkSecondaryColor,
        surface: darkSurfaceColor,
        background: darkBackgroundColor,
        error: errorColor,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurfaceColor,
        elevation: 0,
        iconTheme: IconThemeData(color: darkTextColor),
        titleTextStyle: TextStyle(
          color: darkTextColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardTheme(
        color: darkSurfaceColor,
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: darkTextColor),
        bodyMedium: TextStyle(color: darkTextColor),
        titleLarge: TextStyle(color: darkTextColor),
      ),
      iconTheme: const IconThemeData(color: darkTextColor),
    );
  }

  // Tema oluştur
  static ThemeData lightTheme() {
    return createLightTheme();
  }

  // Karanlık tema oluştur
  static ThemeData darkTheme() {
    return createDarkTheme();
  }

  // Admin paneli renkleri
  static const Color adminPrimaryColor = Color(0xFF1976D2); // Koyu mavi
  static const Color adminSecondaryColor = Color(0xFF455A64); // Koyu gri
  static const Color adminAccentColor = Color(0xFF2196F3); // Mavi
  static const Color adminBackgroundColor = Color(0xFFFAFAFA); // Açık gri
  static const Color adminCardColor = Colors.white;
  static const Color adminErrorColor = Color(0xFFD32F2F);
  static const Color adminSuccessColor = Color(0xFF388E3C);
  static const Color adminWarningColor = Color(0xFFFFA000);

  // Admin paneli teması
  static ThemeData adminTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: adminPrimaryColor,
        primary: adminPrimaryColor,
        secondary: adminSecondaryColor,
        surface: adminCardColor,
        background: adminBackgroundColor,
        error: adminErrorColor,
      ),
      scaffoldBackgroundColor: adminBackgroundColor,
      appBarTheme: const AppBarTheme(
        backgroundColor: adminPrimaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: textDarkColor,
        ),
        displayMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: textDarkColor,
        ),
        displaySmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: textDarkColor,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: textDarkColor,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textDarkColor,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: textDarkColor,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: textDarkColor,
        ),
      ),
      cardTheme: CardTheme(
        color: adminCardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: adminPrimaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceMd),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: adminPrimaryColor,
          side: const BorderSide(color: adminPrimaryColor),
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceMd),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
        ),
      ),
      dataTableTheme: DataTableThemeData(
        headingRowColor: MaterialStateProperty.all(adminBackgroundColor),
        dataRowColor: MaterialStateProperty.all(Colors.white),
        dividerThickness: 1,
      ),
    );
  }
}
