# Architecture & Process Decisions

Last updated: 2026-03-14

Bu dosya, neden belirli teknik/operasyonel kararlar aldığımızı saklar.

## Decision Record Template

### [DEC-XXX] Title
- Date:
- Status: proposed | accepted | deprecated | superseded
- Context:
- Decision:
- Consequences:
- Related files/issues:

---

### [DEC-001] Context docs as mandatory operational layer
- Date: 2026-03-14
- Status: accepted
- Context: Çok adımlı iyileştirmelerde oturumlar arası bağlam kaybı yaşanıyordu.
- Decision: `PROJECT_CONTEXT`, `ROADMAP_TODO`, `WORKLOG`, `OPEN_ITEMS` dosyaları standartlaştırıldı.
- Consequences: Devir teslim kolaylaştı; plan/ilerleme görünürlüğü arttı.
- Related files/issues: `docs/PROJECT_CONTEXT.md`, `docs/ROADMAP_TODO.md`, `docs/WORKLOG.md`, `REMEDIATION/OPEN_ITEMS.md`

### [DEC-002] Prioritize P0 correctness over feature expansion
- Date: 2026-03-14
- Status: accepted
- Context: Sitemap, filtre davranışı ve CI uyumsuzlukları kullanıcı güveni/operasyon kalitesini etkiliyor.
- Decision: Yeni özelliklerden önce P0 doğruluk maddeleri tamamlanacak.
- Consequences: Kısa vadede feature hızı düşebilir; orta vadede daha stabil release.
- Related files/issues: `docs/ROADMAP_TODO.md`, `REMEDIATION/OPEN_ITEMS.md`
