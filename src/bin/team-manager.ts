#!/usr/bin/env node
/**
 * team-manager CLI Entry Point
 */

import { program } from '../cli';

// Parse commands (welcome message handled by subcommands)
program.parse(process.argv);