// ignore_for_file: prefer_const_constructors

/*
 * Location Permission Rationale Dialog
 * 
 * PURPOSE: Kullanıcıya konum izni neden gerekli açıklayan dialog
 * LAYER: UI Widget
 * DEPENDS ON: AppTheme
 * 
 * RULES:
 * - Permission request öncesi gösterilmeli
 * - Faydaları açıkça listele
 * - Güvenlik mesajı ekle
 * - Kullanıcı friendly dil kullan
 * 
 * LAST UPDATED: 28 Ocak 2026
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';

/// Konum izni rationale dialog'u
///
/// Kullanıcıya konum izninin neden gerekli olduğunu açıklar.
/// Permission request dialog'undan önce gösterilir.
class LocationPermissionDialog extends StatelessWidget {
  const LocationPermissionDialog({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusXl),
      ),
      contentPadding: EdgeInsets.zero,
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: EdgeInsets.all(AppTheme.spaceXl),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(AppTheme.spaceMd),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    child: Icon(
                      Icons.location_on,
                      color: Colors.white,
                      size: 32,
                    ),
                  ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Konum İzni',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Teslimat için gerekli',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Padding(
              padding: EdgeInsets.all(AppTheme.spaceXl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Konumunuzu kullanarak:',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: Colors.grey[800],
                    ),
                  ),
                  SizedBox(height: 16),

                  // Benefit 1
                  _buildBenefit(
                    icon: Icons.delivery_dining,
                    iconColor: Colors.orange,
                    title: 'Hızlı ve Doğru Teslimat',
                    description: 'Adresinizi otomatik olarak buluruz',
                    delay: 100,
                  ),

                  SizedBox(height: 12),

                  // Benefit 2
                  _buildBenefit(
                    icon: Icons.route,
                    iconColor: Colors.blue,
                    title: 'Optimal Teslimat Rotası',
                    description: 'En yakın teslimat noktasından servis',
                    delay: 200,
                  ),

                  SizedBox(height: 12),

                  // Benefit 3
                  _buildBenefit(
                    icon: Icons.timer,
                    iconColor: Colors.green,
                    title: 'Tahmini Varış Süresi',
                    description: 'Ekmeğiniz ne zaman gelecek bilirsiniz',
                    delay: 300,
                  ),

                  SizedBox(height: 20),

                  // Güvenlik mesajı
                  Container(
                    padding: EdgeInsets.all(AppTheme.radiusLg),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.security,
                          size: 22,
                          color: Colors.blue.shade700,
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Gizliliğiniz Güvende',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade900,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Konumunuz sadece teslimat için kullanılır ve üçüncü şahıslarla paylaşılmaz.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.blue.shade800,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.1, end: 0),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(
            'Şimdi Değil',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ),
        ElevatedButton.icon(
          onPressed: () => Navigator.of(context).pop(true),
          icon: Icon(Icons.check_circle),
          label: Text('İzin Ver'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceXl, vertical: AppTheme.spaceMd),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.spaceSm),
            ),
            elevation: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildBenefit({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String description,
    required int delay,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: EdgeInsets.all(AppTheme.spaceXs),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          ),
          child: Icon(
            icon,
            size: 20,
            color: iconColor,
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
              ),
              SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate(delay: delay.ms).fadeIn(duration: 400.ms).slideX(begin: -0.1, end: 0);
  }
}
