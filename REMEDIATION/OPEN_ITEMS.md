# Open Remediation Items

Last updated: 2026-03-14

## Legend

- Status: `open` | `in_progress` | `blocked` | `done`
- Priority: `P0` | `P1` | `P2`

## Current Items

| ID | Item | Priority | Status | Owner | Notes |
|---|---|---|---|---|---|
| REM-001 | Fix invalid sitemap XML serving/parsing | P0 | done | - | Root sitemap deployed; live XML valid via cache-busted fetch + `Content-Type: application/xml` and `Cache-Control: no-cache,must-revalidate` verified |
| REM-002 | Remove generated/build artifacts from repository tracking | P0 | done | - | `git rm --cached` applied to `local_llm_bridge/node_modules` and `.firebase` cache; verification: `git ls-files .firebase local_llm_bridge/node_modules` => 0 |
| REM-003 | CI runtime and dependency version alignment | P0 | done | - | `.github/workflows/ci.yml` Node version set to `20` |
| REM-004 | Category filter should show empty-state instead of full fallback | P0 | done | - | `lib/screens/home_screen.dart` fallback removed; empty-state now shown correctly |
| REM-005 | Route/deep-link consistency across home sections | P1 | open | - | Improve shareability and navigation reliability |
| REM-006 | Separate admin/user web app shortcuts cleanly | P1 | open | - | Reduce user confusion and accidental admin entry |
| REM-007 | Controlled service worker re-enable investigation | P2 | open | - | Only after regression-safe rollout plan |

## Update Rules

- Her kapanan madde için kısa “kanıt” notu ekle (test, screenshot, log, link).
- `done` olan öğeler silinmez; durum ve tarih eklenir.
- Yeni madde eklenince ROADMAP ile senkron kalır.
