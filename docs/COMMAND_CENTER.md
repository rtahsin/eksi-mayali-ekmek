# EkmekLab Ana Komuta Merkezi (`COMMAND_CENTER.md`)

> **Son Güncelleme:** 2026-11-18  
> **Aktif Çalışma Paketi:** CEO Operasyon Kokpiti, 033 Sertleştirme, CFO Merkezi, 3D Vitrin, **Temiz Mimari Faz Pilotları (`ADR-0009`, `finance` `R6`, `delivery/settlement.ts`, `cari/ledger` `R7`) ve 6 Dal Ajan Mimarisi (`docs/DALLAR.md`)** ✅ Tamamlandı  
> **Doğrulama Kapısı:** `npm run typecheck` · `npm test` (92 dosya / 607 test) · `npm run build` (163 rota)  
> **Kanonik Kök Belgeler:** [`MERKEZ.md`](../MERKEZ.md) · [`AGENTS.md`](../AGENTS.md) · [`docs/MIMARI.md`](MIMARI.md) · [`docs/DALLAR.md`](DALLAR.md)

---

## 1. Kilitli Kurucu Kararları (Tahsin Onaylı)

### Vitrin & Lansman İlkeleri (`M-05`)
- **0 ₺ Teslimat & 0 ₺ Minimum Sepet:** Beylikdüzü dağıtımında sepet alt limiti veya teslimat ücreti yok; komşu kümeleme esaslı serbest sipariş.
- **Ödeme & WhatsApp Köprüsü:** Yalnızca Kapıda Nakit / Kapıda Kart + `CartDrawer` içinde tek tık WhatsApp sepet gönderimi.
- **Şarküteri Kraft Etiketi:** Günlük şarküteri ekmekleri pencereli kraft kese kâğıdında QR (`ekmeklab.tr/?etiket=1`) etiketli.
- **K006 (Sıfır Sağlık Beyanı):** Hiçbir müşteri veya bilimsel metinde tıbbi/fizyolojik fayda vaadi yok.

### Kurumsal Admin, Kurye & B2B Kararları (`A1`–`A4`)
- **A1 (Rol & Dağıtım Netliği):** Ana saha rolü `courier` (ve opsiyonel `staff`). Kurye `/kurye` konsolunda `SIP-YYMM-XXX` / `FİŞ-YYMM-XXX`, müşteri adı, telefon, açık adres, not, harita/GPS pini, ürün kalemleri ve tahsilat tutarını net görür. `staff` yalnız operasyon görür (Z-Özeti, cariler, fiyat/ayarlar kapalı).
- **A2 (B2B Araçtan Sıcak Satış):** Şarküteri/kafe kapısında bırakılan ekmek & eşlikçi adetleri (varsa fire/iade düşümü + kapıda nakit/kart tahsilat) anlaşmalı özel fiyatla (`custom_prices`) anında atomik Teslimat Fişi (`FİŞ-YYMM-XXX`) ve Sevk İrsaliyesi olarak kesilir.
- **A3 (Hibrit Zimmet & Kasa Mutabakatı):** Fırından kuryeye tekil/toplu zimmet + vardiyadaki kuryenin tezgahtan *"Üzerime Al"* çekmesi + gün sonu Nakit/POS/Cari kasa mutabakatı.
- **A4 (Açık Kurumsal Tema):** Tüm `/admin/**` ve `/kurye` ekranları yalnız Açık Kurumsal "Atölye Kremi / Sıcak Taş" paletinde (`#F6EEDF`, `#FFFFFF`/`#FBF6EC`, `#E2D3BD`, `#3B1E1A`, `#6E5148`, `#B4532A`).

---

## 2. Kalıcı Uzman Dal Ajan Kadrosu (`.agents/agents/` · Rehber: [`docs/DALLAR.md`](DALLAR.md))

| Ajan Adı | Uzmanlık / Yazma Kapsamı | Önerilen Model |
| :--- | :--- | :--- |
| `dal-vitrin-sepet` | Vitrin, 3D/360° sahne, ürün/eşlikçi kartları, sepet, teslimat takvimi, `/api/orders/create` | `flash` / `pro` |
| `dal-firin-operasyon` | `/admin` kokpiti, sipariş yaşam döngüsü, `/admin/{uretim,urunler,musteriler,ayarlar,baski}`, S24 medya & `daySummary` | `flash` / `pro` |
| `dal-kurye-dagitim` | `/kurye`, `/admin/ekip`, `maps.ts`, `src/lib/delivery/settlement.ts`, esnek B2B teslimat | `flash` / `pro` |
| `dal-cari-finans` *(R6 & R7)* | `/admin/{cariler,finans}`, `/fis`, `/ekstre`, `src/lib/{cari,finance}/**`, sıcak satış & storno muhasebesi | `flash` / `pro` |
| `dal-bilim-medya` | `content/**`, `/bilim`, `/kavram`, `/kaynak`, `bilgi_sentezi_v2` FTS5, `K006`/`K011`, dergi/gazete/etiket, `48 kHz` ses & Remotion | `flash` / `pro` |
| `dal-cekirdek-guvenlik` | `src/lib/{kernel,security,supabase,auth,time,utils}`, `arch.test.ts`, `apiClient.ts`, `src/proxy.ts`, `src/types/**`, `supabase/migrations/**` (`034+`) | Her zaman `pro` |
| `studyo-dal-1..5` | `/admin/studyo/**`, `src/lib/studyo/**`, `arastirma/studyo/**` (Davar, Backend API, Remotion/Gazete, S24 Kokpit, Bulut PWA) | Tanımlı |
| `bas-elestirmen` | Salt okunur büyüme, birim ekonomi ve mimari denetçisi | `pro` |

