-- Create shipments system tables

-- 1. Shipments Table
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Upcoming', -- Upcoming, Arrived, Received
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Shipment Items Table
CREATE TABLE IF NOT EXISTS public.shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    barcode TEXT,
    brand TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    srp NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    launch_week TEXT,
    is_fully_launched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Shipment Store Allocations Table
CREATE TABLE IF NOT EXISTS public.shipment_store_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_item_id UUID REFERENCES public.shipment_items(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(shipment_item_id, store_name)
);

-- 4. Shipment Logs Table
CREATE TABLE IF NOT EXISTS public.shipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_store_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- SELECT: All authenticated users
CREATE POLICY "Shipments are viewable by authenticated users" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shipment items are viewable by authenticated users" ON public.shipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shipment allocations are viewable by authenticated users" ON public.shipment_store_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shipment logs are viewable by authenticated users" ON public.shipment_logs FOR SELECT TO authenticated USING (true);

-- ALL: MD, ADMIN, SUPER_ADMIN can manage everything
CREATE POLICY "Admins and MD can manage shipments" ON public.shipments FOR ALL TO authenticated 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "Admins and MD can manage shipment items" ON public.shipment_items FOR ALL TO authenticated 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN')
);

-- UPDATE: All authenticated users can update store allocations
CREATE POLICY "All authenticated users can update allocations" ON public.shipment_store_allocations FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);

-- INSERT: All authenticated users can insert allocations (for initial setup by non-MD if needed, but MD usually does it)
CREATE POLICY "All authenticated users can insert allocations" ON public.shipment_store_allocations FOR INSERT TO authenticated 
WITH CHECK (true);

-- INSERT: Logs can be inserted by anyone authenticated
CREATE POLICY "Anyone authenticated can insert logs" ON public.shipment_logs FOR INSERT TO authenticated 
WITH CHECK (true);

-- Triggers for updated_at
-- (Assuming update_updated_at_column already exists from other migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipments_updated_at') THEN
        CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipment_store_allocations_updated_at') THEN
        CREATE TRIGGER update_shipment_store_allocations_updated_at BEFORE UPDATE ON public.shipment_store_allocations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
