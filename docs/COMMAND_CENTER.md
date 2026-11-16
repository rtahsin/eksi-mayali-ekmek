# EkmekLab Ana Komuta Merkezi (`COMMAND_CENTER.md`)

> **Son Güncelleme:** 2026-11-16  
> **Aktif Çalışma Paketi:** CEO Operasyon Kokpiti, Sıfır-Sürtünmeli Kurye Dağıtımı, B2B Cari Mimarisi, 033 Sertleştirme, Komuta MCP/Sheets/Sentry & CFO Gider Merkezi (Faz 0 – Faz 11 ✅ Tamamlandı)  
> **Doğrulama Kapısı:** `npm run typecheck` · `npm test` · `npm run build` (Faz 0–11 sonrası son doğrulamadan geçirildi)  
> **Kanonik Kök Belgeler:** [`MERKEZ.md`](../MERKEZ.md) · [`AGENTS.md`](../AGENTS.md) · [`docs/MIMARI.md`](MIMARI.md)

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

## 2. Kalıcı Uzman Alt-Ajan Kadrosu (`.agents/agents/`)

| Ajan Adı | Uzmanlık / Yazma Kapsamı |
| :--- | :--- |
| `guvenlik-ve-rbac-mimari` | `supabase/migrations/031*`, `supabase/tests/031*`, `src/lib/security/**`, `src/proxy.ts`, güvenlik/KVKK API düzeltmeleri |
| `kurye-ve-b2b-uzmani` | `/admin/ekip`, `/kurye`, `/api/admin/team/**`, `/api/courier/**`, `/api/admin/cari/**` (Sıcak Satış & İrsaliye) |
| `admin-kurumsal-mimari` | Açık Kurumsal `/admin/**` kabuğu, onaylı şalter, sunucu sayfalamalı `/admin/musteriler`, senkronlu `/admin/uretim`, toplu siparişler |
| `cfo-ve-birim-ekonomi-mimari` | `/admin/finans`, `/api/admin/finance/**`, `src/lib/cari/finance.ts`, gider/tedarikçi storno muhasebesi ve Google Sheets Birim Ekonomi & P&L kokpiti |
| `bas-elestirmen` | Salt okunur büyüme, birim ekonomi ve mimari denetçisi |
| `ekmeklab-uzman-isci` | Genel sıralı full-stack görevler ve birim testleri |
| `vitrin-ux-mimari` | Baş Art Direktör & İnteraktif 3D/360° Vitrin Mimarı: müşteri vitrini, CSS `preserve-3d` / dekupe katmanlı sahne kartları, 360° turntable, bıçak kesiti, sepet, `/urun`, `/e`, `/fis`, `/ekstre` |
| `admin-katalog-uzmani` | `/admin/urunler` ve S24 fotoğraf kataloğu |
| `pazarlama-ve-lansman-stratejisti` | `arastirma/pazarlama_lansman/**` yerel büyüme planları |
| `ultra-kreatif-studyo` | Google AI Ultra (Flow Veo 3.1, Nano Banana), `G:\Drive'ım\ekmeklab_ses\`, Remotion 60fps |

---

## 3. Faz İlerleme Tablosu (Kurumsal Admin & B2B Dönüşümü)

| Faz | Kapsam | Sorumlu Ajan | Durum |
| :--- | :--- | :--- | :--- |
| **Faz 0** | `COMMAND_CENTER.md`, `.agents/agents/` kalıcı kayıtları, `SKILL.md` güncellemesi | Orkestratör | ✅ Tamamlandı |
| **Faz 1** | `031_enterprise_admin_rbac_b2b.sql` + `031` test, `capabilities.ts`, `audit.ts`, `csv.ts`, `apiAuth.ts`, `proxy.ts`, KVKK & güvenlik yamaları | `guvenlik-ve-rbac-mimari` | ✅ Tamamlandı (Canlıda) |
| **Faz 2** | `/admin/ekip`, `/kurye` Açık Kurumsal Hibrit Zimmet & Kasa Konsolu, `/api/admin/team`, `/api/courier/dispatch`, `/api/orders/[id]/claim`, `/api/admin/orders/bulk-status` | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |
| **Faz 3A** | Açık Kurumsal Admin Kabuğu, Onaylı Şalter, `staff` Finans Gizleme, Sunucu Sayfalamalı CRM (`/admin/musteriler`), Senkronlu `/admin/uretim` & Toplu Sipariş/Dağıtım (`/admin/siparisler`) | `admin-kurumsal-mimari` | ✅ Tamamlandı |
| **Faz 3B** | Kalan Admin Ekranları (`urunler`, `baski`, `ayarlar`, `login`, `siparisler/[id]`, `yeni`, alt modallar) Açık Kurumsal "Atölye Kremi" Tema Dönüşümü | `admin-kurumsal-mimari` | ✅ Tamamlandı |
| **Faz 4** | B2B Özel Fiyat Matrisi, Serbest İlçe & Kredi Limiti, Araçtan Sıcak Satış (`hot-sale`) & Sevk İrsaliyesi | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |
| **Faz 5** | `032` Migration (`default_courier_id`, `standing_order`, `is_ops_staff`, `deliver_b2b_order_flexible_atomic`), `tax_id`/`weight_unit` canlı bug fix & `mapAccount` | `guvenlik-ve-rbac-mimari` | ✅ Tamamlandı (Canlıda) |
| **Faz 6** | Mahalle & Apartman küme şeridi, satır içi tek tık kurye hapı, planlı zimmet vs yolda ayrımı, self-vardiya, tarih+arama fix, rota sıralı etiketler | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |
| **Faz 7** | 10 sn B2B `CariQuickOrderModal` (`inputmode="numeric"`), *Son Siparişi Doldur*, Haftalık Sabit Rutin üretimi, URL ön-dolum & `/kurye` esnek B2B teslimat | `kurye-ve-b2b-uzmani` | ✅ Tamamlandı |
| **Faz 8** | CEO Komuta Kokpiti (`/admin` 4 duraklı operasyon rayı + kasa/zimmet ayrımı + B2B kredi radarı), `⌘K` Hızlı İşlem paleti, üretim çifte sayım fix & CRM/baskı köprüleri | `admin-kurumsal-mimari` | ✅ Tamamlandı |
| **Faz 9** | Anayasa & Otonomi Modernizasyonu (`AGENTS.md`, `MERKEZ.md`, `SKILL.md`, `ADR-0003`/`0005`, `types.ts`): RBAC `requireCapability`, `031`–`032`, `0 ₺` teslimat, `supabase_mcp` + `K011` + `studyo/` yetki temizliği | Orkestratör | ✅ Tamamlandı |
| **Faz 10** | Canlı `bakery_settings` `0 ₺` teslimat + `"Beykent"` düzeltmesi, 10 canlı FK indeksi, `033_advisor_rls_and_fk_hardening.sql` (+ test), yerel `ekmeklab-komuta` MCP sunucusu & `ekmeklab-yerel-buyume-ve-birim-ekonomi` yeteneği | Orkestratör | ✅ Tamamlandı (Canlıda) |
| **Faz 11** | Sentry uçtan uca kurulum (`ekmeklab-web` / `de.sentry.io`, Uptime + E-posta uyarısı, cron/global-error Atölye Kremi), Google Sheets Canlı CEO & Birim Ekonomi Kokpiti (`Birim Ekonomi ve P&L` formüllü 4. sekme), `/admin/finans` & `/api/admin/finance/**` CFO Gider, Tedarikçi & Net Marj Merkezi, `ekmeklab-komuta` 5. araç & `cfo-ve-birim-ekonomi-mimari` ajanı | Komuta + Faz 11 | ✅ Tamamlandı |

---

## 4. Canlı Durum & Kurucu (Tahsin) İçin Kalan Fiziksel Adımlar
- **Canlıda Uygulananlar (15–16 Kasım 2026 — Teknik Borç: 0):**
  - `031_enterprise_admin_rbac_b2b`, `032_zero_friction_dispatch_b2b_cockpit` (`ROLLBACK` kuru deneme + `COMMIT` + `supabase/tests/032_*` duman testi) ve `033_advisor_rls_and_fk_hardening` (`ROLLBACK` kuru deneme + `COMMIT` + `supabase/tests/033_*` duman testi) canlıya uygulandı; `public.app_migrations` üzerinde `013`–`033` (19 kayıt) eksiksiz (`missing = 0`) doğrulandı.
  - `public.bakery_settings` (`0 ₺` teslimat, `0 ₺` alt limit ve `"Beykent"` mahallesi) canlıda aktif; `Ofsüt` (`3680.00 ₺`) ve `Yerumda` (`17405.00 ₺`, toplam `21085.00 ₺`) cari bakiyeleri dokunulmadan doğrulandı.
  - Supabase Security & Performance Advisor üzerindeki `anon_security_definer_function_executable`, `rls_enabled_no_policy`, `unindexed_foreign_keys`, `auth_rls_initplan` ve `multiple_permissive_policies` uyarılarının tamamı kapatıldı.
  - Vercel `ekmeklab_app` (`production`, `preview`, `development`) ortamına **`NEXT_PUBLIC_SENTRY_DSN`** ve **`SENTRY_DSN`** tanımlandı (`ekmeklab-web` / `de.sentry.io` aktif). Mevcut paylaşılan cari/fiş linklerinin geçerliliğini korumak için `LINK_SIGNING_SECRET` bilinçli olarak değiştirilmeden `SUPABASE_SERVICE_ROLE_KEY` türetiminde bırakıldı.
- **Fiziksel Lansman Odağı (`M-2`):** Teknik kurulum tamamen bitti; sıradaki tek kurucu adımı Samsung S24 ile taş fırın ekmekleri ve şarküteri/mandıra eşlikçilerinin fotoğraflarını çekip `/admin/urunler` üzerinden vitrine girmek.
- **Opsiyonel Platform Notu (`auth_leaked_password_protection`):** Management API üzerinden `password_hibp_enabled = true` denendi; Supabase bunu **Pro Plan ve üzeri** ile sınırladığı için Free planda kapalıdır (`HTTP 402 entitlement_required`). Girişler Google OAuth ile yapıldığından acil bir açık oluşturmaz; Pro plana geçilirse açılabilir.
