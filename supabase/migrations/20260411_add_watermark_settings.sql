-- Add watermark settings to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_enabled boolean DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_image_url text;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_size integer DEFAULT 25;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_position text DEFAULT 'top-center';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS watermark_opacity integer DEFAULT 70;
