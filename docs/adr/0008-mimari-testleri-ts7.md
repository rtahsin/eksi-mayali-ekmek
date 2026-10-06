# ADR-0008 Mimari testleri bağımlılıksız (TypeScript 7)

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md §2.2 (R1–R5), IS_PAKETLERI P0-06

## Bağlam
Modül sınırları denetlenmeli. Proje TypeScript 7.0.2 kullanıyor; TS 7'de klasik derleyici API'si yok (Next de CLI moduna düşüyor). dependency-cruiser'ın son sürümü TypeScript'i `<7.0.0` olarak destekliyor; `.ts` ayrıştıramaz. Ayrıca "istemci dosyası sunucu modülü içe aktaramaz" kuralı dosya içeriğine (`"use client"`) bağlı; yol kuralıyla ifade edilemez.

## Karar
- `src/lib/kernel/arch.test.ts` (vitest): import'ları regex ile toplar, `@/` → `src/` eşler, izinli kenar tablosuyla karşılaştırır (R1, R2, R4). Ek bağımlılık yok.
- R3: IO modüllerinin ilk satırı `import "server-only"`; `next build` istemciye sızmayı zaten kırar. Vitest'te `server-only` boş modüle eşlenir.
- R5: `<any, any, any>` / `SupabaseClient<any` sayısı için cırcır testi.
- Mevcut ihlaller `KNOWN_VIOLATIONS` listesinde sayıyla dondurulur; liste yalnız küçülebilir.

## Sonuç
Ek araç ve CI adımı yok (`npm test` içinde). Regex tabanlı olduğu için dinamik `import()` dizeleri ve yeniden dışa aktarımlar kaba yakalanır; yeterli.

## Tetikleyici
dependency-cruiser (ya da benzeri) TS 7 desteği verirse yeniden değerlendirilir.
