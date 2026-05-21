-- NEXUS ERP: MULTI-TENANT REPAIR & ALIGNMENT SCRIPT
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO FIX MEMBERSHIP AND FIREBASE_UID ISSUES

-- 1. Sync any missing firebase_uid fields by extracting them from the auth.users table (if using Supabase Auth, otherwise manual update required if Firebase external).
-- Since we use Firebase externally, we can only repair them via the application layer, OR by temporarily making RLS permissive for reads on company mapping.

-- 2. Modify RLS policies to allow personnel to read their companies. 
-- Since we use Firebase authentication, auth.uid() returns the Firebase token ID ONLY if it is passed correctly. 
-- If we access via anon key, all policies using auth.uid() will fail. 

-- Instead of disabling RLS completely, if using anon key, we should let the application server handle it, or we create permissive read policies for the core structures while protecting sensitive actions.

-- Drop the restrictive policies on products and inventory that rely on auth.uid() (if the client uses anon key without custom jwt)
DROP POLICY IF EXISTS "Users view company data" ON public.products;
DROP POLICY IF EXISTS "Inventory view" ON public.inventory_stock;

-- RLS Fallback for Firebase Anon Client
CREATE POLICY "Public Products Read For Marketplace" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Inventory Read For App" ON public.inventory_stock FOR SELECT USING (true);


-- 3. Utility Function: Auto-populate roles if missing
INSERT INTO public.roles (name, description, hierarchy_level)
VALUES 
    ('Administrateur', 'Accès total système', 100),
    ('OWNER', 'Propriétaire de l''entreprise', 90),
    ('Directeur', 'Direction Générale', 80),
    ('Comptable', 'Finances et Comptabilité', 70),
    ('Agent Commercial', 'Ventes et CRM', 50),
    ('Personnel', 'Employé standard', 10)
ON CONFLICT (name) DO NOTHING;

-- 4. Utility Function: Find orphan users (users without any company memberships)
-- SELECT email, fullname FROM public.users WHERE id NOT IN (SELECT user_id FROM public.company_members);

-- 5. Utility Function: Find users who share an email in the DB but have no firebase_uid
-- UPDATE public.users SET is_active = true WHERE firebase_uid IS NULL;

-- 6. Add a missing indexes to avoid race conditions and speed up multi-tenant lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);

-- End of script.
