-- Migration: Add valuations limit to limits table
-- Description: Adds default limit values for valuations feature

-- Insert valuations limit with default values
-- Free (level 0): 5 valuations
-- Premium (level 1): 25 valuations  
-- Gold (level 2): 100 valuations
INSERT INTO limits (name, premium_level_0, premium_level_1, premium_level_2) VALUES
('valuations', 5, 25, 100)
ON CONFLICT (name) DO NOTHING;
