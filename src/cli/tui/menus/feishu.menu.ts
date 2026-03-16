/**
 * Feishu Configuration Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { tuiUtils } from '../index';
import { agentService } from '../../../core/services';
import { getOpenClawJsonPath, getOpenClawRoot } from '../../../core/utils';
import * as configTracker from '../../../core/services/config-tracker.service';

/**
 * 显示飞书配置菜单
 */
export async function showFeishuConfigMenu(): Promise<void> {
  while (true) {
    const configuredAgents = getConfiguredAgents();
    const agentCount = Object.keys(configuredAgents).length;

    const choices = [
      new inquirer.Separator(chalk.cyan.bold('📱 飞书 Bot 配置')),
      new inquirer.Separator(),
      { name: `📋 查看已配置的 Agent Bot 列表 (${agentCount} 个)`, value: 'list' },
      { name: '➕ 为 Agent 添加飞书 Bot', value: 'add' },
      { name: '✏️  修改 Agent 的飞书配置', value: 'edit' },
      { name: '🗑️ 删除 Agent 的飞书配置', value: 'delete' },
      new inquirer.Separator(),
      new inquirer.Separator(chalk.cyan.bold('🏢 飞书群绑定')),
      new inquirer.Separator(),
      { name: '📋 查看飞书群绑定列表', value: 'listGroups' },
      { name: '🔗 绑定飞书群到事业部', value: 'bindGroup' },
      new inquirer.Separator(),
      new inquirer.Separator(chalk.cyan.bold('🔐 配对管理')),
      new inquirer.Separator(),
      { name: '🔐 配对管理（批准用户对话权限）', value: 'pairing' },
      new inquirer.Separator(),
      { name: '🔙 返回主菜单', value: 'back' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择操作：',
        choices,
        loop: false,
        pageSize: 20
      }
    ]);

    switch (action) {
      case 'list':
        await listConfiguredAgents();
        break;
      case 'add':
        await addFeishuBot();
        break;
      case 'edit':
        await editFeishuBot();
        break;
      case 'delete':
        await deleteFeishuBot();
        break;
      case 'listGroups':
        await listFeishuGroups();
        break;
      case 'bindGroup':
        await bindFeishuGroup();
        break;
      case 'pairing':
        await showPairingMenu();
        break;
      case 'back':
        return;
    }
  }
}

/**
 * 安全读取 JSON 配置文件
 */
