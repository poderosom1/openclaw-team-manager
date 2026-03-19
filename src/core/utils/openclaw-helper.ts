/**
 * OpenClaw Integration Helper Functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { agentRepository } from '../../db/repositories/agent.repo';
import { departmentRepository } from '../../db/repositories/dept.repo';
import {
  getOpenClawRoot,
  getAgentWorkspace,
  getAgentDir,
  getAgentSessionsDir,
  getOpenClawJsonPath
} from '../utils';
import { Agent } from '../models/types';
import { initializeAuthProfiles } from '../services/auth-profiles.service';
import * as configTracker from '../services/config-tracker.service';

/**
 * OpenClaw Session info
 */
export interface OpenClawSession {
  sessionKey: string;
  agentId?: string;
  workspacePath?: string;
}

/**
 * Get Agent's Session Key
 * 
 * In OpenClaw, each Agent can have independent session
 * Session Key format: agent:<agentId>:main
 */
export function getAgentSessionKey(agentId: string): string {
  return `agent:${agentId}:main`;
}

/**
 * Get Agent's workspace path
 */
export function getAgentWorkspacePath(agentId: string): string {
  const agent = agentRepository.findById(agentId);
  if (agent && agent.workspace_path) {
    return agent.workspace_path;
  }
  return getAgentWorkspace(agentId);
}

/**
 * Prepare Agent Session context
 * 
 * Returns context info needed to start Agent Session
 */
export function prepareAgentContext(agentId: string): {
  success: boolean;
  agent?: {
    id: string;
    name: string;
    role: string;
    department_id: string | null;
    job_id: string | null;
  };
  workspace_path?: string;
  session_key?: string;
  message?: string;
} {
  const agent = agentRepository.findById(agentId);
  if (!agent) {
    return { success: false, message: `Agent 不存在: ${agentId}` };
  }

  const workspacePath = getAgentWorkspacePath(agentId);
  const sessionKey = getAgentSessionKey(agentId);

  return {
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department_id: agent.department_id,
      job_id: agent.job_id
    },
    workspace_path: workspacePath,
    session_key: sessionKey
  };
}

/**
 * Create Agent directory structure
 * 
 * Follows OpenClaw official standard:
 * - workspace-<agentId>/  workspace
 * - agents/<agentId>/agent/  Agent directory (auth-profiles.json etc.)
 * - agents/<agentId>/sessions/  session storage
 */
export function createAgentDirectories(agentId: string): {
  workspace: string;
  agentDir: string;
  sessionsDir: string;
} {
  const workspacePath = getAgentWorkspace(agentId);
  const agentDir = getAgentDir(agentId);
  const sessionsDir = getAgentSessionsDir(agentId);

  // Create workspace directory
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }

  // Create Agent directory
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  // Create sessions directory
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  return {
    workspace: workspacePath,
    agentDir,
    sessionsDir
  };
}

/**
 * Create Agent files
 * 
 * Includes:
 * - AGENTS.md
 * - SOUL.md
 * - USER.md
 * - MEMORY.md
 * - TOOLS.md
 * - auth-profiles.json
 */
export function createAgentFiles(
  agentId: string,
  options: {
    name: string;
    role: string;
    departmentId?: string;
  }
): void {
  const workspacePath = getAgentWorkspace(agentId);

  // Create workspace guide files
  const roleName = {
    assistant: '总助理',
    manager: '管理者',
    executor: '执行者',
    reviewer: '审核者'
  }[options.role] || options.role;

  // AGENTS.md
  const agentsContent = `# ${options.name} 引导文件

## 角色定位

你是${options.departmentId ? '某事业部' : '系统'}的${roleName}。

## 角色信息

- Agent ID: ${agentId}
- 角色类型: ${roleName}
- 所属事业部: ${options.departmentId || '无（全局）'}

`;
  fs.writeFileSync(path.join(workspacePath, 'AGENTS.md'), agentsContent, 'utf-8');

  // SOUL.md
  const soulContent = `# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful, not performatively helpful.** Skip the "Great question!" and "I'd be happy to help!" — just help. Actions speak louder than filler words.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring.

**Be resourceful before asking.** Try to figure it out. Read the file. Check the context. Search for it. _Then_ ask if you're stuck.

## 语言偏好

**默认使用中文回复。**

---

_This file is yours to evolve. As you learn who you are, update it._
`;
  fs.writeFileSync(path.join(workspacePath, 'SOUL.md'), soulContent, 'utf-8');

  // USER.md
  const userContent = `# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Timezone:** Asia/Shanghai
- **Notes:**

---

The more you know, the better you can help.
`;
  fs.writeFileSync(path.join(workspacePath, 'USER.md'), userContent, 'utf-8');

  // MEMORY.md
  const memoryContent = `# MEMORY.md - 长期记忆

## 任务历史

| 任务ID | 标题 | 状态 | 创建时间 |
|--------|------|------|----------|
| （暂无） | | | |

## 注意事项

- 此文件记录任务执行过程中的重要信息
- 由 Agent 自动维护
`;
  fs.writeFileSync(path.join(workspacePath, 'MEMORY.md'), memoryContent, 'utf-8');

  // TOOLS.md
  const toolsContent = `# TOOLS.md - Local Notes

## 常用命令

- 查看系统状态: company-manager status
- 查看Agent列表: company-manager list-agents

---

Add whatever helps you do your job.
`;
  fs.writeFileSync(path.join(workspacePath, 'TOOLS.md'), toolsContent, 'utf-8');

  // Initialize auth-profiles.json
  initializeAuthProfiles(agentId);
}

