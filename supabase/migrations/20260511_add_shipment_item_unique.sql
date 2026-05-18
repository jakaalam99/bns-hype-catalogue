-- Add unique constraint to shipment_items to prevent duplicate SKUs within the same shipment
-- This allows us to use UPSERT during import
ALTER TABLE shipment_items DROP CONSTRAINT IF EXISTS shipment_items_shipment_id_sku_key;
ALTER TABLE shipment_items ADD CONSTRAINT shipment_items_shipment_id_sku_key UNIQUE (shipment_id, sku);
