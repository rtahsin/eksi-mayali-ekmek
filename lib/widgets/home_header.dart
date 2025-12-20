// ignore_for_file: deprecated_member_use, use_super_parameters, unused_import

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:responsive_framework/responsive_framework.dart';

import '../constants/app_constants.dart';
import '../theme/app_theme.dart';
import '../utils/helpers.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final deviceType = Helpers.getDeviceType(context);
    final isDesktop = deviceType == DeviceType.desktop;
    final isTablet = deviceType == DeviceType.tablet;

    return Container(
      width: double.infinity,
      height: isDesktop
          ? 600
          : isTablet
              ? 500
              : 400,
      decoration: BoxDecoration(
        image: DecorationImage(
          image: const AssetImage('assets/images/background_wheat.jpg'),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(
            Colors.black.withValues(alpha: 0.3),
            BlendMode.darken,
          ),
        ),
      ),
      child: Stack(
        children: [
          // Gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.7),
                ],
              ),
            ),
          ),

          // Content
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    AppConstants.appName,
                    style: GoogleFonts.playfairDisplay(
                      fontSize: isDesktop
                          ? 72
                          : isTablet
                              ? 56
                              : 40,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      height: 1.1,
                    ),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(duration: 800.ms, delay: 300.ms).slideY(
                        begin: 0.3,
                        end: 0,
                        curve: Curves.easeOutQuad,
                        duration: 800.ms,
                        delay: 300.ms,
                      ),
                  const SizedBox(height: 16),
                  Text(
                    AppConstants.appSlogan,
                    style: GoogleFonts.poppins(
                      fontSize: isDesktop
                          ? 24
                          : isTablet
                              ? 20
                              : 16,
                      fontWeight: FontWeight.w300,
                      color: Colors.white,
                      letterSpacing: 1.2,
                    ),
                    textAlign: TextAlign.center,
                  ).animate().fadeIn(duration: 800.ms, delay: 600.ms).slideY(
                        begin: 0.3,
                        end: 0,
                        curve: Curves.easeOutQuad,
                        duration: 800.ms,
                        delay: 600.ms,
                      ),
                  const SizedBox(height: 40),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          // Ürünlere yönlendir
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(
                            horizontal: isDesktop ? 32 : 24,
                            vertical: isDesktop ? 16 : 12,
                          ),
                          textStyle: GoogleFonts.poppins(
                            fontSize: isDesktop ? 18 : 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: const Text('Ürünleri Keşfet'),
                      )
                          .animate()
                          .fadeIn(duration: 800.ms, delay: 900.ms)
                          .slideY(
                            begin: 0.3,
                            end: 0,
                            curve: Curves.easeOutQuad,
                            duration: 800.ms,
                            delay: 900.ms,
                          ),
                      const SizedBox(width: 16),
                      OutlinedButton(
                        onPressed: () {
                          // Hakkımızda sayfasına yönlendir
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white, width: 2),
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(
                            horizontal: isDesktop ? 32 : 24,
                            vertical: isDesktop ? 16 : 12,
                          ),
                          textStyle: GoogleFonts.poppins(
                            fontSize: isDesktop ? 18 : 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: const Text('Hakkımızda'),
                      )
                          .animate()
                          .fadeIn(duration: 800.ms, delay: 1100.ms)
                          .slideY(
                            begin: 0.3,
                            end: 0,
                            curve: Curves.easeOutQuad,
                            duration: 800.ms,
                            delay: 1100.ms,
                          ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
