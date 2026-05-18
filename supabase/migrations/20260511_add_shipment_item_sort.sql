-- Add display_order column to shipment_items
ALTER TABLE shipment_items ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Optional: Initialize display_order with a sequence to preserve current order
-- This is a bit complex for a simple migration, but let's at least add the column.
