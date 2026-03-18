/**
 * Config Tracker Service
 * 
 * Responsible for recording and reverting configuration changes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getOpenClawJsonPath, getOpenClawRoot } from '../../core/utils';
import * as configChangeRepo from '../../db/repositories/config-change.repo';

export type ChangeType = 'agent_create' | 'agent_delete' | 'binding_create' | 'binding_delete' | 'channel_config' | 'skill_pack_create' | 'skill_pack_delete' | 'job_create' | 'job_delete' | 'directory_create' | 'config_update' | 'feishu_group_bind' | 'feishu_group_unbind' | 'feishu_pairing_approve' | 'other';
export type TargetType = 'agents.list' | 'bindings' | 'channels.feishu' | 'channels.feishu.groups' | 'skill_packs' | 'jobs' | 'directories' | 'gateway' | 'departments' | 'credentials' | 'other';
export type ActionType = 'add' | 'remove' | 'update';

// Current session ID (stored in memory)
let currentSessionId: string | null = null;

/**
 * Set current session ID
 */
export function setCurrentSession(sessionId: string): void {
  currentSessionId = sessionId;
}

/**
 * Get current session ID
 */
export function getCurrentSession(): string | null {
  return currentSessionId;
}

/**
 * Record agent creation
 */
export function recordAgentCreate(agentId: string, agentConfig: Record<string, unknown>): void {
  if (!currentSessionId) {
    console.warn('警告：未设置会话ID，无法记录变更');
    return;
  }
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'agent_create',
    target_type: 'agents.list',
    target_path: `agents.list[?(@.id==='${agentId}')]`,
    action: 'add',
    new_value: JSON.stringify(agentConfig),
    related_id: agentId,
    description: `创建 Agent: ${agentConfig.name || agentId}`
  });
}

/**
 * Record agent deletion
 */
export function recordAgentDelete(agentId: string, oldConfig: Record<string, unknown>): void {
  if (!currentSessionId) {
    console.warn('警告：未设置会话ID，无法记录变更');
    return;
  }
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'agent_delete',
    target_type: 'agents.list',
    target_path: `agents.list[?(@.id==='${agentId}')]`,
    action: 'remove',
    old_value: JSON.stringify(oldConfig),
    related_id: agentId,
    description: `删除 Agent: ${oldConfig.name || agentId}`
  });
}

/**
 * Record binding creation
 */
export function recordBindingCreate(binding: Record<string, unknown>, relatedId?: string): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'binding_create',
    target_type: 'bindings',
    target_path: `bindings[${Date.now()}]`,
    action: 'add',
    new_value: JSON.stringify(binding),
    related_id: relatedId,
    description: `创建绑定: ${binding.agentId || 'unknown'}`
  });
}

/**
 * Record binding deletion
 */
export function recordBindingDelete(binding: Record<string, unknown>, relatedId?: string): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'binding_delete',
    target_type: 'bindings',
    target_path: `bindings[?]`,
    action: 'remove',
    old_value: JSON.stringify(binding),
    related_id: relatedId,
    description: `删除绑定: ${binding.agentId || 'unknown'}`
  });
}

/**
 * Record config change (generic)
 */
export function recordConfigChange(change: {
  change_type: string;
  action: ActionType;
  target_path: string;
  target_type?: string;
  old_value?: string;
  new_value?: string;
  related_id?: string;
  description?: string;
}): void {
  if (!currentSessionId) {
    console.warn('警告：未设置会话ID，无法记录变更');
    return;
  }
  configChangeRepo.recordChange(currentSessionId, {
    change_type: change.change_type as any,
    target_type: (change.target_type || 'other') as any,
    target_path: change.target_path,
    action: change.action,
    old_value: change.old_value,
    new_value: change.new_value,
    related_id: change.related_id,
    description: change.description
  });
}

/**
 * Record gateway config change
 */
export function recordGatewayConfigChange(configPath: string, oldValue: unknown, newValue: unknown, description: string): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'config_update',
    target_type: 'gateway',
    target_path: configPath,
    action: 'update',
    old_value: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
    new_value: JSON.stringify(newValue),
    description: description
  });
}

/**
 * Record feishu channel config
 */
export function recordFeishuConfig(config: Record<string, unknown>, oldConfig?: Record<string, unknown>): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'channel_config',
    target_type: 'channels.feishu',
    target_path: 'channels.feishu',
    action: oldConfig ? 'update' : 'add',
    old_value: oldConfig ? JSON.stringify(oldConfig) : undefined,
    new_value: JSON.stringify(config),
    description: '配置飞书渠道'
  });
}

