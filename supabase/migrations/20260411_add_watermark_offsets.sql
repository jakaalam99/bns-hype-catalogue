-- Add flexible offset settings to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_offset_x integer DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_offset_y integer DEFAULT 0;
