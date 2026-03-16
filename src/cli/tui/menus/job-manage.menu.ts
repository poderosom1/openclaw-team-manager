/**
 * Job Management Menu
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { tuiUtils } from '../index';
import { jobService, skillPackService } from '../../../core/services';

/**
 * 显示职业管理菜单
 * 
 * 注意：增删改功能永久置灰，只能查看
 */
export async function showJobManageMenu(): Promise<void> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('💼 职业管理')),
      new inquirer.Separator(),
      { name: '📋 查看所有职业', value: 'list' },
      { name: chalk.dim('➕ 创建职业 (不可用)'), value: 'create', disabled: true },
      { name: chalk.dim('✏️ 更新职业 (不可用)'), value: 'update', disabled: true },
      { name: chalk.dim('🗑️ 删除职业 (不可用)'), value: 'delete', disabled: true },
      new inquirer.Separator(),
      { name: '📦 职业技能管理', value: 'skillPacks' },
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
        pageSize: 15
      }
    ]);

    switch (action) {
      case 'list':
        await listJobs();
        break;
      case 'skillPacks':
        await showSkillPackManageMenu();
        break;
      case 'back':
        return;
      // 增删改已置灰，不会到达这些 case
      case 'create':
      case 'update':
      case 'delete':
        console.log(chalk.yellow('\n该功能暂不可用\n'));
        break;
    }
  }
}

/**
 * 列出所有职业
 */
async function listJobs(): Promise<void> {
  const jobs = jobService.listAll();

  if (jobs.length === 0) {
    console.log(chalk.dim('\n暂无职业\n'));
    return;
  }

  console.log(chalk.bold('\n💼 职业列表\n'));
  console.log(chalk.dim('ID'.padEnd(25)) + chalk.dim('名称'.padEnd(20)) + chalk.dim('关联职业技能'));
  tuiUtils.printDivider();

  for (const job of jobs) {
    const id = job.id.padEnd(25);
    const name = job.name.padEnd(20);
    
    // 获取技能包名称
    const skillPackIds: string[] = job.skill_pack_ids ? JSON.parse(job.skill_pack_ids) : [];
    const skillPackNames = skillPackIds
      .map((spId: string) => {
        const sp = skillPackService.getById(spId);
        return sp?.name || spId;
      })
      .join(', ');
    
    console.log(`${id}${name}${skillPackNames || '无'}`);
  }

  console.log('');
}

/**
 * 创建职业
 */
