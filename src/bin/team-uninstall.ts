#!/usr/bin/env node
/**
 * Team Manager Uninstall Script
 * 
 * Removes:
 * - Global npm package
 * - Workspace history (~/.team-manager)
 * - Optional: Database and all data
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(message: string, color: string = ''): void {
  console.log(color ? `${color}${message}${RESET}` : message);
}

async function uninstall(): Promise<void> {
  log('\n🗑️  Team Manager 卸载工具\n', CYAN);

  // 1. Remove workspace history
  const historyDir = path.join(os.homedir(), '.team-manager');
  if (fs.existsSync(historyDir)) {
    log('正在删除工作目录历史...', YELLOW);
    try {
      fs.rmSync(historyDir, { recursive: true, force: true });
      log('  ✓ 已删除 ~/.team-manager', GREEN);
    } catch (error) {
      log(`  ✗ 删除失败: ${error}`, RED);
    }
  } else {
    log('  ~/.team-manager 不存在，跳过', YELLOW);
  }

  // 2. Uninstall global npm package
  log('\n正在卸载全局 npm 包...', YELLOW);
  try {
    child_process.execSync('npm uninstall -g team-manager', { stdio: 'inherit' });
    log('  ✓ 已卸载全局包', GREEN);
  } catch (error) {
    log('  ⚠ 全局包可能未安装或卸载失败', YELLOW);
  }

  // 3. Summary
  log('\n✅ 卸载完成！\n', GREEN);
  log('已删除：');
  log('  - ~/.team-manager/ (工作目录历史)');
  log('  - team-manager (全局 npm 包)');
  log('\n注意：');
  log('  - 数据库和 Agent 工作空间保留在您的 OpenClaw 目录中');
  log('  - 如需删除数据库，请手动删除：<openclaw-root>/team/\n');
}

uninstall().catch(error => {
  log(`\n✗ 卸载失败: ${error}`, RED);
  process.exit(1);
});