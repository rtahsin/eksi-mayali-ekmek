# Release Checklist

Last updated: 2026-03-14

## Pre-Release Gates

- [ ] `flutter analyze` clean (critical error yok)
- [ ] Testler geçiyor (en azından smoke + kritik servis/widget testleri)
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
- [ ] Hosting deploy başarılı
- [ ] Gerekliyse firestore rules/index deploy edildi
- [ ] Post-deploy smoke test tamamlandı

## Post-Release

- [ ] Release notları güncellendi
- [ ] `WORKLOG` oturum özeti işlendi
- [ ] Açık kalan işler `OPEN_ITEMS`/`ROADMAP_TODO` içine geri yazıldı
