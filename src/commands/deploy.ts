/**
 * ep deploy — shortcut deploy commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printSuccess, handleCliError, requireAuth, spinner, statusColor,
} from '../utils/output.js';

async function waitForDeployment(client: any, project: string, service: string, opts: GlobalOptions): Promise<void> {
  const s = spinner('Waiting for deployment to complete...');
  try {
    const result = await client.waitForDeploy(project, service) as any;
    if (result?.success) {
      s.succeed(`Deployment completed successfully (${result.duration || '—'})`);
    } else {
      s.fail(`Deployment failed: ${result?.finalStatus || 'unknown'}`);
      process.exit(1);
    }
    if (opts.json) printJson(result);
  } catch (err) {
    s.fail('Deployment wait failed');
    throw err;
  }
}

export function registerDeployCommand(program: Command): void {
  const deploy = program.command('deploy').description('Deploy services (create + deploy in one step)');

  deploy
    .command('image <project> <service> <image>')
    .description('Deploy from a Docker image')
    .option('--username <user>', 'Registry username')
    .option('--password <pass>', 'Registry password')
    .option('-w, --wait', 'Wait for deployment to complete')
    .action(async (project, service, image, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();

        // Try to create service (ignore if exists)
        const s1 = spinner(`Setting up "${project}/${service}"...`);
        try { await client.createAppService(project, service); } catch { /* may already exist */ }
        s1.succeed(`Service "${project}/${service}" ready`);

        const s2 = spinner(`Deploying image ${chalk.cyan(image)}...`);
        const result = await client.deployFromImage(project, service, image, cmdOpts.username, cmdOpts.password) as any;
        s2.succeed(`Image deployed to "${project}/${service}"`);

        if (opts.json) printJson(result);
        if (cmdOpts.wait) await waitForDeployment(client, project, service, opts);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  deploy
    .command('git <project> <service> <repo>')
    .description('Deploy from a Git repository (Nixpacks)')
    .option('--ref <branch>', 'Git branch/tag', 'main')
    .option('--path <path>', 'Build path', '/')
    .option('-w, --wait', 'Wait for deployment to complete')
    .action(async (project, service, repo, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();

        const s1 = spinner(`Setting up "${project}/${service}"...`);
        try { await client.createAppService(project, service); } catch { /* may already exist */ }
        s1.succeed(`Service "${project}/${service}" ready`);

        const s2 = spinner(`Deploying from ${chalk.cyan(repo)}...`);
        const result = await client.deployFromGit(project, service, repo, cmdOpts.ref, cmdOpts.path) as any;
        s2.succeed(`Git deploy triggered for "${project}/${service}"`);

        if (opts.json) printJson(result);
        if (cmdOpts.wait) await waitForDeployment(client, project, service, opts);
      } catch (err) {
        handleCliError(err, opts);
      }
    });

  deploy
    .command('dockerfile <project> <service> <repo>')
    .description('Deploy from a Dockerfile in a Git repo')
    .option('--ref <branch>', 'Git branch/tag', 'main')
    .option('--path <path>', 'Build context path', '/')
    .option('--dockerfile <path>', 'Dockerfile path', './Dockerfile')
    .option('-w, --wait', 'Wait for deployment to complete')
    .action(async (project, service, repo, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();

        const s1 = spinner(`Setting up "${project}/${service}"...`);
        try { await client.createAppService(project, service); } catch { /* may already exist */ }
        s1.succeed(`Service "${project}/${service}" ready`);

        const s2 = spinner(`Deploying with Dockerfile from ${chalk.cyan(repo)}...`);
        const result = await client.deployFromDockerfile(
          project, service, repo, cmdOpts.ref, cmdOpts.path, cmdOpts.dockerfile,
        ) as any;
        s2.succeed(`Dockerfile deploy triggered for "${project}/${service}"`);

        if (opts.json) printJson(result);
        if (cmdOpts.wait) await waitForDeployment(client, project, service, opts);
      } catch (err) {
        handleCliError(err, opts);
      }
    });
}
