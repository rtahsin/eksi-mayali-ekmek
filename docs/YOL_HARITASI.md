# EkmekLab Yol Haritası ve Uygulama Planı

> **Tek kaynak.** Bu dosya Tahsin'in ve tüm Claude oturumlarının ortak planıdır. Her oturum başında okunur; bir faz bitince aşağıdaki durum tablosu güncellenir. Plan 4 Ekim 2026'da Tahsin tarafından onaylandı. Son güncelleme: 2026-10-04.

## Durum
| Faz | Konu | Tahmini süre | Durum |
|---|---|---|---|
| Acil | Tahsin'in kod beklemeden yapacakları (§4) | 15 dk | ✅ tamamlandı (4 Eki) |
| 0 | Güvenlik yaması | ~1 gün + 1 saat Tahsin | ✅ tamamlandı (4 Eki): PR #1 canlıda, 013 uygulandı ve doğrulandı, `JWT_SECRET` silindi |
| 0.5 | CI (her PR'da otomatik build) | ~2 saat | ✅ tamamlandı (4 Eki, PR #3) |
| 1 | Sipariş çekirdeği onarımı | 3-4 gün | ✅ canlıda (4 Eki, PR #4): 014 uygulandı ve doğrulandı; Telegram env eklendi. Not: 014 birleştirmeden birkaç dakika önce çalıştı → o aralıkta web siparişi reddedildi (sıra kuralı: önce kod, sonra migration) |
| 2 | Esnek ürün ve satış yönetimi (kategori, satış günleri, kapasite, paket, kampanya) | 4-5 gün | ✅ canlıda (4 Eki, PR #6): 015 önce uygulandı, sonra kod; önizleme + canlı duman testi ✅ |
| 3 | Admin sadeleştirme + finans doğruluğu | ~5 gün | 3b ✅ canlıda (PR #8 + #9; 016–018) · 3a-1 ✅ (PR #10) · 3a-2 (Teslimat ekranı + Bugün paneli) PR'da · sonra Faz 4 |
| 4 | Marka, görseller, içerik, yasal metinler | 4-6 gün + içerik | sürüyor: krem tasarım seçildi; marka dosyası `docs/MARKA.md`; simülatör oyunu `docs/OYUN.md` (prototip `/laboratuvar`) |
| 5 | Temizlik ve araçlar | 1-2 gün | bekliyor |

Toplam: odaklı ~3-4 hafta (oturumlar halinde). Faz 4, tasarım yönü seçilince Faz 3 ile paralel yürüyebilir.

---

## 1. Bağlam (Neden?)
Tahsin 8 yıldır ekşi maya ekmek üretiyor; Beylikdüzü'ndeki bahçe atölyesinde (22 m², taş fırın) günde ~100 ekmek kapasitesi var. Şu an 2 şarküteriye günlük ~30 ekmek toptan satıyor; bireysel müşterisi ve reklamı yok. Amaç ucuz toptan satıştan çok **marka olmak**, ekmek bilincini yaymak, kitleye ulaşmak; uzun vadede kargo ve belki yatırım.

Mevcut uygulama (Next.js 16 + Supabase + Vercel, ~38k satır) Flutter/Firebase'den taşınırken **ağır bir fırın operasyon yazılımına** dönüşmüş (kurye GPS, kasa, gider, tedarikçi…), ama hedefin kalbi olan **marka hikâyesi, haftalık ön sipariş, eşlikçi ürünler, minimum sepet** yok. Üstelik canlıda ciddi güvenlik açıkları ve web siparişlerini admin'de görünmez yapan bir hata var.

**Hedef ürün:** Marka kimliği + Beylikdüzü içi teslimatlı sipariş platformu; Tahsin'i yormayan sade bir yönetim paneli.

## 2. Kararlar (Tahsin, 3-4 Ekim 2026)
- **Satış ritmi:** standart ekşi maya ekmek her gün (günlük kapasite sınırıyla) + haftada 1-2 belirli günde sınırlı adetli özel reçeteler (ön sipariş) + eşlikçiler (tereyağı, reçel, peynir…) her zaman, minimum sepet tutarıyla.
- **Ödeme (açılış):** kapıda nakit, kapıda POS, WhatsApp'ta anlaşma. IBAN yok, online kart yok. Kargo/online ödeme (Shopier) sonra.
- **Teslimat:** Beylikdüzü; şimdilik Tahsin, ileride bir kurye.
- **Admin modülleri — kalır:** Siparişler, Ürünler, Ayarlar, Cari hesaplar (2 şarküteri), Müşteriler, Üretim (sadeleşir), Kütüphane editörü (tek kopya). **Gizlenir:** Kurye yönetimi (kurye gelince açılır). **Kaldırılır:** Kasa, Giderler, Tedarikçiler, Kurye gün sonu kasası, PIN girişi, **YZ sipariş okuyucu (Gemini)** (4 Eki: Faz 1 sonrası WhatsApp siparişi sitede gerçek kayıt olacağı için gereksiz; müşteri adı/telefon/adresini aydınlatma metninde olmayan yurt dışı hizmete gönderiyordu — KVKK riski). Dağıtım + kurye ekranı tek "Teslimat" ekranında birleşir; admin ana sayfası "Bugün" ekranı olur. Veritabanı tabloları silinmez.
- **Şarküteri teslimatları:** sipariş olarak değil, **fiş kesmeye devam** (cari hesap). Üretim planı toptanı ayarlardaki "günlük toptan adet" ile ekler.
- **Müşteri girişi (4 Eki güncellendi):** Google **+ şifresiz e-posta kodu** (6 haneli kod; hesap ilk girişte açılır, şifre/sıfırlama sorunu yok) + misafir sipariş. Misafir siparişleri hesaba **bağlanır** (Faz 1 madde 13). Şifreli kayıt yok. E-posta kodu Supabase Auth'ta özel SMTP gerektirir; kurulana kadar `NEXT_PUBLIC_EMAIL_LOGIN_ENABLED=false` ile gizli. **Admin girişi:** Google.
- **Yeni sipariş bildirimi:** Telegram botu (kişisel veri göndermeden).
- **Alan adı:** `ekmeklab.tr`. **İşletme WhatsApp:** 0501 012 66 53.
- **Çalışma yeri:** plan bulutta bitti, uygulama Tahsin'in bilgisayarında (Claude masaüstü uygulaması → Code → Local, klasör `F:\ekmeklab_app`).
- **Canlı dal:** bilinmiyor → çalışma `main` üzerinden; Faz 0 yayınından önce Vercel'de kontrol edilir (hedef: Vercel production + GitHub varsayılan dalı = `main`).
- **Test verisi:** canlı Supabase projesinde; test kayıtları "TEST" ile işaretlenir ve iş bitince silinir.

## 3. Doğrulanmış kritik bulgular
| # | Bulgu | Yer |
|---|---|---|
| K1 | Web siparişleri `delivery_date="today"/"tomorrow"/"custom:..."` metniyle kaydediliyor; admin/üretim/teslimat ekranları `YYYY-MM-DD` ile süzdüğü için **görünmüyor**. Ayrıca "bugün" her yerde UTC (İstanbul 00-03 arası yanlış gün) | `src/app/api/orders/create/route.ts:319,337`; `src/hooks/useAdminOrders.ts:467-489` |
| K2 | Kayıt e-postayı otomatik onaylıyor ve iki sabit e-postaya superadmin veriyor; Google girişi her seferinde rolü `customer`/`superadmin` diye eziyor | `src/app/api/auth/register/route.ts:41,67,74`; `src/app/auth/callback/route.ts:38,50` |
| K3 | `/api/auth/google-sync` kimlik kontrolsüz, kullanılmıyor, profilleri eziyor | `src/app/api/auth/google-sync/route.ts` |
| K4 | `/api/journal` POST/DELETE kimlik kontrolsüz, kullanılmıyor | `src/app/api/journal/route.ts:41,80,94` |
| K5 | Hassas veritabanı fonksiyonlarında yetki kısıtı (REVOKE) yoktu — **4 Eki acil SQL ile kapatıldı**, 013 kalıcılaştırır | `supabase/migrations/*` |
| K6 | `geolocation=()` başlığı tüm sitede konumu kapatıyor | `next.config.ts:27` |
| K7 | Admin PIN'i herkese okunur tablodaydı, varsayılanı giriş sayfasında yazılı; `JWT_SECRET` yoksa çerez koddaki sabit metinle imzalanıyor — **PIN 4 Eki'de gizlendi ve rastgele yapıldı**, kod Faz 0'da kalkar | `src/app/api/admin/auth/pin/route.ts:5-7,29`; `src/middleware.ts:61-73`; `supabase/schema.sql:401-403` |
| K8 | `/api/orders/create` kullanıcı/cari bilgisini istekten alıyor | `route.ts:43-47,113-117,351,371` |
| K9 | `profiles` güncelleme kuralı sütun kısıtı içermiyordu (rol dahil) — **4 Eki acil SQL ile kapatıldı**, 013 kalıcılaştırır | `supabase/schema.sql:308-310` |

Diğer önemli bulgular: WhatsApp butonu sipariş kaydetmiyor (`CheckoutActions.tsx:48-64`); stok hiçbir şey yapmıyor (0→25); admin ayarlarındaki ücret/eşik/numara vitrine bağlı değil; minimum sepet yok; takip sayfasında misafir toplamları "0 ₺", zaman çizelgesi boş, iptal hep 403; kuryenin canlı konumu herkese açık; şarküteri ekstre linki boş görünüyor ve tür eşlemesi hatalı; kurye teslim penceresi cari borcu siliyor; finans yazımları atomik değil ve kalıcı siliyor; ürün kaydetmek slug'ı bozuyor; görsel yükleme yok; kütüphane düzenlemeleri sadece tarayıcıya kaydediliyor ve `/kutuphane/yonetim` herkese açık; 4 farklı WhatsApp numarası, 2 alan adı; müşteri manifesti admin'e açılıyor; yasal metinler online kart iddia ediyor; atölye görselleri yapay zekâ üretimi; CI Flutter dönemine ait ve her push'ta kırmızı.

**4 Ekim canlı veritabanı tespitleri:**
- `record_cari_transaction_atomic` canlı veritabanında **yok** (AGENTS.md onu zorunlu tutuyor ama hiç oluşturulmamış; Faz 3'te 016 ile oluşturulur).
- Supabase Auth'ta 4 Google hesabı var: `tahsinreyhan@gmail.com` ve `ekmeklab@gmail.com` superadmin; `sourdaoxyz@gmail.com` customer; `kriptocutahsin@gmail.com` customer (hiç giriş yapmamış — Tahsin'in olduğu teyit edilecek).
- `orders`, `order_items`, `order_status_history`, `payments` politikaları repodaki 007-009 ile uyumlu; siparişlerde herkese açık okuma politikası **yok**. `orders` üzerinde tek tetikleyici: `trg_order_status_progression`.
- **K1 canlıda görüldü:** admin "Sipariş Komuta Merkezi"nde "Bekleyen: 2" yazarken varsayılan "Bugünün Teslimatları" listesi boş (filtre `useAdminOrders.ts:90,467`). Geçici çözüm: **"Tüm Tarihler"** sekmesi. Kalıcı çözüm Faz 1.
- Repo 4 Ekim'de **private** yapıldı.

---

## 4. ACİL ADIMLAR — ✅ 4 Ekim'de uygulandı
**Sonuç:** acil SQL tek transaction'da uygulandı. Kontrol çıktısı: `adjust_cari_balance`, `check_rate_limit`, `cleanup_expired_customer_locations`, `create_order_atomic`, `generate_slip_number` herkese ve girişliye kapalı; `generate_order_number` sadece girişliye açık (admin paneli için); `is_admin` açık (RLS gereği); `check_order_status_progression` ve `handle_new_user` tetikleyici fonksiyonları açık görünüyor ama doğrudan çağrılamaz (013 toparlar). Kullanıcı listesi temiz, repo private.

**Teyitler (Tahsin, 4 Eki):** Vercel'de `JWT_SECRET` tanımlı; `.env`'deki değerler örnek metin (gerçek şifre yok); admin girişi Google ile çalışıyor (siparişler "Tüm Tarihler" sekmesinde, bkz. K1).

**Uygulanan SQL (kayıt için — tekrar çalıştırmaya gerek yok):**
```sql
BEGIN;
-- 1) PIN: herkese açık okuma kapanır, PIN kimsenin bilmediği rastgele bir değere çevrilir
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='bakery_settings' LOOP
    EXECUTE format('DROP POLICY %I ON public.bakery_settings', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Public read bakery settings" ON public.bakery_settings
  FOR SELECT USING (key <> 'security_settings');
CREATE POLICY "Admin manage bakery settings" ON public.bakery_settings
  FOR ALL USING (public.is_admin());
INSERT INTO public.bakery_settings (key, value)
VALUES ('security_settings', jsonb_build_object('quickPin', gen_random_uuid()::text))
ON CONFLICT (key) DO UPDATE
  SET value = public.bakery_settings.value || jsonb_build_object('quickPin', gen_random_uuid()::text),
      updated_at = now();

-- 2) Kullanıcılar profilinde sadece ad/telefon/avatar değiştirebilsin (rol değil)
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;

-- 3) Sipariş/para fonksiyonları sadece sunucudan çağrılabilsin
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN (
             'create_order_atomic','record_cari_transaction_atomic','adjust_cari_balance',
             'check_rate_limit','generate_slip_number','cleanup_expired_customer_locations',
             'generate_order_number') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname = 'generate_order_number' THEN   -- admin paneli hâlâ kullanıyor (Faz 3'e kadar)
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
COMMIT;
```
Sonuç olarak **PIN girişi artık fiilen kapalı**; admin girişi Google ile.

---

## 5. Çalışma şekli
### 5.1 Bulut oturumu — ✅ tamamlandı (4 Ekim)
Çalışma dalı `claude/brave-maxwell-e3hq6r`, `main` üzerine taşındı; bu plan `docs/YOL_HARITASI.md` olarak yazıldı; `AGENTS.md`'ye plan işaretçisi eklendi. Kod değişikliği yapılmadı.

### 5.2 Yerel oturum (Tahsin'in bilgisayarı)
> **4 Ekim notu:** Yerel `main`'de GitHub'a hiç gönderilmemiş 6 commit (Faz A–E, ayrı bir oturumun işi) vardı. Tahsin'in kararıyla bu plan tek referans alındı; o commit'ler kaybolmasın diye `backup/local-main-faz-A-E` etiketiyle saklandı, yerel `main` olduğu gibi bırakıldı. Faz 0 dalı bu plan dalından (`origin/main` tabanlı) açıldı.

- Claude masaüstü → **Code** → **Local** → **Select folder** → `F:\ekmeklab_app`. İlk mesaj:
  > AGENTS.md ve docs/YOL_HARITASI.md'yi oku. Önce `git status` ile yerel değişikliklerimi kontrol et, hiçbirini kaybetmeden `claude/brave-maxwell-e3hq6r` dalına geç. Sonra Faz 0'a başla.
- Oturum kuralları: yerel değişiklikleri asla silme; `.env.local`'in **varlığını** kontrol et (değerleri okuma/yazdırma); `npm ci`; AGENTS.md gereği `node_modules/next/dist/docs/` içinden ilgili rehberleri oku; her değişiklikten sonra `npm run build`.
- Her fazın başında ilgili bölümü koda karşı yeniden doğrula; plan ile kod çelişirse önce Tahsin'e sor.

### 5.3 PR, migration ve yayın kuralları
- Her faz ayrı PR → `main`. Tahsin Vercel önizleme linkinde ve yerelde dener, birleştirir.
- Migration'lar numaralı (`supabase/migrations/013_...` ve sonrası); ad-hoc birleşik script yok. Tahsin SQL Editor'de çalıştırır: önce sonu `ROLLBACK` olan kuru deneme, sonra `COMMIT`. Öncesi/sonrası doğrulama çıktısını yerel oturuma yapıştırır. Her migration `app_migrations` tablosuna kendini yazar ve `supabase/tests/NNN_*.sql` (BEGIN…ROLLBACK) duman testi içerir.
- Her yeni/değişen fonksiyon: `SET search_path = public, pg_temp` + açık `REVOKE ... FROM PUBLIC, anon, authenticated` / `GRANT ... TO service_role` (`CREATE OR REPLACE` bunları sıfırlar).
- Uygulama ↔ migration sırası her fazda belirtilir (§7).
- Vercel önizlemeleri canlı veritabanına yazar; önizlemeden giden Telegram mesajları `[TEST]` önekli. Faz 2'den itibaren ayrı bir "staging" Supabase projesi önerilir (açık karar).

---

## 6. Fazlar (teknik ayrıntı — yürütecek oturum için)

### Faz 0 — Güvenlik yaması (ayrı PR, en hızlı yayın)
**Amaç:** yetki yükseltme, para/borç kurcalama ve kişisel veri sızıntısı yollarını kapatmak; uygulama yayından önce ve sonra çalışır kalır.

**Ön iş:** `npm ci`; Next 16 dokümanları (`01-app/02-guides/upgrading/version-16.md`, `03-api-reference/03-file-conventions/proxy.md`, `04-functions/after.md`, route handlers); Supabase env'siz `npm run build` taban çizgisi (Gemini istemcisi modül seviyesinde oluşturuluyor: kırılırsa `src/app/api/admin/orders/parse/route.ts` içinde handler'a taşı). Tahsin V-sorgularını (aşağıda) çalıştırır.

**Kod adımları:**
1. **Yetki yardımcısı** — `src/lib/security/apiAuth.ts`: `verifyApiAuth` önce çerez oturumunu okur (`createClient` from `src/lib/supabase/server.ts` + `auth.getUser()`), sonra mevcut Bearer yolu; rol `createAdminClient()` ile. `requireAdmin(req)` ekle ve `src/app/api/admin/**` altındaki her handler'ın ilk satırında çağır (middleware'e ek savunma).
2. **PIN ve "güvenilir cihaz" kaldır** — sil: `src/app/api/admin/auth/pin/route.ts`, `src/components/admin/QuickPinLock.tsx`, `src/hooks/useTrustedDevice.ts`, `tests/e2e/admin-login.spec.ts`, `tests/e2e/quick-receipt.spec.ts`. `src/middleware.ts`: jose ve 61-73 kaldır; `/api/admin/` istisnasız korunur. `src/hooks/useAdminAuth.ts`: `SUPER_ADMIN_EMAILS`, `isSuper`, `loginWithPin`, PIN localStorage oturumu, `firebaseUser` kaldır; eski localStorage anahtarlarını bir kez temizle. `AdminAuthGate.tsx` sadeleşir (52-187 silinir). `admin/layout.tsx` + `AdminHeader.tsx`: kilit kaldırılır. `admin/login/page.tsx`: PIN sekmesi ve "1453" ipucu silinir, Google varsayılan; şifre sekmesi V5'te `email` sağlayıcılı admin yoksa kaldırılır; `redirect` parametresi sadece `/` ile başlayan (`//` değil) yollar. `admin/ayarlar/page.tsx`: güvenlik bölümü silinir. `api/admin/settings/route.ts`: GET sadece `operational`, POST zod ile. `package.json`: `jose` kaldırılır.
3. **Roller** — `src/app/auth/callback/route.ts`: profil upsert'i `role` içermez, `ignoreDuplicates: true`. `src/app/api/auth/register/route.ts` silinir; `AuthModal.tsx`'ten kayıt/şifremi unuttum sekmeleri, `useCustomerAuth.ts`'ten `signUpWithEmail`/`resetPassword`, `AuthProvider.tsx` tipleri. `supabase/schema.sql` içindeki `handle_new_user` 013'teki güvenli sürümle güncellenir (referans dosya açığı geri getirmesin).
4. **Sahipsiz uç noktaları sil** (çağıranı yok): `src/app/api/auth/google-sync/`, `src/app/api/orders/my/`, `src/app/api/journal/`.
5. **Sipariş uçları** (`src/app/api/orders/`):
   - `create/route.ts`: şemadan `userId`, `cariId`, `cari_id`, `"cari"` çıkar; `p_user_id` çerez oturumundan; cevaptan `cari_id` çıkar. `src/lib/order/createOrder.ts` ve `CheckoutActions.tsx` `userId` göndermez.
   - `[id]/route.ts`: id regex ile doğrulanır (`ORD-…`, `SIP-YYMM-NNN`, UUID); `.or()` yerine `.eq()`; maskeli görünümden `courier` bloğu tamamen çıkar.
   - `[id]/cancel/route.ts`: misafir tam olarak son 4 hane gönderir; IP+sipariş başına 5/10 dk sınır; `body.userId` yok sayılır (sahiplik çerezden); `cari_id`'li siparişler herkese açık yoldan iptal edilemez; `.eq("status", current)` + 0 satırda 409.
   - `src/app/api/slip/[id]/route.ts`: id bir siparişse admin şart; IP sınırı.
6. **Diğer:** `next.config.ts:27` → `geolocation=(self)`; `git rm --cached .env` + `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `LINK_SIGNING_SECRET`); `RUN_ALL_002_TO_010.sql` ve `UPDATE_CREATE_ORDER_ATOMIC.sql` → `supabase/migrations/_archive/` + "ÇALIŞTIRMAYIN" README.
7. **Yeni:** `supabase/migrations/013_security_hardening.sql`, `supabase/tests/013_verify.sql`.

**013 taslağı** (V-sorgu çıktısına göre uyarlanır; uygulama yayınlandıktan SONRA çalıştırılır, çünkü eski kod `security_settings` satırı yoksa PIN'i "1453" kabul ediyor; §4 acil SQL'in yaptıklarıyla çakışmaz, idempotenttir):
```sql
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_migrations FROM anon, authenticated;

-- Profil tetikleyicisi: e-postaya göre rol yok, çakışmada rol asla değişmez
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles AS p (id, email, full_name, phone, avatar_url)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(p.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, p.avatar_url),
    updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user(%): %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

-- SECURITY DEFINER / hassas fonksiyonlar (tüm overload'lar; is_admin hariç, RLS ona muhtaç)
DO $$ DECLARE r record; v_sig text; BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname <> 'is_admin'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND (p.prosecdef OR p.proname IN ('create_order_atomic','record_cari_transaction_atomic',
           'adjust_cari_balance','check_rate_limit','generate_slip_number','generate_order_number',
           'cleanup_expired_customer_locations','handle_new_user','check_order_status_progression'))
  LOOP
    v_sig := format('%I.%I(%s)', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    IF r.proname <> 'handle_new_user' THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_sig);
    END IF;
  END LOOP;
END $$;
DO $$ BEGIN   -- admin tarayıcısı Faz 3'e kadar kullanıyor
  IF to_regprocedure('public.generate_order_number()') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;
  END IF;
END $$;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() STABLE;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Profil: rol kendi kendine değiştirilemez
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;

-- Siparişler: müşteri tarafı istemci yazımı yok (sipariş API'si service-role ile yazar)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "customers_create_orders" ON public.orders;
DROP POLICY IF EXISTS "customers_cancel_own_pending" ON public.orders;
DROP POLICY IF EXISTS "Users read their own orders or admins read all" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "customers_insert_own_items" ON public.order_items;
DROP POLICY IF EXISTS "Users read their own order items or admins read all" ON public.order_items;
DROP POLICY IF EXISTS "customers_view_own_orders" ON public.orders;
CREATE POLICY "customers_view_own_orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admin_full_access_orders" ON public.orders;
CREATE POLICY "admin_full_access_orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "customers_view_own_items" ON public.order_items;
CREATE POLICY "customers_view_own_items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "admin_full_items" ON public.order_items;
CREATE POLICY "admin_full_items" ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Ayarlar: herkese açık okuma yok (tüm okuyucular service-role); PIN/cihaz kayıtları silinir
DROP POLICY IF EXISTS "Public read bakery settings" ON public.bakery_settings;
DELETE FROM public.bakery_settings WHERE key IN ('security_settings','trusted_devices');

INSERT INTO public.app_migrations (id) VALUES ('013_security_hardening') ON CONFLICT DO NOTHING;
COMMIT;
```

**V-sorguları** (`013_verify.sql`; öncesi ve sonrası çalıştırılır): V1 fonksiyon yetkileri (`has_function_privilege` anon/authenticated, `proconfig`); V2 tüm `pg_policies`; V3 RLS'i kapalı tablolar (boş olmalı); V4 `profiles` tablo/sütun yetkileri; V5 admin/superadmin profilleri + `auth.users` sağlayıcısı (Tahsin superadmin olmalı; değilse yayından önce `UPDATE public.profiles SET role='superadmin' WHERE lower(email)='tahsinreyhan@gmail.com'`); V6 `auth.users` tetikleyicileri ve `bakery_settings` anahtarları; V7 `record_cari_transaction_atomic`, `adjust_cari_balance`, `generate_slip_number` prod'da var mı (4 Eki: `record_cari_transaction_atomic` **yok**); V8 `is_admin()`/`auth.*` dışında fonksiyon çağıran politikalar (varsa 013'ü uyarla). Saldırı simülasyonu sorguları (BEGIN…ROLLBACK) gerekirse yerel oturumda üretilir, repoya yazılmaz.

**Yayın sırası (Tahsin):**
1. Vercel'de **Production Branch**'i kontrol et (Settings → Git). `main` değilse: `main` önizlemesini gözden geçirip production'ı `main`'e çevir (ya da Faz 0 commit'i mevcut production dalına da alınır). Env'ler var mı: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `GEMINI_API_KEY`.
2. Supabase → Authentication → URL Configuration: Site URL `https://ekmeklab.tr`; Redirect URL'lere canlı ve önizleme `/auth/callback` adresleri.
3. PR'ı birleştir → canlıda Google ile admin girişi + veriler görünüyor mu.
4. 013: kuru deneme (ROLLBACK) → gerçek → V-sorguları tekrar.
5. `JWT_SECRET` artık kullanılmıyor → Vercel'den silinebilir.
6. Kurcalanma kontrolü: ayarlar, ürün fiyatları/aktiflik, iki şarküterinin bakiyesi (kendi kayıtlarınla), admin listesi; GitHub → Security → secret scanning uyarıları. Firebase'i henüz kapatma (4 ürün görseli Faz 4'e kadar orada).

**Doğrulama:** `npm run build` + `npx tsc --noEmit`; `rg -n "1453|admin_session|SUPER_ADMIN_EMAILS|quickPin|google-sync|from \"jose\"" src` boş; canlıda gizli pencerede `/api/admin/settings` → 401, Google admin girişi çalışır, nakit test siparişi oluşur ve "Hepsi" filtresinde görünür, `/api/slip/<ORD id>` → 401, takip görünümünde kurye bloğu yok.

### Faz 0.5 — CI (ayrı küçük PR)
`.github/workflows/ci.yml` baştan: PR + `main` push'ta Node 22 → `npm ci` → `npx tsc --noEmit` → `npm test --if-present` → `npm run build` (Supabase env'siz, `NEXT_TELEMETRY_DISABLED=1`). `package.json`'a `typecheck` ve `test` script'leri (Next 16'da `next lint` yok).

### Faz 1 — Sipariş çekirdeği onarımı
**Amaç:** web siparişleri operasyonda görünür; her yerde tek İstanbul saati; WhatsApp siparişi gerçek kayıt; ayarlar vitrini ve API'yi gerçekten yönetir; misafir takibi çalışır; fırıncıya bildirim gider.

1. **İstanbul saati:** `src/lib/time/istanbul.ts` (`istanbulToday`, `addDays`, `istanbulWeekday`, `formatTrDate`; `getTodayDateStringTurkey`/`isPastCutoff` `src/lib/settings/cutoff.ts`'ten buraya taşınır). Tüm `toISOString().split("T")[0]` kullanımları değişir: `useAdminOrders.ts:131-135,408,456-461`, `useProduction.ts:51-56,79`, `admin/page.tsx:30`, `kurye/page.tsx:35`, `uretim/page.tsx:59`, `siparisler/yeni/page.tsx:58-64`, `OrderSlipModal.tsx:98`, `CartDrawer.tsx`.
2. **Ayarlar:** `src/lib/settings/schema.ts` (zod, mevcut `operational_settings` JSON'u + yeni anahtarlar) ve `src/lib/settings/server.ts` (`getStoreSettings()`, service-role, varsayılanlar, eski `order_cutoff_time` anahtarını da okur). Anahtarlar: `shippingFee`, `freeShippingThreshold`, `minBasketAmount`, `deliveryWindow`, `whatsappPhone` (varsayılan `905010126653`), `orderAcceptanceOpen`, `announcementText`, `orderCutoffTime`, `neighborhoods` (10 Beylikdüzü mahallesi), `openWeekdays`, `closedDates`, `maxDaysAhead` (7), `dailyBreadCapacity`, `wholesaleDailyLoaves`. Tipler `src/types/settings.ts`. `/api/settings` herkese açık alt kümeyi döner; admin ayarlar sayfası yeni alanları yönetir.
3. **Teslim tarihleri:** `src/lib/ordering/dates.ts` (`computeDeliveryDates`: cutoff, açık günler, kapalı tarihler, `maxDaysAhead`) + `GET /api/availability`.
4. **Sepet** (`CartDrawer.tsx`, `CheckoutActions.tsx`, `MobileCartBar.tsx`, `src/lib/store/useCartStore.ts` — `main` sürümleri): tarih çipleri API'den (`YYYY-MM-DD`); ücret/eşik/min sepet ayarlardan (sabit 1000/150 kalkar: `useCartStore.ts:195-200`, `MobileCartBar`, `ProductCatalog` bandı); min sepet ilerleme çubuğu ödemeyi kilitler; mahalleler ayardan; GPS butonu `customerLat/Lng` + onay zamanı (Nominatim ve adrese koordinat yazma kalkar); zustand persist `version: 2` + eski tarih değerlerini temizleyen `migrate`; ödeme denemesi başına tek idempotency anahtarı.
5. **WhatsApp siparişi:** önce gerçek sipariş (`payment_method='whatsapp'`, `status='bekliyor'`), başarı penceresinde "Siparişi WhatsApp'tan onayla" `<a>` linki (iOS popup engeline takılmaz). `onay_bekliyor` durumu eklenmez; koddaki 12 kullanımı kaldırılır.
6. **`/api/orders/create` kontrol sırası:** sipariş kabul açık mı → mahalle izinli mi → teslim yöntemi courier → tarih `computeDeliveryDates` içinde mi → ara toplam ≥ min sepet → ücret/eşik ayardan → onay kutusu işaretli → RPC; RPC hataları Türkçe mesajlı 409; ardından `after()` ile Telegram.
7. **Telegram:** `src/lib/notify/telegram.ts` (3 sn zaman aşımı, hata siparişi asla bozmaz, Sentry'ye yazar). Mesaj: sipariş no, tarih, mahalle, ürünler, tutar, ödeme, admin linki — **ad/telefon/adres yok** (KVKK). Önizlemede `[TEST]` öneki. Tahsin: BotFather ile bot açar, token + chat id'yi Vercel env'e girer (yerel oturum adım adım yardım eder).
8. **Takip:** `src/types/tracking.ts`; API snake_case→camelCase dönüştürür (zaman çizelgesi ve "0 ₺" düzelir); `normalizeOrderStatus` vb. `src/lib/orders/normalize.ts`'e. `siparis-takip/[id]/page.tsx` sade yeniden yazılır: maskeli görünüm + "telefonunun son 4 hanesi" formu, iptal çalışır, son durum değilken 60 sn'de bir yenileme; istemci `.or()` sorgusu, kurye haritası/yayını ve müşteri konum paylaşımı kalkar (`useCustomerLocation.ts`, `LocationConsentModal.tsx` silinir).
9. **Başarı penceresi:** `SIP-…` no, tarih + saat aralığı, ödeme, takip linki, WhatsApp butonu.
10. **Sabitler:** `src/lib/site.ts` (`SITE_URL` = `NEXT_PUBLIC_SITE_URL` = `https://ekmeklab.tr`, iletişim bilgileri); sabit numara/domainlerin hepsi buradan (`grep wa.me|905|ekmeklab\.(com|tr)`). `src/app/manifest.ts` müşteri manifesti (`start_url "/"`); admin manifesti `public/admin.webmanifest` (admin layout sunucu+istemci olarak ayrılır, `robots: noindex`); `public/manifest.json` silinir. Fontlar `subsets: ["latin","latin-ext"]`.
11. **Yasal minimum:** ödemede zorunlu onay kutusu (mesafeli satış + KVKK; `terms_accepted_at`, `terms_version` kaydedilir); online kart/BDDK iddiaları kaldırılır (`gizlilik/page.tsx:67`, `mesafeli-satis/page.tsx:85`).
12. **Testler:** vitest (`istanbul.ts`, `dates.ts`, ayar şeması).
13. **Misafir siparişini hesaba bağlama + cihaz hafızası:** `/api/orders/create` cevabına imzalı `trackingToken` (HMAC, `LINK_SIGNING_SECRET`, sipariş id'sine bağlı) eklenir; takip linki `/siparis-takip/<no>?t=<token>` token varsa tam görünüm verir (son 4 hane formu yedek yol). Sipariş no + token tarayıcıda saklanır → "Siparişlerim" giriş yapmadan o cihazdaki siparişleri listeler. Başarı penceresinde "Siparişini hesabına kaydet" (Google / e-posta kodu); giriş sonrası `POST /api/orders/claim` cihazdaki token'larla `user_id` boş siparişleri hesaba bağlar (token şart; telefona göre bağlama YOK — doğrulanmamış telefon başkasının siparişini açar). Giriş yapmış müşteri sepette ad/telefon/adresi profilden doldurur, yeni adresi kaydedebilir.

**Uygulama notları (4 Eki):** takip token'ı `LINK_SIGNING_SECRET` yoksa service-role anahtarından türetilir (ek env gerekmez); müşteri konumu yalnızca siparişe yazılır (`customer_locations` artık kullanılmıyor, tablo silinmedi); misafir "Siparişlerim" sayfası `/siparislerim` (giriş gerektirmez); sabit kimlikli çapraz satış butonları kaldırıldı (Faz 2'de `cross_sell` ile gelir); admin ayarlar sayfası tüm yeni alanları yönetir ve canlı tarih önizlemesi gösterir.

**014 (uygulama yayınlandıktan SONRA; uygulama artık ISO tarih gönderiyor olmalı):** dosya `supabase/migrations/014_order_core.sql`, duman testi `supabase/tests/014_smoke.sql`. 4 Eki canlı ön kontrol: 4 sipariş (2 `today`, 2 `tomorrow`), yinelenen idempotency anahtarı yok, `delivery_date`'e bağlı görünüm yok.
```sql
-- ön kontrol (ayrı): SELECT delivery_date, count(*) FROM public.orders GROUP BY 1 ORDER BY 2 DESC;
ALTER TABLE public.orders ALTER COLUMN delivery_date DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN delivery_date TYPE date USING (
  CASE
    WHEN delivery_date ~ '^\d{4}-\d{2}-\d{2}$'        THEN delivery_date::date
    WHEN delivery_date ~ '^custom:\d{4}-\d{2}-\d{2}$' THEN substr(delivery_date, 8)::date
    WHEN delivery_date = 'tomorrow' THEN (created_at AT TIME ZONE 'Europe/Istanbul')::date + 1
    ELSE (created_at AT TIME ZONE 'Europe/Istanbul')::date
  END);
ALTER TABLE public.orders ALTER COLUMN delivery_date SET NOT NULL;
```
Ayrıca: yinelenen `idempotency_key`'leri boşalt + kısmi unique index; `order_items(order_id)`, `order_items(product_id)` indeksleri; `terms_accepted_at`, `terms_version` sütunları; `create_order_atomic` v3 (aynı imza `(jsonb,jsonb,uuid)`): ISO tarih zorunlu, idempotency (aynı anahtar → mevcut siparişi döner), başlangıç durumu sadece `bekliyor/hazirlaniyor`, **oluşturmada `payments` satırı yok** (ödeme tahsil edilince yazılır), cari bloğu admin yolu için kalır, `SET search_path` + REVOKE/GRANT; sonda tip öz-kontrolü.

**Doğrulama:** vitest uç durumları (İstanbul 11:59/12:00 cutoff; UTC 21:00-24:00 gün kayması); build; 014 ön kontrol → kuru deneme → gerçek → `014_smoke.sql`; önizlemede Tahsin'in telefonundan: nakit/POS/WhatsApp birer sipariş, admin'de cutoff değişince en erken tarih kayar, min sepet ödemeyi kilitler, sahte mahalle (curl) reddedilir, sipariş admin "Bugün"de görünür, Telegram gelir, misafir takibi ve iptal çalışır.

### Faz 2 — Esnek ürün ve satış yönetimi (4 Eki'de yeniden tasarlandı)
**Karar (Tahsin, 4 Eki):** kapasite ve özel reçete günleri henüz belli değil (siparişe göre üretim); ürün grupları, paketler ve kampanyalar zamanla Tahsin tarafından admin'den belirlenecek; sadece eşlikçiden oluşan siparişe izin var; test canlıda (TEST önekli kayıtlar). Bu yüzden sabit "fırın günü" yapısı yerine **her şey admin'den yönetilen esnek kurallar**:

**Model (015, uygulamadan ÖNCE — eklemeli, eski kod etkilenmez):**
- `products` yeni sütunlar: `compare_at_price` (kampanya: üstü çizili eski fiyat), `availability` (`daily` | `dates`), `daily_limit` (ürün başına günlük adet sınırı, ops.), `lead_time_days` (en az kaç gün önceden), `capacity_units` (günlük ekmek kapasitesinden kaç birim düşer: ekmek 1, eşlikçi 0, paket = içindeki ekmek), `bundle_items` (paket içeriği `[{product_id, quantity}]`), `cross_sell` (birlikte iyi gider). Mevcut ürünler: `gurme` kategorisi `capacity_units = 0`, diğerleri 1.
- `product_sale_dates(product_id, sale_date, quantity_limit)` — `availability = 'dates'` ürünlerin satıldığı günler (özel reçete istenen gün açılır).
- `capacity_days(day, bread_capacity, note)` — belirli bir gün için ekmek kapasitesi (ayardaki `dailyBreadCapacity` varsayılanı ezer; ikisi de boşsa sınırsız).
- `categories` admin'den yönetilir (`is_visible` eklenir); ürün kategorisi serbest.
- `order_items.capacity_units`, `order_items.components` anlık kopya (paket açılımı üretim toplamında kullanılır).
- `create_order_atomic` v4 (aynı imza): `pg_advisory_xact_lock` (tarih başına) altında SUM ile kontrol — ürün aktif/uygun, `dates` ürünü o tarihte satışta mı, hazırlık süresi, ürün limiti (`quantity_limit` / `daily_limit`), günlük ekmek kapasitesi. Hata kodları: `PRODUCT_UNAVAILABLE`, `NOT_ON_SALE_THIS_DAY`, `LEAD_TIME_NOT_MET`, `PRODUCT_LIMIT_REACHED`, `DAILY_CAPACITY_FULL`. İptaller kapasiteyi kendiliğinden boşaltır. Admin yolu için `bypass_limits`.

**Uygulama:** `src/lib/ordering/availability.ts` (saf, testli) + sunucu yükleyici; `POST /api/availability` sepet içeriğine göre tarih listesi (neden açıklamalı) — sepetin ve `/api/orders/create`'in tek doğruluk kaynağı. Sunucu tarafı katalog yükleyici (statik katalog yedeği ve `stock || 25` hileleri kalkar). Vitrin: kategori sekmeleri veritabanından; ürün kartı rozetleri ("Kampanya", "Paket", "Sadece Cmt 12 Eki", "Tükendi"); sepet çapraz satışı `cross_sell`'den. Admin Ürünler sayfası baştan: tüm alanlar, satış günleri takvimi, paket içeriği, kampanya fiyatı, birlikte iyi gider, kategori yönetimi, silme = arşiv, slug Türkçe ve tekil (mevcut slug değişmez). Üretim sayfası baştan: tarih seç → ürün bazında toplam (paketler açılır) + toptan adet + kapasite doluluğu + gün için kapasite belirleme; yazdırılabilir; parti aşamaları kalkar.

**Sıra:** 015 → uygulama. **Doğrulama:** vitest (kesişim, hazırlık süresi, satış günleri, kapasite, paket açılımı); `015_smoke.sql`; canlıda TEST siparişiyle uçtan uca.
**Ertelenen:** kupon kodu, sayısal stok, ürün görseli yükleme (Faz 4).

### Faz 3 — Admin sadeleştirme + finans doğruluğu
**3a iki PR:** 3a-1 = menü + silmeler + kurye bayrağı; 3a-2 = Teslimat ekranı + "Bugün" paneli. "Fırın Günleri" menüsü yok: Faz 2 kararıyla sabit fırın günü yerine esnek kapasite geldi ve o Üretim ekranında ayarlanıyor. `musteriler/[id]` silindi (hiçbir yerden bağlantı yoktu; liste satırı detayı zaten açıyor).

**3a (navigasyon):** menü = Bugün · Siparişler · Teslimat · Üretim · Ürünler · Cariler · Müşteriler · Kütüphane · Ayarlar (`AdminSidebar.tsx:47-103`, `MobileBottomNav.tsx:16-36` + ikincil linkler: `admin/page.tsx:88,346`, `siparisler/page.tsx:102`, `kurye/page.tsx:540`, dagitim bileşenleri). **Sil:** `src/app/api/admin/orders/parse/`, `src/components/admin/WhatsAppOrderParserModal.tsx` (+ `siparisler/yeni` içindeki kullanımı), `@google/genai` paketi ve `GEMINI_API_KEY` (env örneği + Vercel), `src/app/admin/finans/**`, `src/app/admin/tedarikciler/**`, `useFinans.ts`, `useSuppliers.ts`, `CourierSettlementModal.tsx`, `src/components/admin/dagitim/*` (önce `getMapUrls` + `BEYLIKDUZU_ROUTE_ORDER` → `src/lib/delivery/maps.ts`); `siparisler/dagitim` → `/kurye` yönlendirmesi. **Kurye yönetimi:** `src/lib/features.ts` bayrağı (kapalı) → `notFound()`; sipariş detayındaki kurye seçimi bayrağa bağlı. **Teslimat ekranı:** `/kurye` yeniden yazılır (tarih seçici, rota sırası + elle sıralama, ara/WhatsApp/navigasyon, etiket yazdır; mevcut `CourierActiveStopCard`, `CourierQueueList` kullanılır; GPS izleme/yayını ve gün sonu raporu kalkar). **"Bugün" paneli:** bugün/yarın teslimatlar, bekleyen siparişler (WhatsApp olanlar işaretli), ürün bazında ekmek toplamları (+ toptan), sıradaki fırın gününün doluluğu, tahsil edilecek nakit/POS, hızlı işlemler. `musteriler/[id]` listeye bağlanır ya da silinir.

**3b (finans — Tahsin önce iki şarküterinin gerçek bakiyesini teyit eder):**
- **016:** `account_transactions` türleri kanonik (`satis`, `tahsilat`, `devir`, `storno`); `delta` sütunu; eski `debt/credit` dönüşümü; geçiş mutabakatı (bakiye = SUM(delta) olacak şekilde tek devir satırı); `adjust_cari_balance` kaldırılır; tek atomik `record_cari_transaction_atomic` **oluşturulur** (canlıda hiç yok; hesabı kilitler, `FİŞ-YYMM-NNN` numarası kilit altında, storno desteği, service-role).
- **017:** defter RPC sağlamlaştırma (PR #8 incelemesi).
- **018:** `cancel_order_atomic` (cari borcunu storno ile geri alır), `mark_order_delivered` (idempotent — offline tekrarlar için; nakit/POS tek ödeme satırı; "ödenmedi" beklemede kalır), `generate_order_number` authenticated'dan geri alınır.
- **Uygulama:** tüm cari yazımları `/api/admin/cari/transactions` üzerinden — **fiş kes (`B2BSlipModal`) = kalem listeli `satis`** (şarküteri teslimatlarının ana yolu), tahsilat, düzeltme = storno + yeni kayıt, bakiye düzeltme = işaretli devir; `/api/admin/finans/transaction` silinir; manuel sipariş sunucu rotasına taşınır (`/api/admin/orders`, istemci insert ve `Math.random` yok); kurye teslim penceresi Nakit / POS / Ödenmedi (cari siparişte tek "Cariye işlendi"); cari silme = arşiv (bakiye 0 ise); gerçek geçmişi olmayan deneme carisi (tüm hareketleri iptal edilmiş) kalıcı silinebilir — Tahsin'in isteği, 4 Eki 2026; `/ekstre/[id]` ve `/fis/[id]` imzalı link (`LINK_SIGNING_SECRET`, `src/lib/security/linkToken.ts`) ile sunucudan okunur, ekstre tür eşlemesi düzelir. Tahsin iki şarküteriye yeni ekstre linkini gönderir.

**3b iki PR'a bölündü:** 3b-1 = 016 + defter API'si + cari ekranları + imzalı ekstre/fiş linkleri (kurye nakit/POS tahsilatı da API'ye bağlandı; "cariye yaz" artık yanlışlıkla tahsilat yazmıyor). 3b-2 = 018 + manuel sipariş sunucu rotası + kurye teslim penceresi. **Not:** 015'teki `create_order_atomic` cari dalı eski `debt` türüyle yazar ve 016 sonrası CHECK'e takılır; bugün hiçbir çağıran `cari_id` göndermiyor, 018 bu dalı teslimata taşıyarak yeniden tanımlar.

**Doğrulama:** `bakiye ≠ SUM(delta)` sorgusu boş; `016_smoke.sql`, `017_smoke.sql`, `018_smoke.sql` (iptal → storno ve bakiye geri; nakit teslim → tek ödeme satırı); önizlemede imzalı link çalışır, imzasız 404.

### Faz 4 — Marka ve içerik
- **Görseller:** 019 Supabase Storage `media` bucket + admin-only yazma politikaları; ürün sayfasında yükleme (tarayıcıda WebP'ye küçült); 4 Firebase görseli → `public/images/products/` karşılıkları (SQL); Unsplash ve yapay zekâ atölye görselleri → **Tahsin'in gerçek fotoğrafları**; `next.config.ts` remotePatterns güncellenir.
- **Slug:** `slugify` (Türkçe harf çevirimi), benzersizlik, mevcut slug otomatik değişmez; bozuk slug'lar için tek seferlik UPDATE listesi.
- **Kütüphane:** 020 `journal_articles` v2 (`body_md`, `subtitle`, `published_at`, `citations`, `related_product_ids`…); tek editör admin içinde (`/api/admin/journal` + `requireAdmin`); `/kutuphane` sunucuda render (react-markdown + remark-gfm); `/kutuphane/yonetim` ve localStorage kalkar; mevcut 2 makale aktarılır.
- **Tasarım:** 2-3 ana sayfa yönü görsel taslak olarak sunulur (`public/design-preview/` denemeleri ve `main`'deki son tasarım çalışması temel; logo ile uyumlu "Atölye Kremi" önerilir), Tahsin seçer, uygulanır (en fazla 2 font ailesi, gerçek fotoğraf, logo korunur); sahte metinler (uydurma A.Ş. adı, placeholder numara, doğrulanmamış iddialar) temizlenir.
- **SEO/yasal:** gerçek bilgilerle JSON-LD (ev adresi yerine semt, `areaServed`, `sameAs`), ürün `availability` (InStock / PreOrder / OutOfStock); mesafeli satış, KVKK, gizlilik satıcı kimliğiyle yeniden yazılır (veri işleyenler: Supabase, Vercel, Telegram); hukuki kontrol önerilir.

### Faz 5 — Temizlik ve araçlar
- **Sil:** `local_llm_bridge/`, `playwright-report/`, `test-results/`, `.idea/`, `.vscode/`, `.firebase/`, `firebase.json`, `.firebaserc`, `storage.rules`, `cors.json`, `setup-cors.ps1`, `firebase-debug.log`, kökteki `settings.json`, `instructions.md`, eski script'ler (**`scripts/verify_after_migration.mjs` canlıya gerçek sipariş atıyor**), ölü kod (`src/lib/firebase/*`, `src/lib/auth/serverAuth.ts`, `src/components/admin/cariler/` altındaki 6 kullanılmayan modal, `src/hooks/index.ts`, `useModalScrollLock.ts`, `src/lib/utils/orderNumber.ts`, `src/types/order.ts`), `firebase`/`firebase-admin`/`dotenv` paketleri; `.gitignore` eklemeleri (`node_modules/`, `*.log`, `playwright-report/`, `test-results/`, `__pycache__/`, `.firebase/`).
- **Dokümanlar:** eskiler `docs/arsiv/`'e (bu dosya ve `DESIGN_SYSTEM.md` hariç); yeni README (kurulum, env, migration süreci, yayın, Tahsin'in runbook'ları); `AGENTS.md` güncellenir (Firebase ve `cari_hareketler` çıkar; "cari silmeden önce hareketleri sil" → storno/arşiv; yeni kurallar: fonksiyonlarda `search_path` + açık GRANT, İstanbul saati yardımcısı, rotalarda `requireAdmin`, bildirimler `after()` ile).
- **Migration baseline:** Tahsin'in makinesinde `supabase db dump` ile prod şeması `supabase/baseline/`'a; eski dosyalar `_archive/`'e; yeni migration'lar 020'den devam.
- **Sentry:** `src/instrumentation-client.ts` (`tracesSampleRate: 0.1`, Replay yok), `sentry.client.config.ts` silinir.
- **Proxy:** `src/middleware.ts` → `src/proxy.ts` (`export function proxy`); matcher sadece `/admin`, `/kurye`, `/hesabim`, `/api/admin` (vitrin her istekte oturum sorgusu yapmaz).

---

## 7. Migration sırası
| No | Faz | İçerik | Uygulamaya göre |
|---|---|---|---|
| 013 | 0 | fonksiyon yetkileri, search_path, profil sütun yetkileri, sipariş politikaları, ayarlar, güvenli profil tetikleyicisi, `app_migrations` | SONRA |
| 014 | 1 | `delivery_date` → DATE, idempotency index, onay sütunları, RPC v3 | SONRA |
| 015 | 2 | ürün alanları, satış günleri, gün kapasitesi, kategoriler, RPC v4 | ÖNCE |
| 016 | 3 | cari defter normalizasyonu, `delta`, mutabakat, kanonik defter RPC, tarayıcı yazma yetkisi kapanır | ÖNCE (merge'ten hemen önce; arada eski ekranlardan cari yazılamaz) |
| 017 | 3 | defter RPC sağlamlaştırma: kuruş yuvarlama, 999+ fiş sırası, kilit altında hedef bakiye (PR #8 incelemesi) | ÖNCE (yeni parametreyi kod kullanır) |
| 018 | 3 | `mark_order_delivered`, `cancel_order_atomic`, `create_order_atomic` v5 (cari borcu teslimde), `generate_order_number` tarayıcıdan geri alınır | ÖNCE (yeni rotalar bu fonksiyonları çağırır) |
| 019 | 4 | `media` bucket + politikalar | yükleme arayüzünden ÖNCE |
| 020 | 4 | `journal_articles` v2 | editörden ÖNCE |

## 8. Açık kararlar (ilgili fazın başında sorulacak)
- **Faz 1 — ✅ karar verildi (Tahsin, 4 Eki):** hepsi admin ayarlarından sonradan değiştirilebilir olmalı (teslimatlar henüz başlamadı). Varsayılanlar: minimum sepet **yok** (`minBasketAmount=0`), ücretsiz teslimat eşiği **1000 ₺**, altında teslimat ücreti (varsayılan 150 ₺), teslimat aralığı 14:00–18:00 (değişebilir), açık günler **her gün** (haftanın günleri + kapalı tarihler ayardan kapatılabilir), ileriye sipariş **7 gün**. Müşteri e-posta kodu girişi (SMTP / Gmail uygulama şifresi) **ertelendi**: misafir takip linki + cihaz hafızası + Google girişi yeterli; ihtiyaç doğunca Tahsin ile birlikte kurulur.
- **Faz 2:** günlük perakende ekmek kapasitesi ve günlük toptan adet; fırın günleri (hangi günler) ve varsayılan son sipariş saati (öneri: bir önceki gün 20:00); hangi ürün günlük / fırın günü / eşlikçi; sadece eşlikçiden oluşan siparişe izin (öneri: min sepet tutarsa evet); ayrı staging Supabase projesi (öneri: evet).
- **Faz 4:** tasarım yönü; gerçek fotoğraflar; satıcı yasal kimliği (mesafeli satış sözleşmesi için).
- **Plan bitince (Tahsin, 4 Eki) — adres doğruluğu ve uydurma sipariş:** bugün adres serbest metin, telefon doğrulanmıyor, konum paylaşımı çalışmıyor; tek gerçek koruma "bekliyor" onayı + IP/telefon hız sınırı + hizmet verilen mahalle listesi. Konuşulacak seçenekler: (1) konum özelliğini onarıp haritada iğne zorunlu, (2) yapılandırılmış adres (sokak/cadde, bina no, daire/kat, tarif), (3) ilk siparişte WhatsApp ile telefon doğrulama (kod ya da tek tık onay linki), (4) ilk sipariş yalnız kapıda ödeme, (5) aynı telefon/adresten çok sayıda iptal edilen siparişte otomatik engel. Önce konum hatası incelenir (neden çalışmıyor).
- **Yayından önce (Tahsin, kod dışı):** gıda üretim kaydı/izni ve vergi durumu — İlçe Tarım Müdürlüğü ve bir mali müşavirle görüşme.

## 9. Next.js 16 ve ortam notları (yürütücü için)
- `middleware` → `proxy.ts` (Node.js runtime, `export function proxy`); `after()` kararlı (bildirimler için); `revalidateTag` ikinci argüman ister; `next lint` yok; async `params`/`cookies()`; kod klasik `revalidate`/`dynamic` kullanıyor — `cacheComponents`/`"use cache"` açma.
- Lockfile TypeScript 7.0.2: Next 16'nın TS CLI yolu sayesinde build büyük ihtimalle çalışır; ilk `npm run build` bunu doğrular.
- Supabase istemci fabrikaları env yoksa `null` döner: her zaman null kontrolü. Tarayıcı Supabase istemcisi `https://` olmayan URL'yi reddeder.
- AGENTS.md kuralları geçerli: `any` yok, tipler `src/types/`, realtime kanalları unmount'ta kapatılır, CSV = BOM + `;`, RPC hatasında 500/409 ile açık hata (sessiz yedek yol yok), numaralı migration.
