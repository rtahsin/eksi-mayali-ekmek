// Mobil için dialog helper - admin_products.dart'ta kullanılacak

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class MobileProductDialog {
  /// Mobil uyumlu compact form field
  static Widget buildCompactTextField({
    required TextEditingController controller,
    required String label,
    int maxLines = 1,
    TextInputType? keyboardType,
    bool isMobile = true,
  }) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: isMobile ? 13 : 16),
        isDense: true,
        contentPadding: EdgeInsets.symmetric(
          horizontal: 12,
          vertical: isMobile ? 8 : 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      maxLines: maxLines,
      keyboardType: keyboardType,
    );
  }

  /// Mobil için chip-based checkbox
  static Widget buildOptionChips({
    required Map<String, bool> options,
    required Function(String, bool) onChanged,
  }) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: options.entries.map((entry) {
        return FilterChip(
          label: Text(
            entry.key,
            style: const TextStyle(fontSize: 12),
          ),
          selected: entry.value,
          onSelected: (selected) => onChanged(entry.key, selected),
          selectedColor: AppTheme.primaryColor.withOpacity(0.3),
          checkmarkColor: AppTheme.primaryColor,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        );
      }).toList(),
    );
  }

  /// Mobil için compact alert dialog
  static void showMobileDialog({
    required BuildContext context,
    required String title,
    required Widget content,
    required List<Widget> actions,
  }) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          title,
          style: TextStyle(fontSize: isMobile ? 16 : 20),
        ),
        contentPadding: EdgeInsets.all(isMobile ? 16 : 24),
        content: SizedBox(
          width: isMobile ? MediaQuery.of(context).size.width * 0.95 : 600,
          child: SingleChildScrollView(
            child: content,
          ),
        ),
        actions: actions,
      ),
    );
  }
}
