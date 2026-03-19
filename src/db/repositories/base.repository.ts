/**
 * Base Repository
 * Provides generic CRUD operations
 */

import Database from 'better-sqlite3';
import { getDatabase } from '../index';

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Get database instance (fresh instance for each operation)
   */
  protected get db(): Database.Database {
    return getDatabase();
  }

  /**
   * Find single record by ID
   */
  findById(id: string): T | undefined {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    return this.db.prepare(sql).get(id) as T | undefined;
  }

  /**
   * Find all records
   */
  findAll(): T[] {
    const sql = `SELECT * FROM ${this.tableName}`;
    return this.db.prepare(sql).all() as T[];
  }

  /**
   * Find records by conditions
   */
  findWhere(conditions: Record<string, unknown>): T[] {
    const keys = Object.keys(conditions);
    const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
    const values = Object.values(conditions);
    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    return this.db.prepare(sql).all(...values) as T[];
  }

  /**
   * Find single record by conditions
   */
  findOneWhere(conditions: Record<string, unknown>): T | undefined {
    const results = this.findWhere(conditions);
    return results[0];
  }

  /**
   * Insert record
   */
  insert(data: Record<string, unknown>): Database.RunResult {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');
    const values = Object.values(data);
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    return this.db.prepare(sql).run(...values);
  }

  /**
   * Update record
   */
  update(id: string, data: Record<string, unknown>): Database.RunResult {
    const keys = Object.keys(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`;
    return this.db.prepare(sql).run(...values);
  }

  /**
   * Delete record
   */
  delete(id: string): Database.RunResult {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    return this.db.prepare(sql).run(id);
  }

  /**
   * Check if record exists
   */
  exists(id: string): boolean {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    const result = this.db.prepare(sql).get(id);
    return !!result;
  }

  /**
   * Count records
   */
  count(conditions?: Record<string, unknown>): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (conditions && Object.keys(conditions).length > 0) {
      const keys = Object.keys(conditions);
      const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
      const values = Object.values(conditions);
      sql += ` WHERE ${whereClause}`;
      const result = this.db.prepare(sql).get(...values) as { count: number };
      return result.count;
    }
    const result = this.db.prepare(sql).get() as { count: number };
    return result.count;
  }
}