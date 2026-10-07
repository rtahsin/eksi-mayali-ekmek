-- ==============================================================================
-- 026_threshold_bakes.sql  (Faz I-05 — docs/IS_PAKETLERI.md §9)
-- ==============================================================================
-- NE ZAMAN: Kod birleşmeden ÖNCE (eklemeli; eski kod etkilenmez).
-- NASIL: SQL Editor'de önce son satırdaki COMMIT yerine ROLLBACK ile kuru deneme,
--   ardından COMMIT. Sonrasında supabase/tests/026_threshold_bakes_smoke.sql.
--
-- İçerik:
--   1) products: order_threshold int NULL, sale_weekdays smallint[] NULL
--   2) product_sale_dates: status text ('toplaniyor','kesinlesti','kaydirildi'),
--      decided_at timestamptz
--   3) decide_threshold_bakes(p_now timestamptz) RPC:
--      Kesim saati geçmiş ve 'toplaniyor' durumundaki satış günlerini değerlendirir.
--      ≥ eşik -> kesinlesti.
--      < eşik -> siparişlerin delivery_date'i +7 gün, geçmiş satırı eklenir,
--                yeni gün satırı açılır, eski gün 'kaydirildi' yapılır.
--      Idempotenttir, tarih başına advisory kilit ile yarış durumlarını önler.
-- ==============================================================================

BEGIN;

-- 1) Tablo genişletmeleri -----------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_threshold integer CHECK (order_threshold IS NULL OR order_threshold >= 0),
  ADD COLUMN IF NOT EXISTS sale_weekdays smallint[] DEFAULT NULL;

ALTER TABLE public.product_sale_dates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'toplaniyor',
  ADD COLUMN IF NOT EXISTS decided_at timestamptz DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_sale_dates_status_check') THEN
    ALTER TABLE public.product_sale_dates
      ADD CONSTRAINT product_sale_dates_status_check
      CHECK (status IN ('toplaniyor', 'kesinlesti', 'kaydirildi'));
  END IF;
END $$;

-- 2) RPC decide_threshold_bakes ------------------------------------------------

CREATE OR REPLACE FUNCTION public.decide_threshold_bakes(
  p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_tr timestamp;
  v_cutoff_time text;
  v_r RECORD;
  v_order RECORD;
  v_total_qty integer;
  v_next_date date;
  v_decisions jsonb := '[]'::jsonb;
  v_shifted_orders_count integer;
  v_processed_count integer := 0;
  v_cutoff_deadline timestamp;
BEGIN
  -- İstanbul yerel zamanı
  v_now_tr := (p_now AT TIME ZONE 'Europe/Istanbul');

  -- Kesim saati (ayarlardan, yoksa varsayılan 12:00)
  SELECT COALESCE(
    (SELECT TRIM(BOTH '"' FROM value::text) FROM public.bakery_settings WHERE key = 'order_cutoff_time'),
    (SELECT (value->>'orderCutoffTime')::text FROM public.bakery_settings WHERE key = 'operational_settings'),
    '12:00'
  ) INTO v_cutoff_time;

  -- Eşikli ürünlerin henüz 'toplaniyor' durumunda olan satış günleri
  FOR v_r IN
    SELECT psd.product_id,
           psd.sale_date,
           psd.quantity_limit,
           p.name AS product_name,
           p.order_threshold,
           p.capacity_units
    FROM public.product_sale_dates psd
    JOIN public.products p ON p.id = psd.product_id
    WHERE psd.status = 'toplaniyor'
      AND p.order_threshold IS NOT NULL
      AND p.order_threshold > 0
    ORDER BY psd.sale_date ASC
  LOOP
    -- Karar anı kontrolü: üretimden önceki akşam son sipariş saati
    -- v_r.sale_date - 1 gününün saat v_cutoff_time anı
    v_cutoff_deadline := ((v_r.sale_date - 1)::text || ' ' || v_cutoff_time)::timestamp;

    -- Eğer şu anki zaman kesim saatini geçmişse veya satış günü gelmişse/geçmişse karar verilir
    IF v_now_tr >= v_cutoff_deadline OR v_now_tr::date >= v_r.sale_date THEN
      -- Advisory kilit: aynı ürün ve satış günü için eşzamanlı çalışmayı önle
      PERFORM pg_advisory_xact_lock(hashtext('ekmeklab:threshold:' || v_r.product_id || ':' || v_r.sale_date::text));

      -- İptal edilmemiş siparişlerdeki toplam adedi say
      SELECT COALESCE(SUM(oi.quantity), 0)
      INTO v_total_qty
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = v_r.product_id
        AND o.delivery_date = v_r.sale_date
        AND o.status <> 'iptal';

      IF v_total_qty >= v_r.order_threshold THEN
        -- Eşik aşıldı -> KESİNLEŞTİ
        UPDATE public.product_sale_dates
        SET status = 'kesinlesti',
            decided_at = p_now
        WHERE product_id = v_r.product_id
          AND sale_date = v_r.sale_date;

        v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
          'product_id', v_r.product_id,
          'product_name', v_r.product_name,
          'sale_date', v_r.sale_date,
          'decision', 'kesinlesti',
          'ordered_quantity', v_total_qty,
          'threshold', v_r.order_threshold
        ));
      ELSE
        -- Eşik dolmadı -> KAYDIRILDI (+7 gün)
        v_next_date := v_r.sale_date + 7;
        v_shifted_orders_count := 0;

        -- 1. Eski satış gününü kaydırıldı olarak işaretle
        UPDATE public.product_sale_dates
        SET status = 'kaydirildi',
            decided_at = p_now
        WHERE product_id = v_r.product_id
          AND sale_date = v_r.sale_date;

        -- 2. Yeni satış günü satırı yoksa oluştur
        INSERT INTO public.product_sale_dates (product_id, sale_date, quantity_limit, status)
        VALUES (v_r.product_id, v_next_date, v_r.quantity_limit, 'toplaniyor')
        ON CONFLICT (product_id, sale_date) DO NOTHING;

        -- 3. Bu ürünü içeren siparişleri yeni güne kaydır
        FOR v_order IN
          SELECT DISTINCT o.id, o.order_number, o.status::text as status
          FROM public.orders o
          JOIN public.order_items oi ON oi.order_id = o.id
          WHERE oi.product_id = v_r.product_id
            AND o.delivery_date = v_r.sale_date
            AND o.status <> 'iptal'
          FOR UPDATE OF o
        LOOP
          UPDATE public.orders
          SET delivery_date = v_next_date,
              updated_at = now()
          WHERE id = v_order.id;

          INSERT INTO public.order_status_history (
            order_id, from_status, to_status, changed_by_role, note
          ) VALUES (
            v_order.id, v_order.status, v_order.status, 'system',
            format('%s eşiğe ulaşmadığı için (%s/%s) teslimat %s tarihine kaydırıldı',
                   v_r.product_name, v_total_qty, v_r.order_threshold, to_char(v_next_date, 'DD.MM.YYYY'))
          );

          v_shifted_orders_count := v_shifted_orders_count + 1;
        END LOOP;

        v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
          'product_id', v_r.product_id,
          'product_name', v_r.product_name,
          'sale_date', v_r.sale_date,
          'next_date', v_next_date,
          'decision', 'kaydirildi',
          'ordered_quantity', v_total_qty,
          'threshold', v_r.order_threshold,
          'shifted_orders_count', v_shifted_orders_count
        ));
      END IF;

      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'decisions', v_decisions
  );
