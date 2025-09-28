-- Migration 021: Create system table for portal settings
-- This table stores system-wide settings that can be managed by administrators

CREATE TABLE IF NOT EXISTS system (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_system_name ON system(name);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_system_updated_at
    BEFORE UPDATE ON system
    FOR EACH ROW
    EXECUTE FUNCTION update_system_updated_at();

-- Insert default system settings
INSERT INTO system (name, value, description) VALUES
('maintenance_mode', '0', 'Maintenance mode: 0 = disabled, 1 = enabled')
ON CONFLICT (name) DO NOTHING;