# Admin Panel Yapı Dokümantasyonu

## Dosya Organizasyonu

### ✅ AKTİF MODÜLLER

#### `lib/admin/` - Yeni Modüler Yapı

Temel CRUD işlemleri için kullanılan ana yapı:

- **admin_router.dart** - Ana routing logic + yetki kontrolü
- **admin_routes.dart** - Route tanımları
- **dashboard/admin_dashboard.dart** - Ana gösterge paneli
- **products/admin_products.dart** - Ürün yönetimi (CRUD)
- **orders/admin_orders.dart** - Sipariş yönetimi
- **categories/admin_categories.dart** - Kategori yönetimi
- **customers/admin_customers.dart** - Müşteri yönetimi
- **auth/admin_login.dart** - Admin giriş
- **audit/admin_audit_logs.dart** - Denetim kayıtları
- **widgets/** - Shared components (drawer, app bar)

#### `lib/screens/admin/` - İşlevsel Modüller

Envanter, finans ve içerik yönetimi modülleri:

- **admin_blogs.dart** - Blog yönetimi
- **admin_chatbot.dart** - ChatBot data yönetimi
- **admin_stocks.dart** - Stok durumu
- **admin_sales.dart** - Satış kayıtları
- **admin_productions.dart** - Üretim kayıtları
- **admin_expenses.dart** - Gider takibi
- **admin_financial_report.dart** - Finansal raporlar
- **admin_settings.dart** - Genel ayarlar
- **admin_settings_screen.dart** - Ayarlar ekranı
- **background_images_screen.dart** - Site arka plan yönetimi
- **live_stream_management_screen.dart** - Canlı yayın
- **notification_management_screen.dart** - Bildirim yönetimi

### ❌ KULLANILMAYAN DOSYALAR (Legacy/Duplicate)

Bu dosyalar eski versiyonlar ve KULLANILMIYOR:

- `lib/screens/admin/admin_dashboard.dart` (31KB) - lib/admin/dashboard/admin_dashboard.dart AKTIF
- `lib/screens/admin/admin_products.dart` (43KB) - lib/admin/products/admin_products.dart AKTIF
- `lib/screens/admin/admin_orders.dart` (29KB) - lib/admin/orders/admin_orders.dart AKTIF
- `lib/screens/admin/admin_users.dart` (21KB) - lib/admin/customers/admin_customers.dart AKTIF

**NOT**: Bu dosyalar güvenli bir şekilde silinebilir ama production deployment sonrası silinmeli.

---

## Routing Yapısı

```dart
/admin                    → AdminDashboardPage (lib/admin/dashboard/)
/admin/products          → AdminProductsPage (lib/admin/products/)
/admin/orders            → AdminOrdersPage (lib/admin/orders/)
/admin/categories        → AdminCategoriesPage (lib/admin/categories/)
/admin/customers         → AdminCustomersPage (lib/admin/customers/)
/admin/blogs             → AdminBlogs (lib/screens/admin/)
/admin/chatbot           → AdminChatBotScreen (lib/screens/admin/)
/admin/stocks            → AdminStocksScreen (lib/screens/admin/)
/admin/sales             → AdminSalesScreen (lib/screens/admin/)
/admin/productions       → AdminProductionsScreen (lib/screens/admin/)
/admin/expenses          → AdminExpensesScreen (lib/screens/admin/)
/admin/financial-report  → AdminFinancialReportScreen (lib/screens/admin/)
/admin/settings          → AdminSettings (lib/screens/admin/)
```

---

## İyileştirme Önerileri

### ✅ Tamamlanan

- [x] Dashboard'a notification badge sistemi
- [x] Drawer'a real-time bildirimler
- [x] Low stock ve pending order sayaçları

### 🔄 Devam Eden

- [ ] Duplicate dosyaları temizleme (production sonrası)
- [ ] Linter uyarılarını düzeltme
- [ ] Pagination sistemi

### ⏳ Planlanan

- [ ] Chart/grafik entegrasyonu (fl_chart)
- [ ] Export özellikleri (Excel/PDF)
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Dark mode

---

## Güvenlik Notları

### Yetkilendirme

- **Super Admin**: <tahsinreyhan@gmail.com> (hardcoded)
- **Admin Collection**: Firestore `adminler` koleksiyonu
- **Role System**: superadmin, admin, editor, support, user

### Güvenlik Açıkları (TODO)

- [ ] Client-side admin kontrolü → Cloud Function'a taşınmalı
- [ ] Token validation eksik
- [ ] JWT refresh mechanism yok

---

**Son Güncelleme**: 2025-12-26  
**Durum**: Production Ready (bazı iyileştirmeler bekliyor)
