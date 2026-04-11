-- Add watermark padding to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_padding integer DEFAULT 20;
