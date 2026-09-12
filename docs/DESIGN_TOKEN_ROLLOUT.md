# Design Token Rollout Planı

## Amaç
UI tutarlılığını artırmak ve hardcoded değerleri azaltmak için spacing/radius değerlerini `AppTheme` tokenları üzerinden standartlaştırmak.

## Durum (2026-03-14)
- `lib/**` genelinde token migration tamamlandı.
- CI artık full strict modda çalışıyor: `dart run scripts/check_design_tokens.dart --strict`.
- Regex denetimi ve strict audit sonucu literal ihlal bulunmuyor.

## Tamamlananlar
- `lib/theme/app_theme.dart`: spacing ve radius tokenları eklendi
- `lib/screens/home_screen.dart`: ana alanlarda token kullanımı
- `lib/screens/cart_screen.dart`: kritik spacing/radius değerleri token'a taşındı
- `lib/widgets/product_grid.dart`: grid spacing token'a taşındı
- `lib/widgets/product_card.dart`: temel spacing/radius noktaları token'a taşındı
- `lib/widgets/featured_products.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/product_detail_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/order_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/order_detail_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/order_confirmation_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/order_history_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/about_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/splash_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/privacy_policy_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/notification_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/favorites_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/email_verification_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/notifications_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/cart_screen.dart`: kalan spacing literal geçişi tamamlandı
- `lib/screens/live_stream_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/address_management_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/ai_assistant_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/delivery_tracking_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/forgot_password_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/login_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/blog_detail_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/blog_list_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/home_screen.dart`: kalan spacing/radius literal geçişi tamamlandı
- `lib/screens/analytics_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_stocks.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/notification_management_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_users.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_orders.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_productions.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/live_stream_management_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_chatbot.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_expenses.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_sales.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_financial_report.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_blogs.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_settings.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_settings_screen.dart`: spacing token geçişi tamamlandı
- `lib/screens/admin/admin_dashboard.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/background_images_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/screens/admin/admin_products.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/admin_router.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/admin_app.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/widgets/admin_app_bar.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/widgets/admin_drawer.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/widgets/dashboard_charts.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/orders/admin_orders.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/mobile/admin_mobile_landing.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/categories/admin_categories.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/auth/admin_login.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/audit/admin_audit_logs.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/production/start_production_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/delivery/delivery_schedule_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/admin/delivery/delivery_route_screen.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/quick_view_dialog.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/empty_state.dart`: spacing token geçişi tamamlandı
- `lib/widgets/category_list.dart`: spacing token geçişi tamamlandı
- `lib/widgets/app_drawer.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/personalized_recommendations.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/notification_icon.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/loading_indicator.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/address_selection_widget.dart`: spacing token geçişi tamamlandı
- `lib/widgets/map_location_picker.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/page_banner.dart`: spacing token geçişi tamamlandı
- `lib/widgets/live_chat_floating_button.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/home_carousel.dart`: spacing token geçişi tamamlandı
- `lib/widgets/location_permission_dialog.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/location_loading_dialog.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/skeleton_loader.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/modern_stat_card.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/image_crop_dialog.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/home_header.dart`: spacing token geçişi tamamlandı
- `lib/widgets/feedback_chat_overlay.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/empty_state_widget.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/chatbot_widget.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/saved_addresses_bottom_sheet.dart`: spacing/radius token geçişi tamamlandı
- `lib/widgets/product_card.dart`: kalan spacing literal geçişi tamamlandı

## Sonraki Dalga (P1)
1. `lib/widgets/custom_app_bar.dart`
2. `lib/screens/profile_screen.dart`
3. `lib/screens/login_screen.dart`
4. `lib/screens/register_screen.dart`

## Lint / Denetim Stratejisi
- Script: `scripts/check_design_tokens.dart`
- Bilgi amaçlı kontrol (CI): `dart run scripts/check_design_tokens.dart`
- Zorlayıcı kontrol (scoped): `dart run scripts/check_design_tokens.dart --strict --include=<path>`
- Zorlayıcı kontrol (tam depo, hedef): `dart run scripts/check_design_tokens.dart --strict`
- Kural kapsamı:
	- `EdgeInsets.(all|symmetric|only|fromLTRB)` literal spacing değerleri
	- `BorderRadius.circular` literal radius değerleri
	- `AppTheme.space*` / `AppTheme.radius*` kullanımı teşvik edilir

### Strict Geçiş Planı
- ✅ Tamamlandı: phased scoped yaklaşımından full strict moda geçildi.
- Aktif kural: CI'da tüm `lib/**` için strict denetim çalışır.

## Uygulama Kuralları
- `EdgeInsets` ve `BorderRadius.circular` içinde doğrudan `8/12/16/24` gibi literal değer kullanma.
- Önce `AppTheme` içinde token tanımla, sonra widget'ta kullan.
- Yeni token ismi kısa ve anlamlı olsun (`spaceXs`, `radiusMd` gibi).

## Doğrulama Checklist
- `flutter test`
- Değişen dosyalarda `get_errors`
- Mobil + desktop hızlı görsel smoke kontrol

## Başarı Ölçümü
- Yeni PR'larda hardcoded spacing/radius sayısında düşüş
- UI ekranları arasında boşluk ve köşe yarıçapı tutarlılığının artması
