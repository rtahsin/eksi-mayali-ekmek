# EkmekLab — İşçi Ajan İş Emri Standardı

> **Komuta Merkezi:** Yeni iş emirleri Komuta Merkezi sohbetinde üretilir ve işçi sohbetlere kopyalanır (veya alt-ajan olarak koşturulur).
> **Arşiv:** Tamamlanmış Ekim 2026 `P0 / P1 / Faz I` brifinglerinin tam kaydı `docs/_arsiv/IS_PAKETLERI_2026_10_TAM_TARIHCE.md` altındadır.

---

## 1. Standart İş Emri Şablonu (Komuta Merkezi → İşçi Sohbet)

```markdown
## İŞ EMRİ: <KOD> — <Başlık>
- **Şerit:** Şerit 1 (Bilim/Kitap) | Şerit 2 (Medya/Ses/Video) | Şerit 3 (Web/Satış)
- **Önce Oku:** `AGENTS.md` · `MERKEZ.md` · <yalnız ilgili 1–3 dosya>
- **Yazma Kapsamı (Yalnız):** <izin verilen dosya/klasör listesi>
- **Dokunma:** Kapsam dışındaki tüm dosyalar (`src/`, `supabase/` vb.)
- **Görev:**
  1. <Net adım 1>
  2. <Net adım 2>
- **Kabul Kriteri (DoD):**
  - Şerit 3 (Web) ise: `npm run typecheck && npm test && npm run build` (0 hata) + `any` yok + İstanbul saati (`istanbul.ts`).
  - Şerit 1–2 (`arastirma/`) ise: `python -X utf8 arastirma/bilgi_sentezi_v2/araclar/paket_dogrula.py` + ilgili çıktı dosyalarının varlığı (`npm run build` ÇALIŞTIRMA).
- **Migration:** Yok | Var → numara birleşme anındaki sıradaki boş numara (`031+`); ÖNCE / SONRA sırasını belirt.
- **Dur ve Sor:** Kapsam dışı bir dosyaya dokunmak gerekirse veya mevcut veri/şema ile çelişki çıkarsa tahminde bulunma, dur ve raporla.
```

---

## 2. Paralel Çalışma ve Çakışmasızlık Kuralları

1. **Farklı Şeritler Aynı Anda Çalışabilir:**
   - Bir sohbet `arastirma/` altında kitap, dergi, ses veya Remotion videosu üretirken, başka bir sohbet `src/` altında web geliştirme yapabilir; birbirlerini ezmezler.
2. **Aynı Anda Tek Web (`src/`) Yazıcısı:**
   - `F:\ekmeklab_app` üzerinde worktree açmadan çalışıldığında `.next` derleme kilidi ve ortak tip dosyalarının çakışmaması için aynı anda `src/` altında **yalnız 1 işçi ajan** kod yazar.
3. **Kırmızı Çizgiler (İstisnasız):**
   - Canlı veritabanına (`SUPABASE_SERVICE_ROLE_KEY`) bağlanan script çalıştırılmaz; SQL'i yalnız Tahsin Supabase SQL Editor'de çalıştırır.
   - Hiçbir metinde, görselde, ürün kartında veya video senaryosunda `K006` sağlık vaadi (*"şifa, önler, sindirimi kolay, bağırsak dostu..."*) kullanılmaz.
   - Biten işten sonra işçi ajan kısa özet verir; Komuta Merkezi `git diff` ve çıktıları denetleyip kabul mührünü vurur.