/**
 * Record skill pack creation
 */
export function recordSkillPackCreate(skillPackId: string, skillPackConfig: Record<string, unknown>): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'skill_pack_create',
    target_type: 'skill_packs',
    target_path: `skill_packs[${skillPackId}]`,
    action: 'add',
    new_value: JSON.stringify(skillPackConfig),
    related_id: skillPackId,
    description: `创建技能包: ${skillPackConfig.name || skillPackId}`
  });
}

/**
 * Record skill pack deletion
 */
export function recordSkillPackDelete(skillPackId: string, oldConfig: Record<string, unknown>): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'skill_pack_delete',
    target_type: 'skill_packs',
    target_path: `skill_packs[${skillPackId}]`,
    action: 'remove',
    old_value: JSON.stringify(oldConfig),
    related_id: skillPackId,
    description: `删除技能包: ${oldConfig.name || skillPackId}`
  });
}

/**
 * Record job creation
 */
export function recordJobCreate(jobId: string, jobConfig: Record<string, unknown>): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'job_create',
    target_type: 'jobs',
    target_path: `jobs[${jobId}]`,
    action: 'add',
    new_value: JSON.stringify(jobConfig),
    related_id: jobId,
    description: `创建职业: ${jobConfig.name || jobId}`
  });
}

/**
 * Record job deletion
 */
export function recordJobDelete(jobId: string, oldConfig: Record<string, unknown>): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'job_delete',
    target_type: 'jobs',
    target_path: `jobs[${jobId}]`,
    action: 'remove',
    old_value: JSON.stringify(oldConfig),
    related_id: jobId,
    description: `删除职业: ${oldConfig.name || jobId}`
  });
}

/**
 * Record directory creation
 */
export function recordDirectoryCreate(dirPath: string, description?: string): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'directory_create',
    target_type: 'directories',
    target_path: dirPath,
    action: 'add',
    new_value: JSON.stringify({ path: dirPath }),
    related_id: dirPath.replace(/[^a-zA-Z0-9_-]/g, '_'),
    description: description || `创建目录: ${dirPath}`
  });
}

/**
 * Record feishu group binding
 */
export function recordFeishuGroupBind(deptId: string, deptName: string, groupId: string, oldGroupId?: string | null): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: oldGroupId ? 'feishu_group_bind' : 'feishu_group_bind',
    target_type: 'departments',
    target_path: `departments[${deptId}].feishu_group_id`,
    action: oldGroupId ? 'update' : 'add',
    old_value: oldGroupId || undefined,
    new_value: groupId,
    related_id: deptId,
    description: `绑定飞书群: ${deptName} → ${groupId}`
  });
}

/**
 * Record feishu group unbinding
 */
export function recordFeishuGroupUnbind(deptId: string, deptName: string, oldGroupId: string): void {
  if (!currentSessionId) return;
  configChangeRepo.recordChange(currentSessionId, {
    change_type: 'feishu_group_unbind',
    target_type: 'departments',
    target_path: `departments[${deptId}].feishu_group_id`,
    action: 'remove',
    old_value: oldGroupId,
    related_id: deptId,
    description: `解绑飞书群: ${deptName} (${oldGroupId})`
  });
}

/**
 * Revert all config changes for a session
 */
export function revertSessionConfigChanges(sessionId: string): { success: boolean; message: string; revertedCount: number } {
  try {
    const configPath = getOpenClawJsonPath();
    if (!fs.existsSync(configPath)) {
      return { success: true, message: '配置文件不存在', revertedCount: 0 };
    }

    // Read config
    let content = fs.readFileSync(configPath, 'utf-8');
    
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // Parse JSON directly (standard JSON doesn't support comments)
    const config = JSON.parse(content);

    // Get uncleaned changes for this session (in reverse order)
    const changes = configChangeRepo.getUncleanedBySession(sessionId).reverse();
    
    let revertedCount = 0;

    for (const change of changes) {
      try {
        revertChange(config, change);
        revertedCount++;
      } catch (e) {
        console.warn(`撤销变更失败: ${change.id}`, e);
      }
    }

    // Write back config
    // 在写入前清理所有 null 值和空对象，避免配置无效
    cleanupConfigNulls(config);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Mark as cleaned
    configChangeRepo.markAllCleanedBySession(sessionId);

    return { success: true, message: '配置已撤销', revertedCount };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      revertedCount: 0
    };
  }
}

/**
 * Revert all config changes (legacy compatibility)
 */
