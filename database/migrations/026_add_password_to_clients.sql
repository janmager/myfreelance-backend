-- Migration: Add password column to clients table
-- Description: Adds password column for client portal access

ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';

-- Create index for password lookups (if we'll use it for authentication)
CREATE INDEX IF NOT EXISTS idx_clients_password ON clients(password) WHERE password != '';

