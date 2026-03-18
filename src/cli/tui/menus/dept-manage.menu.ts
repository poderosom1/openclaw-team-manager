/**
 * Department (Team) Management Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { tuiUtils } from '../index';
import { deptService, agentService, jobService } from '../../../core/services';
import { getOpenClawJsonPath, getOpenClawRoot } from '../../../core/utils';
import { cleanupFeishuCredentialsForAgents } from '../../../core/utils/credentials-cleanup';

/**
 * Show team management menu
 */
export async function showDeptManageMenu(): Promise<void> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('🏢 团队管理')),
      new inquirer.Separator(),
      { name: '📋 查看所有团队', value: 'list' },
      { name: '➕ 创建团队', value: 'create' },
      { name: '🔍 查看团队详情', value: 'view' },
      { name: '🗑️ 删除团队', value: 'delete' },
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
        await listDepartments();
        break;
      case 'create':
        await createDepartment();
        break;
      case 'view':
        await viewDepartment();
        break;
      case 'delete':
        await deleteDepartment();
        break;
      case 'back':
        return;
    }
  }
}

/**
 * List all teams
 */
async function listDepartments(): Promise<void> {
  const departments = deptService.listAll();

  if (departments.length === 0) {
    console.log(chalk.dim('\n暂无团队\n'));
    return;
  }

  const agents = agentService.listAll();

  console.log(chalk.bold('\n🏢 团队列表\n'));
  console.log(chalk.dim('名称'.padEnd(20)) + chalk.dim('ID'.padEnd(25)) + chalk.dim('Agent数') + chalk.dim('飞书群'));
  tuiUtils.printDivider();

  for (const dept of departments) {
    const name = dept.name.padEnd(20);
    const id = dept.id.padEnd(25);
    const agentCount = agents.filter((a: any) => a.department_id === dept.id).length;
    const feishu = dept.feishu_group_id ? '已绑定' : '-';
    
    console.log(`${name}${id}${String(agentCount).padEnd(8)}${feishu}`);
  }

  console.log('');
}

/**
 * Create team
 */
async function createDepartment(): Promise<void> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '➕ 创建团队 - 名称（直接按回车取消）：'
    }
  ]);

  if (!name || !name.trim()) {
    return;
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义团队ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: '团队ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return;
    }
    id = customIdValue.trim();
  }

  const result = deptService.create({ name: name.trim(), id });

  if (result.success) {
    tuiUtils.printSuccess(`团队创建成功: ${result.department?.id}`);
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * View team details
 */
async function viewDepartment(): Promise<void> {
  const departments = deptService.listAll();
  if (departments.length === 0) {
    tuiUtils.printWarning('暂无团队');
    return;
  }

  const { departmentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'departmentId',
      message: '选择要查看的团队：',
      choices: [
        ...departments.map((d: any) => ({
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

  const dept = deptService.getById(departmentId);
  if (!dept) {
    tuiUtils.printError('团队不存在');
    return;
  }

  const agents = agentService.listByDepartment(departmentId);
  const stats = deptService.getStats(departmentId);

  console.log(chalk.bold(`\n🏢 团队详情\n`));
  tuiUtils.printInfo('ID', dept.id);
  tuiUtils.printInfo('名称', dept.name);
  tuiUtils.printInfo('创建时间', dept.created_at);
  
  if (dept.feishu_group_id) {
    tuiUtils.printInfo('飞书群ID', dept.feishu_group_id);
  }

  console.log(chalk.bold('\n📊 统计信息：'));
  tuiUtils.printInfo('Agent 总数', String(stats.agent_count));
  tuiUtils.printInfo('管理者', String(stats.manager_count));
  tuiUtils.printInfo('审核者', String(stats.reviewer_count));
  tuiUtils.printInfo('执行者', String(stats.executor_count));

  if (agents.length > 0) {
    console.log(chalk.bold('\n🤖 Agent 列表：'));
    const roleNames: Record<string, string> = {
      manager: '管理者',
      reviewer: '审核者',
      executor: '执行者'
    };
    for (const agent of agents) {
      const role = roleNames[agent.role] || agent.role;
      let info = `${agent.name} (${role})`;
      
      // Executor shows job info
      if (agent.role === 'executor' && agent.job_id) {
        const job = jobService.getById(agent.job_id);
        info += ` - 职业: ${job?.name || agent.job_id}`;
      }
      
      console.log(`  • ${info}`);
    }
  }

  console.log('');
}

/**
 * Delete team
 */
async function deleteDepartment(): Promise<void> {
  const departments = deptService.listAll();
  if (departments.length === 0) {
    tuiUtils.printWarning('暂无团队');
    return;
  }

  const { departmentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'departmentId',
      message: '选择要删除的团队：',
      choices: [
        ...departments.map((d: any) => ({
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

  const dept = deptService.getById(departmentId);
  const agents = agentService.listByDepartment(departmentId);

  // Show what will be deleted
  console.log(chalk.bold('\n⚠️  即将删除以下内容：\n'));
  console.log(`  团队: ${dept?.name} (${departmentId})`);
  console.log(`  Agent 数量: ${agents.length}`);
  console.log('');

  // First confirmation
  const { confirm1 } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm1',
      message: chalk.yellow('确定要删除该团队吗？关联的Agent也会被删除！'),
      default: false
    }
  ]);

  if (!confirm1) {
    console.log(chalk.dim('\n已取消\n'));
    return;
  }

  // Second confirmation: enter team ID
  const { confirmText } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmText',
      message: chalk.red(`请输入团队ID "${departmentId}" 确认删除：`)
    }
  ]);

  if (confirmText !== departmentId) {
    console.log(chalk.dim('\n已取消删除\n'));
    return;
  }

  // Execute deletion
  console.log(chalk.dim('\n正在删除团队...'));

  try {
    let deletedAgents = 0;
    const agentIds: string[] = [];

    // Delete all Agents
    for (const agent of agents) {
      const workspacePath = path.join(getOpenClawRoot(), `workspace-${agent.id}`);
      const agentDir = path.join(getOpenClawRoot(), 'agents', agent.id);
      
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
      if (fs.existsSync(agentDir)) {
        fs.rmSync(agentDir, { recursive: true, force: true });
      }
      
      removeAgentFromConfig(agent.id);
      agentService.delete(agent.id);
      agentIds.push(agent.id);
      deletedAgents++;
    }

    // Clean up feishu credentials for all deleted agents
    if (agentIds.length > 0) {
      const cleanupResult = cleanupFeishuCredentialsForAgents(agentIds);
      if (cleanupResult.deleted.length > 0) {
        console.log(chalk.dim(`  已清理 ${cleanupResult.deleted.length} 个飞书配对文件`));
      }
    }

    // Delete team
    deptService.delete(departmentId);

    console.log(chalk.green('\n✓ 团队已删除！'));
    console.log(chalk.dim(`  已删除 ${deletedAgents} 个 Agent\n`));

  } catch (error) {
    tuiUtils.printError(`删除失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Remove Agent from openclaw.json
 */
function removeAgentFromConfig(agentId: string): void {
  try {
    const configPath = getOpenClawJsonPath();
    if (!fs.existsSync(configPath)) return;

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Remove agent from agents.list
    if (config.agents?.list) {
      config.agents.list = config.agents.list.filter(
        (a: { id: string }) => a.id !== agentId
      );
    }

    // Remove related bindings
    if (config.bindings) {
      config.bindings = config.bindings.filter(
        (b: { agentId?: string }) => b.agentId !== agentId
      );
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.warn(`警告：从配置移除 Agent 失败: ${error}`);
  }
}