-- PHASE 7: AUDIT LOGS

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    performed_by TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and setup policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view logs, insert is restricted via service role ideally or allowed
DROP POLICY IF EXISTS "Insert audit logs" ON public.audit_logs;
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Read audit logs" ON public.audit_logs;
CREATE POLICY "Read audit logs" ON public.audit_logs FOR SELECT USING (public.is_global_admin());
