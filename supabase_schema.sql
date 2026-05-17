-- NEXUS ERP: EXHAUSTIVE MULTI-TENANT SCHEMA
-- Version: 2.0 (Enterprise Edition)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MIGRATIONS (Ensure compatibility with existing tables)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fullname') THEN
        ALTER TABLE public.users ADD COLUMN fullname TEXT;
    END IF;
END $$;

-- 1. ROLES & PERMISSIONS DEFINITION
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- OWNER, ADMIN, MANAGER, etc.
    description TEXT,
    hierarchy_level INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (Nexus Master Profile)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    fullname TEXT,
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMPANIES (Tenants)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    sector TEXT,
    owner_id UUID REFERENCES public.users(id),
    owner_email TEXT,
    subscription_tier TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMPANY MEMBERSHIPS (The Multi-Tenant Bridge)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    permissions JSONB DEFAULT '[]', -- Granular overrides
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- 5. AUDIT LOGS (Compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED ROLES
INSERT INTO public.roles (name, hierarchy_level) VALUES 
('OWNER', 0),
('SUPER_ADMIN', 10),
('ADMIN', 20),
('DIRECTOR', 30),
('MANAGER', 40),
('HR', 50),
('ACCOUNTANT', 60),
('EMPLOYEE', 70),
('GUEST', 90)
ON CONFLICT (name) DO NOTHING;

-- ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES: USERS
CREATE POLICY "Users view self" ON public.users FOR SELECT USING (firebase_uid = auth.uid()::text);
CREATE POLICY "Internal service sync" ON public.users FOR ALL USING (true); -- Protected by service role if needed

-- POLICIES: MULTI-TENANT ISOLATION
CREATE POLICY "Members view their company info" ON public.companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM public.company_members WHERE user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::text))
    );

CREATE POLICY "Members view sibling memberships" ON public.company_members
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM public.company_members WHERE user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::text))
    );

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_users_firebase ON public.users(firebase_uid);
