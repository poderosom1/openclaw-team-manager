/**
 * 系统重置与恢复菜单
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { tuiUtils } from '../index';
import { getDatabasePath, getOpenClawJsonPath, getOpenClawRoot, getCompanyRoot } from '../../../core/utils';
import { getDatabase } from '../../../db';
import * as initSessionRepo from '../../../db/repositories/init-session.repo';
import * as configChangeRepo from '../../../db/repositories/config-change.repo';
import * as configTracker from '../../../core/services/config-tracker.service';

/**
 * 获取备份目录（位于当前 OpenClaw 根目录下）
 */
function getBackupDir(): string {
  return path.join(getOpenClawRoot(), 'backup');
}

/**
 * 显示系统重置菜单
 * 
 * @returns 'reset' 表示已重置，需要重新初始化；'back' 表示返回
 */
export async function showResetSystemDialog(): Promise<'reset' | 'back'> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('🔄 系统重置与恢复')),
      new inquirer.Separator(),
      { name: '🔄 重置系统（恢复到初始状态）', value: 'reset' },
      { name: '📂 从备份恢复', value: 'restore' },
      { name: '📋 查看备份列表', value: 'list' },
      new inquirer.Separator(),
      { name: '🔙 返回主菜单', value: 'back' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择：',
        choices,
        loop: false,
        pageSize: 15
      }
    ]);

    switch (action) {
      case 'reset':
        const resetted = await confirmAndReset();
        if (resetted) {
          return 'reset';
        }
        break;
      case 'restore':
        await selectBackupAndRestore();
        break;
      case 'list':
        await listBackups();
        break;
      case 'back':
        return 'back';
    }
  }
}

/**
 * 确认并重置系统
 * 
 * @returns true 表示重置成功，false 表示取消或失败
 */
async function confirmAndReset(): Promise<boolean> {
  console.log(chalk.yellow('\n⚠️ 警告：此操作将删除以下内容：'));
  console.log(chalk.dim('  • 所有 Agent 数据（包括总助理）'));
  console.log(chalk.dim('  • 所有事业部数据'));
  console.log(chalk.dim('  • 所有任务和节点数据'));
  console.log(chalk.dim('  • Agent 工作空间目录'));
  console.log(chalk.dim('  • 配置变更记录'));
  console.log(chalk.dim('\n  ✅ 保留以下内容：'));
  console.log(chalk.dim('  • OpenClaw 基础配置（模型 API Key 等）'));
  console.log(chalk.dim('  • 渠道配置（飞书等）\n'));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认要重置系统吗？',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.dim('\n已取消\n'));
    return false;
  }

  // 二次确认
  const { confirmText } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmText',
      message: chalk.red('请输入 "RESET" 确认重置：')
    }
  ]);

  if (confirmText !== 'RESET') {
    console.log(chalk.dim('\n已取消重置\n'));
    return false;
  }

  // 执行重置
  console.log(chalk.dim('\n正在重置系统...'));

  const result = await resetSystem();

  if (result.success) {
    console.log(chalk.green('\n✓ 系统已重置！'));
    console.log(chalk.dim(`备份位置: ${result.backupPath}\n`));
    return true;
  } else {
    console.log(chalk.red(`\n✗ 重置失败: ${result.message}\n`));
    return false;
  }
}

/**
 * 重置系统
 * 
 * 清除当前会话创建的所有内容：
 * 1. 获取当前活跃会话
 * 2. 创建备份
 * 3. 获取未清理的变更记录（在撤销前获取！）
 * 4. 删除创建的目录
 * 5. 撤销 openclaw.json 配置变更（根据 config_changes 记录）
 * 6. 清空数据库表
 * 7. 标记会话为已重置
 * 
 * 注意：只有通过 config_changes 记录的变更才会被撤销
 * 用户手动添加的绑定等不会被重置影响
 */
