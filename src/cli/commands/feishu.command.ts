/**
 * Feishu Configuration Commands
 * 
 * Follows OpenClaw official standard:
 * - Feishu config stored in openclaw.json channels.feishu section
 * - Bindings stored in openclaw.json bindings section
 */

import chalk from 'chalk';
import { isDatabaseInitialized } from '../../db';
import { departmentRepository } from '../../db/repositories/dept.repo';
import { agentRepository } from '../../db/repositories/agent.repo';
import { getOpenClawJsonPath } from '../../core/utils';
import { openClawConfigManager } from '../../core/services/openclaw-config.service';
import fs from 'fs';
import path from 'path';

// Feishu config file path (for legacy compatibility)
function getFeishuConfigPath(): string {
  const openclawRoot = path.dirname(getOpenClawJsonPath());
  return path.join(openclawRoot, 'team', 'config', 'feishu.json');
}

interface FeishuConfig {
  webhook_url?: string;
  app_id?: string;
  app_secret?: string;
  encrypt_key?: string;
  verification_token?: string;
}

/**
 * Show Feishu configuration
 */
export async function showFeishuConfigCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  // Read config directly from file
  const configPath = getOpenClawJsonPath();
  let config: Record<string, unknown>;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    let cleanContent = content.replace(/\/\/.*$/gm, '');
    cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
    config = JSON.parse(cleanContent);
  } catch {
    console.log(chalk.yellow('飞书配置未设置'));
    console.log('\n使用以下命令进行配置：');
    console.log('  team-manager config-feishu --app-id <id> --app-secret <secret>');
    return;
  }

  const channels = config.channels as Record<string, unknown> | undefined;
  const feishuConfig = channels?.feishu as Record<string, unknown> | undefined;

  if (!feishuConfig) {
    console.log(chalk.yellow('飞书配置未设置'));
    console.log('\n使用以下命令进行配置：');
    console.log('  team-manager config-feishu --app-id <id> --app-secret <secret>');
    return;
  }

  const accounts = feishuConfig.accounts as Record<string, unknown> | undefined;
  const defaultAccount = accounts?.default as Record<string, unknown> | undefined;
  
  console.log(chalk.bold('\n飞书配置：\n'));
  console.log(`  App ID: ${defaultAccount?.appId || '未设置'}`);
  console.log(`  App Secret: ${defaultAccount?.appSecret ? '******' : '未设置'}`);
  console.log(`  Bot Name: ${defaultAccount?.botName || '未设置'}`);
  console.log(`  Encrypt Key: ${feishuConfig.encryptKey ? '******' : '未设置'}`);
  console.log(`  Verification Token: ${feishuConfig.verificationToken ? '******' : '未设置'}`);
  console.log(`  DM Policy: ${feishuConfig.dmPolicy || 'pairing'}`);
  console.log(`  Connection Mode: ${feishuConfig.connectionMode || 'websocket'}`);
  console.log('');
}

/**
 * Configure Feishu
 * Follows OpenClaw official standard config format
 */
export async function configFeishuCommand(options: {
  appId?: string;
  appSecret?: string;
  botName?: string;
  verificationToken?: string;
  encryptKey?: string;
}): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const configPath = getOpenClawJsonPath();
  
  // Read file content directly, no cache
  let config: Record<string, unknown>;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    // Clean JSON5 features
    let cleanContent = content.replace(/\/\/.*$/gm, '');  // Remove single-line comments
    cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '');  // Remove multi-line comments
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');  // Remove trailing commas
    config = JSON.parse(cleanContent);
  } catch {
    // If file doesn't exist or parse fails, create default config
    config = {
      gateway: { port: 28789, mode: 'local', bind: 'loopback', auth: { mode: 'token', token: 'default-token' } },
      agents: { defaults: {}, list: [] },
      bindings: [],
      models: { providers: {} },
      channels: {}
    };
  }
  
  // Initialize channels.feishu structure (follow official standard)
  if (!config.channels) {
    config.channels = {};
  }
  const channels = config.channels as Record<string, unknown>;
  if (!channels.feishu) {
    channels.feishu = {
      enabled: true,
      dmPolicy: 'pairing',
      accounts: { default: {} }
    };
  }
  const feishuConfig = channels.feishu as Record<string, unknown>;
  if (!feishuConfig.accounts) {
    feishuConfig.accounts = { default: {} };
  }
  const accounts = feishuConfig.accounts as Record<string, unknown>;
  if (!accounts.default) {
    accounts.default = {};
  }
  const accountConfig = accounts.default as Record<string, unknown>;
  
  // Update config (follow official standard fields)
  if (options.appId) {
    accountConfig.appId = options.appId;
  }
  if (options.appSecret) {
    accountConfig.appSecret = options.appSecret;
  }
  if (options.botName) {
    accountConfig.botName = options.botName;
  }
  // Webhook mode config (optional)
  if (options.verificationToken) {
    feishuConfig.verificationToken = options.verificationToken;
  }
  if (options.encryptKey) {
    feishuConfig.encryptKey = options.encryptKey;
  }

  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // Also save to old config file (compatibility)
  const oldConfigPath = getFeishuConfigPath();
  const oldConfigDir = path.dirname(oldConfigPath);
  if (!fs.existsSync(oldConfigDir)) {
    fs.mkdirSync(oldConfigDir, { recursive: true });
  }
  
  const oldConfig: FeishuConfig = {
    app_id: options.appId || (accountConfig.appId as string),
    app_secret: options.appSecret || (accountConfig.appSecret as string),
    encrypt_key: options.encryptKey || (feishuConfig.encryptKey as string),
    verification_token: options.verificationToken || (feishuConfig.verificationToken as string)
  };
  fs.writeFileSync(oldConfigPath, JSON.stringify(oldConfig, null, 2), 'utf-8');

  console.log(chalk.green('✓ 飞书配置已更新'));
}

