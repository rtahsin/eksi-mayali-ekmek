-- ==============================================================================
-- EKMEKLAB: MÜŞTERİ CANLI KONUM TABLOSU & KVKK TTL (GÖREV 5)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customer_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custloc_order ON public.customer_locations(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custloc_created_at ON public.customer_locations(created_at);

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

-- Müşteri: Sadece kendi siparişi için konum yazabilir
DROP POLICY IF EXISTS "customer_share_location" ON public.customer_locations;
CREATE POLICY "customer_share_location" ON public.customer_locations FOR INSERT
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Yetkili personel/admin/kurye: Konumları okuyabilir
DROP POLICY IF EXISTS "staff_view_locations" ON public.customer_locations;
CREATE POLICY "staff_view_locations" ON public.customer_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

-- Realtime yayını
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_locations;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 72 saatlik temizleme fonksiyonu (KVKK Veri Minimizasyonu)
CREATE OR REPLACE FUNCTION public.cleanup_expired_customer_locations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.customer_locations
  WHERE created_at < NOW() - INTERVAL '72 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
