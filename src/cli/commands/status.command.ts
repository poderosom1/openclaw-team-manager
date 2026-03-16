/**
 * Status Command
 * 
 * Team Manager 0.0.3 - Basic Version
 */

import chalk from 'chalk';
import { companyRepository, agentRepository, departmentRepository } from '../../db/repositories';
import { isDatabaseInitialized } from '../../db';

/**
 * View system status
 */
export async function statusCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.yellow('系统未初始化'));
    console.log('请执行 team-setup init 进行初始化');
    return;
  }

  console.log(chalk.bold('\n系统状态\n'));

  // Company info
  const company = companyRepository.getDefault();
  if (company) {
    console.log(chalk.cyan('公司信息：'));
    console.log(`  公司名称: ${company.name}`);
    console.log(`  创建时间: ${company.created_at}`);
  }

  // Assistant
  const assistant = agentRepository.getAssistant();
  if (assistant) {
    console.log(chalk.cyan('\n总助理：'));
    console.log(`  ID: ${assistant.id}`);
    console.log(`  名称: ${assistant.name}`);
    console.log(`  状态: ${assistant.status}`);
  }

  // Team list
  const depts = departmentRepository.findAll();
  console.log(chalk.cyan('\n团队列表：'));
  if (depts.length === 0) {
    console.log('  暂无团队');
  } else {
    console.log('  ID\t\t名称\t\t\tAgent数');
    console.log('  ────────────────────────────────────────────────');
    for (const dept of depts) {
      const agents = agentRepository.findByDepartment(dept.id);
      console.log(`  ${dept.id}\t${dept.name}\t\t${agents.length}`);
    }
  }

  // Agent statistics
  const allAgents = agentRepository.findAll();
  console.log(chalk.cyan('\nAgent 统计：'));
  console.log(`  总数: ${allAgents.length}`);
  console.log(`  管理者: ${allAgents.filter((a: any) => a.role === 'manager').length}`);
  console.log(`  执行者: ${allAgents.filter((a: any) => a.role === 'executor').length}`);
  console.log(`  审核者: ${allAgents.filter((a: any) => a.role === 'reviewer').length}`);

  console.log('');
}