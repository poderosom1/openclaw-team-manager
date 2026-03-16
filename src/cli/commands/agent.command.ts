/**
 * Agent Commands
 */

import chalk from 'chalk';
import { agentService } from '../../core/services';
import { isDatabaseInitialized } from '../../db';
import { RoleType } from '../../core/models/types';

interface CreateAgentOptions {
  name: string;
  role: string;
  id?: string;
  dept?: string;
  job?: string;
}

interface GetAgentOptions {
  id?: string;
  departmentId?: string;
  role?: string;
}

/**
 * Create agent
 */
export async function createAgentCommand(options: CreateAgentOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  // Validate role type
  const validRoles: RoleType[] = ['assistant', 'manager', 'executor', 'reviewer'];
  if (!validRoles.includes(options.role as RoleType)) {
    console.log(chalk.red(`错误：无效的角色类型 "${options.role}"，必须是: ${validRoles.join(', ')}`));
    return;
  }

  const result = agentService.create({
    id: options.id,
    name: options.name,
    role: options.role as RoleType,
    department_id: options.dept,
    job_id: options.job
  });

  if (result.success) {
    console.log(chalk.green('✓ Agent创建成功'));
    console.log(`  ID: ${result.agent?.id}`);
    console.log(`  名称: ${result.agent?.name}`);
    console.log(`  角色: ${result.agent?.role}`);
    if (result.agent?.department_id) {
      console.log(`  所属团队: ${result.agent.department_id}`);
    }
  } else {
    console.log(chalk.red('错误：' + result.message));
  }
}

/**
 * Query agent
 */
export async function getAgentCommand(options: GetAgentOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  if (options.id) {
    // Query by ID
    const agent = agentService.getById(options.id);
    if (!agent) {
      console.log(chalk.red('错误：Agent不存在'));
      return;
    }
    printAgentDetail(agent);
  } else if (options.departmentId && options.role) {
    // Query by team and role
    const result = agentService.getByDepartmentAndRole(
      options.departmentId,
      options.role as RoleType
    );

    if (!result) {
      console.log(chalk.yellow('未找到匹配的Agent'));
      return;
    }

    if (Array.isArray(result)) {
      console.log(chalk.bold(`\n找到 ${result.length} 个Agent：\n`));
      for (const agent of result) {
        printAgentBrief(agent);
      }
    } else {
      printAgentDetail(result);
    }
  } else {
    console.log(chalk.red('错误：请指定 --id 或同时指定 --department-id 和 --role'));
  }
}

/**
 * List agents
 */
export async function listAgentsCommand(options: { departmentId?: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const agents = options.departmentId
    ? agentService.listByDepartment(options.departmentId)
    : agentService.listAll();

  if (agents.length === 0) {
    console.log(chalk.yellow('暂无Agent'));
    return;
  }

  console.log(chalk.bold(`\nAgent列表（共 ${agents.length} 个）：\n`));
  console.log('  ID\t\t\t名称\t\t\t角色\t\t团队');
  console.log('  ─────────────────────────────────────────────────────');

  for (const agent of agents) {
    const dept = agent.department_id || '-';
    console.log(`  ${agent.id}\t${agent.name}\t\t${agent.role}\t\t${dept}`);
  }

  console.log('');
}

/**
 * Delete agent
 */
export async function deleteAgentCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const result = agentService.delete(options.id);

  if (result.success) {
    console.log(chalk.green('✓ ' + result.message));
  } else {
    console.log(chalk.red('错误：' + result.message));
  }
}

/**
 * Print agent details
 */
function printAgentDetail(agent: ReturnType<typeof agentService.getById>): void {
  if (!agent) return;

  console.log(chalk.bold('\nAgent详情：\n'));
  console.log(`  ID: ${agent.id}`);
  console.log(`  名称: ${agent.name}`);
  console.log(`  角色: ${agent.role}`);
  console.log(`  状态: ${agent.status}`);
  console.log(`  所属团队: ${agent.department_id || '无'}`);
  console.log(`  职业: ${agent.job_id || '无'}`);
  console.log(`  工作空间: ${agent.workspace_path || '未设置'}`);
  console.log(`  飞书Bot: ${agent.feishu_bot_id || '未绑定'}`);
  console.log('');
}

/**
 * Print agent brief info
 */
function printAgentBrief(agent: ReturnType<typeof agentService.getById>): void {
  if (!agent) return;
  console.log(`  ${agent.id} - ${agent.name} (${agent.role})`);
}