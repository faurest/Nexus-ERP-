-- Migration: Multi-Tenant IAM & RLS
-- Description: Enforces Strict Tenant Isolation & SAGA Bootstrapping Gates

-- 1. Enforce RLS on Critical Tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Core IAM Security Definer Functions
CREATE OR REPLACE FUNCTION public.is_member_of(c_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE company_id = c_id 
      AND user_id = auth.uid()::text 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Row Level Security Policies

-- COMPANIES
DROP POLICY IF EXISTS "select_company_if_member" ON public.companies;
CREATE POLICY "select_company_if_member"
ON public.companies
FOR SELECT
USING (public.is_member_of(id));

-- WORKSPACES
DROP POLICY IF EXISTS "select_workspace_if_member" ON public.workspaces;
CREATE POLICY "select_workspace_if_member"
ON public.workspaces
FOR SELECT
USING (public.is_member_of(company_id));

-- MEMBERSHIPS
DROP POLICY IF EXISTS "select_own_membership" ON public.memberships;
DROP POLICY IF EXISTS "select_co_memberships" ON public.memberships;
DROP POLICY IF EXISTS "insert_membership_blocked" ON public.memberships;
DROP POLICY IF EXISTS "update_membership_blocked" ON public.memberships;
DROP POLICY IF EXISTS "delete_membership_blocked" ON public.memberships;

CREATE POLICY "select_own_membership"
ON public.memberships
FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "select_co_memberships"
ON public.memberships
FOR SELECT
USING (public.is_member_of(company_id));

CREATE POLICY "insert_membership_blocked" ON public.memberships FOR INSERT WITH CHECK (false);
CREATE POLICY "update_membership_blocked" ON public.memberships FOR UPDATE USING (false);
CREATE POLICY "delete_membership_blocked" ON public.memberships FOR DELETE USING (false);

-- USERS
-- Optional: Users can view other users they share a company with, but limited.
DROP POLICY IF EXISTS "select_co_users" ON public.users;
CREATE POLICY "select_co_users"
ON public.users
FOR SELECT
USING (
  id IN (
    SELECT user_id FROM public.memberships WHERE company_id IN (
      SELECT company_id FROM public.memberships WHERE user_id = auth.uid()::text AND status = 'active'
    )
  )
);


-- 4. SAGA Readiness Validation Functions

-- Check if OWNER exists
CREATE OR REPLACE FUNCTION public.check_owner_exists(p_company_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE company_id = p_company_id 
      AND role = 'owner' 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if EMPLOYEE exists
CREATE OR REPLACE FUNCTION public.check_employee_exists(p_company_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.memberships 
    WHERE company_id = p_company_id 
      AND role = 'employee' 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master Readiness Gate
CREATE OR REPLACE FUNCTION public.is_tenant_fully_ready(p_company_id text)
RETURNS boolean AS $$
DECLARE
  v_has_owner boolean;
  v_has_employee boolean;
  v_company_valid boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id AND status = 'active') INTO v_company_valid;
  
  v_has_owner := public.check_owner_exists(p_company_id);
  v_has_employee := public.check_employee_exists(p_company_id);
  
  RETURN v_company_valid AND v_has_owner AND v_has_employee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
