-- Add premium_level column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_level INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN users.premium_level IS 'Premium level: 0 = darmowe, 1 = premium, 2 = gold';

-- Update existing users to have premium_level = 0 if NULL
UPDATE users SET premium_level = 0 WHERE premium_level IS NULL;
