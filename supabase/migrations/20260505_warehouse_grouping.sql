-- Warehouse Grouping System

-- 1. Create Warehouse Groups Table
CREATE TABLE IF NOT EXISTS public.warehouse_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add group_id to warehouses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'group_id') THEN
        ALTER TABLE public.warehouses ADD COLUMN group_id UUID REFERENCES public.warehouse_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.warehouse_groups ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Warehouse groups are viewable by authenticated users" ON public.warehouse_groups;
DROP POLICY IF EXISTS "Admins can manage warehouse groups" ON public.warehouse_groups;

CREATE POLICY "Warehouse groups are viewable by authenticated users" ON public.warehouse_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage warehouse groups" ON public.warehouse_groups FOR ALL TO authenticated 
USING (
    upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
)
WITH CHECK (
    upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
);

-- 5. Add grouping to destination_locations
CREATE TABLE IF NOT EXISTS public.destination_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'destination_locations' AND COLUMN_NAME = 'group_id') THEN
        ALTER TABLE public.destination_locations ADD COLUMN group_id UUID REFERENCES public.destination_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS for Destination Groups
ALTER TABLE public.destination_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Destination groups are viewable by authenticated users" ON public.destination_groups;
DROP POLICY IF EXISTS "Admins can manage destination groups" ON public.destination_groups;

CREATE POLICY "Destination groups are viewable by authenticated users" ON public.destination_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage destination groups" ON public.destination_groups FOR ALL TO authenticated 
USING (
    upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
)
WITH CHECK (
    upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
);
