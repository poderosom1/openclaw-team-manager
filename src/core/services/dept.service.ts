/**
 * Department (Team) Service
 */

import * as fs from 'fs';
import { departmentRepository } from '../../db/repositories/dept.repo';
import { agentRepository } from '../../db/repositories/agent.repo';
import { Department } from '../models/types';
import { generateDeptId, getOpenClawJsonPath } from '../utils';
import { getGatewayRestartReminder } from '../utils/openclaw-helper';
import * as configTracker from './config-tracker.service';

export class DeptService {
  /**
   * Create department (team)
   */
  create(data: { name: string; id?: string }): { success: boolean; department?: Department; message: string } {
    try {
      const deptId = data.id || generateDeptId();
      const department = departmentRepository.create(deptId, data.name);
      return { success: true, department, message: '团队创建成功' };
    } catch (error) {
      return { success: false, message: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Get department by ID
   */
  getById(id: string): Department | undefined {
    return departmentRepository.findById(id);
  }

  /**
   * List all departments (teams)
   */
  listAll(): Department[] {
    return departmentRepository.findAll();
  }

  /**
   * Update department (team)
   */
  update(id: string, data: { name?: string; feishu_group_id?: string }): void {
    departmentRepository.updateDept(id, data);
  }

  /**
   * Delete department (team)
   * Note: Must delete all agents in the department first
   * 
   * @returns success, message, and restartReminder if Gateway restart is needed
   */
  delete(id: string): { success: boolean; message: string; restartReminder?: string } {
    // Check if there are agents
    const agents = agentRepository.findByDepartment(id);
    if (agents.length > 0) {
      return {
        success: false,
        message: `无法删除：团队下还有 ${agents.length} 个Agent，请先删除这些Agent`
      };
    }

    // Get department info for cleaning up feishu group binding
    const dept = departmentRepository.findById(id);
    
    // Clean up feishu group binding (if any)
    // Note: This is user-initiated deletion, clean binding directly without recording to config_changes
    if (dept?.feishu_group_id) {
      this.removeFeishuGroupBinding(dept.feishu_group_id);
    }

    departmentRepository.deleteDept(id);

    // Return success with restart reminder (Gateway restart is needed to disconnect Feishu WebSocket)
    return { 
      success: true, 
      message: '团队已删除',
      restartReminder: getGatewayRestartReminder()
    };
  }

  /**
   * Remove feishu group binding from openclaw.json
   * 
   * Cleans up:
   * 1. bindings - remove group bindings for this groupId
   * 2. channels.feishu.groupAllowFrom - remove groupId from whitelist
   * 3. channels.feishu.groups[groupId] - remove group-specific config
   * 
   * This is user-initiated operation, delete binding directly without recording to config_changes
   * Reset will not restore user-deleted content
   */
  private removeFeishuGroupBinding(groupId: string): void {
    try {
      const configPath = getOpenClawJsonPath();
      if (!fs.existsSync(configPath)) return;

      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      let configChanged = false;

      // 1. Remove bindings for this group
      if (config.bindings && Array.isArray(config.bindings)) {
        const originalLength = config.bindings.length;
        config.bindings = config.bindings.filter(
          (b: { match?: { channel?: string; peer?: { kind?: string; id?: string } } }) => {
            const match = b.match;
            return !(match?.channel === 'feishu' && 
                     match?.peer?.kind === 'group' && 
                     match?.peer?.id === groupId);
          }
        );
        
        if (config.bindings.length < originalLength) {
          configChanged = true;
          console.log(`[飞书群解绑] 已移除 ${originalLength - config.bindings.length} 个绑定记录`);
        }
      }

      // 2. Remove groupId from groupAllowFrom whitelist
      const channels = config.channels as Record<string, unknown> | undefined;
      const feishuConfig = channels?.feishu as Record<string, unknown> | undefined;
      
      if (feishuConfig?.groupAllowFrom && Array.isArray(feishuConfig.groupAllowFrom)) {
        const groupAllowFrom = feishuConfig.groupAllowFrom as string[];
        const originalLength = groupAllowFrom.length;
        feishuConfig.groupAllowFrom = groupAllowFrom.filter(
          (id: string) => id !== groupId
        );
        
        if ((feishuConfig.groupAllowFrom as string[]).length < originalLength) {
          configChanged = true;
          console.log(`[飞书群解绑] 已从白名单移除群: ${groupId}`);
        }
      }

      // 3. Remove group-specific config (requireMention, etc.)
      if (feishuConfig?.groups && typeof feishuConfig.groups === 'object') {
        const groups = feishuConfig.groups as Record<string, unknown>;
        if (groups[groupId]) {
          delete groups[groupId];
          configChanged = true;
          console.log(`[飞书群解绑] 已移除群配置: ${groupId}`);
        }
      }

      // Save config if any changes were made
      if (configChanged) {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    } catch (error) {
      console.warn(`警告：移除飞书群绑定失败: ${error}`);
    }
  }

  /**
   * Bind feishu group
   */
  bindFeishuGroup(id: string, groupId: string): void {
    departmentRepository.updateDept(id, { feishu_group_id: groupId });
  }

  /**
   * Unbind feishu group (user-initiated operation)
   * 
   * @returns success, message, and restartReminder if Gateway restart is needed
   */
  unbindFeishuGroup(id: string): { success: boolean; message: string; restartReminder?: string } {
    const dept = departmentRepository.findById(id);
    const oldGroupId = dept?.feishu_group_id;
    
    if (oldGroupId) {
      // Record the unbinding for reset to potentially restore
      configTracker.recordFeishuGroupUnbind(id, dept?.name || id, oldGroupId);
      
      // Clean up openclaw.json bindings and group config
      this.removeFeishuGroupBinding(oldGroupId);
    }
    
    departmentRepository.updateDept(id, { feishu_group_id: null });

    // Return success with restart reminder (Gateway restart is needed to disconnect Feishu WebSocket)
    return { 
      success: true, 
      message: '飞书群已解绑',
      restartReminder: getGatewayRestartReminder()
    };
  }

  /**
   * Get department statistics
   */
  getStats(id: string): {
    agent_count: number;
    manager_count: number;
    executor_count: number;
    reviewer_count: number;
  } {
    const agents = agentRepository.findByDepartment(id);
    return {
      agent_count: agents.length,
      manager_count: agents.filter(a => a.role === 'manager').length,
      executor_count: agents.filter(a => a.role === 'executor').length,
      reviewer_count: agents.filter(a => a.role === 'reviewer').length
    };
  }
}

export const deptService = new DeptService();