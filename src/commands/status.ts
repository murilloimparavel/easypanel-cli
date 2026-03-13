/**
 * ep status — quick dashboard overview
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig, getActiveContext } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printTable, handleCliError, requireAuth, statusColor,
} from '../utils/output.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Quick overview of projects and system status')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const ctx = getActiveContext();

        // Fetch in parallel
        const [projects, systemStats] = await Promise.allSettled([
          client.listProjects(),
          client.getSystemStats(),
        ]);

        if (opts.json) {
          printJson({
            server: ctx?.url || process.env.EASYPANEL_URL,
            projects: projects.status === 'fulfilled' ? projects.value : null,
            system: systemStats.status === 'fulfilled' ? systemStats.value : null,
          });
          return;
        }

        console.log(chalk.bold('\n EasyPanel Status\n'));
        console.log(chalk.dim('  Server:'), ctx?.url || process.env.EASYPANEL_URL || '—');

        // Projects
        if (projects.status === 'fulfilled') {
          const p = projects.value as any[];
          console.log(chalk.dim('  Projects:'), p.length);

          if (p.length > 0) {
            console.log('');
            const rows = p.map((proj: any) => {
              const svcCount = proj.services?.length ?? 0;
              const svcNames = (proj.services || []).map((s: any) => s.name || s.serviceName).join(', ');
              return [proj.name, String(svcCount), svcNames || '—'];
            });
            printTable(['Project', 'Services', 'Names'], rows, opts);
          }
        }

        // System stats
        if (systemStats.status === 'fulfilled') {
          const s = systemStats.value as any;
          console.log(chalk.bold('\n  System:'));
          if (s.cpu) console.log(chalk.dim('    CPU:'), `${s.cpu}%`);
          if (s.memory) console.log(chalk.dim('    Memory:'), String(s.memory));
          if (s.uptime) console.log(chalk.dim('    Uptime:'), String(s.uptime));
        }

        console.log('');
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
