-- Store Ordering & Role System Migration

-- 1. Link Users to Store Locations
-- This allows us to know which physical store a 'STORE' role user belongs to.
ALTER TABLE public.destination_locations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Store-Warehouse Group Visibility Configuration
-- MDs will use this to define which warehouse groups each store can see/order from.
CREATE TABLE IF NOT EXISTS public.store_warehouse_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.destination_locations(id) ON DELETE CASCADE,
    allowed_warehouse_group_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id)
);

-- 3. Store Orders Table
CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.destination_locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Processing, Approved, Rejected, Delivered
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Store Order Items Table
CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Helper View for Store Catalogue
-- This view implements the SKU-level launch check and warehouse group filtering.
CREATE OR REPLACE VIEW public.store_catalogue_view AS
WITH sku_shipment_stats AS (
    -- Identify which SKUs are in shipments and their launch status
    SELECT 
        upper(trim(sku)) as sku,
        bool_or(COALESCE(is_fully_launched, false) = true AND launch_week IS NOT NULL AND trim(launch_week) != '') as is_launched,
        count(*) as shipment_count
    FROM public.shipment_items
    GROUP BY upper(trim(sku))
),
store_authorized_inventory AS (
    -- Sum stock for each product per store across all its allowed warehouse groups
    SELECT 
        swc.store_id as viewer_store_id,
        ws.product_id,
        SUM(ws.quantity) as stock_qty
    FROM public.store_warehouse_configs swc
    JOIN public.warehouses w ON w.group_id = ANY(swc.allowed_warehouse_group_ids)
    JOIN public.warehouse_stocks ws ON w.id = ws.warehouse_id
    GROUP BY swc.store_id, ws.product_id
)
SELECT 
    p.*,
    (SELECT image_url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as primary_image_url,
    p.price,
    sai.stock_qty,
    sai.viewer_store_id
FROM public.products p
JOIN store_authorized_inventory sai ON p.id = sai.product_id
LEFT JOIN sku_shipment_stats sss ON upper(trim(p.sku)) = sss.sku
WHERE (
    -- Visibility Rules
    (sss.shipment_count IS NULL) -- Case A: Old product (not in any shipments) -> SHOW
    OR (sss.is_launched = true)  -- Case B: In shipments and officially launched -> SHOW
);

-- 6. Enable RLS
ALTER TABLE public.store_warehouse_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

-- 7. Policies
-- Store Warehouse Configs: Viewable by authenticated, manageable by Admin/MD
CREATE POLICY "Store configs viewable by authenticated" ON public.store_warehouse_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage store configs" ON public.store_warehouse_configs FOR ALL TO authenticated 
USING (upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR'));

-- Store Orders: Stores see only their own, Admins see all
CREATE POLICY "Users see own store orders" ON public.store_orders FOR SELECT TO authenticated 
USING (
    auth.uid() = user_id OR 
    upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR')
);

CREATE POLICY "Users create own store orders" ON public.store_orders FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update store orders" ON public.store_orders FOR UPDATE TO authenticated 
USING (upper(auth.jwt() -> 'user_metadata' ->> 'role') IN ('MD', 'ADMIN', 'SUPER_ADMIN', 'MERCHANDISER', 'ADMINISTRATOR'));

-- Store Order Items: Linked to order visibility
CREATE POLICY "Users see own order items" ON public.store_order_items FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id)
);

CREATE POLICY "Users insert own order items" ON public.store_order_items FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_store_warehouse_configs_updated_at BEFORE UPDATE ON public.store_warehouse_configs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_store_orders_updated_at BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
