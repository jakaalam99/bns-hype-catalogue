-- Optimize Admin Products View
-- Add has_images flag using an efficient EXISTS subquery
CREATE OR REPLACE VIEW admin_products_view AS
SELECT 
    p.*,
    COALESCE((
        SELECT SUM(ws.quantity) 
        FROM warehouse_stocks ws 
        WHERE ws.product_id = p.id
    ), 0) as total_stock,
    EXISTS (
        SELECT 1 
        FROM product_images pi 
        WHERE pi.product_id = p.id
    ) as has_images
FROM products p;

-- Update the stats function to use the new view efficiency if needed
-- (The existing function is already quite efficient using direct counts)
