/**
 * Department (Team) Commands
 */

import chalk from 'chalk';
import { deptService } from '../../core/services';
import { initializeDatabase, isDatabaseInitialized } from '../../db';

interface CreateDeptOptions {
  name: string;
  id?: string;
}

interface UpdateDeptOptions {
  id: string;
  name?: string;
  feishuGroupId?: string;
}

/**
 * Create team
 */
export async function createDeptCommand(options: CreateDeptOptions): Promise<void> {
  // Ensure database is initialized
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const result = deptService.create({ name: options.name, id: options.id });
  
  if (result.success) {
    console.log(chalk.green('✓ 团队创建成功'));
    console.log(`  ID: ${result.department?.id}`);
    console.log(`  名称: ${result.department?.name}`);
  } else {
    console.log(chalk.red('错误：' + result.message));
  }
}

/**
 * List all teams
 */
export async function listDeptsCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const depts = deptService.listAll();

  if (depts.length === 0) {
    console.log(chalk.yellow('暂无团队'));
    return;
  }

  console.log(chalk.bold('\n团队列表：\n'));
  console.log('  ID\t\t名称\t\t\tAgent数');
  console.log('  ─────────────────────────────────────');

  for (const dept of depts) {
    const stats = deptService.getStats(dept.id);
    console.log(`  ${dept.id}\t${dept.name}\t\t${stats.agent_count}`);
  }

  console.log('');
}

/**
 * Update team
 */
export async function updateDeptCommand(options: UpdateDeptOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const dept = deptService.getById(options.id);
  if (!dept) {
    console.log(chalk.red('错误：团队不存在'));
    return;
  }

  deptService.update(options.id, {
    name: options.name,
    feishu_group_id: options.feishuGroupId
  });

  console.log(chalk.green('✓ 团队已更新'));
}

/**
 * Delete team
 */
export async function deleteDeptCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const result = deptService.delete(options.id);
  
  if (result.success) {
    console.log(chalk.green('✓ ' + result.message));
  } else {
    console.log(chalk.red('错误：' + result.message));
  }
}