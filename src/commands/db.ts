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

  db.addHelpText('after', `
Examples:
  $ ep db redis create my-project my-redis --password secret123
  $ ep db redis inspect my-project my-redis
  $ ep db mysql create my-project my-db --db mydb --user admin --password pass --root-password rootpass
  $ ep db postgres create my-project my-pg --db mydb --user admin --password pass
  $ ep db destroy redis my-project my-redis --force
`);

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
      requireAuth(opts);

      const s = spinner('Creating Redis instance...');
      try {
        const client = getClient();
        const result = await client.createRedis(project, name, cmdOpts.password, cmdOpts.image);
        s.succeed(`Redis "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: redis://:***@${project}_${name}:6379  (password masked)`));
        if (opts.json) printJson(result);
      } catch (err) { s.fail('Failed to create Redis instance'); handleCliError(err, opts); }
    });

  redis
    .command('inspect <project> <name>')
    .description('Show Redis connection info')
    .action(async (project, name, _, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

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
      requireAuth(opts);

      const s = spinner('Creating MySQL instance...');
      try {
        const client = getClient();
        const result = await client.createMySQL(project, name, cmdOpts.db, cmdOpts.user, cmdOpts.password, cmdOpts.rootPassword, cmdOpts.image);
        s.succeed(`MySQL "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: mysql://${cmdOpts.user}:***@${project}_${name}:3306/${cmdOpts.db}  (password masked)`));
        if (opts.json) printJson(result);
      } catch (err) { s.fail('Failed to create MySQL instance'); handleCliError(err, opts); }
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
      requireAuth(opts);

      const s = spinner('Creating PostgreSQL instance...');
      try {
        const client = getClient();
        const result = await client.createPostgres(project, name, cmdOpts.db, cmdOpts.user, cmdOpts.password, cmdOpts.image);
        s.succeed(`PostgreSQL "${project}/${name}" created`);
        console.log(chalk.dim(`  Connection: postgresql://${cmdOpts.user}:***@${project}_${name}:5432/${cmdOpts.db}  (password masked)`));
        if (opts.json) printJson(result);
      } catch (err) { s.fail('Failed to create PostgreSQL instance'); handleCliError(err, opts); }
    });

  // Destroy (generic for all DB types)
  db
    .command('destroy <type> <project> <name>')
    .description('Delete a database service (redis, mysql, postgres)')
    .option('-f, --force', 'Skip confirmation')
    .action(async (type, project, name, cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOptions;
      loadConfig(opts.url, opts.token);
      requireAuth(opts);

      if (!['redis', 'mysql', 'postgres'].includes(type)) {
        console.error(chalk.red(`Invalid type "${type}". Must be redis, mysql, or postgres.`));
        process.exit(1);
      }

      if (!cmdOpts.force) {
        try {
          const yes = await confirm(`Delete ${type} "${project}/${name}"? All data will be lost.`);
          if (!yes) { console.log(chalk.dim('Cancelled.')); return; }
        } catch { return; }
      }

      const client = getClient();
      const s = spinner(`Destroying ${type} "${project}/${name}"...`);
      try {
        await client.destroyDBService(project, name, type as 'redis' | 'mysql' | 'postgres');
        s.succeed(`${type} "${project}/${name}" destroyed`);
      } catch (err) { s.fail(`Failed to destroy ${type}`); handleCliError(err, opts); }
    });
}