---

## 3. Faz İlerleme Tablosu (Kurumsal Admin, B2B & Temiz Mimari Dönüşümü)

| Faz | Kapsam | Sorumlu Ajan | Durum |
| :--- | :--- | :--- | :--- |
| **Faz 0** | `COMMAND_CENTER.md`, `.agents/agents/` kalıcı kayıtları, `SKILL.md` güncellemesi | Orkestratör | ✅ Tamamlandı |
| **Faz 1–12** | `031`–`033` RBAC/B2B/RLS/FK, `/kurye` hibrit zimmet, sıcak satış, CEO kokpiti, `/admin/finans`, Sentry/Sheets, 3D/360° Vitrin | Eski Faz Uzmanları | ✅ Tamamlandı (Canlıda) |
| **Faz 13** | `ADR-0009`, Pilot 1a (`finance` `R6`), `delivery/settlement.ts` (4 kopya birleştirme), Pilot 2 (`cari/ledger` `R7`) | Komuta + Temiz Mimari | ✅ Tamamlandı |
| **Faz 14** | 6 Temiz Mimari Dalı (`.agents/agents/dal-*`), `glob` bağlam kalkanları (`.agents/rules/dal-*`) ve `docs/DALLAR.md` | Komuta Merkezi | ✅ Tamamlandı |

---

## 4. Canlı Durum & Kurucu (Tahsin) İçin Kalan Fiziksel Adımlar
- **Canlıda Uygulananlar (15–16 Kasım 2026 — Teknik Borç: 0):**
  - `031_enterprise_admin_rbac_b2b`, `032_zero_friction_dispatch_b2b_cockpit` (`ROLLBACK` kuru deneme + `COMMIT` + `supabase/tests/032_*` duman testi) ve `033_advisor_rls_and_fk_hardening` (`ROLLBACK` kuru deneme + `COMMIT` + `supabase/tests/033_*` duman testi) canlıya uygulandı; `public.app_migrations` üzerinde `013`–`033` (19 kayıt) eksiksiz (`missing = 0`) doğrulandı.
  - `public.bakery_settings` (`0 ₺` teslimat, `0 ₺` alt limit ve `"Beykent"` mahallesi) canlıda aktif; `Ofsüt` (`3680.00 ₺`) ve `Yerumda` (`17405.00 ₺`, toplam `21085.00 ₺`) cari bakiyeleri dokunulmadan doğrulandı.
  - Supabase Security & Performance Advisor üzerindeki `anon_security_definer_function_executable`, `rls_enabled_no_policy`, `unindexed_foreign_keys`, `auth_rls_initplan` ve `multiple_permissive_policies` uyarılarının tamamı kapatıldı.
  - Vercel `ekmeklab_app` (`production`, `preview`, `development`) ortamına **`NEXT_PUBLIC_SENTRY_DSN`** ve **`SENTRY_DSN`** tanımlandı (`ekmeklab-web` / `de.sentry.io` aktif). Mevcut paylaşılan cari/fiş linklerinin geçerliliğini korumak için `LINK_SIGNING_SECRET` bilinçli olarak değiştirilmeden `SUPABASE_SERVICE_ROLE_KEY` türetiminde bırakıldı.
  - Mevcut canlı fotoğraf dekupe taramasında `tas-firin-eksi-mayali-koy-ekmegi` temiz dekupe olarak çıktı (`border_touch_sides = 0`, `fg_ratio = 0.319`) ve `media` bucket'ına yüklenip `sample-ekmek-1` (`masterclass.showcase.cutoutUrl`) alanına canlı işlendi.
- **Fiziksel Lansman Odağı (`M-2`):** Teknik kurulum tamamen bitti; sıradaki tek kurucu adımı Samsung S24 ile 15–20 dakikalık çekimde ana ekmeklerin döner tabla 360° videoları + ortadan bıçak kesiti kareleri ve eşlikçi (3L Jersey süt, yoğurt, sucuk, yumurta, yufka, peynir, kavurma) fotoğraflarını çekip `/admin/urunler` üzerinden vitrine girmek.
- **Opsiyonel Platform Notu (`auth_leaked_password_protection`):** Management API üzerinden `password_hibp_enabled = true` denendi; Supabase bunu **Pro Plan ve üzeri** ile sınırladığı için Free planda kapalıdır (`HTTP 402 entitlement_required`). Girişler Google OAuth ile yapıldığından acil bir açık oluşturmaz; Pro plana geçilirse açılabilir.
