/**
 * 初始化会话仓库
 */

import { tryGetDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface InitSession {
  id: string;
  openclaw_root: string;
  assistant_name: string;
  status: 'active' | 'reset';
  created_at: string;
  reset_at?: string;
}

/**
 * 创建新的初始化会话
 */
export function create(assistantName: string, openclawRoot: string): InitSession {
  const db = tryGetDatabase();
  if (!db) {
    throw new Error('数据库未初始化');
  }
  
  const id = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
  
  db.prepare(`
    INSERT INTO init_sessions (id, openclaw_root, assistant_name, status, created_at)
    VALUES (?, ?, ?, 'active', datetime('now'))
  `).run(id, openclawRoot, assistantName);
  
  return {
    id,
    openclaw_root: openclawRoot,
    assistant_name: assistantName,
    status: 'active',
    created_at: new Date().toISOString()
  };
}

/**
 * 获取当前活跃的会话
 * 
 * 如果数据库不存在，返回 null
 */
export function getActive(): InitSession | null {
  const db = tryGetDatabase();
  if (!db) {
    return null;
  }
  
  try {
    return db.prepare("SELECT * FROM init_sessions WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get() as InitSession | null;
  } catch {
    return null;
  }
}

/**
 * 获取最新会话（无论状态）
 */
export function getLatest(): InitSession | null {
  const db = tryGetDatabase();
  if (!db) {
    return null;
  }
  
  try {
    return db.prepare("SELECT * FROM init_sessions ORDER BY created_at DESC LIMIT 1").get() as InitSession | null;
  } catch {
    return null;
  }
}

/**
 * 根据ID获取会话
 */
export function getById(id: string): InitSession | null {
  const db = tryGetDatabase();
  if (!db) {
    return null;
  }
  
  try {
    return db.prepare("SELECT * FROM init_sessions WHERE id = ?").get(id) as InitSession | null;
  } catch {
    return null;
  }
}

/**
 * 标记会话为已重置
 */
export function markReset(sessionId: string): void {
  const db = tryGetDatabase();
  if (!db) {
    return;
  }
  
  db.prepare(`
    UPDATE init_sessions 
    SET status = 'reset', reset_at = datetime('now') 
    WHERE id = ?
  `).run(sessionId);
}

/**
 * 检查是否有活跃会话
 */
export function hasActiveSession(): boolean {
  const db = tryGetDatabase();
  if (!db) {
    return false;
  }
  
  try {
    const result = db.prepare("SELECT COUNT(*) as count FROM init_sessions WHERE status = 'active'").get() as { count: number };
    return result.count > 0;
  } catch {
    return false;
  }
}