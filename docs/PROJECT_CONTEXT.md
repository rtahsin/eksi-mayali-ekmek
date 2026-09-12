# Project Context (Living Document)

Last updated: 2026-03-14
Owner: Core Team

## 1) Proje Özeti

- Proje: **EkmekLab** (Flutter Web + Firebase)
- Ana hedef: Ekşi mayalı ürünlerin e-ticaret akışı + admin operasyon yönetimi
- Domainler: `ekmeklab.com`, `eksimayaliekmekweb.web.app` (ve yönlendirilen varyantlar)

## 2) Mimari Kısa Özet

- Frontend: Flutter Web
- Backend: Firebase Auth / Firestore / Storage / Functions
- Admin: Ayrı route seti (`/admin/*`) + mobil hızlı erişim (`/admin-mobile`)
- State yönetimi: Provider + service katmanı

## 3) Mevcut Durum (Snapshot)

- Functions bağımlılık güvenlik yükseltmeleri uygulandı.
- Flutter tarafında analyze/test temiz çalışıyor.
- Admin tarafına çok sayıda operasyonel özellik eklendi (teslimat, bildirim, raporlama vb.).

## 4) Aktif Riskler / Dikkat Gerektiren Noktalar

1. **Sitemap erişimi hatalı**: `sitemap.xml` endpoint’lerinde XML parse hatası gözleniyor.
2. **Repo hijyeni riski**: `build/` ve `node_modules` gibi çıktılar değişikliklerde görünebiliyor.
3. **CI runtime uyumu**: Functions hedef runtime ile CI Node sürümü senkron olmalı.
4. **Navigasyon tutarlılığı**: Bazı kullanıcı akışları local state tabanlı; route/deep-link uyumu geliştirilmeli.

## 5) Kullanıcı Deneyimi Öncelikleri

- P0: Sitemap düzeltmesi + indekslenebilirlik
- P0: Filtre davranışında “sonuç yok” durumunun netleştirilmesi
- P1: Route/deep-link tutarlılığı
- P1: Kullanıcı manifestinden admin kısayolunun ayrıştırılması

## 6) Teknik İşletim Notları

- Build sonrası smoke test yapılmadan deploy önerilmez.
- `flutter analyze` ve `flutter test` merge öncesi zorunlu olmalı.
- Security ve dependency notları `REMEDIATION/` altında takip edilir.

## 7) Sonraki 3 Odak

1. Sitemap ve robots/sitemap zinciri doğrulaması
2. Repo temizliği (.gitignore ve izinsiz artifact takibinin engellenmesi)
3. UX akışlarında route standardizasyonu