function safeReadJsonConfig(configPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    let content = fs.readFileSync(configPath, 'utf-8');
    
    // 移除 BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // 移除控制字符
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('JSON 解析错误:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * 获取已配置飞书 Bot 的 Agent 列表
 * 排除 'default' 键（它是别名，不是真正的 Agent）
 */
function getConfiguredAgents(): Record<string, { appId: string; botName?: string }> {
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath);
  
  if (!config) return {};

  const channels = config.channels as Record<string, unknown> | undefined;
  const feishuConfig = channels?.feishu as Record<string, unknown> | undefined;
  const accounts = feishuConfig?.accounts as Record<string, unknown> | undefined;

  if (!accounts) return {};

  const result: Record<string, { appId: string; botName?: string }> = {};
  
  for (const [agentId, account] of Object.entries(accounts)) {
    // 跳过 'default' 键（它是别名）
    if (agentId === 'default') continue;
    
    const acc = account as Record<string, unknown>;
    if (acc?.appId) {
      result[agentId] = {
        appId: acc.appId as string,
        botName: acc.botName as string | undefined
      };
    }
  }

  return result;
}

/**
 * 查看已配置的 Agent Bot 列表
 */
async function listConfiguredAgents(): Promise<void> {
  const configuredAgents = getConfiguredAgents();
  const agentIds = Object.keys(configuredAgents);

  if (agentIds.length === 0) {
    console.log(chalk.yellow('\n暂无已配置的飞书 Bot\n'));
    console.log(chalk.dim('使用"为 Agent 添加飞书 Bot"进行配置\n'));
    await tuiUtils.waitForKey();
    return;
  }

  console.log(chalk.bold('\n📋 已配置飞书 Bot 的 Agent 列表\n'));
  console.log(chalk.dim('Agent ID'.padEnd(30)) + chalk.dim('Bot 名称'.padEnd(20)) + chalk.dim('App ID'));
  tuiUtils.printDivider();

  for (const agentId of agentIds) {
    const info = configuredAgents[agentId];
    const agent = agentService.getById(agentId);
    const agentName = agent?.name || agentId;
    const botName = info.botName || '-';
    console.log(`${agentId.padEnd(30)}${botName.padEnd(20)}${info.appId}`);
  }

  console.log('');
  await tuiUtils.waitForKey();
}

/**
 * 为 Agent 添加飞书 Bot
 */
async function addFeishuBot(): Promise<void> {
  const agents = agentService.listAll();
  
  if (agents.length === 0) {
    tuiUtils.printWarning('暂无 Agent，请先创建 Agent');
    return;
  }

  const configuredAgents = getConfiguredAgents();
  
  // 过滤出未配置的 Agent
  const unconfiguredAgents = agents.filter(a => !configuredAgents[a.id]);

  if (unconfiguredAgents.length === 0) {
    console.log(chalk.yellow('\n所有 Agent 都已配置飞书 Bot\n'));
    console.log(chalk.dim('如需修改，请使用"修改 Agent 的飞书配置"\n'));
    await tuiUtils.waitForKey();
    return;
  }

  console.log(chalk.bold('\n➕ 为 Agent 添加飞书 Bot\n'));
  console.log(chalk.dim('说明：'));
  console.log(chalk.dim('  • 每个 Agent 对应一个飞书 Bot 应用'));
  console.log(chalk.dim('  • 需要先在飞书开放平台创建应用并获取凭证'));
  console.log(chalk.dim('  • 一个 Agent 只能绑定一个飞书 Bot\n'));

  // 选择 Agent
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要配置飞书 Bot 的 Agent：',
      choices: [
        ...unconfiguredAgents.map(a => ({
          name: `${a.name} (${a.id}) - ${a.role}`,
          value: a.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (agentId === 'cancel') {
    return;
  }

  const agent = agentService.getById(agentId);

  console.log(chalk.dim('\n请输入飞书开放平台的应用凭证：'));
  console.log(chalk.dim('  飞书开放平台：https://open.feishu.cn/app\n'));

  // 输入凭证
  const { appId, appSecret, botName, dmPolicy } = await inquirer.prompt([
    {
      type: 'input',
      name: 'appId',
      message: 'App ID (cli_xxx 格式)：'
    },
    {
      type: 'password',
      name: 'appSecret',
      message: 'App Secret：'
    },
    {
      type: 'input',
      name: 'botName',
      message: 'Bot 名称（显示名称）：',
      default: agent?.name || 'AI助手'
    },
    {
      type: 'list',
      name: 'dmPolicy',
      message: '私聊策略：',
      choices: [
        { name: 'pairing - 需配对批准（推荐，最安全）', value: 'pairing' },
        { name: 'open - 允许所有用户私聊', value: 'open' },
        { name: 'disabled - 禁用私聊', value: 'disabled' }
      ],
      default: 'pairing',
      loop: false
    }
  ]);

  if (!appId?.trim() || !appId.startsWith('cli_')) {
    tuiUtils.printError('App ID 格式错误，应以 cli_ 开头');
    return;
  }

  if (!appSecret?.trim()) {
    tuiUtils.printError('App Secret 不能为空');
    return;
  }

  // 更新配置
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath) || {
    gateway: { port: 28789, mode: 'local', bind: 'loopback', auth: { mode: 'token', token: 'default-token' } },
    agents: { defaults: {}, list: [] },
    bindings: [],
    models: { providers: {} },
    channels: {}
  };

  // 确保 channels.feishu 结构存在
  if (!config.channels) config.channels = {};
  const channels = config.channels as Record<string, unknown>;
  
  // 重要：不能覆盖现有的 feishu 配置，只更新需要的字段
  if (!channels.feishu) {
    channels.feishu = {
      enabled: true,
      dmPolicy: 'pairing',
      connectionMode: 'websocket',
      accounts: {}
    };
  }
  const feishuConfig = channels.feishu as Record<string, unknown>;
  
  // 重要：确保 accounts 不被覆盖
  if (!feishuConfig.accounts) {
    feishuConfig.accounts = {};
  }
  const accounts = feishuConfig.accounts as Record<string, unknown>;

  // 调试：显示当前 accounts
  console.log(chalk.dim(`[调试] 保存前 accounts 中的账号: ${Object.keys(accounts).join(', ') || '无'}`));

  // 添加账号配置
  accounts[agentId] = {
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    botName: botName?.trim() || agent?.name || 'AI助手',
    dmPolicy
  };

  // 调试：显示保存后的 accounts
  console.log(chalk.dim(`[调试] 保存后 accounts 中的账号: ${Object.keys(accounts).join(', ')}`));

  // 确保 bindings 存在
  if (!config.bindings) config.bindings = [];
  const bindings = config.bindings as Array<Record<string, unknown>>;

  // 检查是否已有该 Agent 的绑定
  const existingBindingIndex = bindings.findIndex(
    (b) => b.agentId === agentId && (b.match as Record<string, unknown>)?.channel === 'feishu'
  );

  // 创建默认绑定（该 Bot 的所有消息路由到此 Agent）
  const binding = {
    agentId,
    match: {
      channel: 'feishu',
      accountId: agentId
    }
  };

  if (existingBindingIndex >= 0) {
    bindings[existingBindingIndex] = binding;
  } else {
    bindings.push(binding);
  }

  // 保存配置
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // 记录变更
  configTracker.recordBindingCreate(binding, agentId);

  console.log(chalk.green(`\n✓ 已为 Agent "${agent?.name}" 配置飞书 Bot`));
  console.log(chalk.dim(`  App ID: ${appId}`));
  console.log(chalk.dim(`  Bot 名称: ${botName}`));
  console.log(chalk.dim(`  私聊策略: ${dmPolicy}`));

  console.log(chalk.dim('\n后续步骤：'));
  console.log(chalk.dim('  1. 在飞书开放平台配置事件订阅（im.message.receive_v1）'));
  console.log(chalk.dim('  2. 启动 OpenClaw Gateway: openclaw gateway'));
  console.log(chalk.dim('  3. 用户私聊机器人后会收到配对码'));
  console.log(chalk.dim('  4. 使用"配对管理"批准配对请求\n'));

  await tuiUtils.waitForKey();
}

/**
 * 修改 Agent 的飞书配置
 */
async function editFeishuBot(): Promise<void> {
  const configuredAgents = getConfiguredAgents();
  const agentIds = Object.keys(configuredAgents);

  if (agentIds.length === 0) {
    console.log(chalk.yellow('\n暂无已配置的飞书 Bot\n'));
    await tuiUtils.waitForKey();
    return;
  }

  console.log(chalk.bold('\n✏️  修改 Agent 的飞书配置\n'));

  // 选择 Agent
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要修改的 Agent：',
      choices: [
        ...agentIds.map(id => {
          const agent = agentService.getById(id);
          const info = configuredAgents[id];
          return {
            name: `${agent?.name || id} (${id}) - ${info.botName || info.appId}`,
            value: id
          };
        }),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (agentId === 'cancel') {
    return;
  }

  // 获取当前配置
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath);
  
  const channels = config?.channels as Record<string, unknown> | undefined;
  const feishuConfig = channels?.feishu as Record<string, unknown> | undefined;
  const accounts = feishuConfig?.accounts as Record<string, unknown> | undefined;
  const currentAccount = accounts?.[agentId] as Record<string, unknown> | undefined;

  if (!currentAccount) {
    tuiUtils.printError('配置读取失败');
    return;
  }

  console.log(chalk.dim('\n当前配置：'));
  console.log(chalk.dim(`  App ID: ${currentAccount.appId}`));
  console.log(chalk.dim(`  Bot 名称: ${currentAccount.botName || '-'}`));
  console.log(chalk.dim(`  私聊策略: ${currentAccount.dmPolicy || 'pairing'}\n`));

  // 选择要修改的内容
  const { fields } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'fields',
      message: '选择要修改的内容：',
      choices: [
        { name: 'App Secret（重新输入）', value: 'appSecret' },
        { name: 'Bot 名称', value: 'botName' },
        { name: '私聊策略', value: 'dmPolicy' }
      ]
    }
  ]);

  if (fields.length === 0) {
    console.log(chalk.dim('\n未做任何修改\n'));
    return;
  }

  // 逐个修改
  const updates: Record<string, unknown> = {};

  if (fields.includes('appSecret')) {
    const { appSecret } = await inquirer.prompt([
      {
        type: 'password',
        name: 'appSecret',
        message: '新的 App Secret：'
      }
    ]);
    if (appSecret?.trim()) {
      updates.appSecret = appSecret.trim();
    }
  }

  if (fields.includes('botName')) {
    const { botName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'botName',
        message: '新的 Bot 名称：',
        default: currentAccount.botName as string
      }
    ]);
    updates.botName = botName?.trim();
  }

  if (fields.includes('dmPolicy')) {
    const { dmPolicy } = await inquirer.prompt([
      {
        type: 'list',
        name: 'dmPolicy',
        message: '新的私聊策略：',
        choices: [
          { name: 'pairing - 需配对批准', value: 'pairing' },
          { name: 'open - 允许所有用户私聊', value: 'open' },
          { name: 'disabled - 禁用私聊', value: 'disabled' }
        ],
        default: currentAccount.dmPolicy as string || 'pairing',
        loop: false
      }
    ]);
    updates.dmPolicy = dmPolicy;
  }

  // 应用更新
  Object.assign(currentAccount, updates);

  // 保存
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(chalk.green('\n✓ 配置已更新\n'));
  await tuiUtils.waitForKey();
}

