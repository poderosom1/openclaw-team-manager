/**
 * Credentials Cleanup Utility
 * 
 * 用于清理飞书配对文件和去重文件的工具函数
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getOpenClawRoot } from './index';

/**
 * 获取凭证目录路径
 */
export function getCredentialsDir(): string {
  const openclawRoot = getOpenClawRoot();
  if (openclawRoot) {
    return path.join(openclawRoot, 'credentials');
  }
  return path.join(os.homedir(), '.openclaw', 'credentials');
}

/**
 * 获取飞书去重目录路径
 */
export function getFeishuDedupDir(): string {
  const openclawRoot = getOpenClawRoot();
  if (openclawRoot) {
    return path.join(openclawRoot, 'feishu', 'dedup');
  }
  return path.join(os.homedir(), '.openclaw', 'feishu', 'dedup');
}

/**
 * 清理指定 Agent 的飞书去重文件
 * 
 * 删除文件：
 * - feishu/dedup/{agentId}.json
 * 
 * @param agentId Agent ID
 * @returns 清理结果
 */
export function cleanupFeishuDedupForAgent(agentId: string): { deleted: string[]; failed: string[] } {
  const dedupDir = getFeishuDedupDir();
  const deleted: string[] = [];
  const failed: string[] = [];
  
  if (!fs.existsSync(dedupDir)) {
    return { deleted, failed };
  }
  
  // 要删除的文件
  const fileName = `${agentId}.json`;
  const filePath = path.join(dedupDir, fileName);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      deleted.push(fileName);
      console.log(`[清理] 已删除去重文件: ${fileName}`);
    } catch (e) {
      failed.push(fileName);
      console.warn(`[清理] 删除去重文件失败: ${fileName}`, e);
    }
  }
  
  return { deleted, failed };
}

/**
 * 清理指定 Agent 的飞书配对文件
 * 
 * 删除文件：
 * - feishu-{agentId}-allowFrom.json
 * - feishu/dedup/{agentId}.json
 * 
 * @param agentId Agent ID
 * @returns 清理结果
 */
export function cleanupFeishuCredentialsForAgent(agentId: string): { deleted: string[]; failed: string[] } {
  const credentialsDir = getCredentialsDir();
  const deleted: string[] = [];
  const failed: string[] = [];
  
  if (!fs.existsSync(credentialsDir)) {
    return { deleted, failed };
  }
  
  // 要删除的文件列表
  const filesToDelete = [
    `feishu-${agentId}-allowFrom.json`
  ];
  
  for (const fileName of filesToDelete) {
    const filePath = path.join(credentialsDir, fileName);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deleted.push(fileName);
        console.log(`[清理] 已删除: ${fileName}`);
      } catch (e) {
        failed.push(fileName);
        console.warn(`[清理] 删除失败: ${fileName}`, e);
      }
    }
  }
  
  // 清理去重文件
  const dedupResult = cleanupFeishuDedupForAgent(agentId);
  deleted.push(...dedupResult.deleted.map(f => `dedup/${f}`));
  failed.push(...dedupResult.failed.map(f => `dedup/${f}`));
  
  return { deleted, failed };
}

/**
 * 清理指定飞书群相关的配置
 * 
 * 注意：群绑定信息主要在 openclaw.json 中
 * 这里只清理可能存在的群相关凭证文件
 * 
 * @param groupId 飞书群 ID
 * @returns 清理结果
 */
export function cleanupFeishuCredentialsForGroup(groupId: string): { deleted: string[]; failed: string[] } {
  const credentialsDir = getCredentialsDir();
  const deleted: string[] = [];
  const failed: string[] = [];
  
  // 群相关的凭证文件较少，主要是用户配对
  // 群绑定信息在 openclaw.json 中，由调用者清理
  
  return { deleted, failed };
}

/**
 * 清理所有飞书配对文件
 * 
 * 删除文件：
 * - feishu-pairing.json
 * - feishu-*-allowFrom.json
 * - feishu-allowFrom.json
 * - feishu/dedup/*.json
 * 
 * @returns 清理结果
 */
export function cleanupAllFeishuCredentials(): { deleted: string[]; failed: string[] } {
  const credentialsDir = getCredentialsDir();
  const deleted: string[] = [];
  const failed: string[] = [];
  
  // 1. 清理凭证目录
  if (fs.existsSync(credentialsDir)) {
    // 要删除的文件模式
    const patterns = [
      'feishu-pairing.json',
      /^feishu-.*-allowFrom\.json$/,
      /^feishu-allowFrom\.json$/
    ];
    
    try {
      const files = fs.readdirSync(credentialsDir);
      
      for (const file of files) {
        const shouldDelete = patterns.some(pattern => {
          if (typeof pattern === 'string') {
            return file === pattern;
          }
          return pattern.test(file);
        });
        
        if (shouldDelete) {
          const filePath = path.join(credentialsDir, file);
          try {
            fs.unlinkSync(filePath);
            deleted.push(file);
            console.log(`[清理] 已删除: ${file}`);
          } catch (e) {
            failed.push(file);
            console.warn(`[清理] 删除失败: ${file}`, e);
          }
        }
      }
    } catch (e) {
      console.error(`[清理] 读取凭证目录失败:`, e);
    }
  }
  
  // 2. 清理去重目录
  const dedupDir = getFeishuDedupDir();
  if (fs.existsSync(dedupDir)) {
    try {
      const files = fs.readdirSync(dedupDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dedupDir, file);
          try {
            fs.unlinkSync(filePath);
            deleted.push(`dedup/${file}`);
            console.log(`[清理] 已删除去重文件: ${file}`);
          } catch (e) {
            failed.push(`dedup/${file}`);
            console.warn(`[清理] 删除去重文件失败: ${file}`, e);
          }
        }
      }
    } catch (e) {
      console.error(`[清理] 读取去重目录失败:`, e);
    }
  }
  
  return { deleted, failed };
}

/**
 * 清理指定账号列表的飞书配对文件
 * 
 * 用于批量删除 Agent 时清理
 * 
 * @param agentIds Agent ID 列表
 * @returns 清理结果
 */
export function cleanupFeishuCredentialsForAgents(agentIds: string[]): { deleted: string[]; failed: string[] } {
  const allDeleted: string[] = [];
  const allFailed: string[] = [];
  
  for (const agentId of agentIds) {
    const result = cleanupFeishuCredentialsForAgent(agentId);
    allDeleted.push(...result.deleted);
    allFailed.push(...result.failed);
  }
  
  return { deleted: allDeleted, failed: allFailed };
}