/**
 * Bind Feishu group to team
 * Also updates openclaw.json bindings section
 */
export async function bindFeishuGroupCommand(options: {
  departmentId: string;
  groupId: string;
}): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const dept = departmentRepository.findById(options.departmentId);
  if (!dept) {
    console.log(chalk.red('错误：团队不存在'));
    return;
  }

  // Update database
  departmentRepository.update(options.departmentId, {
    feishu_group_id: options.groupId
  });

  // Find team manager
  const manager = agentRepository.findOneByDepartmentAndRole(options.departmentId, 'manager');
  
  if (manager) {
    // Update openclaw.json bindings
    const config = openClawConfigManager.load();
    
    if (!config.bindings) {
      config.bindings = [];
    }

    // Check if binding already exists
    const existingBinding = config.bindings.find(b =>
      b.agentId === manager.id &&
      b.match.channel === 'feishu' &&
      b.match.peer?.kind === 'group' &&
      b.match.peer?.id === options.groupId
    );

    if (!existingBinding) {
      config.bindings.push({
        agentId: manager.id,
        match: {
          channel: 'feishu',
          peer: {
            kind: 'group',
            id: options.groupId
          }
        }
      });

      // Save config
      const configPath = getOpenClawJsonPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
  }

  console.log(chalk.green(`✓ 飞书群已绑定到团队 "${dept.name}"`));
  console.log(`  群ID: ${options.groupId}`);
  if (manager) {
    console.log(`  路由到: ${manager.name} (${manager.id})`);
  }
}

/**
 * Bind Feishu bot to agent
 */
export async function bindFeishuBotCommand(options: {
  agentId: string;
  botId: string;
}): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const agent = agentRepository.findById(options.agentId);
  if (!agent) {
    console.log(chalk.red('错误：Agent不存在'));
    return;
  }

  // Update database
  agentRepository.updateAgent(options.agentId, {
    feishu_bot_id: options.botId
  });

  console.log(chalk.green(`✓ 飞书Bot已绑定到Agent "${agent.name}"`));
  console.log(`  Bot ID: ${options.botId}`);
}

/**
 * List Feishu group bindings
 */
export async function listFeishuGroupsCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const departments = departmentRepository.findAll();

  console.log(chalk.bold('\n飞书群绑定列表：\n'));
  console.log('  团队\t\t\t\t飞书群ID');
  console.log('  ────────────────────────────────────────');

  for (const dept of departments) {
    console.log(`  ${dept.name}\t\t\t${dept.feishu_group_id || '未绑定'}`);
  }

  console.log('');

  // Show openclaw.json bindings
  const config = openClawConfigManager.load();
  const feishuBindings = (config.bindings || []).filter(b => b.match.channel === 'feishu');

  if (feishuBindings.length > 0) {
    console.log(chalk.bold('\n飞书路由绑定（openclaw.json）：\n'));
    console.log('  Agent ID\t\t\t类型\t\tID');
    console.log('  ────────────────────────────────────────');
    
    for (const binding of feishuBindings) {
      const type = binding.match.peer?.kind || 'unknown';
      const id = binding.match.peer?.id || binding.match.accountId || '*';
      console.log(`  ${binding.agentId}\t\t${type}\t\t${id}`);
    }
    
    console.log('');
  }
}