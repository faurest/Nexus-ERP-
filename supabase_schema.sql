-- Nexus ERP: Supabase Schema for Multi-Tenant Membership
-- Author: Nexus Hub Senior Architect

-- 1. Table Users (Shadow of Firebase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  fullname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  sector TEXT,
  owner_id TEXT NOT NULL, -- firebase_uid of owner
  owner_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table Company Members (Junction Table)
CREATE TABLE IF NOT EXISTS public.company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Personnel',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firebase_uid, company_id)
);

-- ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- POLICIES: Users
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = firebase_uid);

-- POLICIES: Companies
CREATE POLICY "Members can view their companies" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM public.company_members 
      WHERE firebase_uid = auth.uid()::text AND status = 'active'
    )
    OR owner_id = auth.uid()::text
  );

-- POLICIES: Company Members
CREATE POLICY "Members can view membership details" ON public.company_members
  FOR SELECT USING (firebase_uid = auth.uid()::text);

-- HELPER: Function to sync with joining logic
-- Use this logic in your frontend or Edge Functions
