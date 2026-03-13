/**
 * ep login / ep logout / ep whoami
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import { input, password } from '@inquirer/prompts';
import {
  addContext, deleteConfig, getActiveContext, readConfig, getConfigPath, loadConfig,
} from '../utils/config.js';
import {
  type GlobalOptions, printSuccess, printError, printInfo, printJson, printTable, handleCliError, spinner,
} from '../utils/output.js';
import { getClient } from '../api/client.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate with an EasyPanel instance')
    .option('--server-url <url>', 'EasyPanel URL')
    .option('--api-token <token>', 'API token (skip email/password)')
    .option('--name <name>', 'Context name (default: "default")')
    .option('--show', 'Show current config')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;

      if (cmdOpts.show) {
        const config = readConfig();
        if (opts.json) {
          const safe = {
            ...config,
            contexts: config.contexts.map(c => ({
              ...c,
              token: c.token.length < 8 ? '***' : c.token.slice(0, 4) + '...' + c.token.slice(-4),
            })),
          };
          printJson(safe);
          return;
        }
        if (config.contexts.length === 0) {
          printInfo('No contexts configured. Run `ep login` to get started.');
          return;
        }
        printTable(
          ['Name', 'URL', 'Active'],
          config.contexts.map(c => [
            c.name,
            c.url,
            c.name === config.activeContext ? chalk.green('●') : '',
          ]),
          opts,
        );
        console.log(chalk.dim(`\nConfig: ${getConfigPath()}`));
        return;
      }

      try {
        const name = cmdOpts.name || 'default';
        // Use local flags first, fall back to global --url/--token
        let url = (cmdOpts.serverUrl || opts.url) as string | undefined;
        let token = (cmdOpts.apiToken || opts.token) as string | undefined;

        if (!url) {
          url = await input({ message: 'EasyPanel URL:', default: 'https://localhost:3000' });
        }
        // Normalize URL
        url = url.replace(/\/+$/, '');

        if (token) {
          // Direct token auth — verify it works
          const s = spinner('Verifying token...');
          try {
            await axios.get(`${url}/api/trpc/projects.listProjectsAndServices?input=${encodeURIComponent('{"json":null}')}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000,
            });
            s.succeed('Token verified');
          } catch {
            s.fail('Token verification failed');
            printError('Could not authenticate with the provided token. Check URL and token.');
            process.exit(1);
          }
        } else {
          // Email + password flow
          const email = await input({ message: 'Email:' });
          const pass = await password({ message: 'Password:' });

          const s = spinner('Authenticating...');
          try {
            const res = await axios.post(`${url}/api/trpc/auth.login`, {
              json: { email, password: pass },
            }, { timeout: 10000 });
            token = (res.data as any)?.result?.data?.json?.token;
            if (!token) throw new Error('No token in response');
            s.succeed('Authenticated');
          } catch (err: any) {
            s.fail('Authentication failed');
            printError(err.response?.data?.error?.message || err.message || 'Login failed');
            process.exit(1);
          }
        }

        addContext({ name, url, token });
        printSuccess(`Logged in as context "${name}" at ${url}`);
        printInfo(`Config saved to ${getConfigPath()}`);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  program
    .command('logout')
    .description('Remove all saved credentials')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      deleteConfig();
      printSuccess('Logged out. All credentials removed.', opts);
    });

  program
    .command('whoami')
    .description('Show current user and plan info')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);

      try {
        const client = getClient();
        const user = await client.getUser();
        if (opts.json) {
          printJson(user);
          return;
        }
        const u = user as any;
        console.log(chalk.bold('User:'), u.email || u.id || 'unknown');
        if (u.plan) console.log(chalk.bold('Plan:'), u.plan);
        const ctx = getActiveContext();
        if (ctx) console.log(chalk.bold('Server:'), ctx.url);
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