END;
$$;

-- 3) admin_save_product güncellemesi (order_threshold ve sale_weekdays ile) ---

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
    flour_types, hydration, masterclass, order_threshold, sale_weekdays, updated_at
  )
  SELECT r.id, r.slug, r.name, r.description, r.price, r.compare_at_price, r.image_url, r.category, r.weight,
         r.weight_unit, r.is_available, r.is_active, r.is_popular, r.is_new, r.made_to_order,
         COALESCE(r.availability, 'daily'), r.daily_limit, COALESCE(r.lead_time_days, 0),
         COALESCE(r.capacity_units, 1), r.bundle_items, COALESCE(r.cross_sell, '{}'), COALESCE(r.display_order, 0),
         r.ingredients, r.flour_types, r.hydration, r.masterclass, r.order_threshold, r.sale_weekdays, now()
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
    masterclass = EXCLUDED.masterclass, order_threshold = EXCLUDED.order_threshold,
    sale_weekdays = EXCLUDED.sale_weekdays, updated_at = now();

  DELETE FROM public.product_sale_dates WHERE product_id = v_id AND sale_date >= p_from AND status = 'toplaniyor';

  INSERT INTO public.product_sale_dates (product_id, sale_date, quantity_limit, status)
  SELECT DISTINCT ON ((d->>'date')::date) v_id, (d->>'date')::date, NULLIF(d->>'limit', '')::integer,
         COALESCE(d->>'status', 'toplaniyor')
  FROM jsonb_array_elements(COALESCE(p_sale_dates, '[]'::jsonb)) d
  WHERE (d->>'date')::date >= p_from
  ON CONFLICT (product_id, sale_date) DO UPDATE SET
    quantity_limit = EXCLUDED.quantity_limit;
END;
$$;

-- 4) Yetkiler -----------------------------------------------------------------

REVOKE ALL ON FUNCTION public.decide_threshold_bakes(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_threshold_bakes(timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product(JSONB, JSONB, DATE) TO service_role;

-- 5) Migration Kaydı ----------------------------------------------------------

INSERT INTO public.app_migrations (id) VALUES ('026_threshold_bakes') ON CONFLICT (id) DO NOTHING;

COMMIT;
