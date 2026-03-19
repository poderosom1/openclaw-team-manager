#!/usr/bin/env node
/**
 * Team Manager Uninstall Script
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
  log('\n🗑️  Team Manager Uninstall Tool\n', CYAN);

  // 1. Remove workspace history
  const historyDir = path.join(os.homedir(), '.team-manager');
  if (fs.existsSync(historyDir)) {
    log('Removing workspace history...', YELLOW);
    try {
      fs.rmSync(historyDir, { recursive: true, force: true });
      log('  ✓ Removed ~/.team-manager', GREEN);
    } catch (error) {
      log(`  ✗ Failed to remove: ${error}`, RED);
    }
  } else {
    log('  ~/.team-manager does not exist, skipping', YELLOW);
  }

  // 2. Uninstall global npm package
  log('\nUninstalling global npm package...', YELLOW);
  try {
    child_process.execSync('npm uninstall -g team-manager', { stdio: 'inherit' });
    log('  ✓ Global package uninstalled', GREEN);
  } catch (error) {
    log('  ⚠ Global package may not be installed or uninstall failed', YELLOW);
  }

  // 3. Summary
  log('\n✅ Uninstall complete!\n', GREEN);
  log('Removed:');
  log('  - ~/.team-manager/ (workspace history)');
  log('  - team-manager (global npm package)');
  log('\nNote:');
  log('  - Database and Agent workspaces are preserved in your OpenClaw directory');
  log('  - To delete database, manually remove: <openclaw-root>/team/\n');
}

uninstall().catch(error => {
  log(`\n✗ Uninstall failed: ${error}`, RED);
  process.exit(1);
});