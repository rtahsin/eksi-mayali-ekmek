---
trigger: glob
globs: **/src/app/admin/cariler/**, **/src/app/admin/finans/**, **/src/app/fis/**, **/src/app/ekstre/**, **/src/components/admin/cariler/**, **/src/components/admin/finans/**, **/src/lib/cari/**, **/src/lib/finance/**, **/src/hooks/useCariler.ts, **/src/hooks/useCariProfile.ts, **/src/hooks/useFinanceDashboard.ts, **/src/app/api/admin/cari/**, **/src/app/api/admin/finance/**, **/src/app/api/slip/**, **/src/app/api/ekstre/**
---

# Dal 4 — B2B Cari & CFO Finans Kalkanı (`dal-cari-finans` · R6 & R7 Kilitli)

- **Tam Ajan Tanımı:** `.agents/agents/dal-cari-finans/agent.md` *(Model: makbuz/CSV için `flash`, atomik defter/storno/P&L için `pro`)*.
- **Kilitli Clean Architecture (`R6` & `R7`):**
  - İnce API rotalarında (`.from()`, `.rpc()`, `repo` importu) YASAK; yalnız `server.ts` çağrılır.
  - Sayfalarda (`admin/finans`, `admin/cariler`) ve 3 hook'ta ham `fetch()`, tarayıcı `.from()` PostgREST okuması ve `server|repo` importu YASAK; yalnız `client.ts` (`@/lib/kernel/apiClient`) kullanılır (`supabase.channel` Realtime serbest).
  - `whatsapp.ts` içinden `@/hooks/` içine ters bağımlılık YASAK.
- **Muhasebe:** Simetrik bakiye `SUM(delta)`, storno (silme yok), Hard Fail RPC (`500`), güncel `share_token_version`, müşteri `/fis` & `/ekstre`'de WhatsApp butonu YASAK, CSV `\uFEFF` + `;`, `/admin/finans` yalnız `requireAdmin`.
- **Doğrulama:** `npm run typecheck` + `npx vitest run src/lib/kernel/arch.test.ts src/lib/cari/ src/lib/finance/ src/app/api/admin/cari/ src/app/api/admin/finance/`.
