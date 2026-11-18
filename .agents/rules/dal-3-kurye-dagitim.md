---
trigger: glob
globs: **/src/app/kurye/**, **/src/app/admin/ekip/**, **/src/app/admin/kurye/**, **/src/components/courier/**, **/src/lib/delivery/**, **/src/lib/courier/**, **/src/hooks/useCouriers.ts, **/src/app/api/courier/**, **/src/app/api/admin/team/**, **/src/app/api/admin/couriers/**, **/src/app/api/orders/claim/**, **/src/app/api/orders/*/assign-courier/**, **/src/app/api/orders/*/deliver-b2b/**
---

# Dal 3 — Kurye, Ekip & Dağıtım Kalkanı (`dal-kurye-dagitim`)

- **Tam Ajan Tanımı:** `.agents/agents/dal-kurye-dagitim/agent.md` *(Model: mobil UI için `flash`, kasa mutabakatı & B2B esnek teslimat için `pro`)*.
- **Tek Mutabakat Motoru:** Kasa hesapları yalnız `src/lib/delivery/settlement.ts` (`summarizeCourierOrders`, `computeCourierCashVariance`) üzerinden yapılır; route içine kopya döngü yazılmaz (`pickup` hariç, `admin/staff/store/system` ödemeleri hariç, `transfer` B2B kalanından düşer).
- **Saha Kuralları:** Açık Kurumsal tema, tek elle dokunma (`min-h-11`/`12`), `SIP-YYMM-XXX` / `FİŞ-YYMM-XXX`, GPS izleme yok, `deliver_b2b_order_flexible_atomic` Hard Fail (`500`).
- **Doğrulama:** `npm run typecheck` + `npx vitest run src/lib/delivery/ src/app/api/orders/ src/lib/kernel/arch.test.ts`.
