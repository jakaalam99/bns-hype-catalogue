-- High-Performance Bulk Stock Upsert (Overwrite Logic)
CREATE OR REPLACE FUNCTION bulk_upsert_stock(p_items jsonb)
RETURNS void AS $$
BEGIN
  -- We use a single INSERT ... ON CONFLICT to handle updates efficiently
  INSERT INTO warehouse_stocks (product_id, warehouse_id, quantity, updated_at)
  SELECT 
    (item->>'product_id')::uuid,
    (item->>'warehouse_id')::uuid,
    (item->>'qty')::integer,
    now()
  FROM jsonb_array_elements(p_items) AS item
  ON CONFLICT (product_id, warehouse_id) 
  DO UPDATE SET 
    quantity = EXCLUDED.quantity,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION bulk_upsert_stock(jsonb) TO authenticated, service_role;
