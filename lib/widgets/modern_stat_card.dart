// ignore_for_file: prefer_const_constructors

/*
 * Modern İstatistik Kartı Widget
 * 
 * PURPOSE: Tekrar kullanılabilir modern istatistik kartı
 * LAYER: Widget
 * 
 * LAST UPDATED: 2025-12-14
 */

import 'package:flutter/material.dart';

class ModernStatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const ModernStatCard({
    Key? key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: EdgeInsets.all(isSmallScreen ? 12 : 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                color,
                color.withValues(alpha: 0.7),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Background icon
              Positioned(
                right: -10,
                top: -10,
                child: Icon(
                  icon,
                  size: isSmallScreen ? 60 : 80,
                  color: Colors.white.withValues(alpha: 0.2),
                ),
              ),
              // Content
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(
                    icon,
                    color: Colors.white,
                    size: isSmallScreen ? 24 : 28,
                  ),
                  SizedBox(height: 8),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: isSmallScreen ? 24 : 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: isSmallScreen ? 11 : 13,
                      color: Colors.white.withValues(alpha: 0.95),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ModernInfoCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;

  const ModernInfoCard({
    Key? key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = MediaQuery.of(context).size.width < 600;

    return Container(
      padding: EdgeInsets.all(isSmallScreen ? 14 : 18),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: isSmallScreen ? 20 : 24,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: isSmallScreen ? 12 : 14,
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: isSmallScreen ? 22 : 26,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          if (subtitle != null) ...[
            SizedBox(height: 4),
            Text(
              subtitle!,
              style: TextStyle(
                fontSize: isSmallScreen ? 11 : 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
