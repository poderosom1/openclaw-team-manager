/**
 * Agent Management Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { tuiUtils } from '../index';
import { agentService, deptService as departmentService, jobService } from '../../../core/services';

/**
 * 显示 Agent 管理菜单
 */
export async function showAgentManageMenu(): Promise<void> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('🤖 Agent 管理')),
      new inquirer.Separator(),
      { name: '📋 查看所有 Agent', value: 'list' },
      { name: '➕ 创建 Agent', value: 'create' },
      { name: '🔍 查看单个 Agent', value: 'view' },
      { name: '✏️ 更新 Agent', value: 'update' },
      { name: '🗑️ 删除 Agent', value: 'delete' },
      { name: '📎 绑定飞书 Bot', value: 'bindFeishu' },
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
        pageSize: 15
      }
    ]);

    switch (action) {
      case 'list':
        await listAgents();
        break;
      case 'create':
        await createAgent();
        break;
      case 'view':
        await viewAgent();
        break;
      case 'update':
        await updateAgent();
        break;
      case 'delete':
        await deleteAgent();
        break;
      case 'bindFeishu':
        await bindFeishuBot();
        break;
      case 'back':
        return;
    }
  }
}

/**
 * 列出所有 Agent
 */
async function listAgents(): Promise<void> {
  const agents = agentService.listAll();

  if (agents.length === 0) {
    console.log(chalk.dim('\n暂无 Agent\n'));
    return;
  }

  const roleNames: Record<string, string> = {
    assistant: '总助理',
    manager: '管理者',
    reviewer: '审核者',
    executor: '执行者'
  };

  console.log(chalk.bold('\n📋 Agent 列表\n'));
  console.log(chalk.dim('ID'.padEnd(25)) + chalk.dim('名称'.padEnd(20)) + chalk.dim('角色'.padEnd(10)) + chalk.dim('事业部/职业'));
  tuiUtils.printDivider();

  for (const agent of agents) {
    const id = agent.id.padEnd(25);
    const name = agent.name.padEnd(20);
    const role = (roleNames[agent.role] || agent.role).padEnd(10);
    
    // 获取事业部名称和职业名称
    let info = agent.department_id || '-';
    if (agent.job_id) {
      const job = jobService.getById(agent.job_id);
      info += ` | ${job?.name || agent.job_id}`;
    }
    
    console.log(`${id}${name}${role}${info}`);
  }

  console.log('');
}

/**
 * 创建 Agent
 */