/**
 * 删除 Agent 的飞书配置
 */
async function deleteFeishuBot(): Promise<void> {
  const configuredAgents = getConfiguredAgents();
  const agentIds = Object.keys(configuredAgents);

  if (agentIds.length === 0) {
    console.log(chalk.yellow('\n暂无已配置的飞书 Bot\n'));
    await tuiUtils.waitForKey();
    return;
  }

  console.log(chalk.bold('\n🗑️ 删除 Agent 的飞书配置\n'));
  console.log(chalk.yellow('⚠️ 警告：删除后该 Agent 的飞书 Bot 将无法使用\n'));

  // 选择 Agent
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要删除的 Agent 配置：',
      choices: [
        ...agentIds.map(id => {
          const agent = agentService.getById(id);
          const info = configuredAgents[id];
          return {
            name: `${agent?.name || id} (${id}) - ${info.botName || info.appId}`,
            value: id
          };
        }),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (agentId === 'cancel') {
    return;
  }

  // 确认删除
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认删除该飞书 Bot 配置？',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.dim('\n已取消\n'));
    return;
  }

  // 更新配置
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath);

  if (!config) {
    tuiUtils.printError('配置文件读取失败');
    return;
  }

  // 删除账号配置
  const channels = config.channels as Record<string, unknown> | undefined;
  const feishuConfig = channels?.feishu as Record<string, unknown> | undefined;
  const accounts = feishuConfig?.accounts as Record<string, unknown> | undefined;

  if (accounts && accounts[agentId]) {
    delete accounts[agentId];
  }

  // 删除相关绑定
  if (config.bindings && Array.isArray(config.bindings)) {
    config.bindings = config.bindings.filter(
      (b: { agentId?: string; match?: { channel?: string } }) => 
        !(b.agentId === agentId && b.match?.channel === 'feishu')
    );
  }

  // 保存
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(chalk.green('\n✓ 飞书 Bot 配置已删除\n'));
  await tuiUtils.waitForKey();
}

/**
 * 查看飞书群绑定列表
 */
async function listFeishuGroups(): Promise<void> {
  console.log(chalk.bold.cyan('\n🏢 飞书群绑定列表\n'));
  
  // 从数据库读取事业部列表
  const { departmentRepository } = await import('../../../db/repositories/dept.repo');
  const departments = departmentRepository.findAll();
  
  if (departments.length === 0) {
    console.log(chalk.dim('暂无事业部\n'));
  } else {
    console.log(chalk.dim('事业部'.padEnd(20)) + chalk.dim('飞书群ID'));
    tuiUtils.printDivider();
    
    for (const dept of departments) {
      const groupId = dept.feishu_group_id || '-';
      console.log(`${(dept.name || '-').padEnd(20)}${groupId}`);
    }
    console.log('');
  }
  
  // 显示 openclaw.json 中的 bindings
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath);
  const bindings = (config?.bindings || []) as Array<{ agentId?: string; match?: { channel?: string; peer?: { kind?: string; id?: string }; accountId?: string } }>;
  const feishuBindings = bindings.filter(b => b.match?.channel === 'feishu');

  if (feishuBindings.length > 0) {
    console.log(chalk.bold('飞书路由绑定（openclaw.json）：\n'));
    console.log(chalk.dim('Agent ID'.padEnd(25)) + chalk.dim('类型'.padEnd(10)) + chalk.dim('ID'));
    tuiUtils.printDivider();
    
    for (const binding of feishuBindings) {
      const type = binding.match?.peer?.kind || 'unknown';
      const id = binding.match?.peer?.id || binding.match?.accountId || '*';
      console.log(`${(binding.agentId || '-').padEnd(25)}${type.padEnd(10)}${id}`);
    }
    console.log('');
  }
  
  await tuiUtils.waitForKey();
}

