/**
 * TUI Main Entry
 * 
 * Provides interactive terminal interface
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { showMainMenu } from './menus/main.menu';
import { setupService } from '../../core/services';
import { isValidOpenClawRoot } from '../../core/utils';
import * as initSessionRepo from '../../db/repositories/init-session.repo';
import * as configTracker from '../../core/services/config-tracker.service';

/**
 * Get history file path
 */
function getHistoryFilePath(): string {
  const historyDir = path.join(os.homedir(), '.team-manager');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return path.join(historyDir, 'workspace-history.json');
}

/**
 * Read workspace history
 */
function readWorkspaceHistory(): string[] {
  const historyFile = getHistoryFilePath();
  if (!fs.existsSync(historyFile)) {
    return [];
  }
  try {
    const content = fs.readFileSync(historyFile, 'utf-8');
    const data = JSON.parse(content);
    return data.workspaces || [];
  } catch {
    return [];
  }
}

/**
 * Save workspace to history
 */
function saveWorkspaceToHistory(workspacePath: string): void {
  const historyFile = getHistoryFilePath();
  let history = readWorkspaceHistory();
  
  // Remove duplicates
  history = history.filter(p => p !== workspacePath);
  
  // Add to front
  history.unshift(workspacePath);
  
  // Keep max 10
  history = history.slice(0, 10);
  
  try {
    fs.writeFileSync(historyFile, JSON.stringify({ workspaces: history }, null, 2), 'utf-8');
  } catch {
    // Ignore errors
  }
}

/**
 * Validate workspace path
 */
function validateWorkspacePath(inputPath: string): { valid: boolean; error?: string; hint?: string } {
  if (!inputPath || !inputPath.trim()) {
    return { valid: false, error: '请输入路径' };
  }
  
  const trimmed = inputPath.trim();
  
  if (!fs.existsSync(trimmed)) {
    return { valid: false, error: '路径不存在', hint: `请确认路径: ${trimmed}` };
  }
  
  const stat = fs.statSync(trimmed);
  if (!stat.isDirectory()) {
    return { valid: false, error: '路径不是目录' };
  }
  
  const openclawJsonPath = path.join(trimmed, 'openclaw.json');
  if (!fs.existsSync(openclawJsonPath)) {
    return { 
      valid: false, 
      error: '目录下没有 openclaw.json',
      hint: '请输入 .openclaw 目录路径（包含 openclaw.json 的目录）'
    };
  }
  
  return { valid: true };
}

/**
 * Print startup banner
 */
function printBanner(): void {
  console.log(chalk.bold.cyan('\n🤖 Multi-Agent - 多Agent协作框架\n'));
  console.log(chalk.dim('使用和Bug报告: 抖音 39797966817\n'));
}

/**
 * Start TUI interface
 */
