-- Seed data for clients table
-- This file contains sample client data for testing purposes

-- Insert sample clients for testing
INSERT INTO clients (
    name, 
    email, 
    phone, 
    address, 
    city, 
    state, 
    zip, 
    country, 
    nip, 
    user_id,
    status
) VALUES 
-- Clients for first user (assuming user_id exists)
(
    'Jan Kowalski',
    'jan.kowalski@example.com',
    '+48 123 456 789',
    'ul. Przykładowa 123',
    'Warszawa',
    'Mazowieckie',
    '00-001',
    'Polska',
    '1234567890',
    (SELECT user_id FROM users WHERE email = 'test@example.com' LIMIT 1),
    'active'
),
(
    'Anna Nowak',
    'anna.nowak@example.com',
    '+48 987 654 321',
    'ul. Testowa 456',
    'Kraków',
    'Małopolskie',
    '30-001',
    'Polska',
    '0987654321',
    (SELECT user_id FROM users WHERE email = 'test@example.com' LIMIT 1),
    'active'
),
(
    'Piotr Wiśniewski',
    'piotr.wisniewski@example.com',
    '+48 555 123 456',
    'ul. Próbna 789',
    'Gdańsk',
    'Pomorskie',
    '80-001',
    'Polska',
    '1122334455',
    (SELECT user_id FROM users WHERE email = 'test@example.com' LIMIT 1),
    'archived'
),
-- Clients for second user (if exists)
(
    'Maria Kowalczyk',
    'maria.kowalczyk@example.com',
    '+48 444 555 666',
    'ul. Przykładowa 321',
    'Wrocław',
    'Dolnośląskie',
    '50-001',
    'Polska',
    '5566778899',
    (SELECT user_id FROM users WHERE email = 'admin@example.com' LIMIT 1),
    'active'
),
(
    'Tomasz Zieliński',
    'tomasz.zielinski@example.com',
    '+48 777 888 999',
    'ul. Testowa 654',
    'Poznań',
    'Wielkopolskie',
    '60-001',
    'Polska',
    '9988776655',
    (SELECT user_id FROM users WHERE email = 'admin@example.com' LIMIT 1),
    'active'
)
ON CONFLICT (email, user_id) DO NOTHING;
