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
                avatar TEXT DEFAULT '👤'
            )
        `;

        // Ensure new columns exist
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pl'`; } catch (e) {}
        
        await sql`
            CREATE TABLE IF NOT EXISTS clients (
                client_id TEXT UNIQUE PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
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
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}