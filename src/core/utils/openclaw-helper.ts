/**
 * OpenClaw Integration Helper Functions
 * 
 * Company Manager 0.0.3 - Basic Version
 * Provides helper methods for OpenClaw system integration
 * Follows OpenClaw official standard directory structure and config format
 */

import * as fs from 'fs';
import * as path from 'path';
import { agentRepository } from '../../db/repositories/agent.repo';
import {
  getOpenClawRoot,
  getAgentWorkspace,
  getAgentDir,
  getAgentSessionsDir,
  getOpenClawJsonPath
} from '../utils';
import { Agent } from '../models/types';
import { initializeAuthProfiles } from '../services/auth-profiles.service';

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

    // Check if already exists
    const existingIndex = config.agents.list.findIndex((a: { id: string }) => a.id === agent.id);

    // Create Agent config item (official standard format)
    const agentConfig: {
      id: string;
      workspace: string;
      agentDir: string;
      default?: boolean;
      name?: string;
    } = {
      id: agent.id,
      workspace: agent.workspace_path || getAgentWorkspace(agent.id),
      agentDir: getAgentDir(agent.id),
      name: agent.name
    };

    // If assistant, set as default
    if (agent.role === 'assistant') {
      agentConfig.default = true;
    }

    if (existingIndex >= 0) {
      // Update existing config
      config.agents.list[existingIndex] = agentConfig;
    } else {
      // Add new config
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
 */
export function removeAgentFromConfig(agentId: string): { success: boolean; message: string } {
  try {
    const configPath = getOpenClawJsonPath();

    if (!fs.existsSync(configPath)) {
      return { success: false, message: '配置文件不存在' };
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
 * OpenClaw integration helper service
 */
export const openclawHelper = {
  getAgentSessionKey,
  getAgentWorkspacePath,
  prepareAgentContext,
  createAgentDirectories,
  createAgentFiles,
  syncOpenClawConfig,
  removeAgentFromConfig
};