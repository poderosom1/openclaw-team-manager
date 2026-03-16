/**
 * CLI Main Entry
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('team-manager')
  .description('Multi-Agent Collaboration Framework - CLI Management Tool (Basic Version)')
  .version('0.0.5');

// ============================================
// TUI Interactive Interface
// ============================================
program
  .command('tui')
  .description('Start interactive terminal interface')
  .action(async () => {
    const { startTUI } = await import('./tui');
    await startTUI();
  });

// ============================================
// Team Management Commands
// ============================================
program
  .command('create-dept')
  .description('Create team')
  .requiredOption('--name <name>', 'Team name')
  .option('--id <id>', 'Team ID (optional, auto-generated)')
  .action(async (options) => {
    const { createDeptCommand } = await import('./commands/dept.command');
    await createDeptCommand(options);
  });

program
  .command('list-depts')
  .description('List all teams')
  .action(async () => {
    const { listDeptsCommand } = await import('./commands/dept.command');
    await listDeptsCommand();
  });

program
  .command('update-dept')
  .description('Update team')
  .requiredOption('--id <id>', 'Team ID')
  .option('--name <name>', 'Team name')
  .option('--feishu-group-id <groupId>', 'Feishu group ID')
  .action(async (options) => {
    const { updateDeptCommand } = await import('./commands/dept.command');
    await updateDeptCommand(options);
  });

program
  .command('delete-dept')
  .description('Delete team')
  .requiredOption('--id <id>', 'Team ID')
  .action(async (options) => {
    const { deleteDeptCommand } = await import('./commands/dept.command');
    await deleteDeptCommand(options);
  });

// ============================================
// Agent Management Commands
// ============================================
program
  .command('create-agent')
  .description('Create agent')
  .requiredOption('--name <name>', 'Agent name')
  .requiredOption('--role <role>', 'Role type: assistant/manager/executor/reviewer')
  .option('--id <id>', 'Agent ID (optional, auto-generated)')
  .option('--dept <deptId>', 'Team ID')
  .option('--job <jobId>', 'Job ID (required for executor)')
  .action(async (options) => {
    const { createAgentCommand } = await import('./commands/agent.command');
    await createAgentCommand(options);
  });

program
  .command('get-agent')
  .description('Query agent')
  .option('--id <id>', 'Agent ID')
  .option('--department-id <deptId>', 'Team ID')
  .option('--role <role>', 'Role type')
  .action(async (options) => {
    const { getAgentCommand } = await import('./commands/agent.command');
    await getAgentCommand(options);
  });

program
  .command('list-agents')
  .description('List agents')
  .option('--department-id <deptId>', 'Filter by team')
  .action(async (options) => {
    const { listAgentsCommand } = await import('./commands/agent.command');
    await listAgentsCommand(options);
  });

program
  .command('delete-agent')
  .description('Delete agent')
  .requiredOption('--id <id>', 'Agent ID')
  .action(async (options) => {
    const { deleteAgentCommand } = await import('./commands/agent.command');
    await deleteAgentCommand(options);
  });

// ============================================
// Job Management Commands
// ============================================
program
  .command('create-job')
  .description('Create job')
  .requiredOption('--name <name>', 'Job name')
  .option('--id <id>', 'Job ID (optional, auto-generated)')
  .option('--skill-pack-ids <json>', 'Skill pack ID list (JSON array)')
  .action(async (options) => {
    const { createJobCommand } = await import('./commands/job.command');
    await createJobCommand(options);
  });

program
  .command('get-job')
  .description('Get job details')
  .requiredOption('--id <id>', 'Job ID')
  .action(async (options) => {
    const { getJobCommand } = await import('./commands/job.command');
    await getJobCommand(options);
  });

program
  .command('list-jobs')
  .description('List all jobs')
  .action(async () => {
    const { listJobsCommand } = await import('./commands/job.command');
    await listJobsCommand();
  });

program
  .command('update-job')
  .description('Update job')
  .requiredOption('--id <id>', 'Job ID')
  .option('--name <name>', 'Job name')
  .option('--skill-pack-ids <json>', 'Skill pack ID list (JSON array)')
  .action(async (options) => {
    const { updateJobCommand } = await import('./commands/job.command');
    await updateJobCommand(options);
  });

program
  .command('delete-job')
  .description('Delete job')
  .requiredOption('--id <id>', 'Job ID')
  .action(async (options) => {
    const { deleteJobCommand } = await import('./commands/job.command');
    await deleteJobCommand(options);
  });

// ============================================
// Skill Pack Management Commands
// ============================================
program
  .command('create-skill-pack')
  .description('Create skill pack')
  .requiredOption('--name <name>', 'Skill pack name')
  .requiredOption('--description <description>', 'Skill pack description')
  .requiredOption('--content <content>', 'Skill pack content')
  .option('--id <id>', 'Skill pack ID (optional, auto-generated)')
  .action(async (options) => {
    const { createSkillPackCommand } = await import('./commands/skill-pack.command');
    await createSkillPackCommand(options);
  });

program
  .command('get-skill-pack')
  .description('Get skill pack details')
  .requiredOption('--id <id>', 'Skill pack ID')
  .action(async (options) => {
    const { getSkillPackCommand } = await import('./commands/skill-pack.command');
    await getSkillPackCommand(options);
  });

program
  .command('list-skill-packs')
  .description('List all skill packs')
  .action(async () => {
    const { listSkillPacksCommand } = await import('./commands/skill-pack.command');
    await listSkillPacksCommand();
  });

program
  .command('update-skill-pack')
  .description('Update skill pack')
  .requiredOption('--id <id>', 'Skill pack ID')
  .option('--name <name>', 'Skill pack name')
  .option('--description <description>', 'Skill pack description')
  .option('--content <content>', 'Skill pack content')
  .action(async (options) => {
    const { updateSkillPackCommand } = await import('./commands/skill-pack.command');
    await updateSkillPackCommand(options);
  });

program
  .command('delete-skill-pack')
  .description('Delete skill pack')
  .requiredOption('--id <id>', 'Skill pack ID')
  .action(async (options) => {
    const { deleteSkillPackCommand } = await import('./commands/skill-pack.command');
    await deleteSkillPackCommand(options);
  });

// ============================================
// Feishu Configuration Commands
// ============================================
program
  .command('show-feishu-config')
  .description('Show Feishu configuration')
  .action(async () => {
    const { showFeishuConfigCommand } = await import('./commands/feishu.command');
    await showFeishuConfigCommand();
  });

program
  .command('config-feishu')
  .description('Configure Feishu')
  .option('--app-id <appId>', 'App ID')
  .option('--app-secret <secret>', 'App Secret')
  .option('--bot-name <name>', 'Bot Name')
  .option('--encrypt-key <key>', 'Encrypt Key')
  .option('--verification-token <token>', 'Verification Token (Webhook mode)')
  .action(async (options) => {
    const { configFeishuCommand } = await import('./commands/feishu.command');
    await configFeishuCommand(options);
  });

program
  .command('bind-feishu-group')
  .description('Bind Feishu group to team')
  .requiredOption('--department-id <deptId>', 'Team ID')
  .requiredOption('--group-id <groupId>', 'Feishu group ID')
  .action(async (options) => {
    const { bindFeishuGroupCommand } = await import('./commands/feishu.command');
    await bindFeishuGroupCommand(options);
  });

program
  .command('bind-feishu-bot')
  .description('Bind Feishu bot to agent')
  .requiredOption('--agent-id <agentId>', 'Agent ID')
  .requiredOption('--bot-id <botId>', 'Feishu bot ID')
  .action(async (options) => {
    const { bindFeishuBotCommand } = await import('./commands/feishu.command');
    await bindFeishuBotCommand(options);
  });

program
  .command('list-feishu-groups')
  .description('List Feishu group bindings')
  .action(async () => {
    const { listFeishuGroupsCommand } = await import('./commands/feishu.command');
    await listFeishuGroupsCommand();
  });

// ============================================
// Status Query Command
// ============================================
program
  .command('status')
  .description('View system status')
  .action(async () => {
    const { statusCommand } = await import('./commands/status.command');
    await statusCommand();
  });

// Export program, bin entry calls parse()
export { program };tus.command');
    await statusCommand();
  });

// Export program, bin entry calls parse()
export { program };