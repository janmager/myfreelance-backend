-- Seed data for users table
-- This file contains sample user data for testing purposes

-- Insert sample users for testing
INSERT INTO users (
    email, 
    password, 
    name, 
    phone, 
    post_code, 
    city, 
    address, 
    country, 
    state, 
    client_type
) VALUES 
(
    'test@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
    'Jan Testowy',
    '+48 123 456 789',
    '00-001',
    'Warszawa',
    'ul. Testowa 123',
    'Polska',
    'active',
    'user'
),
(
    'admin@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
    'Admin Administrator',
    '+48 987 654 321',
    '00-002',
    'Warszawa',
    'ul. Adminowa 456',
    'Polska',
    'active',
    'admin'
),
(
    'user2@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
    'Anna Kowalska',
    '+48 555 123 456',
    '30-001',
    'Kraków',
    'ul. Krakowska 789',
    'Polska',
    'active',
    'user'
)
ON CONFLICT (email) DO NOTHING;
