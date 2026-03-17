/**
 * ep services — service lifecycle management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printError, printTable,
  handleCliError, requireAuth, confirm, spinner, statusColor, formatBytes,
} from '../utils/output.js';

/** Mask a password for display: show first 4 chars + '***', or just '***' if too short */
function maskPassword(password: string | undefined | null): string {
  if (!password) return '(none)';
  if (password.length <= 4) return '***';
  return password.slice(0, 4) + '***';
}

/** Known private registry hosts that typically require credentials */
const PRIVATE_REGISTRY_PATTERNS = [
  'ghcr.io',
  'gcr.io',
  'ecr.', // AWS ECR
  'azurecr.io',
  'registry.gitlab.com',
  'quay.io',
];

function looksLikePrivateRegistry(image: string | undefined | null): boolean {
  if (!image) return false;
  return PRIVATE_REGISTRY_PATTERNS.some(pattern => image.includes(pattern));
}

export function registerServicesCommand(program: Command): void {
  const services = program.command('services').description('Manage app services');

  services.addHelpText('after', `
Examples:
  $ ep services create my-project my-service
  $ ep services start my-project my-service
  $ ep services stop my-project my-service
  $ ep services restart my-project my-service
  $ ep services redeploy my-project my-service
  $ ep services logs my-project my-service --follow --lines 50
  $ ep services logs my-project my-service --search "error"
  $ ep services stats my-project my-service
  $ ep services env get my-project my-service
  $ ep services env set my-project my-service DB_HOST=localhost DB_PORT=5432
  $ ep services resources my-project my-service --mem-limit 512 --cpu-limit 1
  $ ep services build-status my-project my-service
  $ ep services registry set my-project my-service --username user --password pass
  $ ep services registry show my-project my-service
  $ ep services registry clear my-project my-service
`);

  services
    .command('create <project> <name>')
    .description('Create a new app service')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      const s = spinner(`Creating service "${name}" in project "${project}"...`);
      try {
        const client = getClient();
        const result = await client.createAppService(project, name);
        s.succeed(`Service "${name}" created in project "${project}"`);
        if (opts.json) printJson(result);
      } catch (err) {
        s.fail('Failed to create service');
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
        requireAuth(opts);

        const gerund = action === 'stop' ? 'Stopping' : `${action.charAt(0).toUpperCase()}${action.slice(1)}ing`;
        const past = action === 'stop' ? 'stopped' : `${action}ed`;
        const s = spinner(`${gerund} "${project}/${name}"...`);
        try {
          const client = getClient();
          await (client as any)[`${action}Service`](project, name);
          s.succeed(`Service "${project}/${name}" ${past}`);
        } catch (err) {
          s.fail(`Failed to ${action} service`);
          handleCliError(err, opts);
        }
      });
  }

  services
    .command('redeploy <project> <name>')
    .description('Trigger a new deployment (re-pulls image for image-based services)')
    .option('--username <user>', 'Registry username (for private images)')
    .option('--password <pass>', 'Registry password (for private images)')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      const s = spinner(`Redeploying "${project}/${name}"...`);
      try {
        const client = getClient();
        const result = await client.redeployService(project, name, {
          username: cmdOpts.username,
          password: cmdOpts.password,
        }) as any;
        s.succeed(`Deployment triggered for "${project}/${name}"`);
        if (result?.buildId) console.log(chalk.dim(`  Build ID: ${result.buildId}`));
        if (opts.json) printJson(result);

        // Warn about missing credentials for private registries
        if (!cmdOpts.username && !cmdOpts.password) {
          try {
            const svcInfo = await client.inspectService(project, name) as any;
            const source = svcInfo?.source;
            if (source?.type === 'image' && looksLikePrivateRegistry(source?.image) && !source?.username) {
              console.log(chalk.yellow(`\n  ⚠ No registry credentials configured. If pull fails, use:`));
              console.log(chalk.yellow(`    ep services registry set ${project} ${name} --username <user> --password <pass>`));
            }
          } catch {
            // Non-critical — don't fail the redeploy over a warning check
          }
        }
      } catch (err) {
        s.fail('Failed to redeploy service');
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
      requireAuth(opts);

      if (!cmdOpts.force) {
        try {
          const yes = await confirm(`Delete service "${project}/${name}"? This cannot be undone.`);
          if (!yes) { console.log(chalk.dim('Cancelled.')); return; }
        } catch { return; }
      }

      const client = getClient();
      const s = spinner(`Destroying "${project}/${name}"...`);
      try {
        await client.destroyAppService(project, name);
        s.succeed(`Service "${project}/${name}" destroyed`);
      } catch (err) {
        s.fail('Failed to destroy service');
        handleCliError(err, opts);
      }
    });

  // Env vars
  const env = services.command('env').description('Manage environment variables');

  env
    .command('get <project> <name>')
    .description('Show environment variables (may contain secrets)')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

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
      requireAuth(opts);

      const s = spinner('Updating environment variables...');
      try {
        const envString = vars.join('\n');
        const client = getClient();
        await client.updateEnv(project, name, envString);
        s.succeed(`Environment updated for "${project}/${name}"`);
      } catch (err) {
        s.fail('Failed to update environment variables');
        handleCliError(err, opts);
      }
    });

  // Registry credentials
  const registry = services.command('registry').description('Manage Docker registry credentials');

  registry
    .command('set <project> <name>')
    .description('Set registry credentials for a service (keeps current image)')
    .requiredOption('--username <user>', 'Registry username')
    .requiredOption('--password <pass>', 'Registry password/token')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      const s = spinner(`Setting registry credentials for "${project}/${name}"...`);
      try {
        const client = getClient();

        // Inspect to get the current image
        const svcInfo = await client.inspectService(project, name) as any;
        const source = svcInfo?.source;
        if (!source?.image) {
          s.fail('Service does not have an image source configured');
          console.error(chalk.dim('  Registry credentials can only be set on image-based services.'));
          process.exit(1);
        }

        // Update credentials while keeping the same image
        await client.deployFromImage(project, name, source.image, cmdOpts.username, cmdOpts.password);

        s.succeed(`Registry credentials set for "${project}/${name}"`);
        console.log(chalk.dim(`  Image:    ${source.image}`));
        console.log(chalk.dim(`  Username: ${cmdOpts.username}`));
        console.log(chalk.dim(`  Password: ${maskPassword(cmdOpts.password)}`));
      } catch (err) {
        s.fail('Failed to set registry credentials');
        handleCliError(err, opts);
      }
    });

  registry
    .command('show <project> <name>')
    .description('Show current registry configuration for a service')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const svcInfo = await client.inspectService(project, name) as any;
        const source = svcInfo?.source;

        if (opts.json) {
          printJson({
            type: source?.type || 'unknown',
            image: source?.image || null,
            username: source?.username || null,
            hasPassword: !!source?.password,
          });
          return;
        }

        console.log(chalk.bold(`\n${project}/${name} — Registry Config\n`));
        console.log(`  Source type: ${source?.type || 'unknown'}`);
        console.log(`  Image:      ${source?.image || '(none)'}`);
        console.log(`  Username:   ${source?.username || '(none)'}`);
        console.log(`  Password:   ${maskPassword(source?.password)}`);
        console.log();
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  registry
    .command('clear <project> <name>')
    .description('Clear registry credentials from a service')
    .option('-f, --force', 'Skip confirmation')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      if (!cmdOpts.force) {
        try {
          const yes = await confirm(`Clear registry credentials for "${project}/${name}"?`);
          if (!yes) { console.log(chalk.dim('Cancelled.')); return; }
        } catch { return; }
      }

      const s = spinner(`Clearing registry credentials for "${project}/${name}"...`);
      try {
        const client = getClient();

        // Inspect to get the current image
        const svcInfo = await client.inspectService(project, name) as any;
        const source = svcInfo?.source;
        if (!source?.image) {
          s.fail('Service does not have an image source configured');
          process.exit(1);
        }

        // Clear credentials by setting empty strings
        await client.deployFromImage(project, name, source.image, '', '');

        s.succeed(`Registry credentials cleared for "${project}/${name}"`);
      } catch (err) {
        s.fail('Failed to clear registry credentials');
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
      requireAuth(opts);

      const hasOption = cmdOpts.memLimit !== undefined || cmdOpts.memReservation !== undefined
        || cmdOpts.cpuLimit !== undefined || cmdOpts.cpuReservation !== undefined;
      if (!hasOption) {
        console.error(chalk.red('At least one resource option must be specified (--mem-limit, --mem-reservation, --cpu-limit, --cpu-reservation).'));
        process.exit(1);
      }

      const s = spinner('Updating resources...');
      try {
        const client = getClient();
        await client.updateResources(
          project, name,
          cmdOpts.memReservation, cmdOpts.memLimit,
          cmdOpts.cpuReservation, cmdOpts.cpuLimit,
        );
        s.succeed(`Resources updated for "${project}/${name}"`);
      } catch (err) {
        s.fail('Failed to update resources');
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
      requireAuth(opts);

      try {
        const client = getClient();

        if (cmdOpts.follow) {
          // WebSocket streaming
          const wsUrl = client.getLogStreamUrlWithOptions(project, name, {
            follow: true,
            lines: parseInt(cmdOpts.lines, 10),
          });
          if (opts.json) { printJson({ websocketUrl: wsUrl }); return; }

          console.log(chalk.dim(`Streaming logs for ${project}/${name}... (Ctrl-C to stop)`));
          const { default: WebSocket } = await import('ws');
          const ws = new WebSocket(wsUrl as any);
          ws.on('message', (data: Buffer) => {
            const raw = data.toString();
            try {
              // EasyPanel sends JSON frames: { output: "log line\r\n" }
              const frame = JSON.parse(raw);
              const output: string = frame.output ?? frame.message ?? raw;
              // Strip ANSI escape codes for clean terminal output
              const clean = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
              process.stdout.write(clean);
            } catch {
              process.stdout.write(raw);
            }
          });
          ws.on('error', (err: Error) => printError(`WebSocket error: ${err.message}`));
          process.on('SIGINT', () => { ws.close(); process.exit(0); });
          // Keep alive
          await new Promise(() => {});
        }

        // Regular log fetch
        const logOpts: any = { lines: parseInt(cmdOpts.lines, 10) };
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
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getServiceStats(project, name) as any;

        if (opts.json) { printJson(result); return; }

        // Extract values from nested API response
        const cpuPercent = typeof result.cpu === 'object' && result.cpu !== null
          ? result.cpu.percent
          : result.cpu;
        const memUsage = typeof result.memory === 'object' && result.memory !== null
          ? result.memory.usage
          : result.memory;
        const memPercent = typeof result.memory === 'object' && result.memory !== null
          ? result.memory.percent
          : undefined;
        const memLimit = typeof result.memory === 'object' && result.memory !== null
          ? result.memory.limit
          : result.memoryLimit;
        const netIn = typeof result.network === 'object' && result.network !== null
          ? result.network.in
          : result.networkIn;
        const netOut = typeof result.network === 'object' && result.network !== null
          ? result.network.out
          : result.networkOut;

        console.log(chalk.bold(`\n${project}/${name} — Resource Usage\n`));
        const rows: string[][] = [
          ['CPU', cpuPercent != null ? `${Number(cpuPercent).toFixed(2)}%` : '—'],
          ['Memory', memUsage ? formatBytes(memUsage) : '—'],
        ];
        if (memPercent != null) {
          rows.push(['Memory %', `${Number(memPercent).toFixed(2)}%`]);
        }
        rows.push(
          ['Memory Limit', memLimit ? formatBytes(memLimit) : '—'],
          ['Network In', netIn ? formatBytes(netIn) : '—'],
          ['Network Out', netOut ? formatBytes(netOut) : '—'],
        );
        printTable(['Metric', 'Value'], rows, opts);
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
      requireAuth(opts);

      try {
        const client = getClient();
        let result: any;

        try {
          result = await client.getBuildStatus(project, name, cmdOpts.buildId);
        } catch (buildErr: any) {
          // getBuildStatus may not exist on older EasyPanel versions — fall back to inspectService
          const is404 = buildErr?.statusCode === 404
            || buildErr?.message?.includes('NOT_FOUND')
            || buildErr?.message?.includes('No procedure found');
          if (is404) {
            const inspect = await client.inspectService(project, name) as any;
            const source = inspect?.source;
            result = {
              status: inspect?.enabled ? 'running' : 'stopped',
              source: source?.type || 'unknown',
              image: source?.image || '—',
              buildId: null,
            };
          } else {
            throw buildErr;
          }
        }

        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold('Build:'), result.buildId || '—');
        console.log(chalk.bold('Status:'), statusColor(result.status || 'unknown'));
        if (result.image) console.log(chalk.bold('Image:'), result.image);
        if (result.startTime) console.log(chalk.bold('Started:'), result.startTime);
        if (result.error) console.log(chalk.red('Error:'), result.error);
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
