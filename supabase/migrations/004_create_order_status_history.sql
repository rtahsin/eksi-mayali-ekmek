-- ==============================================================================
-- EKMEKLAB: SİPARİŞ DURUM GEÇMİŞİ (AUDIT LOG) TABLOSU (GÖREV 3)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by_role TEXT NOT NULL CHECK (changed_by_role IN ('system', 'admin', 'courier', 'customer')),
    changed_by_id TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_osh_order ON public.order_status_history(order_id, created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Müşteri: Kendi siparişinin geçmişini görebilir
DROP POLICY IF EXISTS "customers_view_own_order_status_history" ON public.order_status_history;
CREATE POLICY "customers_view_own_order_status_history" ON public.order_status_history FOR SELECT
USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Admin: Tüm geçmişi görebilir ve yönetebilir
DROP POLICY IF EXISTS "admin_full_status_history" ON public.order_status_history;
CREATE POLICY "admin_full_status_history" ON public.order_status_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- Kurye: Kendisine atanmış siparişlerin durum geçmişini görebilir
DROP POLICY IF EXISTS "courier_view_assigned_order_status_history" ON public.order_status_history;
CREATE POLICY "courier_view_assigned_order_status_history" ON public.order_status_history FOR SELECT
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.couriers c ON o.courier_id = c.id
    WHERE c.profile_id = auth.uid()
  )
);

-- Realtime yayını
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
