# ADR-0001 Modüler monolit

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md §2.2

## Bağlam
Tek geliştirici (Tahsin) + kodlama ajanları, ~100 ekmek/gün kapasite, Next.js 16 + Supabase + Vercel. 10x eksenleri içerik hacmi ve ziyaretçi patlaması; ticari hacim değil. Bugün modül sınırı yok: aynı kavram 5–6 yerde tanımlı, tarayıcı ve sunucu aynı tablolara yazıyor.

## Karar
Tek Next.js uygulaması kalır. Alanlar `src/lib/<modül>/` dizinlerinde (dosya taşınmaz). Her modül `index.ts` (saf), `server.ts` (`import "server-only"`), `types.ts`, `schema.ts`, `*.test.ts`. Modüller arası kompozisyon yalnız `src/app` içinde. İzinli kenarlar MIMARI.md §2.2 diyagramında; `src/lib/kernel/arch.test.ts` denetler (ADR-0008).

## Sonuç
- Ajanlar dosya sahipliği tablosuyla paralel çalışabilir; çakışma paylaşılan dosyalarla sınırlı.
- Mikroservis, kuyruk, ayrı CMS yok; operasyon yükü düşük.
- Mevcut ihlaller sayıyla dondurulur, dokunuldukça azalır.

## Tetikleyici (yeniden değerlendir)
>1000 sipariş/gün ya da ayrı ölçeklenmesi gereken bir iş yükü (ör. video işleme).
