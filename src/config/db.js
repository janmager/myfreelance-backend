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
                created_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
            )
        `;

        try { await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal'`; } catch (e) {}
        
        // Notes table
        await sql`
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT UNIQUE PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                client_id TEXT REFERENCES clients(client_id) ON DELETE SET NULL,
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
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}