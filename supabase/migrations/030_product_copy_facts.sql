-- ==============================================================================
-- 030_product_copy_facts.sql — Ürün metinleri doğrulanmış bilgiyle düzeltilir.
-- ==============================================================================
-- NE ZAMAN: Kod yayınından bağımsız (yalnız veri). Birleştirmeden önce ya da sonra.
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/030_product_copy_facts_smoke.sql.
--
-- Neden (30 Eki müşteri denemesi + Tahsin'in yanıtları):
--   - Ürün sayfalarında sağlık beyanı olmaz (AGENTS.md §7): "düşük glutenli", "sindirimi
--     kolaylaştırır", "bağışıklığı destekler" vb. kalkar; masterclass.healthBenefit silinir
--     (sayfada gösterilmiyordu ama herkese açık /api/products yanıtında dönüyordu).
--   - Ekmeklerin yapım süreci ~24 saat (Tahsin); 36/40 saat yazıları düzeltilir.
--   - Köy ekmeği %50 taş değirmen tam buğday + %50 beyaz un (MARKA.md); "atalık" ve
--     8 yıllık maya yazılmaz (Tahsin mayanın yaşının sitede yazılmasını istemiyor).
--   - Jersey sütü: çiğ, hastalıktan ari sertifikalı, A2 (Tahsin). Fotoğraf başka markanın
--     pastörize şişesiydi; kaldırılır (yer tutucu görünür) — gerçek fotoğraf gelince eklenir.
--   - Yoğurdu Tahsin kendisi yapıyor; doğrulanmamış mera/otlak ifadeleri sadeleşir.
-- ==============================================================================

BEGIN;

-- Tüm ürünlerden sağlık iddiası alanı
UPDATE public.products
SET masterclass = masterclass - 'healthBenefit', updated_at = now()
WHERE masterclass ? 'healthBenefit';

UPDATE public.products SET
  description = 'Kastamonu İhsangazi siyezi ve canlı ekşi mayayla, yaklaşık 24 saatlik bir süreçte hazırlanır.',
  masterclass = COALESCE(masterclass, '{}'::jsonb) || jsonb_build_object(
    'technique', 'Siyez hamuru narin olduğu için elle katlanır; yoğurmadan fırına yaklaşık 24 saat sürer.',
    'flourHeritage', 'İlk evcilleştirilen buğdaylardan biri olan tek başaklı siyez (einkorn).'
  ),
  updated_at = now()
WHERE slug = 'yuzde-100-tas-degirmen-siyez-ekmegi';

UPDATE public.products SET
  masterclass = COALESCE(masterclass, '{}'::jsonb) || jsonb_build_object(
    'technique', 'Fırında kavrulan cevizler hamura katılır; yoğurmadan fırına yaklaşık 24 saat sürer.',
    'flourHeritage', 'Siyez, karabuğday ve çavdar unlarının harmanı.'
  ),
  updated_at = now()
WHERE slug = 'ekmeklab-ozel-cevizli-cok-tahilli';

UPDATE public.products SET
  description = 'Taş değirmen tam buğday unu ve beyaz un, içme suyu, Çankırı kaya tuzu ve canlı ekşi maya. Yaklaşık 24 saatlik bir süreçle her gün taze pişer.',
  ingredients = '["Taş Değirmen Tam Buğday Unu", "Buğday Unu", "Su", "Ekşi Maya", "Çankırı Kaya Tuzu"]'::jsonb,
  flour_types = '["Taş Değirmen Tam Buğday", "Beyaz Un"]'::jsonb,
  masterclass = COALESCE(masterclass, '{}'::jsonb) || jsonb_build_object(
    'technique', 'Hamur aralıklarla katlanarak güçlenir; yoğurmadan fırına yaklaşık 24 saat sürer ve taş tabanlı fırında pişer.',
    'flourHeritage', 'Yarısı taş değirmende öğütülmüş tam buğday unu, yarısı beyaz un.',
    'pairingStorage', 'Bez torba içinde oda sıcaklığında saklayın. Dilimleyip dondurabilirsiniz; tost yapıldığında kabuğu yeniden çıtırlaşır.'
  ),
  updated_at = now()
WHERE slug = 'tas-firin-eksi-mayali-koy-ekmegi';

UPDATE public.products SET
  description = 'Hastalıktan ari sertifikalı çiftlikte, Jersey ineklerinden günlük sağılan, yüksek yağlı ve A2 protein yapısında taze çiğ süt; kaymağı üzerindedir. Kaynatılarak tüketilmelidir.',
  image_url = NULL,
  updated_at = now()
WHERE slug = 'jersey-cig-sutu-3-litre';

UPDATE public.products SET
  description = 'Aile tarifimizle, geleneksel yöntemle mayaladığımız; katkısız, kıvam artırıcısız ev yoğurdu.',
  ingredients = '["Süt", "Yoğurt Mayası"]'::jsonb,
  masterclass = COALESCE(masterclass, '{}'::jsonb) || jsonb_build_object(
    'flourHeritage', 'Aile tarifimizle, katkı kullanmadan mayalanır.',
    'pairingStorage', 'Ekşi mayalı ekmeğimizi kızartıp üzerine yoğurt ve tereyağı sürerek deneyin.'
  ),
  updated_at = now()
WHERE slug = 'ozel-ev-yapimi-dogal-yogurt';

INSERT INTO public.app_migrations (id) VALUES ('030_product_copy_facts') ON CONFLICT DO NOTHING;

COMMIT;
