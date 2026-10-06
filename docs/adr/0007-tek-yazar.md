# ADR-0007 Sipariş ve ödemede tek yazar

- **Tarih:** 2026-10-06 · **Durum:** kabul edildi · **İlgili:** MIMARI.md V13, IS_PAKETLERI P1-09, AGENTS.md §6

## Bağlam
Sunucu atomik RPC'lerle yazıyor (`create_order_atomic`, `mark_order_delivered`, `cancel_order_atomic`). Ama tarayıcı da RLS `admin_full_access_orders` üzerinden doğrudan yazıyor: ödeme kaydı (`src/hooks/usePayments.ts:204-264`, canlı ekranlar `admin/siparisler/[id]` ve `PaymentRecordModal`) iki ayrı yazımla `payments` + `orders.payment_status`; kurye atama (`src/hooks/useAdminOrders.ts:272-291`) `orders` + `order_status_history`. `assign-courier` rotası doğrulanmamış `body.status` yazabiliyor.

## Karar
`orders`, `payments`, `order_status_history` yalnız sunucu tarafından yazılır:
- Yeni `record_order_payment` RPC (tek işlem; `mark_order_delivered` değişmezleri; `SET search_path`; REVOKE/GRANT) + `POST /api/admin/orders/[id]/payments`.
- Ödeme modalı ve kurye atama API'ye geçer; `assign-courier` yalnız `kuryede` durumuna izin verir.
- Kod yayınından **sonra** tarayıcı politikaları SELECT'e iner.

## Sonuç
Finansal değişmezler tek yerde; AGENTS.md "atomik RPC, sessiz yedek yol yok" kuralı tarayıcı yolunu da kapsar. Admin ekranları biraz daha yavaş (bir HTTP turu).

## Tetikleyici
Yok (kalıcı ilke).
