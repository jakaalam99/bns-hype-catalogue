-- Revert the unique constraint on shipment_items
ALTER TABLE shipment_items DROP CONSTRAINT IF EXISTS shipment_items_shipment_id_sku_key;