/**
 * 绑定飞书群到事业部
 * 
 * 绑定规则：
 * 1. 该事业部内的所有 Agent 都绑定到群
 * 2. 默认增加总助理（assistant_main）
 * 3. 配置群组设置（requireMention: true 支持 @ 沟通）
 */
async function bindFeishuGroup(): Promise<void> {
  try {
    console.log(chalk.bold.cyan('\n🔗 绑定飞书群到事业部\n'));
    
    // 从数据库读取事业部列表
    const { departmentRepository } = await import('../../../db/repositories/dept.repo');
    const departments = departmentRepository.findAll();
    
    if (departments.length === 0) {
      console.log(chalk.yellow('暂无事业部，请先创建事业部\n'));
      await tuiUtils.waitForKey();
      return;
    }

  // 选择事业部
  const { deptId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deptId',
      message: '选择要绑定的事业部：',
      choices: [
        ...departments.map((d) => ({
          name: `${d.name} (${d.id})${d.feishu_group_id ? ' [已绑定: ' + d.feishu_group_id + ']' : ''}`,
          value: d.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (deptId === 'cancel') {
    return;
  }

  // 输入飞书群ID
  const { groupId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'groupId',
      message: '请输入飞书群ID（oc_xxx 格式）：',
      validate: (input: string) => {
        if (!input.trim()) {
          return '请输入飞书群ID';
        }
        if (!input.startsWith('oc_')) {
          return '飞书群ID格式错误，应以 oc_ 开头';
        }
        return true;
      }
    }
  ]);

  // 更新数据库
  const dept = departments.find((d: { id: string }) => d.id === deptId);
  const oldGroupId = dept?.feishu_group_id;
  departmentRepository.update(deptId, { feishu_group_id: groupId });
  
  // 记录变更（用于重置时撤销）
  configTracker.recordFeishuGroupBind(deptId, dept?.name || deptId, groupId, oldGroupId);

  // 更新 openclaw.json
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath) || {};
  
  // 1. 配置群组设置（支持 @ 沟通）
  if (!config.channels) config.channels = {};
  const channels = config.channels as Record<string, unknown>;
  
  // 重要：不能覆盖现有的 feishu 配置，只更新需要的字段
  if (!channels.feishu) {
    channels.feishu = { 
      enabled: true, 
      dmPolicy: 'pairing',
      groupPolicy: 'allowlist',
      accounts: {}  // 确保 accounts 存在
    };
  }
  const feishuConfig = channels.feishu as Record<string, unknown>;
  
  // 确保 accounts 不被覆盖
  if (!feishuConfig.accounts) {
    feishuConfig.accounts = {};
  }
  
  // 设置群组访问策略
  feishuConfig.groupPolicy = 'allowlist';
  if (!feishuConfig.groupAllowFrom) feishuConfig.groupAllowFrom = [];
  const groupAllowFrom = feishuConfig.groupAllowFrom as string[];
  if (!groupAllowFrom.includes(groupId)) {
    groupAllowFrom.push(groupId);
  }
  
  // 群组详细配置
  if (!feishuConfig.groups) feishuConfig.groups = {};
  const groups = feishuConfig.groups as Record<string, unknown>;
  
  // 群组配置：requireMention: true 表示需要 @ 才能触发
  groups[groupId] = {
    requireMention: true  // 支持 @ 沟通
  };

  // 2. 创建绑定：该事业部所有 Agent + 总助理
  if (!config.bindings) config.bindings = [];
  const bindings = config.bindings as Array<Record<string, unknown>>;
  
  // 获取该事业部的所有 Agent
  const allAgents = agentService.listAll();
  console.log(chalk.dim(`[调试] 总 Agent 数: ${allAgents.length}`));
  
  const deptAgents = allAgents.filter((a) => a.department_id === deptId);
  console.log(chalk.dim(`[调试] 事业部 ${deptId} 的 Agent 数: ${deptAgents.length}`));
  
  // 获取总助理
  const assistantMain = allAgents.find((a) => a.id === 'assistant_main' || a.role === 'assistant');
  console.log(chalk.dim(`[调试] 总助理: ${assistantMain?.id || '未找到'}`));
  
  // 要绑定的 Agent 列表：事业部所有 Agent + 总助理
  const agentsToBind = [...deptAgents];
  if (assistantMain && !agentsToBind.find(a => a.id === assistantMain.id)) {
    agentsToBind.push(assistantMain);
  }
  
  console.log(chalk.dim(`[调试] 最终绑定 Agent 数: ${agentsToBind.length}`));
  
  if (agentsToBind.length === 0) {
    console.log(chalk.yellow('\n⚠️  未找到可绑定的 Agent\n'));
    console.log(chalk.dim('请确保该事业部已创建 Agent（管理者、审核者、执行者）\n'));
    await tuiUtils.waitForKey();
    return;
  }
  
  // 移除该群的旧绑定
  type BindingType = { agentId?: string; match?: { channel?: string; peer?: { kind?: string; id?: string } } };
  const typedBindings = bindings as BindingType[];
  const oldBindings = typedBindings.filter(
    (b) => b.match?.peer?.id !== groupId
  );
  
  // 添加新绑定
  for (const agent of agentsToBind) {
    oldBindings.push({
      agentId: agent.id,
      match: {
        channel: 'feishu',
        peer: {
          kind: 'group',
          id: groupId
        }
      } as any  // 类型断言，允许 accountId 等额外字段
    });
  }
  
  config.bindings = oldBindings;

  // 保存配置
  console.log(chalk.dim(`[调试] 保存配置到: ${configPath}`));
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(chalk.dim(`[调试] 配置已保存`));

  console.log(chalk.green('\n✓ 飞书群已绑定\n'));
  console.log(chalk.dim(`事业部: ${dept?.name || deptId}`));
  console.log(chalk.dim(`群ID: ${groupId}`));
  console.log(chalk.dim(`\n绑定的 Agent（共 ${agentsToBind.length} 个）:`));
  for (const agent of agentsToBind) {
    const roleLabel = agent.role === 'assistant' ? '[总助理]' : 
                      agent.role === 'manager' ? '[管理者]' :
                      agent.role === 'reviewer' ? '[审核者]' : '[执行者]';
    console.log(chalk.dim(`  - ${agent.name} ${roleLabel}`));
  }
  console.log(chalk.dim('\n群组访问配置:'));
  console.log(chalk.dim(`  - groupPolicy: allowlist（仅允许绑定的群）`));
  console.log(chalk.dim(`  - requireMention: true（需要 @ 机器人才能触发）`));
  console.log(chalk.dim('\n使用说明:'));
  console.log(chalk.dim(`  - 在群内 @机器人 发送消息，绑定的 Agent 会响应`));
  console.log(chalk.dim(`  - Agent 可以主动向群发送消息`));
  
  console.log(chalk.yellow('\n⚠️  请重启 Gateway 使配置生效'));
  console.log(chalk.dim('    1. 关闭当前运行的 Gateway（Ctrl+C）'));
  console.log(chalk.dim('    2. 重新启动 Gateway'));
  console.log(chalk.dim('    启动命令: openclaw gateway run\n'));
  
  await tuiUtils.waitForKey('按回车键返回...');
  } catch (error) {
    console.log(chalk.red('\n✗ 绑定失败'));
    console.log(chalk.dim(`错误: ${error instanceof Error ? error.message : String(error)}\n`));
    await tuiUtils.waitForKey();
  }
}

/**
 * 配对管理菜单
 * 
 * 配对流程说明：
 * 1. 用户在飞书私聊机器人
 * 2. 机器人返回配对码（如 ABC123）
 * 3. 管理员在命令行执行配对命令
 * 4. 用户获得对话权限，可以正常对话
 * 
 * 这是安全机制，防止未授权用户与机器人对话
 */
async function showPairingMenu(): Promise<void> {
  // 读取配对请求
  const requests = readFeishuPairingRequests();
  
  console.log(chalk.bold.cyan('\n🔐 配对管理\n'));
  console.log(chalk.dim(`凭证目录: ${getCredentialsDir()}\n`));
  
  if (requests.length === 0) {
    console.log(chalk.dim('暂无待批准的配对请求\n'));
    console.log(chalk.dim('用户在飞书私聊机器人后，会收到配对码\n'));
  } else {
    console.log(chalk.bold(`待批准的配对请求（共 ${requests.length} 个）：\n`));
    console.log(chalk.dim('配对码'.padEnd(15)) + chalk.dim('用户ID'.padEnd(45)) + chalk.dim('账号'));
    tuiUtils.printDivider();
    
    for (const req of requests) {
      const code = req.code || '-';
      const userId = req.id || '-';
      const accountId = req.meta?.accountId || req.accountId || 'default';
      console.log(code.padEnd(15) + userId.padEnd(45) + accountId);
    }
    console.log('');
    
    // 显示配对命令
    console.log(chalk.bold.yellow('请在命令行执行以下命令批准配对：\n'));
    for (const req of requests) {
      const code = req.code;
      const accountId = req.meta?.accountId || req.accountId;
      let cmd = `openclaw pairing approve feishu ${code}`;
      if (accountId && accountId !== 'default') {
        cmd += ` --account ${accountId}`;
      }
      console.log(chalk.cyan(`  ${cmd}`));
    }
    console.log('');
  }
  
  console.log(chalk.dim('───────────────────────────────────────\n'));
  console.log(chalk.dim('提示：配对命令需要在 Gateway 运行目录下执行\n'));
  console.log(chalk.dim('      或设置 OPENCLAW_STATE_DIR 环境变量\n'));
  
  await tuiUtils.waitForKey();
}

/**
 * Gateway 信息
 */
interface GatewayInfo {
  port: number;
  status: 'running' | 'stopped';
  token?: string;
  source: string;  // 来源描述
}

/**
 * 扫描本地端口查找活跃的 Gateway
 */
async function scanGateways(): Promise<GatewayInfo[]> {
  const http = require('http');
  const gateways: GatewayInfo[] = [];
  
  // 常用端口列表
  const commonPorts = [28789, 18789, 38789, 48789];
  
  // 先从 openclaw.json 读取已配置的端口
  const configPath = getOpenClawJsonPath();
  const config = safeReadJsonConfig(configPath);
  const gateway = config?.gateway as Record<string, unknown> | undefined;
  const configPort = (gateway?.port as number) || 28789;
  const configToken = (gateway?.auth as Record<string, unknown>)?.token as string;
  
  // 将配置的端口放在最前面
  const portsToScan = [configPort, ...commonPorts.filter(p => p !== configPort)];
  
  for (const port of portsToScan) {
    const isRunning = await checkGatewayPort(port);
    
    if (isRunning) {
      const token = port === configPort ? configToken : undefined;
      const source = port === configPort ? '当前配置' : '自动发现';
      gateways.push({ port, status: 'running', token, source });
    }
  }
  
  return gateways;
}

/**
 * 检查指定端口是否有 Gateway 运行
 */
function checkGatewayPort(port: number): Promise<boolean> {
  const http = require('http');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res: any) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * 让用户选择 Gateway
 */
async function selectGateway(): Promise<{ port: number; token: string } | null> {
  console.log(chalk.dim('\n正在扫描活跃的 Gateway...\n'));
  
  const gateways = await scanGateways();
  
  if (gateways.length === 0) {
    console.log(chalk.yellow('未发现活跃的 Gateway\n'));
    console.log(chalk.dim('请确保 Gateway 正在运行：'));
    console.log(chalk.cyan('  openclaw gateway\n'));
    return null;
  }
  
  if (gateways.length === 1) {
    const gw = gateways[0];
    console.log(chalk.green(`✓ 发现 Gateway: 端口 ${gw.port} (${gw.source})\n`));
    
    // 如果有 token，直接返回
    if (gw.token) {
      return { port: gw.port, token: gw.token };
    }
    
    // 否则让用户输入 token
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: `请输入 Gateway Token（端口 ${gw.port}）：`
      }
    ]);
    
    if (!token?.trim()) {
      console.log(chalk.yellow('\n未输入 Token，已取消\n'));
      return null;
    }
    
    return { port: gw.port, token: token.trim() };
  }
  
  // 多个 Gateway，让用户选择
  console.log(chalk.dim(`发现 ${gateways.length} 个活跃的 Gateway：\n`));
  
  const choices = gateways.map(gw => ({
    name: `端口 ${gw.port} (${gw.source})${gw.token ? ' [已配置Token]' : ''}`,
    value: gw
  }));
  
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: '选择要使用的 Gateway：',
      choices,
      loop: false
    }
  ]);
  
  if (selected.token) {
    return { port: selected.port, token: selected.token };
  }
  
  // 让用户输入 token
  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: `请输入 Gateway Token（端口 ${selected.port}）：`
    }
  ]);
  
  if (!token?.trim()) {
    console.log(chalk.yellow('\n未输入 Token，已取消\n'));
    return null;
  }
  
  return { port: selected.port, token: token.trim() };
}