async function createJob(): Promise<void> {
  // 获取技能包列表
  const skillPacks = skillPackService.listAll();

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '➕ 创建职业 - 职业名称（直接按回车取消）：'
    }
  ]);

  if (!name || !name.trim()) {
    return;
  }

  const { customId } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义职业ID？',
      default: false
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: '职业ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      return;
    }
    id = customIdValue.trim();
  }

  // 选择技能包
  let skillPackIds: string[] = [];
  if (skillPacks.length > 0) {
    const { selectPacks: shouldSelectPacks } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'selectPacks',
        message: '是否关联技能包？',
        default: true
      }
    ]);

    if (shouldSelectPacks) {
      const { packs } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'packs',
          message: '选择技能包：',
          choices: skillPacks.map((sp: { id: string; name: string }) => ({
            name: `${sp.name} (${sp.id})`,
            value: sp.id,
            checked: false
          }))
        }
      ]);
      skillPackIds = packs;
    }
  }

  const result = jobService.create({
    id,
    name: name.trim(),
    skill_pack_ids: skillPackIds
  });

  if (result.success) {
    tuiUtils.printSuccess(`职业创建成功: ${result.job?.id}`);
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * 更新职业
 */
async function updateJob(): Promise<void> {
  const jobs = jobService.listAll();
  if (jobs.length === 0) {
    tuiUtils.printWarning('暂无职业');
    return;
  }

  const { jobId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'jobId',
      message: '选择要更新的职业：',
      choices: [
        ...jobs.map(j => ({
          name: `${j.name} (${j.id})`,
          value: j.id
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

  const job = jobService.getById(jobId);
  if (!job) {
    tuiUtils.printError('职业不存在');
    return;
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '职业名称：',
      default: job.name
    }
  ]);

  // 重新选择技能包
  const skillPacks = skillPackService.listAll();
  const currentPackIds = job.skill_pack_ids ? JSON.parse(job.skill_pack_ids) : [];

  const { packs } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'packs',
      message: '选择技能包：',
      choices: skillPacks.map(sp => ({
        name: `${sp.name} (${sp.id})`,
        value: sp.id,
        checked: currentPackIds.includes(sp.id)
      }))
    }
  ]);

  jobService.update(jobId, {
    name: name.trim(),
    skill_pack_ids: packs
  });

  tuiUtils.printSuccess('职业更新成功');
}

/**
 * 删除职业
 */
async function deleteJob(): Promise<void> {
  const jobs = jobService.listAll();
  if (jobs.length === 0) {
    tuiUtils.printWarning('暂无职业');
    return;
  }

  const { jobId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'jobId',
      message: '选择要删除的职业：',
      choices: [
        ...jobs.map(j => ({
          name: `${j.name} (${j.id})`,
          value: j.id
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

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确定要删除该职业吗？',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.dim('已取消'));
    return;
  }

  const result = jobService.delete(jobId);
  if (result.success) {
    tuiUtils.printSuccess(result.message);
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * 显示技能包管理菜单
 * 
 * 注意：增删改功能永久置灰，只能查看
 */
export async function showSkillPackManageMenu(): Promise<void> {
  while (true) {
    const choices = [
      new inquirer.Separator(chalk.cyan.bold('📦 职业技能管理')),
      new inquirer.Separator(),
      { name: '📋 查看所有职业技能', value: 'list' },
      { name: '🔍 查看职业技能详情', value: 'view' },
      { name: chalk.dim('➕ 创建职业技能 (不可用)'), value: 'create', disabled: true },
      { name: chalk.dim('✏️ 更新职业技能 (不可用)'), value: 'update', disabled: true },
      { name: chalk.dim('🗑️ 删除职业技能 (不可用)'), value: 'delete', disabled: true },
      new inquirer.Separator(),
      { name: '🔙 返回', value: 'back' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择操作：',
        choices,
        loop: false,
        pageSize: 15
      }
    ]);

    switch (action) {
      case 'list':
        await listSkillPacks();
        break;
      case 'view':
        await viewSkillPack();
        break;
      case 'back':
        return;
      // 增删改已置灰，不会到达这些 case
      case 'create':
      case 'update':
      case 'delete':
        console.log(chalk.yellow('\n该功能暂不可用\n'));
        break;
    }
  }
}

/**
 * 列出所有技能包
 */
async function listSkillPacks(): Promise<void> {
  const skillPacks = skillPackService.listAll();

  if (skillPacks.length === 0) {
    console.log(chalk.dim('\n暂无职业技能\n'));
    return;
  }

  console.log(chalk.bold('\n📦 职业技能列表\n'));
  console.log(chalk.dim('ID'.padEnd(25)) + chalk.dim('名称'.padEnd(20)) + chalk.dim('版本'));
  tuiUtils.printDivider();

  for (const sp of skillPacks) {
    const id = sp.id.padEnd(25);
    const name = sp.name.padEnd(20);
    const version = sp.version || '1.0.0';
    console.log(`${id}${name}${version}`);
  }

  console.log('');
}

/**
 * 创建技能包
 */
async function createSkillPack(): Promise<void> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '➕ 创建技能包 - 名称（直接按回车取消）：'
    }
  ]);

  if (!name || !name.trim()) {
    return;
  }

  const { description, customId, version } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: '技能包描述：'
    },
    {
      type: 'confirm',
      name: 'customId',
      message: '是否自定义技能包ID？',
      default: false
    },
    {
      type: 'input',
      name: 'version',
      message: '版本号：',
      default: '1.0.0'
    }
  ]);

  let id: string | undefined;
  if (customId) {
    const { customIdValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customIdValue',
        message: '技能包ID（直接按回车取消）：'
      }
    ]);
    
    if (!customIdValue || !customIdValue.trim()) {
      console.log(chalk.dim('\n已取消，返回上级菜单\n'));
      return;
    }
    id = customIdValue.trim();
  }

  // 输入技能包内容
  console.log(chalk.dim('\n技能包内容（JSON格式）：'));
  console.log(chalk.dim('示例: {"sections": [{"title": "技术栈", "content": "React, TypeScript"}]}'));
  
  const { contentStr } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'contentStr',
      message: '编辑技能包内容：',
      default: JSON.stringify({
        sections: [
          { title: '技术栈', content: '请填写技术栈' },
          { title: '代码规范', content: '请填写代码规范' }
        ]
      }, null, 2)
    }
  ]);

  // 验证 JSON 格式
  try {
    JSON.parse(contentStr);
  } catch {
    tuiUtils.printError('JSON 格式无效');
    return;
  }

  const result = skillPackService.create({
    id,
    name: name.trim(),
    description: description.trim(),
    content: contentStr,
    version
  });

  if (result.success) {
    tuiUtils.printSuccess(`技能包创建成功: ${result.skillPack?.id}`);
  } else {
    tuiUtils.printError(result.message);
  }
}