export function revertAllConfigChanges(): { success: boolean; message: string; revertedCount: number } {
  if (!currentSessionId) {
    return { success: false, message: '未设置会话ID', revertedCount: 0 };
  }
  return revertSessionConfigChanges(currentSessionId);
}

/**
 * Revert single change
 */
function revertChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  switch (change.target_type) {
    case 'agents.list':
      revertAgentChange(config, change);
      break;
    case 'bindings':
      revertBindingChange(config, change);
      break;
    case 'channels.feishu':
      revertFeishuChange(config, change);
      break;
    case 'gateway':
      // 跳过 gateway 配置的撤销
      // gateway.controlUi.allowInsecureAuth 是工具运行需要的基础配置
      // 重置时应该保留，不应该撤销
      console.log(`[重置] 跳过 gateway 配置撤销: ${change.target_path}`);
      break;
    case 'directories':
      // Directory deletion handled separately during reset
      break;
    case 'skill_packs':
    case 'jobs':
      // Skill packs and jobs are in database tables, cleared during reset
      break;
    case 'departments':
      // Department group binding is in database, needs separate handling
      revertDepartmentChange(change);
      break;
    case 'credentials':
      // Credentials changes (feishu pairing etc.)
      revertCredentialsChange(change);
      break;
    default:
      console.warn(`未知的变更类型: ${change.target_type}`);
  }
}

/**
 * Revert agent related changes
 */
function revertAgentChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  if (!config.agents) config.agents = { list: [] };
  const agents = config.agents as Record<string, unknown>;
  if (!agents.list) agents.list = [];

  const agentsList = agents.list as Array<Record<string, unknown>>;

  if (change.action === 'add') {
    // Revert add: remove the agent
    const index = agentsList.findIndex(a => a.id === change.related_id);
    if (index >= 0) {
      agentsList.splice(index, 1);
    }
  } else if (change.action === 'remove') {
    // Revert remove: restore the agent
    if (change.old_value) {
      const agentConfig = JSON.parse(change.old_value);
      agentsList.push(agentConfig);
    }
  } else if (change.action === 'update' && change.old_value) {
    // Revert update: restore old config
    const index = agentsList.findIndex(a => a.id === change.related_id);
    if (index >= 0) {
      const oldAgentConfig = JSON.parse(change.old_value);
      agentsList[index] = oldAgentConfig;
    }
  }
}

/**
 * Revert binding related changes
 */
function revertBindingChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  if (!config.bindings) config.bindings = [];

  const bindings = config.bindings as Array<Record<string, unknown>>;

  if (change.action === 'add') {
    // Revert add: remove the binding
    if (change.new_value) {
      const binding = JSON.parse(change.new_value);
      const index = bindings.findIndex(b => 
        b.agentId === binding.agentId && 
        JSON.stringify(b.match) === JSON.stringify(binding.match)
      );
      if (index >= 0) {
        bindings.splice(index, 1);
      }
    }
  } else if (change.action === 'remove') {
    // Revert remove: restore the binding
    if (change.old_value) {
      const binding = JSON.parse(change.old_value);
      bindings.push(binding);
    }
  } else if (change.action === 'update' && change.old_value) {
    // Revert update: restore old config
    const oldBinding = JSON.parse(change.old_value);
    const index = bindings.findIndex(b => b.agentId === oldBinding.agentId);
    if (index >= 0) {
      bindings[index] = oldBinding;
    }
  }
}

/**
 * Revert feishu config changes
 * 
 * 支持两种粒度的变更：
 * 1. 整体配置变更 (target_path: 'channels.feishu')
 * 2. 单个账号变更 (target_path: 'channels.feishu.accounts.{agentId}')
 */
function revertFeishuChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  if (!config.channels) config.channels = {};
  const channels = config.channels as Record<string, unknown>;

  // 确保飞书配置存在
  if (!channels.feishu) {
    return;
  }
  
  const feishuConfig = channels.feishu as Record<string, unknown>;

  // 根据 target_path 判断变更粒度
  if (change.target_path.startsWith('channels.feishu.accounts.')) {
    // 单个账号变更：只删除/恢复该账号
    const agentId = change.target_path.replace('channels.feishu.accounts.', '');
    
    if (!feishuConfig.accounts) {
      return;
    }
    
    const feishuAccounts = feishuConfig.accounts as Record<string, unknown>;
    
    if (change.action === 'add') {
      // 新增账号：删除该账号
      if (feishuAccounts[agentId]) {
        delete feishuAccounts[agentId];
        console.log(`[重置] 已删除飞书账号配置: ${agentId}`);
      }
    } else if (change.action === 'update' && change.old_value) {
      // 更新账号：恢复旧配置
      try {
        const oldConfig = JSON.parse(change.old_value);
        if (oldConfig[agentId]) {
          feishuAccounts[agentId] = oldConfig[agentId];
          console.log(`[重置] 已恢复飞书账号配置: ${agentId}`);
        }
      } catch (e) {
        console.warn('恢复飞书账号配置失败:', e);
      }
    } else if (change.action === 'remove' && change.old_value) {
      // 删除账号：恢复该账号
      try {
        const oldConfig = JSON.parse(change.old_value);
        if (oldConfig[agentId]) {
          feishuAccounts[agentId] = oldConfig[agentId];
          console.log(`[重置] 已恢复飞书账号配置: ${agentId}`);
        }
      } catch (e) {
        console.warn('恢复飞书账号配置失败:', e);
      }
    }
    
    // 如果没有账号了，删除 accounts 字段
    if (Object.keys(feishuAccounts).length === 0) {
      delete feishuConfig.accounts;
    }
  } else if (change.target_path === 'channels.feishu') {
    // 整体配置变更
    if (change.action === 'add') {
      // 新增整体配置：只删除该会话添加的账号，保留基础配置
      if (change.new_value) {
        try {
          const newConfig = JSON.parse(change.new_value);
          
          if (newConfig.accounts && feishuConfig.accounts) {
            const feishuAccounts = feishuConfig.accounts as Record<string, unknown>;
            const newAccounts = newConfig.accounts as Record<string, unknown>;
            
            for (const accountId of Object.keys(newAccounts)) {
              if (feishuAccounts[accountId]) {
                delete feishuAccounts[accountId];
                console.log(`[重置] 已删除飞书账号配置: ${accountId}`);
              }
            }
            
            if (Object.keys(feishuAccounts).length === 0) {
              delete feishuConfig.accounts;
            }
          }
        } catch (e) {
          console.warn('解析飞书配置变更失败:', e);
        }
      }
    } else if (change.action === 'update' && change.old_value) {
      // 更新整体配置：合并旧配置
      try {
        const oldConfig = JSON.parse(change.old_value);
        
        if (oldConfig.accounts) {
          if (!feishuConfig.accounts) {
            feishuConfig.accounts = {};
          }
          const feishuAccounts = feishuConfig.accounts as Record<string, unknown>;
          const oldAccounts = oldConfig.accounts as Record<string, unknown>;
          
          for (const [accountId, accountConfig] of Object.entries(oldAccounts)) {
            feishuAccounts[accountId] = accountConfig;
          }
        }
      } catch (e) {
        console.warn('恢复飞书配置失败:', e);
      }
    }
  }
}

/**
 * Revert gateway config changes
 */
function revertGatewayChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  if (!config.gateway) config.gateway = {};
  const gateway = config.gateway as Record<string, unknown>;

  // Parse target_path, e.g. "gateway.controlUi.allowInsecureAuth"
  const pathParts = change.target_path.split('.');
  
  if (pathParts.length >= 2) {
    // Skip the first "gateway" part
    const configPath = pathParts.slice(1);
    
    // Navigate to target location
    let target: Record<string, unknown> = gateway;
    for (let i = 0; i < configPath.length - 1; i++) {
      const key = configPath[i];
      if (!target[key]) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }
    
    const lastKey = configPath[configPath.length - 1];
    
    if (change.action === 'add' || change.action === 'update') {
      // Revert add/update: restore old value or delete
      if (change.old_value !== undefined && change.old_value !== 'undefined' && change.old_value !== null && change.old_value !== 'null') {
        try {
          const parsed = JSON.parse(change.old_value);
          // 确保不是 null
          if (parsed !== null) {
            target[lastKey] = parsed;
          } else {
            delete target[lastKey];
          }
        } catch {
          // 尝试直接转换
          if (change.old_value === 'true') {
            target[lastKey] = true;
          } else if (change.old_value === 'false') {
            target[lastKey] = false;
          } else if (change.old_value !== 'null') {
            target[lastKey] = change.old_value;
          } else {
            delete target[lastKey];
          }
        }
      } else {
        // No old value or old value is null, delete the config
        delete target[lastKey];
      }
    }
  }
  
  // 清理空对象
  cleanupEmptyObjects(gateway);
}

/**
 * 递归清理空对象
 */