/**
 * Gateway WebSocket 客户端
 * 用于调用 Gateway 的配对 API
 */
class GatewayClient {
  private gateway: { port: number; token: string } | null = null;
  
  /**
   * 设置 Gateway 信息
   */
  setGateway(gateway: { port: number; token: string }): void {
    this.gateway = gateway;
  }
  
  /**
   * 初始化：选择或配置 Gateway
   */
  async init(): Promise<boolean> {
    if (this.gateway) return true;
    
    const gateway = await selectGateway();
    if (!gateway) return false;
    
    this.gateway = gateway;
    return true;
  }
  
  /**
   * 调用 Gateway WebSocket 方法
   */
  async callMethod(method: string, params: Record<string, unknown> = {}): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (!this.gateway) {
      return { success: false, error: 'Gateway 未配置' };
    }
    
    // 保存引用，避免在 Promise 回调中访问 this.gateway
    const gateway = this.gateway;
    const WebSocket = require('ws');
    const url = `ws://127.0.0.1:${gateway.port}/ws`;
    const origin = `http://127.0.0.1:${gateway.port}`;
    
    return new Promise((resolve) => {
      // 创建 WebSocket 连接，添加 origin header
      const ws = new WebSocket(url, {
        headers: {
          'Origin': origin
        }
      });
      
      let resolved = false;
      const connectId = `connect_${Date.now()}`;
      const methodId = `method_${Date.now()}`;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve({ success: false, error: '连接超时' });
        }
      }, 15000);
      
      ws.on('open', () => {
        // 等待 challenge 事件，不立即发送
      });
      
      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          
          // 1. 收到 challenge 事件
          if (msg.type === 'event' && msg.event === 'connect.challenge') {
            // 发送 connect 请求（使用正确的客户端 ID 和模式）
            ws.send(JSON.stringify({
              type: 'req',
              id: connectId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: { 
                  id: 'openclaw-control-ui',  // 官方定义的控制 UI 客户端 ID
                  version: '1.0.0', 
                  platform: process.platform, 
                  mode: 'ui'  // UI 模式
                },
                role: 'operator',
                scopes: ['operator.pairing'],
                auth: { token: gateway.token }
              }
            }));
            return;
          }
          
          // 2. connect 响应 (type: "res")
          if (msg.type === 'res' && msg.id === connectId) {
            if (msg.ok) {
              // 连接成功，发送实际的方法调用
              ws.send(JSON.stringify({
                type: 'req',
                id: methodId,
                method: method,
                params: params
              }));
            } else {
              clearTimeout(timeout);
              resolved = true;
              ws.close();
              const errMsg = msg.error?.message || msg.error?.text || JSON.stringify(msg.error);
              resolve({ success: false, error: `认证失败: ${errMsg}` });
            }
            return;
          }
          
          // 3. 方法调用响应 (type: "res")
          if (msg.type === 'res' && msg.id === methodId) {
            clearTimeout(timeout);
            resolved = true;
            ws.close();
            
            if (msg.ok) {
              resolve({ success: true, result: msg.result || msg.payload });
            } else {
              const errMsg = msg.error?.message || msg.error?.text || JSON.stringify(msg.error);
              resolve({ success: false, error: errMsg });
            }
            return;
          }
          
        } catch (e) {
          // 忽略解析错误
        }
      });
      
      ws.on('error', (err: Error) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: `WebSocket错误: ${err.message}` });
        }
      });
      
      ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          const reasonText = reason.toString() || `code=${code}`;
          resolve({ success: false, error: `连接已关闭: ${reasonText}` });
        }
      });
    });
  }
  
  /**
   * 检查并提示用户配置 Gateway
   */
  checkGatewayConfig(): { needsConfig: boolean; message: string } {
    if (!this.gateway) {
      return { needsConfig: false, message: '' };
    }
    
    const configPath = getOpenClawJsonPath();
    const config = safeReadJsonConfig(configPath);
    
    if (!config) {
      return {
        needsConfig: true,
        message: '无法读取配置文件'
      };
    }
    
    const gateway = config.gateway as Record<string, unknown> | undefined;
    const controlUi = gateway?.controlUi as Record<string, unknown> | undefined;
    
    // 检查是否配置了 allowInsecureAuth
    if (controlUi?.allowInsecureAuth !== true) {
      return {
        needsConfig: true,
        message: `需要在 openclaw.json 中添加以下配置：

  "gateway": {
    "controlUi": {
      "allowInsecureAuth": true
    }
  }

或者配置允许的 origin：

  "gateway": {
    "controlUi": {
      "allowedOrigins": ["http://127.0.0.1:${this.gateway.port}"]
    }
  }`
      };
    }
    
    return { needsConfig: false, message: '' };
  }
  
  /**
   * 列出配对请求
   */
  async listPairingRequests(): Promise<{ success: boolean; pending?: Array<{ requestId: string; displayName?: string; platform?: string }>; error?: string }> {
    // node.pair.list 不需要参数
    const result = await this.callMethod('node.pair.list', {});
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // 调试：打印原始返回
    console.log('DEBUG node.pair.list result:', JSON.stringify(result.result, null, 2));
    
    // 返回格式: { pending: [...], paired: [...] }
    const response = result.result as { pending?: Array<{ requestId: string; displayName?: string; platform?: string }>; paired?: unknown[] };
    return { success: true, pending: response.pending || [] };
  }
  
  /**
   * 批准配对请求
   */
  async approvePairing(requestId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.callMethod('node.pair.approve', { requestId });
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    return { success: true };
  }
}

