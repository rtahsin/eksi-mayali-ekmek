-- ==============================================================================
-- 026_product_sale_weekdays.sql  (Faz I-06 — docs/IS_PAKETLERI.md §9)
-- ==============================================================================
-- NE ZAMAN: Kod birleşmeden ÖNCE (eklemeli; eski kod etkilenmez).
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/026_product_sale_weekdays_smoke.sql.
--
-- İçerik:
--   1) products: sale_weekdays smallint[] NULL (1=Pzt..7=Paz; NULL = her gün)
--   2) admin_save_product: sale_weekdays alanını da kaydeden sürüm.
--      product_sale_dates satırları silinip yeniden yazılırken siparişi olan
--      tarih silinmez (güvenli güncelleme).
-- ==============================================================================

BEGIN;

-- 1) Tablo genişletmeleri -----------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_weekdays smallint[] DEFAULT NULL;

-- 2) admin_save_product güncellemesi (sale_weekdays ile) -----------------------

CREATE OR REPLACE FUNCTION public.admin_save_product(p_product JSONB, p_sale_dates JSONB, p_from DATE)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT := p_product->>'id';
BEGIN
  IF v_id IS NULL OR v_id = '' THEN
    RAISE EXCEPTION 'PRODUCT_ID_REQUIRED';
  END IF;

  INSERT INTO public.products AS p (
    id, slug, name, description, price, compare_at_price, image_url, category, weight, weight_unit,
    is_available, is_active, is_popular, is_new, made_to_order, availability, daily_limit,
    lead_time_days, capacity_units, bundle_items, cross_sell, display_order, ingredients,
    flour_types, hydration, masterclass, sale_weekdays, updated_at
  )
  SELECT r.id, r.slug, r.name, r.description, r.price, r.compare_at_price, r.image_url, r.category, r.weight,
         r.weight_unit, r.is_available, r.is_active, r.is_popular, r.is_new, r.made_to_order,
         COALESCE(r.availability, 'daily'), r.daily_limit, COALESCE(r.lead_time_days, 0),
         COALESCE(r.capacity_units, 1), r.bundle_items, COALESCE(r.cross_sell, '{}'), COALESCE(r.display_order, 0),
         r.ingredients, r.flour_types, r.hydration, r.masterclass, r.sale_weekdays, now()
  FROM jsonb_populate_record(NULL::public.products, p_product) r
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
    compare_at_price = EXCLUDED.compare_at_price, image_url = EXCLUDED.image_url, category = EXCLUDED.category,
    weight = EXCLUDED.weight, weight_unit = EXCLUDED.weight_unit, is_available = EXCLUDED.is_available,
    is_active = EXCLUDED.is_active, is_popular = EXCLUDED.is_popular, is_new = EXCLUDED.is_new,
    made_to_order = EXCLUDED.made_to_order, availability = EXCLUDED.availability,
    daily_limit = EXCLUDED.daily_limit, lead_time_days = EXCLUDED.lead_time_days,
    capacity_units = EXCLUDED.capacity_units, bundle_items = EXCLUDED.bundle_items,
    cross_sell = EXCLUDED.cross_sell, display_order = EXCLUDED.display_order,
    ingredients = EXCLUDED.ingredients, flour_types = EXCLUDED.flour_types, hydration = EXCLUDED.hydration,
    masterclass = EXCLUDED.masterclass, sale_weekdays = EXCLUDED.sale_weekdays, updated_at = now();

  -- Siparişi olan satış tarihleri korunur; siparişi olmayan gelecek tarihler silinir
  DELETE FROM public.product_sale_dates psd
  WHERE psd.product_id = v_id
    AND psd.sale_date >= p_from
    AND NOT EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE oi.product_id = v_id
        AND o.delivery_date = psd.sale_date
        AND o.status <> 'iptal'
    );

  -- Yeni tarihleri ekle veya limitini güncelle
  INSERT INTO public.product_sale_dates (product_id, sale_date, quantity_limit)
  SELECT DISTINCT ON ((d->>'date')::date) v_id, (d->>'date')::date, NULLIF(d->>'limit', '')::integer
  FROM jsonb_array_elements(COALESCE(p_sale_dates, '[]'::jsonb)) d
  WHERE (d->>'date')::date >= p_from
  ON CONFLICT (product_id, sale_date) DO UPDATE
    SET quantity_limit = EXCLUDED.quantity_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) TO service_role;

-- 3) app_migrations kaydı -----------------------------------------------------
INSERT INTO public.app_migrations (id) VALUES ('026_product_sale_weekdays') ON CONFLICT (id) DO NOTHING;

COMMIT;
