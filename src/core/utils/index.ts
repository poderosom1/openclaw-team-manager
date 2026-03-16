/**
 * Utility Functions Module
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// ID Generators
// ============================================

/**
 * Generate task ID
 * Format: task_YYYYMMDD_random_string
 */
export function generateTaskId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = uuidv4().slice(0, 8);
  return `task_${dateStr}_${random}`;
}

/**
 * Generate node ID
 * Format: node_random_string
 */
export function generateNodeId(): string {
  return `node_${uuidv4().slice(0, 12)}`;
}

/**
 * Generate Agent ID
 * Format: agent_random_string
 */
export function generateAgentId(): string {
  return `agent_${uuidv4().slice(0, 12)}`;
}

/**
 * Generate document ID
 * Format: doc_random_string
 */
export function generateDocId(): string {
  return `doc_${uuidv4().slice(0, 12)}`;
}

/**
 * Generate department ID
 * Format: dept_random_string
 */
export function generateDeptId(): string {
  return `dept_${uuidv4().slice(0, 8)}`;
}

/**
 * Generate job ID
 * Format: job_random_string
 */
export function generateJobId(): string {
  return `job_${uuidv4().slice(0, 8)}`;
}

/**
 * Generate skill pack ID
 * Format: skill_random_string
 */
export function generateSkillPackId(): string {
  return `skill_${uuidv4().slice(0, 8)}`;
}

/**
 * Generate message ID
 * Format: msg_random_string
 */
export function generateMessageId(): string {
  return `msg_${uuidv4().slice(0, 12)}`;
}

// ============================================
// Time Utilities
// ============================================

/**
 * Get current ISO timestamp string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format date to YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Format datetime to YYYY-MM-DD HH:mm:ss format
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// ============================================
// JSON Utilities
// ============================================

/**
 * Safe parse JSON, return default value on failure
 */
export function safeJsonParse<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Safe stringify JSON
 */
export function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj);
}

// ============================================
// Path Utilities (Follow OpenClaw Official Standard)
// ============================================

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Current OpenClaw root directory
 * Must be set via setOpenClawRoot() or TUI selection
 */
let currentOpenClawRoot: string | null = null;

/**
 * Default OpenClaw root directory (empty, user must specify)
 */
const DEFAULT_OPENCLAW_ROOT = '';

/**
 * Validate if directory is a valid OpenClaw root
 * Must have openclaw.json file
 */
export function isValidOpenClawRoot(dirPath: string): { valid: boolean; error?: string } {
  // Check if path exists
  if (!fs.existsSync(dirPath)) {
    return { valid: false, error: '目录不存在' };
  }

  // Check if it's a directory
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    return { valid: false, error: '路径不是目录' };
  }

  // Check if openclaw.json exists
  const openclawJsonPath = path.join(dirPath, 'openclaw.json');
  if (!fs.existsSync(openclawJsonPath)) {
    return { valid: false, error: '目录下不存在 openclaw.json 文件，请确认是否为 OpenClaw 工作目录' };
  }

  // Validate openclaw.json is valid JSON
  try {
    const content = fs.readFileSync(openclawJsonPath, 'utf-8');
    
    // Remove BOM if present
    let cleanContent = content;
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
      cleanContent = cleanContent.slice(1);
    }
    
    // Standard JSON doesn't support comments, parse directly
    JSON.parse(cleanContent);
    return { valid: true };
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    return { valid: false, error: `openclaw.json 文件格式无效: ${errorMsg}` };
  }
}

/**
 * Set OpenClaw root directory
 * Will validate if directory is valid
 */
export function setOpenClawRoot(dirPath: string): { success: boolean; error?: string } {
  const validation = isValidOpenClawRoot(dirPath);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  currentOpenClawRoot = dirPath;
  return { success: true };
}

/**
 * Get current OpenClaw root directory
 */
export function getOpenClawRoot(): string {
  return currentOpenClawRoot || DEFAULT_OPENCLAW_ROOT;
}

