-- PHASE 8: GLOBAL ADMINS TABLE

CREATE TABLE IF NOT EXISTS public.global_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed defaults
INSERT INTO public.global_admins (email) 
VALUES 
    ('hackeurfaurest@gmail.com'),
    ('dangafelicite@gmail.com'),
    ('yaoubaboubakary43@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- UPDATE Function
CREATE OR REPLACE FUNCTION public.is_global_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.global_admins 
        WHERE email = (SELECT email FROM public.users WHERE firebase_uid = auth.uid()::text LIMIT 1)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Expose global admins read safely
ALTER TABLE public.global_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read global admins" ON public.global_admins;
CREATE POLICY "Read global admins" ON public.global_admins FOR SELECT USING (true);
