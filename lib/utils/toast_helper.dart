/*
 * Toast Helper - Standardized Toast/Snackbar System
 * 
 * PURPOSE: Centralized toast/snackbar messages with consistent styling
 * LAYER: Utility
 * DEPENDS ON: Flutter Material
 * 
 * RULES:
 * - Tüm projede SnackBar gösterimi için bu helper'ı kullan
 * - showSuccessToast() - Başarılı işlemler için (yeşil)
 * - showErrorToast() - Hata mesajları için (kırmızı)
 * - showInfoToast() - Bilgilendirme için (mavi)
 * - showWarningToast() - Uyarı mesajları için (turuncu)
 * 
 * LAST UPDATED: 30 Aralık 2025
 */

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ToastHelper {
  // Başarılı işlemler için yeşil toast
  static void showSuccessToast(BuildContext context, String message,
      {Duration duration = const Duration(seconds: 3)}) {
    _showToast(
      context,
      message,
      backgroundColor: const Color(0xFF4CAF50), // Material Green 500
      icon: Icons.check_circle_rounded,
      duration: duration,
    );
  }

  // Hata mesajları için kırmızı toast
  static void showErrorToast(BuildContext context, String message,
      {Duration duration = const Duration(seconds: 4)}) {
    _showToast(
      context,
      message,
      backgroundColor: const Color(0xFFF44336), // Material Red 500
      icon: Icons.error_rounded,
      duration: duration,
    );
  }

  // Bilgilendirme için mavi toast
  static void showInfoToast(BuildContext context, String message,
      {Duration duration = const Duration(seconds: 3)}) {
    _showToast(
      context,
      message,
      backgroundColor: const Color(0xFF2196F3), // Material Blue 500
      icon: Icons.info_rounded,
      duration: duration,
    );
  }

  // Uyarı mesajları için turuncu toast
  static void showWarningToast(BuildContext context, String message,
      {Duration duration = const Duration(seconds: 4)}) {
    _showToast(
      context,
      message,
      backgroundColor: const Color(0xFFFF9800), // Material Orange 500
      icon: Icons.warning_rounded,
      duration: duration,
    );
  }

  // Ana toast gösterme metodu (private)
  static void _showToast(
    BuildContext context,
    String message, {
    required Color backgroundColor,
    required IconData icon,
    required Duration duration,
  }) {
    // Mevcut SnackBar'ı kaldır (çakışma olmasın)
    ScaffoldMessenger.of(context).clearSnackBars();

    // Yeni SnackBar göster
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        duration: duration,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        margin: const EdgeInsets.all(AppTheme.spaceLg),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceBase),
        elevation: 6,
      ),
    );
  }

  // Loading toast (uzun süren işlemler için)
  static void showLoadingToast(BuildContext context, String message) {
    ScaffoldMessenger.of(context).clearSnackBars();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF607D8B), // Material Blue Grey 500
        behavior: SnackBarBehavior.floating,
        duration: const Duration(days: 1), // Uzun süre (manuel kapatılacak)
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        margin: const EdgeInsets.all(AppTheme.spaceLg),
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.spaceLg, vertical: AppTheme.spaceBase),
      ),
    );
  }

  // Toast'u manuel kapat (loading toast için)
  static void dismissToast(BuildContext context) {
    ScaffoldMessenger.of(context).clearSnackBars();
  }
}
