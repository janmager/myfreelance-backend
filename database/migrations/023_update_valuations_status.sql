-- Migration: Update valuations status values
-- Changes: 'accepted' -> 'active', 'rejected' -> 'cancelled', 'expired' -> 'inactive'

-- First, update existing data
UPDATE valuations SET status = 'active' WHERE status = 'accepted';
UPDATE valuations SET status = 'cancelled' WHERE status = 'rejected';
UPDATE valuations SET status = 'inactive' WHERE status = 'expired';

-- Drop the existing constraint
ALTER TABLE valuations DROP CONSTRAINT IF EXISTS valuations_status_check;

-- Add the new constraint with updated status values
ALTER TABLE valuations ADD CONSTRAINT valuations_status_check 
CHECK (status IN ('draft', 'sent', 'active', 'cancelled', 'inactive'));
