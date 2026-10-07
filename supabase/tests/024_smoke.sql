-- ==============================================================================
-- 024_smoke.sql — 024_single_writer duman testi.
-- Tarayıcı rollerinden (authenticated / anon) doğrudan UPDATE ve INSERT
-- işlemlerinin RLS tarafından reddedildiğini doğrular.
-- Hiçbir şey kalıcı olmaz (BEGIN ... ROLLBACK).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date + 1;
  v_base JSONB;
  v_items JSONB := '[{"product_id":"SMOKE-024","product_name":"TEST Ekmek 024","quantity":1,"unit_price":50,"total_price":50}]';
  v_rows INT;
  v_err TEXT;
  v_user_id UUID := '00000000-0000-0000-0000-000000000024'::uuid;
BEGIN
  -- 1) Service role ile test verisi hazırla
  INSERT INTO public.products (id, name, slug, price, category, is_active, is_available, availability, capacity_units)
  VALUES ('SMOKE-024', 'TEST Ekmek 024', 'smoke-024', 50, 'bread', true, true, 'daily', 1);


  v_base := jsonb_build_object(
    'customer_name', 'TEST 024',
    'phone', '05000000000',
    'delivery_address', 'TEST Adres',
    'delivery_method', 'courier',
    'payment_method', 'cash_on_delivery',
    'subtotal', 50,
    'shipping_fee', 0,
    'total_amount', 50,
    'delivery_date', to_char(v_day, 'YYYY-MM-DD'),
    'bypass_limits', true,
    'status', 'hazirlaniyor',
    'source', 'web'
  );

  PERFORM public.create_order_atomic(v_base || '{"id":"ORD-S024A"}', v_items, NULL);

  -- 2) İstemci rolüne bürün (authenticated)
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

  -- A) Tarayıcıdan orders UPDATE reddedilmeli (0 satır güncellenmeli)
  UPDATE public.orders
     SET order_notes = 'hacked_note'
   WHERE id = 'ORD-S024A';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 0, 'Tarayıcıdan orders tablosuna UPDATE başarılı oldu! 0 olmalıydı, alınan: ' || v_rows;

  -- B) Tarayıcıdan payments INSERT reddedilmeli
  BEGIN
    INSERT INTO public.payments (order_id, amount, method, status)
    VALUES ('ORD-S024A', 50, 'cash', 'completed');
    RAISE EXCEPTION 'Tarayıcıdan payments INSERT başarılı oldu!';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    -- RLS ihlali beklenir
    ASSERT v_err LIKE '%policy%' OR v_err LIKE '%violates%' OR v_err LIKE '%permission%',
      'Beklenmeyen hata: ' || v_err;
  END;

  -- C) Tarayıcıdan order_status_history INSERT reddedilmeli
  BEGIN
    INSERT INTO public.order_status_history (order_id, to_status, changed_by_role)
    VALUES ('ORD-S024A', 'teslim_edildi', 'customer');
    RAISE EXCEPTION 'Tarayıcıdan order_status_history INSERT başarılı oldu!';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    ASSERT v_err LIKE '%policy%' OR v_err LIKE '%violates%' OR v_err LIKE '%permission%',
      'Beklenmeyen hata: ' || v_err;
  END;

  RESET ROLE;
  RAISE NOTICE '024 smoke OK';
END $$;

ROLLBACK;
