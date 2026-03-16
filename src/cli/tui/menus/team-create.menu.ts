/**
 * 团队创建向导
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { tuiUtils } from '../index';
import { deptService as departmentService, agentService, jobService } from '../../../core/services';

/**
 * 显示团队创建向导
 */
export async function showTeamCreateWizard(): Promise<void> {
  // 步骤1：创建事业部
  const deptResult = await createDepartmentStep();
  if (!deptResult.success) {
    console.log(chalk.dim('\n已取消团队创建\n'));
    return;
  }

  // 步骤2：创建管理者
  const managerResult = await createManagerStep(deptResult.departmentId!);
  if (!managerResult.success) {
    console.log(chalk.dim('\n已取消团队创建\n'));
    return;
  }

  // 步骤3：创建审核者
  const reviewerResult = await createReviewerStep(deptResult.departmentId!);
  if (!reviewerResult.success) {
    console.log(chalk.dim('\n已取消团队创建\n'));
    return;
  }

  // 步骤4：创建执行者（可多个）
  await createExecutorsStep(deptResult.departmentId!);

  // 完成
  console.log(chalk.green('\n✓ 团队创建完成！\n'));
}

/**
 * 步骤1：创建事业部
 */
async function createDepartmentStep(): Promise<{ success: boolean; departmentId?: string }> {
  const { continueStep } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continueStep',
      message: '👥 团队创建向导 - 步骤1：创建事业部，开始？',
      default: true
    }
  ]);

  if (!continueStep) {
    return { success: false };
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '事业部名称（直接按回车取消）：'
    }
  ]);

  if (!name || !name.trim()) {
    return { success: false };
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义事业部ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: '事业部ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return { success: false };
    }
    id = customIdValue.trim();
  }

  const result = departmentService.create({
    id,
    name: name.trim()
  });

  if (result.success) {
    tuiUtils.printSuccess(`事业部创建成功: ${result.department?.name} (${result.department?.id})`);
    return { success: true, departmentId: result.department?.id };
  } else {
    tuiUtils.printError(result.message);
    return { success: false };
  }
}

/**
 * 步骤2：创建管理者
 */
async function createManagerStep(departmentId: string): Promise<{ success: boolean }> {
  const { continueStep } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continueStep',
      message: '👥 团队创建向导 - 步骤2：创建管理者，开始？',
      default: true
    }
  ]);

  if (!continueStep) {
    return { success: false };
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '管理者名称（直接按回车取消）：',
      default: '管理者_001'
    }
  ]);

  if (!name || !name.trim()) {
    return { success: false };
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义Agent ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: 'Agent ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return { success: false };
    }
    id = customIdValue.trim();
  }

  const result = agentService.create({
    id,
    name: name.trim(),
    department_id: departmentId,
    role: 'manager'
  });

  if (result.success) {
    tuiUtils.printSuccess(`管理者创建成功: ${result.agent?.name} (${result.agent?.id})`);
    return { success: true };
  } else {
    tuiUtils.printError(result.message);
    return { success: false };
  }
}

/**
 * 步骤3：创建审核者
 */
async function createReviewerStep(departmentId: string): Promise<{ success: boolean }> {
  const { continueStep } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continueStep',
      message: '👥 团队创建向导 - 步骤3：创建审核者，开始？',
      default: true
    }
  ]);

  if (!continueStep) {
    return { success: false };
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '审核者名称（直接按回车取消）：',
      default: '审核者_001'
    }
  ]);

  if (!name || !name.trim()) {
    return { success: false };
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义Agent ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: 'Agent ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return { success: false };
    }
    id = customIdValue.trim();
  }

  const result = agentService.create({
    id,
    name: name.trim(),
    department_id: departmentId,
    role: 'reviewer'
  });

  if (result.success) {
    tuiUtils.printSuccess(`审核者创建成功: ${result.agent?.name} (${result.agent?.id})`);
    return { success: true };
  } else {
    tuiUtils.printError(result.message);
    return { success: false };
  }
}

/**
 * 步骤4：创建执行者
 */
async function createExecutorsStep(departmentId: string): Promise<void> {
  // 获取职业列表
  const jobs = jobService.listAll();
  if (jobs.length === 0) {
    tuiUtils.printWarning('暂无职业，请先创建职业');
    console.log(chalk.dim('提示：使用"职业管理"菜单创建职业\n'));
    return;
  }

  let executorCount = 0;

  while (true) {
    executorCount++;

    const { continueCreate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueCreate',
        message: `👥 团队创建向导 - 步骤4：创建执行者 (${executorCount})，${executorCount === 1 ? '开始？' : '继续？'}`,
        default: true  // 始终默认继续
      }
    ]);

    if (!continueCreate) {
      return;
    }

    const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '执行者名称（直接按回车跳过）：',
      default: `执行者_${String(executorCount).padStart(3, '0')}`
    }
  ]);

  if (!name || !name.trim()) {
    return;
  }

  const { jobId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'jobId',
      message: '选择职业：',
      choices: [
        ...jobs.map(job => ({
          name: `${job.name} (${job.id})`,
          value: job.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (jobId === 'cancel') {
    return;
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义Agent ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: 'Agent ID（直接按回车跳过）：'
      }
    ]);
    
    if (customIdValue && customIdValue.trim()) {
      id = customIdValue.trim();
    }
  }

  const result = agentService.create({
    id,
    name: name.trim(),
    department_id: departmentId,
    role: 'executor',
    job_id: jobId
  });

  if (result.success) {
    tuiUtils.printSuccess(`执行者创建成功: ${result.agent?.name} (${result.agent?.id})`);
  } else {
    tuiUtils.printError(result.message);
  }
}
}