function cleanupEmptyObjects(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      cleanupEmptyObjects(nested);
      if (Object.keys(nested).length === 0) {
        delete obj[key];
      }
    }
    // 删除 null 值
    if (value === null) {
      delete obj[key];
    }
  }
}

/**
 * 清理配置中的 null 值和空对象
 */
function cleanupConfigNulls(config: Record<string, unknown>): void {
  cleanupEmptyObjects(config);
  
  // 特殊处理 gateway.controlUi
  const gateway = config.gateway as Record<string, unknown> | undefined;
  if (gateway?.controlUi) {
    const controlUi = gateway.controlUi as Record<string, unknown>;
    // 删除 null 值
    for (const key of Object.keys(controlUi)) {
      if (controlUi[key] === null) {
        delete controlUi[key];
      }
    }
    // 如果 controlUi 为空，删除整个对象
    if (Object.keys(controlUi).length === 0) {
      delete gateway.controlUi;
    }
  }
}

/**
 * Get change summary (for display)
 */
export function getChangesSummary(): string {
  const stats = configChangeRepo.getChangeStats();
  const changes = configChangeRepo.getAllChanges();
  
  if (changes.length === 0) {
    return '无配置变更记录';
  }

  const lines: string[] = ['配置变更记录：'];
  
  for (const [type, count] of Object.entries(stats)) {
    lines.push(`  ${type}: ${count} 条`);
  }
  
  lines.push(`  总计: ${changes.length} 条`);
  
  return lines.join('\n');
}

/**
 * Revert department related changes (feishu group binding etc.)
 */
function revertDepartmentChange(change: configChangeRepo.ConfigChange): void {
  // Need to operate through database
  // Use dynamic import to avoid circular dependency
  try {
    const { departmentRepository } = require('../../db/repositories/dept.repo');
    
    if (!change.related_id) return;
    
    const deptId = change.related_id;
    
    if (change.action === 'add') {
      // Revert binding: clear group ID
      departmentRepository.update(deptId, { feishu_group_id: null });
    } else if (change.action === 'remove' && change.old_value) {
      // Revert unbinding: restore group ID
      departmentRepository.update(deptId, { feishu_group_id: change.old_value });
    } else if (change.action === 'update' && change.old_value) {
      // Revert update: restore old group ID
      departmentRepository.update(deptId, { feishu_group_id: change.old_value });
    }
  } catch (e) {
    console.warn('撤销事业部变更失败:', e);
  }
}

/**
 * Revert credentials related changes (feishu pairing etc.)
 * 
 * 清除飞书配对授权信息：
 * - 从 feishu-{accountId}-allowFrom.json 中移除用户
 * - 从 feishu-allowFrom.json 中移除用户
 */
function revertCredentialsChange(change: configChangeRepo.ConfigChange): void {
  if (change.change_type === 'feishu_pairing_approve' && change.action === 'add') {
    // 解析变更内容
    if (!change.new_value) return;
    
    try {
      const data = JSON.parse(change.new_value);
      const accountId = data.accountId;
      const userId = data.userId;
      
      if (!accountId || !userId) return;
      
      // 获取凭证目录
      const openclawRoot = getOpenClawRoot();
      const credentialsDir = openclawRoot 
        ? path.join(openclawRoot, 'credentials')
        : path.join(os.homedir(), '.openclaw', 'credentials');
      
      // 要清理的文件列表
      const fileNames = [
        'feishu-allowFrom.json',
        `feishu-${accountId}-allowFrom.json`,
        'feishu-default-allowFrom.json'
      ];
      
      for (const fileName of fileNames) {
        const filePath = path.join(credentialsDir, fileName);
        
        if (!fs.existsSync(filePath)) continue;
        
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          let allowFrom: string[] = JSON.parse(content) || [];
          
          // 移除该用户
          const index = allowFrom.indexOf(userId);
          if (index >= 0) {
            allowFrom.splice(index, 1);
            console.log(`[重置] 已从 ${fileName} 移除用户: ${userId}`);
            
            if (allowFrom.length > 0) {
              fs.writeFileSync(filePath, JSON.stringify(allowFrom, null, 2), 'utf-8');
            } else {
              // 如果没有用户了，删除文件
              fs.unlinkSync(filePath);
              console.log(`[重置] 已删除空文件: ${fileName}`);
            }
          }
        } catch (e) {
          console.warn(`处理 ${fileName} 失败:`, e);
        }
      }
    } catch (e) {
      console.warn('撤销飞书配对授权失败:', e);
    }
  }
}