/**
 * ep db — database management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getClient } from '../api/client.js';
import { loadConfig } from '../utils/config.js';
import {
  type GlobalOptions, printJson, printSuccess, handleCliError, requireAuth, confirm, spinner,
} from '../utils/output.js';

export function registerDbCommand(program: Command): void {
  const db = program.command('db').description('Manage database services');

  // Redis
  const redis = db.command('redis').description('Redis database operations');

  redis
    .command('create <project> <name>')
    .description('Create a Redis instance')
    .requiredOption('--password <pass>', 'Redis password')
    .option('--image <image>', 'Docker image', 'redis:7')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner('Creating Redis instance...');
        const result = await client.createRedis(project, name, cmdOpts.password, cmdOpts.image);
        s.succeed(`Redis "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: redis://:${cmdOpts.password}@${project}_${name}:6379`));
        if (opts.json) printJson(result);
      } catch (err) { handleCliError(err, opts); }
    });

  redis
    .command('inspect <project> <name>')
    .description('Show Redis connection info')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const result = await client.inspectRedis(project, name);
        if (opts.json) { printJson(result); return; }
        console.log(JSON.stringify(result, null, 2));
      } catch (err) { handleCliError(err, opts); }
    });

  // MySQL
  const mysql = db.command('mysql').description('MySQL database operations');

  mysql
    .command('create <project> <name>')
    .description('Create a MySQL instance')
    .requiredOption('--db <database>', 'Database name')
    .requiredOption('--user <user>', 'Username')
    .requiredOption('--password <pass>', 'Password')
    .requiredOption('--root-password <pass>', 'Root password')
    .option('--image <image>', 'Docker image', 'mysql:8.0')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner('Creating MySQL instance...');
        const result = await client.createMySQL(project, name, cmdOpts.db, cmdOpts.user, cmdOpts.password, cmdOpts.rootPassword, cmdOpts.image);
        s.succeed(`MySQL "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: mysql://${cmdOpts.user}:${cmdOpts.password}@${project}_${name}:3306/${cmdOpts.db}`));
        if (opts.json) printJson(result);
      } catch (err) { handleCliError(err, opts); }
    });

  // PostgreSQL
  const postgres = db.command('postgres').description('PostgreSQL database operations');

  postgres
    .command('create <project> <name>')
    .description('Create a PostgreSQL instance')
    .requiredOption('--db <database>', 'Database name')
    .requiredOption('--user <user>', 'Username')
    .requiredOption('--password <pass>', 'Password')
    .option('--image <image>', 'Docker image', 'postgres:15')
    .action(async (project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      try {
        const client = getClient();
        const s = spinner('Creating PostgreSQL instance...');
        const result = await client.createPostgres(project, name, cmdOpts.db, cmdOpts.user, cmdOpts.password, cmdOpts.image);
        s.succeed(`PostgreSQL "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: postgresql://${cmdOpts.user}:${cmdOpts.password}@${project}_${name}:5432/${cmdOpts.db}`));
        if (opts.json) printJson(result);
      } catch (err) { handleCliError(err, opts); }
    });

  // Destroy (generic for all DB types)
  db
    .command('destroy <type> <project> <name>')
    .description('Delete a database service (redis, mysql, postgres)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (type, project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth();

      if (!['redis', 'mysql', 'postgres'].includes(type)) {
        console.error(chalk.red(`Invalid type "${type}". Must be redis, mysql, or postgres.`));
        process.exit(1);
      }

      try {
        if (!cmdOpts.force) {
          const yes = await confirm(`Delete ${type} "${project}/${name}"? All data will be lost.`);
          if (!yes) { console.log(chalk.dim('Cancelled.')); return; }
        }

        const client = getClient();
        const s = spinner(`Destroying ${type} "${project}/${name}"...`);
        await client.destroyDBService(project, name, type as 'redis' | 'mysql' | 'postgres');
        s.succeed(`${type} "${project}/${name}" destroyed`);
      } catch (err) { handleCliError(err, opts); }
    });
}