async function resetSystem(): Promise<{ success: boolean; message: string; backupPath?: string }> {
  try {
    // 1. 获取当前活跃会话
    const activeSession = initSessionRepo.getActive();
    console.log(chalk.dim(`  活跃会话: ${activeSession ? activeSession.id : '无'}`));
    
    if (!activeSession) {
      console.log(chalk.yellow('  没有活跃的初始化会话'));
      return { success: false, message: '没有活跃的初始化会话' };
    }

    const sessionId = activeSession.id;
    const db = getDatabase();
    const openClawRoot = getOpenClawRoot();
    
    // 获取该会话的所有变更（不管是否清理）
    const allChanges = configChangeRepo.getBySession(sessionId);
    console.log(chalk.dim(`  会话总变更数: ${allChanges.length}`));
    
    // 获取未清理的变更统计
    const stats = configChangeRepo.getChangeStatsBySession(sessionId);
    console.log(chalk.dim(`  未清理变更: ${stats.total} 条`));
    
    // 显示各类型变更
    const dirCount = allChanges.filter(c => c.change_type === 'directory_create').length;
    const agentCount = allChanges.filter(c => c.change_type === 'agent_create').length;
    const bindingCount = allChanges.filter(c => c.change_type === 'binding_create').length;
    console.log(chalk.dim(`  目录创建记录: ${dirCount}, Agent创建记录: ${agentCount}, 绑定记录: ${bindingCount}`));
    
    // 如果没有未清理的变更，检查是否已经重置过
    if (stats.total === 0) {
      console.log(chalk.yellow('  该会话没有未清理的变更'));
      console.log(chalk.dim(`  会话状态: ${activeSession.status}`));
      
      if (activeSession.status === 'reset') {
        console.log(chalk.yellow('  该会话已被重置，无需再次重置'));
        return { success: false, message: '该会话已被重置' };
      }
    }

    // 2. 创建备份
    const backupPath = await createBackup();
    console.log(chalk.dim(`  ✓ 备份已创建`));

    // 3. 【重要】在撤销配置前获取未清理的变更，否则会被标记为已清理
    const uncleanedChanges = configChangeRepo.getUncleanedBySession(sessionId);
    const dirCreates = uncleanedChanges.filter(c => c.change_type === 'directory_create' && c.action === 'add');
    console.log(chalk.dim(`  未清理目录创建记录: ${dirCreates.length} 条`));

    // 4. 删除 team-manager 创建的目录（根据未清理的 config_changes 记录）
    let deletedDirs = 0;
    let failedDirs = 0;
    const deletedParentDirs: Set<string> = new Set(); // 记录已删除的父目录，避免重复处理
    
    for (const change of dirCreates) {
      const dirPath = change.target_path;
      
      if (!dirPath) {
        console.log(chalk.yellow('    ⚠ 路径为空，跳过'));
        continue;
      }
      
      if (!fs.existsSync(dirPath)) {
        console.log(chalk.dim(`    - 已不存在: ${dirPath}`));
        continue;
      }
      
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        deletedDirs++;
        console.log(chalk.dim(`    ✓ 已删除: ${dirPath}`));
        
        // 检查父目录是否为空，如果为空也删除
        // 例如：删除 agents/{agentId}/agent 后，agents/{agentId} 如果为空也删除
        const parentDir = path.dirname(dirPath);
        if (!deletedParentDirs.has(parentDir) && fs.existsSync(parentDir)) {
          try {
            const remaining = fs.readdirSync(parentDir);
            if (remaining.length === 0) {
              fs.rmdirSync(parentDir);
              deletedParentDirs.add(parentDir);
              console.log(chalk.dim(`    ✓ 已删除空目录: ${parentDir}`));
            }
          } catch {
            // 忽略删除父目录的错误
          }
        }
      } catch (e) {
        failedDirs++;
        console.log(chalk.red(`    ✗ 删除失败: ${dirPath}`));
        console.log(chalk.red(`      错误: ${e instanceof Error ? e.message : String(e)}`));
      }
    }

    if (deletedDirs > 0) {
      console.log(chalk.dim(`  ✓ 已删除 ${deletedDirs} 个目录`));
    }
    if (failedDirs > 0) {
      console.log(chalk.yellow(`  ⚠ ${failedDirs} 个目录删除失败`));
    }

    // 5. 根据 config_changes 记录精确撤销 openclaw.json 变更
    // 注意：此操作会将所有变更为已清理（cleaned=1）
    // 逻辑：
    //   - action=add（创建）→ 删除该项
    //   - action=remove（删除）→ 恢复 old_value
    //   - action=update（变更）→ 恢复 old_value
    // 
    // 绑定、Agent、飞书配置等都通过 config_changes 记录，只有记录了才会被撤销
    const revertResult = configTracker.revertSessionConfigChanges(sessionId);
    if (revertResult.success) {
      console.log(chalk.dim(`  ✓ 已撤销 ${revertResult.revertedCount} 条配置变更`));
    } else {
      console.log(chalk.yellow(`  ⚠ 配置撤销部分失败: ${revertResult.message}`));
    }

    // 6. 清空所有数据库表数据（保留 init_sessions 和 config_changes 用于审计）
    // 0.0.3 基础版只包含这些表
    db.exec(`
      DELETE FROM agents;
      DELETE FROM projects;
      DELETE FROM departments;
      DELETE FROM companies;
      DELETE FROM jobs;
      DELETE FROM skill_packs;
    `);
    console.log(chalk.dim('  ✓ 所有数据已清空'));

    // 7. 标记会话为已重置
    initSessionRepo.markReset(sessionId);
    configTracker.setCurrentSession(null as unknown as string);
    console.log(chalk.dim('  ✓ 会话已标记为重置'));

    return { success: true, message: '系统重置成功', backupPath };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 创建备份
 */
async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupBase = getBackupDir();
  const backupDir = path.join(backupBase, `team-manager-reset-${timestamp}`);

  // 确保备份目录存在
  if (!fs.existsSync(backupBase)) {
    fs.mkdirSync(backupBase, { recursive: true });
  }
  fs.mkdirSync(backupDir, { recursive: true });

  // 备份数据库
  const dbPath = getDatabasePath();
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(backupDir, 'team.db'));
  }

  // 备份配置
  const configPath = getOpenClawJsonPath();
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, path.join(backupDir, 'openclaw.json'));
  }

  // 写入备份信息
  const backupInfo = {
    timestamp: new Date().toISOString(),
    type: 'reset',
    description: '系统重置前自动备份'
  };
  fs.writeFileSync(path.join(backupDir, 'backup-info.json'), JSON.stringify(backupInfo, null, 2));

  return backupDir;
}

