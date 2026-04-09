-- Admin Products View with Calculated Stock
-- This view allows the admin to efficiently filter and sort by total stock levels

CREATE OR REPLACE VIEW admin_products_view AS
SELECT 
    p.*,
    COALESCE(SUM(ws.quantity), 0) as total_stock
FROM products p
LEFT JOIN warehouse_stocks ws ON p.id = ws.product_id
GROUP BY p.id;

-- Grant access to authenticated users
GRANT SELECT ON admin_products_view TO authenticated;
GRANT SELECT ON admin_products_view TO anon; -- If public access to stock data is needed via view

-- Helper function for accurate counts including stock status
CREATE OR REPLACE FUNCTION get_admin_product_stats()
RETURNS TABLE (
    total_all bigint, 
    total_active bigint, 
    total_hidden bigint, 
    total_in_stock bigint, 
    total_out_of_stock bigint
) AS $$
BEGIN
  RETURN QUERY SELECT 
    (SELECT COUNT(*) FROM products),
    (SELECT COUNT(*) FROM products WHERE is_active = true),
    (SELECT COUNT(*) FROM products WHERE is_active = false),
    (SELECT COUNT(*) FROM admin_products_view WHERE total_stock > 0),
    (SELECT COUNT(*) FROM admin_products_view WHERE total_stock <= 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_product_stats() TO authenticated, anon;
