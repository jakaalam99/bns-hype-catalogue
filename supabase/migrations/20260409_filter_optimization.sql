-- High-Performance Filter RPCs for Large Catalogues

-- 1. Get Distinct Categories based on search and brand filters
CREATE OR REPLACE FUNCTION get_filtered_categories(search_text text DEFAULT '', brand_text text DEFAULT '')
RETURNS TABLE (category text) AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT p.category 
  FROM products p 
  WHERE p.is_active = true 
    AND p.category IS NOT NULL
    AND (search_text = '' OR p.name ILIKE '%' || search_text || '%' OR p.sku ILIKE '%' || search_text || '%')
    AND (brand_text = '' OR p.brand = brand_text)
  ORDER BY p.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Distinct Brands based on search and category filters
CREATE OR REPLACE FUNCTION get_filtered_brands(search_text text DEFAULT '', category_text text DEFAULT '')
RETURNS TABLE (brand text) AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT p.brand 
  FROM products p 
  WHERE p.is_active = true 
    AND p.brand IS NOT NULL
    AND (search_text = '' OR p.name ILIKE '%' || search_text || '%' OR p.sku ILIKE '%' || search_text || '%')
    AND (category_text = '' OR p.category = category_text)
  ORDER BY p.brand;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_filtered_categories(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_filtered_brands(text, text) TO authenticated, anon;
