/**
 * Feishu Integration Service
 * 
 * Provides Feishu group notifications, message pushing and other features
 */

import { agentRepository } from '../../db/repositories/agent.repo';
import { departmentRepository } from '../../db/repositories/dept.repo';

/**
 * Feishu message type
 */
export type FeishuMessageType = 'text' | 'post' | 'interactive';

/**
 * Feishu message content
 */
export interface FeishuMessage {
  msg_type: FeishuMessageType;
  content: Record<string, unknown>;
}

/**
 * Feishu notification config
 */
export interface FeishuConfig {
  webhook_url?: string;
  app_id?: string;
  app_secret?: string;
}

/**
 * Generate text message
 */
export function generateTextMessage(text: string): FeishuMessage {
  return {
    msg_type: 'text',
    content: { text }
  };
}

/**
 * Generate rich text message
 */
export function generatePostMessage(title: string, content: Array<Array<{
  tag: string;
  text?: string;
  href?: string;
}>>): FeishuMessage {
  return {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title,
          content
        }
      }
    }
  };
}

/**
 * Generate task assigned notification message
 */
export function generateTaskAssignedMessage(params: {
  task_id: string;
  title: string;
  manager_name: string;
  priority?: string;
}): FeishuMessage {
  return generatePostMessage('📋 新任务分配', [
    [{ tag: 'text', text: '任务ID: ' }, { tag: 'text', text: params.task_id }],
    [{ tag: 'text', text: '标题: ' }, { tag: 'text', text: params.title }],
    [{ tag: 'text', text: '负责人: ' }, { tag: 'text', text: params.manager_name }],
    [{ tag: 'text', text: '优先级: ' }, { tag: 'text', text: params.priority || 'medium' }]
  ]);
}

/**
 * Generate node completed notification message
 */
export function generateNodeCompletedMessage(params: {
  task_id: string;
  node_name: string;
  executor_name: string;
}): FeishuMessage {
  return generatePostMessage('✅ 节点完成', [
    [{ tag: 'text', text: '任务ID: ' }, { tag: 'text', text: params.task_id }],
    [{ tag: 'text', text: '节点: ' }, { tag: 'text', text: params.node_name }],
    [{ tag: 'text', text: '执行者: ' }, { tag: 'text', text: params.executor_name }]
  ]);
}

/**
 * Generate review request notification message
 */
export function generateReviewRequestMessage(params: {
  task_id: string;
  node_name: string;
  executor_name: string;
}): FeishuMessage {
  return generatePostMessage('🔍 审核请求', [
    [{ tag: 'text', text: '任务ID: ' }, { tag: 'text', text: params.task_id }],
    [{ tag: 'text', text: '节点: ' }, { tag: 'text', text: params.node_name }],
    [{ tag: 'text', text: '执行者: ' }, { tag: 'text', text: params.executor_name }],
    [{ tag: 'text', text: '\n请及时审核执行成果。' }]
  ]);
}

/**
 * Generate task completed notification message
 */
export function generateTaskCompletedMessage(params: {
  task_id: string;
  title: string;
  summary?: string;
}): FeishuMessage {
  return generatePostMessage('🎉 任务完成', [
    [{ tag: 'text', text: '任务ID: ' }, { tag: 'text', text: params.task_id }],
    [{ tag: 'text', text: '标题: ' }, { tag: 'text', text: params.title }],
    [{ tag: 'text', text: '摘要: ' }, { tag: 'text', text: params.summary || '无' }]
  ]);
}

/**
 * Generate timeout warning message
 */
export function generateTimeoutWarningMessage(params: {
  task_id: string;
  node_name: string;
  executor_name: string;
  overdue_hours: number;
}): FeishuMessage {
  return generatePostMessage('⚠️ 节点超时警告', [
    [{ tag: 'text', text: '任务ID: ' }, { tag: 'text', text: params.task_id }],
    [{ tag: 'text', text: '节点: ' }, { tag: 'text', text: params.node_name }],
    [{ tag: 'text', text: '执行者: ' }, { tag: 'text', text: params.executor_name }],
    [{ tag: 'text', text: '超时: ' }, { tag: 'text', text: `${params.overdue_hours}小时` }],
    [{ tag: 'text', text: '\n请及时处理或升级。' }]
  ]);
}

/**
 * Get department's Feishu group ID
 */
export function getDepartmentFeishuGroup(departmentId: string): string | null {
  const dept = departmentRepository.findById(departmentId);
  return dept?.feishu_group_id || null;
}

/**
 * Get agent's Feishu bot ID
 */
export function getAgentFeishuBot(agentId: string): string | null {
  const agent = agentRepository.findById(agentId);
  return agent?.feishu_bot_id || null;
}

/**
 * Build Feishu Webhook URL
 */
export function buildWebhookUrl(webhookKey: string): string {
  return `https://open.feishu.cn/open-apis/bot/v2/hook/${webhookKey}`;
}

/**
 * Send Feishu message
 *
 * @param webhookUrl Feishu Webhook URL
 * @param message Feishu message object
 * @returns Send result
 *
 * @example
 * // Agent calls via OpenClaw example:
 * const webhookUrl = feishuService.buildWebhookUrl(webhookKey);
 * const message = feishuService.generateTaskAssignedMessage({...});
 * const result = await feishuService.sendMessage(webhookUrl, message);
 */
export async function sendMessage(
  webhookUrl: string,
  message: FeishuMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    const result = await response.json() as { statusCode?: number; msg?: string };
    // Feishu API returns statusCode === 0 for success
    return { success: result.statusCode === 0 };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Feishu integration service
 */
export const feishuService = {
  generateTextMessage,
  generatePostMessage,
  generateTaskAssignedMessage,
  generateNodeCompletedMessage,
  generateReviewRequestMessage,
  generateTaskCompletedMessage,
  generateTimeoutWarningMessage,
  getDepartmentFeishuGroup,
  getAgentFeishuBot,
  buildWebhookUrl,
  sendMessage
};