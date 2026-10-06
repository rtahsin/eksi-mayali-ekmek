# ADR-0005 Staging yok — kabul edilmiş risk

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi (Tahsin) · **İlgili:** MIMARI.md V11, IS_PAKETLERI P0-04

## Bağlam
Vercel önizlemeleri canlı Supabase'e yazar. Ayrı bir test veritabanı önerildi; Tahsin "şimdilik canlıda" dedi. Bugün `tests/e2e/order-flow.spec.ts` ve `scripts/cleanup_test_orders.mjs` service-role ile canlı satır siliyor; `scripts/verify_after_migration.mjs` canlıya gerçek sipariş atıyor.

## Karar
Staging kurulmaz. Riski azaltan önlemler:
- Eğitim işinin çoğu (ADR-0002) DB'ye hiç dokunmaz.
- `appEnv()` ile yan etkiler önizlemede ayırt edilir: Telegram `[TEST]` öneki (mevcut), ölçüm olayları `env='preview'`.
- Canlı veri silen script ve e2e testleri `ALLOW_PROD_WRITES=1` + `TEST` öneki olmadan çalışmaz; canlıya sipariş atan script silinir.
- Ajanlar service-role script'i çalıştırmaz, canlı DB'ye bağlanmaz; SQL'i Tahsin çalıştırır (önce `ROLLBACK` kuru deneme).
- Test kayıtları "TEST" önekli (YOL_HARITASI §2).

## Sonuç
Önizleme hataları canlı veriyi bozabilir; bu bilinçli kabul edildi. Migration'lar kuru denemeyle korunur.

## Tetikleyici (yeniden değerlendir)
İkinci bir insan katkıcı, online ödeme entegrasyonu ya da ilk önizleme kaynaklı veri kazası.