/**
 * Check if custom OpenClaw root is set
 */
export function hasCustomOpenClawRoot(): boolean {
  return currentOpenClawRoot !== null;
}

/**
 * Reset to default OpenClaw root directory
 */
export function resetOpenClawRoot(): void {
  currentOpenClawRoot = null;
}

/**
 * Get team directory (business data storage)
 */
export function getTeamRoot(): string {
  return path.join(getOpenClawRoot(), 'team');
}

/**
 * Get database path
 */
export function getDatabasePath(): string {
  return path.join(getTeamRoot(), 'team.db');
}

/**
 * Get task directory
 */
export function getTaskDir(taskId: string): string {
  return path.join(getTeamRoot(), 'tasks', taskId);
}

/**
 * Get role flow template directory
 */
export function getFlowsDir(): string {
  return path.join(getTeamRoot(), 'flows');
}

/**
 * Get agent workspace directory
 * Official standard: ~/.openclaw/workspace-<agentId>
 */
export function getAgentWorkspace(agentId: string): string {
  return path.join(getOpenClawRoot(), `workspace-${agentId}`);
}

/**
 * Get agent directory
 * Official standard: ~/.openclaw/agents/<agentId>/agent
 * Used for storing auth-profiles.json, models.json, etc.
 */
export function getAgentDir(agentId: string): string {
  return path.join(getOpenClawRoot(), 'agents', agentId, 'agent');
}

/**
 * Get agent sessions storage directory
 * Official standard: ~/.openclaw/agents/<agentId>/sessions
 */
export function getAgentSessionsDir(agentId: string): string {
  return path.join(getOpenClawRoot(), 'agents', agentId, 'sessions');
}

/**
 * Get openclaw.json config file path
 */
export function getOpenClawJsonPath(): string {
  return path.join(getOpenClawRoot(), 'openclaw.json');
}

/**
 * Get credentials directory
 * Official standard: ~/.openclaw/credentials
 * Used for storing channel authentication info
 */
export function getCredentialsDir(): string {
  return path.join(getOpenClawRoot(), 'credentials');
}

/**
 * Get Feishu credentials directory
 * Official standard: ~/.openclaw/credentials/feishu/<accountId>
 */
export function getFeishuCredentialsDir(accountId: string = 'default'): string {
  return path.join(getCredentialsDir(), 'feishu', accountId);
}

/**
 * Get agent's auth-profiles.json path
 * Official standard: ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
 */
export function getAuthProfilesPath(agentId: string): string {
  return path.join(getAgentDir(agentId), 'auth-profiles.json');
}

/**
 * Get agent's models.json path
 * Official standard: ~/.openclaw/agents/<agentId>/agent/models.json
 */
export function getModelsJsonPath(agentId: string): string {
  return path.join(getAgentDir(agentId), 'models.json');
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate ID format
 */
export function isValidId(id: string): boolean {
  return /^[a-z]+_[a-z0-9]+$/.test(id);
}

/**
 * Validate role type
 */
export function isValidRole(role: string): boolean {
  return ['assistant', 'manager', 'executor', 'reviewer'].includes(role);
}

/**
 * Validate task status
 */
export function isValidTaskStatus(status: string): boolean {
  return ['pending', 'in_progress', 'pending_acceptance', 'rejected', 'completed', 'finalized'].includes(status);
}

/**
 * Validate node status
 */
export function isValidNodeStatus(status: string): boolean {
  return ['pending', 'in_progress', 'pending_review', 'completed', 'failed'].includes(status);
}

// ============================================
// Logging Utilities
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  reset: '\x1b[0m'
};

/**
 * Simple log output
 */
export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = formatDateTime(new Date());
  const color = LOG_COLORS[level] || LOG_COLORS.reset;
  const reset = LOG_COLORS.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`, ...args);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args)
};

// Export template generator
export * from './template-generator';

// Export agent guide generator
export * from './agent-guide-generator';

// Note: Don't export openclaw-helper to avoid circular dependency
// Modules that need openclaw-helper should import directly