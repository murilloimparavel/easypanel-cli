#!/usr/bin/env node
/**
 * EasyPanel CLI — Unofficial command-line tool for EasyPanel
 * Manage projects, services, deployments, domains and more from the terminal
 *
 * Also supports MCP server mode via `ep mcp` for AI IDE integration
 */

// Must run before any chalk imports to ensure colored output is disabled
if (process.argv.includes('--no-color')) {
  process.env.NO_COLOR = '1';
}

// Alias mapping — rewrite argv for shortcuts
const aliasMap: Record<string, string[]> = {
  'ps': ['projects', 'list'],
  'ls': ['projects', 'list'],
  'logs': ['services', 'logs'],
  'restart': ['services', 'restart'],
  'rm': ['services', 'destroy'],
  'up': ['deploy', 'image'],
};

const args = process.argv.slice(2);
const firstArg = args[0];
if (firstArg && aliasMap[firstArg] && !['--help', '-h', '--version', '-V'].includes(firstArg)) {
  const expanded = aliasMap[firstArg];
  process.argv = [...process.argv.slice(0, 2), ...expanded, ...args.slice(1)];
}

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
import { registerLoginCommand } from './commands/login.js';
import { registerContextCommand } from './commands/context.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerServicesCommand } from './commands/services.js';
import { registerDeployCommand } from './commands/deploy.js';
import { registerDbCommand } from './commands/db.js';
import { registerDomainsCommand } from './commands/domains.js';
import { registerMonitorCommand } from './commands/monitor.js';
import { registerDockerCommand } from './commands/docker.js';
import { registerSystemCommand } from './commands/system.js';
import { registerStatusCommand } from './commands/status.js';

program
  .name('ep')
  .description('Unofficial CLI for EasyPanel — manage projects, services, and deployments')
  .version(pkg.version)
  .option('--json', 'Output raw JSON (for piping/automation)')
  .option('--quiet', 'Minimal output')
  .option('--verbose', 'Enable debug logging')
  .option('--url <url>', 'Override EasyPanel URL')
  .option('--token <token>', 'Override API token (visible in process list — prefer ep login or env vars)')
  .option('--no-color', 'Disable colored output');

// Register all commands
registerLoginCommand(program);
registerContextCommand(program);
registerStatusCommand(program);
registerProjectsCommand(program);
registerServicesCommand(program);
registerDeployCommand(program);
registerDbCommand(program);
registerDomainsCommand(program);
registerMonitorCommand(program);
registerDockerCommand(program);
registerSystemCommand(program);

// MCP backward compatibility
program
  .command('mcp')
  .description('Start MCP server for AI IDE integration (Claude, Cursor, etc.)')
  .option('-t, --transport <type>', 'Transport: stdio, sse, rest, all', 'stdio')
  .option('-p, --port <number>', 'SSE/HTTP port', '3001')
  .option('--rest-port <number>', 'REST API port', '3002')
  .option('--http-port <number>', 'HTTP port for "all" mode', '3001')
  .option('--rest-api-port <number>', 'REST API port for "all" mode', '3002')
  .option('-c, --client <type>', 'Force client type')
  .option('--list-clients', 'List supported AI clients')
  .action(async (opts) => {
    // Set env vars for MCP mode
    if (opts.verbose || program.opts().verbose) process.env.DEBUG = 'true';
    if (opts.client) process.env.MCP_CLIENT = opts.client.toLowerCase();

    if (opts.listClients) {
      console.log('Supported clients: Claude, Cursor, Windsurf, Kiro, Web IDE, Generic');
      process.exit(0);
    }

    const { EasyPanelMCPServer } = await import('./mcp/server.js');
    const server = new EasyPanelMCPServer();

    const transport = opts.transport as 'stdio' | 'sse' | 'rest' | 'all';
    const port = parseInt(opts.port, 10) || 3001;
    const httpPort = parseInt(opts.httpPort, 10) || 3001;
    const restPort = parseInt(opts.restPort || opts.restApiPort, 10) || 3002;

    console.error(`[MCP] Starting EasyPanel MCP Server with ${transport} transport`);
    await server.run(transport, port, httpPort, restPort);
  });

// Handle invocation as `easypanel-mcp` (backward compat binary name)
const binName = process.argv[1]?.split('/').pop() || '';
const firstPositional = process.argv.slice(2).find(a => !a.startsWith('-'));
const cliCommands = ['mcp', 'login', 'logout', 'whoami', 'status', 'projects', 'services', 'deploy', 'db', 'domains', 'monitor', 'docker', 'system', 'context'];
if (binName === 'easypanel-mcp' && !cliCommands.includes(firstPositional ?? '')) {
  // If called as easypanel-mcp without a known CLI subcommand, auto-inject 'mcp'
  process.argv.splice(2, 0, 'mcp');
}

program.parse();
