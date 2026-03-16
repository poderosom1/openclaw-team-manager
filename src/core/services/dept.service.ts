/**
 * Department (Team) Service
 */

import * as fs from 'fs';
import { departmentRepository } from '../../db/repositories/dept.repo';
import { agentRepository } from '../../db/repositories/agent.repo';
import { Department } from '../models/types';
import { generateDeptId, getOpenClawJsonPath } from '../utils';

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
   */
  delete(id: string): { success: boolean; message: string } {
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
    return { success: true, message: '团队已删除' };
  }

  /**
   * Remove feishu group binding from openclaw.json bindings
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
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
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
   */
  unbindFeishuGroup(id: string): void {
    const dept = departmentRepository.findById(id);
    if (dept?.feishu_group_id) {
      this.removeFeishuGroupBinding(dept.feishu_group_id);
    }
    departmentRepository.updateDept(id, { feishu_group_id: null });
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