export async function startTUI(): Promise<void> {
  printBanner();

  // Read history
  const history = readWorkspaceHistory();
  
  // Show history if available
  if (history.length > 0) {
    console.log(chalk.dim('最近使用的工作目录：'));
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      const isValid = validateWorkspacePath(history[i]).valid;
      const status = isValid ? '' : chalk.yellow(' (路径无效)');
      console.log(chalk.dim(`  ${i + 1}. ${history[i]}${status}`));
    }
    console.log('');
  }

  // Main loop
  while (true) {
    const sessionId = configTracker.getCurrentSession();
    
    if (!sessionId) {
      console.log(chalk.yellow('请选择或输入 OpenClaw 工作目录'));
      console.log(chalk.dim('（即 .openclaw 目录路径，包含 openclaw.json 文件）\n'));
      
      // Build choices
      const choices: { name: string; value: string }[] = [];
      
      // Add history options
      const validHistory = history.filter(p => validateWorkspacePath(p).valid);
      for (const p of validHistory.slice(0, 5)) {
        choices.push({
          name: `📁 ${p}`,
          value: p
        });
      }
      
      // Add other options
      if (choices.length > 0) {
        choices.push({ name: '─'.repeat(40), value: '__SEPARATOR__' } as any);
      }
      choices.push({ name: '✏️  手动输入路径', value: '__MANUAL__' });
      choices.push({ name: '🚪 退出', value: '__EXIT__' });
      
      let selectedPath: string | null = null;
      
      if (choices.length > 2) {
        // Has history, offer selection
        const { selected } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selected',
            message: '选择工作目录：',
            choices,
            loop: false
          }
        ]);
        
        if (selected === '__EXIT__') {
          console.log(chalk.dim('\n再见！\n'));
          return;
        }
        
        if (selected === '__MANUAL__') {
          const { openClawRoot } = await inquirer.prompt([
            {
              type: 'input',
              name: 'openClawRoot',
              message: '请输入 .openclaw 目录路径：',
              validate: (input: string) => {
                const result = validateWorkspacePath(input);
                if (!result.valid) {
                  return result.hint || result.error || '路径无效';
                }
                return true;
              }
            }
          ]);
          selectedPath = openClawRoot.trim();
        } else if (selected !== '__SEPARATOR__') {
          selectedPath = selected;
        }
      } else {
        // No history, direct input
        const { openClawRoot } = await inquirer.prompt([
          {
            type: 'input',
            name: 'openClawRoot',
            message: '请输入 .openclaw 目录路径：',
            validate: (input: string) => {
              const result = validateWorkspacePath(input);
              if (!result.valid) {
                return result.hint || result.error || '路径无效';
              }
              return true;
            }
          }
        ]);
        selectedPath = openClawRoot.trim();
      }
      
      if (!selectedPath) {
        continue;
      }

      // Validate and set directory
      const validation = isValidOpenClawRoot(selectedPath);
      if (!validation.valid) {
        console.log(chalk.red(`\n✗ 目录验证失败: ${validation.error}\n`));
        continue;
      }

      // Set workspace
      const setResult = setupService.configureOpenClawRoot(selectedPath);
      if (!setResult.success) {
        console.log(chalk.red(`\n✗ 设置工作目录失败: ${setResult.error}\n`));
        continue;
      }

      // Save to history
      saveWorkspaceToHistory(selectedPath);

      console.log(chalk.green(`\n✓ 工作目录已设置: ${selectedPath}\n`));

      // Check for active session in database
      try {
        const activeSession = initSessionRepo.getActive();
        if (activeSession && activeSession.status === 'active') {
          configTracker.setCurrentSession(activeSession.id);
          console.log(chalk.green(`✓ 已恢复会话: ${activeSession.assistant_name}\n`));
          const shouldContinue = await showMainMenu();
          if (!shouldContinue) {
            console.log('');
            continue;
          }
          break;
        } else if (activeSession && activeSession.status === 'reset') {
          console.log(chalk.yellow(`检测到已重置的会话，需要重新初始化\n`));
        }
      } catch (e) {
        // Database may not exist, ignore
      }

      // No active session, ask to initialize
      const { shouldInit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldInit',
          message: '是否初始化系统？',
          default: true
        }
      ]);

      if (shouldInit) {
        const { assistantName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'assistantName',
            message: '请输入总助理名称：',
            default: '总助理'
          }
        ]);

        console.log(chalk.gray('\n正在初始化系统...'));
        const result = await setupService.init(assistantName, selectedPath);

        if (result.success) {
          console.log(chalk.green('\n✓ 系统初始化成功！\n'));
          console.log(`  工作目录: ${selectedPath}`);
          console.log(`  总助理ID: ${result.assistant_id}`);
          console.log(`  总助理名称: ${assistantName}\n`);
        } else {
          console.log(chalk.red('\n✗ 初始化失败'));
          console.log(chalk.red(`  错误: ${result.message}\n`));
          continue;
        }
      } else {
        console.log(chalk.dim('\n再见！\n'));
        return;
      }
    }

    // Show main menu
    const shouldContinue = await showMainMenu();
    if (!shouldContinue) {
      console.log('');
      continue;
    }
    
    break;
  }
}

/**
 * TUI utility functions
 */
export const tuiUtils = {
  /**
   * Print divider
   */
  printDivider: (char: string = '─', length: number = 50): void => {
    console.log(chalk.dim(char.repeat(length)));
  },

  /**
   * Print title
   */
  printTitle: (title: string): void => {
    console.log(chalk.bold.cyan(`\n${title}`));
    tuiUtils.printDivider();
  },

  /**
   * Print success message
   */
  printSuccess: (message: string): void => {
    console.log(chalk.green(`✓ ${message}`));
  },

  /**
   * Print error message
   */
  printError: (message: string): void => {
    console.log(chalk.red(`✗ ${message}`));
  },

  /**
   * Print warning message
   */
  printWarning: (message: string): void => {
    console.log(chalk.yellow(`⚠ ${message}`));
  },

  /**
   * Print info
   */
  printInfo: (label: string, value: string): void => {
    console.log(`  ${chalk.dim(label)}: ${value}`);
  },

  /**
   * Wait for key press
   */
  waitForKey: async (message: string = '按回车键继续...'): Promise<void> => {
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.dim(message),
        default: true
      }
    ]);
  }
};