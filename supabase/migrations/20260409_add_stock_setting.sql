-- Add configurable stock setting to store settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hide_out_of_stock boolean DEFAULT false;

-- Update get_filtered_categories to support stock filtering
CREATE OR REPLACE FUNCTION get_filtered_categories(
    search_text text DEFAULT '', 
    brand_text text DEFAULT '',
    hide_out_of_stock_param boolean DEFAULT false
)
RETURNS TABLE (category text) AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT p.category::text
  FROM products p 
  WHERE p.is_active = true 
    AND p.category IS NOT NULL
    AND (search_text = '' OR p.name ILIKE '%' || search_text || '%' OR p.sku ILIKE '%' || search_text || '%')
    AND (brand_text = '' OR p.brand = brand_text)
    AND (NOT hide_out_of_stock_param OR EXISTS (
        SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.quantity > 0
    ))
  ORDER BY p.category::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_filtered_brands to support stock filtering
CREATE OR REPLACE FUNCTION get_filtered_brands(
    search_text text DEFAULT '', 
    category_text text DEFAULT '',
    hide_out_of_stock_param boolean DEFAULT false
)
RETURNS TABLE (brand text) AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT p.brand::text
  FROM products p 
  WHERE p.is_active = true 
    AND p.brand IS NOT NULL
    AND (search_text = '' OR p.name ILIKE '%' || search_text || '%' OR p.sku ILIKE '%' || search_text || '%')
    AND (category_text = '' OR p.category = category_text)
    AND (NOT hide_out_of_stock_param OR EXISTS (
        SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.quantity > 0
    ))
  ORDER BY p.brand::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_filtered_categories(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_brands(text, text, boolean) TO anon, authenticated;
