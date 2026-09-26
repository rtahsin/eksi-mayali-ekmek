-- ==============================================================================
-- EKMEKLAB: GÜVENLİK, RLS İYİLEŞTİRMELERİ & ATOMİK CARİ TRANSACTİON (GÖREV 8)
-- ==============================================================================

-- 1. ACCOUNT_TRANSACTIONS: RLS Güvencesi
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_account_transactions" ON public.account_transactions;
CREATE POLICY "admin_manage_account_transactions" ON public.account_transactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

-- 2. PAYMENTS: Kurye Yetki Daraltması (Least Privilege)
-- Kuryeler ödemeleri silemez; yalnızca atanmış siparişleri için ödeme ekleyebilir ve okuyabilir.
DROP POLICY IF EXISTS "admin_manage_payments" ON public.payments;
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "courier_insert_payments" ON public.payments;
CREATE POLICY "courier_insert_payments" ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.profile_id = auth.uid()
    AND couriers.id = courier_id
  )
);

DROP POLICY IF EXISTS "courier_view_assigned_payments" ON public.payments;
CREATE POLICY "courier_view_assigned_payments" ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    WHERE couriers.profile_id = auth.uid()
    AND couriers.id = courier_id
  )
);

-- 3. ORDERS: Statü İlerleme ve Terminal Durum Koruması (DB Trigger)
-- teslim_edildi veya iptal edilmiş bir siparişin statüsü veritabanı seviyesinde geriye alınamaz.
CREATE OR REPLACE FUNCTION public.check_order_status_progression()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('teslim_edildi', 'iptal') AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'HATA: % durumundaki nihai bir siparişin durumu değiştirilemez.', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_status_reversal ON public.orders;
CREATE TRIGGER trg_prevent_status_reversal
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_status_progression();

-- 4. CARİ İŞLEM & BAKİYE ATOMİK YÖNETİMİ (Tek Database Transaction)
CREATE OR REPLACE FUNCTION public.record_cari_transaction_atomic(
  p_account_id TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_payment_method TEXT DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_slip_number TEXT DEFAULT NULL,
  p_date TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_bal NUMERIC;
  v_delta NUMERIC;
  v_new_bal NUMERIC;
  v_tx_id UUID;
  v_tx_type TEXT;
  v_date TEXT;
BEGIN
  -- 1. Cari hesabı kilitle (pessimistic lock) ve bakiyesini oku
  SELECT balance INTO v_current_bal
  FROM public.current_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cari hesap bulunamadı: %', p_account_id;
  END IF;

  v_current_bal := COALESCE(v_current_bal, 0);

  -- 2. Delta hesapla (Simetrik Bakiye: Satış/Devir borcu artırır (+), Tahsilat borcu azaltır (-))
  IF p_type IN ('satis', 'debt') THEN
    v_delta := p_amount;
    v_tx_type := 'debt';
  ELSIF p_type IN ('tahsilat', 'credit') THEN
    v_delta := -p_amount;
    v_tx_type := 'credit';
  ELSIF p_type = 'devir' THEN
    v_delta := p_amount;
    v_tx_type := 'debt';
  ELSIF p_type = 'odeme' THEN
    v_delta := -p_amount;
    v_tx_type := 'credit';
  ELSE
    v_delta := p_amount;
    v_tx_type := p_type;
  END IF;

  v_new_bal := v_current_bal + v_delta;
  v_date := COALESCE(p_date, CURRENT_DATE::TEXT);

  -- 3. account_transactions tablosuna atomik insert
  INSERT INTO public.account_transactions (
    account_id,
    type,
    amount,
    description,
    payment_method,
    order_id,
    slip_number,
    balance_after,
    date
  ) VALUES (
    p_account_id,
    v_tx_type,
    p_amount,
    p_description,
    p_payment_method,
    p_order_id,
    p_slip_number,
    v_new_bal,
    v_date
  )
  RETURNING id INTO v_tx_id;

  -- 4. current_accounts bakiyesini atomik güncelle
  UPDATE public.current_accounts
  SET balance = v_new_bal,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_bal,
    'balance_after', v_new_bal,
    'delta', v_delta
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
