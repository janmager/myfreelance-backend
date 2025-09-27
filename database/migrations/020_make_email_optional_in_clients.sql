-- Migration: Make email column optional in clients table
-- Description: Removes NOT NULL constraint from email column to allow null values

-- Remove NOT NULL constraint from email column
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- Update the index to handle null values properly (if needed)
-- The existing index should work fine with null values
