# ADR-0004 İskeletten bağımsız içerik modeli

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md §0, IS_PAKETLERI D1

## Bağlam
Site iskeleti ve menü Tahsin'in açık kararı (yolculuk / sorular / defter / kitle; "hepsine yakınım"). Ana sayfa önerisi (PR #16) reddedildi. Bu karar beklerken içerik altyapısı durmamalı; ama mimari bu kararı gizlice vermemeli.

## Karar
İçerik modeli (yazı, kavram, kaynak, oyun bölümü, deney, öğrenme yolu) iskeletten bağımsızdır; her iskelet aynı yapı taşlarını kullanır. P1'de yalnız **nötr gezinme verisi** (`content/nav/links.ts`: etiket + bağlantı) ve yeni sayfalara bağlantı eklenir; ana sayfa değişmez. İskelet "tek satırlık yapılandırma" değildir: her seçenek farklı içerik türleri ister (yolculuk → öğrenme yolları, defter → deneyler, sorular → soru içeriği). Bu yüzden D1 kararından sonra seçilen seçeneğin gerektirdiği içerik ve sunum ayrıca kapsamlanır.

## Sonuç
- İçerik üretimi iskelet kararını beklemez.
- Ajanlar iskelet, menü, ana sayfa ya da tema seçmez.
- D1 sonrası bir sunum paketi açılır; içerik yeniden yazılmaz.

## Tetikleyici
Tahsin D1'i verdiğinde.
