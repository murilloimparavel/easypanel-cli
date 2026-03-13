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

  system.addHelpText('after', `
Examples:
  $ ep system ip
  $ ep system ip --public-only
  $ ep system domain
  $ ep system info
  $ ep system restart easypanel --force
  $ ep system restart traefik
`);

  system
    .command('ip')
    .description('Show server IP addresses')
    .option('--public-only', 'Show only public IPs')
    .option('--ipv6', 'Include IPv6 addresses')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

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
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getPanelDomain() as any;
        if (opts.json) { printJson(result); return; }
        if (result.panelUrl || result.serverUrl) {
          console.log(chalk.bold('Panel URL:'), result.panelUrl || result.serverUrl || '—');
        }
        if (result.primaryDomain) {
          console.log(chalk.bold('Primary Domain:'), result.primaryDomain);
        }
        if (result.allDomains && Array.isArray(result.allDomains)) {
          result.allDomains.forEach((d: any) => {
            const ssl = d.ssl ? chalk.green('SSL') : chalk.yellow('no SSL');
            console.log(`  ${d.domain} (${d.type || 'unknown'}) ${ssl}`);
          });
        }
        if (!result.panelUrl && !result.serverUrl && !result.primaryDomain && !result.allDomains) {
          console.log(result?.domain || result?.url || JSON.stringify(result));
        }
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
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.getSystemInfo(cmdOpts.docker !== false, cmdOpts.network !== false, true) as any;
        if (opts.json) { printJson(result); return; }
        console.log(chalk.bold('\nSystem Information\n'));
        if (result.hostname) console.log(`  ${chalk.dim('Hostname:')}  ${result.hostname}`);
        if (result.platform) console.log(`  ${chalk.dim('Platform:')}  ${result.platform} ${result.arch || ''}`);
        if (result.os) {
          console.log(`  ${chalk.dim('OS:')}        ${result.os.type || ''} ${result.os.release || ''}`);
          if (result.os.uptime) console.log(`  ${chalk.dim('Uptime:')}    ${Math.floor(result.os.uptime / 3600)}h ${Math.floor((result.os.uptime % 3600) / 60)}m`);
          if (result.os.loadAverage) console.log(`  ${chalk.dim('Load:')}      ${result.os.loadAverage.map((l: number) => l.toFixed(2)).join(', ')}`);
        }
        if (result.cpu) {
          console.log(`  ${chalk.dim('CPU:')}       ${result.cpu.model || 'unknown'} (${result.cpu.cores || '?'} cores)`);
        }
        if (result.memory) {
          const total = result.memory.total ? `${(result.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB` : '?';
          const used = result.memory.used ? `${(result.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB` : '?';
          console.log(`  ${chalk.dim('Memory:')}    ${used} / ${total}`);
        }
        if (result.disk) {
          const total = result.disk.total ? `${(result.disk.total / 1024 / 1024 / 1024).toFixed(1)}GB` : '?';
          const used = result.disk.used ? `${(result.disk.used / 1024 / 1024 / 1024).toFixed(1)}GB` : '?';
          console.log(`  ${chalk.dim('Disk:')}      ${used} / ${total}`);
        }
        console.log('');
      } catch (err) { handleCliError(err, opts); }
    });

  system
    .command('restart [service]')
    .description('Restart EasyPanel or Traefik')
    .option('-f, --force', 'Skip confirmation')
    .action(async (service, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

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
