/**
 * ep domains — domain & SSL management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printSuccess, printTable, handleCliError,
  requireAuth, spinner, statusColor,
} from '../utils/output.js';

export function registerDomainsCommand(program: Command): void {
  const domains = program.command('domains').description('Manage domains and SSL certificates');

  domains
    .command('list <project> <service>')
    .description('List all domains for a service')
    .action(async (project, service, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.listDomains(project, service) as any[];

        if (opts.json) { printJson(result); return; }

        if (!result?.length) { console.log(chalk.dim('No domains configured.')); return; }

        printTable(
          ['Host', 'Port', 'HTTPS', 'SSL Status'],
          result.map((d: any) => [
            d.host || '—',
            String(d.port || 80),
            d.https ? chalk.green('yes') : 'no',
            d.sslCertificate?.status ? statusColor(d.sslCertificate.status) : '—',
          ]),
          opts,
        );
      } catch (err) { handleCliError(err, opts); }
    });

  domains
    .command('add <project> <service> <domain>')
    .description('Add a domain to a service')
    .option('-p, --port <port>', 'Target port', '80')
    .option('--https', 'Enable HTTPS with Let\'s Encrypt')
    .action(async (project, service, domain, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      const s = spinner(`Adding domain ${chalk.cyan(domain)}...`);
      try {
        const client = getClient();
        await client.addDomain(project, service, {
          host: domain,
          port: parseInt(cmdOpts.port, 10),
          https: cmdOpts.https || false,
          domain,
        });
        s.succeed(`Domain ${domain} added to "${project}/${service}"`);
      } catch (err) { s.fail('Failed to add domain'); handleCliError(err, opts); }
    });

  domains
    .command('remove <project> <service> <domainId>')
    .description('Remove a domain by its ID')
    .action(async (project, service, domainId, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      const s = spinner('Removing domain...');
      try {
        const client = getClient();
        await client.removeDomain(project, service, domainId);
        s.succeed('Domain removed');
      } catch (err) { s.fail('Failed to remove domain'); handleCliError(err, opts); }
    });

  domains
    .command('validate <domain>')
    .description('Check DNS configuration for a domain')
    .action(async (domain, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner(`Validating ${domain}...`);
        const result = await client.validateDomain('_', '_', { domain, host: domain, port: 80, https: false });
        s.stop();
        if (opts.json) { printJson(result); return; }
        console.log(JSON.stringify(result, null, 2));
      } catch (err) { handleCliError(err, opts); }
    });

  // SSL subcommands
  const ssl = domains.command('ssl').description('SSL certificate management');

  ssl
    .command('enable <project> <service> <domain>')
    .description('Request Let\'s Encrypt SSL certificate')
    .option('--email <email>', 'Email for Let\'s Encrypt')
    .action(async (project, service, domain, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      const s = spinner(`Requesting SSL for ${domain}...`);
      try {
        const client = getClient();
        await client.requestSSLCertificate(project, service, domain, cmdOpts.email);
        s.succeed(`SSL certificate requested for ${domain}`);
      } catch (err) { s.fail('Failed to request SSL certificate'); handleCliError(err, opts); }
    });

  ssl
    .command('status <project> <service> <domain>')
    .description('Show SSL certificate status')
    .action(async (project, service, domain, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.getSSLCertificate(project, service, domain) as any;
        if (opts.json) { printJson(result); return; }
        console.log(chalk.bold('Domain:'), domain);
        console.log(chalk.bold('Status:'), statusColor(result?.status || 'unknown'));
        if (result?.expiresAt) console.log(chalk.bold('Expires:'), result.expiresAt);
      } catch (err) { handleCliError(err, opts); }
    });

  ssl
    .command('renew <project> <service> <domain>')
    .description('Renew SSL certificate')
    .action(async (project, service, domain, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      const s = spinner(`Renewing SSL for ${domain}...`);
      try {
        const client = getClient();
        await client.renewSSLCertificate(project, service, domain);
        s.succeed(`SSL renewed for ${domain}`);
      } catch (err) { s.fail('Failed to renew SSL certificate'); handleCliError(err, opts); }
    });
}
