-- ==============================================================================
-- EKMEKLAB: FİNANS & CARİ MODÜLÜ ŞEMA GÜNCELLEMESİ
-- Güvenli migration: ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- ==============================================================================

-- 1. current_accounts tablosuna eksik kolonlar
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS contact_person TEXT DEFAULT '';
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS neighborhood TEXT DEFAULT '';
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS tax_office TEXT DEFAULT '';
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'musteri';
ALTER TABLE public.current_accounts ADD COLUMN IF NOT EXISTS custom_prices JSONB DEFAULT '{}'::jsonb;

-- Mevcut "type" kolonundaki kişi adlarını (örn: 'Serkan bey', 'Sinan Bey') contact_person'a aktar
UPDATE public.current_accounts
SET contact_person = type
WHERE (contact_person IS NULL OR contact_person = '')
  AND type NOT IN ('gider', 'musteri', 'customer');

-- Mevcut "type" kolonundaki veriyi yeni "account_type" kolonuna migrate et
UPDATE public.current_accounts
SET account_type = CASE
  WHEN type = 'gider' THEN 'gider'
  WHEN type = 'musteri' THEN 'musteri'
  WHEN type = 'customer' THEN 'musteri'
  ELSE 'musteri'
END
WHERE account_type = 'musteri' OR account_type IS NULL;

-- 2. account_transactions tablosuna eksik kolonlar
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS slip_number TEXT;
ALTER TABLE public.account_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2);

-- 3. Fiş numaralandırma dizisi (sequence)
CREATE SEQUENCE IF NOT EXISTS slip_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- 4. Fiş numarası üretme fonksiyonu: FİŞ-YYMM-XXX
CREATE OR REPLACE FUNCTION public.generate_slip_number()
RETURNS TEXT AS $$
DECLARE
  yymm TEXT;
  seq_val INTEGER;
  slip TEXT;
BEGIN
  yymm := TO_CHAR(NOW(), 'YYMM');
  
  -- Ay bazlı sıfırlama: Her yeni ayda 1'den başlasın
  -- Mevcut ay için en yüksek numarayı bul
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(slip_number FROM '\d+$') AS INTEGER
      )
    ), 0
  ) + 1
  INTO seq_val
  FROM public.account_transactions
  WHERE slip_number LIKE 'FİŞ-' || yymm || '-%';
  
  slip := 'FİŞ-' || yymm || '-' || LPAD(seq_val::TEXT, 3, '0');
  RETURN slip;
END;
$$ LANGUAGE plpgsql;

-- 5. adjust_cari_balance RPC fonksiyonunu oluştur/güncelle
-- (Mevcut fonksiyon varsa üzerine yazılır)
CREATE OR REPLACE FUNCTION public.adjust_cari_balance(
  p_account_id TEXT,
  p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  new_bal NUMERIC;
BEGIN
  UPDATE public.current_accounts
  SET balance = balance + p_delta,
      updated_at = NOW()
  WHERE id = p_account_id
  RETURNING balance INTO new_bal;
  
  RETURN new_bal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. account_transactions tablosunu Realtime yayınına ekle
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.account_transactions;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.current_accounts;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_records;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. İndeksler (performans)
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON public.account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON public.account_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_slip_number ON public.account_transactions(slip_number);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON public.financial_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON public.financial_records(type);
