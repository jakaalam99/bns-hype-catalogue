-- Add description column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop and recreate the view to handle structural changes correctly
DROP VIEW IF EXISTS admin_products_view CASCADE;

CREATE VIEW admin_products_view AS
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
