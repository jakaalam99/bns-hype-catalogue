-- Drop if exists
DROP FUNCTION IF EXISTS public.get_store_remaining_quotas(UUID, TEXT[]);

-- Create RPC to calculate remaining store quotas server-side
CREATE OR REPLACE FUNCTION public.get_store_remaining_quotas(p_store_id UUID, p_skus TEXT[])
RETURNS TABLE (sku TEXT, remaining_quota INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_name TEXT;
BEGIN
    -- 1. Get the store name
    SELECT name INTO v_store_name FROM public.destination_locations WHERE id = p_store_id;

    IF v_store_name IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH unnested_skus AS (
        SELECT unnest(p_skus) as sku
    ),
    sku_allocations AS (
        SELECT 
            si.sku,
            CAST(COALESCE(SUM(sa.quantity), 0) AS INTEGER) as total_alloc
        FROM unnested_skus us
        JOIN public.shipment_items si ON us.sku = si.sku
        JOIN public.shipment_store_allocations sa ON si.id = sa.shipment_item_id AND sa.store_name = v_store_name
        GROUP BY si.sku
    ),
    sku_orders AS (
        SELECT 
            p.sku,
            CAST(COALESCE(SUM(soi.quantity), 0) AS INTEGER) as total_ordered
        FROM unnested_skus us
        JOIN public.products p ON us.sku = p.sku
        JOIN public.store_order_items soi ON p.id = soi.product_id
        JOIN public.store_orders so ON soi.order_id = so.id AND so.store_id = p_store_id AND so.status != 'Rejected'
        GROUP BY p.sku
    )
    SELECT 
        us.sku,
        COALESCE(a.total_alloc, 0) - COALESCE(o.total_ordered, 0) as remaining_quota
    FROM unnested_skus us
    LEFT JOIN sku_allocations a ON us.sku = a.sku
    LEFT JOIN sku_orders o ON us.sku = o.sku;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_store_remaining_quotas(UUID, TEXT[]) TO authenticated;
