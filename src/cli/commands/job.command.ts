/**
 * Job Management Commands
 */

import chalk from 'chalk';
import { jobService } from '../../core/services';
import { isDatabaseInitialized } from '../../db';

interface CreateJobOptions {
  name: string;
  id?: string;
  skillPackIds?: string;
}

interface UpdateJobOptions {
  id: string;
  name?: string;
  skillPackIds?: string;
}

/**
 * Create job
 */
export async function createJobCommand(options: CreateJobOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  try {
    const skillPackIds = options.skillPackIds 
      ? JSON.parse(options.skillPackIds) 
      : undefined;

    const result = jobService.create({
      id: options.id,
      name: options.name,
      skill_pack_ids: skillPackIds
    });

    if (result.success) {
      console.log(chalk.green('�?职业创建成功'));
      console.log(`  ID: ${result.job?.id}`);
      console.log(`  名称: ${result.job?.name}`);
      if (result.job?.skill_pack_ids) {
        try {
          const ids = JSON.parse(result.job.skill_pack_ids);
          if (ids.length > 0) {
            console.log(`  技能包: ${ids.join(', ')}`);
          }
        } catch {
          // ignore
        }
      }
    } else {
      console.log(chalk.red(`�?${result.message}`));
    }
  } catch (error) {
    console.log(chalk.red(`�?错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Get job details
 */
export async function getJobCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const job = jobService.getById(options.id);

  if (job) {
    console.log(chalk.cyan('职业详情:'));
    console.log(`  ID: ${job.id}`);
    console.log(`  名称: ${job.name}`);
    console.log(`  创建时间: ${job.created_at}`);
    if (job.skill_pack_ids) {
      try {
        const ids = JSON.parse(job.skill_pack_ids);
        if (ids.length > 0) {
          console.log(`  技能包: ${ids.join(', ')}`);
        } else {
          console.log(`  技能包: 无`);
        }
      } catch {
        console.log(`  技能包: 无`);
      }
    } else {
      console.log(`  技能包: 无`);
    }
  } else {
    console.log(chalk.yellow(`未找到职�? ${options.id}`));
  }
}

/**
 * List all jobs
 */
export async function listJobsCommand(): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const jobs = jobService.listAll();

  if (jobs.length === 0) {
    console.log(chalk.yellow('暂无职业'));
    return;
  }

  console.log(chalk.cyan('职业列表:'));
  console.log('─'.repeat(50));
  console.log(`${'ID'.padEnd(16)}\t${'名称'.padEnd(20)}\t技能包数量`);
  console.log('─'.repeat(50));

  for (const job of jobs) {
    let skillCount = 0;
    if (job.skill_pack_ids) {
      try {
        const ids = JSON.parse(job.skill_pack_ids);
        skillCount = ids.length;
      } catch {
        skillCount = 0;
      }
    }
    console.log(`${job.id.padEnd(16)}\t${job.name.padEnd(20)}\t${skillCount}`);
  }

  console.log('─'.repeat(50));
  console.log(`�?${jobs.length} 个职业`);
}

/**
 * Update job
 */
export async function updateJobCommand(options: UpdateJobOptions): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  try {
    const updateData: { name?: string; skill_pack_ids?: string[] } = {};

    if (options.name) updateData.name = options.name;
    if (options.skillPackIds) {
      updateData.skill_pack_ids = JSON.parse(options.skillPackIds);
    }

    jobService.update(options.id, updateData);
    const job = jobService.getById(options.id);

    console.log(chalk.green('�?职业更新成功'));
    console.log(`  ID: ${job?.id}`);
    console.log(`  名称: ${job?.name}`);
  } catch (error) {
    console.log(chalk.red(`�?错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Delete job
 */
export async function deleteJobCommand(options: { id: string }): Promise<void> {
  if (!isDatabaseInitialized()) {
    console.log(chalk.red('错误：系统未初始化，请先执行 team-setup init'));
    return;
  }

  const result = jobService.delete(options.id);

  if (result.success) {
    console.log(chalk.green('�?职业删除成功'));
  } else {
    console.log(chalk.red(`�?删除失败: ${result.message}`));
  }
}