async function createAgent(): Promise<void> {
  // 选择角色
  const { role } = await inquirer.prompt([
    {
      type: 'list',
      name: 'role',
      message: '➕ 创建 Agent - 选择角色类型：',
      choices: [
        { name: '管理者 - 事业部对接人', value: 'manager' },
        { name: '审核者 - 质量把控', value: 'reviewer' },
        { name: '执行者 - 具体执行', value: 'executor' },
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (role === 'cancel') {
    return;
  }

  // 选择事业部
  const departments = departmentService.listAll();
  if (departments.length === 0) {
    tuiUtils.printError('暂无事业部，请先创建事业部');
    return;
  }

  const { departmentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'departmentId',
      message: '选择所属事业部：',
      choices: [
        ...departments.map(d => ({
          name: `${d.name} (${d.id})`,
          value: d.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (departmentId === 'cancel') {
    return;
  }

  // 输入名称
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Agent 名称（留空取消）：',
    }
  ]);

  // 检查是否取消
  if (!name || !name.trim()) {
    return;
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义 Agent ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: 'Agent ID（留空取消）：',
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return;
    }
    id = customIdValue.trim();
  }

  // 如果是执行者，选择职业（可选）
  let jobId: string | undefined;
  if (role === 'executor') {
    const jobs = jobService.listAll();
    if (jobs.length > 0) {
      const { selectedJobId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedJobId',
          message: '选择职业（可选）：',
          choices: [
            { name: '不选择职业', value: 'none' },
            new inquirer.Separator(),
            ...jobs.map(j => ({
              name: `${j.name} (${j.id})`,
              value: j.id
            })),
            new inquirer.Separator(),
            { name: '🔙 取消', value: 'cancel' }
          ],
          loop: false
        }
      ]);

      if (selectedJobId === 'cancel') {
        return;
      }
      if (selectedJobId !== 'none') {
        jobId = selectedJobId;
      }
    }
  }

  const result = agentService.create({
    id,
    name: name.trim(),
    department_id: departmentId,
    role: role as 'manager' | 'reviewer' | 'executor',
    job_id: jobId
  });

  if (result.success) {
    tuiUtils.printSuccess(`Agent 创建成功: ${result.agent?.id}`);
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * 查看单个 Agent
 */
async function viewAgent(): Promise<void> {
  const agents = agentService.listAll();
  if (agents.length === 0) {
    tuiUtils.printWarning('暂无 Agent');
    return;
  }

  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要查看的 Agent：',
      choices: [
        ...agents.map(a => ({
          name: `${a.name} (${a.id})`,
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
  if (!agent) {
    tuiUtils.printError('Agent 不存在');
    return;
  }

  const roleNames: Record<string, string> = {
    assistant: '总助理',
    manager: '管理者',
    reviewer: '审核者',
    executor: '执行者'
  };

  console.log(chalk.bold(`\n📋 Agent 详情\n`));
  tuiUtils.printInfo('ID', agent.id);
  tuiUtils.printInfo('名称', agent.name);
  tuiUtils.printInfo('角色', roleNames[agent.role] || agent.role);
  tuiUtils.printInfo('状态', agent.status);
  if (agent.department_id) {
    tuiUtils.printInfo('所属事业部', agent.department_id);
  }
  if (agent.job_id) {
    tuiUtils.printInfo('职业', agent.job_id);
  }
  if (agent.feishu_bot_id) {
    tuiUtils.printInfo('飞书 Bot ID', agent.feishu_bot_id);
  }
  if (agent.workspace_path) {
    tuiUtils.printInfo('工作空间', agent.workspace_path);
  }
  console.log('');
}

/**
 * 更新 Agent
 */
async function updateAgent(): Promise<void> {
  const agents = agentService.listAll().filter(a => a.role !== 'assistant');
  if (agents.length === 0) {
    tuiUtils.printWarning('暂无可更新的 Agent');
    return;
  }

  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要更新的 Agent：',
      choices: [
        ...agents.map(a => ({
          name: `${a.name} (${a.id})`,
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
  if (!agent) {
    tuiUtils.printError('Agent 不存在');
    return;
  }

  const { name, status } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Agent 名称：',
      default: agent.name
    },
    {
      type: 'list',
      name: 'status',
      message: '状态：',
      choices: [
        { name: '活跃', value: 'active' },
        { name: '停用', value: 'inactive' }
      ],
      default: agent.status,
      loop: false
    }
  ]);

  agentService.update(agentId, {
    name: name.trim(),
    status: status as 'active' | 'inactive'
  });

  tuiUtils.printSuccess('Agent 更新成功');
}

/**
 * 删除 Agent
 * 注意：只能删除执行者角色
 */
async function deleteAgent(): Promise<void> {
  // 只显示执行者角色的 Agent
  const agents = agentService.listAll().filter(a => a.role === 'executor');
  if (agents.length === 0) {
    tuiUtils.printWarning('暂无可删除的执行者 Agent');
    console.log(chalk.dim('提示：只能删除执行者角色，管理者和审核者不能删除\n'));
    return;
  }

  // 显示 Agent 列表，包含所属关系
  console.log(chalk.bold('\n🗑️ 选择要删除的执行者 Agent\n'));
  console.log(chalk.dim('名称'.padEnd(20)) + chalk.dim('事业部'.padEnd(20)) + chalk.dim('职业'));
  tuiUtils.printDivider();

  for (const agent of agents) {
    const name = agent.name.padEnd(20);
    
    // 获取事业部名称
    let deptName = '-';
    if (agent.department_id) {
      const dept = departmentService.getById(agent.department_id);
      deptName = dept?.name || agent.department_id;
    }
    deptName = deptName.padEnd(20);
    
    // 获取职业名称
    let jobName = '-';
    if (agent.job_id) {
      const job = jobService.getById(agent.job_id);
      jobName = job?.name || agent.job_id;
    }
    
    console.log(`${name}${deptName}${jobName}`);
  }

  console.log(chalk.dim('\n提示：只能删除执行者角色，管理者和审核者不能删除\n'));

  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '选择要删除的执行者：',
      choices: [
        ...agents.map(a => {
          const dept = a.department_id ? departmentService.getById(a.department_id) : null;
          const job = a.job_id ? jobService.getById(a.job_id) : null;
          const info = [
            dept ? `事业部: ${dept.name}` : '',
            job ? `职业: ${job.name}` : ''
          ].filter(Boolean).join(' | ');
          return {
            name: `${a.name} (${a.id})${info ? ` - ${info}` : ''}`,
            value: a.id
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

  // 显示该 Agent 的详细信息
  const agent = agentService.getById(agentId);
  if (!agent) {
    tuiUtils.printError('Agent 不存在');
    return;
  }

  console.log(chalk.bold('\n📋 Agent 详细信息\n'));
  tuiUtils.printInfo('ID', agent.id);
  tuiUtils.printInfo('名称', agent.name);
  tuiUtils.printInfo('角色', '执行者');
  
  if (agent.department_id) {
    const dept = departmentService.getById(agent.department_id);
    tuiUtils.printInfo('所属事业部', dept ? `${dept.name} (${agent.department_id})` : agent.department_id);
  }
  
  if (agent.job_id) {
    const job = jobService.getById(agent.job_id);
    tuiUtils.printInfo('职业', job ? `${job.name} (${agent.job_id})` : agent.job_id);
  }

  console.log('');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.red('确定要删除该执行者吗？此操作不可恢复！'),
      default: false
    }
  ]);

  if (!confirm) {
    return;
  }

  const result = agentService.delete(agentId);
  if (result.success) {
    tuiUtils.printSuccess(result.message);
    if (result.restartReminder) {
      console.log(chalk.yellow(`\n${result.restartReminder}\n`));
    }
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * 绑定飞书 Bot
 */
async function bindFeishuBot(): Promise<void> {
  const agents = agentService.listAll();
  if (agents.length === 0) {
    tuiUtils.printWarning('暂无 Agent');
    return;
  }

  // 选择 Agent
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: '📎 绑定飞书 Bot - 选择 Agent：',
      choices: [
        ...agents.map(a => ({
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
  if (!agent) {
    tuiUtils.printError('Agent 不存在');
    return;
  }

  // 输入飞书配置信息
  const { appId, appSecret, botName, encryptKey, verificationToken } = await inquirer.prompt([
    {
      type: 'input',
      name: 'appId',
      message: 'App ID (cli_xxx 格式，留空取消)：'
    },
    {
      type: 'password',
      name: 'appSecret',
      message: 'App Secret：',
      when: (answers) => answers.appId && answers.appId.trim() !== ''
    },
    {
      type: 'input',
      name: 'botName',
      message: '机器人名称（可选）：',
      default: agent.name,
      when: (answers) => answers.appId && answers.appId.trim() !== ''
    },
    {
      type: 'input',
      name: 'encryptKey',
      message: 'Encrypt Key（可选）：',
      when: (answers) => answers.appId && answers.appId.trim() !== ''
    },
    {
      type: 'input',
      name: 'verificationToken',
      message: 'Verification Token（可选）：',
      when: (answers) => answers.appId && answers.appId.trim() !== ''
    }
  ]);

  // 检查是否取消
  if (!appId || !appId.trim()) {
    return;
  }

  // 验证 App ID 格式
  if (!appId.startsWith('cli_')) {
    tuiUtils.printError('App ID 应以 cli_ 开头');
    return;
  }

  if (!appSecret || !appSecret.trim()) {
    tuiUtils.printError('App Secret 不能为空');
    return;
  }

  // 选择私聊策略
  const { dmPolicy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'dmPolicy',
      message: '私聊策略：',
      choices: [
        { name: 'pairing - 需要配对码批准（推荐）', value: 'pairing' },
        { name: 'allowlist - 仅允许白名单用户', value: 'allowlist' },
        { name: 'open - 允许所有私聊', value: 'open' },
        { name: 'disabled - 禁用私聊', value: 'disabled' },
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      default: 'pairing',
      loop: false
    }
  ]);

  if (dmPolicy === 'cancel') {
    return;
  }

  // 确认配置
  console.log(chalk.bold('\n📋 配置确认\n'));
  tuiUtils.printInfo('Agent', `${agent.name} (${agent.id})`);
  tuiUtils.printInfo('App ID', appId);
  tuiUtils.printInfo('App Secret', '******');
  tuiUtils.printInfo('机器人名称', botName || '未设置');
  tuiUtils.printInfo('私聊策略', dmPolicy);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认以上配置？',
      default: true
    }
  ]);

  if (!confirm) {
    return;
  }

  // 调用服务更新配置
  const result = agentService.bindFeishuBotComplete({
    agentId,
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    botName: botName?.trim(),
    encryptKey: encryptKey?.trim() || undefined,
    verificationToken: verificationToken?.trim() || undefined,
    dmPolicy
  });

  if (result.success) {
    tuiUtils.printSuccess(result.message);
    console.log(chalk.dim('\n后续步骤：'));
    console.log(chalk.dim('1. 在飞书开放平台启用机器人能力'));
    console.log(chalk.dim('2. 配置事件订阅（选择"使用长连接接收事件"）'));
    console.log(chalk.dim('3. 添加事件: im.message.receive_v1'));
    console.log(chalk.dim('4. 发布应用版本并提交审核'));
  } else {
    tuiUtils.printError(result.message);
  }
}