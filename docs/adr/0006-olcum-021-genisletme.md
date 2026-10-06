# ADR-0006 Ölçüm: 021'i genişlet, yeniden yazma

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md §2.5 engagement, IS_PAKETLERI P1-10

## Bağlam
`021_funnel_events` (faz-4 yığınında) sipariş hunisini kişisel veri olmadan ölçüyor: `scan`, `cart_open`, `checkout_start`, `order_ok`, `order_error`. Eğitim için "merak" ölçülmeli (süre, açılan kart, tahmin isabeti, okuma derinliği). Trafik patlaması eksenimiz: içerik ziyaretçisi başına DB yazımı sınırlanmalı. Yeni bir tablo, birkaç gün önce biten işi tekrar yazmak olurdu.

## Karar
- `funnel_events` genişler: `props jsonb` (≤2 KB), `env` sütunu, CHECK'e `learning_session`. Olay adları korunur.
- `learning_session` oturum başına **bir** özet satırı; yalnız ≥30 sn ya da ≥1 kart açılmışsa; %20 örnek.
- Kimlik ya da oturum kimliği tutulmaz; satırlar birleştirilmez (KVKK).
- `/api/track` Postgres hız sınırlayıcısını kullanmaz (olay başına tek yazım); bellek içi sınır + 2 KB gövde sınırı.
- Sayfa görüntülenmesi DB'ye yazılmaz. Vercel Web Analytics isteğe bağlı; açılırsa sorgu dizesi atılır ve KVKK metni hukuki teyitle güncellenir.
- Saklama 13 ay (cron).

## Sonuç
Yük bütçesi: içerik ziyaretçisi başına ≤0,2 DB yazımı. Huni ve öğrenme ölçümü tek tabloda.

## Tetikleyici
Örneklenmiş veri karar vermeye yetmezse ya da hacim Postgres'i zorlarsa: harici analitik.
