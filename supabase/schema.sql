-- ==============================================================================
-- EKMEKLAB ARTISAN BAKERY & ERP - SUPABASE (POSTGRESQL) PRODUCTION SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM ('bekliyor', 'hazirlaniyor', 'firinda', 'kuryede', 'teslim_edildi', 'iptal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('cash_on_delivery', 'pos_at_door', 'whatsapp', 'online', 'transfer', 'cari');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_method_type AS ENUM ('courier', 'pickup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('customer', 'staff', 'admin', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role user_role_type DEFAULT 'customer',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role public.user_role_type := 'customer';
BEGIN
    IF NEW.email IN ('tahsinreyhan@gmail.com', 'ekmeklab@gmail.com') THEN
        user_role := 'superadmin';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, phone, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        user_role,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SAVED ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Ev',
    district TEXT DEFAULT 'Beylikdüzü',
    neighborhood TEXT NOT NULL,
    address_detail TEXT NOT NULL,
    directions TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0
);

-- 6. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    stock INTEGER DEFAULT 25,
    weight INTEGER DEFAULT 800,
    weight_unit TEXT DEFAULT 'g',
    made_to_order BOOLEAN DEFAULT FALSE,
    is_popular BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    ingredients JSONB DEFAULT '[]'::jsonb,
    flour_types JSONB DEFAULT '[]'::jsonb,
    hydration INTEGER,
    atelier_placement TEXT,
    masterclass JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    delivery_method delivery_method_type DEFAULT 'courier' NOT NULL,
    delivery_address TEXT NOT NULL,
    district TEXT DEFAULT 'Beylikdüzü',
    neighborhood TEXT,
    address_detail TEXT,
    delivery_date TEXT DEFAULT 'today',
    status order_status_type DEFAULT 'bekliyor' NOT NULL,
    payment_method payment_method_type DEFAULT 'cash_on_delivery' NOT NULL,
    subtotal NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    shipping_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    total_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    order_notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    weight INTEGER,
    made_to_order BOOLEAN DEFAULT FALSE,
    batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. CARİ HESAPLAR (Current Accounts / B2B)
CREATE TABLE IF NOT EXISTS public.current_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'customer',
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    address TEXT,
    balance NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    credit_limit NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id TEXT NOT NULL REFERENCES public.current_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'debt' | 'credit'
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    date TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. TEDARİKÇİLER (Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.supplier_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'purchase' | 'payment'
    amount NUMERIC(12, 2) NOT NULL,
    invoice_no TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. FİNANS & KASA (Financial Records)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'income' | 'expense'
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    payment_method TEXT DEFAULT 'cash',
    date TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. ÜRETİM PARTİLERİ (Production Batches)
CREATE TABLE IF NOT EXISTS public.production_batches (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    batch_number TEXT,
    flour_type TEXT,
    hydration INTEGER,
    fermentation_hours INTEGER,
    planned_quantity INTEGER DEFAULT 0 NOT NULL,
    baked_quantity INTEGER DEFAULT 0 NOT NULL,
    available_stock INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'fermenting',
    bake_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. KÜTÜPHANE / BİLİM & ZANAAT MAKALELERİ (Journal)
CREATE TABLE IF NOT EXISTS public.journal_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'fermentation',
    read_time TEXT DEFAULT '5 dk',
    author TEXT DEFAULT 'Tahsin Usta',
    image_url TEXT,
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 14. FIRIN AYARLARI (Bakery Settings)
CREATE TABLE IF NOT EXISTS public.bakery_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bakery_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view & update their own, Admins can view & update all
CREATE POLICY "Users view their own profile or admins view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update their own profile or admins update all"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- Saved Addresses: Users manage their own
CREATE POLICY "Users can manage their own addresses"
    ON public.saved_addresses FOR ALL
    USING (auth.uid() = user_id);

-- Categories & Products: Public read, Admin write
CREATE POLICY "Public read categories"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Admin manage categories"
    ON public.categories FOR ALL
    USING (public.is_admin());

CREATE POLICY "Public read products"
    ON public.products FOR SELECT
    USING (true);

CREATE POLICY "Admin manage products"
    ON public.products FOR ALL
    USING (public.is_admin());

-- Orders: Public can insert (guest or registered checkout), users view their own, admins manage all
CREATE POLICY "Anyone can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users read their own orders or admins read all"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

-- Order Items: Anyone can insert items for new order, users view their own order items
CREATE POLICY "Anyone can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users read their own order items or admins read all"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

-- ERP Tables: Admin / Superadmin only
CREATE POLICY "Admin manage current accounts"
    ON public.current_accounts FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admin manage account transactions"
    ON public.account_transactions FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admin manage suppliers"
    ON public.suppliers FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admin manage supplier transactions"
    ON public.supplier_transactions FOR ALL
    USING (public.is_admin());

CREATE POLICY "Admin manage financial records"
    ON public.financial_records FOR ALL
    USING (public.is_admin());

CREATE POLICY "Public read production batches, admin manage"
    ON public.production_batches FOR SELECT
    USING (true);

CREATE POLICY "Admin manage production batches"
    ON public.production_batches FOR ALL
    USING (public.is_admin());

-- Journal: Public read, Admin write
CREATE POLICY "Public read journal articles"
    ON public.journal_articles FOR SELECT
    USING (published = true OR public.is_admin());

CREATE POLICY "Admin manage journal articles"
    ON public.journal_articles FOR ALL
    USING (public.is_admin());

-- Bakery Settings: Public read, Admin write
CREATE POLICY "Public read bakery settings"
    ON public.bakery_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin manage bakery settings"
    ON public.bakery_settings FOR ALL
    USING (public.is_admin());

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
-- Add key tables to Supabase realtime publication so order alerts sound instantly in bakery
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_batches;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
