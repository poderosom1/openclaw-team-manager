/**
 * System Status Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { tuiUtils } from '../index';
import { deptService as departmentService, agentService, jobService, skillPackService } from '../../../core/services';

/**
 * Show system status
 */
export async function showSystemStatus(): Promise<void> {
  while (true) {
    const departments = departmentService.listAll();
    const agents = agentService.listAll();
    const jobs = jobService.listAll();
    const skillPacks = skillPackService.listAll();

    // Agent distribution
    const assistant = agents.filter((a: any) => a.role === 'assistant');
    const managers = agents.filter((a: any) => a.role === 'manager');
    const reviewers = agents.filter((a: any) => a.role === 'reviewer');
    const executors = agents.filter((a: any) => a.role === 'executor');

    const choices = [
      new inquirer.Separator(chalk.cyan.bold('📊 系统状态')),
      new inquirer.Separator(),
      new inquirer.Separator(`🤖 总助理: ${assistant.length} | 管理者: ${managers.length} | 审核者: ${reviewers.length} | 执行者: ${executors.length}`),
      new inquirer.Separator(`🏢 团队: ${departments.length} | 职业: ${jobs.length} | 技能包: ${skillPacks.length}`),
      new inquirer.Separator(),
      { name: '🏢 按团队查看', value: 'departments' },
      { name: '🤖 查看所有 Agent', value: 'agents' },
      { name: '🔄 刷新状态', value: 'refresh' },
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
      case 'departments':
        await showDepartmentsView(departments, agents);
        break;
      case 'agents':
        await showAgentsView(agents);
        break;
      case 'refresh':
        continue;
      case 'back':
        return;
    }
  }
}

/**
 * View by team
 */
async function showDepartmentsView(departments: any[], agents: any[]): Promise<void> {
  console.log(chalk.bold('\n🏢 团队概览\n'));

  if (departments.length === 0) {
    console.log(chalk.dim('暂无团队\n'));
    return;
  }

  for (const dept of departments) {
    const deptAgents = agents.filter((a: any) => a.department_id === dept.id);
    const manager = deptAgents.find((a: any) => a.role === 'manager');
    const reviewer = deptAgents.find((a: any) => a.role === 'reviewer');
    const executors = deptAgents.filter((a: any) => a.role === 'executor');

    console.log(chalk.cyan(`${dept.name} (${dept.id})`));
    if (manager) {
      console.log(`  管理者: ${manager.name}`);
    }
    if (reviewer) {
      console.log(`  审核者: ${reviewer.name}`);
    }
    if (executors.length > 0) {
      console.log(`  执行者: ${executors.map((e: any) => e.name).join(', ')}`);
    }
    console.log('');
  }
}

/**
 * View all agents
 */
async function showAgentsView(agents: any[]): Promise<void> {
  console.log(chalk.bold('\n🤖 Agent 列表\n'));

  const roleNames: Record<string, string> = {
    assistant: '总助理',
    manager: '管理者',
    reviewer: '审核者',
    executor: '执行者'
  };

  const roleOrder = ['assistant', 'manager', 'reviewer', 'executor'];

  for (const role of roleOrder) {
    const roleAgents = agents.filter((a: any) => a.role === role);
    if (roleAgents.length > 0) {
      console.log(chalk.cyan(`${roleNames[role]}：`));
      for (const agent of roleAgents) {
        let info = `  • ${agent.name} (${agent.id})`;
        if (agent.role === 'executor' && agent.job_id) {
          const job = jobService.getById(agent.job_id);
          info += ` - 职业: ${job?.name || agent.job_id}`;
        }
        console.log(info);
      }
      console.log('');
    }
  }
}