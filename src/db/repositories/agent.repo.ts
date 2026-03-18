/**
 * Agent Repository
 */

import { BaseRepository } from './base.repository';
import { Agent, RoleType, AgentStatus } from '../../core/models/types';

export class AgentRepository extends BaseRepository<Agent> {
  constructor() {
    super('agents', 'id');
  }

  /**
   * 创建Agent
   */
  create(data: {
    id: string;
    name: string;
    department_id?: string;
    job_id?: string;
    role: RoleType;
    workspace_path?: string;
  }): Agent {
    const now = new Date().toISOString();
    this.insert({
      id: data.id,
      name: data.name,
      department_id: data.department_id || null,
      job_id: data.job_id || null,
      role: data.role,
      feishu_bot_id: null,
      workspace_path: data.workspace_path || null,
      status: 'active',
      last_active_at: null,
      created_at: now
    });
    return this.findById(data.id)!;
  }

  /**
   * 更新Agent
   */
  updateAgent(id: string, data: { name?: string; job?: string; status?: AgentStatus; feishu_bot_id?: string; workspace_path?: string }): void {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.job !== undefined) updateData.job_id = data.job;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.feishu_bot_id !== undefined) updateData.feishu_bot_id = data.feishu_bot_id;
    if (data.workspace_path !== undefined) updateData.workspace_path = data.workspace_path;

    if (Object.keys(updateData).length > 0) {
      this.update(id, updateData);
    }
  }

  /**
   * 按部门查询Agent
   */
  findByDepartment(departmentId: string): Agent[] {
    return this.findWhere({ department_id: departmentId });
  }

  /**
   * 按角色查询Agent
   */
  findByRole(role: RoleType): Agent[] {
    return this.findWhere({ role });
  }

  /**
   * 按部门和角色查询Agent
   */
  findByDepartmentAndRole(departmentId: string, role: RoleType): Agent[] {
    return this.findWhere({ department_id: departmentId, role });
  }

  /**
   * 获取部门的第一个指定角色的Agent（用于manager和reviewer，每个部门唯一）
   */
  findOneByDepartmentAndRole(departmentId: string, role: RoleType): Agent | undefined {
    return this.findOneWhere({ department_id: departmentId, role });
  }

  /**
   * 获取总助理（全局唯一，role=assistant）
   */
  getAssistant(): Agent | undefined {
    return this.findOneWhere({ role: 'assistant' });
  }

  /**
   * 检查部门是否已有指定角色的Agent
   */
  hasRoleInDepartment(departmentId: string, role: RoleType): boolean {
    const count = this.count({ department_id: departmentId, role });
    return count > 0;
  }

  /**
   * 按部门和职业查询执行者
   */
  findByDepartmentAndJob(departmentId: string, jobId: string): Agent | undefined {
    return this.findOneWhere({ department_id: departmentId, job_id: jobId, role: 'executor' });
  }

  /**
   * 更新最后活跃时间
   */
  updateLastActive(id: string): void {
    this.update(id, { last_active_at: new Date().toISOString() });
  }
}

export const agentRepository = new AgentRepository();