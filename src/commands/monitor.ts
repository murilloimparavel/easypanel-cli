/**
 * ep monitor — monitoring and health checks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printTable, handleCliError, requireAuth,
  formatBytes, formatUptime, statusColor,
} from '../utils/output.js';

export function registerMonitorCommand(program: Command): void {
  const monitor = program.command('monitor').description('System monitoring and health checks');

  monitor.addHelpText('after', `
Examples:
  $ ep monitor stats
  $ ep monitor system
  $ ep monitor docker
  $ ep monitor docker --project my-project --sort cpu
  $ ep monitor health --verbose
`);

  monitor
    .command('stats')
    .description('Show advanced system statistics')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getAdvancedStats() as any;
        if (opts.json) { printJson(result); return; }
        console.log(chalk.bold('\nSystem Statistics\n'));
        console.log(JSON.stringify(result, null, 2));
      } catch (err) { handleCliError(err, opts); }
    });

  monitor
    .command('system')
    .description('Show CPU, memory, disk usage')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getSystemStats() as any;
        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold('\nSystem Resources\n'));
        const rows: [string, string][] = [];
        if (result.cpu) rows.push(['CPU', `${result.cpu}%`]);
        if (result.memory) rows.push(['Memory', typeof result.memory === 'number' ? formatBytes(result.memory) : String(result.memory)]);
        if (result.disk) rows.push(['Disk', typeof result.disk === 'number' ? formatBytes(result.disk) : String(result.disk)]);
        if (result.uptime) rows.push(['Uptime', typeof result.uptime === 'number' ? formatUptime(result.uptime) : String(result.uptime)]);
        if (rows.length > 0) printTable(['Metric', 'Value'], rows, opts);
        else console.log(JSON.stringify(result, null, 2));
      } catch (err) { handleCliError(err, opts); }
    });

  monitor
    .command('docker')
    .description('Show Docker container statistics')
    .option('--project <name>', 'Filter by project')
    .option('--service <name>', 'Filter by service')
    .option('--sort <field>', 'Sort by: cpu, memory, name', 'cpu')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getDockerTaskStats() as any;
        if (opts.json) { printJson(result); return; }

        let containers = result?.containers ?? result ?? [];
        if (cmdOpts.project) containers = containers.filter((c: any) => c.project === cmdOpts.project);
        if (cmdOpts.service) containers = containers.filter((c: any) => c.service === cmdOpts.service);

        const sortField = cmdOpts.sort || 'cpu';
        containers = [...containers].sort((a: any, b: any) => {
          if (sortField === 'memory') return (b.memory ?? 0) - (a.memory ?? 0);
          if (sortField === 'name') return (a.name || a.service || '').localeCompare(b.name || b.service || '');
          return (b.cpu ?? 0) - (a.cpu ?? 0); // default: cpu
        });

        if (!containers.length) { console.log(chalk.dim('No containers found.')); return; }

        printTable(
          ['Name', 'CPU', 'Memory', 'Status'],
          containers.map((c: any) => [
            c.name || c.service || '—',
            `${c.cpu ?? '—'}%`,
            c.memory ? formatBytes(c.memory) : '—',
            statusColor(c.status || c.state || '—'),
          ]),
          opts,
        );
      } catch (err) { handleCliError(err, opts); }
    });

  monitor
    .command('health')
    .description('Run system health check')
    .option('--verbose', 'Show detailed results')
    .option('--checks <list>', 'Comma-separated checks: disk,memory,cpu,docker,services,network,ssl')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const checks = cmdOpts.checks?.split(',') as ('disk' | 'memory' | 'cpu' | 'docker' | 'services' | 'network' | 'ssl')[] | undefined;
        const result = await client.performHealthCheck(checks, cmdOpts.verbose ?? false) as any;
        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold('\nHealth Check Results\n'));
        const health = result?.health ?? result;
        if (typeof health === 'object' && health !== null) {
          Object.entries(health).forEach(([key, val]: [string, any]) => {
            const status = val?.status || val?.state || (typeof val === 'string' ? val : 'unknown');
            console.log(`  ${statusColor(status)}  ${key}`);
            if (cmdOpts.verbose && val?.details) {
              console.log(chalk.dim(`    ${JSON.stringify(val.details)}`));
            }
          });
        } else {
          console.log(JSON.stringify(result, null, 2));
        }

        if (result?.recommendations?.length) {
          console.log(chalk.bold('\nRecommendations:'));
          result.recommendations.forEach((r: string) => console.log(chalk.yellow(`  - ${r}`)));
        }
      } catch (err) { handleCliError(err, opts); }
    });
}
