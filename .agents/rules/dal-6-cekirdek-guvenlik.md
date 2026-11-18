---
trigger: glob
globs: **/src/lib/kernel/**, **/src/lib/security/**, **/src/lib/supabase/**, **/src/lib/auth/**, **/src/lib/time/**, **/src/proxy.ts, **/supabase/migrations/**, **/supabase/tests/**, **/.github/workflows/**
---

# Dal 6 — Çekirdek, Güvenlik & DB Migration Kalkanı (`dal-cekirdek-guvenlik`)

- **Tam Ajan Tanımı:** `.agents/agents/dal-cekirdek-guvenlik/agent.md` *(Önerilen Model: HER ZAMAN `pro`)*.
- **Mimari & Güvenlik:** `arch.test.ts` (`R1–R7` ve R5 `any` cırcırı `<= 2`) korunur; `ADR-0009` `apiClient.ts` hata zarfı standarttır. Her admin/sunucu rotasında `verifyApiAuth` / `requireCapability` / `requireAdmin` zorunludur. Zaman = `src/lib/time/istanbul.ts`.
- **Migration (`034+`):** Staging yoktur (`ADR-0005`). Her migration `SET search_path = public, pg_temp`, açık `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role`, `app_migrations` kaydı ve eşlik eden `supabase/tests/NNN_*.sql` (`BEGIN...ROLLBACK`) duman testi içerir.
- **Doğrulama:** Çekirdek değişikliğinde `npm run typecheck` + tam `npm test` + `npm run build`.
