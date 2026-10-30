-- 030 duman testi: 030 uygulandıktan sonra çalıştır. Hiçbir şey yazmaz (ROLLBACK).
BEGIN;

DO $$
DECLARE
  v_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_migrations WHERE id = '030_product_copy_facts') THEN
    RAISE EXCEPTION '030 uygulanmamış';
  END IF;

  SELECT count(*) INTO v_count FROM public.products WHERE masterclass ? 'healthBenefit';
  IF v_count > 0 THEN RAISE EXCEPTION 'healthBenefit kalan ürün: %', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.products
  WHERE is_active
    AND (description || ' ' || COALESCE(masterclass::text, '') || ' ' || COALESCE(ingredients::text, ''))
        ~* '(gluten|sindirim|bağışık|bağırsak|mineralli|36 saat|40 saat|8 yıl)';
  IF v_count > 0 THEN RAISE EXCEPTION 'iddia/çelişki kalan aktif ürün: %', v_count; END IF;

  IF EXISTS (SELECT 1 FROM public.products WHERE slug = 'jersey-cig-sutu-3-litre' AND image_url IS NOT NULL) THEN
    RAISE EXCEPTION 'süt fotoğrafı hâlâ duruyor';
  END IF;

  RAISE NOTICE '030 duman testi geçti';
END $$;

ROLLBACK;
