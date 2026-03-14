// ignore_for_file: prefer_const_constructors

/*
 * Input Sanitizer Helper
 * 
 * PURPOSE: XSS protection and input validation
 * LAYER: Utils
 * DEPENDS ON: None
 * 
 * RULES:
 * - Sanitize all user inputs before storing
 * - Remove HTML tags
 * - Escape special characters
 * - Validate email, phone, etc.
 * 
 * LAST UPDATED: 2025-01-27
 */

class InputSanitizer {
  static final InputSanitizer _instance = InputSanitizer._internal();
  factory InputSanitizer() => _instance;
  InputSanitizer._internal();

  static InputSanitizer get instance => _instance;

  /// Remove all HTML tags from string (XSS protection)
  String removeHtmlTags(String input) {
    if (input.isEmpty) return input;

    // Remove HTML tags
    final htmlTagPattern = RegExp(r'<[^>]*>');
    String sanitized = input.replaceAll(htmlTagPattern, '');

    // Remove script tags and content (simplified pattern)
    final scriptPattern = RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false, dotAll: true);
    sanitized = sanitized.replaceAll(scriptPattern, '');

    // Remove event handlers (onclick, onerror, etc.)
    final eventPattern = RegExp(r'on\w+\s*=', caseSensitive: false);
    sanitized = sanitized.replaceAll(eventPattern, '');

    return sanitized.trim();
  }

  /// Escape special HTML characters
  String escapeHtml(String input) {
    if (input.isEmpty) return input;

    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;')
        .replaceAll('/', '&#x2F;');
  }

  /// Sanitize user text input (name, address, etc.)
  String sanitizeText(String input, {int maxLength = 500}) {
    if (input.isEmpty) return input;

    // Remove HTML tags
    String sanitized = removeHtmlTags(input);

    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();

    // Remove excessive whitespace
    sanitized = sanitized.replaceAll(RegExp(r'\s+'), ' ');

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /// Validate and sanitize email
  String? sanitizeEmail(String email) {
    if (email.isEmpty) return null;

    // Remove whitespace and convert to lowercase
    final sanitized = email.trim().toLowerCase();

    // Validate email format
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );

    if (!emailRegex.hasMatch(sanitized)) {
      return null; // Invalid email
    }

    return sanitized;
  }

  /// Validate and sanitize phone number
  String? sanitizePhone(String phone) {
    if (phone.isEmpty) return null;

    // Remove all non-digit characters
    String sanitized = phone.replaceAll(RegExp(r'[^\d+]'), '');

    // Check minimum length (10 digits)
    if (sanitized.length < 10) {
      return null; // Invalid phone
    }

    // Limit to 20 characters max
    if (sanitized.length > 20) {
      sanitized = sanitized.substring(0, 20);
    }

    return sanitized;
  }

  /// Sanitize price/amount (remove currency symbols, validate number)
  double? sanitizeAmount(String amount) {
    if (amount.isEmpty) return null;

    // Remove currency symbols and whitespace
    String sanitized = amount.replaceAll(RegExp(r'[₺$€£,\s]'), '').replaceAll(',', '.');

    try {
      final value = double.parse(sanitized);

      // Validate range (0 to 1 million)
      if (value < 0 || value > 1000000) {
        return null;
      }

      return value;
    } catch (e) {
      return null;
    }
  }

  /// Sanitize URL
  String? sanitizeUrl(String url) {
    if (url.isEmpty) return null;

    final sanitized = url.trim();

    // Check if it starts with http:// or https://
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      return null;
    }

    // Validate URL format
    try {
      final uri = Uri.parse(sanitized);
      if (uri.host.isEmpty) {
        return null;
      }
      return sanitized;
    } catch (e) {
      return null;
    }
  }

  /// Sanitize and validate integer input
  int? sanitizeInteger(String input, {int? min, int? max}) {
    if (input.isEmpty) return null;

    try {
      final value = int.parse(input.trim());

      // Apply min/max constraints
      if (min != null && value < min) return null;
      if (max != null && value > max) return null;

      return value;
    } catch (e) {
      return null;
    }
  }

  /// Sanitize textarea/description (allow newlines but remove HTML)
  String sanitizeDescription(String input, {int maxLength = 5000}) {
    if (input.isEmpty) return input;

    // Remove HTML tags
    String sanitized = removeHtmlTags(input);

    // Trim
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /// Validate and sanitize filename
  String? sanitizeFilename(String filename) {
    if (filename.isEmpty) return null;

    // Remove path separators and special characters
    String sanitized = filename.replaceAll(RegExp(r'[\/\\:*?"<>|]'), '').trim();

    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    // Must have an extension
    if (!sanitized.contains('.')) {
      return null;
    }

    return sanitized;
  }

  /// Batch sanitize a map of inputs
  Map<String, dynamic> sanitizeMap(Map<String, dynamic> data, Map<String, String> fieldTypes) {
    final sanitized = <String, dynamic>{};

    data.forEach((key, value) {
      if (value == null) {
        sanitized[key] = null;
        return;
      }

      final type = fieldTypes[key] ?? 'text';

      switch (type) {
        case 'text':
          sanitized[key] = sanitizeText(value.toString());
          break;
        case 'email':
          sanitized[key] = sanitizeEmail(value.toString());
          break;
        case 'phone':
          sanitized[key] = sanitizePhone(value.toString());
          break;
        case 'url':
          sanitized[key] = sanitizeUrl(value.toString());
          break;
        case 'description':
          sanitized[key] = sanitizeDescription(value.toString());
          break;
        case 'amount':
          sanitized[key] = sanitizeAmount(value.toString());
          break;
        case 'integer':
          sanitized[key] = sanitizeInteger(value.toString());
          break;
        default:
          sanitized[key] = value;
      }
    });

    return sanitized;
  }
}
