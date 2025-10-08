-- Add friendly_name column to newsletter table
ALTER TABLE newsletter ADD COLUMN IF NOT EXISTS friendly_name TEXT DEFAULT '';

