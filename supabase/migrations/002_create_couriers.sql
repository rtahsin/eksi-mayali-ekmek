-- ==============================================================================
-- EKMEKLAB: KURYE TABLOSU VE İZİNLERİ (GÖREV 1)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'motorcycle' CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle', 'on_foot')),
    is_active BOOLEAN DEFAULT true,
    is_on_shift BOOLEAN DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    location_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_couriers_active_shift ON public.couriers(is_active, is_on_shift);
CREATE INDEX IF NOT EXISTS idx_couriers_profile ON public.couriers(profile_id);

-- RLS Aktifleştir
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları
DROP POLICY IF EXISTS "courier_self_view" ON public.couriers;
CREATE POLICY "courier_self_view" ON public.couriers FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "courier_update_location" ON public.couriers;
CREATE POLICY "courier_update_location" ON public.couriers FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_couriers" ON public.couriers;
CREATE POLICY "admin_manage_couriers" ON public.couriers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Realtime yayını
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
