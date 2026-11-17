# ADR-0009 İstemci Veri Erişimi, Ortak `apiClient` ve Tekil Realtime Sağlayıcısı

- **Tarih:** 2026-11-17 · **Durum:** kabul edildi (Tahsin) · **İlgili:** ADR-0001, ADR-0007, ADR-0008, `docs/MIMARI.md` §2.5, `src/lib/kernel/arch.test.ts`

## Bağlam

Ticari çekirdek (`orders`, `payments`, `order_status_history`) `024_single_writer` ve ADR-0007 ile yazma tarafında sunucu API/RPC arkasına alındı; ancak okuma, hata zarfı ve canlı senkron katmanları üç farklı desen arasında bölünmüş durumda:

1. **Asimetrik veri erişimi (okuma vs yazma):**
   - **Tarayıcıdan yazma:** `src/hooks/useCustomerAuth.ts` hâlâ `profiles` güncellemesi ve `saved_addresses` üzerinde 2 adımlı (atomik olmayan) tarayıcı PostgREST yazımı yapıyor.
   - **Tarayıcıdan okuma:** 9 istemci dosyası (`useAdminOrders.ts`, `useCariler.ts`, `useCariProfile.ts`, `usePayments.ts`, `useOrderHistory.ts`, `useCouriers.ts`, `useAdminAuth.ts`, `AdminLayoutClient.tsx`, `FirindanCikti.tsx`) doğrudan `@/lib/supabase/client` ile `.from()` sorgusu çalıştırıyor. `useAdminOrders.ts` tek başına 4 paralel sorgu ve `history` modunda 20.000 satıra kadar döngüsel okuma yapıyor; `admin/cariler/page.tsx` ve `admin/cariler/[id]/page.tsx` ise aynı veriyi hem tarayıcı PostgREST kancasıyla hem `/api/admin/cari/accounts/**` üzerinden **çifte okuyor**.
   - **Mapper çatallanması:** `useCariProfile.ts` merkezi `src/lib/products/map.ts` yerine kendi eksik ürün eşlemesini yazıyor; `useAdminOrders.ts` ile `src/lib/orders/normalize.ts` arasında normalize fonksiyonları kopyalanıyor.
