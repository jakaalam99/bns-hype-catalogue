-- New Drops System Migration

-- 1. New Drops Batches Table
CREATE TABLE IF NOT EXISTS public.new_drops_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. "Week 1 May 2026"
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. New Drops Items Table
-- Links products to batches with a custom notes field
CREATE TABLE IF NOT EXISTS public.new_drops_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.new_drops_batches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    notes TEXT, -- Free text box for MDs to configure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(batch_id, product_id)
);

-- 3. Enable RLS
ALTER TABLE public.new_drops_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_drops_items ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Viewable by all authenticated users (STORE, MD, ADMIN)
CREATE POLICY "New drops batches viewable by all" ON public.new_drops_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "New drops items viewable by all" ON public.new_drops_items FOR SELECT TO authenticated USING (true);

-- Manageable by ADMIN and MD roles
CREATE POLICY "New drops batches manageable by MD/Admin" ON public.new_drops_batches 
    FOR ALL TO authenticated 
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('ADMIN', 'MD')
    );

CREATE POLICY "New drops items manageable by MD/Admin" ON public.new_drops_items 
    FOR ALL TO authenticated 
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('ADMIN', 'MD')
    );
