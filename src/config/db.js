import { neon } from "@neondatabase/serverless";
import 'dotenv/config';

// create a sql connection
export const sql = neon(process.env.DATABASE_URL);

export const API_URL = process.env.API_URL;

// Initialize database tables
export async function initializeDatabase() {
    try {
        // Set timezone to Europe/Warsaw for consistent timestamps
        await sql`SET timezone = 'Europe/Warsaw'`;
        // Ensure pgcrypto for UUIDs
        try { await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`; } catch (e) {}
        
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT UNIQUE PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email_token TEXT NOT NULL,
                password TEXT NOT NULL,
                type TEXT DEFAULT 'user',
                state TEXT DEFAULT 'to-confirm',
                phone TEXT,
                language TEXT DEFAULT 'pl',
                register_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                logged_at TIMESTAMP DEFAULT NULL,
                push_notifications BOOLEAN DEFAULT TRUE,
                avatar TEXT DEFAULT '👤',
                premium_level INTEGER DEFAULT 0
            )
        `;

        // Ensure new columns exist
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pl'`; } catch (e) {}
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_level INTEGER DEFAULT 0`; } catch (e) {}
        
        await sql`
            CREATE TABLE IF NOT EXISTS clients (
                client_id TEXT UNIQUE PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                zip TEXT,
                status TEXT DEFAULT 'active',
                country TEXT,
                nip TEXT,
                type TEXT DEFAULT 'personal',
                avatar TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
            )
        `;

        try { await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal'`; } catch (e) {}
        try { await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT ''`; } catch (e) {}
        
        // Make email column optional (remove NOT NULL constraint)
        try { await sql`ALTER TABLE clients ALTER COLUMN email DROP NOT NULL`; } catch (e) {}
        
        // Projects table (ensure created before FKs in other tables)
        await sql`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
                name TEXT NOT NULL,
                type TEXT CHECK (type IN ('client','private')) NOT NULL DEFAULT 'private',
                description TEXT,
                status TEXT CHECK (status IN ('draft','in_progress','active', 'completed', 'cancelled')) NOT NULL DEFAULT 'active',
                start_date DATE,
                end_date DATE,
                icon TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours')
            )
        `;
        // Ensure icon column exists on already-provisioned DBs
        try { await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT ''`; } catch (e) {}

        // Notes table
        await sql`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                type TEXT CHECK (type IN ('client','idea','private')) NOT NULL DEFAULT 'client',
                title TEXT,
                tags TEXT[] DEFAULT '{}',
                content TEXT,
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours')
            )
        `;

        // Tasks table
        await sql`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                type TEXT CHECK (type IN ('client','private')) NOT NULL DEFAULT 'client',
                title TEXT,
                priority TEXT CHECK (priority IN ('low','medium','high')) NOT NULL DEFAULT 'medium',
                status TEXT CHECK (status IN ('todo','in_progress','done')) NOT NULL DEFAULT 'todo',
                tags TEXT[] DEFAULT '{}',
                content TEXT,
                deadline_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours')
            )
        `;

        // Ensure project_id columns exist on already-provisioned DBs
        try { await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL`; } catch (e) {}
        try { await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL`; } catch (e) {}
        
        // Files table (runtime ensure for serverless envs)
        await sql`
            CREATE TABLE IF NOT EXISTS files (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                file_name TEXT NOT NULL,
                file_path TEXT,
                file_type TEXT,
                file_size BIGINT,
                status TEXT DEFAULT 'active',
                file_url TEXT,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
                file_created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                file_updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours')
            )
        `;

        // Contracts table (runtime ensure)
        await sql`
            CREATE TABLE IF NOT EXISTS contracts (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                signed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                files TEXT[] DEFAULT '{}',
                status TEXT DEFAULT 'draft',
                type TEXT NOT NULL DEFAULT 'umowa o współpracę',
                description TEXT
            )
        `;
        // Ensure extended statuses
        try { await sql`ALTER TABLE contracts ADD CONSTRAINT contracts_status_check CHECK (status IN ('draft','to_sign','active','archived','cancelled'))`; } catch (e) {}
        
        // Links table
        await sql`
            CREATE TABLE IF NOT EXISTS links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                link_url TEXT NOT NULL,
                client_id TEXT REFERENCES clients(client_id) ON DELETE CASCADE,
                project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
                link_title TEXT,
                link_description TEXT,
                link_type TEXT DEFAULT 'general',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;

        // Create indexes for better performance
        try { await sql`CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_links_client_id ON links(client_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_links_project_id ON links(project_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at)`; } catch (e) {}

        // Create trigger to automatically update updated_at
        try {
            await sql`
                CREATE OR REPLACE FUNCTION update_links_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            `;
        } catch (e) {}

        try {
            await sql`
                CREATE TRIGGER trigger_update_links_updated_at
                    BEFORE UPDATE ON links
                    FOR EACH ROW
                    EXECUTE FUNCTION update_links_updated_at()
            `;
        } catch (e) {}

        // Limits table
        await sql`
            CREATE TABLE IF NOT EXISTS limits (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                premium_level_0 INTEGER NOT NULL DEFAULT 0,
                premium_level_1 INTEGER NOT NULL DEFAULT 0,
                premium_level_2 INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours')
            )
        `;

        // Add indexes for better performance
        try { await sql`CREATE INDEX IF NOT EXISTS idx_limits_name ON limits(name)`; } catch (e) {}

        // Insert default limits
        try {
            await sql`
                INSERT INTO limits (name, premium_level_0, premium_level_1, premium_level_2) VALUES
                ('clients', 10, 50, 100),
                ('projects', 5, 25, 100),
                ('notes', 20, 100, 500),
                ('contracts', 5, 25, 100),
                ('files_mb', 1024, 5120, 20480),
                ('links', 10, 50, 200),
                ('tasks', 50, 250, 1000),
                ('valuations', 5, 25, 100)
                ON CONFLICT (name) DO NOTHING
            `;
        } catch (e) {}

        // User subscriptions table for Lemon Squeezy
        await sql`
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                subscription_id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                product_name VARCHAR(100) NOT NULL,
                lemon_squeezy_variant_id TEXT,
                lemon_squeezy_checkout_id TEXT,
                lemon_squeezy_order_id TEXT,
                lemon_squeezy_subscription_id TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                
                CONSTRAINT fk_user_subscriptions_user_id 
                    FOREIGN KEY (user_id) 
                    REFERENCES users(user_id) 
                    ON DELETE CASCADE,
                
                CONSTRAINT unique_user_product_active 
                    UNIQUE (user_id, product_name)
            )
        `;

        // Create indexes for user_subscriptions
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_squeezy_subscription_id ON user_subscriptions(lemon_squeezy_subscription_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_squeezy_checkout_id ON user_subscriptions(lemon_squeezy_checkout_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at ON user_subscriptions(created_at)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at)`; } catch (e) {}

        // Create trigger for user_subscriptions updated_at
        try {
            await sql`
                CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            `;
        } catch (e) {}

        try {
            await sql`
                CREATE TRIGGER trigger_update_user_subscriptions_updated_at
                    BEFORE UPDATE ON user_subscriptions
                    FOR EACH ROW
                    EXECUTE FUNCTION update_user_subscriptions_updated_at()
            `;
        } catch (e) {}

        // System table for portal settings
        await sql`
            CREATE TABLE IF NOT EXISTS system (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create index for system table
        try { await sql`CREATE INDEX IF NOT EXISTS idx_system_name ON system(name)`; } catch (e) {}

        // Create trigger for system table updated_at
        try {
            await sql`
                CREATE OR REPLACE FUNCTION update_system_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            `;
        } catch (e) {}

        try {
            await sql`
                CREATE TRIGGER trigger_update_system_updated_at
                    BEFORE UPDATE ON system
                    FOR EACH ROW
                    EXECUTE FUNCTION update_system_updated_at()
            `;
        } catch (e) {}

    // Create valuations table
    await sql`
        CREATE TABLE IF NOT EXISTS valuations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
            project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'active', 'cancelled', 'inactive')),
            total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_amount_net DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_amount_gross DECIMAL(10,2) NOT NULL DEFAULT 0,
            currency TEXT DEFAULT 'PLN',
            settlement_type TEXT DEFAULT 'przelew' CHECK (settlement_type IN ('przelew', 'faktura_vat', 'inne')),
            contract_type TEXT DEFAULT 'umowa_prywatna' CHECK (contract_type IN ('umowa_prywatna', 'umowa_zlecenie', 'bez_umowy', 'inne')),
            valid_until DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            sent_at TIMESTAMP WITH TIME ZONE,
            accepted_at TIMESTAMP WITH TIME ZONE,
            rejected_at TIMESTAMP WITH TIME ZONE,
            notes TEXT
        )
    `;

        // Create indexes for valuations table
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_user_id ON valuations(user_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_client_id ON valuations(client_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_project_id ON valuations(project_id)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_status ON valuations(status)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations(created_at)`; } catch (e) {}
        try { await sql`CREATE INDEX IF NOT EXISTS idx_valuations_valid_until ON valuations(valid_until)`; } catch (e) {}

        // Create trigger for valuations table updated_at
        try {
            await sql`
                CREATE OR REPLACE FUNCTION update_valuations_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            `;
        } catch (e) {}

        try {
            await sql`
                CREATE TRIGGER trigger_update_valuations_updated_at
                    BEFORE UPDATE ON valuations
                    FOR EACH ROW
                    EXECUTE FUNCTION update_valuations_updated_at()
            `;
        } catch (e) {}

        // Insert default system settings
        try {
            await sql`
                INSERT INTO system (name, value, description) VALUES
                ('maintenance_mode', '0', 'Maintenance mode: 0 = disabled, 1 = enabled')
                ON CONFLICT (name) DO NOTHING
            `;
        } catch (e) {}
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}