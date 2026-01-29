-- Run this in your Supabase SQL Editor to update the hotels table
-- This adds the bilingual address columns required for the new features.

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS address_ar TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS address_en TEXT;

-- Verify the columns were added
SELECT column_name FROM information_schema.columns WHERE table_name = 'hotels' AND column_name IN ('address_ar', 'address_en');
