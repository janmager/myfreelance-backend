-- Change files_gb to files_mb in limits table
UPDATE limits SET name = 'files_mb' WHERE name = 'files_gb';

-- Update the limit values to be in MB instead of GB
-- Assuming current values are in GB, multiply by 1024 to get MB
UPDATE limits 
SET premium_level_0 = premium_level_0 * 1024,
    premium_level_1 = premium_level_1 * 1024,
    premium_level_2 = premium_level_2 * 1024
WHERE name = 'files_mb';
