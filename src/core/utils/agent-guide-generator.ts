/**
 * Agent Guide File Generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { RoleType, Agent } from '../models/types';
import { getAgentWorkspace } from './index';

/**
 * Agent guide file parameters
 */
export interface AgentGuideParams {
  agent: Agent;
  department_name?: string;
  job_name?: string;
  skill_packs?: Array<{
    id: string;
    name: string;
    content: string;
  }>;
}

/**
 * Get role description
 */
function getRoleDescription(role: RoleType): string {
  const descriptions: Record<RoleType, string> = {
    assistant: '统一入口，负责接收用户需求、分发任务、汇报成果',
    manager: '管理者，负责制定计划、协调资源、监控进度',
    executor: '执行者，负责具体任务执行、产出成果',
    reviewer: '审核者，负责审核产出、把控质量'
  };
  return descriptions[role] || '未知角色';
}

/**
 * Get role responsibilities
 */
function getRoleResponsibilities(role: RoleType): string[] {
  const responsibilities: Record<RoleType, string[]> = {
    assistant: [
      '接收用户需求',
      '创建任务并分配给管理者',
      '监控任务进度',
      '向用户汇报任务结果'
    ],
    manager: [
      '接收任务分配',
      '制定执行计划',
      '创建执行节点',
      '分配节点给执行者',
      '监控节点执行'
    ],
    executor: [
      '接收节点任务',
      '执行节点任务',
      '产出执行成果',
      '提交审核'
    ],
    reviewer: [
      '接收审核请求',
      '审核执行成果',
      '提供审核意见'
    ]
  };
  return responsibilities[role] || [];
}

/**
 * Generate agent guide file content
 */
export function generateAgentGuide(params: AgentGuideParams): string {
  const { agent, department_name, job_name, skill_packs } = params;
  
  let skillPacksSection = '';
  if (skill_packs && skill_packs.length > 0) {
    skillPacksSection = `

## 技能包

${skill_packs.map(sp => `### ${sp.name} (${sp.id})

${sp.content}
`).join('\n')}
`;
  }
  
  return `# Agent 引导文件

## 基本信息

- **Agent ID**: ${agent.id}
- **名称**: ${agent.name}
- **角色**: ${agent.role} - ${getRoleDescription(agent.role)}
- **事业部**: ${department_name || agent.department_id || '未分配'}
- **职业**: ${job_name || agent.job_id || '未分配'}
- **状态**: ${agent.status}
- **工作空间**: ${agent.workspace_path || '未设置'}

## 职责

${getRoleResponsibilities(agent.role).map((r, i) => `${i + 1}. ${r}`).join('\n')}
${skillPacksSection}

## 注意事项

1. 严格按照角色职责执行任务
2. 遇到问题及时上报
3. 保持与团队的良好沟通

---
*本文档由 company-manager 自动生成*
*生成时间: ${new Date().toISOString()}*
`;
}

/**
 * Generate and save agent guide file
 */
export function generateAndSaveAgentGuide(params: AgentGuideParams): string {
  const content = generateAgentGuide(params);
  
  // Determine save path
  const workspacePath = params.agent.workspace_path || getAgentWorkspace(params.agent.id);
  const filePath = path.join(workspacePath, 'AGENTS.md');
  
  // Create directory
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  // Save file
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return filePath;
}

/**
 * Generate MEMORY.md initial file
 */
export function generateMemoryFile(agentId: string): string {
  const workspacePath = getAgentWorkspace(agentId);
  const filePath = path.join(workspacePath, 'MEMORY.md');
  
  const content = `# Agent 记忆文件

## 任务历史

> 此文件用于记录 Agent 执行过的任务历史

---

*创建时间: ${new Date().toISOString()}*
`;
  
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return filePath;
}

/**
 * Agent guide file generator service
 */
export const agentGuideGenerator = {
  generate: generateAgentGuide,
  generateAndSave: generateAndSaveAgentGuide,
  generateMemory: generateMemoryFile
};