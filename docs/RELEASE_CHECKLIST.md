# Release Checklist

Last updated: 2026-03-14

## Pre-Release Gates

- [ ] `flutter analyze` clean (critical error yok)
- [ ] Testler geçiyor (en azından smoke + kritik servis/widget testleri)
- [ ] Backend gate geçiyor (`npm run test:backend-gate`)
- [ ] P0 open item kalmadı veya risk kabulü yazıldı
- [ ] Sitemap/robots/manifest endpointleri canlıda doğrulandı
- [ ] Güvenlik başlıkları (`firebase.json`) beklenen şekilde
- [ ] Kritik kullanıcı akışları manuel test edildi (home → product → cart → checkout)

## SEO/PWA Verification

- [ ] `sitemap.xml` valid XML parse ediliyor
- [ ] `robots.txt` sitemap referansı doğru
- [ ] `manifest.json` app identity ve shortcutlar doğru
- [ ] Canonical ve temel meta etiketleri beklendiği gibi

## Deployment

- [ ] Build alındı ve artefakt doğrulandı
- [ ] Functions deploy başarılı (`completeGuestOrderRegistration`, `createOrderSecure`)
- [ ] Hosting deploy başarılı
- [ ] Firestore rules/index deploy edildi
- [ ] Post-deploy smoke test tamamlandı

## Secure Checkout Smoke (Yeni Akış)

- [ ] Authsuz kullanıcı checkout formunu doldurabiliyor (login duvarı yok)
- [ ] E-posta OTP akışı tamamlanmadan sipariş oluşturulamıyor
- [ ] OTP sonrası kullanıcı oturumu açık kalıyor
- [ ] Son onay popup'ı görünmeden sipariş backend'e gönderilmiyor
- [ ] Sipariş sadece backend endpoint üzerinden oluşuyor (client direct create denemesi reddediliyor)
- [ ] 10 dk içinde 3 başarılı sipariş sonrası 1 saat blok davranışı doğrulandı
- [ ] Idempotency: aynı `idempotencyKey` ile tekrar denemede duplicate sipariş oluşmuyor

## Post-Release

- [ ] Release notları güncellendi
- [ ] `WORKLOG` oturum özeti işlendi
- [ ] Açık kalan işler `OPEN_ITEMS`/`ROADMAP_TODO` içine geri yazıldı
