/**
 * ep context — multi-server context management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  readConfig, addContext, removeContext, setActiveContext,
} from '../utils/config.js';
import {
  type GlobalOptions, printSuccess, printError, printInfo, printJson, printTable,
} from '../utils/output.js';

export function registerContextCommand(program: Command): void {
  const ctx = program.command('context').description('Manage multiple EasyPanel server contexts');

  ctx
    .command('list')
    .description('List all configured contexts')
    .action((_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      const config = readConfig();

      if (config.contexts.length === 0) {
        printInfo('No contexts configured. Run `ep login` to get started.');
        return;
      }

      if (opts.json) {
        printJson(config.contexts.map(c => ({ name: c.name, url: c.url, active: c.name === config.activeContext })));
        return;
      }

      printTable(
        ['Name', 'URL', 'Active'],
        config.contexts.map(c => [
          c.name,
          c.url,
          c.name === config.activeContext ? chalk.green('● active') : '',
        ]),
        opts,
      );
    });

  ctx
    .command('add <name>')
    .description('Add a new server context')
    .requiredOption('--server-url <url>', 'EasyPanel URL')
    .requiredOption('--api-token <token>', 'API token')
    .action((name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      addContext({ name, url: cmdOpts.serverUrl.replace(/\/+$/, ''), token: cmdOpts.apiToken });
      printSuccess(`Context "${name}" added at ${cmdOpts.serverUrl}`, opts);
    });

  ctx
    .command('use <name>')
    .description('Switch to a different context')
    .action((name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      if (setActiveContext(name)) {
        printSuccess(`Switched to context "${name}"`, opts);
      } else {
        printError(`Context "${name}" not found. Run \`ep context list\` to see available contexts.`, opts);
        process.exit(1);
      }
    });

  ctx
    .command('remove <name>')
    .description('Remove a server context')
    .action((name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      if (removeContext(name)) {
        printSuccess(`Context "${name}" removed`, opts);
      } else {
        printError(`Context "${name}" not found`, opts);
        process.exit(1);
      }
    });
}
