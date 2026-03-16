/**
 * Config Tracker Service
 * 
 * Responsible for recording and reverting configuration changes
 */

import * as fs from 'fs';
import { getOpenClawJsonPath } from '../../core/utils';
import * as configChangeRepo from '../../db/repositories/config-change.repo';

export type ChangeType = 'agent_create' | 'agent_delete' | 'binding_create' | 'binding_delete' | 'channel_config' | 'skill_pack_create' | 'skill_pack_delete' | 'job_create' | 'job_delete' | 'directory_create' | 'config_update' | 'feishu_group_bind' | 'feishu_group_unbind' | 'other';
export type TargetType = 'agents.list' | 'bindings' | 'channels.feishu' | 'channels.feishu.groups' | 'skill_packs' | 'jobs' | 'directories' | 'gateway' | 'departments' | 'other';
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
      revertGatewayChange(config, change);
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
 */
function revertFeishuChange(config: Record<string, unknown>, change: configChangeRepo.ConfigChange): void {
  if (!config.channels) config.channels = {};
  const channels = config.channels as Record<string, unknown>;

  if (change.action === 'add') {
    // Revert add: delete feishu config
    delete channels.feishu;
  } else if (change.action === 'update' && change.old_value) {
    // Revert update: restore old config
    channels.feishu = JSON.parse(change.old_value);
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
      if (change.old_value !== undefined && change.old_value !== 'undefined') {
        try {
          target[lastKey] = JSON.parse(change.old_value);
        } catch {
          target[lastKey] = change.old_value === 'true' ? true : change.old_value === 'false' ? false : change.old_value;
        }
      } else {
        // No old value, delete the config
        delete target[lastKey];
      }
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