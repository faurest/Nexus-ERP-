-- NEXUS ERP: ADVANCED RLS & MULTI-TENANT BACKEND-FIRST SECURITY MIGRATION

-- 1. Enable RLS on core tables securely
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 2. Core Security Functions (Backend-first JWT / Auth verification)
-- We rely on firebase_uid mapped to the users table
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS UUID AS $$
    SELECT id FROM public.users WHERE firebase_uid = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_global_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE firebase_uid = auth.uid()::text 
        AND email IN ('hackeurfaurest@gmail.com', 'dangafelicite@gmail.com', 'yaoubaboubakary43@gmail.com')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_company(check_company_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE user_id = public.current_user_id()
        AND company_id = check_company_id
        AND status = 'active'
    ) OR public.is_global_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.resolve_effective_permissions(check_company_id UUID) RETURNS JSONB AS $$
    SELECT r.permissions
    FROM public.company_members cm
    JOIN public.roles r ON cm.role_id = r.id
    WHERE cm.user_id = public.current_user_id()
    AND cm.company_id = check_company_id
    AND cm.status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Apply Strict RLS Policies

-- USERS TABLE
DROP POLICY IF EXISTS "Read own profile" ON public.users;
CREATE POLICY "Read own profile" ON public.users FOR SELECT USING (
    firebase_uid = auth.uid()::text OR public.is_global_admin()
);
DROP POLICY IF EXISTS "Update own profile" ON public.users;
CREATE POLICY "Update own profile" ON public.users FOR UPDATE USING (
    firebase_uid = auth.uid()::text
);
-- Allow creating profile automatically (Firebase mapping)
DROP POLICY IF EXISTS "Insert profile (Anon fallback)" ON public.users;
CREATE POLICY "Insert profile (Anon fallback)" ON public.users FOR INSERT WITH CHECK (true);

-- COMPANIES TABLE
DROP POLICY IF EXISTS "Access affiliated companies" ON public.companies;
CREATE POLICY "Access affiliated companies" ON public.companies FOR SELECT USING (
    public.can_access_company(id)
);
DROP POLICY IF EXISTS "Create company" ON public.companies;
CREATE POLICY "Create company" ON public.companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update company" ON public.companies;
CREATE POLICY "Update company" ON public.companies FOR UPDATE USING (
    public.can_access_company(id)
);

-- COMPANY_MEMBERS TABLE
DROP POLICY IF EXISTS "View company memberships" ON public.company_members;
CREATE POLICY "View company memberships" ON public.company_members FOR SELECT USING (
    public.can_access_company(company_id)
);
DROP POLICY IF EXISTS "Join company" ON public.company_members;
CREATE POLICY "Join company" ON public.company_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update membership" ON public.company_members;
CREATE POLICY "Update membership" ON public.company_members FOR UPDATE USING (
    public.can_access_company(company_id)
);

-- ROLES TABLE
DROP POLICY IF EXISTS "Read roles publicly" ON public.roles;
CREATE POLICY "Read roles publicly" ON public.roles FOR SELECT USING (true);


-- 4. Re-securing the Ecosystem using new functions
DROP POLICY IF EXISTS "Users view company data" ON public.products;
CREATE POLICY "Users view company data" ON public.products FOR ALL USING (
    public.can_access_company(company_id) OR (is_marketplace_visible = TRUE)
);

DROP POLICY IF EXISTS "Inventory view" ON public.inventory_stock;
CREATE POLICY "Inventory view" ON public.inventory_stock FOR ALL USING (
    warehouse_id IN (SELECT id FROM public.warehouses WHERE public.can_access_company(company_id))
);

-- IMPORTANT FALLBACK: Because this app currently resolves via Anon Key (Firebase SDK handles auth separately), 
-- these functions rely on `auth.uid()` which is NULL if we don't sync JWTs to Supabase.
-- For production, this requires an Edge Function to exchange Firebase JWT for Supabase JWT, 
-- or we disable these specific read blocks while preserving insertion rules.
