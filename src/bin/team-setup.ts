#!/usr/bin/env node
/**
 * team-setup CLI Entry Point
 * For system initialization
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { setupService } from '../core/services';
import { isDatabaseInitialized, resetDatabase, fullResetDatabase } from '../db';

async function main(): Promise<void> {
  console.log(chalk.cyan('\n  Team Setup - System Initialization\n'));

  // Check arguments
  const forceReinit = process.argv.includes('--force') || process.argv.includes('-f');
  const fullReset = process.argv.includes('--full-reset');

  // Check if already initialized
  if (isDatabaseInitialized()) {
    console.log(chalk.yellow('System already initialized'));
    
    if (fullReset) {
      // Full reset (delete all data)
      console.log(chalk.red('⚠️  Using --full-reset, all data (including Agents, tasks) will be deleted...'));
      console.log(chalk.red('   This operation cannot be undone!'));
      fullResetDatabase();
    } else if (forceReinit) {
      // Reset system config only (preserve Agents and tasks)
      console.log(chalk.yellow('Using --force, system config will be reset (Agents and tasks preserved)...'));
      resetDatabase();
    } else {
      console.log(chalk.dim('Options:'));
      console.log(chalk.dim('  --force       Reset system config (preserve Agents and tasks)'));
      console.log(chalk.dim('  --full-reset  Delete all data and reinitialize (dangerous)'));
      console.log('Initialization cancelled');
      return;
    }
  }

  // Get assistant name (from argument or use default)
  const nameArg = process.argv.find(arg => arg.startsWith('--name='));
  const assistantName = nameArg ? nameArg.split('=')[1] : 'Assistant';

  // Execute initialization
  console.log(chalk.gray('\nInitializing system...'));

  const result = await setupService.init(assistantName);

  if (result.success) {
    console.log(chalk.green('\n✓ System initialized successfully!\n'));
    console.log(`  Assistant ID: ${result.assistant_id}`);
    console.log(`  Assistant Name: ${assistantName}`);
    console.log('\nNext steps:');
    console.log('  1. Create team: team-manager create-dept --name "Team Name"');
    console.log('  2. Create Agent: team-manager create-agent --name "Name" --role manager --dept DeptID');
    console.log('  3. View status: team-manager status\n');
  } else {
    console.log(chalk.red('\n✗ Initialization failed'));
    console.log(chalk.red(`  Error: ${result.message}\n`));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Error during initialization:'), error);
  process.exit(1);
});