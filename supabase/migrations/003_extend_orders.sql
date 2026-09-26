-- ==============================================================================
-- EKMEKLAB: ORDERS TABLOSUNU GENİŞLETME (GÖREV 2)
-- ==============================================================================

-- 1. Eksik Sütunları Ekle
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_shared BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- 2. Constraints (Check constraintler)
DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT check_orders_source 
    CHECK (source IN ('web', 'whatsapp', 'phone', 'in_store', 'admin'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT check_orders_cancelled_by 
    CHECK (cancelled_by IN ('customer', 'admin', 'system'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON public.orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_cari ON public.orders(cari_id);

-- 4. Sipariş Numarası Sequence ve Fonksiyonu (SIP-YYMM-XXX)
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  seq_val INTEGER;
  num TEXT;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_number FROM '\d+$') AS INTEGER
      )
    ), 0
  ) + 1
  INTO seq_val
  FROM public.orders
  WHERE order_number LIKE 'SIP-' || yymm || '-%';
  
  num := 'SIP-' || yymm || '-' || LPAD(seq_val::TEXT, 3, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 5. Mevcut kayıtlarda order_number boş olanları doldur
DO $$
DECLARE
  r RECORD;
  idx INT := 1;
  yymm TEXT := TO_CHAR(NOW(), 'YYMM');
BEGIN
  FOR r IN (SELECT id FROM public.orders WHERE order_number IS NULL OR order_number = '' ORDER BY created_at ASC) LOOP
    UPDATE public.orders 
    SET order_number = 'SIP-' || yymm || '-' || LPAD(idx::TEXT, 3, '0')
    WHERE id = r.id;
    idx := idx + 1;
  END LOOP;
END $$;

-- order_number UNIQUE index ekle
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
