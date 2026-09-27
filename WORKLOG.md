# 📋 EkmekLab Doğrulama & İş Günlüğü (WORKLOG)

> **Tarih**: 27 Eylül 2026  
> **Durum**: 🛡️ **GÜVENLİK PROTOKOLÜ VE SIRALI MİGRATİON DİREKTİFİ İŞLETİLİYOR**  
> **Kural**: "Eksik tablo/kolon bulunduğunda, önce repodaki numaralı migration dosyalarının çalıştırılıp çalıştırılmadığı kontrol edilir; var olan migration'lar varken elle yeni bir 'konsolide' şema script'i yazılmaz." kuralı `AGENTS.md` dosyasına kalıcı olarak eklendi.

---

## 1. 🛡️ Güvenlik Düzeltmesi & Konsolide Script İptali

* **Kullanıcı / Sonnet Uyarısı**: Geçici konsolide SQL script'i, `payments`, `order_status_history` ve `customer_locations` tablolarını tablo seviyesinde RLS (Row Level Security) politikaları olmadan oluşturma riski taşıdığı için **kesinlikle çalıştırılmadı ve iptal edildi**.
* **Alınan Aksiyon**: `AGENTS.md` 6. Bölümüne şu kural işlendi:
  > **Veritabanı Migration Bütünlüğü & Ad-hoc Konsolide Script Yasağı**: Eksik tablo veya kolon tespit edildiğinde, ASLA elle yeni bir "ad-hoc konsolide" şema script'i yazılmaz (RLS politikalarının, kısıtların ve trigger'ların atlanmaması için). Öncelikle repodaki numaralı migration dosyalarının (`supabase/migrations/00X_...`) sırasıyla çalıştırılıp çalıştırılmadığı kontrol edilir ve eksik migration'lar orijinal numara sırasına göre uygulanır.

---

## 2. ⚠️ Kritik Bağımlılık Tespiti: `002_create_couriers.sql`

Repodaki migration dosyaları adım adım incelendiğinde şu kritik bağımlılık tespit edilmiştir:
* `003_extend_orders.sql` dosyasının 8. satırında:
  ```sql
  ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;
  ```
  `orders` tablosuna `courier_id` foreign key'i eklenmektedir.
* Ancak `public.couriers` tablosu veritabanında henüz mevcut değildir (`002_create_couriers.sql` çalıştırılmamış).
* **Bu nedenle, `003` dosyasından önce mutlaka `002_create_couriers.sql` çalıştırılmalıdır.** Aksi takdirde `003` dosyası `relation "public.couriers" does not exist` hatasıyla kesilecektir.

---

## 3. 📑 Supabase SQL Editor'da Sırayla Çalıştırılacak Dosyalar

Lütfen aşağıdaki migration dosyalarını **Supabase Dashboard -> SQL Editor** üzerinden sırayla çalıştırınız:

1. **`supabase/migrations/002_create_couriers.sql`**
   - `couriers` tablosunu, indeksleri ve kurye RLS politikalarını oluşturur.
2. **`supabase/migrations/003_extend_orders.sql`**
   - `orders` tablosuna `order_number`, `source`, `courier_id`, GPS ve statü kolonlarını ekler, `order_number` sequence ve indeksini tanımlar.
3. **`supabase/migrations/004_create_order_status_history.sql`**
   - `order_status_history` tablosunu, indeksleri ve audit log RLS politikalarını oluşturur.
4. **`supabase/migrations/005_create_payments.sql`**
   - `payments` tablosunu, indeksleri, check kısıtlarını ve ödeme RLS politikalarını oluşturur.
5. **`supabase/migrations/006_create_customer_locations.sql`**
   - `customer_locations` tablosunu, indeksleri, RLS politikalarını ve 72 saatlik KVKK TTL temizlik fonksiyonunu oluşturur.
6. **`supabase/migrations/007_extend_profiles_and_orders_rls.sql`**
   - `profiles` tablosuna sipariş istatistiklerini ekler, `orders` ve `profiles` RLS politikalarını sıkılaştırır.
7. **`supabase/migrations/008_fix_security_and_rls.sql`**
   - `account_transactions` ve `payments` RLS politikalarını en az yetki (least privilege) ilkesine göre daraltır, terminal statü trigger'ını ekler.
8. **`supabase/migrations/009_fix_rls_policy_conflicts.sql`**
   - Eski şemadaki gevşek politikaları kaldırır, `order_items` RLS politikalarını standardize eder.
9. **`supabase/migrations/010_atomic_order_and_schema_improvements.sql`**
   - `order_number` kolonu artık mevcut olduğundan, `uq_orders_order_number` UNIQUE kısıtını ve `generate_order_number()` advisory transaction lock ile `create_order_atomic()` fonksiyonlarını devreye sokar.

---

## 4. 🔍 RLS ve Tablo Bütünlüğü Doğrulama Sorgusu

Migration'lar tamamlandığında Supabase SQL Editor'da şu SQL sorgusu çalıştırılarak RLS'nin aktif olduğu teyit edilebilir:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('payments', 'order_status_history', 'customer_locations', 'couriers', 'orders', 'order_items');
```

**Beklenen Sonuç:**
Tüm satırlarda `rowsecurity = true` olmalıdır.

---

## 5. 🤖 Otomatik Doğrulama Paketi Hazırlandı

Migration'lar çalıştırıldıktan sonra terminalden doğrudan şu test komutu çalıştırılacaktır:

```bash
node scripts/verify_after_migration.mjs
```

Bu script sırasıyla şunları doğrular:
1. Gerekli tüm tabloların (`orders`, `couriers`, `payments`, `order_status_history`, `customer_locations`) varlığını.
2. `orders` tablosundaki tüm yeni kolonları (`order_number`, `courier_id`, GPS vb.).
3. `generate_order_number()` RPC'sini ve dönen formatı (`SIP-YYMM-XXX`).
4. **Anonim (anon key) erişimle RLS korumasını**: Yetkisiz okumalarda 0 satır dönüldüğünü ve veri sızıntısı olmadığını.
5. `/api/orders/create` endpoint'ine gerçek sipariş gönderimini ve DB'de `order_items`, `payments`, `order_status_history`, `customer_locations` kayıtlarının eksiksiz atomik oluşumunu.

Bu doğrulama başarılı olduğunda derhal P2 maddelerine (Playwright testleri, `/urun/[slug]`, `sitemap.xml`, Schema.org, Firebase temizliği) başlanacaktır.
