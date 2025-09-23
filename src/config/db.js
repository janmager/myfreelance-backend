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
                register_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                updated_at TIMESTAMP DEFAULT (NOW() + INTERVAL '2 hours' + INTERVAL '2 hours'),
                logged_at TIMESTAMP DEFAULT NULL,
                push_notifications BOOLEAN DEFAULT TRUE,
                avatar TEXT DEFAULT '👤'
            )
        `;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}