/**
 * ep services — service lifecycle management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printSuccess, printError, printTable,
  handleCliError, requireAuth, confirm, spinner, statusColor, formatBytes,
} from '../utils/output.js';

export function registerServicesCommand(program: Command): void {
  const services = program.command('services').description('Manage app services');

  services
    .command('create <project> <name>')
    .description('Create a new app service')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner(`Creating service "${name}" in project "${project}"...`);
        const result = await client.createAppService(project, name);
        s.succeed(`Service "${name}" created in project "${project}"`);
        if (opts.json) printJson(result);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Lifecycle commands
  for (const action of ['start', 'stop', 'restart'] as const) {
    services
      .command(`${action} <project> <name>`)
      .description(`${action.charAt(0).toUpperCase() + action.slice(1)} a service`)
      .action(async (project, name, _, cmd) => {
        const opts = cmd.optsWithGlobals() as GlobalOptions;
        loadConfig(opts.url, opts.token);
        requireAuth();

        try {
          const client = getClient();
          const s = spinner(`${action}ing "${project}/${name}"...`);
          await (client as any)[`${action}Service`](project, name);
          s.succeed(`Service "${project}/${name}" ${action}ed`);
        } catch (err) {
          handleCliError(err, opts);
        }
      });
  }

  services
    .command('redeploy <project> <name>')
    .description('Trigger a new deployment')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner(`Redeploying "${project}/${name}"...`);
        const result = await client.deployService(project, name) as any;
        s.succeed(`Deployment triggered for "${project}/${name}"`);
        if (result?.buildId) console.log(chalk.dim(`  Build ID: ${result.buildId}`));
        if (opts.json) printJson(result);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  services
    .command('destroy <project> <name>')
    .description('Delete a service (destructive)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        if (!cmdOpts.force) {
          const yes = await confirm(`Delete service "${project}/${name}"? This cannot be undone.`);
          if (!yes) { console.log(chalk.dim('Cancelled.')); return; }
        }

        const client = getClient();
        const s = spinner(`Destroying "${project}/${name}"...`);
        await client.destroyAppService(project, name);
        s.succeed(`Service "${project}/${name}" destroyed`);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Env vars
  const env = services.command('env').description('Manage environment variables');

  env
    .command('get <project> <name>')
    .description('Show environment variables')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.inspectProject(project) as any;
        const services = result?.services ?? result?.data?.services ?? [];
        const svc = services.find((s: any) => (s.name || s.serviceName) === name);
        const envStr = svc?.env || '';

        if (opts.json) { printJson({ env: envStr }); return; }

        if (!envStr) {
          console.log(chalk.dim('No environment variables set.'));
          return;
        }
        console.log(envStr);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  env
    .command('set <project> <name> <vars...>')
    .description('Set environment variables (KEY=VALUE pairs)')
    .action(async (project, name, vars, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const envString = vars.join('\n');
        const client = getClient();
        const s = spinner('Updating environment variables...');
        await client.updateEnv(project, name, envString);
        s.succeed(`Environment updated for "${project}/${name}"`);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Resources
  services
    .command('resources <project> <name>')
    .description('Update service resource limits')
    .option('--mem-limit <mb>', 'Memory limit in MB', parseFloat)
    .option('--mem-reservation <mb>', 'Memory reservation in MB', parseFloat)
    .option('--cpu-limit <cores>', 'CPU limit in cores', parseFloat)
    .option('--cpu-reservation <cores>', 'CPU reservation in cores', parseFloat)
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner('Updating resources...');
        await client.updateResources(
          project, name,
          cmdOpts.memReservation, cmdOpts.memLimit,
          cmdOpts.cpuReservation, cmdOpts.cpuLimit,
        );
        s.succeed(`Resources updated for "${project}/${name}"`);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Logs
  services
    .command('logs <project> <name>')
    .description('View service logs')
    .option('-f, --follow', 'Stream logs in real-time')
    .option('-n, --lines <n>', 'Number of lines', '100')
    .option('-s, --search <query>', 'Search filter')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();

        if (cmdOpts.follow) {
          // WebSocket streaming
          const wsUrl = client.getLogStreamUrlWithOptions(project, name, {
            follow: true,
            lines: parseInt(cmdOpts.lines),
          });
          if (opts.json) { printJson({ websocketUrl: wsUrl }); return; }

          console.log(chalk.dim(`Streaming logs for ${project}/${name}... (Ctrl-C to stop)`));
          const { default: WebSocket } = await import('ws');
          const ws = new WebSocket(wsUrl as any);
          ws.on('message', (data: Buffer) => {
            try {
              const log = JSON.parse(data.toString());
              const ts = log.timestamp ? chalk.dim(new Date(log.timestamp).toISOString().slice(11, 19)) : '';
              const level = log.level ? statusColor(log.level) : '';
              process.stdout.write(`${ts} ${level} ${log.message || data.toString()}\n`);
            } catch {
              process.stdout.write(data.toString() + '\n');
            }
          });
          ws.on('error', (err: Error) => printError(`WebSocket error: ${err.message}`));
          process.on('SIGINT', () => { ws.close(); process.exit(0); });
          // Keep alive
          await new Promise(() => {});
        }

        // Regular log fetch
        const logOpts: any = { lines: parseInt(cmdOpts.lines) };
        if (cmdOpts.search) {
          const result = await client.searchLogs(project, name, cmdOpts.search, logOpts) as any;
          if (opts.json) { printJson(result); return; }
          const logs = result?.logs ?? [];
          logs.forEach((l: any) => {
            const ts = l.timestamp ? chalk.dim(new Date(l.timestamp).toISOString().slice(11, 19)) : '';
            console.log(`${ts} ${l.message || JSON.stringify(l)}`);
          });
          return;
        }

        const result = await client.getServiceLogs(project, name, logOpts) as any;
        if (opts.json) { printJson(result); return; }
        const logs = result?.logs ?? [];
        logs.forEach((l: any) => {
          const ts = l.timestamp ? chalk.dim(new Date(l.timestamp).toISOString().slice(11, 19)) : '';
          console.log(`${ts} ${l.message || JSON.stringify(l)}`);
        });
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Stats
  services
    .command('stats <project> <name>')
    .description('Show service resource usage')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getServiceStats(project, name) as any;

        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold(`\n${project}/${name} — Resource Usage\n`));
        printTable(['Metric', 'Value'], [
          ['CPU', `${result.cpu ?? '—'}%`],
          ['Memory', result.memory ? formatBytes(result.memory) : '—'],
          ['Memory Limit', result.memoryLimit ? formatBytes(result.memoryLimit) : '—'],
          ['Network In', result.networkIn ? formatBytes(result.networkIn) : '—'],
          ['Network Out', result.networkOut ? formatBytes(result.networkOut) : '—'],
        ], opts);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  // Build status
  services
    .command('build-status <project> <name>')
    .description('Check build/deploy status')
    .option('--build-id <id>', 'Specific build ID')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getBuildStatus(project, name, cmdOpts.buildId) as any;

        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold('Build:'), result.buildId || '—');
        console.log(chalk.bold('Status:'), statusColor(result.status || 'unknown'));
        if (result.startTime) console.log(chalk.bold('Started:'), result.startTime);
        if (result.error) console.log(chalk.red('Error:'), result.error);
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
