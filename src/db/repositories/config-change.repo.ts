/**
 * 配置变更记录仓库
 */

import { getDatabase } from '../index';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigChange {
  id: string;
  session_id: string;
  change_type: 'agent_create' | 'agent_delete' | 'binding_create' | 'binding_delete' | 'channel_config' | 'skill_pack_create' | 'skill_pack_delete' | 'job_create' | 'job_delete' | 'directory_create' | 'config_update' | 'feishu_group_bind' | 'feishu_group_unbind' | 'other';
  target_type: 'agents.list' | 'bindings' | 'channels.feishu' | 'channels.feishu.groups' | 'skill_packs' | 'jobs' | 'directories' | 'gateway' | 'departments' | 'other';
  target_path: string;
  action: 'add' | 'remove' | 'update';
  old_value?: string;
  new_value?: string;
  related_id?: string;
  description?: string;
  cleaned: boolean;
  created_at: string;
}

/**
 * 记录配置变更
 */
export function recordChange(sessionId: string, change: Omit<ConfigChange, 'id' | 'session_id' | 'cleaned' | 'created_at'>): string {
  const db = getDatabase();
  const id = `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  db.prepare(`
    INSERT INTO config_changes (id, session_id, change_type, target_type, target_path, action, old_value, new_value, related_id, description, cleaned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, sessionId, change.change_type, change.target_type, change.target_path, change.action, 
        change.old_value || null, change.new_value || null, change.related_id || null, change.description || null);
  
  return id;
}

/**
 * 获取指定会话的所有配置变更
 */
export function getBySession(sessionId: string): ConfigChange[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config_changes WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as ConfigChange[];
}

/**
 * 获取指定会话未清理的配置变更
 */
export function getUncleanedBySession(sessionId: string): ConfigChange[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config_changes WHERE session_id = ? AND cleaned = 0 ORDER BY created_at ASC').all(sessionId) as ConfigChange[];
}

/**
 * 获取所有配置变更
 */
export function getAllChanges(): ConfigChange[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config_changes ORDER BY created_at ASC').all() as ConfigChange[];
}

/**
 * 获取指定类型的配置变更
 */
export function getChangesByType(targetType: ConfigChange['target_type']): ConfigChange[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config_changes WHERE target_type = ? ORDER BY created_at ASC').all(targetType) as ConfigChange[];
}

/**
 * 获取指定关联ID的配置变更
 */
export function getChangesByRelatedId(relatedId: string): ConfigChange[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM config_changes WHERE related_id = ? ORDER BY created_at ASC').all(relatedId) as ConfigChange[];
}

/**
 * 标记指定会话的所有变更为已清理
 */
export function markAllCleanedBySession(sessionId: string): void {
  const db = getDatabase();
  db.prepare("UPDATE config_changes SET cleaned = 1 WHERE session_id = ?").run(sessionId);
}

/**
 * 清空所有配置变更记录
 */
export function clearAllChanges(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM config_changes').run();
}

/**
 * 获取变更统计
 */
export function getChangeStats(): Record<string, number> {
  const db = getDatabase();
  const stats = db.prepare(`
    SELECT target_type, COUNT(*) as count 
    FROM config_changes 
    GROUP BY target_type
  `).all() as Array<{ target_type: string; count: number }>;
  
  return stats.reduce((acc, row) => {
    acc[row.target_type] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 获取指定会话的变更统计
 */
export function getChangeStatsBySession(sessionId: string): { total: number; byType: Record<string, number> } {
  const db = getDatabase();
  const total = db.prepare("SELECT COUNT(*) as count FROM config_changes WHERE session_id = ? AND cleaned = 0").get(sessionId) as { count: number };
  
  const stats = db.prepare(`
    SELECT target_type, COUNT(*) as count 
    FROM config_changes 
    WHERE session_id = ? AND cleaned = 0
    GROUP BY target_type
  `).all(sessionId) as Array<{ target_type: string; count: number }>;
  
  const byType = stats.reduce((acc, row) => {
    acc[row.target_type] = row.count;
    return acc;
  }, {} as Record<string, number>);
  
  return { total: total.count, byType };
}