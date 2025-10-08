-- Migration: Add slug column to clients table
-- Description: Adds slug column for client portal public URLs

ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT '';

-- Create unique index for slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_slug_unique ON clients(slug) WHERE slug != '';

-- Create regular index for lookups
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);