// 全局 Gateway 客户端实例
const gatewayClient = new GatewayClient();

/**
 * 获取凭证目录路径
 *
 * 基于 TUI 启动时选择的工作目录计算：
 * - 工作目录: <project>/.openclaw
 * - 凭证目录: <project>/credentials
 *
 * 即：凭证目录 = 工作目录的父目录/credentials
 */
function getCredentialsDir(): string {
  const path = require('path');
  const os = require('os');
  
  // 获取 TUI 启动时选择的工作目录（.openclaw 目录）
  const openclawRoot = getOpenClawRoot();
  
  // 工作目录的父目录就是项目根目录
  // 凭证目录在项目根目录下的 credentials 文件夹
  if (openclawRoot.endsWith('.openclaw')) {
    const projectDir = path.dirname(openclawRoot);
    return path.join(projectDir, 'credentials');
  }
  
  // 如果不是 .openclaw 结尾，尝试从配置文件路径推导
  const configPath = getOpenClawJsonPath();
  if (configPath) {
    const openclawDir = path.dirname(configPath);
    if (openclawDir.endsWith('.openclaw')) {
      const projectDir = path.dirname(openclawDir);
      return path.join(projectDir, 'credentials');
    }
  }
  
  // 最后尝试环境变量
  if (process.env.OPENCLAW_CREDENTIALS_DIR) {
    return process.env.OPENCLAW_CREDENTIALS_DIR;
  }
  
  if (process.env.OPENCLAW_STATE_DIR) {
    return path.join(process.env.OPENCLAW_STATE_DIR, 'credentials');
  }
  
  // 默认：用户主目录
  return path.join(os.homedir(), '.openclaw', 'credentials');
}

