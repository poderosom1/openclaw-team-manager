/**
 * Agent Service
 * 
 * Follows OpenClaw official standard directory structure and config format
 */

import * as path from 'path';
import * as fs from 'fs';
import { agentRepository } from '../../db/repositories/agent.repo';
import { jobRepository } from '../../db/repositories/job.repo';
import { skillPackRepository } from '../../db/repositories/skill-pack.repo';
import { Agent, RoleType, AgentStatus } from '../models/types';
import { generateAgentId, getFlowsDir, getOpenClawJsonPath, getAgentWorkspace, getAgentDir, getAgentSessionsDir } from '../utils';
import {
  syncOpenClawConfig,
  removeAgentFromConfig,
  createAgentDirectories,
  createAgentFiles
} from '../utils/openclaw-helper';
import * as configTracker from './config-tracker.service';

export class AgentService {
  /**
   * Create agent
   * 
   * Complete flow:
   * 1. Parameter validation
   * 2. Create directory structure (workspace, agentDir, sessions)
   * 3. Create guide files (AGENTS.md, SOUL.md, USER.md, MEMORY.md, auth-profiles.json)
   * 4. Create database record
   * 5. Sync openclaw.json config
   */
  create(data: {
    id?: string;
    name: string;
    department_id?: string;
    role: RoleType;
    job_id?: string;
  }): { success: boolean; agent?: Agent; message: string } {
    try {
      // If manager or reviewer, check if department already has this role
      if (data.department_id && (data.role === 'manager' || data.role === 'reviewer')) {
        if (agentRepository.hasRoleInDepartment(data.department_id, data.role)) {
          return { success: false, message: `该事业部已存在${data.role === 'manager' ? '管理者' : '审核者'}，每个事业部只能有一个` };
        }
      }

      // Generate ID
      const agentId = data.id || generateAgentId();

      // Check if ID already exists
      if (agentRepository.exists(agentId)) {
        return { success: false, message: `Agent ID ${agentId} 已存在` };
      }

      // Get workspace path
      const workspacePath = getAgentWorkspace(agentId);
      const agentDir = getAgentDir(agentId);

      // Create directory structure
      createAgentDirectories(agentId);

      // Get job and skill pack info (for executor)
      let jobName: string | undefined;
      let skillPacks: Array<{ id: string; name: string; content: string }> = [];

      if (data.role === 'executor' && data.job_id) {
        const job = jobRepository.findById(data.job_id);
        if (job) {
          jobName = job.name;

          // Get skill pack content
          if (job.skill_pack_ids) {
            try {
              const skillPackIds = JSON.parse(job.skill_pack_ids);
              for (const spId of skillPackIds) {
                const content = skillPackRepository.getContent(spId);
                if (content) {
                  skillPacks.push({
                    id: spId,
                    name: content.name,
                    content: JSON.stringify(content, null, 2)
                  });
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Create agent files
      createAgentFiles(agentId, {
        name: data.name,
        role: data.role,
        departmentId: data.department_id
      });

      // Create database record
      const now = new Date().toISOString();
      const agent: Agent = {
        id: agentId,
        name: data.name,
        department_id: data.department_id || null,
        job_id: data.job_id || null,
        role: data.role,
        feishu_bot_id: null,
        workspace_path: workspacePath,
        status: 'active',
        last_active_at: null,
        created_at: now
      };

      agentRepository.insert(agent as unknown as Record<string, unknown>);

      // Sync openclaw.json
      syncOpenClawConfig(agent as any);

      // Record agent creation
      const agentConfig: Record<string, unknown> = {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        department_id: agent.department_id,
        workspace: agent.workspace_path
      };
      configTracker.recordAgentCreate(agentId, agentConfig);

      return { success: true, agent, message: 'Agent创建成功' };
    } catch (error) {
      return { success: false, message: `创建失败: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Get agent by ID
   */
  getById(id: string): Agent | undefined {
    return agentRepository.findById(id);
  }

  /**
   * Get assistant (global, unique)
   */
  getAssistant(): Agent | undefined {
    return agentRepository.getAssistant();
  }

  /**
   * Get agent by department and role
   */
  getByDepartmentAndRole(departmentId: string, role: RoleType): Agent | Agent[] | undefined {
    if (role === 'manager' || role === 'reviewer') {
      // Each department has at most one manager/reviewer
      return agentRepository.findOneByDepartmentAndRole(departmentId, role);
    } else {
      // Executor can have multiple
      return agentRepository.findByDepartmentAndRole(departmentId, role);
    }
  }

  /**
   * List all agents
   */
  listAll(): Agent[] {
    return agentRepository.findAll();
  }

  /**
   * List agents by department
   */
  listByDepartment(departmentId: string): Agent[] {
    return agentRepository.findByDepartment(departmentId);
  }

  /**
   * List agents by role
   */
  listByRole(role: RoleType): Agent[] {
    return agentRepository.findByRole(role);
  }

  /**
   * Update agent
   */
  update(id: string, data: { name?: string; job?: string; status?: AgentStatus; feishu_bot_id?: string; workspace_path?: string }): { success: boolean; message: string } {
    const agent = agentRepository.findById(id);
    if (!agent) {
      return { success: false, message: 'Agent不存在' };
    }

    agentRepository.updateAgent(id, data);
    return { success: true, message: 'Agent已更新' };
  }

  /**
   * Delete agent
   * 
   * Note: Cannot delete assistant
   * Will clean up:
   * - Workspace directory
   * - Agent directory
   * - Sessions directory
   * - openclaw.json config
   * - Bindings
   */
  delete(id: string): { success: boolean; message: string } {
    // Cannot delete assistant
    const agent = agentRepository.findById(id);
    if (!agent) {
      return { success: false, message: 'Agent不存在' };
    }
    if (agent.role === 'assistant') {
      return { success: false, message: '不能删除总助理' };
    }

    // Remove from OpenClaw config
    removeAgentFromConfig(id);

    // Remove from bindings
    this.removeAgentBindings(id);

    // Record change (for undo)
    configTracker.recordAgentDelete(id, {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department_id: agent.department_id,
      workspace: agent.workspace_path
    });

    // Delete directories
    this.deleteAgentDirectories(id);

    // Delete database record
    agentRepository.delete(id);

    return { success: true, message: 'Agent已删除' };
  }

  /**
   * Remove agent bindings from openclaw.json
   */
  private removeAgentBindings(agentId: string): void {
    try {
      const configPath = getOpenClawJsonPath();
      if (!fs.existsSync(configPath)) return;

      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      if (config.bindings && Array.isArray(config.bindings)) {
        config.bindings = config.bindings.filter(
          (b: { agentId?: string }) => b.agentId !== agentId
        );
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    } catch (error) {
      console.warn(`警告：移除 bindings 失败: ${error}`);
    }
  }

  /**
   * Delete agent directories
   */
  private deleteAgentDirectories(agentId: string): void {
    const dirs = [
      getAgentWorkspace(agentId),
      getAgentDir(agentId),
      getAgentSessionsDir(agentId)
    ];

    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`警告：删除目录失败 ${dir}: ${error}`);
        }
      }
    }
  }

  /**
   * Bind feishu bot
   */
  bindFeishuBot(id: string, botId: string): { success: boolean; message: string } {
    const agent = agentRepository.findById(id);
    if (!agent) {
      return { success: false, message: 'Agent不存在' };
    }

    agentRepository.updateAgent(id, { feishu_bot_id: botId });
    return { success: true, message: '飞书Bot已绑定' };
  }

  /**
   * Bind feishu bot complete (for TUI compatibility)
   */
  bindFeishuBotComplete(params: Record<string, unknown>): { success: boolean; message: string } {
    return this.bindFeishuBot(params.agentId as string, params.appId as string);
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    total: number;
    assistants: number;
    managers: number;
    reviewers: number;
    executors: number;
  } {
    const all = agentRepository.findAll();
    return {
      total: all.length,
      assistants: all.filter(a => a.role === 'assistant').length,
      managers: all.filter(a => a.role === 'manager').length,
      reviewers: all.filter(a => a.role === 'reviewer').length,
      executors: all.filter(a => a.role === 'executor').length
    };
  }
}

export const agentService = new AgentService();