/**
 * 从备份恢复
 */
async function selectBackupAndRestore(): Promise<void> {
  const backups = listBackupDirs();

  if (backups.length === 0) {
    console.log(chalk.yellow('\n暂无可用备份\n'));
    return;
  }

  const choices = [
    ...backups.map(b => ({
      name: `${b.name} (${b.time})`,
      value: b.path
    })),
    new inquirer.Separator(),
    { name: '🔙 取消', value: 'cancel' }
  ];

  const { backupPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'backupPath',
      message: '选择要恢复的备份：',
      choices,
      loop: false
    }
  ]);

  if (backupPath === 'cancel') {
    return;
  }

  // 确认恢复
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('确认要从此备份恢复吗？当前数据将被覆盖。'),
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.dim('\n已取消\n'));
    return;
  }

  // 执行恢复
  console.log(chalk.dim('\n正在恢复...'));
  const result = await restoreFromBackup(backupPath);

  if (result.success) {
    console.log(chalk.green('\n✓ 恢复成功！\n'));
  } else {
    console.log(chalk.red(`\n✗ 恢复失败: ${result.message}\n`));
  }
}

/**
 * 从备份恢复
 */
async function restoreFromBackup(backupPath: string): Promise<{ success: boolean; message: string }> {
  try {
    // 恢复数据库
    const backupDb = path.join(backupPath, 'team.db');
    if (fs.existsSync(backupDb)) {
      const dbPath = getDatabasePath();
      // 确保目录存在
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.copyFileSync(backupDb, dbPath);
      console.log(chalk.dim('  ✓ 数据库已恢复'));
    }

    // 恢复配置
    const backupConfig = path.join(backupPath, 'openclaw.json');
    if (fs.existsSync(backupConfig)) {
      const configPath = getOpenClawJsonPath();
      fs.copyFileSync(backupConfig, configPath);
      console.log(chalk.dim('  ✓ 配置已恢复'));
    }

    return { success: true, message: '恢复成功' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 列出备份目录
 */
function listBackupDirs(): Array<{ name: string; path: string; time: string }> {
  const backupBase = getBackupDir();
  if (!fs.existsSync(backupBase)) {
    return [];
  }

  const entries = fs.readdirSync(backupBase, { withFileTypes: true });
  const backups: Array<{ name: string; path: string; time: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('team-manager-')) {
      const backupPath = path.join(backupBase, entry.name);
      const infoPath = path.join(backupPath, 'backup-info.json');
      
      let time = '';
      if (fs.existsSync(infoPath)) {
        try {
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
          time = new Date(info.timestamp).toLocaleString('zh-CN');
        } catch {
          time = entry.name.replace('team-manager-reset-', '');
        }
      } else {
        time = entry.name.replace('team-manager-reset-', '');
      }

      backups.push({
        name: entry.name,
        path: backupPath,
        time
      });
    }
  }

  // 按时间倒序排列
  return backups.sort((a, b) => b.name.localeCompare(a.name));
}

/**
 * 列出所有备份
 */
async function listBackups(): Promise<void> {
  const backups = listBackupDirs();

  if (backups.length === 0) {
    console.log(chalk.yellow('\n暂无备份\n'));
    return;
  }

  console.log(chalk.bold('\n📋 备份列表\n'));
  console.log(chalk.dim('名称'.padEnd(45)) + chalk.dim('时间'));
  tuiUtils.printDivider();

  for (const backup of backups) {
    console.log(backup.name.padEnd(45) + backup.time);
  }

  console.log('');
}