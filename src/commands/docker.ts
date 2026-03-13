/**
 * ep docker — Docker cleanup operations
 */

import { Command } from 'commander';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, handleCliError, requireAuth, confirm, spinner, formatBytes,
} from '../utils/output.js';

export function registerDockerCommand(program: Command): void {
  const docker = program.command('docker').description('Docker cleanup operations');

  docker
    .command('cleanup')
    .description('Remove unused Docker images')
    .option('-f, --force', 'Force cleanup without confirmation')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        if (!cmdOpts.force) {
          const yes = await confirm('Remove unused Docker images?', true);
          if (!yes) return;
        }
        const client = getClient();
        const s = spinner('Cleaning up images...');
        const result = await client.dockerImageCleanup(cmdOpts.force) as any;
        const freed = result?.freed_space || result?.data?.freed_space;
        s.succeed(`Cleanup complete${freed ? ` — freed ${formatBytes(freed)}` : ''}`);
        if (opts.json) printJson(result);
      } catch (err) { handleCliError(err, opts); }
    });

  docker
    .command('prune')
    .description('Prune Docker builder cache')
    .option('-a, --all', 'Remove all cache, not just unused')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner('Pruning builder cache...');
        const result = await client.dockerBuilderCachePrune(cmdOpts.all) as any;
        const freed = result?.freed_space || result?.data?.freed_space;
        s.succeed(`Cache pruned${freed ? ` — freed ${formatBytes(freed)}` : ''}`);
        if (opts.json) printJson(result);
      } catch (err) { handleCliError(err, opts); }
    });
}
