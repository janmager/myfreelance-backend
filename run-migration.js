import { sql } from './src/config/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = join(__dirname, 'database', 'migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL by semicolons and execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await sql.query(statement);
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running migration ${migrationFile}:`, error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  console.error('Example: node run-migration.js 026_add_password_to_clients.sql');
  process.exit(1);
}

runMigration(migrationFile).then(() => {
  console.log('Migration completed');
  process.exit(0);
});

