-- ==============================================================================
-- EKMEKLAB: ÖDEMELER (PAYMENTS) TABLOSU (GÖREV 4)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'pos', 'online_card', 'transfer', 'cari')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partial')),
    paid_at TIMESTAMPTZ,
    collected_by TEXT CHECK (collected_by IN ('courier', 'admin', 'system')),
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    transaction_ref TEXT,
    cari_transaction_id UUID REFERENCES public.account_transactions(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_courier ON public.payments(courier_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Müşteri: Kendi siparişinin ödemelerini okuyabilir
DROP POLICY IF EXISTS "customers_view_own_payments" ON public.payments;
CREATE POLICY "customers_view_own_payments" ON public.payments FOR SELECT
USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Admin ve Personel: Ödemeleri yönetebilir
DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin', 'courier', 'staff')
  )
);

-- Realtime yayını
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
