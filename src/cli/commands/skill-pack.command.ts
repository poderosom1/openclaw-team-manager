/**
 * Skill Pack Management Commands
 */

import chalk from 'chalk';
import { skillPackService } from '../../core/services';
import { isDatabaseInitialized } from '../../db';

interface CreateSkillPackOptions {
  name: string;
  description: string;
  content: string;
  id?: string;
}

interface UpdateSkillPackOptions {
  id: string;
  name?: string;
  description?: string;
  content?: string;
}

/**
 * Create skill pack
 */
export async function createSkillPackCommand(options: CreateSkillPackOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  try {
    const result = skillPackService.create({
      id: options.id,
      name: options.name,
      description: options.description,
      content: options.content
    });

    if (result.success) {
      console.log(chalk.green('�?技能包创建成功'));
      console.log(`  ID: ${result.skillPack?.id}`);
      console.log(`  名称: ${result.skillPack?.name}`);
      console.log(`  描述: ${result.skillPack?.description}`);
    } else {
      console.log(chalk.red(`�?${result.message}`));
    }
  } catch (error) {
    console.log(chalk.red(`�?错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Get skill pack details
 */
export async function getSkillPackCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const skillPack = skillPackService.getById(options.id);

  if (skillPack) {
    console.log(chalk.cyan('技能包详情:'));
    console.log(`  ID: ${skillPack.id}`);
    console.log(`  名称: ${skillPack.name}`);
    console.log(`  描述: ${skillPack.description}`);
    console.log(`  创建时间: ${skillPack.created_at}`);
    console.log(`\n  内容:`);
    console.log('─'.repeat(50));
    console.log(skillPack.content);
    console.log('─'.repeat(50));
  } else {
    console.log(chalk.yellow(`未找到技能包: ${options.id}`));
  }
}

/**
 * List all skill packs
 */
export async function listSkillPacksCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const skillPacks = skillPackService.listAll();

  if (skillPacks.length === 0) {
    console.log(chalk.yellow('暂无技能包'));
    return;
  }

  console.log(chalk.cyan('技能包列表:'));
  console.log('─'.repeat(70));
  console.log(`${'ID'.padEnd(16)}\t${'名称'.padEnd(20)}\t${'描述'.padEnd(25)}`);
  console.log('─'.repeat(70));

  for (const sp of skillPacks) {
    const desc = (sp.description || '')
      .substring(0, 22) + (sp.description && sp.description.length > 22 ? '...' : '');
    console.log(`${sp.id.padEnd(16)}\t${sp.name.padEnd(20)}\t${desc.padEnd(25)}`);
  }

  console.log('─'.repeat(70));
  console.log(`�?${skillPacks.length} 个技能包`);
}

/**
 * Update skill pack
 */
export async function updateSkillPackCommand(options: UpdateSkillPackOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  try {
    const updateData: { name?: string; description?: string; content?: string } = {};

    if (options.name) updateData.name = options.name;
    if (options.description) updateData.description = options.description;
    if (options.content) updateData.content = options.content;

    skillPackService.update(options.id, updateData);
    const skillPack = skillPackService.getById(options.id);

    console.log(chalk.green('�?技能包更新成功'));
    console.log(`  ID: ${skillPack?.id}`);
    console.log(`  名称: ${skillPack?.name}`);
  } catch (error) {
    console.log(chalk.red(`�?错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Delete skill pack
 */
export async function deleteSkillPackCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const result = skillPackService.delete(options.id);

  if (result.success) {
    console.log(chalk.green('�?技能包删除成功'));
  } else {
    console.log(chalk.red(`�?删除失败: ${result.message}`));
  }
}