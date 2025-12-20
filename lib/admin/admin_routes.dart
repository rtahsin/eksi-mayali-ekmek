import 'package:flutter/material.dart';

import '../screens/admin/admin_settings_screen.dart';
import '../screens/admin/live_stream_management_screen.dart';
import '../screens/admin/notification_management_screen.dart';
import 'admin_router.dart';

/// Admin paneli için tüm rota tanımları
class AdminRoutes {
  /// Admin panel ana sayfa
  static const String dashboard = '/admin';

  /// Ürünler
  static const String products = '/admin/products';

  /// Kategoriler
  static const String categories = '/admin/categories';

  /// Siparişler
  static const String orders = '/admin/orders';

  /// Blog yönetimi
  static const String blogs = '/admin/blogs';

  /// ChatBot yönetimi
  static const String chatbot = '/admin/chatbot';

  /// Üretim kayıtları
  static const String productions = '/admin/productions';

  /// Stok durumu
  static const String stocks = '/admin/stocks';

  /// Satış kayıtları
  static const String sales = '/admin/sales';

  /// Giderler
  static const String expenses = '/admin/expenses';

  /// Finansal rapor
  static const String financialReport = '/admin/financial-report';

  /// Müşteriler
  static const String customers = '/admin/customers';
  static const String users = '/admin/users';

  /// Arka plan görselleri
  static const String backgrounds = '/admin/backgrounds';

  /// Denetim kayıtları
  static const String audit = '/admin/audit';

  /// Canlı yayın yönetimi
  static const String liveStream = '/admin/live-stream';

  /// Bildirim yönetimi
  static const String notifications = '/admin/notifications';

  /// Mağaza ayarları
  static const String settings = '/admin/settings';

  /// Tüm rotaları içeren map
  static Map<String, WidgetBuilder> routes = {
    // Ana sayfa
    dashboard: (context) => const AdminRouter(),

    // Temel işlemler
    products: (context) => const AdminRouter(),
    categories: (context) => const AdminRouter(),
    orders: (context) => const AdminRouter(),

    // İçerik yönetimi
    blogs: (context) => const AdminRouter(),
    chatbot: (context) => const AdminRouter(),

    // Envanter & Finans
    productions: (context) => const AdminRouter(),
    stocks: (context) => const AdminRouter(),
    sales: (context) => const AdminRouter(),
    expenses: (context) => const AdminRouter(),
    financialReport: (context) => const AdminRouter(),

    // Diğer
    customers: (context) => const AdminRouter(),
    users: (context) => const AdminRouter(),
    backgrounds: (context) => const AdminRouter(),
    audit: (context) => const AdminRouter(),

    // Ek özellikler
    liveStream: (context) => const LiveStreamManagementScreen(),
    notifications: (context) => const NotificationManagementScreen(),
    settings: (context) => const AdminSettingsScreen(),
  };
}
