# ADR-0002 Eğitim içeriği git'te

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi (Tahsin) · **İlgili:** MIMARI.md §2.3–2.4, YOL_HARITASI §7 (020 iptal)

## Bağlam
Kütüphane bugün üç yerde: statik TS, localStorage ve şemayla uyumsuz, sessizce veri kaybeden bir DB senkronu (`src/hooks/useJournal.ts`). Herkese açık bir editör sayfası var (`/kutuphane/yonetim`). İçeriği çoğunlukla ajanlar üretecek; Tahsin onaylayacak. 10x ekseni içerik hacmi ve trafik patlaması.

## Karar
Kaynak, iddia, kavram, yazı, medya kaydı ve gezinme verisi `content/` altında git'te. Kayıtlar TypeScript (`defineX({...})`), yazı gövdesi MDX, yazı metadatası yanında `meta.ts`. İçerik statik import ile pakete girer; sayfalar SSG. Doğrulama vitest testi olarak CI'da. `journal_articles` tablosu silinmez ama kullanılmaz; "020 journal v2" iptal.

**YAML/JSON neden değil:** TS kaydı ek bağımlılık ve kod üretimi olmadan tipli kimlik denetimi verir; tek kelimelik düzeltme GitHub web editöründe tırnak içinde güvenli; hataları CI yakalar. Tahsin'in kendi malzemesi için yol `content/gelen/` (ajan taslağa çevirir).

## Sonuç
- İçerik sayfaları çalışma anında DB'ye dokunmaz → trafik patlamasında CDN taşır; Supabase kapalıyken içerik açık.
- Her değişiklik PR + önizleme; geçmiş ve geri alma git'te.
- Admin CMS saldırı yüzeyi kalkar.
- Yayın = dağıtım (dakikalar); anlık düzeltme yok.

## Tetikleyici
Git kullanamayan ikinci bir yazar ya da Tahsin'in sık elle düzenleme ihtiyacı.
