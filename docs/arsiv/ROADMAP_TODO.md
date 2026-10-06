# Roadmap & Prioritized TODO

Last updated: 2026-03-14

Status legend: `open` | `in-progress` | `blocked` | `done`

## P0 (Kritik)

| ID | İş | Neden | DoD (Done tanımı) | Owner | ETA | Status |
|---|---|---|---|---|---|---|
| P0-1 | Sitemap XML düzelt | SEO ve keşfedilebilirlik | `sitemap.xml` valid parse + Search Console doğrulama | TBD | 1 gün | done |
| P0-2 | Repo artifact temizliği | Gereksiz diff/CI şişmesi | `build/`, `node_modules/` vb. izlenmiyor + temiz commit | TBD | 1 gün | done |
| P0-3 | CI runtime hizalama | Deploy/runtime uyumsuzluk riski | Functions hedef sürümü ile CI aynı | TBD | 0.5 gün | done |

## P1 (Yüksek)

| ID | İş | Neden | DoD | Owner | ETA | Status |
|---|---|---|---|---|---|---|
| P1-1 | Route/deep-link standardizasyonu | Back button/URL paylaşım tutarlılığı | Home akışları route tabanlı | TBD | 2 gün | open |
| P1-2 | Filtre UX düzeltmesi | Kullanıcı güveni | Sonuç yoksa boş state; fallback yok | TBD | 0.5 gün | done |
| P1-3 | Manifest ayrıştırma | Son kullanıcı kafa karışıklığı | User manifestte admin shortcut kaldırıldı | TBD | 0.5 gün | done |

## P2 (Orta)

| ID | İş | Neden | DoD | Owner | ETA | Status |
|---|---|---|---|---|---|---|
| P2-1 | Service worker geri kazanımı | PWA hissi/perf | Timeout sorunu çözülerek kontrollü açılış | TBD | 2 gün | open |
| P2-2 | Dokümantasyon konsolidasyonu | Bilgi dağınıklığı | Tek master referans + kısa modül dosyaları | TBD | 1 gün | open |
