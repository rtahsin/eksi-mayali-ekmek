// ignore_for_file: use_build_context_synchronously, use_key_in_widget_constructors, deprecated_member_use, prefer_const_constructors, library_private_types_in_public_api

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Uygulama başladığında kullanıcı oturumunu kontrol et
    Future.delayed(Duration.zero, () async {
      await Provider.of<AuthService>(context, listen: false).checkUserSession();
      _navigateToNextScreen();
    });
  }

  void _navigateToNextScreen() {
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor,
              AppTheme.primaryColor.withValues(alpha: 0.8),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 20,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 100,
                    height: 100,
                    errorBuilder: (context, error, stackTrace) {
                      return Icon(
                        Icons.bakery_dining,
                        size: 100,
                        color: AppTheme.primaryColor,
                      );
                    },
                  ),
                ),
                const SizedBox(height: 30),

                // Marka Adı
                Center(
                  child: Text(
                    'EkmekLab',
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 12),

                // Slogan
                Center(
                  child: Text(
                    'Doğal ve Lezzetli',
                    style: TextStyle(
                      fontSize: 18,
                      color: Colors.white.withValues(alpha: 0.9),
                      letterSpacing: 1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 50),

                // Yükleniyor İndikatörü
                const CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 3,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