2. **Dağınık `fetch()` ve tutarsız hata zarfı:** 37 UI/kanca dosyasında ~88 ham `fetch()` çağrısı var. 54 API rotasından 37'si `{ error: string }`, 17'si `{ error, code }` (2'sinde ayrıca `success: false`) dönüyor; hiçbiri `MIMARI.md` §2.5'te yazılan iç içe `{ error: { code, message } }` biçimini kullanmıyor. Mevcut istemcilerin neredeyse tamamı `typeof body.error === "string"` bekliyor.
3. **Çoklu Realtime kanalı ve yeniden çekim fırtınası:** 8 ayrı noktada (`AdminLayoutClient.tsx`, `admin/uretim/page.tsx`, `kurye/page.tsx`, `useAdminOrders.ts`, `useCariProfile.ts`, `useCariler.ts`, `useCouriers.ts`, `usePayments.ts`) bağımsız `.channel()` aboneliği açılıyor. Tek bir teslimat RPC'si (`orders` + `payments` + `current_accounts`) aynı admin sekmesinde 3–4 kanalı birden tetikleyip tam liste yeniden çekimi başlatıyor.

---

## Karar 1 — İstemci Veri Erişim Stratejisi

| Seçenek | Artıları | Eksileri |
|---|---|---|
| **1A. Hibrit (Tarayıcıdan PostgREST okuma + API yazma)** | Admin okumaları Vercel Function'a düşmez; mevcut kancalar az değişiklik ister. | RLS satır bazlıdır, alan/hesap maskeleme (`staff` için ciro gizleme, `balance_after` koruma) zayıf kalır; istemci + sunucu çift mapper sürer; çok tablolu görünümler (mutabakat, B2B) tarayıcıda N+1 sorguya veya çifte okumaya zorlanır. |
| **1B. Tamamen Sunucu API + Vitrin RSC *(Önerilen)*** | Tek güvenlik kapısı (`requireCapability` / `requireAdmin`); tek sunucu `Repository/Mapper`; çok tablolu birleştirmeler DB'ye yakın tek HTTP turunda yapılır; tarayıcı PostgREST `.from()`/`rpc()` kullanımı `arch.test.ts` ile sıfıra indirilir; `useAdminOrders` 20.000 satır döngüsü ve çifte okuma biter. | Admin/kurye okumalarında Vercel Function çağrısı artar (günlük ~30 somun ve az sayıda operatör ölçeğinde ihmal edilebilir; 10x ziyaretçi trafiği olan vitrin zaten SSG/ISR + önbellekli `GET /api/products`, `GET /api/settings` üzerindedir). |
| **1C. Next.js Server Actions** | Tip paylaşımı kolay. | `src/lib/courier/offlineQueue.ts` çevrimdışı kuyruğu, açık HTTP durum kodları (`409 Conflict`, `429 Retry-After`, `503`), `Cache-Control` ve mevcut 54 REST route handler standardıyla uyumsuz. |

**Öneri (1B):** Tüm veri okuma ve yazma işlemleri sunucuda (vitrin için RSC/SSG/ISR, etkileşimli operasyon/müşteri işlemleri için `/api/**` Route Handler'ları) yapılır. Tarayıcıdaki `@/lib/supabase/client` yalnızca **3 izinli yetenekle** sınırlandırılır:
1. `supabase.auth.*` oturum yönetimi (Google OAuth / OTP / signOut),
2. Sunucudan imzalı yükleme URL'si alındıktan sonra doğrudan Storage'a büyük dosya yükleme (`uploadToSignedUrl` — Vercel 4.5 MB fonksiyon gövde sınırına takılmamak için),
3. Karar 3'teki tekil `RealtimeInvalidationProvider` sinyal kanalı.

*İlk taşınacak yüksek öncelikli istisna:* `useCustomerAuth.ts` içindeki `profiles` ve `saved_addresses` yazma/okuma işlemleri `/api/account/**` rotalarına alınır; böylece varsayılan adres değişimi sunucuda atomikleşir ve `ekmeklab_auth_session` `localStorage` kopyası kaldırılır.

---

## Karar 2 — Ortak `apiClient` ve Tek Tip Hata Zarfı

| Seçenek | Artıları | Eksileri |
|---|---|---|
| **2A. İç içe nesne (`{ error: { code, message } }`)** | `MIMARI.md` §2.5 notuyla birebir. | Geriye uyumsuz: 37 UI dosyasındaki `body.error` dizesi `[object Object]`'e döner; tüm rotalar ve istemciler tek hamlede değiştirilmedikçe kırılma yaratır. |
| **2B. Düz, geriye uyumlu zarf + merkezi `apiClient` *(Önerilen)*** | Mevcut rotaların ve testlerin `body.error` beklentisini %100 korur; kademeli (modül modül) geçişe izin verir. | `MIMARI.md` §2.5 notunun "düz zarf" olarak güncellenmesini gerektirir. |

**Öneri (2B):**
- **Başarı yanıtı (`200`/`201`):** İlgili modülün tipli JSON payload'ı (`T`). Yeni uçlarda gereksiz `success: true` sarmalı yerine açık alanlar veya mevcut sözleşme korunur.
- **Hata zarfı (`4xx`/`5xx`):**
  ```ts
  export interface ApiErrorEnvelope {
    error: string;                           // Kullanıcıya doğrudan gösterilebilir Türkçe mesaj
    code: ApiErrorCode;                      // VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | ALREADY_REVERSED | CREDIT_LIMIT_EXCEEDED | RATE_LIMITED | DB_UNAVAILABLE | INTERNAL_ERROR
    details?: Record<string, string[]>;      // Opsiyonel zod alan bazlı doğrulama hataları
  }
  ```
- **Sunucu yardımcısı (`src/lib/kernel/http.ts`):** `apiError(status, code, message, details?)`, `apiZodError(issues)` ve merkezi `parseJsonBody(req, schema)` ile her rotada tekrarlanan `safeParse` + `NextResponse.json` blokları standartlaşır.
- **İstemci adaptörü (`src/lib/kernel/apiClient.ts`):** `apiGet<T>`, `apiPost<T>`, `apiPatch<T>`, `apiDelete<T>` yardımcıları `credentials: "same-origin"`, varsayılan `cache: "no-store"`, `AbortSignal` desteği, `429 Retry-After` okuma ve tipli `ApiClientError { status, code, message, details, retryAfterSeconds }` fırlatma/dönüşünü tek yerde toplar. Ham `fetch()` kullanımı yalnız dosya yükleme (`FormData` / Storage signed URL) veya `keepalive` telemetry beacon (`track.ts`) için serbest kalır.

---

## Karar 3 — Realtime Kanallarının Tek Sağlayıcıda Toplanması

| Seçenek | Artıları | Eksileri |
|---|---|---|
| **3A. Hook başına ayrı `.channel()` (Mevcut)** | Yerel kurulumu basit. | Sekme başına 3–4 eşzamanlı WebSocket aboneliği; kurye teslimatında aynı verinin birden fazla kanca tarafından paralel yeniden çekilmesi. |
| **3B. Salt Polling (Realtime yok)** | WebSocket bağlantısı ve temizlik riski yok. | Mutfak/fırın yeni sipariş zili gecikir; kurye ile tezgâh ekranı senkronu soğur. |
| **3C. Tekil Çoklanmış Kanal + Birleştirilmiş Geçersiz Kılma Veriyolu *(Önerilen)*** | Sekme başına **tek** kanal; olay fırtınası 250–300 ms debounce ile tek API turuna iner; RBAC ve sunucu DTO bütünlüğü bozulmaz; arka plan sekmesinde gereksiz `fetch` durur. | `/admin` ve `/kurye` kök kabuklarında bir sağlayıcı bileşeni (`RealtimeInvalidationProvider`) gerektirir. |

**Öneri (3C):**
- `AdminLayoutClient` ve `/kurye` kabuğu altında sekme başına **yalnızca 1 adet** Supabase Realtime kanalı (`ops-invalidation-<role>`) açılır; `.on("postgres_changes", ...)` dinleyicileri yalnızca kullanıcının yetkisine (`capabilities`) göre eklenir (`canReadCari` yoksa `current_accounts` dinlenmez).
- **Veri değil sinyal taşıma:** Gelen Realtime olayının ham satırı doğrudan UI state'ine yamalanmaz (yetki sızıntısı ve mapper kayması olmaması için). Olaylar konu etiketlerine (`"orders" | "payments" | "couriers" | "cari" | "production"`) dönüştürülüp **250 ms içinde birleştirilerek (coalesced)** abone ekranlara `invalidate` sinyali olarak yayınlanır.
- **Arka plan koruması & çevrimdışı kurtarma:** `document.visibilityState === "hidden"` iken gelen sinyaller kuyrukta "kirli" (`dirty`) işaretlenir ve sekme görünür olduğunda veya `online` olayında ilgili kancalar tek tur tazelenir. Sipariş zili (`playOrderChime`) `AdminLayoutClient` içindeki `orders` `INSERT` sinyali + hafif sayaç API'si üzerinden beslenir.
- *İstisna değerlendirmesi:* Çoklu çalışan anlık kutu işaretlemesi (`admin/uretim` — `production_checks`) istenirse gecikmeyi sıfıra yakın tutmak için sağlayıcının yayınladığı `"production"` olayına hafif `revalidateChecks()` bağlanır.

---

## Geçiş ve Mimari Denetim Kuralları (Cırcır / Ratchet)

Temiz Mimari geçişi büyük bir patlamayla değil, pilot modüllerle artımlı yapılır:
1. **Beklenen yeni sınır kuralları (`src/lib/kernel/arch.test.ts`):**
   - Tarayıcıda doğrudan `@/lib/supabase/client` içe aktaran mevcut dosyalar `LEGACY_BROWSER_SUPABASE_FILES` cırcır listesinde dondurulur (`src/hooks/useAdminOrders.ts`, `useCariler.ts`, `useCariProfile.ts`, `usePayments.ts`, `useOrderHistory.ts`, `useCouriers.ts`, `useAdminAuth.ts`, `useCustomerAuth.ts`, `AdminLayoutClient.tsx`, `FirindanCikti.tsx`, `admin/uretim/page.tsx`, `admin/urunler/page.tsx`, `admin/urunler/[id]/adimlar/page.tsx`, `kurye/page.tsx`, `directUpload.ts` — auth ve `uploadToSignedUrl` dışındakiler pilotlar ilerledikçe listeden çıkarılır).
   - Temizlenmiş bir modülün (`finance` ile başlayarak) UI ve route dosyalarının doğrudan `.from(` / `.rpc(` / `.channel(` veya `@/lib/supabase/*` çağırması testle yasaklanır.
2. **Sıralama:** Pilot 1 (`finance`) önce ADR-0009'un 2. maddesini (tipli istemci servisi) doğrular; Pilot 2 (`ledger`) tarayıcı çifte okumalarını ve `useCariler` / `useCariProfile` `.from()` çağrılarını kaldırır; Pilot 3 (`delivery` + `team`) ile birlikte `RealtimeInvalidationProvider` devreye alınıp kalan `.channel()` çağrıları kapatılır.

---

## Tetikleyici (Yeniden Değerlendirme)

- Günlük >1.000 sipariş veya >20 eşzamanlı operatör olduğunda Supabase Realtime yerine özel WebSocket/SSE sunucusu veya React Query (`@tanstack/react-query`) önbellek katmanı değerlendirilir.
- Tahsin onayı sonrasında `docs/MIMARI.md` §2.5 hata zarfı örneği (`{ error, code }`) bu ADR ile senkronlanır.
