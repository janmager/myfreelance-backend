-- Create limits table
CREATE TABLE IF NOT EXISTS limits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    premium_level_0 INTEGER NOT NULL DEFAULT 0,
    premium_level_1 INTEGER NOT NULL DEFAULT 0,
    premium_level_2 INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_limits_name ON limits(name);

-- Insert default limits
INSERT INTO limits (name, premium_level_0, premium_level_1, premium_level_2) VALUES
('clients', 10, 50, 100),
('projects', 5, 25, 100),
('notes', 20, 100, 500),
('contracts', 5, 25, 100),
('files_gb', 1, 5, 20),
('links', 10, 50, 200),
('tasks', 50, 250, 1000)
ON CONFLICT (name) DO NOTHING;
