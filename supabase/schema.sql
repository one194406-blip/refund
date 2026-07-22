-- Create the refund registrations table
CREATE TABLE IF NOT EXISTS public.refund_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    register_number TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    course TEXT NOT NULL,
    batch_year TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    email TEXT,
    deposit_amount NUMERIC,
    remarks TEXT,
    admin_notes TEXT,
    signature_url TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create portal settings table
CREATE TABLE IF NOT EXISTS public.portal_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Insert default portal setting for registration mode
INSERT INTO public.portal_settings (key, value)
VALUES ('registration_active', '{"active": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.refund_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if they exist (allows running the script multiple times)
DROP POLICY IF EXISTS "Allow public read settings" ON public.portal_settings;
DROP POLICY IF EXISTS "Allow admin full access on settings" ON public.portal_settings;
DROP POLICY IF EXISTS "Allow public insert registrations" ON public.refund_registrations;
DROP POLICY IF EXISTS "Allow admin full access on registrations" ON public.refund_registrations;

-- RLS Policies for portal_settings:
-- 1. Public can read portal settings (so frontend knows if registration is open)
CREATE POLICY "Allow public read settings"
    ON public.portal_settings
    FOR SELECT
    USING (true);

-- 2. Only admin can update settings
CREATE POLICY "Allow admin full access on settings"
    ON public.portal_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- RLS Policies for refund_registrations:
-- 1. Public can insert registrations (Registration Mode)
CREATE POLICY "Allow public insert registrations"
    ON public.refund_registrations
    FOR INSERT
    WITH CHECK (true);

-- 2. Admins (authenticated users) can perform all operations
CREATE POLICY "Allow admin full access on registrations"
    ON public.refund_registrations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create a secure function (SECURITY DEFINER) for public status verification.
CREATE OR REPLACE FUNCTION public.verify_student_status(reg_num TEXT)
RETURNS TABLE (
    full_name TEXT,
    register_number TEXT,
    department TEXT,
    course TEXT,
    batch_year TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.full_name,
        r.register_number,
        r.department,
        r.course,
        r.batch_year,
        r.status,
        r.created_at
    FROM public.refund_registrations r
    WHERE UPPER(r.register_number) = UPPER(reg_num);
END;
$$ LANGUAGE plpgsql;

-- Storage Bucket Setup for Signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up existing storage policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin all access to signatures" ON storage.objects;

-- RLS policies for storage bucket:
-- Allow anyone to upload signature files
CREATE POLICY "Allow public uploads to signatures"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'signatures');

-- Allow public read of signature files
CREATE POLICY "Allow public read of signatures"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'signatures');

-- Allow admins to delete/update signatures
CREATE POLICY "Allow admin all access to signatures"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'signatures');