/**
 * Sync Agent to OpenClaw config file
 * 
 * After creating Agent, need to add it to openclaw.json config
 * Follows official standard format
 * 
 * Note: Never set default=true for any agent created by team-manager
 * Preserve the original default agent if exists
 */
export function syncOpenClawConfig(agent: any): { success: boolean; message: string } {
  try {
    const configPath = getOpenClawJsonPath();

    // If config file doesn't exist, create basic config
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        gateway: {
          port: 28789,
          mode: 'local',
          bind: 'loopback',
          auth: {
            mode: 'token',
            token: 'default-token'
          }
        },
        agents: {
          defaults: {
            workspace: getAgentWorkspace('main'),
            model: {
              primary: 'doubao/doubao-seed-2-0-lite-260215',
              fallbacks: []
            }
          },
          list: []
        },
        bindings: [],
        models: {
          providers: {}
        },
        channels: {}
      };
      
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    }

    // Read existing config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Ensure agents exists
    if (!config.agents) {
      config.agents = { defaults: {}, list: [] };
    }
    if (!config.agents.list) {
      config.agents.list = [];
    }

    // ========================================
    // Add global config for agent-to-agent communication
    // ========================================
    if (!config.tools) {
      config.tools = {};
    }
    
    // Set sessions visibility to "all" (allow seeing all sessions)
    if (!config.tools.sessions) {
      config.tools.sessions = {};
    }
    if (!config.tools.sessions.visibility) {
      config.tools.sessions.visibility = 'all';
    }
    
    // Set maxPingPongTurns to 3 (limit ping-pong loops)
    if (!config.session) {
      config.session = {};
    }
    if (!config.session.agentToAgent) {
      config.session.agentToAgent = {};
    }
    if (config.session.agentToAgent.maxPingPongTurns === undefined) {
      config.session.agentToAgent.maxPingPongTurns = 3;
    }

    // Check if already exists
    const existingIndex = config.agents.list.findIndex((a: { id: string }) => a.id === agent.id);

    // Determine initial allowAgents list
    // - For assistant (role === 'assistant'): allowAgents = ["*"]
    // - For other agents: allowAgents = [] (will be updated by updateAgentAllowList)
    let initialAllowAgents: string[];
    if (agent.role === 'assistant') {
      initialAllowAgents = ['*'];
    } else {
      initialAllowAgents = [];  // Empty, will be updated when joining a team
    }

    // Create Agent config item (official standard format)
    // Note: Never set default=true, preserve original default agent
    const agentConfig: {
      id: string;
      workspace: string;
      agentDir: string;
      name?: string;
      subagents?: { allowAgents: string[] };
    } = {
      id: agent.id,
      workspace: agent.workspace_path || getAgentWorkspace(agent.id),
      agentDir: getAgentDir(agent.id),
      name: agent.name,
      subagents: {
        allowAgents: initialAllowAgents
      }
    };

    if (existingIndex >= 0) {
      // Update existing config, but preserve default if it was set
      const existingDefault = config.agents.list[existingIndex].default;
      const existingAllowAgents = config.agents.list[existingIndex].subagents?.allowAgents;
      
      config.agents.list[existingIndex] = agentConfig;
      
      // Preserve default flag
      if (existingDefault) {
        config.agents.list[existingIndex].default = existingDefault;
      }
      
      // Preserve existing allowAgents if it was already set (not empty)
      if (existingAllowAgents && existingAllowAgents.length > 0) {
        config.agents.list[existingIndex].subagents.allowAgents = existingAllowAgents;
      }
    } else {
      // Add new config (without default)
      config.agents.list.push(agentConfig);
    }

    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true, message: 'OpenClaw 配置已同步' };
  } catch (error) {
    return {
      success: false,
      message: `同步配置失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Remove Agent from OpenClaw config
 * 
 * Note: Cannot remove main/assistant agent
 */
export function removeAgentFromConfig(agentId: string): { success: boolean; message: string } {
  try {
    const configPath = getOpenClawJsonPath();

    if (!fs.existsSync(configPath)) {
      return { success: false, message: '配置文件不存在' };
    }

    // Protect main agent
    if (agentId === 'main') {
      return { success: false, message: '不能从配置中移除默认 agent (main)' };
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.agents?.list) {
      return { success: false, message: '配置中没有 Agent 列表' };
    }

    const index = config.agents.list.findIndex((a: { id: string }) => a.id === agentId);
    if (index < 0) {
      return { success: false, message: 'Agent 不在配置中' };
    }

    // Double-check: don't remove agent with default=true
    if (config.agents.list[index].default) {
      return { success: false, message: '不能从配置中移除默认 agent' };
    }

    config.agents.list.splice(index, 1);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true, message: 'Agent 已从配置中移除' };
  } catch (error) {
    return {
      success: false,
      message: `移除失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Update Agent Allow List for team isolation
 * 
 * When an agent is created or deleted, update the allowAgents list
 * for all agents in the same team.
 * 
 * Rules:
 * - Team members can spawn to each other
 * - Team's assistant (role === 'assistant') can call all agents
 * - Cross-team spawning is not allowed
 * 
 * @param agentId - The agent that was created or will be deleted
 * @param departmentId - The department ID the agent belongs to
 * @param action - 'add' | 'remove'
 * @returns Result with affected agents and changes
 */
export function updateAgentAllowList(
  agentId: string,
  departmentId: string | null,
  action: 'add' | 'remove'
): { 
  success: boolean; 
  message: string; 
  affectedAgents: string[];
  changes: Array<{ agentId: string; oldValue: string[]; newValue: string[] }>;
} {
  const result = {
    success: false,
    message: '',
    affectedAgents: [] as string[],
    changes: [] as Array<{ agentId: string; oldValue: string[]; newValue: string[] }>
  };

  try {
    const configPath = getOpenClawJsonPath();

    if (!fs.existsSync(configPath)) {
      result.message = '配置文件不存在';
      return result;
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.agents?.list) {
      result.message = '配置中没有 Agent 列表';
      return result;
    }

    const agentsList = config.agents.list as Array<{
      id: string;
      subagents?: { allowAgents?: string[] };
    }>;

    // Get all agents in the same department
    const teamAgents = departmentId 
      ? agentRepository.findByDepartment(departmentId)
      : [];
    
    // Include the agent being created/deleted in the team list for 'add' action
    const teamAgentIds = teamAgents
      .filter(a => action === 'add' || a.id !== agentId)  // Exclude deleted agent for 'remove'
      .map(a => a.id);
    
    // For 'add', include the new agent
    if (action === 'add' && !teamAgentIds.includes(agentId)) {
      teamAgentIds.push(agentId);
    }

    // Find team's assistant (if any)
    const teamAssistant = teamAgents.find(a => a.role === 'assistant');
    const teamAssistantId = teamAssistant?.id;

    // Update each team member's allowAgents
    for (const currentAgentId of teamAgentIds) {
      const agentConfig = agentsList.find(a => a.id === currentAgentId);
      if (!agentConfig) continue;

      const oldAllowAgents = agentConfig.subagents?.allowAgents || [];
      let newAllowAgents: string[];

      // Build the new allowAgents list
      // For assistant: ["*"]
      // For others: [team members] + [team's assistant if exists]
      const currentAgent = teamAgents.find(a => a.id === currentAgentId);
      if (currentAgent?.role === 'assistant') {
        newAllowAgents = ['*'];
      } else {
        newAllowAgents = [...teamAgentIds];
        // Add team's assistant if exists and not already in list
        if (teamAssistantId && !newAllowAgents.includes(teamAssistantId)) {
          newAllowAgents.push(teamAssistantId);
        }
      }

      // Skip if no change
      if (JSON.stringify(oldAllowAgents.sort()) === JSON.stringify(newAllowAgents.sort())) {
        continue;
      }

      // Update the config
      if (!agentConfig.subagents) {
        agentConfig.subagents = {};
      }
      agentConfig.subagents.allowAgents = newAllowAgents;

      // Record the change
      result.affectedAgents.push(currentAgentId);
      result.changes.push({
        agentId: currentAgentId,
        oldValue: oldAllowAgents,
        newValue: newAllowAgents
      });

      // Record to config_changes table
      configTracker.recordAgentAllowListChange(
        currentAgentId,
        oldAllowAgents,
        newAllowAgents,
        action === 'add' 
          ? `添加团队成员 ${agentId} 到通信权限` 
          : `从通信权限移除已删除的 ${agentId}`
      );
    }

    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    result.success = true;
    result.message = `已更新 ${result.affectedAgents.length} 个 Agent 的通信权限`;
    return result;
  } catch (error) {
    result.message = `更新失败: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }
}

/**
 * Get Gateway restart reminder message
 * 
 * After deleting agents/departments, Feishu WebSocket connections
 * are still stored in Gateway process memory. Manual restart is required.
 * 
 * @returns Reminder message for user to restart Gateway manually
 */
export function getGatewayRestartReminder(): string {
  return '⚠️  请重启 Gateway 使飞书长连接断开：openclaw gateway restart';
}

/**
 * OpenClaw integration helper service
 */
export const openclawHelper = {
  getAgentSessionKey,
  getAgentWorkspacePath,
  prepareAgentContext,
  createAgentDirectories,
  createAgentFiles,
  syncOpenClawConfig,
  removeAgentFromConfig,
  updateAgentAllowList
};