/**
 * Main Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { tuiUtils } from '../index';
import { showTeamCreateWizard } from './team-create.menu';
import { showSystemStatus } from './status.menu';
import { showAgentManageMenu } from './agent-manage.menu';
import { showJobManageMenu } from './job-manage.menu';
import { showDeptManageMenu } from './dept-manage.menu';
import { showFeishuConfigMenu } from './feishu.menu';
import { showResetSystemDialog } from './reset.menu';

/**
 * Show main menu
 * 
 * @returns true for normal exit, false if needs re-initialization (after reset)
 */
export async function showMainMenu(): Promise<boolean> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('🤖 Team Manager - 多Agent协作框架')),
      new inquirer.Separator(),
      { name: '👥 团队创建向导', value: 'team' },
      new inquirer.Separator(),
      { name: '🏢 团队管理', value: 'department' },
      { name: '🤖 Agent 管理', value: 'agent' },
      new inquirer.Separator(),
      { name: '💼 职业管理', value: 'job' },
      { name: '📦 技能包管理', value: 'skillPack' },
      new inquirer.Separator(),
      { name: '📱 飞书配置', value: 'feishu' },
      { name: '📊 系统状态', value: 'status' },
      new inquirer.Separator(),
      { name: '🔄 重置系统', value: 'reset' },
      new inquirer.Separator(),
      { name: '🚪 退出', value: 'exit' }
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
      case 'team':
        await showTeamCreateWizard();
        break;
      case 'department':
        await showDeptManageMenu();
        break;
      case 'agent':
        await showAgentManageMenu();
        break;
      case 'job':
        await showJobManageMenu();
        break;
      case 'skillPack':
        await showJobManageMenu();
        break;
      case 'feishu':
        await showFeishuConfigMenu();
        break;
      case 'status':
        await showSystemStatus();
        break;
      case 'reset':
        const resetResult = await showResetSystemDialog();
        // 重置后返回 false，让 TUI 重新检查初始化状态
        if (resetResult === 'reset') {
          return false;
        }
        break;
      case 'exit':
        console.log(chalk.dim('\n  再见！\n'));
        return true;
    }
  }
}