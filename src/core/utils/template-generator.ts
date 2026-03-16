/**
 * 文档模板生成器
 * 
 * 用于生成各种文档模板
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 需求文档模板参数
 */
export interface RequirementTemplateParams {
  task_id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  created_by?: string;
  created_at?: string;
}

/**
 * 计划文档模板参数
 */
export interface PlanTemplateParams {
  task_id: string;
  title: string;
  nodes: Array<{
    name: string;
    agent_id: string;
    sequence: number;
    estimated_hours?: number;
  }>;
  total_estimated_hours?: number;
  created_by?: string;
  created_at?: string;
}

/**
 * 输出文档模板参数
 */
export interface OutputTemplateParams {
  task_id: string;
  node_id: string;
  node_name: string;
  executor_id?: string;
  completed_at?: string;
  summary?: string;
}

/**
 * 生成需求文档模板
 */
export function generateRequirementTemplate(params: RequirementTemplateParams): string {
  const now = params.created_at || new Date().toISOString();
  
  return `# 需求文档

## 基本信息

- **任务ID**: ${params.task_id}
- **标题**: ${params.title}
- **优先级**: ${params.priority || 'medium'}
- **创建者**: ${params.created_by || '系统'}
- **创建时间**: ${now}

## 需求描述

${params.description}

## 验收标准

> 请在此处填写验收标准

## 补充说明

> 请在此处添加补充说明

---
*本文档由 company-manager 自动生成*
`;
}

/**
 * 生成计划文档模板
 */
export function generatePlanTemplate(params: PlanTemplateParams): string {
  const now = params.created_at || new Date().toISOString();
  
  let nodesSection = '';
  if (params.nodes && params.nodes.length > 0) {
    nodesSection = `## 执行节点

| 序号 | 节点名称 | 执行者 | 预计时间 |
|------|----------|--------|----------|
${params.nodes.map(n => `| ${n.sequence} | ${n.name} | ${n.agent_id} | ${n.estimated_hours || '-'}小时 |`).join('\n')}

**总计预计时间**: ${params.total_estimated_hours || '-'}小时
`;
  }
  
  return `# 执行计划

## 基本信息

- **任务ID**: ${params.task_id}
- **标题**: ${params.title}
- **创建者**: ${params.created_by || '系统'}
- **创建时间**: ${now}

## 执行概述

> 请在此处填写执行概述

${nodesSection}

## 执行步骤

> 请在此处填写详细执行步骤

## 注意事项

> 请在此处填写注意事项

---
*本文档由 company-manager 自动生成*
`;
}

/**
 * 生成输出文档模板
 */
export function generateOutputTemplate(params: OutputTemplateParams): string {
  const now = params.completed_at || new Date().toISOString();
  
  return `# 输出文档

## 基本信息

- **任务ID**: ${params.task_id}
- **节点ID**: ${params.node_id}
- **节点名称**: ${params.node_name}
- **执行者**: ${params.executor_id || '-'}
- **完成时间**: ${now}

## 执行摘要

${params.summary || '> 请在此处填写执行摘要'}

## 输出内容

> 请在此处填写输出内容

## 相关文件

> 请列出产出的文件

---
*本文档由 company-manager 自动生成*
`;
}

/**
 * 保存模板到文件
 */
export function saveTemplate(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 模板生成器服务
 */
export const templateGenerator = {
  generateRequirement: generateRequirementTemplate,
  generatePlan: generatePlanTemplate,
  generateOutput: generateOutputTemplate,
  save: saveTemplate
};