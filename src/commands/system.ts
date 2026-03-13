/**
 * ep system — system info and management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printTable, handleCliError, requireAuth, confirm, spinner, statusColor,
} from '../utils/output.js';

export function registerSystemCommand(program: Command): void {
  const system = program.command('system').description('System information and management');

  system
    .command('ip')
    .description('Show server IP addresses')
    .option('--public-only', 'Show only public IPs')
    .option('--ipv6', 'Include IPv6 addresses')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getServerIPAddress(!cmdOpts.publicOnly, cmdOpts.ipv6 ?? false, cmdOpts.publicOnly ?? false) as any;
        if (opts.json) { printJson(result); return; }
        const addrs = result?.addresses ?? [];
        if (addrs.length) {
          addrs.forEach((a: any) => console.log(typeof a === 'string' ? a : `${a.address} (${a.type || a.family || ''})`));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (err) { handleCliError(err, opts); }
    });

  system
    .command('domain')
    .description('Show panel domain')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getPanelDomain() as any;
        if (opts.json) { printJson(result); return; }
        console.log(result?.domain || result?.url || JSON.stringify(result));
      } catch (err) { handleCliError(err, opts); }
    });

  system
    .command('info')
    .description('Show full system information')
    .option('--no-docker', 'Exclude Docker info')
    .option('--no-network', 'Exclude network info')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getSystemInfo(cmdOpts.docker !== false, cmdOpts.network !== false, true) as any;
        if (opts.json) { printJson(result); return; }
        console.log(JSON.stringify(result, null, 2));
      } catch (err) { handleCliError(err, opts); }
    });

  system
    .command('restart [service]')
    .description('Restart EasyPanel or Traefik')
    .option('-f, --force', 'Skip confirmation')
    .action(async (service, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      const target = service || 'easypanel';
      if (!['easypanel', 'traefik'].includes(target)) {
        console.error(chalk.red(`Invalid service "${target}". Must be "easypanel" or "traefik".`));
        process.exit(1);
      }

      if (!cmdOpts.force) {
        try {
          const yes = await confirm(`Restart ${target}?`);
          if (!yes) return;
        } catch { return; }
      }

      const client = getClient();
      const s = spinner(`Restarting ${target}...`);
      try {
        if (target === 'easypanel') await client.restartEasyPanelService();
        else await client.restartTraefikService();
        s.succeed(`${target} restarted`);
      } catch (err) { s.fail(`Failed to restart ${target}`); handleCliError(err, opts); }
    });
}
