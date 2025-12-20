import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';

class SectionTitle extends StatelessWidget {
  final String title;
  final String? actionText;
  final VoidCallback? onActionTap;
  final TextStyle? titleStyle;
  final TextStyle? actionStyle;

  const SectionTitle({
    Key? key,
    required this.title,
    this.actionText,
    this.onActionTap,
    this.titleStyle,
    this.actionStyle,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: titleStyle ??
              GoogleFonts.playfairDisplay(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDarkColor,
              ),
        ),
        if (actionText != null && onActionTap != null)
          TextButton(
            onPressed: onActionTap,
            child: Text(
              actionText!,
              style: actionStyle ??
                  GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryColor,
                  ),
            ),
          ),
      ],
    );
  }
}
