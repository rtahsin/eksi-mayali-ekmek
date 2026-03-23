// ignore_for_file: prefer_const_constructors

/*
 * Live Chat Floating Button Widget
 * 
 * PURPOSE: Sayfanın sağ alt köşesinde sabit canlı destek butonu
 * LAYER: Widget (Reusable Component)
 * 
 * FEATURES:
 *   - Floating action button
 *   - Sayfada her zaman görünür
 *   - Tıklayınca LiveChatScreen'e yönlendirir
 * 
 * LAST UPDATED: 2025-12-16
 */

import 'package:flutter/material.dart';

import '../screens/live_chat_screen.dart';
import '../theme/app_theme.dart';

class LiveChatFloatingButton extends StatelessWidget {
  const LiveChatFloatingButton({Key? key}) : super(key: key);

  void _showChatDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        alignment: Alignment.bottomRight,
        insetPadding: EdgeInsets.only(
          right: AppTheme.spaceXl,
          bottom: AppTheme.spaceXl,
          left: AppTheme.spaceXl,
          top: AppTheme.space8xl,
        ),
        child: Container(
          width: 400,
          height: 600,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radius2xl),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 20,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTheme.radius2xl),
            child: LiveChatDialogContent(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 16,
      bottom: 16,
      child: Material(
        elevation: 8,
        borderRadius: BorderRadius.circular(AppTheme.radiusPill),
        color: AppTheme.primaryColor,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radiusPill),
          onTap: () {
            _showChatDialog(context);
          },
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: AppTheme.spaceXl, vertical: AppTheme.spaceMd),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTheme.radiusPill),
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.secondaryColor,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.support_agent,
                  color: Colors.white,
                  size: 24,
                ),
                SizedBox(width: 8),
                Text(
                  'Canlı Destek',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
