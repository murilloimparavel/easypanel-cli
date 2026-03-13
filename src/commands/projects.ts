/**
 * ep projects — project management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printSuccess, printTable, handleCliError,
  requireAuth, confirm, spinner,
} from '../utils/output.js';

export function registerProjectsCommand(program: Command): void {
  const projects = program.command('projects').description('Manage EasyPanel projects');

  projects
    .command('list')
    .description('List all projects')
    .action(async (_, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const raw = await client.listProjects() as any;

        // API returns { projects: [...], services: [...] } or array
        const projects = Array.isArray(raw) ? raw : (raw?.projects ?? []);
        const allServices = Array.isArray(raw) ? [] : (raw?.services ?? []);

        if (opts.json) { printJson(projects); return; }

        if (!projects || projects.length === 0) {
          console.log(chalk.dim('No projects found.'));
          return;
        }

        const rows = projects.map((p: any) => {
          const svcCount = allServices.filter((s: any) => s.projectName === p.name).length
            || p.services?.length || 0;
          return [p.name, String(svcCount), p.createdAt || '—'];
        });

        printTable(['Name', 'Services', 'Created'], rows, opts);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  projects
    .command('create <name>')
    .description('Create a new project')
    .action(async (name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      const s = spinner(`Creating project "${name}"...`);
      try {
        const client = getClient();
        const result = await client.createProject(name);
        s.succeed(`Project "${name}" created`);

        if (opts.json) { printJson(result); return; }
      } catch (err) {
        s.fail('Failed to create project');
        handleCliError(err, opts);
      }
    });

  projects
    .command('inspect <name>')
    .description('Get detailed project information')
    .action(async (name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      try {
        const client = getClient();
        const result = await client.inspectProject(name) as any;

        if (opts.json) { printJson(result); return; }

        console.log(chalk.bold('\nProject:'), name);

        const services = result?.services ?? result?.data?.services ?? [];
        if (Array.isArray(services) && services.length > 0) {
          const rows = services.map((s: any) => [
            s.name || s.serviceName || '—',
            s.type || 'app',
            s.enabled !== false ? chalk.green('enabled') : chalk.red('disabled'),
          ]);
          printTable(['Service', 'Type', 'Status'], rows, opts);
        } else {
          console.log(chalk.dim('  No services'));
        }
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  projects
    .command('destroy <name>')
    .description('Delete a project and ALL its services (destructive)')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      if (!cmdOpts.force) {
        try {
          const yes = await confirm(`Delete project "${name}" and ALL its services? This cannot be undone.`);
          if (!yes) {
            console.log(chalk.dim('Cancelled.'));
            return;
          }
        } catch { return; }
      }

      const client = getClient();
      const s = spinner(`Destroying project "${name}"...`);
      try {
        await client.destroyProject(name);
        s.succeed(`Project "${name}" destroyed`);
      } catch (err) {
        s.fail('Failed to destroy project');
        handleCliError(err, opts);
      }
    });
}
