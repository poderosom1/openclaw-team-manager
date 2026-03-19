/**
 * Database Connection Module
 * Uses better-sqlite3 synchronous API
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { readFileSync } from 'fs';
import { getDatabasePath } from '../core/utils';

let db: Database.Database | null = null;
let lastDbPath: string | null = null;

/**
 * Get database instance (singleton pattern)
 * 
 * Note: Throws error if database file doesn't exist
 * Reconnects if path changes
 */
export function getDatabase(dbPath?: string): Database.Database {
  const finalPath = dbPath || getDatabasePath();
  
  // If path changed, need to reconnect
  if (db && lastDbPath && lastDbPath !== finalPath) {
    console.log(`[DB] Path changed, reconnecting: ${finalPath}`);
    db.close();
    db = null;
  }

  if (db) {
    return db;
  }

  // If database file doesn't exist, throw error (don't auto-create)
  if (!fs.existsSync(finalPath)) {
    throw new Error(`数据库文件不存在: ${finalPath}`);
  }

  db = new Database(finalPath);
  lastDbPath = finalPath;

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Try to get database instance
 * 
 * Returns null instead of throwing error if database doesn't exist
 */
export function tryGetDatabase(dbPath?: string): Database.Database | null {
  try {
    return getDatabase(dbPath);
  } catch {
    return null;
  }
}

/**
 * Initialize database schema
 * 
 * This method creates database file and directory
 */
export function initializeDatabase(dbPath?: string): void {
  const finalPath = dbPath || getDatabasePath();
  const dbDir = path.dirname(finalPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // If database doesn't exist, create new one
  if (!fs.existsSync(finalPath)) {
    db = new Database(finalPath);
    db.pragma('foreign_keys = ON');
  } else {
    // If exists, use existing connection
    if (!db) {
      db = new Database(finalPath);
      db.pragma('foreign_keys = ON');
    }
  }

  // Read schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute entire schema directly (better-sqlite3 supports multiple statements)
  try {
    db.exec(schema);
  } catch (error) {
    // Ignore "already exists" errors
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error;
    }
  }

  // Execute migrations (fix CHECK constraints)
  migrateConfigChangesTable();
}

/**
 * Migrate config_changes table
 * 
 * Fix CHECK constraints to support new types
 */
function migrateConfigChangesTable(): void {
  if (!db) return;

  try {
    // Check if migration needed (try inserting new type)
    const testStmt = db.prepare("SELECT 1 FROM pragma_table_info('config_changes') WHERE name = 'change_type'");
    const result = testStmt.get();
    
    if (!result) {
      // Table doesn't exist, no migration needed
      return;
    }

    // Check if CHECK constraint contains new types
    // SQLite doesn't support directly modifying CHECK constraints, need to rebuild table
    // We can detect by attempting insert
    
    try {
      // Try inserting test record (using new type)
      const testId = `test_${Date.now()}`;
      db.exec(`BEGIN TRANSACTION`);
      db.prepare(`
        INSERT INTO config_changes (id, session_id, change_type, target_type, target_path, action, cleaned)
        VALUES (?, ?, 'config_update', 'gateway', 'test', 'update', 1)
      `).run(testId, 'test_session');
      // Success, delete test record
      db.prepare('DELETE FROM config_changes WHERE id = ?').run(testId);
      db.exec('COMMIT');
      // Migration done, no action needed
      return;
    } catch (insertError) {
      db.exec('ROLLBACK');
      // Insert failed, need migration
      console.log('[DB] Migrating config_changes table to support new types...');
    }

    // Execute migration: rebuild table
    db.exec(`
      BEGIN TRANSACTION;
      
      -- Create temp table to backup data
      CREATE TABLE config_changes_backup AS SELECT * FROM config_changes;
      
      -- Drop original table
      DROP TABLE config_changes;
      
      -- Create new table (with updated CHECK constraints)
      CREATE TABLE config_changes (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('agent_create', 'agent_delete', 'binding_create', 'binding_delete', 'channel_config', 'skill_pack_create', 'skill_pack_delete', 'job_create', 'job_delete', 'directory_create', 'config_update', 'other')),
        target_type TEXT NOT NULL CHECK(target_type IN ('agents.list', 'bindings', 'channels.feishu', 'skill_packs', 'jobs', 'directories', 'gateway', 'other')),
        target_path TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('add', 'remove', 'update')),
        old_value TEXT,
        new_value TEXT,
        related_id TEXT,
        description TEXT,
        cleaned BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Restore data
      INSERT INTO config_changes 
        SELECT id, session_id, change_type, target_type, target_path, action, old_value, new_value, related_id, description, cleaned, created_at 
        FROM config_changes_backup;
      
      -- Drop backup table
      DROP TABLE config_changes_backup;
      
      COMMIT;
    `);
    
    console.log('[DB] config_changes table migration complete');
  } catch (error) {
    console.warn('[DB] Migration warning:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Check if database is initialized (file exists)
 */
export function isDatabaseInitialized(dbPath?: string): boolean {
  const finalPath = dbPath || getDatabasePath();
  return fs.existsSync(finalPath);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reset database (delete and rebuild) - only reset system config, preserve existing data
 */
export function resetDatabase(dbPath?: string): void {
  const finalPath = dbPath || getDatabasePath();

  // If database doesn't exist, just initialize
  if (!fs.existsSync(finalPath)) {
    initializeDatabase(dbPath);
    return;
  }

  // Database exists, only reset company config, preserve other data
  const database = getDatabase(dbPath);
  
  try {
    // Delete company record (preserve Agent, task and other data)
    database.exec('DELETE FROM companies');
    console.log('已重置公司配置，保留已有数据');
  } catch (error) {
    console.error('重置失败:', error);
    throw error;
  }
}

/**
 * Full reset database (delete all data) - requires explicit call
 */
export function fullResetDatabase(dbPath?: string): void {
  const finalPath = dbPath || getDatabasePath();

  // Close existing connection
  closeDatabase();

  // Delete database file
  if (fs.existsSync(finalPath)) {
    fs.unlinkSync(finalPath);
  }

  // Reinitialize
  initializeDatabase(dbPath);
}

export default {
  getDatabase,
  initializeDatabase,
  isDatabaseInitialized,
  closeDatabase,
  resetDatabase
};