/**
 * 查看技能包详情
 */
async function viewSkillPack(): Promise<void> {
  const skillPacks = skillPackService.listAll();
  if (skillPacks.length === 0) {
    tuiUtils.printWarning('暂无职业技能');
    return;
  }

  const { skillPackId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'skillPackId',
      message: '选择要查看的职业技能：',
      choices: [
        ...skillPacks.map(sp => ({
          name: `${sp.name} (${sp.id})`,
          value: sp.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (skillPackId === 'cancel') {
    return;
  }

  const sp = skillPackService.getById(skillPackId);
  if (!sp) {
    tuiUtils.printError('职业技能不存在');
    return;
  }

  console.log(chalk.bold(`\n📦 职业技能详情\n`));
  tuiUtils.printInfo('ID', sp.id);
  tuiUtils.printInfo('名称', sp.name);
  tuiUtils.printInfo('描述', sp.description || '无');
  tuiUtils.printInfo('版本', sp.version);
  tuiUtils.printInfo('创建时间', sp.created_at);
  
  if (sp.content) {
    console.log(chalk.bold('\n内容：'));
    try {
      // content 可能是字符串或对象
      const contentObj = typeof sp.content === 'string' ? JSON.parse(sp.content) : sp.content;
      
      if (contentObj.sections && Array.isArray(contentObj.sections)) {
        for (const section of contentObj.sections) {
          console.log(chalk.cyan(`\n【${section.title}】`));
          console.log(`  ${section.content}`);
        }
      } else {
        console.log(JSON.stringify(contentObj, null, 2));
      }
    } catch {
      console.log(sp.content);
    }
  }

  console.log('');
}

/**
 * 更新技能包
 */
async function updateSkillPack(): Promise<void> {
  const skillPacks = skillPackService.listAll();
  if (skillPacks.length === 0) {
    tuiUtils.printWarning('暂无职业技能');
    return;
  }

  const { skillPackId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'skillPackId',
      message: '选择要更新的职业技能：',
      choices: [
        ...skillPacks.map(sp => ({
          name: `${sp.name} (${sp.id})`,
          value: sp.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (skillPackId === 'cancel') {
    return;
  }

  const sp = skillPackService.getById(skillPackId);
  if (!sp) {
    tuiUtils.printError('技能包不存在');
    return;
  }

  const { name, description, version } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '技能包名称：',
      default: sp.name
    },
    {
      type: 'input',
      name: 'description',
      message: '技能包描述：',
      default: sp.description
    },
    {
      type: 'input',
      name: 'version',
      message: '版本号：',
      default: sp.version
    }
  ]);

  skillPackService.update(skillPackId, {
    name: name.trim(),
    description: description.trim(),
    version
  });

  tuiUtils.printSuccess('职业技能更新成功');
}

/**
 * 删除职业技能
 */
async function deleteSkillPack(): Promise<void> {
  const skillPacks = skillPackService.listAll();
  if (skillPacks.length === 0) {
    tuiUtils.printWarning('暂无职业技能');
    return;
  }

  const { skillPackId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'skillPackId',
      message: '选择要删除的职业技能：',
      choices: [
        ...skillPacks.map(sp => ({
          name: `${sp.name} (${sp.id})`,
          value: sp.id
        })),
        new inquirer.Separator(),
        { name: '🔙 取消', value: 'cancel' }
      ],
      loop: false
    }
  ]);

  if (skillPackId === 'cancel') {
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确定要删除该职业技能吗？',
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.dim('已取消'));
    return;
  }

  const result = skillPackService.delete(skillPackId);
  if (result.success) {
    tuiUtils.printSuccess(result.message);
  } else {
    tuiUtils.printError(result.message);
  }
}