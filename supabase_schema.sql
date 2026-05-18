-- NEXUS ERP: EXHAUSTIVE MULTI-TENANT SCHEMA
-- Version: 3.0 (Enterprise Ecosystem Edition)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BASE SYSTEM (Roles & Users)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    fullname TEXT,
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TENANCY (Companies)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    sector TEXT,
    owner_id UUID REFERENCES public.users(id),
    owner_email TEXT,
    subscription_tier TEXT DEFAULT 'free',
    is_verified BOOLEAN DEFAULT FALSE,
    trust_score DECIMAL(3,2) DEFAULT 0.0,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    role_id UUID REFERENCES public.roles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    permissions JSONB DEFAULT '[]',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT company_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_company ON public.company_members(company_id);

-- 3. INVENTORY & WAREHOUSING (African Logistics ready)
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    coordinates JSONB, -- {lat, lng} for delivery routing
    phone TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    sale_price DECIMAL(12,2),
    min_stock_level INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    images TEXT[], -- Array of URLs
    is_marketplace_visible BOOLEAN DEFAULT FALSE,
    is_ecommerce_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    batch_number TEXT,
    expiry_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    product_id UUID REFERENCES public.products(id),
    from_warehouse_id UUID REFERENCES public.warehouses(id),
    to_warehouse_id UUID REFERENCES public.warehouses(id),
    quantity INTEGER NOT NULL,
    type TEXT CHECK (type IN ('in', 'out', 'transfer', 'adjustment', 'return')),
    reason TEXT,
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDER MANAGEMENT SYSTEM (OMS)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    buyer_id UUID REFERENCES public.users(id), -- If individual buyer
    buyer_email TEXT,
    buyer_phone TEXT,
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    payment_method TEXT, -- Mobile Money, Stripe, Cash, etc.
    delivery_address TEXT,
    delivery_coordinates JSONB,
    order_type TEXT DEFAULT 'direct' CHECK (order_type IN ('direct', 'marketplace', 'ecommerce', 'pos')),
    notes TEXT,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    discount_price DECIMAL(12,2) DEFAULT 0
);

-- 5. PAYMENTS & FINANCIALS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    order_id UUID REFERENCES public.orders(id),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'XAF',
    provider TEXT, -- 'mtn', 'orange', 'wave', 'stripe', 'cash'
    provider_tx_id TEXT,
    status TEXT CHECK (status IN ('pending', 'success', 'failed', 'reversed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LOGISTICS & DELIVERY
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id),
    carrier_name TEXT,
    tracking_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed')),
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    courier_phone TEXT,
    proof_of_delivery_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MARKETPLACE TRUST & REPUTATION
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT CHECK (target_type IN ('product', 'company')),
    target_id UUID NOT NULL,
    author_id UUID REFERENCES public.users(id),
    author_name TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT & MONITORING
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POLICIES (Simplified for ecosystem foundation)
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company data" ON public.products FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::text))
    OR is_marketplace_visible = TRUE
);

CREATE POLICY "Inventory view" ON public.inventory_stock FOR SELECT USING (
    warehouse_id IN (SELECT id FROM public.warehouses WHERE company_id IN (SELECT company_id FROM public.company_members WHERE user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::text)))
);

-- INDEXES
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_orders_company ON public.orders(company_id);
CREATE INDEX idx_stock_product ON public.inventory_stock(product_id);
CREATE INDEX idx_movements_product ON public.inventory_movements(product_id);

