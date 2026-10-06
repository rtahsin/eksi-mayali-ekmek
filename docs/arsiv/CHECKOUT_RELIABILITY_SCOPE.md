# Checkout Reliability Scope Freeze (2026-03-26)

## Amaç
Checkout akışında güvenilirliği artırmak, regresyon riskini düşürmek ve değişiklikleri dar bir alanda tutmak.

## Kapsam Dahili Dosyalar
- `lib/screens/simple_checkout_screen.dart`
- `integration_test/frontend_user_journey_test.dart`

## Kapsam Dışı (Bu Milestone'da Dokunulmayacak)
- `lib/services/order_service.dart` (yalnızca mevcut kontrat kullanılacak)
- Firestore Rules / Index / Functions
- Ödeme altyapısı ve admin panel akışları
- Tema/genel UI refactor işleri

## Kabul Kriterleri
1. `checkout` ekranında bir kullanıcı giriş yapmamışsa auth yönlendirme kartı görünmelidir.
2. Sipariş gönderimi sırasında aynı anda birden fazla gönderim tetiklenmemelidir (`_isLoading` guard).
3. Sipariş oluşturma çağrısı sonsuza kadar beklememeli; timeout sonrası kullanıcı tekrar deneyebilmelidir.
4. Hata diyalogundaki `Tekrar Dene` aksiyonu gerçekten yeni bir sipariş denemesi başlatmalıdır.
5. `flutter analyze` sonucu temiz olmalıdır.

## Hata Matrisi (UI Davranışı)
- **Network/timeout**: Hata diyalogu + `Tekrar Dene`
- **Geçersiz form**: Form validation mesajları
- **Boş sepet**: Hata snackbar
- **Auth yok**: Giriş/Kayıt yönlendirme kartı

## Doğrulama Planı
- Statik doğrulama: `flutter analyze`
- Hedefli regresyon: `integration_test/frontend_user_journey_test.dart` (auth-wall senaryosu)
- Not: Bu repoda web hedefli integration test desteği sınırlı olduğundan CI/cihaz hedefi koşullarına göre çalıştırılır.