/**
 * 获取飞书配对文件路径
 */
function getFeishuPairingFilePath(): string {
  const path = require('path');
  return path.join(getCredentialsDir(), 'feishu-pairing.json');
}

/**
 * 读取飞书配对请求
 */
function readFeishuPairingRequests(): Array<{ id: string; code: string; accountId?: string; meta?: Record<string, unknown> }> {
  const filePath = getFeishuPairingFilePath();
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data.requests || [];
  } catch {
    return [];
  }
}

/**
 * 批准飞书配对请求
 * 
 * 执行流程（遵循 OpenClaw 标准）：
 * 1. 验证配对码是否有效
 * 2. 查找对应的配对请求（匹配 code 和 accountId）
 * 3. 从待处理配对列表中删除该请求
 * 4. 将发送者 ID 添加到 allowFrom 存储文件
 * 
 * 存储文件位置：
 * - {credentials_dir}/feishu-allowFrom.json（默认账户）
 * - {credentials_dir}/feishu-{accountId}-allowFrom.json（指定账户）
 */
function approveFeishuPairing(code: string, accountId?: string): { success: boolean; error?: string; userId?: string } {
  const credentialsDir = getCredentialsDir();
  const filePath = getFeishuPairingFilePath();
  
  console.log(chalk.dim(`凭证目录: ${credentialsDir}`));
  console.log(chalk.dim(`配对文件: ${filePath}`));
  
  if (!fs.existsSync(filePath)) {
    return { success: false, error: '配对请求文件不存在' };
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const requests = data.requests || [];
    
    console.log(chalk.dim(`当前请求数: ${requests.length}`));
    
    // 查找匹配的配对请求
    const requestIndex = requests.findIndex((r: { code: string }) => 
      r.code && r.code.toUpperCase() === code.toUpperCase()
    );
    
    if (requestIndex < 0) {
      return { success: false, error: `配对码 "${code}" 不存在或已过期` };
    }
    
    const request = requests[requestIndex];
    console.log(chalk.dim(`用户ID: ${request.id}`));
    
    // 从请求列表中移除
    requests.splice(requestIndex, 1);
    data.requests = requests;
    
    // 确保凭证目录存在
    if (!fs.existsSync(credentialsDir)) {
      fs.mkdirSync(credentialsDir, { recursive: true });
    }
    
    // 写回请求文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(chalk.dim(`已从配对列表移除配对码`));
    
    // 获取请求中的 accountId
    const requestAccountId = (request.meta?.accountId || request.accountId) as string | undefined;
    
    // 确定要写入的 accountId（优先级：传入参数 > 请求中的 accountId > default）
    let targetAccountId: string;
    if (accountId && accountId !== 'default') {
      targetAccountId = accountId;
    } else if (requestAccountId) {
      targetAccountId = requestAccountId;
    } else {
      targetAccountId = 'default';
    }
    
    console.log(chalk.dim(`目标账户: ${targetAccountId}`));
    
    // 写入多种格式的 allowFrom 文件，确保 Gateway 能找到
    const userId = request.id;
    const fileNames = [
      'feishu-allowFrom.json',                      // 默认格式
      `feishu-${targetAccountId}-allowFrom.json`,   // 指定账户
      'feishu-default-allowFrom.json'               // default 账户
    ];
    
    for (const fileName of fileNames) {
      const allowFromPath = path.join(credentialsDir, fileName);
      
      let allowFrom: string[] = [];
      if (fs.existsSync(allowFromPath)) {
        try {
          allowFrom = JSON.parse(fs.readFileSync(allowFromPath, 'utf-8')) || [];
        } catch {
          allowFrom = [];
        }
      }
      
      if (!allowFrom.includes(userId)) {
        allowFrom.push(userId);
        fs.writeFileSync(allowFromPath, JSON.stringify(allowFrom, null, 2), 'utf-8');
        console.log(chalk.dim(`已写入: ${fileName}`));
      }
    }
    
    return { success: true, userId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 列出配对请求
 */
async function listPairingRequests(): Promise<void> {
  console.log(chalk.dim('\n正在查询配对请求...\n'));
  console.log(chalk.dim(`凭证目录: ${getCredentialsDir()}\n`));
  
  const requests = readFeishuPairingRequests();
  
  if (requests.length === 0) {
    console.log(chalk.dim('暂无待批准的配对请求\n'));
    console.log(chalk.dim('提示：让用户在飞书私聊机器人，机器人会返回配对码\n'));
  } else {
    console.log(chalk.bold(`待批准的配对请求（共 ${requests.length} 个）：\n`));
    console.log(chalk.dim('配对码'.padEnd(15)) + chalk.dim('用户ID'.padEnd(45)) + chalk.dim('账号'));
    tuiUtils.printDivider();
    
    for (const req of requests) {
      const code = req.code || '-';
      const userId = req.id || '-';
      const accountId = req.accountId || req.meta?.accountId || 'default';
      console.log(code.padEnd(15) + userId.padEnd(45) + accountId);
    }
    console.log('');
  }
  
  await tuiUtils.waitForKey();
}

/**
 * 批准配对请求
 */
async function approvePairingRequest(): Promise<void> {
  console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('配对信息来源：飞书机器人返回的消息'));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  console.log(chalk.dim('用户在飞书私聊机器人后，会收到类似以下消息：\n'));
  console.log(chalk.dim('  OpenClaw: access not configured.'));
  console.log(chalk.dim('  Your Feishu user id: ou_xxxxxx'));
  console.log(chalk.dim('  Pairing code: ABC123'));
  console.log(chalk.dim('  Ask the bot owner to approve with:'));
  console.log(chalk.dim('  openclaw pairing approve feishu ABC123\n'));
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(chalk.dim(`凭证目录: ${getCredentialsDir()}\n`));

  const { pairingCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'pairingCode',
      message: '输入配对码（如 ABC123，留空取消）：'
    }
  ]);

  if (!pairingCode || !pairingCode.trim()) {
    console.log(chalk.dim('\n已取消\n'));
    await tuiUtils.waitForKey();
    return;
  }

  const code = pairingCode.trim().toUpperCase();
  
  console.log(chalk.dim(`\n正在批准配对码: ${code}...\n`));
  
  const result = approveFeishuPairing(code);
  
  if (result.success) {
    console.log(chalk.green('\n✓ 配对已批准！\n'));
    console.log(chalk.dim(`用户ID: ${result.userId}\n`));
    console.log(chalk.yellow.bold('⚠️ 重要：请重启 Gateway 使配对生效\n'));
    console.log(chalk.dim('重启命令：'));
    console.log(chalk.cyan('  1. 停止当前 Gateway (Ctrl+C)'));
    console.log(chalk.cyan('  2. 重新启动 Gateway\n'));
    console.log(chalk.dim('重启后，用户可以在飞书中正常与机器人对话。\n'));
  } else {
    console.log(chalk.yellow('\n⚠️ 批准失败\n'));
    console.log(chalk.dim('错误: ' + (result.error || '未知错误') + '\n'));
    console.log(chalk.dim('可能原因：'));
    console.log(chalk.dim('  • 配对码无效或已过期'));
    console.log(chalk.dim('  • 配对码已被使用'));
    console.log(chalk.dim('  • 凭证目录配置不正确\n'));
  }
  
  await tuiUtils.waitForKey();
}