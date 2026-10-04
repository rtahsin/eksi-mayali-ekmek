# ⛔ ÇALIŞTIRMAYIN

Bu klasördeki dosyalar **tarihsel kayıt** içindir ve canlı veritabanında çalıştırılmamalıdır.

- `RUN_ALL_002_TO_010.sql` — 002–010 migration'larının elle birleştirilmiş eski kopyası. Numaralı dosyalardan sapmış olabilir; güvenlik kısıtlarını (REVOKE, search_path) içermez.
- `UPDATE_CREATE_ORDER_ATOMIC.sql` — `create_order_atomic` fonksiyonunun eski bir ara sürümü. Fonksiyonu yeniden oluşturur ve yetkileri sıfırlar.

Şema değişiklikleri yalnızca `supabase/migrations/` altındaki **numaralı** dosyalarla, sırasıyla yapılır (bkz. `docs/YOL_HARITASI.md` §5.3).
